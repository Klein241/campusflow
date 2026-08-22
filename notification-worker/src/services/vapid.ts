/**
 * Web Push Encryption (RFC 8291), HKDF, ECDH, VAPID JWT & Direct Push
 */
import { Env, PushSubscriptionRecord } from '../types';
import { SupabaseClient } from './supabase';
import { json, jsonResponse } from '../lib/cors';

// ══════════════════════════════════════════════════════════
// WEB PUSH ENCRYPTION (RFC 8291)
// ══════════════════════════════════════════════════════════

function b64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function strToB64url(s: string): string {
    return b64urlEncode(new TextEncoder().encode(s));
}

async function importVapidPrivateKey(publicKeyB64url: string, privateKeyB64url: string) {
    const pubBytes = b64urlDecode(publicKeyB64url);
    const x = b64urlEncode(pubBytes.slice(1, 33));
    const y = b64urlEncode(pubBytes.slice(33, 65));

    return crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', x, y, d: privateKeyB64url, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );
}

async function createVapidJwt(audience: string, subject: string, publicKeyB64: string, privateKeyB64: string) {
    const header = strToB64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const payload = strToB64url(JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
    }));

    const unsigned = `${header}.${payload}`;
    const key = await importVapidPrivateKey(publicKeyB64, privateKeyB64);

    const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(unsigned)
    );

    return `${unsigned}.${b64urlEncode(new Uint8Array(sig))}`;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(
        await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
    );
}

async function encryptPayload(p256dhB64: string, authB64: string, payloadString: string): Promise<Uint8Array> {
    const plaintext = new TextEncoder().encode(payloadString);
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const localKeys = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    ) as CryptoKeyPair;

    const uaPublic = b64urlDecode(p256dhB64);
    const subscriberKey = await crypto.subtle.importKey(
        'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
    );

    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: subscriberKey } as any, // CF Workers ECDH params
            localKeys.privateKey,
            256
        )
    );

    const authSecret = b64urlDecode(authB64);
    const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', localKeys.publicKey) as ArrayBuffer);

    const infoPrefix = new TextEncoder().encode('WebPush: info\0');
    const keyInfo = new Uint8Array(infoPrefix.length + 65 + 65);
    keyInfo.set(infoPrefix);
    keyInfo.set(uaPublic, infoPrefix.length);
    keyInfo.set(asPublic, infoPrefix.length + 65);

    const ikm = await hkdf(sharedSecret, authSecret, keyInfo, 32);
    const cek = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

    const padded = new Uint8Array(plaintext.length + 1);
    padded.set(plaintext);
    padded[plaintext.length] = 2;

    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded)
    );

    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096, false);

    const body = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length);
    let off = 0;
    body.set(salt, off); off += 16;
    body.set(rs, off); off += 4;
    body[off] = 65; off += 1;
    body.set(asPublic, off); off += 65;
    body.set(ciphertext, off);

    return body;
}

async function sendWebPush(
    subscription: any,
    payloadObj: any,
    env: Env
): Promise<{ ok: boolean; status?: number; error?: string }> {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        return { ok: false, error: 'VAPID keys not configured' };
    }

    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.hostname}`;

    const jwt = await createVapidJwt(
        audience,
        env.VAPID_EMAIL || 'mailto:admin@campusflow.app',
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
    );

    const body = await encryptPayload(
        subscription.keys.p256dh,
        subscription.keys.auth,
        JSON.stringify(payloadObj)
    );

    const urgency = payloadObj.urgency || 'normal';

    const res = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
            'Urgency': urgency,
        },
        body,
    });

    if (res.status === 410 || res.status === 404) {
        // Subscription expired
        return { ok: false, status: res.status, error: 'Subscription expired' };
    }

    return { ok: res.ok, status: res.status };
}


// ══════════════════════════════════════════════════════════
// DIRECT PUSH SENDER (replaces queue for free tier)
// ══════════════════════════════════════════════════════════

async function sendPushDirect(
    userId: string,
    title: string,
    body: string,
    data: any,
    priority: string,
    aggKey: string,
    env: Env
): Promise<void> {
    try {
        // Get push subscription from KV first, then Supabase
        let storedData: any = null;
        let subJson = await env.PUSH_TOKEN_CACHE.get(`push:${userId}`);

        if (subJson) {
            try {
                const parsed = JSON.parse(subJson);
                // Handle both new format { subscription, orgSlug } and legacy format
                storedData = parsed.subscription ? parsed : { subscription: parsed };
            } catch (e) {
                // ignore
            }
        }

        if (!storedData?.subscription) {
            const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
            const tokens = await db.select('push_tokens', {
                select: 'subscription_json',
                filters: `user_id=eq.${userId}`,
                single: true,
            }) as { subscription_json?: string } | null;
            if (tokens?.subscription_json) {
                try {
                    const sub = JSON.parse(tokens.subscription_json);
                    storedData = { subscription: sub };
                    await env.PUSH_TOKEN_CACHE.put(`push:${userId}`, JSON.stringify(storedData), { expirationTtl: 30 * 86400 });
                } catch (e) {}
            }
        }

        if (!storedData?.subscription) return;

        const orgSlug = data?.orgSlug || storedData?.orgSlug || '';
        // Prefer an explicit URL built in buildActionData; fall back to campus root
        const targetUrl = data?.url || (orgSlug ? `/${orgSlug}/campus` : '/');

        const pushPayload = {
            title,
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: {
                orgSlug,
                ...data,
                url: targetUrl, // ensure url is the resolved one
            },
            urgency: priority === 'high' ? 'high' : 'normal',
            tag: aggKey || `cf-${Date.now()}`,
            renotify: true,
        };

        const result = await sendWebPush(storedData.subscription, pushPayload, env);

        if (result.status === 410 || result.status === 404) {
            // Subscription expired → clean up
            await env.PUSH_TOKEN_CACHE.delete(`push:${userId}`);
            const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
            try {
                await db.query('push_tokens', { method: 'DELETE', filters: `user_id=eq.${userId}` });
            } catch (e) { /* non-critical */ }
        }
    } catch (e) {
        console.error('[Push] Direct send error for user', userId, e);
    }
}


// ══════════════════════════════════════════════════════════
// LEGACY PUSH ENDPOINTS (Backward-compatible with existing worker)
// ══════════════════════════════════════════════════════════

function handleVapidKey(env: Env): Response {
    return json({ publicKey: env.VAPID_PUBLIC_KEY || null });
}

async function handlePushSend(request: Request, env: Env): Promise<Response> {
    const { userId, title, message, data } = await request.json() as any;

    let subJson = await env.PUSH_TOKEN_CACHE.get(`push:${userId}`);
    if (!subJson) return json({ ok: false, error: 'No subscription' });

    const subscription = JSON.parse(subJson);
    const result = await sendWebPush(subscription, {
        title,
        body: message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data || {},
    }, env);

    return json(result);
}


export {
    b64urlEncode,
    b64urlDecode,
    strToB64url,
    importVapidPrivateKey,
    createVapidJwt,
    hkdf,
    encryptPayload,
    sendWebPush,
    sendPushDirect,
    handleVapidKey,
    handlePushSend,
};
