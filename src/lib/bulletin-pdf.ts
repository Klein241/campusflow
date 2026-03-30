// ═══════════════════════════════════════════════════════════════
// CAMPUSFLOW — Bulletin PDF Generator
// 5 professional templates for student grade reports
// ═══════════════════════════════════════════════════════════════

export interface BulletinData {
    org: {
        name: string;
        logo_url?: string;
        phone?: string;
        email?: string;
        city?: string;
        country?: string;
        motto?: string;
        current_term?: string;
    };
    student: {
        first_name: string;
        last_name: string;
        matricule?: string;
        sex?: string;
        birth_date?: string;
        classroom_name?: string;
        filiere_name?: string;
    };
    subjects: {
        name: string;
        coefficient: number;
        teacher_name?: string;
        grades: {
            title: string;
            type: string;
            score: number;
            max_score: number;
            weight: number;
            remark?: string;
        }[];
        average: number;
    }[];
    overallAverage: number;
    rank?: number;
    totalStudents?: number;
    classAverage?: number;
    term: string;
    year: string;
    decision?: string;
    observation?: string;
}

// ── Helpers ──────────────────────────────────────────────

const fmtNum = (n: number) => n.toFixed(2);
const mention = (avg: number): string => {
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
};
const mentionEN = (avg: number): string => {
    if (avg >= 16) return 'Excellent';
    if (avg >= 14) return 'Very Good';
    if (avg >= 12) return 'Good';
    if (avg >= 10) return 'Average';
    return 'Below Average';
};
const gradeLetterEN = (avg: number): string => {
    if (avg >= 16) return 'A';
    if (avg >= 14) return 'B';
    if (avg >= 12) return 'C';
    if (avg >= 10) return 'D';
    return 'F';
};
const progressColor = (avg: number): string => {
    if (avg >= 14) return '#10b981';
    if (avg >= 10) return '#f59e0b';
    return '#ef4444';
};

const dateNow = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// ── CSS SHARED ──────────────────────────────────────────

const baseCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; font-size: 10pt; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px 8px; text-align: left; }
.page { padding: 15mm; max-width: 210mm; margin: 0 auto; }
@media print { body { padding: 0; } .page { padding: 12mm; } @page { size: A4; margin: 0; } }
`;

// ════════════════════════════════════════════════════════════
// TEMPLATE 1: Classique Camerounais
// ════════════════════════════════════════════════════════════
function template1(d: BulletinData): string {
    const subjectRows = d.subjects.map(s => {
        const ccGrades = s.grades.filter(g => g.type !== 'examen');
        const examGrades = s.grades.filter(g => g.type === 'examen');
        const ccAvg = ccGrades.length > 0 ? ccGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / ccGrades.length : null;
        const examAvg = examGrades.length > 0 ? examGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / examGrades.length : null;
        return `<tr>
            <td style="border:1px solid #94a3b8;font-weight:500">${s.name}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${s.coefficient}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${ccAvg !== null ? fmtNum(ccAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${examAvg !== null ? fmtNum(examAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-size:9pt;color:#64748b">${s.grades.length > 0 ? mention(s.average) : '—'}</td>
        </tr>`;
    }).join('');

    return `${baseCss}
    .header-cm { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:15px; border-bottom:3px double #0f172a; margin-bottom:20px; }
    .header-cm .left, .header-cm .right { width:35%; text-align:center; font-size:8pt; line-height:1.5; }
    .header-cm .center { width:30%; text-align:center; }
    .header-cm .center img { width:70px; height:70px; border-radius:8px; object-fit:contain; }
    .title-cm { text-align:center; margin:15px 0; }
    .title-cm h2 { font-size:14pt; text-transform:uppercase; letter-spacing:2px; border:2px solid #0f172a; display:inline-block; padding:6px 30px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:15px; font-size:9pt; }
    .info-grid span { background:#f1f5f9; padding:4px 10px; border-radius:4px; }
    th.cm { background:#0f172a; color:white; border:1px solid #0f172a; font-size:9pt; text-align:center; padding:8px; }
    .avg-row { background:#0f172a !important; color:white; font-weight:bold; }
    .avg-row td { border:1px solid #0f172a; text-align:center; }
    .mention-box { display:inline-block; padding:4px 15px; border-radius:4px; font-weight:bold; font-size:10pt; margin-top:5px; }
    .sig-area { display:flex; justify-content:space-between; margin-top:40px; }
    .sig-area div { text-align:center; width:40%; }
    .sig-area .line { border-top:1px solid #94a3b8; margin-top:50px; padding-top:5px; font-size:8pt; color:#64748b; }
    `;
}

function template1Html(d: BulletinData): string {
    const subjectRows = d.subjects.map(s => {
        const ccGrades = s.grades.filter(g => g.type !== 'examen');
        const examGrades = s.grades.filter(g => g.type === 'examen');
        const ccAvg = ccGrades.length > 0 ? ccGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / ccGrades.length : null;
        const examAvg = examGrades.length > 0 ? examGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / examGrades.length : null;
        return `<tr>
            <td style="border:1px solid #94a3b8;font-weight:500">${s.name}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${s.coefficient}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${ccAvg !== null ? fmtNum(ccAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${examAvg !== null ? fmtNum(examAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-size:9pt;color:#64748b">${s.grades.length > 0 ? mention(s.average) : '—'}</td>
        </tr>`;
    }).join('');

    return `<div class="page">
        <div class="header-cm">
            <div class="left">
                <strong>RÉPUBLIQUE DU CAMEROUN</strong><br>
                Paix – Travail – Patrie<br>
                ─────<br>
                MINISTÈRE DE L'ÉDUCATION
            </div>
            <div class="center">
                ${d.org.logo_url ? `<img src="${d.org.logo_url}" alt="${d.org.name}"/>` : `<div style="width:70px;height:70px;border-radius:8px;background:#0f172a;margin:0 auto;display:flex;align-items:center;justify-content:center;color:white;font-size:24pt;font-weight:bold">${d.org.name[0]}</div>`}
                <h3 style="font-size:11pt;margin-top:5px">${d.org.name}</h3>
                <p style="font-size:7pt;color:#64748b">${d.org.city || ''}${d.org.city && d.org.country ? ', ' : ''}${d.org.country || ''}</p>
            </div>
            <div class="right">
                <strong>REPUBLIC OF CAMEROON</strong><br>
                Peace – Work – Fatherland<br>
                ─────<br>
                MINISTRY OF EDUCATION
            </div>
        </div>

        <div class="title-cm"><h2>BULLETIN DE NOTES</h2></div>

        <div class="info-grid">
            <span><strong>Nom :</strong> ${d.student.last_name} ${d.student.first_name}</span>
            <span><strong>Matricule :</strong> ${d.student.matricule || '—'}</span>
            <span><strong>Classe :</strong> ${d.student.classroom_name || '—'}</span>
            <span><strong>Filière :</strong> ${d.student.filiere_name || '—'}</span>
            <span><strong>Année :</strong> ${d.year}</span>
            <span><strong>${d.term}</strong></span>
        </div>

        <table>
            <thead>
                <tr>
                    <th class="cm">Matière</th>
                    <th class="cm">Coef.</th>
                    <th class="cm">Note CC</th>
                    <th class="cm">Note Examen</th>
                    <th class="cm">Moyenne /20</th>
                    <th class="cm">Mention</th>
                </tr>
            </thead>
            <tbody>
                ${subjectRows}
                <tr class="avg-row">
                    <td colspan="4" style="text-align:right;padding-right:20px">MOYENNE GÉNÉRALE</td>
                    <td style="font-size:12pt">${fmtNum(d.overallAverage)}/20</td>
                    <td>${mention(d.overallAverage)}</td>
                </tr>
            </tbody>
        </table>

        ${d.rank ? `<p style="margin-top:10px;font-size:9pt;color:#475569"><strong>Rang :</strong> ${d.rank}${d.totalStudents ? `/${d.totalStudents}` : ''} ${d.classAverage ? `• <strong>Moyenne classe :</strong> ${fmtNum(d.classAverage)}/20` : ''}</p>` : ''}

        ${d.observation ? `<div style="margin-top:15px;padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0"><strong style="font-size:9pt">Observation du conseil :</strong><p style="font-size:9pt;margin-top:3px">${d.observation}</p></div>` : ''}
        ${d.decision ? `<p style="margin-top:10px;font-size:10pt"><strong>Décision :</strong> <span class="mention-box" style="background:${d.overallAverage >= 10 ? '#dcfce7;color:#166534' : '#fee2e2;color:#991b1b'}">${d.decision}</span></p>` : ''}

        <div class="sig-area">
            <div><p style="font-size:8pt;color:#64748b">Le Professeur Principal</p><div class="line">Signature</div></div>
            <div><p style="font-size:8pt;color:#64748b">Le Directeur / Proviseur</p><div class="line">Cachet & Signature</div></div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            Document généré le ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 2: Universitaire LMD
// ════════════════════════════════════════════════════════════
function template2Html(d: BulletinData): string {
    const subjectRows = d.subjects.map(s => {
        const credits = s.coefficient * 2;
        const validated = s.average >= 10;
        return `<tr>
            <td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:9pt;color:#64748b">${s.name.slice(0, 6).toUpperCase()}</td>
            <td style="border:1px solid #cbd5e1;padding:6px 10px;font-weight:500">${s.name}</td>
            <td style="border:1px solid #cbd5e1;text-align:center">${credits}</td>
            <td style="border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</td>
            <td style="border:1px solid #cbd5e1;text-align:center">Session 1</td>
            <td style="border:1px solid #cbd5e1;text-align:center">
                <span style="display:inline-block;padding:2px 12px;border-radius:20px;font-size:8pt;font-weight:600;${validated ? 'background:#dcfce7;color:#166534' : 'background:#fee2e2;color:#991b1b'}">${validated ? '✓ Validé' : '✗ Ajourné'}</span>
            </td>
        </tr>`;
    }).join('');

    const totalCredits = d.subjects.reduce((sum, s) => sum + s.coefficient * 2, 0);
    const validatedCredits = d.subjects.filter(s => s.average >= 10 && s.grades.length > 0).reduce((sum, s) => sum + s.coefficient * 2, 0);

    return `<div class="page">
        <div style="display:flex;align-items:center;gap:15px;padding-bottom:15px;border-bottom:2px solid #1e40af;margin-bottom:20px">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:65px;height:65px;border-radius:10px;object-fit:contain"/>` : `<div style="width:65px;height:65px;border-radius:10px;background:#1e40af;display:flex;align-items:center;justify-content:center;color:white;font-size:22pt;font-weight:bold">${d.org.name[0]}</div>`}
            <div>
                <h1 style="font-size:14pt;color:#1e40af;margin-bottom:2px">${d.org.name}</h1>
                <p style="font-size:8pt;color:#64748b">${d.student.filiere_name ? `Faculté / Département: ${d.student.filiere_name}` : ''}</p>
                <p style="font-size:8pt;color:#64748b">${d.org.city || ''}${d.org.city && d.org.country ? ' — ' : ''}${d.org.country || ''}</p>
            </div>
        </div>

        <div style="text-align:center;margin:15px 0">
            <h2 style="font-size:13pt;color:#1e40af;text-transform:uppercase;letter-spacing:3px">Relevé de Notes</h2>
            <p style="font-size:9pt;color:#64748b">${d.term} — Année académique ${d.year}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:15px;font-size:9pt">
            <span style="background:#eff6ff;padding:5px 10px;border-radius:4px;border-left:3px solid #1e40af"><strong>Étudiant :</strong> ${d.student.last_name} ${d.student.first_name}</span>
            <span style="background:#eff6ff;padding:5px 10px;border-radius:4px;border-left:3px solid #1e40af"><strong>N° Étudiant :</strong> ${d.student.matricule || '—'}</span>
            <span style="background:#eff6ff;padding:5px 10px;border-radius:4px;border-left:3px solid #1e40af"><strong>Niveau :</strong> ${d.student.classroom_name || '—'}</span>
            <span style="background:#eff6ff;padding:5px 10px;border-radius:4px;border-left:3px solid #1e40af"><strong>Parcours :</strong> ${d.student.filiere_name || '—'}</span>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;text-align:center;padding:8px">Code UE</th>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;padding:8px">Élément Constitutif</th>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;text-align:center;padding:8px">Crédits</th>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;text-align:center;padding:8px">Note /20</th>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;text-align:center;padding:8px">Session</th>
                    <th style="background:#1e40af;color:white;border:1px solid #1e40af;font-size:8pt;text-align:center;padding:8px">Validation</th>
                </tr>
            </thead>
            <tbody>
                ${subjectRows}
            </tbody>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:15px">
            <div style="background:#eff6ff;padding:12px;border-radius:8px;text-align:center;border:1px solid #bfdbfe">
                <p style="font-size:8pt;color:#64748b;text-transform:uppercase">Crédits Validés</p>
                <p style="font-size:16pt;font-weight:800;color:#1e40af">${validatedCredits}/${totalCredits}</p>
            </div>
            <div style="background:${d.overallAverage >= 10 ? '#f0fdf4' : '#fef2f2'};padding:12px;border-radius:8px;text-align:center;border:1px solid ${d.overallAverage >= 10 ? '#bbf7d0' : '#fecaca'}">
                <p style="font-size:8pt;color:#64748b;text-transform:uppercase">Moyenne Générale</p>
                <p style="font-size:16pt;font-weight:800;color:${d.overallAverage >= 10 ? '#166534' : '#991b1b'}">${fmtNum(d.overallAverage)}/20</p>
            </div>
            <div style="background:#fefce8;padding:12px;border-radius:8px;text-align:center;border:1px solid #fef08a">
                <p style="font-size:8pt;color:#64748b;text-transform:uppercase">Décision</p>
                <p style="font-size:11pt;font-weight:700;color:#854d0e">${d.overallAverage >= 10 ? 'ADMIS' : 'AJOURNÉ'}</p>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:40px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Chef de Département</p><div style="border-top:1px solid #94a3b8;margin-top:50px;padding-top:5px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Doyen / Directeur</p><div style="border-top:1px solid #94a3b8;margin-top:50px;padding-top:5px;font-size:8pt;color:#64748b">Cachet & Signature</div></div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            Document généré le ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 3: Formation Professionnelle
// ════════════════════════════════════════════════════════════
function template3Html(d: BulletinData): string {
    const subjectRows = d.subjects.map(s => {
        const theoryGrades = s.grades.filter(g => ['devoir', 'examen', 'oral'].includes(g.type));
        const practiceGrades = s.grades.filter(g => ['tp', 'projet'].includes(g.type));
        const theoryAvg = theoryGrades.length > 0 ? theoryGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / theoryGrades.length : null;
        const practiceAvg = practiceGrades.length > 0 ? practiceGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / practiceGrades.length : null;
        return `<tr>
            <td style="border:1px solid #d1d5db;padding:7px 10px;font-weight:500">${s.name}</td>
            <td style="border:1px solid #d1d5db;text-align:center">${theoryAvg !== null ? fmtNum(theoryAvg) : '—'}</td>
            <td style="border:1px solid #d1d5db;text-align:center">${practiceAvg !== null ? fmtNum(practiceAvg) : '—'}</td>
            <td style="border:1px solid #d1d5db;text-align:center">—</td>
            <td style="border:1px solid #d1d5db;text-align:center;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</td>
        </tr>`;
    }).join('');

    const competences = d.subjects.map(s => `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <span style="font-size:14pt">${s.average >= 10 ? '✅' : '❌'}</span>
            <span style="font-size:9pt;flex:1">${s.name}</span>
            <span style="font-size:9pt;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}/20</span>
        </div>
    `).join('');

    return `<div class="page">
        <div style="display:flex;align-items:center;gap:15px;padding-bottom:15px;border-bottom:3px solid #d97706;margin-bottom:20px">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:60px;height:60px;border-radius:10px;object-fit:contain"/>` : `<div style="width:60px;height:60px;border-radius:10px;background:#d97706;display:flex;align-items:center;justify-content:center;color:white;font-size:20pt;font-weight:bold">${d.org.name[0]}</div>`}
            <div>
                <h1 style="font-size:13pt;color:#d97706">${d.org.name}</h1>
                <p style="font-size:9pt;color:#64748b">${d.student.filiere_name || 'Formation Professionnelle'}</p>
                <p style="font-size:8pt;color:#94a3b8">${d.org.city || ''}${d.org.city && d.org.country ? ' — ' : ''}${d.org.country || ''}</p>
            </div>
            <div style="margin-left:auto;text-align:right;font-size:8pt;color:#64748b">
                <p>Promotion ${d.year}</p>
                <p>${d.term}</p>
            </div>
        </div>

        <div style="text-align:center;margin:15px 0">
            <h2 style="font-size:13pt;color:#92400e;text-transform:uppercase;letter-spacing:2px">Bulletin de Formation</h2>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:15px;font-size:9pt">
            <span style="background:#fef3c7;padding:5px 10px;border-radius:4px;border-left:3px solid #d97706"><strong>Apprenant :</strong> ${d.student.last_name} ${d.student.first_name}</span>
            <span style="background:#fef3c7;padding:5px 10px;border-radius:4px;border-left:3px solid #d97706"><strong>Matricule :</strong> ${d.student.matricule || '—'}</span>
            <span style="background:#fef3c7;padding:5px 10px;border-radius:4px;border-left:3px solid #d97706"><strong>Classe :</strong> ${d.student.classroom_name || '—'}</span>
            <span style="background:#fef3c7;padding:5px 10px;border-radius:4px;border-left:3px solid #d97706"><strong>Filière :</strong> ${d.student.filiere_name || '—'}</span>
        </div>

        <table>
            <thead><tr>
                <th style="background:#d97706;color:white;border:1px solid #d97706;font-size:9pt;padding:8px">Module</th>
                <th style="background:#d97706;color:white;border:1px solid #d97706;font-size:9pt;text-align:center;padding:8px">Théorie</th>
                <th style="background:#d97706;color:white;border:1px solid #d97706;font-size:9pt;text-align:center;padding:8px">Pratique</th>
                <th style="background:#d97706;color:white;border:1px solid #d97706;font-size:9pt;text-align:center;padding:8px">Projet</th>
                <th style="background:#d97706;color:white;border:1px solid #d97706;font-size:9pt;text-align:center;padding:8px">Moyenne</th>
            </tr></thead>
            <tbody>
                ${subjectRows}
                <tr style="background:#d97706;color:white;font-weight:bold">
                    <td colspan="4" style="border:1px solid #d97706;text-align:right;padding-right:20px">MOYENNE GÉNÉRALE</td>
                    <td style="border:1px solid #d97706;text-align:center;font-size:12pt">${fmtNum(d.overallAverage)}/20</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top:15px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
            <h4 style="font-size:10pt;color:#92400e;margin-bottom:8px">📋 Compétences acquises</h4>
            ${competences}
        </div>

        <div style="margin-top:15px;text-align:center;padding:12px;border-radius:8px;background:${d.overallAverage >= 10 ? '#f0fdf4;border:1px solid #bbf7d0' : '#fef2f2;border:1px solid #fecaca'}">
            <p style="font-size:13pt;font-weight:800;color:${d.overallAverage >= 10 ? '#166534' : '#991b1b'}">${d.overallAverage >= 10 ? '✅ APTE' : '❌ NON APTE'}</p>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Formateur Principal</p><div style="border-top:1px solid #94a3b8;margin-top:50px;padding-top:5px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Directeur du Centre</p><div style="border-top:1px solid #94a3b8;margin-top:50px;padding-top:5px;font-size:8pt;color:#64748b">Cachet & Signature</div></div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            Document généré le ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 4: Bilingue (FR/EN)
// ════════════════════════════════════════════════════════════
function template4Html(d: BulletinData): string {
    const subjectRows = d.subjects.map(s => {
        const ccGrades = s.grades.filter(g => g.type !== 'examen');
        const examGrades = s.grades.filter(g => g.type === 'examen');
        const ccAvg = ccGrades.length > 0 ? ccGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / ccGrades.length : null;
        const examAvg = examGrades.length > 0 ? examGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 20, 0) / examGrades.length : null;
        return `<tr>
            <td style="border:1px solid #94a3b8;font-weight:500">${s.name}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${s.coefficient}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${ccAvg !== null ? fmtNum(ccAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center">${examAvg !== null ? fmtNum(examAvg) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-weight:bold;color:${s.average >= 10 ? '#059669' : '#dc2626'}">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-weight:bold;color:#1e40af">${s.grades.length > 0 ? gradeLetterEN(s.average) : '—'}</td>
            <td style="border:1px solid #94a3b8;text-align:center;font-size:8pt;color:#64748b">${s.grades.length > 0 ? mentionEN(s.average) : '—'}</td>
        </tr>`;
    }).join('');

    return `<div class="page">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:15px">
            <div style="width:35%;font-size:8pt;line-height:1.6">
                <strong style="color:#0d9488">RÉPUBLIQUE DU CAMEROUN</strong><br>
                Paix – Travail – Patrie<br>
                ─────<br>
                <strong>${d.org.name}</strong><br>
                ${d.org.city || ''}, ${d.org.country || ''}
            </div>
            <div style="text-align:center">
                ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:65px;height:65px;border-radius:10px;object-fit:contain"/>` : `<div style="width:65px;height:65px;border-radius:10px;background:#0d9488;margin:0 auto;display:flex;align-items:center;justify-content:center;color:white;font-size:22pt;font-weight:bold">${d.org.name[0]}</div>`}
            </div>
            <div style="width:35%;text-align:right;font-size:8pt;line-height:1.6">
                <strong style="color:#0d9488">REPUBLIC OF CAMEROON</strong><br>
                Peace – Work – Fatherland<br>
                ─────<br>
                <strong>${d.org.name}</strong><br>
                ${d.org.city || ''}, ${d.org.country || ''}
            </div>
        </div>

        <div style="text-align:center;margin:12px 0">
            <h2 style="font-size:12pt;color:#0d9488;text-transform:uppercase;letter-spacing:2px">Bulletin de Notes / Report Card</h2>
            <p style="font-size:9pt;color:#64748b">${d.term} — ${d.year}</p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px;font-size:9pt">
            <span style="background:#f0fdfa;padding:4px 10px;border-radius:4px;border-left:3px solid #0d9488"><strong>Nom / Name :</strong> ${d.student.last_name} ${d.student.first_name}</span>
            <span style="background:#f0fdfa;padding:4px 10px;border-radius:4px;border-left:3px solid #0d9488"><strong>N° Mat. :</strong> ${d.student.matricule || '—'}</span>
            <span style="background:#f0fdfa;padding:4px 10px;border-radius:4px;border-left:3px solid #0d9488"><strong>Classe / Class :</strong> ${d.student.classroom_name || '—'}</span>
            <span style="background:#f0fdfa;padding:4px 10px;border-radius:4px;border-left:3px solid #0d9488"><strong>Sexe / Sex :</strong> ${d.student.sex === 'F' ? 'Féminin / Female' : 'Masculin / Male'}</span>
        </div>

        <p style="font-size:7pt;color:#94a3b8;margin-bottom:5px">Grading Scale: A (16-20) Excellent | B (14-15.99) Very Good | C (12-13.99) Good | D (10-11.99) Average | F (&lt;10) Fail</p>

        <table>
            <thead><tr>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;padding:7px">Subject / Matière</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">Coeff</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">CA Mark</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">Exam</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">Average</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">Grade</th>
                <th style="background:#0d9488;color:white;border:1px solid #0d9488;font-size:8pt;text-align:center;padding:7px">Remark</th>
            </tr></thead>
            <tbody>
                ${subjectRows}
                <tr style="background:#0d9488;color:white;font-weight:bold">
                    <td colspan="4" style="border:1px solid #0d9488;text-align:right;padding-right:15px">General Average / Moyenne Générale</td>
                    <td style="border:1px solid #0d9488;text-align:center;font-size:12pt">${fmtNum(d.overallAverage)}</td>
                    <td style="border:1px solid #0d9488;text-align:center;font-size:12pt">${gradeLetterEN(d.overallAverage)}</td>
                    <td style="border:1px solid #0d9488;text-align:center">${mentionEN(d.overallAverage)}</td>
                </tr>
            </tbody>
        </table>

        ${d.rank ? `<p style="margin-top:8px;font-size:9pt;color:#475569"><strong>Class Position / Rang :</strong> ${d.rank}${d.totalStudents ? ` / ${d.totalStudents}` : ''}</p>` : ''}

        <div style="display:flex;justify-content:space-between;margin-top:35px">
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b">Class Teacher<br>Prof. Principal</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:7pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b">Vice-Principal<br>Censeur</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:7pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:30%"><p style="font-size:7pt;color:#64748b">Principal<br>Le Proviseur</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:7pt;color:#64748b">Stamp & Signature</div></div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">
            Generated on ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 5: Moderne Minimaliste (avec barres de progression)
// ════════════════════════════════════════════════════════════
function template5Html(d: BulletinData): string {
    const subjectBars = d.subjects.map(s => {
        const pct = Math.min((s.average / 20) * 100, 100);
        const color = progressColor(s.average);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:9pt;font-weight:500;width:140px;flex-shrink:0">${s.name}</span>
            <span style="font-size:8pt;color:#94a3b8;width:35px;text-align:center;flex-shrink:0">×${s.coefficient}</span>
            <div style="flex:1;height:22px;background:#f1f5f9;border-radius:11px;overflow:hidden;position:relative">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:11px;transition:width 0.5s"></div>
                <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:8pt;font-weight:700;color:#334155">${s.grades.length > 0 ? fmtNum(s.average) : '—'}</span>
            </div>
        </div>`;
    }).join('');

    // Radar data points (simplified SVG radar)
    const radarPoints = d.subjects.map((s, i) => {
        const angle = (Math.PI * 2 * i) / d.subjects.length - Math.PI / 2;
        const radius = Math.min((s.average / 20) * 80, 80);
        const x = 100 + radius * Math.cos(angle);
        const y = 100 + radius * Math.sin(angle);
        return { x, y, label: s.name, avg: s.average };
    });
    const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    const radarLabels = radarPoints.map((p, _i) => {
        const angle = Math.atan2(p.y - 100, p.x - 100);
        const labelX = 100 + 95 * Math.cos(angle);
        const labelY = 100 + 95 * Math.sin(angle);
        return `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="6" fill="#64748b">${p.label.slice(0, 8)}</text>`;
    }).join('');
    const radarGrids = [20, 40, 60, 80].map(r =>
        `<circle cx="100" cy="100" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>`
    ).join('');

    const bestSubject = d.subjects.filter(s => s.grades.length > 0).sort((a, b) => b.average - a.average)[0];
    const worstSubject = d.subjects.filter(s => s.grades.length > 0).sort((a, b) => a.average - b.average)[0];

    return `<div class="page" style="font-family:'Inter','Segoe UI',sans-serif">
        <div style="display:flex;align-items:center;gap:15px;padding:15px 20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;margin-bottom:20px;color:white">
            ${d.org.logo_url ? `<img src="${d.org.logo_url}" style="width:50px;height:50px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,0.1);padding:4px"/>` : `<div style="width:50px;height:50px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:bold">${d.org.name[0]}</div>`}
            <div style="flex:1">
                <h1 style="font-size:14pt;font-weight:800;margin-bottom:2px">${d.org.name}</h1>
                <p style="font-size:8pt;color:#94a3b8">${d.term} — ${d.year}</p>
            </div>
            <div style="text-align:right;font-size:8pt;color:#94a3b8">
                <p>${d.org.city || ''}${d.org.city && d.org.country ? ', ' : ''}${d.org.country || ''}</p>
                ${d.org.phone ? `<p>${d.org.phone}</p>` : ''}
            </div>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:15px">
            <div style="flex:1;padding:12px 15px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
                <p style="font-size:8pt;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Étudiant</p>
                <p style="font-size:11pt;font-weight:700">${d.student.last_name} ${d.student.first_name}</p>
                <p style="font-size:8pt;color:#64748b">${d.student.matricule || '—'} • ${d.student.classroom_name || '—'}${d.student.filiere_name ? ` • ${d.student.filiere_name}` : ''}</p>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:20px">
            <div style="padding:12px;background:linear-gradient(135deg,${d.overallAverage >= 10 ? '#f0fdf4,#dcfce7' : '#fef2f2,#fee2e2'});border-radius:12px;text-align:center">
                <p style="font-size:7pt;color:#64748b;text-transform:uppercase">Moyenne</p>
                <p style="font-size:20pt;font-weight:900;color:${d.overallAverage >= 10 ? '#166534' : '#991b1b'}">${fmtNum(d.overallAverage)}</p>
                <p style="font-size:8pt;color:#64748b">/20</p>
            </div>
            ${d.rank ? `<div style="padding:12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;text-align:center">
                <p style="font-size:7pt;color:#64748b;text-transform:uppercase">Rang</p>
                <p style="font-size:20pt;font-weight:900;color:#1e40af">${d.rank}</p>
                <p style="font-size:8pt;color:#64748b">${d.totalStudents ? `sur ${d.totalStudents}` : ''}</p>
            </div>` : '<div></div>'}
            <div style="padding:12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;text-align:center">
                <p style="font-size:7pt;color:#64748b;text-transform:uppercase">Meilleure</p>
                <p style="font-size:11pt;font-weight:700;color:#166534">${bestSubject ? fmtNum(bestSubject.average) : '—'}</p>
                <p style="font-size:7pt;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${bestSubject?.name || '—'}</p>
            </div>
            <div style="padding:12px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border-radius:12px;text-align:center">
                <p style="font-size:7pt;color:#64748b;text-transform:uppercase">Plus faible</p>
                <p style="font-size:11pt;font-weight:700;color:#991b1b">${worstSubject ? fmtNum(worstSubject.average) : '—'}</p>
                <p style="font-size:7pt;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${worstSubject?.name || '—'}</p>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 200px;gap:20px;margin-bottom:15px">
            <div>
                <h3 style="font-size:10pt;font-weight:700;margin-bottom:8px;color:#334155">📊 Détail par matière</h3>
                ${subjectBars}
            </div>
            ${d.subjects.length >= 3 ? `<div style="text-align:center">
                <h3 style="font-size:10pt;font-weight:700;margin-bottom:8px;color:#334155">🎯 Vue radar</h3>
                <svg viewBox="0 0 200 200" width="180" height="180">
                    ${radarGrids}
                    <path d="${radarPath}" fill="rgba(99,102,241,0.2)" stroke="#6366f1" stroke-width="1.5"/>
                    ${radarLabels}
                </svg>
            </div>` : ''}
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:30px">
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Professeur Principal</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:8pt;color:#64748b">Signature</div></div>
            <div style="text-align:center;width:40%"><p style="font-size:8pt;color:#64748b">Le Directeur</p><div style="border-top:1px solid #94a3b8;margin-top:40px;padding-top:4px;font-size:8pt;color:#64748b">Cachet & Signature</div></div>
        </div>

        <div style="text-align:center;margin-top:15px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px">
            🔗 Document généré le ${dateNow()} — ${d.org.name} — CampusFlow
        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// MAIN EXPORT: Generate Bulletin PDF
// ════════════════════════════════════════════════════════════
export function generateBulletinPDF(data: BulletinData, templateId: number = 1): void {
    const pw = window.open('', '_blank');
    if (!pw) { alert('Veuillez autoriser les pop-ups pour générer le PDF.'); return; }

    let bodyHtml: string;
    switch (templateId) {
        case 2: bodyHtml = template2Html(data); break;
        case 3: bodyHtml = template3Html(data); break;
        case 4: bodyHtml = template4Html(data); break;
        case 5: bodyHtml = template5Html(data); break;
        default: bodyHtml = template1Html(data); break;
    }

    pw.document.write(`<!DOCTYPE html><html><head>
        <title>Bulletin — ${data.student.last_name} ${data.student.first_name} — ${data.org.name}</title>
        <meta charset="UTF-8"/>
        <style>${baseCss}${templateId === 1 ? template1(data) : ''}</style>
    </head><body>${bodyHtml}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
}

// ════════════════════════════════════════════════════════════
// COMPUTE: Calculate weighted averages from raw grades
// ════════════════════════════════════════════════════════════
export function computeSubjectAverage(grades: { score: number; max_score: number; weight: number }[]): number {
    if (grades.length === 0) return 0;
    const totalWeight = grades.reduce((sum, g) => sum + (g.weight || 1), 0);
    const weightedSum = grades.reduce((sum, g) => sum + ((g.score / g.max_score) * 20 * (g.weight || 1)), 0);
    return weightedSum / totalWeight;
}

export function computeOverallAverage(subjects: { average: number; coefficient: number; hasGrades: boolean }[]): number {
    const graded = subjects.filter(s => s.hasGrades);
    if (graded.length === 0) return 0;
    const totalCoef = graded.reduce((sum, s) => sum + s.coefficient, 0);
    const weightedSum = graded.reduce((sum, s) => sum + s.average * s.coefficient, 0);
    return weightedSum / totalCoef;
}

// Template metadata for admin selector
export const BULLETIN_TEMPLATES = [
    { id: 1, name: 'Classique Camerounais', description: 'Format standard pour collèges et lycées camerounais. En-tête République/Ministère, tableau classique.', icon: '🇨🇲', suited: 'Collèges, Lycées' },
    { id: 2, name: 'Universitaire LMD', description: 'Format conforme au système LMD avec crédits ECTS, codes UE, et validation par matière.', icon: '🎓', suited: 'Universités, Grandes Écoles' },
    { id: 3, name: 'Formation Professionnelle', description: 'Format pour centres de formation avec théorie/pratique, compétences acquises.', icon: '🔧', suited: 'CFP, IFP, Centres de métiers' },
    { id: 4, name: 'Bilingue (FR/EN)', description: 'Format bilingue français/anglais avec grading A-F. Conforme aux standards anglophones.', icon: '🌍', suited: 'Établissements bilingues' },
    { id: 5, name: 'Moderne Minimaliste', description: 'Design épuré avec barres de progression, radar chart et vue synthétique des résultats.', icon: '✨', suited: 'Écoles modernes, tech-forward' },
];
