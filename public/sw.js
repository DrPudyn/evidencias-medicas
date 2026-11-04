const CACHE = 'evidencias-offline-v1';
// Cache only the neutral offline page. Never retain accounts, API data or medical searches.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('evidencias-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname.includes('chatgpt')) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match('/offline.html')) || new Response('Sem conexão. Conecte-se à internet e tente novamente.', {headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});
