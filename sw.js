const CACHE = 'monzo-v49';

const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'styles.css?v=45',
  'boot.js?v=45',
  'main.js?v=45',
  'core.js?v=45',
  'data.js?v=45',
  'ui.js?v=45',
  'verify.js?v=45',
  'statement.js?v=45',
  'tests.js?v=45',
  'screens-a.js?v=45',
  'screens-b.js?v=45',
  'screens-c.js?v=45',
  'screens-d.js?v=45',
  'screens-e.js?v=45',
  'screens-f.js?v=45'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  if (!sameOrigin) return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req)
          .then(res => {
            if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
          })
          .catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
