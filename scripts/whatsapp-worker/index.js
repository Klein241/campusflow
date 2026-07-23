const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MESSAGE_DELAY_MS = parseInt(process.env.MESSAGE_DELAY_MS || '3000');
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '50');
const AUTO_STOP_WHEN_EMPTY = process.env.AUTO_STOP_WHEN_EMPTY === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERREUR: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être configurés dans le fichier .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatJid(phone) {
    let clean = phone.replace(/[^0-9]/g, '');
    if (!clean.endsWith('@s.whatsapp.net')) {
        clean = `${clean}@s.whatsapp.net`;
    }
    return clean;
}

async function processQueue(sock) {
    console.log('🔍 Recherche de messages en attente dans Supabase...');
    
    const { data: queueItems, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'en_attente')
        .order('created_at', { ascending: true })
        .limit(MAX_BATCH_SIZE);

    if (error) {
        console.error('❌ Erreur lors de la récupération de la file:', error.message);
        return 0;
    }

    if (!queueItems || queueItems.length === 0) {
        console.log('✅ Aucun message en attente dans la file.');
        return 0;
    }

    console.log(`🚀 ${queueItems.length} message(s) trouvé(s) en attente. Traitement par vagues...`);

    let processedCount = 0;

    for (const item of queueItems) {
        try {
            const jid = formatJid(item.recipient_phone);
            console.log(`📤 Envoi vers ${item.recipient_name || item.recipient_phone} (${jid})...`);

            await sock.sendMessage(jid, { text: item.message });

            // Update status to envoye in Supabase
            await supabase
                .from('whatsapp_queue')
                .update({
                    status: 'envoye',
                    sent_at: new Date().toISOString(),
                    attempts: (item.attempts || 0) + 1
                })
                .eq('id', item.id);

            console.log(`✅ Message #${item.id} envoyé avec succès !`);
            processedCount++;

            // Human pause between messages to prevent spam detection
            await sleep(MESSAGE_DELAY_MS);
        } catch (err) {
            console.error(`⚠️ Échec d'envoi pour #${item.id}:`, err.message);

            await supabase
                .from('whatsapp_queue')
                .update({
                    status: (item.attempts || 0) >= 2 ? 'echec' : 'en_attente',
                    attempts: (item.attempts || 0) + 1,
                    error_log: err.message || 'Erreur d\'envoi Baileys'
                })
                .eq('id', item.id);

            await sleep(2000);
        }
    }

    console.log(`✨ Vague terminée : ${processedCount}/${queueItems.length} message(s) traité(s).`);
    return processedCount;
}

async function startWhatsAppWorker() {
    console.log('📱 Initialisation de la connexion Baileys WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n======================================================');
            console.log('🔑 SCANNEZ CE QR CODE AVEC VOTRE WHATSAPP D\'ÉCOLE :');
            console.log('======================================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Connexion fermée. Reconnexion ?', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(startWhatsAppWorker, 5000);
            } else {
                console.log('❌ Session déconnectée. Veuillez supprimer le dossier auth_info_baileys et relancer.');
            }
        } else if (connection === 'open') {
            console.log('\n🟢 CONNECTÉ À WHATSAPP AVEC SUCCÈS !');
            console.log('======================================================\n');

            if (AUTO_STOP_WHEN_EMPTY) {
                const count = await processQueue(sock);
                console.log(`🏁 Mode arrêt automatique activé. ${count} message(s) envoyé(s). Fermeture...`);
                process.exit(0);
            } else {
                // Continuous polling loop every 10 seconds
                await processQueue(sock);
                setInterval(async () => {
                    await processQueue(sock);
                }, 10000);
            }
        }
    });
}

startWhatsAppWorker();
