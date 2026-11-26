/* Monzo PWA service worker — v7 */
const VERSION = 'v8';
const CACHE = 'monzo-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './monzo-mark.svg',
  './monzo-mark-white.svg',
  './monzo-tile.svg',
  './monzo-maskable.svg'
];

/* ---------- install ---------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* add individually so one 404 doesn't abort the whole install */
    await Promise.all(PRECACHE.map(async url => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
      } catch (e) { /* ignore */ }
    }));
    await self.skipWaiting();
  })());
});

/* ---------- activate ---------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('monzo-') && k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ---------- messaging ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ---------- strategies ---------- */
const isAsset = url =>
  /\.(?:css|js|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|json|webmanifest)$/i.test(new URL(url).pathname);

const isImageHost = url => {
  const h = new URL(url).hostname;
  return h === 'logo.clearbit.com' || h.endsWith('google.com') || h.endsWith('gstatic.com');
};

/* network first, fall back to cache then to the shell */
async function navigationHandler(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match(request)) ||
           (await cache.match('./index.html')) ||
           (await cache.match('./')) ||
           new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

/* cache first, refresh in the background */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) {
    fetch(request).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    }).catch(() => {});
    return hit;
  }
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

/* stale while revalidate for third-party logos */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const network = fetch(request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await network) || new Response('', { status: 504 });
}

/* ---------- fetch ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* app shell */
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  /* same-origin assets */
  if (url.origin === location.origin) {
    if (isAsset(request.url) || url.pathname.endsWith('/')) {
      event.respondWith(cacheFirst(request));
      return;
    }
    event.respondWith(cacheFirst(request));
    return;
  }

  /* third-party logos and fonts */
  if (isImageHost(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/* ---------- background sync hook ---------- */
self.addEventListener('sync', event => {
  if (event.tag === 'monzo-sync') {
    event.waitUntil(Promise.resolve());
  }
});
