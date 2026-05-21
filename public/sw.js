/**
 * Surflix service worker — Web Push receiver.
 *
 * Server kirim push payload (JSON: { title, body, url?, tag? }) via /api/push.
 * Service worker terima 'push' event, panggil showNotification.
 * 'notificationclick' navigate ke URL (default /requests).
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Surflix', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Surflix';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'surflix-status',
    data: { url: payload.url || '/requests' },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/requests';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau udah ada window Surflix yang kebuka, fokus ke situ + navigate
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && 'focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(target);
            }
            return;
          }
        } catch {}
      }
      // Belum ada window, buka baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});
