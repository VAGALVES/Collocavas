/* Service worker — o HTML vem SEMPRE da rede (reserva em cache após 4 s ou se estiver offline);
   ícones e demais arquivos: cache primeiro. Fontes: stale-while-revalidate. Ao mudar qualquer arquivo, incremente CACHE. */
const CACHE = 'colocacoes-v25';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const comTempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), ms))]);

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  const doc = r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  if (doc) {
    e.respondWith(
      comTempo(fetch(r), 4000)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html').then(hit => hit || fetch(r)))
    );
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res;
  })));
});
