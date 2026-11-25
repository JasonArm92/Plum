const CACHE = 'plum-v18-3';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'logos.js', 'manifest.json', 'icon-purple.svg', 'icon-white.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // network-first for anything that can change, so a commit always shows up
  const fresh = e.request.mode === 'navigate' ||
    url.origin === location.origin && /\.(html|css|js|json)$/.test(url.pathname) ||
    url.pathname === '/' || url.pathname.endsWith('/');

  if (fresh) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  // cache-first for images and fonts
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
