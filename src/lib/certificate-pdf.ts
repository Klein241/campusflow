// ═══════════════════════════════════════════════════════════════
// CAMPUSFLOW — Certificate & Professional Attestation PDF Generator
// 5 customizable templates including specialized PRO Competencies layout
// ═══════════════════════════════════════════════════════════════

export interface CertificateModule {
    name: string;
    hours?: number;
    grade?: string;
    status?: string; // 'Acquis', 'Validé', 'Excellent'
}

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
        accreditation_number?: string; // N° d'Agrément ministériel ou préfectoral
    };
    student: {
        first_name: string;
        last_name: string;
        matricule?: string;
        classroom_name?: string;
        filiere_name?: string;
        training_duration?: string; // ex: "3 Mois (360 heures)"
        rhythm?: string; // ex: "Cours du Soir", "Plein temps"
    };
    certificate: {
        title: string;              // ex: "ATTESTATION DE FIN DE FORMATION PROFESSIONNELLE"
        subtitle?: string;           // ex: "CERTIFICAT DE COMPÉTENCES MÉTIER"
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
        certificate_code?: string;   // ex: "CF-PRO-2026-8942"
        verification_url?: string;   // ex: "https://campusflow.app/verify/CF-PRO-2026-8942"
        modules?: CertificateModule[]; // Modules de compétences validés
        duration_hours?: number | string; // Volume horaire total (ex: 360)
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
    {
        id: 5,
        name: '🏢 Métier & Compétences PRO',
        description: 'Format professionnel spécialisé avec tableau des modules validés, volume horaire, code sécurisé et accréditation.',
        icon: '💼',
        color: '#0284c7',
        suited: 'Centres de formation continue, Formateurs indépendants, Bootcamps et CQP/DQP'
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
    font-size: 36pt;
    letter-spacing: 1px;
    font-weight: 500;
}
.gold-badge {
    position: relative;
    width: 76px;
    height: 76px;
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
    bottom: -14px;
    width: 14px;
    height: 22px;
    background: #b45309;
    z-index: -1;
}
.gold-badge::before {
    left: 18px;
    transform: rotate(18deg);
    border-bottom: 6px solid transparent;
}
.gold-badge::after {
    right: 18px;
    transform: rotate(-18deg);
    border-bottom: 6px solid transparent;
}
`;

// Helper code de vérification
function getCertCode(d: CertificateData): string {
    if (d.certificate.certificate_code) return d.certificate.certificate_code;
    const mat = (d.student.matricule || 'STG').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    const yr = new Date().getFullYear();
    return `CF-${yr}-${mat}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 1: Émeraude & Or Prestige
// ════════════════════════════════════════════════════════════
function template1Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT DE FIN DE FORMATION';
    const subtitle = d.certificate.subtitle || 'CERTIFICATE OF APPRECIATION';
    const presentedTo = d.certificate.presented_to_label || 'DÉCERNÉ AVEC LES HONNEURS À';
    const durationText = d.student.training_duration ? ` pour une durée de <strong>${d.student.training_duration}</strong>` : '';
    const desc = d.certificate.description || `Pour avoir suivi avec succès et validé avec rigueur l'ensemble des compétences et modules requis pour la formation en <strong>${d.certificate.course_name || d.student.filiere_name || 'Formation Professionnelle'}</strong>${durationText}.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';
    const hasSignatory2 = Boolean(d.certificate.signatory2_name && d.certificate.signatory2_name.trim());
    const certCode = getCertCode(d);

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#fafcfb;border:1px solid #e2e8f0;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:18mm 22mm;overflow:hidden;">
        <!-- Geometric Emerald / Gold Corners -->
        <div style="position:absolute;top:0;left:0;width:110px;height:110px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:80px solid #064e3b;border-right:80px solid transparent;"></div>
            <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:95px solid transparent;border-left:95px solid #047857;opacity:0.3;"></div>
            <div style="position:absolute;top:8px;left:8px;width:10px;height:60px;background:#d97706;transform:rotate(-45deg);transform-origin:top left;"></div>
        </div>
        <div style="position:absolute;bottom:0;right:0;width:110px;height:110px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;bottom:0;right:0;width:0;height:0;border-bottom:80px solid #064e3b;border-left:80px solid transparent;"></div>
            <div style="position:absolute;bottom:8px;right:8px;width:10px;height:60px;background:#d97706;transform:rotate(-45deg);transform-origin:bottom right;"></div>
        </div>
        <div style="position:absolute;top:10mm;left:10mm;right:10mm;bottom:10mm;border:1.5px solid #047857;pointer-events:none;">
            <div style="position:absolute;top:2px;left:2px;right:2px;bottom:2px;border:1px solid #d97706;opacity:0.6;"></div>
        </div>

        <!-- Header: Logo & Title -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:10.5pt;font-weight:bold;color:#047857;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">${d.org.name}</p>
            ${d.org.accreditation_number ? `<p style="font-size:7.5pt;color:#64748b;letter-spacing:1px;">Agrément N° ${d.org.accreditation_number}</p>` : ''}
            <h1 style="font-size:24pt;font-weight:900;color:#064e3b;letter-spacing:1.5px;text-transform:uppercase;margin:4px 0 3px;">${title}</h1>
            <div style="display:inline-block;background:#d97706;color:#ffffff;font-size:8.5pt;font-weight:bold;letter-spacing:2px;padding:2px 16px;border-radius:20px;text-transform:uppercase;">
                ${subtitle}
            </div>
        </div>

        <!-- Body: Student Name & Citation -->
        <div style="text-align:center;position:relative;z-index:2;margin:6px 0;">
            <p style="font-size:9.5pt;color:#64748b;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-bottom:4px;">${presentedTo}</p>
            <div class="script-name" style="color:#0f766e;margin-bottom:2px;">${studentName}</div>
            <div style="width:240px;height:1.5px;background:linear-gradient(to right, transparent, #0f766e, transparent);margin:auto;margin-bottom:8px;"></div>
            
            <p style="font-size:10pt;color:#334155;line-height:1.5;max-width:660px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `
                <div style="margin-top:6px;font-size:9.5pt;font-weight:bold;color:#b45309;letter-spacing:1px;">
                    ★ ${d.certificate.mention} ★
                </div>
            ` : ''}
        </div>

        <!-- Footer: Signatures, Medal & Date + Code -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 15px;">
            <!-- Left: Signatory 1 -->
            <div style="text-align:center;width:180px;">
                <div style="height:48px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:44px;max-width:120px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #0f766e;padding-top:3px;">
                    <p style="font-size:9pt;font-weight:bold;color:#064e3b;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory1_title || 'Directeur Général'}</p>
                </div>
            </div>

            <!-- Center: Official Medal & Verification Code -->
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <div style="position:absolute;z-index:3;top:-20px;opacity:0.85;transform:rotate(-6deg);">
                        <img src="${d.org.stamp_url}" style="width:75px;height:75px;object-fit:contain;" alt="Cachet" />
                    </div>
                ` : ''}
                <div class="gold-badge">
                    <span style="font-size:6.5pt;letter-spacing:1px;text-transform:uppercase;">OFFICIEL</span>
                    <span style="font-size:11pt;font-weight:900;">★</span>
                    <span style="font-size:6pt;letter-spacing:0.5px;">IZITEACH</span>
                </div>
                <span style="margin-top:6px;font-size:7pt;color:#64748b;font-family:monospace;letter-spacing:0.5px;">Code : ${certCode}</span>
            </div>

            <!-- Right: Date or Signatory 2 -->
            <div style="text-align:center;width:180px;">
                ${hasSignatory2 ? `
                    <div style="margin-bottom:10px;">
                        <p style="font-size:7.5pt;color:#64748b;">Délivré le</p>
                        <p style="font-size:8.5pt;font-weight:bold;color:#0f766e;">${location}${dateStr}</p>
                    </div>
                    <div style="border-top:1.5px solid #0f766e;padding-top:3px;">
                        <p style="font-size:9pt;font-weight:bold;color:#064e3b;">${d.certificate.signatory2_name}</p>
                        <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory2_title || 'Responsable Pédagogique'}</p>
                    </div>
                ` : `
                    <div style="padding-top:15px;">
                        <p style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Délivré le</p>
                        <p style="font-size:9.5pt;font-weight:bold;color:#064e3b;">${location}${dateStr}</p>
                        <div style="width:110px;height:1px;background:#0f766e;margin:6px auto 0;"></div>
                    </div>
                `}
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 2: Carmin & Ardoise Ondulé
// ════════════════════════════════════════════════════════════
function template2Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'DIPLÔME D\'ÉTABLISSEMENT';
    const subtitle = d.certificate.subtitle || 'ATTESTATION DE RÉUSSITE ACADÉMIQUE';
    const presentedTo = d.certificate.presented_to_label || 'CE DIPLÔME EST DÉCERNÉ À';
    const desc = d.certificate.description || `En reconnaissance des compétences acquises et de la validation rigoureuse des évaluations du programme <strong>${d.certificate.course_name || d.student.filiere_name || 'Enseignement Supérieur'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';
    const hasSignatory2 = Boolean(d.certificate.signatory2_name && d.certificate.signatory2_name.trim());
    const certCode = getCertCode(d);

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#fffaf8;border:1px solid #fed7aa;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:18mm 22mm;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(to right, #991b1b, #c2410c, #991b1b);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:7px;background:linear-gradient(to right, #991b1b, #c2410c, #991b1b);"></div>
        <div style="position:absolute;top:8mm;left:8mm;right:8mm;bottom:8mm;border:1px solid #e2e8f0;pointer-events:none;"></div>

        <!-- Header -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#991b1b;letter-spacing:3px;text-transform:uppercase;">${d.org.name}</p>
            <h1 style="font-size:24pt;font-weight:900;color:#1e293b;letter-spacing:1px;text-transform:uppercase;margin:4px 0 2px;">${title}</h1>
            <p style="font-size:9pt;font-weight:600;color:#c2410c;letter-spacing:2px;text-transform:uppercase;">${subtitle}</p>
        </div>

        <!-- Center -->
        <div style="text-align:center;position:relative;z-index:2;">
            <p style="font-size:9.5pt;color:#64748b;text-transform:uppercase;letter-spacing:2px;font-weight:600;">${presentedTo}</p>
            <div class="script-name" style="color:#991b1b;margin:4px 0;">${studentName}</div>
            <p style="font-size:10pt;color:#334155;line-height:1.5;max-width:650px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `<div style="margin-top:6px;font-size:9.5pt;font-weight:bold;color:#c2410c;">★ ${d.certificate.mention} ★</div>` : ''}
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 15px;">
            <div style="text-align:center;width:180px;">
                <div style="height:48px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:44px;max-width:120px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #991b1b;padding-top:3px;">
                    <p style="font-size:9pt;font-weight:bold;color:#1e293b;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory1_title || 'Directeur'}</p>
                </div>
            </div>

            <div style="text-align:center;">
                <div class="gold-badge" style="margin:auto;">
                    <span style="font-size:6.5pt;letter-spacing:1px;">EXCELLENCE</span>
                    <span style="font-size:11pt;">★</span>
                    <span style="font-size:6pt;">CERTIFIÉ</span>
                </div>
                <span style="font-size:7pt;color:#64748b;font-family:monospace;display:block;margin-top:4px;">Réf : ${certCode}</span>
            </div>

            <div style="text-align:center;width:180px;">
                ${hasSignatory2 ? `
                    <div style="margin-bottom:10px;">
                        <p style="font-size:7.5pt;color:#64748b;">Fait le</p>
                        <p style="font-size:8.5pt;font-weight:bold;color:#991b1b;">${location}${dateStr}</p>
                    </div>
                    <div style="border-top:1.5px solid #991b1b;padding-top:3px;">
                        <p style="font-size:9pt;font-weight:bold;color:#1e293b;">${d.certificate.signatory2_name}</p>
                        <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory2_title || 'Doyen / Responsable'}</p>
                    </div>
                ` : `
                    <div style="padding-top:15px;">
                        <p style="font-size:8pt;color:#64748b;">Fait à ${location}le</p>
                        <p style="font-size:9.5pt;font-weight:bold;color:#991b1b;">${dateStr}</p>
                    </div>
                `}
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 3: Bleu Nuit & Rubis Royal
// ════════════════════════════════════════════════════════════
function template3Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT D\'HONNEUR ET D\'EXCELLENCE';
    const subtitle = d.certificate.subtitle || 'ACADEMIC ACHIEVEMENT AWARD';
    const presentedTo = d.certificate.presented_to_label || 'DÉCERNÉ SOLENNELLEMENT À';
    const desc = d.certificate.description || `Pour son engagement exemplaire, sa persévérance et les résultats remarquables obtenus dans le cursus de <strong>${d.certificate.course_name || d.student.filiere_name || 'Formation'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';
    const hasSignatory2 = Boolean(d.certificate.signatory2_name && d.certificate.signatory2_name.trim());
    const certCode = getCertCode(d);

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#f8fafc;border:2px solid #1e3a8a;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:18mm 22mm;overflow:hidden;">
        <div style="position:absolute;top:6mm;left:6mm;right:6mm;bottom:6mm;border:1px dashed #3b82f6;opacity:0.6;pointer-events:none;"></div>

        <!-- Header -->
        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#1e3a8a;letter-spacing:2px;text-transform:uppercase;">${d.org.name}</p>
            <h1 style="font-size:22pt;font-weight:900;color:#1e3a8a;letter-spacing:1.5px;text-transform:uppercase;margin:4px 0 2px;">${title}</h1>
            <p style="font-size:9pt;font-weight:bold;color:#b91c1c;letter-spacing:2px;text-transform:uppercase;">${subtitle}</p>
        </div>

        <!-- Center -->
        <div style="text-align:center;position:relative;z-index:2;">
            <p style="font-size:9.5pt;color:#64748b;text-transform:uppercase;letter-spacing:2px;font-weight:600;">${presentedTo}</p>
            <div class="script-name" style="color:#1e3a8a;margin:4px 0;">${studentName}</div>
            <p style="font-size:10pt;color:#334155;line-height:1.5;max-width:650px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `<div style="margin-top:6px;font-size:9.5pt;font-weight:bold;color:#1e3a8a;">★ ${d.certificate.mention} ★</div>` : ''}
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 15px;">
            <div style="text-align:center;width:180px;">
                <div style="height:48px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:44px;max-width:120px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #1e3a8a;padding-top:3px;">
                    <p style="font-size:9pt;font-weight:bold;color:#1e3a8a;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory1_title || 'Président / Directeur'}</p>
                </div>
            </div>

            <div style="text-align:center;">
                <div class="gold-badge" style="margin:auto;background:radial-gradient(circle, #60a5fa 0%, #1e3a8a 70%, #172554 100%);">
                    <span style="font-size:6.5pt;letter-spacing:1px;">HONNEUR</span>
                    <span style="font-size:11pt;">★</span>
                    <span style="font-size:6pt;">OFFICIEL</span>
                </div>
                <span style="font-size:7pt;color:#64748b;font-family:monospace;display:block;margin-top:4px;">${certCode}</span>
            </div>

            <div style="text-align:center;width:180px;">
                ${hasSignatory2 ? `
                    <div style="margin-bottom:10px;">
                        <p style="font-size:7.5pt;color:#64748b;">Délivré le</p>
                        <p style="font-size:8.5pt;font-weight:bold;color:#1e3a8a;">${location}${dateStr}</p>
                    </div>
                    <div style="border-top:1.5px solid #1e3a8a;padding-top:3px;">
                        <p style="font-size:9pt;font-weight:bold;color:#1e3a8a;">${d.certificate.signatory2_name}</p>
                        <p style="font-size:7.5pt;color:#64748b;">${d.certificate.signatory2_title || 'Responsable du Jury'}</p>
                    </div>
                ` : `
                    <div style="padding-top:15px;">
                        <p style="font-size:8pt;color:#64748b;">Délivré le</p>
                        <p style="font-size:9.5pt;font-weight:bold;color:#1e3a8a;">${location}${dateStr}</p>
                    </div>
                `}
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 4: Or Prestige & Sceau Impérial
// ════════════════════════════════════════════════════════════
function template4Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'CERTIFICAT D\'ACCOMPLISSEMENT';
    const subtitle = d.certificate.subtitle || 'ATTESTATION OFFICIELLE';
    const presentedTo = d.certificate.presented_to_label || 'DÉCERNÉ À';
    const desc = d.certificate.description || `Pour avoir complété avec succès le programme de formation certifiante en <strong>${d.certificate.course_name || d.student.filiere_name || 'Formation'}</strong>.`;
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';
    const certCode = getCertCode(d);

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#fffdf7;border:2px solid #b45309;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:18mm 22mm;overflow:hidden;">
        <div style="position:absolute;top:6mm;left:6mm;right:6mm;bottom:6mm;border:1px solid #d97706;pointer-events:none;"></div>

        <div style="text-align:center;position:relative;z-index:2;">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:6px;" alt="Logo" />` : ''}
            <p style="font-size:11pt;font-weight:bold;color:#b45309;letter-spacing:2px;text-transform:uppercase;">${d.org.name}</p>
            <h1 style="font-size:24pt;font-weight:900;color:#78350f;letter-spacing:2px;text-transform:uppercase;margin:4px 0 2px;">${title}</h1>
            <p style="font-size:9pt;font-weight:bold;color:#92400e;letter-spacing:2px;">${subtitle}</p>
        </div>

        <div style="text-align:center;position:relative;z-index:2;">
            <p style="font-size:9.5pt;color:#78350f;text-transform:uppercase;letter-spacing:2px;">${presentedTo}</p>
            <div class="script-name" style="color:#b45309;margin:4px 0;">${studentName}</div>
            <p style="font-size:10pt;color:#451a03;line-height:1.5;max-width:650px;margin:auto;">
                ${desc}
            </p>
            ${d.certificate.mention ? `<div style="margin-top:6px;font-size:9.5pt;font-weight:bold;color:#b45309;">★ ${d.certificate.mention} ★</div>` : ''}
        </div>

        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 15px;">
            <div style="text-align:center;width:180px;">
                <div style="height:48px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:44px;max-width:120px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #b45309;padding-top:3px;">
                    <p style="font-size:9pt;font-weight:bold;color:#78350f;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:7.5pt;color:#92400e;">${d.certificate.signatory1_title || 'Directeur Général'}</p>
                </div>
            </div>

            <div style="text-align:center;">
                <div class="gold-badge" style="margin:auto;">
                    <span style="font-size:6.5pt;">SCEAU</span>
                    <span style="font-size:11pt;">★</span>
                    <span style="font-size:6pt;">OFFICIEL</span>
                </div>
                <span style="font-size:7pt;color:#92400e;font-family:monospace;display:block;margin-top:4px;">${certCode}</span>
            </div>

            <div style="text-align:center;width:180px;padding-top:15px;">
                <p style="font-size:8pt;color:#92400e;text-transform:uppercase;">Fait le</p>
                <p style="font-size:9.5pt;font-weight:bold;color:#78350f;">${location}${dateStr}</p>
            </div>
        </div>
    </div>
    `;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 5: 🏢 Métier & Compétences PRO (Centres & Formateurs)
// Avec tableau des modules validés & volume horaire
// ════════════════════════════════════════════════════════════
function template5Html(d: CertificateData): string {
    const studentName = `${d.student.first_name} ${d.student.last_name}`.trim();
    const title = d.certificate.title || 'ATTESTATION DE COMPÉTENCES PROFESSIONNELLES';
    const subtitle = d.certificate.subtitle || 'TITRE DE CERTIFICATION MÉTIER';
    const presentedTo = d.certificate.presented_to_label || 'ATTESTE QUE LE / LA STAGIAIRE';
    const duration = d.student.training_duration || '3 Mois (Formation Intensive)';
    const rhythm = d.student.rhythm || 'Présentiel & Ateliers Pratiques';
    const dateStr = d.certificate.date_issued || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const location = d.certificate.location ? `${d.certificate.location}, ` : '';
    const certCode = getCertCode(d);
    const modules = d.certificate.modules && d.certificate.modules.length > 0 
        ? d.certificate.modules 
        : [
            { name: 'Fondamentaux & Pratique Métier', hours: 80, status: 'Validé' },
            { name: 'Atelier Technique & Études de Cas', hours: 120, status: 'Validé' },
            { name: 'Projet Professionnel & Soutenance', hours: 160, status: 'Acquis' },
        ];

    return `
    <div style="position:relative;width:287mm;height:200mm;margin:auto;background:#ffffff;border:2px solid #0284c7;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;padding:14mm 18mm;overflow:hidden;">
        <!-- Top bar with brand accent -->
        <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(to right, #0284c7, #0d9488, #0284c7);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:linear-gradient(to right, #0284c7, #0d9488, #0284c7);"></div>
        <div style="position:absolute;top:6mm;left:6mm;right:6mm;bottom:6mm;border:1px solid #e0f2fe;pointer-events:none;"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;border-bottom:1.5px solid #e0f2fe;padding-bottom:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
                ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="height:44px;max-width:140px;object-fit:contain;" alt="Logo" />` : ''}
                <div>
                    <h2 style="font-size:12pt;font-weight:900;color:#0369a1;text-transform:uppercase;margin:0;">${d.org.name}</h2>
                    <p style="font-size:7.5pt;color:#64748b;margin:0;">
                        ${d.org.accreditation_number ? `Agrément / Enregistrement N° <strong>${d.org.accreditation_number}</strong> • ` : ''}
                        Centre de Formation Professionnelle Agréé
                    </p>
                </div>
            </div>

            <div style="text-align:right;">
                <div style="display:inline-block;background:#0284c7;color:#ffffff;font-size:7.5pt;font-weight:bold;letter-spacing:1px;padding:2px 10px;border-radius:12px;text-transform:uppercase;">
                    CERTIFICAT OFFICIEL
                </div>
                <p style="font-size:7.5pt;color:#64748b;font-family:monospace;margin-top:2px;">N° : <strong>${certCode}</strong></p>
            </div>
        </div>

        <!-- Main Content -->
        <div style="text-align:center;position:relative;z-index:2;margin:4px 0;">
            <p style="font-size:8.5pt;color:#64748b;letter-spacing:2px;text-transform:uppercase;font-weight:700;">${presentedTo}</p>
            <div class="script-name" style="color:#0369a1;margin:2px 0;font-size:32pt;">${studentName}</div>
            ${d.student.matricule ? `<p style="font-size:8pt;color:#64748b;font-family:monospace;margin-bottom:4px;">Matricule Stagiaire : ${d.student.matricule}</p>` : ''}
            
            <p style="font-size:9.5pt;color:#1e293b;max-width:720px;margin:auto;line-height:1.4;">
                A suivi avec succès l'ensemble du cycle de formation professionnelle en :
            </p>
            <h3 style="font-size:16pt;font-weight:900;color:#0c4a6e;text-transform:uppercase;letter-spacing:1px;margin:4px 0;">
                ${d.certificate.course_name || d.student.filiere_name || 'Formation Spécialisée'}
            </h3>

            <!-- Details Banner: Durée + Rythme + Mention -->
            <div style="display:inline-flex;align-items:center;gap:14px;background:#f0f9ff;border:1px solid #bae6fd;padding:4px 16px;border-radius:16px;margin:4px auto;font-size:8.5pt;">
                <span style="color:#0369a1;">⏱️ Durée : <strong>${duration}</strong></span>
                <span style="color:#64748b;">•</span>
                <span style="color:#0369a1;">📅 Mode : <strong>${rhythm}</strong></span>
                ${d.certificate.mention ? `
                    <span style="color:#64748b;">•</span>
                    <span style="color:#d97706;font-weight:bold;">★ ${d.certificate.mention}</span>
                ` : ''}
            </div>

            <!-- Competency Modules Table -->
            <div style="margin:8px auto 0;max-width:720px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:8pt;text-align:left;">
                    <thead>
                        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;">
                            <th style="padding:4px 10px;font-weight:700;">Bloc de Compétences / Module Validé</th>
                            <th style="padding:4px 10px;font-weight:700;text-align:center;width:100px;">Volume Horaire</th>
                            <th style="padding:4px 10px;font-weight:700;text-align:center;width:110px;">Validation Jury</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${modules.slice(0, 4).map((m, idx) => `
                            <tr style="border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                                <td style="padding:4px 10px;color:#1e293b;font-weight:600;">✓ ${m.name}</td>
                                <td style="padding:4px 10px;text-align:center;color:#64748b;">${m.hours ? `${m.hours} h` : '—'}</td>
                                <td style="padding:4px 10px;text-align:center;">
                                    <span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 8px;border-radius:10px;font-weight:700;font-size:7.5pt;">
                                        ${m.status || 'Acquis'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:2;padding:0 10px;border-top:1px solid #e0f2fe;padding-top:6px;">
            <!-- Left: Signatory 1 -->
            <div style="text-align:center;width:180px;">
                <div style="height:42px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:2px;">
                    ${d.certificate.show_signature !== false && d.org.signature_url ? `<img src="${d.org.signature_url}" style="max-height:38px;max-width:110px;object-fit:contain;" alt="Signature" />` : ''}
                </div>
                <div style="border-top:1.5px solid #0284c7;padding-top:2px;">
                    <p style="font-size:8.5pt;font-weight:bold;color:#0369a1;">${d.certificate.signatory1_name || 'La Direction'}</p>
                    <p style="font-size:7pt;color:#64748b;">${d.certificate.signatory1_title || 'Directeur du Centre'}</p>
                </div>
            </div>

            <!-- Center: Stamp & Accreditation info -->
            <div style="text-align:center;position:relative;">
                ${d.certificate.show_stamp !== false && d.org.stamp_url ? `
                    <div style="position:absolute;z-index:3;top:-28px;left:50%;transform:translateX(-50%) rotate(-4deg);opacity:0.85;">
                        <img src="${d.org.stamp_url}" style="width:70px;height:70px;object-fit:contain;" alt="Cachet" />
                    </div>
                ` : ''}
                <div style="width:48px;height:48px;border-radius:50%;background:#0284c7;color:#fff;display:flex;align-items:center;justify-content:center;margin:auto;font-size:16pt;">
                    ★
                </div>
                <p style="font-size:6.5pt;color:#64748b;margin-top:2px;">Authenticité vérifiable sur la plateforme</p>
            </div>

            <!-- Right: Date or Signatory 2 -->
            <div style="text-align:center;width:180px;">
                ${Boolean(d.certificate.signatory2_name && d.certificate.signatory2_name.trim()) ? `
                    <div style="margin-bottom:6px;">
                        <p style="font-size:7pt;color:#64748b;">Délivré à ${location}le</p>
                        <p style="font-size:8pt;font-weight:bold;color:#0369a1;">${dateStr}</p>
                    </div>
                    <div style="border-top:1.5px solid #0284c7;padding-top:2px;">
                        <p style="font-size:8.5pt;font-weight:bold;color:#0369a1;">${d.certificate.signatory2_name}</p>
                        <p style="font-size:7pt;color:#64748b;">${d.certificate.signatory2_title || 'Responsable de Formation'}</p>
                    </div>
                ` : `
                    <div style="padding-top:10px;">
                        <p style="font-size:7.5pt;color:#64748b;">Fait à ${location}le</p>
                        <p style="font-size:9pt;font-weight:bold;color:#0369a1;">${dateStr}</p>
                        <div style="width:100px;height:1px;background:#0284c7;margin:4px auto 0;"></div>
                    </div>
                `}
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
        case 5: bodyHtml = template5Html(data); break;
        default: bodyHtml = template1Html(data); break;
    }

    const studentName = `${data.student.last_name} ${data.student.first_name}`.trim();
    pw.document.write(`<!DOCTYPE html><html><head>
        <title>Attestation — ${studentName} — ${data.org.name}</title>
        <meta charset="UTF-8"/>
        <style>${baseCertificateCss}</style>
    </head><body>${bodyHtml}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
}
