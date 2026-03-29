/* Simple app-shell service worker for a static PWA */
const CACHE_NAME = 'damascus-tracker-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isNavigate(request) {
  return request.mode === 'navigate' || (request.destination === '' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // SPA/app-shell navigation: network-first, fallback to cached index.html
  if (sameOrigin && isNavigate(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone());
          return response;
        } catch {
          return (await caches.match('./index.html')) || (await caches.match('./'));
        }
      })()
    );
    return;
  }

  // Static assets: cache-first, then update cache from network.
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      })()
    );
  }
});
