// Drzi stranku v telefone, aby fungovala aj bez signalu.
const CACHE = 'sachove-ulohy-1788121983';
const SUBORY = ['./', './index.html', './manifest.webmanifest',
                './ikona-192.png', './ikona-512.png',
                './stockfish.js', './stockfish.wasm'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SUBORY)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((mena) =>
    Promise.all(mena.filter((m) => m !== CACHE).map((m) => caches.delete(m)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // najprv skusime siet, aby si dostal novsiu verziu; ked nie je, ideme z pamate
  e.respondWith(
    fetch(e.request)
      .then((odpoved) => {
        const kopia = odpoved.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopia));
        return odpoved;
      })
      .catch(() => caches.match(e.request).then((z) => z || caches.match('./index.html')))
  );
});
