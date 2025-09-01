const CACHE_NAME = "noirplan-v4"
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await c.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(net => {
      caches.open(CACHE_NAME).then(c => c.put(req, net.clone())).catch(()=>{});
      return net;
    }).catch(() => cached || Response.error());
    return cached || fetchPromise;
  })());
});

// allow page to ask SW to skip waiting (optional)
self.addEventListener('message', (e)=>{
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
