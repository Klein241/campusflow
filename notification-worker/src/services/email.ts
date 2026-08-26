/**
 * Dual Email Provider (Resend + Brevo) & Inscription Handler
 */
import { Env } from '../types';
import { json, jsonResponse, errorResponse } from '../lib/cors';
import { SupabaseClient } from './supabase';

// ══════════════════════════════════════════════════════════
// EMAIL DUAL-PROVIDER — Resend (100/j) + Brevo (300/j)
// Failover automatique : Resend → Brevo si quota dépassé
// POST /api/email/send
// GET  /api/email/status  (superadmin only)
// ══════════════════════════════════════════════════════════

// ── Helpers compteurs KV ─────────────────────────────────
const TODAY_KEY = () => `email_count_${new Date().toISOString().slice(0, 10)}`;

async function getEmailCount(env: Env, provider: 'resend' | 'brevo'): Promise<number> {
    const raw = await env.NOTIFICATION_CACHE.get(`${TODAY_KEY()}_${provider}`);
    return raw ? parseInt(raw, 10) : 0;
}

async function incrementEmailCount(env: Env, provider: 'resend' | 'brevo', count: number) {
    const key = `${TODAY_KEY()}_${provider}`;
    const current = await getEmailCount(env, provider);
    // TTL 25h pour nettoyage auto
    await env.NOTIFICATION_CACHE.put(key, String(current + count), { expirationTtl: 90000 });
}

// ── Builder HTML email premium ────────────────────────────
function buildEmailHtml(html: string | undefined, text: string | undefined, org_name: string, org_logo: string | undefined, subject: string): string {
    if (html) return html;
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:36px 0 20px;">
      ${org_logo ? `<img src="${org_logo}" alt="${org_name}" style="height:60px;border-radius:14px;margin-bottom:14px;object-fit:contain;"/>` : ''}
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;font-weight:800;">${org_name}</h1>
      <p style="color:#64748B;font-size:13px;margin:0;">Notification de votre établissement</p>
    </div>
    <div style="background:#1E293B;border-radius:20px;padding:28px 32px;border:1px solid #334155;">
      <h2 style="color:#38BDF8;font-size:17px;font-weight:700;margin:0 0 16px;">${subject}</h2>
      <div style="color:#CBD5E1;font-size:14px;line-height:1.75;white-space:pre-line;">${text || ''}</div>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px;margin-top:20px;">
      Envoyé via IziTeach · ${org_name}<br/>
      <span style="font-size:10px;">Ne pas répondre à cet email</span>
    </p>
  </div>
</body></html>`;
}

// ── Envoi via Resend ──────────────────────────────────────
async function sendViaResend(
    apiKey: string,
    to: string[],
    subject: string,
    html: string,
    fromAddress: string
): Promise<{ ok: boolean; status: number; quotaExceeded: boolean; data: any }> {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddress, to, subject, html }),
    });
    const data = await res.json() as any;
    // Resend quota dépassé → 429 OU error.name === 'rate_limit_exceeded' OU daily_sending_quota_exceeded
    const quotaExceeded = res.status === 429 ||
        data?.name === 'rate_limit_exceeded' ||
        data?.name === 'daily_sending_quota_exceeded' ||
        (data?.message || '').toLowerCase().includes('quota');
    return { ok: res.ok, status: res.status, quotaExceeded, data };
}

// ── Envoi via Brevo (SMTP API) ────────────────────────────
async function sendViaBrevo(
    apiKey: string,
    to: string[],
    subject: string,
    html: string,
    fromName: string
): Promise<{ ok: boolean; status: number; quotaExceeded: boolean; data: any }> {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: fromName, email: 'noreply@iziteach.com' },
            to: to.map(email => ({ email })),
            subject,
            htmlContent: html,
        }),
    });
    const data = await res.json() as any;
    const quotaExceeded = res.status === 429 || res.status === 402 ||
        (data?.message || '').toLowerCase().includes('quota') ||
        (data?.message || '').toLowerCase().includes('limit');
    return { ok: res.ok, status: res.status, quotaExceeded, data };
}

// ── Handler principal ────────────────────────────────────
async function handleEmailSend(request: Request, env: Env): Promise<Response> {
    const body = await request.json() as {
        to:         string[];
        subject:    string;
        html?:      string;
        text?:      string;
        org_name?:  string;
        org_logo?:  string;
        from_name?: string;
    };

    const { to, subject, html, text, org_name = 'IziTeach', org_logo, from_name } = body;

    if (!to?.length) return json({ error: 'recipients (to) required' }, 400);
    if (!subject)    return json({ error: 'subject required' }, 400);
    if (!html && !text) return json({ error: 'html or text body required' }, 400);

    const resendKey = (env as any).RESEND_API_KEY as string | undefined;
    const brevoKey  = (env as any).BREVO_API_KEY  as string | undefined;

    if (!resendKey && !brevoKey) {
        return json({ error: 'No email provider configured. Add RESEND_API_KEY or BREVO_API_KEY to Worker secrets.' }, 503);
    }

    const emailHtml  = buildEmailHtml(html, text, org_name, org_logo, subject);
    const fromName   = from_name || org_name;
    const fromAddr   = `${fromName} <noreply@iziteach.com>`;

    // Chunking : Resend max 50/call, Brevo max 50/call
    const CHUNK = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < to.length; i += CHUNK) chunks.push(to.slice(i, i + CHUNK));

    let providerUsed: 'resend' | 'brevo' | 'none' = 'none';
    let totalSent = 0;
    let failedOver = false;
    const results: any[] = [];
    let lastError: string | null = null;

    for (const chunk of chunks) {
        let sent = false;

        // ── Tentative 1 : Resend ──────────────────────────
        if (resendKey && !failedOver) {
            const r = await sendViaResend(resendKey, chunk, subject, emailHtml, fromAddr);
            if (r.ok) {
                providerUsed = 'resend';
                totalSent += chunk.length;
                await incrementEmailCount(env, 'resend', chunk.length);
                results.push({ provider: 'resend', chunk_size: chunk.length, status: r.status });
                sent = true;
            } else if (r.quotaExceeded) {
                // Quota Resend dépassé → failover vers Brevo
                failedOver = true;
                console.log('[Email] Resend quota exceeded → switching to Brevo');
            } else {
                lastError = r.data?.message || `Resend error ${r.status}`;
                results.push({ provider: 'resend', chunk_size: chunk.length, status: r.status, error: lastError });
            }
        }

        // ── Tentative 2 (ou failover) : Brevo ────────────
        if (!sent && brevoKey) {
            const b = await sendViaBrevo(brevoKey, chunk, subject, emailHtml, fromName);
            if (b.ok) {
                providerUsed = providerUsed === 'resend' ? 'resend' : 'brevo'; // keep 'resend' if already sent some via resend
                if (failedOver) providerUsed = 'brevo';
                totalSent += chunk.length;
                await incrementEmailCount(env, 'brevo', chunk.length);
                results.push({ provider: 'brevo', chunk_size: chunk.length, status: b.status });
                sent = true;
            } else {
                lastError = b.data?.message || `Brevo error ${b.status}`;
                results.push({ provider: 'brevo', chunk_size: chunk.length, status: b.status, error: lastError });
            }
        }

        if (!sent) break; // Arrêt si les deux providers échouent
    }

    const success = totalSent === to.length;
    return json({
        success,
        sent: totalSent,
        total: to.length,
        provider: providerUsed,    // visible uniquement dans les logs / superadmin
        failed_over: failedOver,
        ...(lastError ? { error: lastError } : {}),
    }, success ? 200 : (totalSent > 0 ? 207 : 500));
}

// ── Statut email providers (superadmin only) ─────────────
async function handleEmailStatus(request: Request, env: Env): Promise<Response> {
    // Vérification superadmin via header secret ou Bearer token
    const authHeader = request.headers.get('Authorization') || '';
    const adminKey = request.headers.get('x-admin-key') || (authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : '');
    const expectedKey = (env as any).ADMIN_KEY as string | undefined;
    if (expectedKey && adminKey !== expectedKey) {
        return json({ error: 'Unauthorized' }, 401);
    }

    const resendCount = await getEmailCount(env, 'resend');
    const brevoCount  = await getEmailCount(env, 'brevo');
    const today       = new Date().toISOString().slice(0, 10);

    const resendConfigured = !!(env as any).RESEND_API_KEY;
    const brevoConfigured  = !!(env as any).BREVO_API_KEY;

    return json({
        date:  today,
        providers: {
            resend: {
                configured:    resendConfigured,
                sent_today:    resendCount,
                daily_limit:   100,
                remaining:     Math.max(0, 100 - resendCount),
                status:        resendCount < 100 ? 'active' : 'quota_exceeded',
            },
            brevo: {
                configured:    brevoConfigured,
                sent_today:    brevoCount,
                daily_limit:   300,
                remaining:     Math.max(0, 300 - brevoCount),
                status:        brevoCount < 300 ? 'active' : 'quota_exceeded',
            },
        },
        total_sent_today:     resendCount + brevoCount,
        total_capacity_today: (resendConfigured ? 100 : 0) + (brevoConfigured ? 300 : 0),
        active_provider:      resendCount < 100 ? 'resend' : (brevoConfigured ? 'brevo' : 'none'),
        failover_triggered:   resendCount >= 100 && brevoConfigured,
    });
}

async function handleInscription(request: Request, env: Env): Promise<Response> {
    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { organization_id, first_name, last_name, phone, access_code, pin_code,
            birth_date, gender, email, address, classroom_id, filiere_id,
            nationality, guardian_name, guardian_phone } = body;

    if (!organization_id || !first_name || !last_name || !phone || !access_code || !pin_code) {
        return json({ error: 'Champs obligatoires manquants' }, 400);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey  = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return json({ error: 'Configuration serveur manquante' }, 500);
    }

    const headers = {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
    };

    // 0. Vérification doublon étudiant
    try {
        const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/student_profiles?organization_id=eq.${organization_id}&first_name=ilike.${encodeURIComponent(first_name.trim())}&last_name=ilike.${encodeURIComponent(last_name.trim())}&select=id&limit=1`,
            { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
        );
        if (checkRes.ok) {
            const existing: any = await checkRes.json();
            if (Array.isArray(existing) && existing.length > 0) {
                return json({ error: `Un étudiant nommé "${first_name.trim()} ${last_name.trim()}" existe déjà dans cet établissement.` }, 409);
            }
        }
    } catch {}

    // 1. Insert dans inscription_requests
    const inscPayload: any = { organization_id, first_name, last_name, phone, access_code, pin_code };
    if (birth_date)      inscPayload.birth_date      = birth_date;
    if (gender)          inscPayload.gender           = gender;
    if (email)           inscPayload.email            = email;
    if (address)         inscPayload.address          = address;
    if (classroom_id)    inscPayload.classroom_id     = classroom_id;
    if (filiere_id)      inscPayload.filiere_id       = filiere_id;
    if (nationality)     inscPayload.nationality      = nationality;
    if (guardian_name)   inscPayload.guardian_name    = guardian_name;
    if (guardian_phone)  inscPayload.guardian_phone   = guardian_phone;

    const inscRes = await fetch(`${supabaseUrl}/rest/v1/inscription_requests`, {
        method: 'POST', headers, body: JSON.stringify(inscPayload),
    });
    if (!inscRes.ok) {
        const err = await inscRes.text();
        // Ignorer les erreurs de doublon (23505 = unique_violation)
        if (!err.includes('23505')) {
            return json({ error: err }, inscRes.status);
        }
    }

    // 2. Créer immédiatement le student_profile
    const mat = `STU-${Date.now().toString(36).toUpperCase()}`;
    const profilePayload: any = {
        organization_id,
        first_name,
        last_name,
        phone:           phone || null,
        access_code,
        pin_code:        pin_code || null,
        sky_points:      100,
        is_active:       true,
        pin_set:         true,
        approval_status: 'pending',   // en attente de validation admin
        matricule:       mat,
    };
    if (birth_date) {
        profilePayload.birth_date    = birth_date;
        profilePayload.date_of_birth = birth_date;
    }
    if (gender)          profilePayload.gender          = gender;
    if (email)           profilePayload.email           = email;
    if (address)         profilePayload.address         = address;
    if (classroom_id)    profilePayload.classroom_id    = classroom_id;
    if (filiere_id)      profilePayload.filiere_id      = filiere_id;
    if (nationality)     profilePayload.nationality     = nationality;
    if (guardian_name) {
        profilePayload.guardian_name = guardian_name;
        profilePayload.parent_name   = guardian_name;
    }
    if (guardian_phone) {
        profilePayload.guardian_phone = guardian_phone;
        profilePayload.parent_phone   = guardian_phone;
    }

    let profRes = await fetch(`${supabaseUrl}/rest/v1/student_profiles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(profilePayload),
    });

    let profileCreated = true;
    let profileError   = '';
    if (!profRes.ok) {
        profileError = await profRes.text();
        if (!profileError.includes('23505')) {
            // Fallback: si échec à cause d'une colonne inexistante, réessayer avec les champs de base uniquement
            const basePayload = {
                organization_id,
                first_name,
                last_name,
                phone:           phone || null,
                access_code,
                pin_code:        pin_code || null,
                sky_points:      100,
                is_active:       true,
                pin_set:         true,
                approval_status: 'pending',
                matricule:       mat,
            };
            const retryRes = await fetch(`${supabaseUrl}/rest/v1/student_profiles`, {
                method: 'POST',
                headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=representation' },
                body: JSON.stringify(basePayload),
            });
            if (retryRes.ok) {
                profileCreated = true;
                profileError   = '';
            } else {
                const retryErr = await retryRes.text();
                profileCreated = retryErr.includes('23505');
                profileError   = retryErr;
            }
        } else {
            profileCreated = true;
        }
    }

    return json({
        success:        true,
        access_code,
        profileCreated,
        profileError:   profileCreated ? null : profileError,
    });
}


export {
    handleEmailSend,
    handleEmailStatus,
    handleInscription,
};
