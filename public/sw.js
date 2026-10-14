// Service Worker for อบต.อ่างแก้ว PWA & Web Push Notifications
const CACHE_NAME = 'angkaeo-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests and non-API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful response clone
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Network error occurred', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// ================= WEB PUSH NOTIFICATION HANDLERS =================
self.addEventListener('push', (event) => {
  let data = {
    title: 'อบต.อ่างแก้ว',
    body: 'มีงานราชการใหม่เข้ามาในระบบ',
    url: '/',
    tag: 'angkaeo-notice',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'มีงานราชการใหม่เข้ามาในระบบ',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'angkaeo-general',
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'เปิดดูงาน' },
      { action: 'dismiss', title: 'ปิด' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'อบต.อ่างแก้ว', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_NAVIGATE', url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
