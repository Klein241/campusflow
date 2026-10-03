// ═══════════════════════════════════════════════════════════════
// CAMPUSFLOW — Curriculum Book PDF Generator (Manuel Officiel)
// Génère un véritable livre de cours imprimable / exportable en PDF
// Conforme aux standards d'édition scolaire & académique
// ═══════════════════════════════════════════════════════════════

export interface CurriculumBookData {
    org: {
        name: string;
        logo_url?: string;
        city?: string;
        country?: string;
        phone?: string;
        email?: string;
        motto?: string;
        accreditation_number?: string;
    };
    subject: {
        id: string;
        name: string;
        code?: string;
        coefficient?: number;
        classroom_name?: string;
        teacher_name?: string;
    };
    chapters: {
        id: string;
        title: string;
        position?: number;
        description?: string;
        lessons: {
            id: string;
            title: string;
            estimated_minutes?: number;
            content?: any;
        }[];
        exercises?: {
            id: string;
            title: string;
            type?: string;
            questions?: any;
            max_score?: number;
        }[];
    }[];
}

/**
 * Convertit le contenu (texte brut, markdown léger ou blocs JSON) en HTML propre pour livre
 */
function formatLessonBody(content: any): string {
    if (!content) {
        return '<p class="empty-block"><em>Contenu pédagogique en cours d\'édition par le corps professoral.</em></p>';
    }

    // Si c'est un tableau de blocs JSON
    if (Array.isArray(content)) {
        return content.map((b: any) => {
            if (b.type === 'heading' || b.type === 'h2') return `<h3 class="book-subheading">${escapeHtml(b.content || b.text || '')}</h3>`;
            if (b.type === 'h3') return `<h4 class="book-subsubheading">${escapeHtml(b.content || b.text || '')}</h4>`;
            if (b.type === 'callout' || b.type === 'quote') {
                return `<div class="book-callout"><span class="callout-icon">💡</span><div class="callout-text">${escapeHtml(b.content || b.text || '')}</div></div>`;
            }
            if (b.type === 'list' && Array.isArray(b.items)) {
                return `<ul class="book-list">${b.items.map((it: string) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`;
            }
            return `<p class="book-paragraph">${escapeHtml(b.content || b.text || '')}</p>`;
        }).join('');
    }

    let text = typeof content === 'string' ? content : JSON.stringify(content);

    // Détection HTML déjà formaté
    if (/<(p|div|h[1-6]|ul|ol|table|blockquote)/i.test(text)) {
        return text;
    }

    // Markdown simple vers HTML
    let formatted = escapeHtml(text)
        .replace(/^### (.*$)/gim, '<h4 class="book-subsubheading">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 class="book-subheading">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 class="book-heading">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^&gt; (.*$)/gim, '<div class="book-callout"><span class="callout-icon">📌</span><div class="callout-text">$1</div></div>')
        .replace(/^- (.*$)/gim, '<li class="book-list-item">$1</li>')
        .replace(/(<li[\s\S]*?<\/li>)/gm, '<ul class="book-list">$1</ul>')
        .replace(/\n\n+/g, '</p><p class="book-paragraph">')
        .replace(/\n/g, '<br/>');

    return `<p class="book-paragraph">${formatted}</p>`;
}

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function generateCurriculumBookPDF(data: CurriculumBookData): void {
    const pw = window.open('', '_blank');
    if (!pw) {
        alert('Veuillez autoriser les fenêtres pop-up pour afficher et imprimer le Livre.');
        return;
    }

    const currentYear = new Date().getFullYear();
    const totalChapters = data.chapters.length;
    const totalLessons = data.chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0);
    const totalExercises = data.chapters.reduce((acc, c) => acc + (c.exercises?.length || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>Livre de Cours — ${escapeHtml(data.subject.name)} — ${escapeHtml(data.org.name)}</title>
    <style>
        /* ── CONFIGURATION D'IMPRESSION LIVRE ── */
        @page {
            size: A4 portrait;
            margin: 18mm 16mm 20mm 16mm;
            @top-right {
                content: "${escapeHtml(data.subject.name)}";
                font-family: 'Georgia', serif;
                font-size: 8pt;
                color: #64748b;
                font-style: italic;
            }
            @bottom-center {
                content: counter(page);
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 9pt;
                color: #475569;
                font-weight: bold;
            }
        }

        @page:first {
            margin: 0;
            @top-right { content: normal; }
            @bottom-center { content: normal; }
        }

        @media print {
            .no-print { display: none !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-before: always; }
            .cover-page { page-break-after: always; height: 100vh; }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #0f172a;
            background: #f8fafc;
            line-height: 1.65;
            font-size: 11pt;
        }

        /* ── BARRE D'ACTION ÉCRAN (NON IMPRIMABLE) ── */
        .print-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #0f172a;
            color: white;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-family: system-ui, -apple-system, sans-serif;
        }
        .print-bar .title { font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
        .print-btn {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .print-btn:hover { transform: scale(1.02); opacity: 0.95; }

        .book-container {
            max-width: 210mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        @media print {
            .book-container { max-width: 100%; margin: 0; box-shadow: none; }
        }

        /* ═══════════════════════════════════════════════
           PAGE 1 : COUVERTURE OFFICIELLE DE LIVRE
        ═══════════════════════════════════════════════ */
        .cover-page {
            position: relative;
            background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 55%, #31104b 100%);
            color: white;
            padding: 60px 45px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 297mm;
            border: 12px solid #0b0f19;
            page-break-after: always;
        }
        .cover-page::before {
            content: '';
            position: absolute;
            top: 20px; left: 20px; right: 20px; bottom: 20px;
            border: 2px solid rgba(245, 158, 11, 0.4);
            pointer-events: none;
        }
        .cover-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.15);
            padding-bottom: 25px;
        }
        .cover-org { display: flex; align-items: center; gap: 15px; }
        .cover-org-logo { width: 55px; height: 55px; object-fit: contain; border-radius: 12px; background: white; padding: 4px; }
        .cover-org-name { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14pt; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #f8fafc; }
        .cover-org-motto { font-size: 8.5pt; color: #cbd5e1; font-style: italic; }
        .cover-badge {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid #f59e0b;
            color: #fbbf24;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 9pt;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-family: system-ui, sans-serif;
        }

        .cover-main {
            margin: auto 0;
            padding: 40px 0;
            text-align: center;
        }
        .cover-label {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11pt;
            text-transform: uppercase;
            letter-spacing: 4px;
            color: #f59e0b;
            font-weight: 700;
            margin-bottom: 15px;
        }
        .cover-title {
            font-size: 32pt;
            font-weight: 900;
            line-height: 1.15;
            color: #ffffff;
            margin-bottom: 20px;
            text-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .cover-divider {
            width: 100px;
            height: 4px;
            background: #f59e0b;
            margin: 0 auto 25px;
            border-radius: 2px;
        }
        .cover-subtitle {
            font-size: 15pt;
            font-weight: 400;
            color: #e2e8f0;
            max-width: 600px;
            margin: 0 auto 30px;
            line-height: 1.4;
            font-style: italic;
        }
        .cover-meta-grid {
            display: inline-flex;
            gap: 25px;
            padding: 12px 30px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            font-family: system-ui, sans-serif;
            font-size: 10pt;
            color: #cbd5e1;
        }
        .cover-meta-grid strong { color: white; }

        .cover-footer {
            border-top: 1px solid rgba(255,255,255,0.15);
            padding-top: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: system-ui, sans-serif;
            font-size: 9pt;
            color: #94a3b8;
        }

        /* ═══════════════════════════════════════════════
           PAGE 2 : MENTIONS ÉDITORIALES & PRÉFACE
        ═══════════════════════════════════════════════ */
        .editorial-page {
            padding: 50px 45px;
            min-height: 270mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
        }
        .editorial-header h2 { font-size: 18pt; color: #1e293b; margin-bottom: 6px; }
        .editorial-header p { font-size: 10pt; color: #64748b; font-family: system-ui, sans-serif; }
        .editorial-body {
            margin: 30px 0;
            padding: 25px;
            background: #f8fafc;
            border-left: 4px solid #4f46e5;
            border-radius: 0 12px 12px 0;
            font-style: italic;
            color: #334155;
            font-size: 11pt;
            line-height: 1.8;
        }
        .editorial-footer {
            font-family: system-ui, sans-serif;
            font-size: 8.5pt;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            line-height: 1.6;
        }

        /* ═══════════════════════════════════════════════
           PAGE 3 : SOMMAIRE GÉNÉRAL (TABLE OF CONTENTS)
        ═══════════════════════════════════════════════ */
        .toc-page {
            padding: 50px 45px;
            min-height: 270mm;
            page-break-after: always;
        }
        .toc-title {
            font-size: 20pt;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .toc-item {
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px dashed #cbd5e1;
        }
        .toc-chap-title {
            font-size: 13pt;
            font-weight: bold;
            color: #1e1b4b;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .toc-lessons-list {
            margin-top: 8px;
            margin-left: 20px;
            font-size: 9.5pt;
            color: #475569;
            list-style: none;
            font-family: system-ui, sans-serif;
        }
        .toc-lessons-list li {
            padding: 3px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* ═══════════════════════════════════════════════
           CORPS DU LIVRE : CHAPITRES & LEÇONS
        ═══════════════════════════════════════════════ */
        .chapter-container {
            padding: 45px;
            page-break-before: always;
        }
        .chapter-hero {
            background: linear-gradient(135deg, #1e1b4b, #312e81);
            color: white;
            padding: 30px 25px;
            border-radius: 14px;
            margin-bottom: 35px;
            box-shadow: 0 4px 15px rgba(30, 27, 75, 0.15);
        }
        .chap-num {
            font-family: system-ui, sans-serif;
            font-size: 9pt;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #fbbf24;
            margin-bottom: 5px;
            display: block;
        }
        .chap-heading {
            font-size: 22pt;
            font-weight: 800;
            line-height: 1.25;
            color: #ffffff;
            margin-bottom: 12px;
        }
        .chap-desc {
            font-size: 10.5pt;
            color: #cbd5e1;
            font-style: italic;
            line-height: 1.6;
        }

        /* ── LEÇONS ── */
        .lesson-article {
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid #e2e8f0;
        }
        .lesson-article:last-child { border-bottom: none; }
        .lesson-header {
            margin-bottom: 16px;
        }
        .lesson-number {
            font-family: system-ui, sans-serif;
            font-size: 8.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6366f1;
            margin-bottom: 4px;
            display: block;
        }
        .lesson-title {
            font-size: 16pt;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.3;
        }
        .lesson-duration {
            font-family: system-ui, sans-serif;
            font-size: 8pt;
            color: #64748b;
            margin-top: 4px;
        }

        .book-paragraph {
            margin-bottom: 16px;
            text-align: justify;
            text-justify: inter-word;
            line-height: 1.8;
            color: #1e293b;
        }
        .book-subheading {
            font-family: system-ui, sans-serif;
            font-size: 13pt;
            font-weight: 700;
            color: #1e1b4b;
            margin: 24px 0 10px;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
        }
        .book-subsubheading {
            font-family: system-ui, sans-serif;
            font-size: 11pt;
            font-weight: 700;
            color: #334155;
            margin: 18px 0 8px;
        }
        .book-callout {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 14px 18px;
            border-radius: 0 10px 10px 0;
            margin: 20px 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-size: 10.5pt;
            color: #78350f;
        }
        .callout-icon { font-size: 14pt; }
        .callout-text { flex: 1; line-height: 1.6; }
        .book-list {
            margin: 12px 0 18px 24px;
            font-size: 10.5pt;
            line-height: 1.8;
            color: #1e293b;
        }
        .book-list li { margin-bottom: 6px; }

        /* ── SECTION ÉVALUATIONS DE FIN DE CHAPITRE ── */
        .exercises-section {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 25px;
            margin-top: 35px;
            page-break-inside: avoid;
        }
        .exercises-header {
            font-family: system-ui, sans-serif;
            font-size: 12pt;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .exercise-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
        }
        .exercise-title {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .question-box {
            margin: 12px 0;
            padding-left: 12px;
            border-left: 2px solid #6366f1;
            font-size: 10pt;
            color: #334155;
        }
        .answer-lines {
            margin-top: 10px;
            border-bottom: 1px dotted #94a3b8;
            height: 24px;
        }

        /* ── BACK COVER ── */
        .back-cover {
            padding: 60px 45px;
            background: #0f172a;
            color: white;
            min-height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-before: always;
        }
        .back-cover-body {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 16px;
            line-height: 1.8;
            font-size: 11pt;
            color: #cbd5e1;
            font-style: italic;
        }
        .back-cover-footer {
            border-top: 1px solid rgba(255,255,255,0.15);
            padding-top: 20px;
            text-align: center;
            font-family: system-ui, sans-serif;
            font-size: 9pt;
            color: #94a3b8;
        }
    </style>
</head>
<body>

    <!-- ── BARRE FLOTTANTE D'IMPRESSION (NON IMPRIMABLE) ── -->
    <div class="print-bar no-print">
        <div class="title">
            <span>📖</span>
            <span>${escapeHtml(data.subject.name)} — Manuel Pédagogique (${totalChapters} chapitres · ${totalLessons} leçons)</span>
        </div>
        <button class="print-btn" onclick="window.print()">
            🖨️ Imprimer / Enregistrer en PDF
        </button>
    </div>

    <div class="book-container">

        <!-- ═══════════════════════════════════════════════
             PAGE 1 : COUVERTURE DU LIVRE
        ═══════════════════════════════════════════════ -->
        <div class="cover-page">
            <div class="cover-top">
                <div class="cover-org">
                    ${data.org.logo_url ? `<img src="${data.org.logo_url}" class="cover-org-logo" alt="Logo" />` : ''}
                    <div>
                        <div class="cover-org-name">${escapeHtml(data.org.name)}</div>
                        ${data.org.motto ? `<div class="cover-org-motto">${escapeHtml(data.org.motto)}</div>` : ''}
                    </div>
                </div>
                <div class="cover-badge">Manuel Officiel</div>
            </div>

            <div class="cover-main">
                <div class="cover-label">Programme Académique & Professionnel</div>
                <h1 class="cover-title">${escapeHtml(data.subject.name)}</h1>
                <div class="cover-divider"></div>
                <p class="cover-subtitle">
                    ${data.subject.classroom_name ? `Filière : ${escapeHtml(data.subject.classroom_name)} • ` : ''}
                    Cours structuré, synthèses pédagogiques et évaluations d'application
                </p>

                <div class="cover-meta-grid">
                    <div><strong>${totalChapters}</strong> Chapitres</div>
                    <div>•</div>
                    <div><strong>${totalLessons}</strong> Leçons complètes</div>
                    ${totalExercises > 0 ? `<div>•</div><div><strong>${totalExercises}</strong> Évaluations</div>` : ''}
                    ${data.subject.coefficient ? `<div>•</div><div>Coef. <strong>${data.subject.coefficient}</strong></div>` : ''}
                </div>
            </div>

            <div class="cover-footer">
                <div>
                    ${data.subject.teacher_name ? `Supervisé par : <strong>Prof. ${escapeHtml(data.subject.teacher_name)}</strong>` : 'Direction des Études & Comité Pédagogique'}
                </div>
                <div>Année Académique ${currentYear} - ${currentYear + 1}</div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════
             PAGE 2 : MENTIONS ÉDITORIALES
        ═══════════════════════════════════════════════ -->
        <div class="editorial-page page-break">
            <div class="editorial-header">
                <h2>${escapeHtml(data.subject.name)}</h2>
                <p>Ouvrage pédagogique de référence • ${escapeHtml(data.org.name)}</p>
                ${data.org.accreditation_number ? `<p style="margin-top:4px;">N° d'Agrément ministériel : <strong>${escapeHtml(data.org.accreditation_number)}</strong></p>` : ''}
            </div>

            <div class="editorial-body">
                <p>« Ce manuel a été rédigé et structuré pour accompagner l'étudiant dans l'acquisition progressive et durable des compétences professionnelles exigées par le référentiel de formation. Il combine rigueur théorique, méthodes pratiques éprouvées et exercices d'application directe. »</p>
            </div>

            <div class="editorial-footer">
                <p>© ${currentYear} ${escapeHtml(data.org.name)}. Tous droits réservés.</p>
                <p style="margin-top:4px;">Toute reproduction, diffusion ou utilisation non autorisée en dehors du cadre de l'établissement est strictement interdite.</p>
                <p style="margin-top:6px; color:#4f46e5; font-weight:bold;">Édité et certifié via la plateforme IziTeach CampusFlow.</p>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════
             PAGE 3 : TABLE DES MATIÈRES / SOMMAIRE
        ═══════════════════════════════════════════════ -->
        <div class="toc-page page-break">
            <h2 class="toc-title">Sommaire Général</h2>

            ${data.chapters.map((chap, ci) => `
                <div class="toc-item">
                    <div class="toc-chap-title">
                        <span>Chapitre ${ci + 1} : ${escapeHtml(chap.title)}</span>
                        <span style="font-size:10pt;color:#64748b;font-weight:normal;">${(chap.lessons || []).length} leçon${(chap.lessons || []).length > 1 ? 's' : ''}</span>
                    </div>
                    ${chap.lessons && chap.lessons.length > 0 ? `
                        <ul class="toc-lessons-list">
                            ${chap.lessons.map((les, li) => `
                                <li>
                                    <span>${ci + 1}.${li + 1} ${escapeHtml(les.title)}</span>
                                    ${les.estimated_minutes ? `<span>${les.estimated_minutes} min</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <!-- ═══════════════════════════════════════════════
             CORPS DU MANUEL : CHAPITRES & LEÇONS
        ═══════════════════════════════════════════════ -->
        ${data.chapters.map((chap, ci) => `
            <div class="chapter-container page-break">
                <!-- En-tête du chapitre -->
                <div class="chapter-hero">
                    <span class="chap-num">Chapitre 0${ci + 1}</span>
                    <h2 class="chap-heading">${escapeHtml(chap.title)}</h2>
                    ${chap.description ? `<p class="chap-desc">${escapeHtml(chap.description)}</p>` : ''}
                </div>

                <!-- Leçons du chapitre -->
                ${(chap.lessons && chap.lessons.length > 0) ? chap.lessons.map((les, li) => `
                    <article class="lesson-article">
                        <div class="lesson-header">
                            <span class="lesson-number">Leçon ${ci + 1}.${li + 1}</span>
                            <h3 class="lesson-title">${escapeHtml(les.title)}</h3>
                            ${les.estimated_minutes ? `<div class="lesson-duration">⏱️ Durée estimée d'étude : ${les.estimated_minutes} minutes</div>` : ''}
                        </div>
                        <div class="lesson-content">
                            ${formatLessonBody(les.content)}
                        </div>
                    </article>
                `).join('') : `
                    <p style="color:#64748b;font-style:italic;margin-bottom:30px;">Contenu pédagogique en cours d'actualisation.</p>
                `}

                <!-- Exercices & Évaluations du chapitre -->
                ${(chap.exercises && chap.exercises.length > 0) ? `
                    <div class="exercises-section">
                        <div class="exercises-header">
                            <span>📝</span>
                            <span>Évaluations & Exercices d'Application — Chapitre ${ci + 1}</span>
                        </div>
                        ${chap.exercises.map((ex, ei) => `
                            <div class="exercise-card">
                                <div class="exercise-title">Exercice ${ei + 1} : ${escapeHtml(ex.title)} ${ex.max_score ? `<span style="font-size:9pt;color:#6366f1;">(${ex.max_score} pts)</span>` : ''}</div>
                                ${Array.isArray(ex.questions) ? ex.questions.map((q: any, qi: number) => `
                                    <div class="question-box">
                                        <p><strong>Question ${qi + 1} :</strong> ${escapeHtml(q.question || q.title || q.text || '')}</p>
                                        ${Array.isArray(q.options) ? `
                                            <div style="margin-top:6px;font-size:9pt;color:#475569;">
                                                ${q.options.map((opt: string) => `<p>☐ ${escapeHtml(opt)}</p>`).join('')}
                                            </div>
                                        ` : `
                                            <div class="answer-lines"></div>
                                            <div class="answer-lines"></div>
                                        `}
                                    </div>
                                `).join('') : `
                                    <div class="answer-lines"></div>
                                    <div class="answer-lines"></div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <!-- ═══════════════════════════════════════════════
             DERNIÈRE DE COUVERTURE (BACK COVER)
        ═══════════════════════════════════════════════ -->
        <div class="back-cover page-break">
            <div>
                <h3 style="font-size:16pt;font-weight:800;letter-spacing:1px;color:#f59e0b;text-transform:uppercase;margin-bottom:15px;">
                    ${escapeHtml(data.subject.name)}
                </h3>
                <div class="back-cover-body">
                    <p>Ce manuel de référence rassemble l'ensemble des modules d'enseignement dispensés au sein de <strong>${escapeHtml(data.org.name)}</strong>.</p>
                    <p style="margin-top:12px;">Conçu par des formateurs experts et validé par la direction académique, il constitue le support officiel pour la préparation aux examens de certification.</p>
                </div>
            </div>

            <div class="back-cover-footer">
                <p><strong>${escapeHtml(data.org.name)}</strong></p>
                ${data.org.city || data.org.country ? `<p>${escapeHtml(data.org.city || '')}${data.org.city && data.org.country ? ', ' : ''}${escapeHtml(data.org.country || '')}</p>` : ''}
                ${data.org.phone ? `<p>Téléphone : ${escapeHtml(data.org.phone)}</p>` : ''}
                <p style="margin-top:10px;font-size:8pt;color:#64748b;">Plateforme de gestion & e-learning propulsée par IziTeach CampusFlow</p>
            </div>
        </div>

    </div>

    <script>
        // Lancer automatiquement l'impression après chargement des polices et images
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.print();
            }, 600);
        });
    </script>
</body>
</html>`;

    pw.document.open();
    pw.document.write(html);
    pw.document.close();
}
