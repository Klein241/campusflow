// ═══════════════════════════════════════════════════════════════
// CAMPUSFLOW — Certificate PDF Generator
// 4 professional & customizable templates for training completion certificates
// ═══════════════════════════════════════════════════════════════

export interface CertificateData {
    org: {
        name: string;
        logo_url?: string;
        signature_url?: string;
        stamp_url?: string;
        phone?: string;
        email?: string;
        city?: string;
        country?: string;
        motto?: string;
    };
    student: {
        first_name: string;
        last_name: string;
        matricule?: string;
        classroom_name?: string;
        filiere_name?: string;
    };
    certificate: {
        title: string;              // ex: "CERTIFICAT DE FIN DE FORMATION"
        subtitle?: string;           // ex: "ATTESTATION DE RÉUSSITE", "CERTIFICATE OF APPRECIATION"
        presented_to_label?: string; // ex: "Décerné avec les honneurs à"
        course_name: string;         // ex: "Développement Web & Mobile", "Gestion de Projet"
        description?: string;        // ex: "Pour avoir suivi avec succès et validé l'ensemble des modules..."
        mention?: string;            // ex: "Mention Très Bien", "Excellence"
        date_issued: string;         // ex: "14 Août 2026"
        location?: string;           // ex: "Yaoundé"
        signatory1_title: string;    // ex: "Le Directeur de Formation"
        signatory1_name?: string;    // ex: "Dr. Jean Dupont"
        signatory2_title?: string;   // ex: "Le Formateur Principal"
        signatory2_name?: string;    // ex: "Prof. Alain K."
        show_stamp?: boolean;
        show_signature?: boolean;
    };
}

export const CERTIFICATE_TEMPLATES = [
    {
        id: 1,
        name: 'Émeraude & Or Prestige',
        description: 'Style géométrique moderne aux tons vert émeraude et dorures. Médaille centrale dorée et finitions de luxe.',
        icon: '💎',
        color: '#0f766e',
        suited: 'Formations professionnelles, Certifications, Écoles techniques'
    },
    {
        id: 2,
        name: 'Carmin & Ardoise Ondulé',
        description: 'Style élégant avec courbes bordeaux et ardoise. Médaille en laurier en haut à gauche et typographie épurée.',
        icon: '🍷',
        color: '#991b1b',
        suited: 'Diplômes universitaires, Instituts, Grandes écoles'
    },
    {
        id: 3,
        name: 'Bleu Nuit & Rubis Royal',
        description: 'Cadre double classique avec rubans géométriques et cocarde d\'excellence bleue et rubis.',
        icon: '👑',
        color: '#1e3a8a',
        suited: 'Certificats d\'honneur, Prix d\'excellence, Cursus d\'entreprise'
    },
    {
        id: 4,
        name: 'Or Prestige & Sceau Impérial',
        description: 'Design intemporel avec encadrements or filigranés, médaillon doré central et typographie majestueuse.',
        icon: '✨',
        color: '#b45309',
        suited: 'Attestations officielles, Séminaires, Conférences'
    },
];

const baseCertificateCss = `
@page {
    size: A4 landscape;
    margin: 0;
}
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
body {
    font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
    width: 297mm;
    height: 210mm;
    margin: 0 auto;
    background: #ffffff;
    color: #1e293b;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
@media print {
    body {
        width: 100vw;
        height: 100vh;
    }
}
.script-name {
    font-family: 'Brush Script MT', 'Great Vibes', 'Dancing Script', 'Lucida Calligraphy', cursive, serif;
    font-size: 38pt;
    letter-spacing: 1px;
    font-weight: 500;
}
.gold-badge {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, #fcd34d 0%, #d97706 70%, #b45309 100%);
    box-shadow: 0 4px 14px rgba(180, 83, 9, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 900;
    text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    border: 3px dashed #fff;
}
.gold-badge::after, .gold-badge::before {
    content: '';
    position: absolute;
    bottom: -16px;
    width: 16px;
    height: 24px;
    background: #b45309;
    z-index: -1;
}
.gold-badge::before {
    left: 20px;
    transform: rotate(18deg);
    border-bottom: 6px solid transparent;
}
.gold-badge::after {
    right: 20px;
    transform: rotate(-18deg);
    border-bottom: 6px solid transparent;
}
`;

// ════════════════════════════════════════════════════════════
// TEMPLATE 1: Émeraude & Or Prestige (Emerald & Gold Geometric)
// ════════════════════════════════════════════════════════════
function template1Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT DE FIN DE FORMATION';
    const subtitle = d.certificate.subtitle || 'CERTIFICATE OF APPRECIATION';
    const presentedTo = d.certificate.presented_to_label || 'DÉCERNÉ AVEC LES HONNEURS À';
    const desc = d.certificate.description || `Pour avoir suivi avec succès et validé avec rigueur l'ensemble des compétences et modules requis pour la formation en <strong>${d.certificate.course_name || d.student.filiere_name || 'Formation Professionnelle'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#fafcfb;border:1px solid #e2e8f0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:22mm 24mm;overflow:hidden;">
        <!-- Geometric Emerald / Gold Corners -->
        <!-- Top Left -->
        <div style="position:absolute;top:0;left:0;width:120px;height:120px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:90px solid #064e3b;border-right:90px solid transparent;"></div>
            <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:105px solid transparent;border-left:105px solid #047857;opacity:0.3;"></div>
            <div style="position:absolute;top:10px;left:10px;width:12px;height:70px;background:#d97706;transform:rotate(-45deg);transform-origin:top left;"></div>
        </div>
        <!-- Bottom Right -->
        <div style="position:absolute;bottom:0;right:0;width:120px;height:120px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;bottom:0;right:0;width:0;height:0;border-bottom:90px solid #064e3b;border-left:90px solid transparent;"></div>
            <div style="position:absolute;bottom:10px;right:10px;width:12px;height:70px;background:#d97706;transform:rotate(-45deg);transform-origin:bottom right;"></div>
        </div>
        <!-- Inner Border Frame -->
        <div style="position:absolute;top:12mm;left:12mm;right:12mm;bottom:12mm;border:1.5px solid #047857;pointer-events:none;">
            <div style="position:absolute;top:2px;left:2px;right:2px;bottom:2px;border:1px solid #d97706;opacity:0.6;"></div>
        </div>

        <!-- Header: Logo & Title -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:55px;max-width:180px;object-fit:contain;margin-bottom:8px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#047857;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">${d.org.name}</p>
            <h1 style="font-size:26pt;font-weight:900;color:#064e3b;letter-spacing:2px;text-transform:uppercase;margin:6px 0 4px;">${title}</h1>
            <div style="display:inline-block;background:#d97706;color:#ffffff;font-size:9pt;font-weight:bold;letter-spacing:2px;padding:3px 18px;border-radius:20px;text-transform:uppercase;">
                ${subtitle}
            </div>
        </div>

        <!-- Body: Student Name & Citation -->
        <div style="text-align:center;position:relative;z-index:2;margin:10px 0;">
            <p style="font-size:10pt;color:#64748b;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:6px;">${presentedTo}</p>
            <div class="script-name" style="color:#0f766e;margin-bottom:4px;">${studentName}</div>
            <div style="width:280px;height:1.5px;background:linear-gradient(to right, transparent, #0f766e, transparent);margin:auto;margin-bottom:12px;"></div>
            
            <p style="font-size:10.5pt;color:#334155;line-height:1.6;max-width:680px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `
                <div style="margin-top:8px;font-size:10pt;font-weight:bold;color:#b45309;letter-spacing:1px;">
                    ★ ${d.certificate.mention} ★
                </div>
            ` : ''}
        </div>

        <!-- Footer: Signatures, Medal & Date -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 20px;">
            <!-- Left: Signatory 1 -->
            <div style="text-align:center;width:180px;">
                <div style="height:55px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:50px;max-width:140px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #0f766e;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#064e3b;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:8pt;color:#64748b;">${d.certificate.signatory1_title || 'Directeur Général'}</p>
                </div>
            </div>

            <!-- Center: Official Medal & Stamp -->
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <div style="position:absolute;z-index:3;top:-25px;opacity:0.85;transform:rotate(-6deg);">
                        <img src="${d.org.stamp_url}" style="width:85px;height:85px;object-fit:contain;" alt="Cachet" />
                    </div>
                ` : ''}
                <div class="gold-badge">
                    <span style="font-size:7pt;letter-spacing:1px;text-transform:uppercase;">OFFICIEL</span>
                    <span style="font-size:12pt;font-weight:900;">★</span>
                    <span style="font-size:6.5pt;letter-spacing:0.5px;">CAMPUSFLOW</span>
                </div>
            </div>

            <!-- Right: Date & Signatory 2 -->
            <div style="text-align:center;width:180px;">
                <div style="height:55px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;margin-bottom:4px;">
                    <p style="font-size:8pt;color:#64748b;">Délivré le</p>
                    <p style="font-size:9pt;font-weight:bold;color:#0f766e;">${location}${dateStr}</p>
                </div>
                <div style="border-top:1.5px solid #0f766e;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#064e3b;">${d.certificate.signatory2_name || d.org.name}</p>
                    <p style="font-size:8pt;color:#64748b;">${d.certificate.signatory2_title || 'Responsable Académique'}</p>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 2: Carmin & Ardoise Ondulé (Crimson & Slate Wave)
// ════════════════════════════════════════════════════════════
function template2Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT DE FORMATION';
    const subtitle = d.certificate.subtitle || 'DIPLÔME DE RÉUSSITE ACADÉMIQUE';
    const presentedTo = d.certificate.presented_to_label || 'FIÈREMENT DÉCERNÉ À';
    const desc = d.certificate.description || `En reconnaissance de l'engagement, de l'assiduité et de l'excellence démontrés lors de la formation <strong>${d.certificate.course_name || d.student.filiere_name || 'Spécialisée'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#ffffff;border:1px solid #e2e8f0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:24mm 28mm;overflow:hidden;">
        <!-- Curved Background Swooshes -->
        <!-- Top Right Crimson & Slate Wave -->
        <svg style="position:absolute;top:0;right:0;width:340px;height:240px;pointer-events:none;" viewBox="0 0 340 240" fill="none">
            <path d="M0,0 C120,40 240,100 340,240 L340,0 Z" fill="#0f172a"/>
            <path d="M40,0 C140,50 250,120 340,200 L340,0 Z" fill="#991b1b" opacity="0.9"/>
        </svg>
        <!-- Bottom Left Slate & Crimson Wave -->
        <svg style="position:absolute;bottom:0;left:0;width:340px;height:240px;pointer-events:none;" viewBox="0 0 340 240" fill="none">
            <path d="M0,240 L340,240 C220,200 100,140 0,0 Z" fill="#0f172a"/>
            <path d="M0,240 L300,240 C190,190 90,120 0,40 Z" fill="#991b1b" opacity="0.9"/>
        </svg>

        <!-- Top Left Laurel Badge -->
        <div style="position:absolute;top:20mm;left:24mm;display:flex;align-items:center;gap:8px;z-index:3;">
            <div style="width:55px;height:55px;border-radius:50%;background:radial-gradient(circle, #fde047 0%, #ca8a04 100%);border:2px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.15);">
                <span style="font-size:16pt;color:#451a03;line-height:1;">🏆</span>
                <span style="font-size:5.5pt;font-weight:900;color:#451a03;letter-spacing:0.5px;">LAURÉAT</span>
            </div>
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:45px;max-width:140px;object-fit:contain;" alt="Logo" />` : ''}
        </div>

        <!-- Header -->
        <div style="text-align:center;position:relative;z-index:2;margin-top:10px;">
            <p style="font-size:10pt;font-weight:bold;color:#64748b;letter-spacing:3px;text-transform:uppercase;">${d.org.name}</p>
            <h1 style="font-size:28pt;font-weight:900;color:#0f172a;letter-spacing:2px;text-transform:uppercase;margin:4px 0 2px;">${title}</h1>
            <p style="font-size:9.5pt;font-weight:600;color:#991b1b;letter-spacing:2px;text-transform:uppercase;">${subtitle}</p>
        </div>

        <!-- Center Student Details -->
        <div style="text-align:center;position:relative;z-index:2;margin:10px 0;">
            <p style="font-size:9pt;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:6px;">${presentedTo}</p>
            <div class="script-name" style="color:#991b1b;margin-bottom:6px;font-size:42pt;">${studentName}</div>
            <div style="width:240px;height:1px;background:#e2e8f0;margin:auto;margin-bottom:12px;"></div>
            <p style="font-size:10.5pt;color:#475569;line-height:1.6;max-width:640px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `
                <p style="margin-top:8px;font-size:10.5pt;font-weight:bold;color:#991b1b;">
                    Mention : ${d.certificate.mention}
                </p>
            ` : ''}
        </div>

        <!-- Bottom Signatures -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 20px;">
            <div style="text-align:center;width:180px;">
                <div style="height:50px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:48px;max-width:130px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1px solid #94a3b8;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#0f172a;">${d.certificate.signatory1_name || 'Le Formateur'}</p>
                    <p style="font-size:8pt;color:#64748b;">${d.certificate.signatory1_title || 'Formateur Principal'}</p>
                </div>
            </div>

            <!-- Stamp -->
            <div style="text-align:center;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <img src="${d.org.stamp_url}" style="height:70px;width:70px;object-fit:contain;opacity:0.85;transform:rotate(-4deg);" alt="Cachet" />
                ` : `<div style="font-size:8pt;color:#94a3b8;">Fait à ${location}${dateStr}</div>`}
            </div>

            <div style="text-align:center;width:180px;">
                <div style="height:50px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;margin-bottom:4px;">
                    <p style="font-size:8pt;color:#64748b;">Date de délivrance</p>
                    <p style="font-size:8.5pt;font-weight:bold;color:#0f172a;">${location}${dateStr}</p>
                </div>
                <div style="border-top:1px solid #94a3b8;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#0f172a;">${d.certificate.signatory2_name || 'Le Directeur'}</p>
                    <p style="font-size:8pt;color:#64748b;">${d.certificate.signatory2_title || 'Directeur de l\'Établissement'}</p>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 3: Bleu Nuit & Rubis Royal (Royal Navy & Ruby)
// ════════════════════════════════════════════════════════════
function template3Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT D\'ACCOMPLISSEMENT';
    const subtitle = d.certificate.subtitle || 'PRIX D\'EXCELLENCE & DE RÉUSSITE';
    const presentedTo = d.certificate.presented_to_label || 'DÉCERNÉ SOLENNELLEMENT À';
    const desc = d.certificate.description || `Pour avoir complété avec distinction l'ensemble du programme de formation <strong>${d.certificate.course_name || d.student.filiere_name || 'Cursus Professionnel'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#ffffff;border:1px solid #cbd5e1;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:22mm 24mm;overflow:hidden;">
        <!-- Geometric Frame -->
        <div style="position:absolute;top:10mm;left:10mm;right:10mm;bottom:10mm;border:2px solid #1e3a8a;pointer-events:none;"></div>
        
        <!-- Top Left Navy & Ruby Corner Ribbon -->
        <div style="position:absolute;top:10mm;left:10mm;width:35px;height:90px;background:#1e3a8a;"></div>
        <div style="position:absolute;top:10mm;left:45mm;width:80px;height:25px;background:#1e3a8a;"></div>
        <div style="position:absolute;top:35mm;left:10mm;width:16px;height:65px;background:#b91c1c;"></div>

        <!-- Bottom Right Navy & Ruby Corner Ribbon -->
        <div style="position:absolute;bottom:10mm;right:10mm;width:35px;height:90px;background:#1e3a8a;"></div>
        <div style="position:absolute;bottom:10mm;right:45mm;width:80px;height:25px;background:#1e3a8a;"></div>
        <div style="position:absolute;bottom:35mm;right:10mm;width:16px;height:65px;background:#b91c1c;"></div>

        <!-- Top Right Rosette Badge -->
        <div style="position:absolute;top:18mm;right:22mm;z-index:3;text-align:center;">
            <div style="width:70px;height:70px;border-radius:50%;background:#1e3a8a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #b91c1c;box-shadow:0 4px 12px rgba(30,58,138,0.3);">
                <span style="font-size:16pt;">🎖️</span>
                <span style="font-size:6pt;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;">EXCELLENCE</span>
            </div>
        </div>

        <!-- Header -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:50px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#1e3a8a;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">${d.org.name}</p>
            <h1 style="font-size:26pt;font-weight:900;color:#1e3a8a;letter-spacing:2px;text-transform:uppercase;margin:4px 0 6px;">${title}</h1>
            <div style="display:inline-block;background:#b91c1c;color:#ffffff;font-size:8.5pt;font-weight:bold;letter-spacing:2px;padding:3px 16px;text-transform:uppercase;">
                ${subtitle}
            </div>
        </div>

        <!-- Body -->
        <div style="text-align:center;position:relative;z-index:2;margin:10px 0;">
            <p style="font-size:9pt;color:#64748b;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:6px;">${presentedTo}</p>
            <h2 style="font-size:26pt;font-weight:800;color:#0f172a;letter-spacing:1px;margin-bottom:6px;">${studentName}</h2>
            <div style="width:300px;height:2px;background:#1e3a8a;margin:auto;margin-bottom:12px;"></div>
            <p style="font-size:10pt;color:#334155;line-height:1.6;max-width:650px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `
                <p style="margin-top:6px;font-size:10pt;font-weight:bold;color:#b91c1c;">
                    ★ ${d.certificate.mention} ★
                </p>
            ` : ''}
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 30px;">
            <div style="text-align:center;width:180px;">
                <p style="font-size:9pt;font-weight:bold;color:#1e3a8a;margin-bottom:30px;">Date</p>
                <div style="border-top:1px solid #1e3a8a;padding-top:4px;">
                    <p style="font-size:9pt;color:#334155;">${location}${dateStr}</p>
                </div>
            </div>

            <!-- Central Stamp -->
            <div style="text-align:center;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <img src="${d.org.stamp_url}" style="height:75px;width:75px;object-fit:contain;opacity:0.85;" alt="Cachet" />
                ` : ''}
            </div>

            <div style="text-align:center;width:180px;">
                <div style="height:45px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:45px;max-width:130px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1px solid #1e3a8a;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#1e3a8a;">${d.certificate.signatory1_name || 'Le Président'}</p>
                    <p style="font-size:8pt;color:#64748b;">${d.certificate.signatory1_title || 'Signature & Sceau'}</p>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 4: Or Prestige & Sceau Impérial (Classic Gold Prestige)
// ════════════════════════════════════════════════════════════
function template4Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'DIPLÔME D\'HONNEUR & DE RÉUSSITE';
    const subtitle = d.certificate.subtitle || 'ATTESTATION OFFICIELLE';
    const presentedTo = d.certificate.presented_to_label || 'ATTRIBUÉ À';
    const desc = d.certificate.description || `En témoignage de l'accomplissement remarquable et de la pleine validation du programme d'études en <strong>${d.certificate.course_name || d.student.filiere_name || 'Formation Complète'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#fffdf7;border:1px solid #e2e8f0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:24mm 26mm;overflow:hidden;">
        <!-- Luxury Gold Ornate Borders -->
        <div style="position:absolute;top:8mm;left:8mm;right:8mm;bottom:8mm;border:3px double #d97706;pointer-events:none;"></div>
        <div style="position:absolute;top:12mm;left:12mm;right:12mm;bottom:12mm;border:1px solid #b45309;opacity:0.4;pointer-events:none;"></div>

        <!-- Header -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:55px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#b45309;letter-spacing:4px;text-transform:uppercase;margin-bottom:4px;">${d.org.name}</p>
            <h1 style="font-size:25pt;font-weight:900;color:#78350f;letter-spacing:3px;text-transform:uppercase;margin:4px 0 4px;">${title}</h1>
            <p style="font-size:9pt;font-weight:bold;color:#d97706;letter-spacing:2px;text-transform:uppercase;">— ${subtitle} —</p>
        </div>

        <!-- Body -->
        <div style="text-align:center;position:relative;z-index:2;margin:8px 0;">
            <p style="font-size:9pt;color:#92400e;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:6px;">${presentedTo}</p>
            <div class="script-name" style="color:#78350f;margin-bottom:6px;font-size:40pt;">${studentName}</div>
            <div style="width:260px;height:1px;background:#d97706;margin:auto;margin-bottom:12px;"></div>
            <p style="font-size:10.5pt;color:#451a03;line-height:1.6;max-width:660px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `
                <div style="margin-top:8px;display:inline-block;padding:3px 18px;border:1px solid #d97706;border-radius:20px;font-size:9.5pt;font-weight:bold;color:#b45309;">
                    Mention d'Honneur : ${d.certificate.mention}
                </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 25px;">
            <div style="text-align:center;width:180px;">
                <div style="height:50px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:48px;max-width:130px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #d97706;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#78350f;">${d.certificate.signatory1_name || 'Le Formateur'}</p>
                    <p style="font-size:8pt;color:#92400e;">${d.certificate.signatory1_title || 'Responsable Pédagogique'}</p>
                </div>
            </div>

            <!-- Gold Medallion & Cachet -->
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <div style="position:absolute;z-index:3;top:-20px;opacity:0.85;transform:rotate(-6deg);">
                        <img src="${d.org.stamp_url}" style="width:80px;height:80px;object-fit:contain;" alt="Cachet" />
                    </div>
                ` : ''}
                <div class="gold-badge">
                    <span style="font-size:6.5pt;letter-spacing:1px;text-transform:uppercase;">SCEAU</span>
                    <span style="font-size:14pt;font-weight:900;">★</span>
                    <span style="font-size:6pt;letter-spacing:0.5px;">D'HONNEUR</span>
                </div>
            </div>

            <div style="text-align:center;width:180px;">
                <div style="height:50px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;margin-bottom:4px;">
                    <p style="font-size:8pt;color:#92400e;">Fait le</p>
                    <p style="font-size:8.5pt;font-weight:bold;color:#78350f;">${location}${dateStr}</p>
                </div>
                <div style="border-top:1.5px solid #d97706;padding-top:4px;">
                    <p style="font-size:9pt;font-weight:bold;color:#78350f;">${d.certificate.signatory2_name || 'La Direction'}</p>
                    <p style="font-size:8pt;color:#92400e;">${d.certificate.signatory2_title || 'Directeur Général'}</p>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT: Generate Certificate PDF
// ════════════════════════════════════════════════════════════
export function generateCertificatePDF(data: CertificateData, templateId: number = 1): void {
    const pw = window.open('', '_blank');
    if (!pw) {
        alert('Veuillez autoriser les pop-ups pour générer le certificat PDF.');
        return;
    }

    let bodyHtml: string;
    switch (templateId) {
        case 2: bodyHtml = template2Html(data); break;
        case 3: bodyHtml = template3Html(data); break;
        case 4: bodyHtml = template4Html(data); break;
        default: bodyHtml = template1Html(data); break;
    }

    const studentName = `${data.student.last_name} ${data.student.first_name}`.trim();
    pw.document.write(`<!DOCTYPE html><html><head>
        <title>Certificat — ${studentName} — ${data.org.name}</title>
        <meta charset="UTF-8"/>
        <style>${baseCertificateCss}</style>
    </head><body>${bodyHtml}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
}
