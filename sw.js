const CACHE_NAME = 'noirplan-v1-readd';
const ASSETS = [
  '/noirplan/',
  '/noirplan/index.html',
  '/noirplan/styles.css',
  '/noirplan/app.js',
  '/noirplan/manifest.json',
  '/noirplan/icons/icon-192.png',
  '/noirplan/icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    try { await c.addAll(ASSETS); } catch(_) {}
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    try {
      const net = await fetch(e.request);
      caches.open(CACHE_NAME).then(c => c.put(e.request, net.clone())).catch(()=>{});
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});
