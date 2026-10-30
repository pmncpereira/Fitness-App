/* Diário de Treino: cache para uso offline. */
var CACHE = 'diario-treino-v1';
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Big+Shoulders+Display:wght@700;800&display=swap';
var HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var c = await caches.open(CACHE);
    await c.addAll(['./index.html', './icon.png']);
    try {
      var r = await fetch(FONT_CSS);
      var css = await r.clone().text();
      await c.put(FONT_CSS, r);
      var urls = Array.from(css.matchAll(/url\((https:[^)]+)\)/g)).map(function (m) { return m[1]; });
      await Promise.all(urls.map(function (u) { return c.add(u).catch(function () {}); }));
    } catch (err) { /* fontes de reserva do sistema */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  if (!same && HOSTS.indexOf(url.hostname) < 0) return;
  e.respondWith((async function () {
    var c = await caches.open(CACHE);
    var key = req.mode === 'navigate' ? './index.html' : req;
    var hit = await c.match(key, { ignoreSearch: true });
    var net = fetch(req).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) c.put(key, r.clone());
      return r;
    }).catch(function () { return null; });
    if (hit) { e.waitUntil(net); return hit; }
    var r2 = await net;
    return r2 || new Response('Sem ligação', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
