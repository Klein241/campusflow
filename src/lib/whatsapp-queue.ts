import { supabase } from '@/lib/supabase';

export interface WhatsAppQueueItem {
    id?: string;
    organization_id: string;
    recipient_phone: string;
    recipient_name?: string;
    message_type: 'grade' | 'payment' | 'discipline' | 'general';
    message: string;
    status?: 'en_attente' | 'envoye' | 'echec';
    created_at?: string;
    sent_at?: string;
}

/**
 * Clean phone number to digits only
 */
export function cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
}

/**
 * Enqueue a message into the WhatsApp Queue
 */
export async function enqueueWhatsAppMessage(
    orgId: string,
    phone: string,
    recipientName: string,
    messageType: 'grade' | 'payment' | 'discipline' | 'general',
    message: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!phone || !phone.trim() || !message || !message.trim()) {
        return { success: false, error: 'Numéro de téléphone ou message vide' };
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (cleanPhone.length < 8) {
        return { success: false, error: 'Numéro de téléphone invalide' };
    }

    try {
        const { data, error } = await supabase.from('whatsapp_queue').insert({
            organization_id: orgId,
            recipient_phone: cleanPhone,
            recipient_name: recipientName || 'Destinataire',
            message_type: messageType,
            message: message.trim(),
            status: 'en_attente'
        }).select('id').single();

        if (error) throw error;
        return { success: true, id: data.id };
    } catch (e: any) {
        console.error('Error queuing WhatsApp message:', e);
        return { success: false, error: e.message || 'Erreur lors de la mise en file' };
    }
}

/**
 * Queue a Grade / Note notification for WhatsApp
 */
export async function queueGradeNotification(
    orgId: string,
    orgName: string,
    phone: string,
    studentName: string,
    subjectName: string,
    evalTitle: string,
    score: number,
    maxScore: number
): Promise<{ success: boolean; id?: string; error?: string }> {
    const formattedScore = `${score}/${maxScore}`;
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const emoji = pct >= 75 ? '🌟' : pct >= 50 ? '✅' : '⚠️';

    const msg = `🏫 *${orgName}* — Notification de Note\n\n` +
        `👤 *Élève* : ${studentName}\n` +
        `📘 *Matière* : ${subjectName}\n` +
        `📝 *Évaluation* : ${evalTitle}\n` +
        `${emoji} *Note obtenue* : *${formattedScore}* (${pct}%)\n\n` +
        `Retrouvez le détail complet sur votre espace CampusFlow.`;

    return enqueueWhatsAppMessage(orgId, phone, studentName, 'grade', msg);
}

/**
 * Queue a Payment Receipt for WhatsApp
 */
export async function queuePaymentReceipt(
    orgId: string,
    orgName: string,
    phone: string,
    studentName: string,
    amount: number,
    paymentMethod: string,
    description: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
    const methodLabel = paymentMethod === 'momo' ? 'MTN MoMo' : paymentMethod === 'orange_money' ? 'Orange Money' : 'Espèces';

    const msg = `🧾 *${orgName}* — Reçu de Paiement\n\n` +
        `👤 *Élève* : ${studentName}\n` +
        `💰 *Montant versé* : *${fmt(amount)} XAF*\n` +
        `💳 *Mode de règlement* : ${methodLabel}\n` +
        `📌 *Motif* : ${description || 'Frais de scolarité'}\n` +
        `📅 *Date* : ${new Date().toLocaleDateString('fr-FR')}\n\n` +
        `Merci pour votre paiement !`;

    return enqueueWhatsAppMessage(orgId, phone, studentName, 'payment', msg);
}

/**
 * Queue a Discipline Alert for WhatsApp
 */
export async function queueDisciplineAlert(
    orgId: string,
    orgName: string,
    phone: string,
    studentName: string,
    penaltyType: string,
    reason: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    const msg = `⚠️ *${orgName}* — Avis Disciplinaire\n\n` +
        `👤 *Élève* : ${studentName}\n` +
        `📜 *Sanction* : ${penaltyType.replace(/_/g, ' ')}\n` +
        `📝 *Motif* : ${reason}\n` +
        `📅 *Date* : ${new Date().toLocaleDateString('fr-FR')}\n\n` +
        `Prière de contacter la direction de l'établissement pour plus de détails.`;

    return enqueueWhatsAppMessage(orgId, phone, studentName, 'discipline', msg);
}
