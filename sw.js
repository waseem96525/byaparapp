// Service Worker for Offline Support
// NOTE: Bump CACHE_NAME whenever assets change to avoid stale JS being served.
const CACHE_NAME = 'bizbiller-v2';
const urlsToCache = [
  './index.html',
  './styles.css',
  './js/db.js',
  './js/auth.js',
  './js/utils.js',
  './js/router.js',
  './js/components.js',
  './js/parties.js',
  './js/items.js',
  './js/billing.js',
  './js/reports.js',
  './js/accounting.js',
  './js/settings.js',
  './js/print.js',
  './js/app.js',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // cache.addAll() fails the entire install if any single request fails.
    // Use per-URL caching so missing/redirecting assets don't break installation.
    await Promise.allSettled(
      urlsToCache.map(async (url) => {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) {
          // Keep SW install healthy even if one file isn't available.
          console.warn('[SW] Precache failed:', url, err);
        }
      })
    );

    await self.skipWaiting();
  })());
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', event => {
  // For navigation requests, prefer network to pick up latest HTML/JS quickly.
  const isNavigation = event.request.mode === 'navigate';
  const url = new URL(event.request.url);
  const isScriptOrStyle = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
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
