
const CACHE_NAME = 'ke-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/ke-192.png',
  './icons/ke-512.png',
  './icons/ke-512-maskable.png',
  './icons/favicon-32.png',
  './icons/ke-master.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Do NOT cache NLLB API or HF inference
  if (url.hostname.includes('hf.space') || url.hostname.includes('huggingface.co') || url.pathname.includes('/api/v4/translator')) {
    return; // network only
  }
  // Shell assets: cache-first
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          // cache shell only
          if (SHELL_ASSETS.some(a => event.request.url.includes(a.replace('./','')))) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c=>c.put(event.request, clone));
          }
          return resp;
        }).catch(() => {
          // offline fallback: if index requested, return cached index
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
