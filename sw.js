/* Service Worker — How a Wind Turbine Works 101 (Wind Explorer theme) */
const CACHE_NAME = 'wind101-cache-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Tell every open window the app shell is fully cached (safe to go offline)
function notifyReady() {
  return self.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => clients.forEach((c) => c.postMessage({ type: 'CACHE_READY' })));
}

// Install — pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches, take control, then announce readiness
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() => notifyReady())
  );
});

// Let a reloaded page ask "am I cached?" — reply if the shell cache exists
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_CACHE') {
    caches.has(CACHE_NAME).then((has) => {
      if (has && event.source) event.source.postMessage({ type: 'CACHE_READY' });
    });
  }
});

// Fetch — cache-first, fall back to network (and cache new GETs)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
