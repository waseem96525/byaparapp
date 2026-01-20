// Service Worker for Offline Support
// NOTE: Bump CACHE_NAME whenever assets change to avoid stale JS being served.
const CACHE_NAME = 'bizbiller-v3';

// Install Service Worker
self.addEventListener('install', event => {
  // Avoid install-time precache (it is brittle across hosts and can spam errors).
  // We do runtime caching on successful fetches instead.
  event.waitUntil(self.skipWaiting());
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', event => {
  // For navigation requests, prefer network to pick up latest HTML/JS quickly.
  const isNavigation = event.request.mode === 'navigate';
  const url = new URL(event.request.url);
  const isScriptOrStyle = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', responseClone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('./index.html');
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><h2>Offline</h2><p>Please reconnect and reload.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // For JS/CSS, prefer network first so updates are picked up immediately.
  if (isScriptOrStyle) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Update cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
