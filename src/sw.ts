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
import { clientsClaim }                             from 'workbox-core';
import { registerRoute }                            from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin }    from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── Take over immediately on deploy ─────────────────────────────────────────
// registerType is "autoUpdate" but injectManifest mode leaves the activation
// policy to us. Without this, a new SW stays "waiting" until every tab of the
// site is closed — so users kept running the previous build (and, after the
// app.html entry rename, hit stale-asset mismatches).
self.skipWaiting();
clientsClaim();

// ── Precache (manifest injected by vite-plugin-pwa at build time) ────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Runtime caching ───────────────────────────────────────────────────────────

// NOTE: there is deliberately NO Supabase runtime cache.
//  - In production every Supabase call goes through the same-origin /sb-api
//    proxy (src/lib/supabase.ts), so a `*.supabase.co` matcher never fired.
//  - Caching authenticated PostgREST responses in the (shared, not
//    Authorization-keyed) Cache Storage would leak one user's data to the next
//    person using the same browser profile.
//  - Offline UX is already covered by the persisted TanStack Query cache.

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

  // `renotify` and `vibrate` are valid Notification options at runtime but
  // missing from the DOM lib's NotificationOptions.
  const notifOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
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

// ── Notification click → bring the app to the notification's page ────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl    = (event.notification.data as { url?: string })?.url ?? '/vote';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // The app is already open (installed PWA or a tab, usually on another
    // page): reuse it on the right page instead of stacking a second instance.
    const existing = windowClients.find(c => new URL(c.url).origin === self.location.origin);
    if (existing) {
      const focused = await existing.focus();
      if (focused.url === targetUrl) return;
      // navigate() only works on clients this worker controls.
      try {
        await focused.navigate(targetUrl);
        return;
      } catch {
        // uncontrolled client — fall through to a new window
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
