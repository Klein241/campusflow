/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTONOMOUS REPORT SERVICE — Dame SKY Executive Daily Briefing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RÈGLE ABSOLUE DE CONFIDENTIALITÉ :
 * Seules des MÉTRIQUES AGRÉGÉES ANONYMISÉES (totaux, compteurs) sont transmises
 * à DeepSeek. AUCUN nom, email, téléphone, matricule ou donnée identifiante
 * d'un étudiant ou professeur ne transite vers les APIs externes.
 * Toute donnée personnelle reste exclusivement dans la base Supabase.
 *
 * Exécute de manière autonome :
 * 1. Collecte des métriques agrégées anonymisées (comptes, totaux uniquement)
 * 2. Synthèse exécutive par DeepSeek V4 Flash (max 450 tokens)
 * 3. Envoi par email via le système existant (Gmail/Yahoo/Brevo/Resend)
 * 4. Traçabilité dans ai_agent_logs
 */

import { Env } from '../types';
import { fetchSupabaseRest } from '../mcp/tools';
import { sendEmailInternal } from './email';

// ── Métriques 100% anonymisées — AUCUNE donnée personnelle ──────────────
// Seuls des COMPTEURS sont conservés, jamais de noms, emails ou identifiants.
interface PlatformMetrics {
    totalOrgs: number;
    totalStudents: number;
    totalTeachers: number;
    newStudents24h: number;
    newSubmissions24h: number;
    pendingBugsCount: number;
    safetyAlerts24h: number;
    autopilotOrgsCount: number;
}

// Config rapport récupérée depuis dame_sky_config
interface ReportConfig {
    recipient: string;
    reportHourUtc: number;   // 0-23 : heure UTC définie par le superadmin
    reportMinuteUtc: number; // 0-59
    autoEnabled: boolean;
}

/**
 * Collecte les statistiques de la plateforme — UNIQUEMENT des compteurs anonymisés.
 * AUCUN nom, email, téléphone ou identifiant personnel n'est collecté ni transmis.
 */
async function collectPlatformMetrics(env: Env): Promise<PlatformMetrics> {
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let totalOrgs = 0;
    let totalStudents = 0;
    let totalTeachers = 0;
    let newStudents24h = 0;
    let newSubmissions24h = 0;
    let pendingBugsCount = 0;
    let safetyAlerts24h = 0;
    let autopilotOrgsCount = 0;

    try {
        // ✅ On sélectionne UNIQUEMENT les champs nécessaires aux compteurs (pas de données perso)
        let orgs = await fetchSupabaseRest(env, 'organizations?select=id,is_autopilot&is_active=eq.true');
        if (!Array.isArray(orgs)) {
            orgs = await fetchSupabaseRest(env, 'organizations?select=id,other_phone_label&is_active=eq.true');
        }
        if (Array.isArray(orgs)) {
            totalOrgs = orgs.length;
            autopilotOrgsCount = orgs.filter((o: any) => o.is_autopilot === true || o.other_phone_label === 'AUTOPILOT_SCHOOL').length;
        }

        // ✅ Uniquement id + created_at pour compter les nouveaux inscrits (pas de noms ni emails)
        const students = await fetchSupabaseRest(env, `student_profiles?select=id,created_at&is_active=eq.true`);
        if (Array.isArray(students)) {
            totalStudents = students.length;
            newStudents24h = students.filter((s: any) => s.created_at && s.created_at >= yesterdayIso).length;
        }

        // ✅ Uniquement le count des profs
        const teachers = await fetchSupabaseRest(env, 'teacher_profiles?select=id&is_active=eq.true');
        if (Array.isArray(teachers)) {
            totalTeachers = teachers.length;
        }

        // ✅ Uniquement le count des soumissions (pas de contenu)
        const submissions = await fetchSupabaseRest(env, `exercise_submissions?created_at=gte.${yesterdayIso}&select=id`);
        if (Array.isArray(submissions)) {
            newSubmissions24h = submissions.length;
        }

        // ✅ Uniquement le count des bugs ouverts
        const bugs = await fetchSupabaseRest(env, `bug_reports?status=eq.open&select=id`);
        if (Array.isArray(bugs)) {
            pendingBugsCount = bugs.length;
        }

        // ✅ Uniquement le count des alertes de sécurité (pas les détails personnels)
        const alerts = await fetchSupabaseRest(env, `dame_sky_safety_alerts?created_at=gte.${yesterdayIso}&select=id`);
        if (Array.isArray(alerts)) {
            safetyAlerts24h = alerts.length;
        }
    } catch (e) {
        console.warn('[AutonomousReport] Erreur lors de la collecte des métriques:', e);
    }

    return {
        totalOrgs,
        totalStudents,
        totalTeachers,
        newStudents24h,
        newSubmissions24h,
        pendingBugsCount,
        safetyAlerts24h,
        autopilotOrgsCount,
    };
}

/**
 * Charge la configuration du rapport depuis dame_sky_config
 * Permet au superadmin de configurer l'heure d'envoi et l'email
 */
export async function loadReportConfig(env: Env): Promise<ReportConfig> {
    const defaultConfig: ReportConfig = {
        recipient: env.VAPID_EMAIL?.replace(/^mailto:/i, '') || 'kleintaptue1@gmail.com',
        reportHourUtc: 20,   // 20h UTC = 21h Paris = heure par défaut
        reportMinuteUtc: 0,
        autoEnabled: true,
    };

    try {
        const configs = await fetchSupabaseRest(env, 'dame_sky_config?select=superadmin_email,auto_email_report_enabled,report_hour_utc,report_minute_utc&limit=1');
        const cfg = Array.isArray(configs) ? configs[0] : null;
        if (cfg) {
            if (cfg.superadmin_email) defaultConfig.recipient = cfg.superadmin_email;
            if (typeof cfg.auto_email_report_enabled === 'boolean') defaultConfig.autoEnabled = cfg.auto_email_report_enabled;
            if (typeof cfg.report_hour_utc === 'number') defaultConfig.reportHourUtc = cfg.report_hour_utc;
            if (typeof cfg.report_minute_utc === 'number') defaultConfig.reportMinuteUtc = cfg.report_minute_utc;
        }
    } catch {
        // Utiliser la config par défaut si erreur
    }

    return defaultConfig;
}

/**
 * Vérifie si le rapport doit être envoyé maintenant selon l'heure configurée
 */
export async function shouldSendReportNow(env: Env): Promise<boolean> {
    const cfg = await loadReportConfig(env);
    if (!cfg.autoEnabled) return false;

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const todayKey = `report_sent_${now.toISOString().slice(0, 10)}`;

    // Vérifier si déjà envoyé aujourd'hui
    const alreadySent = await env.NOTIFICATION_CACHE.get(todayKey);
    if (alreadySent) return false;

    // Envoyer si on est à l'heure configurée (±5 minutes de tolérance pour le cron)
    const targetHour = cfg.reportHourUtc;
    const targetMin  = cfg.reportMinuteUtc;
    const diffMinutes = (currentHour * 60 + currentMinute) - (targetHour * 60 + targetMin);
    return diffMinutes >= 0 && diffMinutes < 10;
}

/**
 * Appelle DeepSeek V4 Flash pour rédiger la synthèse exécutive
 */
async function generateAiExecutiveBriefing(apiKey: string, metrics: PlatformMetrics): Promise<string> {
    const systemPrompt = `Tu es DAME SKY, Directrice Académique & Super-Intendante Autonome de la plateforme IziTeach.
Tu rédiges le rapport quotidien exécutif confidentiel pour le Super-Administrateur.

POSTURE :
- Distinguée, percutante, factuelle et orientée résultats.
- Aucun bavardage inutile, aucune flatterie complaisante.
- Style soigné, direct, fluide et aéré avec tirets simples. RÈGLE STRICTE : AUCUN balisage markdown brut (pas de **, pas de ###).

FORMAT DU RAPPORT (3 courts paragraphes) :
1. ÉTAT GÉNÉRAL & PERFORMANCE : Synthèse chiffrée de la journée (activités, croissance, écoles en pilote auto).
2. POINTS DE VIGILANCE & ANOMALIES : Devoirs en attente, alertes ou bugs à surveiller.
3. CONSEIL STRATÉGIQUE DE DAME SKY : Recommandation proactive pour booster l'engagement ou la rentabilité.`;

    const userPrompt = `DONNÉES DU JOUR SUR LA PLATEFORME IZITEACH :
- Établissements actifs : ${metrics.totalOrgs} (dont ${metrics.autopilotOrgsCount} en Pilote Automatique 100% autonome)
- Effectif apprenants : ${metrics.totalStudents} (${metrics.newStudents24h} nouveaux inscrits ces 24h)
- Corps professoral : ${metrics.totalTeachers} enseignants
- Travaux & Devoirs rendus (24h) : ${metrics.newSubmissions24h} copies
- Alertes sécurité / modération (24h) : ${metrics.safetyAlerts24h}
- Signalements bugs ouverts : ${metrics.pendingBugsCount}

Rédige la synthèse exécutive pour le Superadmin.`;

    const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 450,
            temperature: 0.35,
            stream: false
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek error ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json() as any;
    return (data?.choices?.[0]?.message?.content || '').trim();
}

/**
 * Construit le template HTML du rapport exécutif
 */
function buildReportHtml(dateStr: string, briefingText: string, metrics: PlatformMetrics): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rapport Exécutif Quotidien — Dame SKY</title>
</head>
<body style="margin:0;padding:0;background:#0A0D14;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    
    <!-- En-tête Prestigieux -->
    <div style="text-align:center;padding:28px 0 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="display:inline-block;padding:8px 16px;background:linear-gradient(135deg, rgba(217,119,6,0.2), rgba(180,83,9,0.1));border:1px solid rgba(245,158,11,0.3);border-radius:24px;margin-bottom:12px;">
        <span style="color:#FCD34D;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;">👑 Rapport Autonome — Dame SKY</span>
      </div>
      <h1 style="color:#FFFFFF;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.5px;">IziTeach · Synthèse Exécutive</h1>
      <p style="color:#94A3B8;font-size:13px;margin:0;">Date : ${dateStr} · Veille & Audit Automatisé</p>
    </div>

    <!-- Grille KPIs Clés -->
    <div style="display:table;width:100%;margin:24px 0;">
      <div style="display:table-row;">
        <div style="display:table-cell;width:50%;padding:8px;">
          <div style="background:#111726;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;text-align:center;">
            <div style="color:#60A5FA;font-size:22px;font-weight:800;">${metrics.totalOrgs}</div>
            <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;font-weight:600;margin-top:2px;">Écoles (${metrics.autopilotOrgsCount} en Pilote Auto)</div>
          </div>
        </div>
        <div style="display:table-cell;width:50%;padding:8px;">
          <div style="background:#111726;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;text-align:center;">
            <div style="color:#34D399;font-size:22px;font-weight:800;">${metrics.totalStudents}</div>
            <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;font-weight:600;margin-top:2px;">Apprenants (+${metrics.newStudents24h} hier)</div>
          </div>
        </div>
      </div>
      <div style="display:table-row;">
        <div style="display:table-cell;width:50%;padding:8px;">
          <div style="background:#111726;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;text-align:center;">
            <div style="color:#FBBF24;font-size:22px;font-weight:800;">${metrics.newSubmissions24h}</div>
            <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;font-weight:600;margin-top:2px;">Devoirs Traités (24h)</div>
          </div>
        </div>
        <div style="display:table-cell;width:50%;padding:8px;">
          <div style="background:#111726;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;text-align:center;">
            <div style="color:${metrics.pendingBugsCount > 0 ? '#F87171' : '#38BDF8'};font-size:22px;font-weight:800;">${metrics.pendingBugsCount}</div>
            <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;font-weight:600;margin-top:2px;">Bugs Signalés</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenu Synthèse Dame SKY -->
    <div style="background:#131B2E;border:1px solid rgba(217,119,6,0.3);border-radius:18px;padding:24px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
      <div style="display:flex;align-items:center;margin-bottom:14px;">
        <span style="font-size:18px;margin-right:8px;">📝</span>
        <h2 style="color:#FCD34D;font-size:16px;font-weight:700;margin:0;">Mémo de Surveillance de Dame SKY</h2>
      </div>
      <div style="color:#CBD5E1;font-size:14px;line-height:1.75;white-space:pre-line;">
        ${briefingText}
      </div>
    </div>

    <!-- Pied de page -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);color:#64748B;font-size:11px;">
      <p style="margin:0 0 4px;">Envoyé automatiquement par l'Agent Autonome Dame SKY · SuperAdmin Console</p>
      <p style="margin:0;">IziTeach Educational Operating System</p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Point d'entrée : déclenche le rapport quotidien et l'envoie par email
 *
 * CONFIDENTIALITÉ : Seuls des chiffres agrégés anonymisés (compteurs) sont
 * envoyés à DeepSeek. Aucune donnée personnelle ne quitte Supabase.
 */
export async function triggerDailyExecutiveReport(
    env: Env,
    overrideEmail?: string
): Promise<{ success: boolean; recipient: string; reportPreview: string; error?: string }> {
    const startTime = Date.now();
    console.log('[AutonomousReport] 🚀 Démarrage du rapport exécutif Dame SKY...');

    // 1. Charger la config (email, heure, activation) depuis dame_sky_config
    const reportConfig = await loadReportConfig(env);
    let recipient = overrideEmail || reportConfig.recipient;

    // 2. Collecter les métriques
    const metrics = await collectPlatformMetrics(env);

    // 3. Clé DeepSeek
    const apiKey = env.DEEPSEEK_API_KEY || '';

    // 4. Générer la synthèse via DeepSeek V4 Flash
    let briefingText = '';
    try {
        briefingText = await generateAiExecutiveBriefing(apiKey, metrics);
    } catch (aiErr: any) {
        console.error('[AutonomousReport] Erreur DeepSeek:', aiErr);
        briefingText = `Synthèse automatique des indicateurs : ${metrics.totalOrgs} établissements enregistrés (${metrics.autopilotOrgsCount} en pilote automatique), ${metrics.totalStudents} étudiants dont ${metrics.newStudents24h} inscrits au cours des dernières 24h. Le système fonctionne de manière stable.`;
    }

    // 5. Générer l'email HTML
    const dateStr = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const emailHtml = buildReportHtml(dateStr, briefingText, metrics);
    const emailSubject = `👑 Dame SKY — Rapport Exécutif Quotidien IziTeach (${new Date().toLocaleDateString('fr-FR')})`;

    // 6. Envoyer par email (Resend ou Brevo)
    const emailRes = await sendEmailInternal(env, {
        to: [recipient],
        subject: emailSubject,
        html: emailHtml,
        from_name: 'Dame SKY · IziTeach',
    });

    const nowIso = new Date().toISOString();

    // 7. Journaliser dans ai_agent_logs
    try {
        await fetchSupabaseRest(env, 'ai_agent_logs', {
            method: 'POST',
            body: {
                tool_name: 'autonomous_daily_email_report',
                input_summary: `Destinataire: ${recipient} | Ecoles: ${metrics.totalOrgs} | Eleves: ${metrics.totalStudents}`,
                output_summary: briefingText.slice(0, 300),
                status: emailRes.success ? 'success' : 'error',
                duration_ms: Date.now() - startTime,
                executed_at: nowIso,
            }
        });

        // Mettre à jour last_email_report_sent_at dans dame_sky_config
        await fetchSupabaseRest(env, 'dame_sky_config', {
            method: 'PATCH',
            body: { last_email_report_sent_at: nowIso }
        });
    } catch (logErr) {
        console.warn('[AutonomousReport] Erreur enregistrement logs:', logErr);
    }

    // 8. Marquer dans KV pour dédupliquer l'envoi du jour
    const todayKey = `report_sent_${new Date().toISOString().slice(0, 10)}`;
    await env.NOTIFICATION_CACHE.put(todayKey, '1', { expirationTtl: 86400 }).catch(() => {});

    return {
        success: emailRes.success,
        recipient,
        reportPreview: briefingText,
        error: emailRes.error,
    };
}
