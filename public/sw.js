// Service Worker for Proyecto Taxi PWA
const CACHE_NAME = 'proyecto-taxi-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only intercept same-origin requests (let external CDNs, tiles and Firebase pass natively)
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js Server Actions, RSC payloads, internal routing or API requests
  if (
    event.request.headers.has('next-action') ||
    event.request.headers.has('rsc') ||
    event.request.headers.has('next-router-state-tree') ||
    event.request.headers.has('next-router-prefetch') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/_next/data/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for static assets and pages
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.destination === 'image' ||
            event.request.destination === 'style' ||
            event.request.destination === 'script' ||
            event.request.destination === 'font' ||
            event.request.mode === 'navigate')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Sin conexión de red temporal en carretera', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
