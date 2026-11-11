// Drzi stranku v telefone, aby fungovala aj bez signalu.
const CACHE = 'sachove-ulohy-1794431112';
const SUBORY = ['./', './index.html', './manifest.webmanifest',
                './ikona-192.png', './ikona-512.png'];
// Motor ma VLASTNU cache pomenovanu podla obsahu svojich suborov (od 8.10.2026, Stockfish 19
// ma 1,8 MB): CACHE sa meni s kazdou generaciou a motor by sa inak stahoval po kazdom
// nasadeni odznova. Novy motor = nove meno, stara cache sa pri aktivacii zmaze.
const CACHE_MOTORA = 'sachove-motor-6b2fa89';
const MOTOR = ['./stockfish.js', './stockfish.wasm'];
const jeMotor = (url) => MOTOR.some((m) => url.endsWith(m.slice(1)));
// Ulohy po pasmach (ulohy-1400.json, 8.11.2026) si uklada STRANKA do vlastnej pamate
// (viď stahovanie uloh v index.html) - service worker ich necha tak. Keby ich ukladal do
// CACHE, mal by telefon po kazdom nasadeni dalsiu kopiu ~50 MB. Pri aktivacii sa ich pamat
// nemaze.
const CACHE_ULOH = 'sachove-ulohy-pasma';
const jeUloha = (url) => /\/ulohy-\d{4}\.json$/.test(url);

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
    Promise.all(mena.filter((m) => m !== CACHE && m !== CACHE_MOTORA && m !== CACHE_ULOH)
                    .map((m) => caches.delete(m)))));
  self.clients.claim();
});

// Do pamate ide LEN uspesna odpoved (17.10.2026). Kym sa ukladalo cokolvek, ulozila sa aj
// 404 z GitHubu, ked sa stranka otvorila pred dokoncenim nasadenia - a motor ide "najprv
// z pamate", takze by ju podaval natrvalo (testovaci build v /test/ hlasil "Stockfish
// neodpovedal.", appka fungovala). Pri ostatnych suboroch by 404 prepisala dobru kopiu.
const ulozit = (odpoved) => odpoved.ok && odpoved.status !== 206;

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (jeUloha(new URL(e.request.url).pathname)) return;     // ulohy si uklada stranka
  // motor: najprv z pamate - jeho cache sa meni len s obsahom motora
  if (jeMotor(new URL(e.request.url).pathname)) {
    e.respondWith(caches.open(CACHE_MOTORA).then((c) => c.match(e.request).then((z) =>
      z || fetch(e.request).then((odpoved) => {
        if (ulozit(odpoved)) c.put(e.request, odpoved.clone());
        return odpoved;
      }))));
    return;
  }
  // najprv skusime siet, aby si dostal novsiu verziu; ked nie je, ideme z pamate
  e.respondWith(
    fetch(e.request)
      .then((odpoved) => {
        if (ulozit(odpoved)) {
          const kopia = odpoved.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopia));
        }
        return odpoved;
      })
      .catch(() => caches.match(e.request).then((z) => z || caches.match('./index.html')))
  );
});
