// ═══════════════════════════════════════════════════════════════
// CAMPUSFLOW — Receipt PDF Generator
// 5 professional templates for payment receipts
// ═══════════════════════════════════════════════════════════════

export interface ReceiptData {
    org: {
        name: string;
        logo_url?: string;
        phone?: string;
        email?: string;
        city?: string;
        country?: string;
        signature_url?: string;
        stamp_url?: string;
    };
    student: {
        first_name: string;
        last_name: string;
        matricule?: string;
        classroom_name?: string;
    };
    payment: {
        id: string;
        amount: number;
        currency: string;
        method: string;
        description: string;
        paid_at: string;
        period?: string;
    };
    receiptNumber: string;
    remainingBalance?: number;
}

// ── Helpers ──────────────────────────────────────────────
const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const dateNow = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const renderStampSignature = (sig?: string, stamp?: string, label: string = 'Cachet & Signature') => `
    <div style="position:relative;display:inline-block;width:100%;min-height:45px;">
        ${sig ? `<img src="${sig}" style="max-height:45px;max-width:130px;object-fit:contain;margin-bottom:2px;display:block;margin-left:auto;margin-right:auto;" alt="Signature" />` : '<div style="height:35px"></div>'}
        ${stamp ? `<img src="${stamp}" style="position:absolute;right:5px;bottom:0px;max-height:60px;max-width:60px;object-fit:contain;opacity:0.85;transform:rotate(-6deg);pointer-events:none;" alt="Cachet" />` : ''}
    </div>
    <div style="border-top:1px solid #94a3b8;padding-top:4px;font-size:8pt;color:#64748b">${label}</div>
`;
const amountInWords = (n: number): string => {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    if (n === 0) return 'zéro';
    if (n < 0) return 'moins ' + amountInWords(-n);
    let words = '';
    if (Math.floor(n / 1000000) > 0) { words += amountInWords(Math.floor(n / 1000000)) + ' million' + (Math.floor(n / 1000000) > 1 ? 's ' : ' '); n %= 1000000; }
    if (Math.floor(n / 1000) > 0) {
        if (Math.floor(n / 1000) === 1) words += 'mille ';
        else words += amountInWords(Math.floor(n / 1000)) + ' mille ';
        n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
        if (Math.floor(n / 100) === 1) words += 'cent ';
        else words += units[Math.floor(n / 100)] + ' cent' + (n % 100 === 0 && Math.floor(n / 100) > 1 ? 's ' : ' ');
        n %= 100;
    }
    if (n > 0) {
        if (n < 20) words += units[n];
        else {
            const t = Math.floor(n / 10);
            const u = n % 10;
            if (t === 7 || t === 9) words += tens[t] + '-' + units[10 + u];
            else words += tens[t] + (u > 0 ? '-' + units[u] : '');
        }
    }
    return words.trim();
};

const methodLabel = (m: string): string => {
    switch (m) {
        case 'momo': return 'MTN Mobile Money';
        case 'orange_money': return 'Orange Money';
        case 'cash': return 'Espèces';
        case 'bank': return 'Virement bancaire';
        default: return m || 'Autre';
    }
};

const baseCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; font-size: 10pt; }
.page { padding: 15mm; max-width: 210mm; margin: 0 auto; }
@media print { body { padding: 0; } .page { padding: 12mm; } @page { size: A4; margin: 0; } }
`;

// ════════════════════════════════════════════════════════════
// TEMPLATE 1: Classique Camerounais
// ════════════════════════════════════════════════════════════
function receipt1Html(d: ReceiptData): string {
    return `<div class="page">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:15px;border-bottom:3px double #0f172a;margin-bottom:20px">
            <div style="width:35%;text-align:center;font-size:8pt;line-height:1.5">
                <strong>RÉPUBLIQUE DU CAMEROUN</strong><br>Paix – Travail – Patrie
            </div>
            <div style="text-align:center">
                ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:65px;height:65px;border-radius:8px;object-fit:contain"/>` : `<div style="width:65px;height:65px;border-radius:8px;background:#0f172a;margin:0 auto;display:flex;align-items:center;justify-content:center;color:white;font-size:22pt;font-weight:bold">${d.org.name[0]}</div>`}
                <h3 style="font-size:11pt;margin-top:5px">${d.org.name}</h3>
                <p style="font-size:7pt;color:#64748b">${d.org.city || ''}${d.org.city && d.org.country ? ', ' : ''}${d.org.country || ''}</p>
            </div>
            <div style="width:35%;text-align:center;font-size:8pt;line-height:1.5">
                <strong>REPUBLIC OF CAMEROON</strong><br>Peace – Work – Fatherland
            </div>
        </div>

        <div style="text-align:center;margin:20px 0">
            <h2 style="font-size:16pt;text-transform:uppercase;letter-spacing:3px;border:2px solid #0f172a;display:inline-block;padding:8px 40px">REÇU DE PAIEMENT</h2>
        </div>

        <div style="text-align:right;margin-bottom:15px">
            <span style="font-size:10pt;font-weight:bold;background:#f1f5f9;padding:6px 15px;border-radius:4px;border:1px solid #e2e8f0">N° ${d.receiptNumber}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;width:35%;font-weight:600">Nom de l'élève</td><td style="padding:8px;border:1px solid #cbd5e1">${d.student.last_name} ${d.student.first_name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Matricule</td><td style="padding:8px;border:1px solid #cbd5e1">${d.student.matricule || '—'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Classe</td><td style="padding:8px;border:1px solid #cbd5e1">${d.student.classroom_name || '—'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Description</td><td style="padding:8px;border:1px solid #cbd5e1">${d.payment.description}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Mode de paiement</td><td style="padding:8px;border:1px solid #cbd5e1">${methodLabel(d.payment.method)}</td></tr>
            ${d.payment.period ? `<tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Période</td><td style="padding:8px;border:1px solid #cbd5e1">${d.payment.period}</td></tr>` : ''}
            <tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600">Date</td><td style="padding:8px;border:1px solid #cbd5e1">${new Date(d.payment.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        </table>

        <div style="background:#0f172a;color:white;padding:15px 20px;border-radius:8px;margin-bottom:15px">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11pt;font-weight:600">MONTANT PAYÉ</span>
                <span style="font-size:18pt;font-weight:800">${fmtMoney(d.payment.amount)} ${d.payment.currency}</span>
            </div>
            <p style="font-size:8pt;color:#94a3b8;margin-top:5px;font-style:italic">Soit : ${amountInWords(d.payment.amount)} francs CFA</p>
        </div>

        ${d.remainingBalance !== undefined ? `<div style="text-align:right;margin-bottom:15px"><span style="font-size:9pt;color:#64748b">Solde restant : </span><span style="font-size:11pt;font-weight:bold;color:${d.remainingBalance > 0 ? '#dc2626' : '#059669'}">${fmtMoney(d.remainingBalance)} ${d.payment.currency}</span></div>` : ''}

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Caissier</p><div style="border-top:1px solid #94a3b8;margin-top:45px;padding-top:4px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Directeur</p>${renderStampSignature(d.org.signature_url, d.org.stamp_url, 'Cachet & Signature')}</div>
        </div>

        <div style="text-align:center;margin-top:25px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            Document généré le ${dateNow()} — ${d.org.name} — CampusFlow<br>
            ${d.org.phone ? `Tél: ${d.org.phone} • ` : ''}${d.org.email || ''}
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 2: Style Universitaire
// ════════════════════════════════════════════════════════════
function receipt2Html(d: ReceiptData): string {
    return `<div class="page">
        <div style="display:flex;align-items:center;gap:15px;padding-bottom:15px;border-bottom:2px solid #1e40af;margin-bottom:20px">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:60px;height:60px;border-radius:10px;object-fit:contain"/>` : `<div style="width:60px;height:60px;border-radius:10px;background:#1e40af;display:flex;align-items:center;justify-content:center;color:white;font-size:20pt;font-weight:bold">${d.org.name[0]}</div>`}
            <div>
                <h1 style="font-size:14pt;color:#1e40af;margin-bottom:2px">${d.org.name}</h1>
                <p style="font-size:8pt;color:#64748b">${d.org.city || ''} — ${d.org.country || ''} ${d.org.phone ? `• ${d.org.phone}` : ''}</p>
            </div>
            <div style="margin-left:auto;padding:8px 20px;background:#1e40af;color:white;border-radius:8px;text-align:center">
                <p style="font-size:8pt;text-transform:uppercase">N° Reçu</p>
                <p style="font-size:12pt;font-weight:800">${d.receiptNumber}</p>
            </div>
        </div>

        <h2 style="text-align:center;font-size:14pt;color:#1e40af;text-transform:uppercase;letter-spacing:2px;margin:15px 0">Reçu de Paiement</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;font-size:9pt">
            <div style="background:#eff6ff;padding:10px 15px;border-radius:8px;border-left:3px solid #1e40af">
                <p style="color:#64748b;font-size:8pt">ÉTUDIANT</p>
                <p style="font-weight:700;font-size:11pt">${d.student.last_name} ${d.student.first_name}</p>
                <p style="color:#64748b;font-size:8pt">${d.student.matricule || '—'} • ${d.student.classroom_name || '—'}</p>
            </div>
            <div style="background:#eff6ff;padding:10px 15px;border-radius:8px;border-left:3px solid #1e40af">
                <p style="color:#64748b;font-size:8pt">DÉTAILS</p>
                <p style="font-weight:600">${d.payment.description}</p>
                <p style="color:#64748b;font-size:8pt">${methodLabel(d.payment.method)} • ${new Date(d.payment.paid_at).toLocaleDateString('fr-FR')}</p>
            </div>
        </div>

        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:20px 25px;border-radius:12px;text-align:center;margin-bottom:15px">
            <p style="font-size:9pt;text-transform:uppercase;letter-spacing:2px;opacity:0.8;margin-bottom:5px">Montant reçu</p>
            <p style="font-size:28pt;font-weight:900">${fmtMoney(d.payment.amount)} ${d.payment.currency}</p>
            <p style="font-size:8pt;font-style:italic;opacity:0.7;margin-top:5px">${amountInWords(d.payment.amount)} francs CFA</p>
        </div>

        ${d.remainingBalance !== undefined ? `<p style="text-align:center;font-size:9pt;color:#64748b;margin-bottom:15px">Solde restant : <strong style="color:${d.remainingBalance > 0 ? '#dc2626' : '#059669'}">${fmtMoney(d.remainingBalance)} ${d.payment.currency}</strong></p>` : ''}

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Service Financier</p><div style="border-top:1px solid #94a3b8;margin-top:45px;padding-top:4px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Directeur</p>${renderStampSignature(d.org.signature_url, d.org.stamp_url, 'Cachet & Signature')}</div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 3: Formation Professionnelle
// ════════════════════════════════════════════════════════════
function receipt3Html(d: ReceiptData): string {
    return `<div class="page">
        <div style="display:flex;align-items:center;gap:15px;padding-bottom:12px;border-bottom:3px solid #d97706;margin-bottom:20px">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:55px;height:55px;border-radius:10px;object-fit:contain"/>` : `<div style="width:55px;height:55px;border-radius:10px;background:#d97706;display:flex;align-items:center;justify-content:center;color:white;font-size:18pt;font-weight:bold">${d.org.name[0]}</div>`}
            <div><h1 style="font-size:13pt;color:#d97706">${d.org.name}</h1><p style="font-size:8pt;color:#64748b">${d.org.city || ''} ${d.org.phone ? `• ${d.org.phone}` : ''}</p></div>
        </div>

        <div style="text-align:center;margin:15px 0;padding:10px;background:#fffbeb;border-radius:8px;border:2px solid #f59e0b">
            <h2 style="font-size:14pt;color:#92400e;text-transform:uppercase;letter-spacing:2px">Reçu de Paiement</h2>
            <p style="font-size:9pt;color:#92400e;margin-top:3px">N° ${d.receiptNumber}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;width:35%;color:#92400e">👤 Apprenant</td><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:500">${d.student.last_name} ${d.student.first_name}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;color:#92400e">🏷️ Matricule</td><td style="padding:10px;border-bottom:1px solid #fde68a">${d.student.matricule || '—'}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;color:#92400e">🏫 Classe / Filière</td><td style="padding:10px;border-bottom:1px solid #fde68a">${d.student.classroom_name || '—'}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;color:#92400e">📝 Libellé</td><td style="padding:10px;border-bottom:1px solid #fde68a">${d.payment.description}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;color:#92400e">💳 Mode</td><td style="padding:10px;border-bottom:1px solid #fde68a">${methodLabel(d.payment.method)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #fde68a;font-weight:600;color:#92400e">📅 Date</td><td style="padding:10px;border-bottom:1px solid #fde68a">${new Date(d.payment.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        </table>

        <div style="background:#d97706;color:white;padding:18px 25px;border-radius:10px;text-align:center;margin:15px 0">
            <p style="font-size:22pt;font-weight:900">${fmtMoney(d.payment.amount)} ${d.payment.currency}</p>
            <p style="font-size:8pt;font-style:italic;opacity:0.8;margin-top:4px">${amountInWords(d.payment.amount)} francs CFA</p>
        </div>

        ${d.remainingBalance !== undefined ? `<p style="text-align:center;font-size:9pt;margin:10px 0">Reste à payer : <strong style="color:${d.remainingBalance > 0 ? '#dc2626' : '#059669'}">${fmtMoney(d.remainingBalance)} ${d.payment.currency}</strong></p>` : ''}

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Comptable</p><div style="border-top:1px solid #94a3b8;margin-top:45px;padding-top:4px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Directeur</p>${renderStampSignature(d.org.signature_url, d.org.stamp_url, 'Cachet & Signature')}</div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">${dateNow()} — ${d.org.name} — CampusFlow</div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 4: Bilingue
// ════════════════════════════════════════════════════════════
function receipt4Html(d: ReceiptData): string {
    return `<div class="page">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:20px">
            <div style="width:35%;font-size:8pt;line-height:1.5"><strong style="color:#0d9488">REÇU DE PAIEMENT</strong><br>Payment Receipt</div>
            <div style="text-align:center">
                ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:60px;height:60px;border-radius:10px;object-fit:contain"/>` : `<div style="width:60px;height:60px;border-radius:10px;background:#0d9488;margin:0 auto;display:flex;align-items:center;justify-content:center;color:white;font-size:20pt;font-weight:bold">${d.org.name[0]}</div>`}
                <h3 style="font-size:10pt;margin-top:3px">${d.org.name}</h3>
            </div>
            <div style="width:35%;text-align:right;font-size:9pt"><strong>N° / No:</strong> ${d.receiptNumber}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:15px 0">
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;width:35%;font-weight:600;font-size:9pt">Nom / Name</td><td style="padding:8px;border:1px solid #99f6e4">${d.student.last_name} ${d.student.first_name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;font-weight:600;font-size:9pt">Matricule / Student ID</td><td style="padding:8px;border:1px solid #99f6e4">${d.student.matricule || '—'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;font-weight:600;font-size:9pt">Classe / Class</td><td style="padding:8px;border:1px solid #99f6e4">${d.student.classroom_name || '—'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;font-weight:600;font-size:9pt">Objet / Purpose</td><td style="padding:8px;border:1px solid #99f6e4">${d.payment.description}</td></tr>
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;font-weight:600;font-size:9pt">Mode / Method</td><td style="padding:8px;border:1px solid #99f6e4">${methodLabel(d.payment.method)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #99f6e4;background:#f0fdfa;font-weight:600;font-size:9pt">Date</td><td style="padding:8px;border:1px solid #99f6e4">${new Date(d.payment.paid_at).toLocaleDateString('fr-FR')}</td></tr>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin:15px 0">
            <div style="background:#0d9488;color:white;padding:15px 20px;border-radius:10px 0 0 10px;text-align:center">
                <p style="font-size:8pt;text-transform:uppercase;opacity:0.8">Montant / Amount</p>
                <p style="font-size:20pt;font-weight:900">${fmtMoney(d.payment.amount)}</p>
                <p style="font-size:9pt">${d.payment.currency}</p>
            </div>
            <div style="background:#f0fdfa;padding:15px 20px;border-radius:0 10px 10px 0;border:1px solid #99f6e4;display:flex;flex-direction:column;justify-content:center">
                <p style="font-size:8pt;color:#64748b">En lettres / In words:</p>
                <p style="font-size:9pt;font-style:italic;color:#134e4a">${amountInWords(d.payment.amount)} francs CFA</p>
                ${d.remainingBalance !== undefined ? `<p style="font-size:8pt;color:#64748b;margin-top:5px">Solde / Balance: <strong style="color:${d.remainingBalance > 0 ? '#dc2626' : '#059669'}">${fmtMoney(d.remainingBalance)} ${d.payment.currency}</strong></p>` : ''}
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b">Cashier / Caissier</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:7pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b">Bursar / Intendant</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:7pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b;margin-bottom:2px;">Principal / Directeur</p>${renderStampSignature(d.org.signature_url, d.org.stamp_url, 'Stamp & Signature')}</div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">${dateNow()} — ${d.org.name} — CampusFlow</div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 5: Moderne Minimaliste
// ════════════════════════════════════════════════════════════
function receipt5Html(d: ReceiptData): string {
    return `<div class="page" style="font-family:'Inter','Segoe UI',sans-serif">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:20px 25px;border-radius:16px;margin-bottom:20px">
            <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:12px">
                    ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:45px;height:45px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,0.1);padding:3px"/>` : `<div style="width:45px;height:45px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:16pt;font-weight:bold">${d.org.name[0]}</div>`}
                    <div>
                        <h1 style="font-size:13pt;font-weight:800">${d.org.name}</h1>
                        <p style="font-size:7pt;color:#94a3b8">${d.org.city || ''}${d.org.phone ? ` • ${d.org.phone}` : ''}</p>
                    </div>
                </div>
                <div style="text-align:right">
                    <p style="font-size:7pt;color:#94a3b8;text-transform:uppercase">Reçu de paiement</p>
                    <p style="font-size:11pt;font-weight:800;font-family:monospace">${d.receiptNumber}</p>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
            <div style="padding:15px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
                <p style="font-size:7pt;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Étudiant</p>
                <p style="font-size:12pt;font-weight:700">${d.student.last_name} ${d.student.first_name}</p>
                <p style="font-size:8pt;color:#64748b;margin-top:2px">${d.student.matricule || '—'} • ${d.student.classroom_name || '—'}</p>
            </div>
            <div style="padding:15px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
                <p style="font-size:7pt;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Paiement</p>
                <p style="font-size:10pt;font-weight:600">${d.payment.description}</p>
                <p style="font-size:8pt;color:#64748b;margin-top:2px">${methodLabel(d.payment.method)} • ${new Date(d.payment.paid_at).toLocaleDateString('fr-FR')}</p>
            </div>
        </div>

        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:30px;border-radius:16px;text-align:center;margin-bottom:15px">
            <p style="font-size:8pt;text-transform:uppercase;letter-spacing:3px;opacity:0.7;margin-bottom:8px">Montant reçu</p>
            <p style="font-size:36pt;font-weight:900;letter-spacing:-1px">${fmtMoney(d.payment.amount)}</p>
            <p style="font-size:10pt;opacity:0.8;margin-top:3px">${d.payment.currency}</p>
            <p style="font-size:8pt;font-style:italic;opacity:0.6;margin-top:8px">${amountInWords(d.payment.amount)} francs CFA</p>
        </div>

        ${d.remainingBalance !== undefined ? `
        <div style="display:flex;justify-content:center;gap:20px;margin-bottom:15px">
            <div style="padding:10px 25px;border-radius:10px;text-align:center;background:${d.remainingBalance > 0 ? '#fef2f2;border:1px solid #fecaca' : '#f0fdf4;border:1px solid #bbf7d0'}">
                <p style="font-size:7pt;color:#64748b;text-transform:uppercase">Solde restant</p>
                <p style="font-size:14pt;font-weight:800;color:${d.remainingBalance > 0 ? '#dc2626' : '#059669'}">${fmtMoney(d.remainingBalance)} ${d.payment.currency}</p>
            </div>
        </div>` : ''}

        <div style="display:flex;justify-content:space-between;margin-top:30px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Caissier</p><div style="border-top:1px solid #94a3b8;margin-top:45px;padding-top:4px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b;margin-bottom:4px;">Le Directeur</p>${renderStampSignature(d.org.signature_url, d.org.stamp_url, 'Cachet & Signature')}</div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            🔗 ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT: Generate Receipt PDF
// ════════════════════════════════════════════════════════════
export function generateReceiptPDF(data: ReceiptData, templateId: number = 1): void {
    const pw = window.open('', '_blank');
    if (!pw) { alert('Veuillez autoriser les pop-ups pour générer le reçu.'); return; }

    let bodyHtml: string;
    switch (templateId) {
        case 2: bodyHtml = receipt2Html(data); break;
        case 3: bodyHtml = receipt3Html(data); break;
        case 4: bodyHtml = receipt4Html(data); break;
        case 5: bodyHtml = receipt5Html(data); break;
        default: bodyHtml = receipt1Html(data); break;
    }

    pw.document.write(`<!DOCTYPE html><html><head>
        <title>Reçu ${data.receiptNumber} — ${data.student.last_name} ${data.student.first_name} — ${data.org.name}</title>
        <meta charset="UTF-8"/>
        <style>${baseCss}</style>
    </head><body>${bodyHtml}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
}

// Generate receipt number
export function generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
    return `REC-${year}-${seq}`;
}

// Template metadata for admin selector
export const RECEIPT_TEMPLATES = [
    { id: 1, name: 'Classique Camerounais', description: 'Format standard avec en-tête bilingue République/Republic.', icon: '🇨🇲', suited: 'Collèges, Lycées' },
    { id: 2, name: 'Universitaire', description: 'Design universitaire avec accent bleu et mise en page épurée.', icon: '🎓', suited: 'Universités, Grandes Écoles' },
    { id: 3, name: 'Formation Professionnelle', description: 'Icônes descriptives et style chaleureux pour centres de formation.', icon: '🔧', suited: 'CFP, Centres de métiers' },
    { id: 4, name: 'Bilingue (FR/EN)', description: 'Champs bilingues français/anglais avec design teal bicolore.', icon: '🌍', suited: 'Établissements bilingues' },
    { id: 5, name: 'Moderne Minimaliste', description: 'Design premium avec gradient glassmorphism et typographie large.', icon: '✨', suited: 'Écoles modernes' },
];
