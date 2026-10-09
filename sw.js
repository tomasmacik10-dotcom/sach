// Drzi stranku v telefone, aby fungovala aj bez signalu.
const CACHE = 'sachove-ulohy-1791580864';
const SUBORY = ['./', './index.html', './manifest.webmanifest',
                './manifest-cs.webmanifest', './manifest-en.webmanifest',
                './ikona-192.png', './ikona-512.png'];
// Motor ma VLASTNU cache pomenovanu podla obsahu svojich suborov (od 8.10.2026, Stockfish 19
// ma 1,8 MB): CACHE sa meni s kazdou generaciou a motor by sa inak stahoval po kazdom
// nasadeni odznova. Novy motor = nove meno, stara cache sa pri aktivacii zmaze.
const CACHE_MOTORA = 'sachove-motor-6b2fa89';
const MOTOR = ['./stockfish.js', './stockfish.wasm'];
const jeMotor = (url) => MOTOR.some((m) => url.endsWith(m.slice(1)));

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(SUBORY)),
    caches.open(CACHE_MOTORA).then((c) => Promise.all(MOTOR.map((u) =>
      c.match(u).then((z) => z || c.add(u))))),
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((mena) =>
    Promise.all(mena.filter((m) => m !== CACHE && m !== CACHE_MOTORA)
                    .map((m) => caches.delete(m)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // motor: najprv z pamate - jeho cache sa meni len s obsahom motora
  if (jeMotor(new URL(e.request.url).pathname)) {
    e.respondWith(caches.open(CACHE_MOTORA).then((c) => c.match(e.request).then((z) =>
      z || fetch(e.request).then((odpoved) => {
        c.put(e.request, odpoved.clone());
        return odpoved;
      }))));
    return;
  }
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
