/**
 * src/sw.ts — Custom Service Worker for Pépite & Citron
 *
 * Compiled by vite-plugin-pwa (injectManifest strategy).
 * Handles:
 *  - Precaching (Workbox injects __WB_MANIFEST)
 *  - Runtime caching (Supabase, fonts, static assets)
 *  - Web Push notifications (vote_open / results_ready)
 *  - notificationclick → focus or open the app
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute }                            from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin }    from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── Precache (manifest injected by vite-plugin-pwa at build time) ────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Runtime caching ───────────────────────────────────────────────────────────

// Supabase API → Network-first (fresh data; cache fallback when offline)
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Google Fonts → Stale-while-revalidate
registerRoute(
  ({ url }) => ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname),
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Static images → Cache-first (long TTL)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ── Push notification handler ─────────────────────────────────────────────────

interface PushPayload {
  type: 'vote_open' | 'results_ready';
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = {
      type: 'vote_open',
      title: 'Pépite & Citron',
      body: event.data.text(),
    };
  }

  const { title, body, url = '/', icon = '/icon-192x192.png', badge = '/icon-192x192.png' } = payload;

  const notifOptions: NotificationOptions = {
    body,
    icon,
    badge,
    tag:    payload.type,          // collapse same-type notifications
    renotify: true,
    data:   { url },
    // Vibration pattern: short double-buzz
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, notifOptions),
  );
});

// ── Notification click → focus app or open new tab ───────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window on the correct URL
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // No matching window — open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
