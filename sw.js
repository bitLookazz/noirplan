// Zero-cache PWA SW: keeps installability, never caches, always updates immediately
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
// No 'fetch' handler => browser uses network/CDN directly (no SW caching at all)

// Allow page to tell us to activate instantly if needed
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
