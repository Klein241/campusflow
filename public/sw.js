// Service Worker — CampusFlow (Enterprise Multi-Tenant Edition)
// Handles: Push Notifications, Multi-tenant Deep-linking, Daily Engagement, Offline caching
// Backend: Cloudflare Worker (campusflow-worker)

const CACHE_NAME = 'campusflow-cache-v5';
const BOOK_CACHE = 'campusflow-books-v1';
const SETTINGS_CACHE = 'campusflow-settings-v1';

// App shell files to precache
const APP_SHELL = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/logo-campusflow.png',
];

// In-memory fallback for active org
let currentActiveOrgSlug = '';

// Helper to get stored org slug from Cache / IndexedDB
async function getStoredOrgSlug() {
    if (currentActiveOrgSlug) return currentActiveOrgSlug;
    try {
        const cache = await caches.open(SETTINGS_CACHE);
        const resp = await cache.match('/__active_org_slug');
        if (resp) {
            const text = await resp.text();
            if (text && text.trim()) {
                currentActiveOrgSlug = text.trim();
                return currentActiveOrgSlug;
            }
        }
    } catch (e) {
        // ignore
    }
    return '';
}

// Helper to save active org slug
async function saveActiveOrgSlug(slug) {
    if (!slug) return;
    currentActiveOrgSlug = slug;
    try {
        const cache = await caches.open(SETTINGS_CACHE);
        await cache.put('/__active_org_slug', new Response(slug, {
            headers: { 'Content-Type': 'text/plain' }
        }));
    } catch (e) {
        // ignore
    }
}

// ══════════════════════════════════════════════════════════
// 1. PUSH NOTIFICATION RECEIVER (Background & Foreground)
// ══════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
    if (!event.data) return;

    event.waitUntil((async () => {
        try {
            const data = event.data.json();
            const actionType = data.action_type || data.data?.action_type || '';
            const incomingOrgSlug = data.orgSlug || data.data?.orgSlug || data.extra_data?.orgSlug || '';

            // Update stored slug if present
            if (incomingOrgSlug) {
                await saveActiveOrgSlug(incomingOrgSlug);
            }
            const activeSlug = incomingOrgSlug || await getStoredOrgSlug();

            // Build rich actions based on notification type
            const actions = [];

            if (actionType === 'new_exercise') {
                actions.push({ action: 'do_exercise', title: '🏋️ Faire l\'exercice' });
            } else if (actionType === 'new_lesson' || actionType === 'new_chapter') {
                actions.push({ action: 'view_lesson', title: '📚 Consulter le cours' });
            } else if (actionType === 'evaluation_scheduled' || actionType === 'evaluation_reminder') {
                actions.push({ action: 'view_eval', title: '📝 Voir l\'évaluation' });
            } else if (actionType === 'timetable_change') {
                actions.push({ action: 'view_timetable', title: '📅 Voir l\'Emploi du temps' });
            } else if (data.data?.subTab === 'bulletin' || actionType === 'grade_published') {
                actions.push({ action: 'view_grades', title: '📊 Consulter la note' });
            } else if (data.data?.subTab === 'paiement' || actionType === 'payment_confirmed') {
                actions.push({ action: 'view_payment', title: '💳 Voir le reçu' });
            } else if (data.data?.conversationId || actionType === 'dm_new_message') {
                actions.push({ action: 'reply', title: '💬 Répondre' });
            } else if (actionType === 'admin_new_inscription') {
                actions.push({ action: 'view_admin_inscriptions', title: '👥 Valider l\'inscription' });
            } else if (actionType === 'admin_new_payment') {
                actions.push({ action: 'view_admin_payments', title: '💰 Voir le paiement' });
            }
            actions.push({ action: 'open', title: '🚀 Ouvrir' });

            // Vibration pattern: High-impact (Alibaba/Pinterest strategy)
            const vibrate = [200, 100, 200, 100, 300];

            // Icon & Badge
            const icon = data.icon || '/icon-192.png';
            const badge = data.badge || '/icon-192.png';

            const options = {
                body: data.body || data.message || 'Nouvelle alerte de votre établissement',
                icon: icon,
                badge: badge,
                image: data.image || undefined,
                vibrate: vibrate,
                data: {
                    ...(data.data || {}),
                    orgSlug: activeSlug,
                    url: data.data?.url || data.url,
                    action_type: actionType,
                    timestamp: Date.now(),
                },
                actions: actions,
                tag: data.tag || `cf-${activeSlug || 'app'}-${actionType || 'notif'}-${Date.now()}`,
                renotify: true,
                requireInteraction: true, // Force notification to stay until user interacts
            };

            await self.registration.showNotification(data.title || 'CampusFlow — Notification', options);

            // Update app badge if supported (PWA mobile & desktop)
            if ('setAppBadge' in self.navigator) {
                try {
                    await self.navigator.setAppBadge();
                } catch (e) {
                    // ignore
                }
            }
        } catch (e) {
            console.error('[SW] Push parse error:', e);
        }
    })());
});

// ══════════════════════════════════════════════════════════
// 2. NOTIFICATION CLICK — Infallible Multi-Tenant Deep-Link
// ══════════════════════════════════════════════════════════

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil((async () => {
        // Clear app badge if supported
        if ('clearAppBadge' in self.navigator) {
            try {
                await self.navigator.clearAppBadge();
            } catch (e) {
                // ignore
            }
        }

        const notifData = event.notification.data || {};
        const actionType = notifData.action_type || '';
        const storedSlug = await getStoredOrgSlug();
        const orgSlug = notifData.orgSlug || storedSlug || '';

        let targetUrl = '/';

        // ── Admin-specific routes ──
        if (actionType.startsWith('admin_') || event.action === 'view_admin_inscriptions' || event.action === 'view_admin_payments') {
            if (orgSlug) {
                if (event.action === 'view_admin_inscriptions') {
                    targetUrl = `/${orgSlug}/admin?tab=students&sub=pending`;
                } else if (event.action === 'view_admin_payments') {
                    targetUrl = `/${orgSlug}/admin?tab=payments`;
                } else {
                    targetUrl = `/${orgSlug}/admin`;
                }
            } else {
                targetUrl = '/superadmin';
            }
        }
        // ── Campus student & teacher deep-links ──
        else if (orgSlug) {
            const action = event.action;

            if (action === 'do_exercise' || action === 'view_lesson' || action === 'view_cursus' ||
                ['new_subject', 'new_chapter', 'new_lesson', 'new_exercise', 'exercise_reminder'].includes(actionType)) {
                const targetParam = notifData.targetId ? `&targetId=${notifData.targetId}` : '';
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=cursus${targetParam}`;
            } else if (action === 'view_eval' || ['evaluation_scheduled', 'evaluation_reminder'].includes(actionType)) {
                targetUrl = `/${orgSlug}/campus?tab=exam_room`;
            } else if (action === 'view_grades' || actionType === 'grade_published') {
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=bulletin`;
            } else if (action === 'view_payment' || actionType === 'payment_confirmed') {
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=paiement`;
            } else if (action === 'view_timetable' || actionType === 'timetable_change') {
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=edt`;
            } else if (action === 'reply' || actionType === 'dm_new_message') {
                const convParam = notifData.conversationId ? `&convId=${notifData.conversationId}` : '';
                targetUrl = `/${orgSlug}/campus?tab=chat${convParam}`;
            } else if (actionType === 'group_new_message' || actionType === 'group_access_request') {
                const grpParam = notifData.groupId ? `&groupId=${notifData.groupId}` : '';
                targetUrl = `/${orgSlug}/campus?tab=chat${grpParam}`;
            } else if (actionType.startsWith('actu_') || actionType.startsWith('story_') || actionType === 'admin_announcement') {
                targetUrl = `/${orgSlug}/campus?tab=actus`;
            } else if (actionType === 'daily_engagement_morning') {
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=edt`;
            } else if (actionType === 'daily_engagement_noon') {
                targetUrl = `/${orgSlug}/campus?tab=myspace&subTab=cursus`;
            } else if (actionType === 'daily_engagement_evening') {
                targetUrl = `/${orgSlug}/campus?tab=actus`;
            } else if (notifData.tab) {
                const subParam = notifData.subTab ? `&subTab=${notifData.subTab}` : '';
                targetUrl = `/${orgSlug}/campus?tab=${notifData.tab}${subParam}`;
            } else {
                targetUrl = `/${orgSlug}/campus`;
            }
        } else {
            // Fallback if no org slug found
            if (notifData.url && notifData.url !== '/') {
                targetUrl = notifData.url;
            } else {
                targetUrl = '/';
            }
        }

        // Focus or Open Window
        const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
                await client.navigate(targetUrl);
                return client.focus();
            }
        }

        if (clients.openWindow) {
            return clients.openWindow(targetUrl);
        }
    })());
});

// ══════════════════════════════════════════════════════════
// 3. APP COMMUNICATION & MESSAGING
// ══════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
    if (!event.data) return;

    // Set Active Org from App
    if (event.data.type === 'SET_ACTIVE_ORG') {
        const { orgSlug } = event.data;
        if (orgSlug) {
            saveActiveOrgSlug(orgSlug);
        }
    }

    // Direct in-app display notification (Local push)
    if (event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag, url, orgSlug, action_type } = event.data;
        if (orgSlug) saveActiveOrgSlug(orgSlug);

        self.registration.showNotification(title || 'CampusFlow', {
            body: body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: tag || `local_${Date.now()}`,
            data: { url: url || '/', orgSlug: orgSlug || currentActiveOrgSlug, action_type },
            vibrate: [200, 100, 200],
            requireInteraction: false,
        });
    }

    // Cache a book for offline reading
    if (event.data.type === 'CACHE_BOOK') {
        const { url, title } = event.data;
        if (url) {
            caches.open(BOOK_CACHE).then(cache => {
                fetch(url).then(response => {
                    if (response.ok) {
                        cache.put(url, response.clone());
                        event.source?.postMessage({
                            type: 'BOOK_CACHED',
                            url,
                            title,
                            success: true,
                        });
                    }
                }).catch(err => {
                    event.source?.postMessage({
                        type: 'BOOK_CACHED',
                        url,
                        title,
                        success: false,
                        error: err.message,
                    });
                });
            });
        }
    }

    // Remove cached book
    if (event.data.type === 'UNCACHE_BOOK') {
        const { url } = event.data;
        if (url) {
            caches.open(BOOK_CACHE).then(cache => cache.delete(url));
        }
    }

    // Check cached books
    if (event.data.type === 'GET_CACHED_BOOKS') {
        caches.open(BOOK_CACHE).then(cache => {
            cache.keys().then(requests => {
                const urls = requests.map(r => r.url);
                event.source?.postMessage({
                    type: 'CACHED_BOOKS_LIST',
                    urls,
                });
            });
        });
    }
});

// ══════════════════════════════════════════════════════════
// 4. LIFECYCLE & CACHING
// ══════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL).catch(() => {
                // Some files may not exist, non-critical
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== BOOK_CACHE && k !== SETTINGS_CACHE && !k.startsWith('mdp-'))
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — serve cached books offline, network-first for everything else
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Book files caching
    if (url.pathname.includes('/r2/books/') || url.pathname.includes('/library/books/')) {
        event.respondWith(
            caches.open(BOOK_CACHE).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                })
            ).catch(() => {
                return new Response('Livre non disponible hors ligne', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            })
        );
        return;
    }

    // Cover images: cache-first
    if (url.pathname.includes('/r2/covers/') || url.pathname.includes('/library/covers/')) {
        event.respondWith(
            caches.open(BOOK_CACHE).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                })
            ).catch(() => fetch(event.request))
        );
        return;
    }

    // Navigation requests: network-first with offline fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match('/').then(cached => cached || new Response('Hors ligne', { status: 503 }))
            )
        );
        return;
    }
});
