#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  CampusFlow — WhatsApp Worker — Setup automatique Termux
#  Usage: curl -sL https://raw.githubusercontent.com/VOTRE_REPO/main/scripts/whatsapp-worker/setup-termux.sh | bash
#  OU depuis le répertoire : bash setup-termux.sh
# ═══════════════════════════════════════════════════════════════════

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   📱 CampusFlow WhatsApp Worker — Setup Termux   ║${NC}"
echo -e "${BOLD}║      Powered by Baileys + Supabase               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Étape 1 : Vérifier/installer Node.js ─────────────────────────
log "Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    log "Installation de Node.js et git..."
    pkg update -y && pkg install nodejs git -y
else
    NODE_VER=$(node --version)
    ok "Node.js déjà installé : $NODE_VER"
fi

NPM_VER=$(npm --version)
NODE_VER=$(node --version)
ok "Node.js $NODE_VER | npm $NPM_VER"

# ─── Étape 2 : Dossier de travail ─────────────────────────────────
WORKER_DIR="$HOME/campusflow-worker"
log "Création du dossier : $WORKER_DIR"
mkdir -p "$WORKER_DIR"
cd "$WORKER_DIR"
ok "Dossier prêt : $(pwd)"

# ─── Étape 3 : Créer package.json ─────────────────────────────────
if [ ! -f "package.json" ]; then
    log "Création de package.json..."
    cat > package.json << 'EOF'
{
  "name": "campusflow-whatsapp-worker",
  "version": "1.0.0",
  "description": "WhatsApp notification worker for CampusFlow using Baileys",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "start:bg": "nohup node index.js > worker.log 2>&1 &"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "@whiskeysockets/baileys": "^6.7.0",
    "dotenv": "^16.3.1",
    "pino": "^8.16.0",
    "qrcode-terminal": "^0.12.0"
  }
}
EOF
    ok "package.json créé"
else
    ok "package.json déjà présent"
fi

# ─── Étape 4 : Créer index.js ─────────────────────────────────────
if [ ! -f "index.js" ]; then
    log "Création de index.js (worker principal)..."
    cat > index.js << 'JSEOF'
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MESSAGE_DELAY_MS = parseInt(process.env.MESSAGE_DELAY_MS || '3000');
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '50');
const AUTO_STOP_WHEN_EMPTY = process.env.AUTO_STOP_WHEN_EMPTY === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toLocaleTimeString('fr-FR');

function formatJid(phone) {
    return phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

async function processQueue(sock) {
    const { data: items, error } = await supabase
        .from('whatsapp_queue')
        .select('*')
        .eq('status', 'en_attente')
        .order('created_at', { ascending: true })
        .limit(MAX_BATCH_SIZE);

    if (error) { console.error(`[${now()}] ❌ Erreur queue:`, error.message); return 0; }
    if (!items || items.length === 0) {
        process.stdout.write(`\r[${now()}] ⏳ En attente de messages...`);
        return 0;
    }

    console.log(`\n[${now()}] 📬 ${items.length} message(s) en attente. Envoi...`);
    let sent = 0;

    for (const item of items) {
        try {
            await sock.sendMessage(formatJid(item.recipient_phone), { text: item.message });
            await supabase.from('whatsapp_queue').update({
                status: 'envoye',
                sent_at: new Date().toISOString(),
                attempts: (item.attempts || 0) + 1
            }).eq('id', item.id);
            console.log(`[${now()}] ✅ Envoyé → ${item.recipient_name || item.recipient_phone}`);
            sent++;
            await sleep(MESSAGE_DELAY_MS);
        } catch (err) {
            const newAttempts = (item.attempts || 0) + 1;
            console.error(`[${now()}] ⚠️  Échec → ${item.recipient_phone}: ${err.message}`);
            await supabase.from('whatsapp_queue').update({
                status: newAttempts >= 3 ? 'echec' : 'en_attente',
                attempts: newAttempts,
                error_log: err.message
            }).eq('id', item.id);
            await sleep(2000);
        }
    }

    if (sent > 0) console.log(`[${now()}] ✨ ${sent}/${items.length} message(s) envoyé(s).`);
    return sent;
}

async function startWorker() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   📱 CampusFlow WhatsApp Worker               ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['CampusFlow', 'Chrome', '120.0.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n');
            console.log('══════════════════════════════════════════════════');
            console.log('  🔑 SCANNEZ CE QR CODE AVEC WHATSAPP DE L\'ECOLE');
            console.log('  WhatsApp → ⋮ Menu → Appareils connectés → +');
            console.log('══════════════════════════════════════════════════');
            console.log('');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(`\n[${now()}] ⚠️  Connexion fermée (code: ${code}). Reconnexion: ${shouldReconnect}`);
            if (shouldReconnect) {
                console.log(`[${now()}] ⏳ Reconnexion dans 5 secondes...`);
                setTimeout(startWorker, 5000);
            } else {
                console.log(`[${now()}] ❌ Session expirée.`);
                console.log('   → Supprimez le dossier auth_info_baileys/ et relancez.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            console.log('\n');
            console.log('══════════════════════════════════════════════════');
            console.log(`  🟢 CONNECTÉ À WHATSAPP ! [${now()}]`);
            console.log('  Polling Supabase toutes les 10 secondes...');
            console.log('══════════════════════════════════════════════════');
            console.log('');

            if (AUTO_STOP_WHEN_EMPTY) {
                const count = await processQueue(sock);
                console.log(`\n[${now()}] 🏁 Auto-stop: ${count} message(s) envoyé(s). Fermeture.`);
                process.exit(0);
            } else {
                await processQueue(sock);
                setInterval(() => processQueue(sock), 10000);
            }
        }
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n\n[${now()}] 👋 Arrêt du worker CampusFlow. À bientôt !`);
    process.exit(0);
});

startWorker();
JSEOF
    ok "index.js créé"
else
    ok "index.js déjà présent"
fi

# ─── Étape 5 : Fichier .env ───────────────────────────────────────
if [ ! -f ".env" ]; then
    log "Création du fichier .env..."
    cat > .env << 'EOF'
# ─── Supabase (Settings → API dans votre tableau de bord Supabase) ───
SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY_ICI

# ─── Paramètres d'envoi ───────────────────────────────────────────
# Délai entre chaque message (ms) — ne pas descendre sous 2000ms
MESSAGE_DELAY_MS=3000

# Nombre max de messages par cycle
MAX_BATCH_SIZE=50

# true = s'arrête quand la file est vide (mode cron), false = tourne en continu
AUTO_STOP_WHEN_EMPTY=false
EOF
    warn "IMPORTANT: Éditez .env avec vos clés Supabase !"
    warn "Commande: nano .env"
else
    ok ".env déjà présent"
fi

# ─── Étape 6 : Installer les dépendances npm ──────────────────────
if [ ! -d "node_modules" ]; then
    log "Installation des dépendances npm (peut prendre 3-5 min)..."
    npm install --legacy-peer-deps
    ok "Dépendances installées !"
else
    ok "node_modules déjà présent"
fi

# ─── Résumé final ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅  SETUP TERMINÉ !                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Prochaines étapes :${NC}"
echo ""
echo -e "  1️⃣  Éditez vos clés Supabase :"
echo -e "     ${CYAN}nano $WORKER_DIR/.env${NC}"
echo ""
echo -e "  2️⃣  Lancez le worker :"
echo -e "     ${CYAN}node $WORKER_DIR/index.js${NC}"
echo ""
echo -e "  3️⃣  Scannez le QR code avec WhatsApp"
echo ""
echo -e "  4️⃣  Pour lancer en arrière-plan :"
echo -e "     ${CYAN}nohup node $WORKER_DIR/index.js > $WORKER_DIR/worker.log 2>&1 &${NC}"
echo -e "     ${CYAN}tail -f $WORKER_DIR/worker.log${NC}"
echo ""

# Proposer de configurer .env maintenant
read -p "Voulez-vous configurer le .env maintenant ? (O/n) " choice
if [[ "$choice" != "n" && "$choice" != "N" ]]; then
    nano .env
fi

# Proposer de lancer le worker
read -p "Lancer le worker maintenant ? (O/n) " choice2
if [[ "$choice2" != "n" && "$choice2" != "N" ]]; then
    echo ""
    log "Démarrage du worker..."
    node index.js
fi
