const CACHE_NAME = 'noirplan-v14';
const PRECACHE = [
  '/noirplan/styles.css',
  '/noirplan/app.js',
  '/noirplan/pwa-install.js',
  '/noirplan/manifest.json',
  '/noirplan/icons/icon-192.png',
  '/noirplan/icons/icon-512.png'
];

// Install: cache static assets only (no HTML)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(PRECACHE); } catch (e) { /* ignore */ }
    self.skipWaiting();
  })());
});

// Activate: clean old caches + enable navigation preload
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

// Runtime fetch:
// - For navigations (HTML): let the network/CDN handle it (fast, no caching here).
// - For same-origin GET assets: stale-while-revalidate.
// - Skip cross-origin and non-GET.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    // Let the browser go to network (navigationPreload may help)
    return; // no respondWith => default network fetch (fast)
  }

  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return; // don’t touch
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      // Only cache OK, basic responses
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => cached || Response.error());

    // Stale-while-revalidate
    return cached || fetchPromise;
  })());
});
