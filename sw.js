/* sw.js — v15
   Self-contained shell: index.html carries its own CSS and JS, so only the
   shell, manifest and icons are precached. Navigation is network-first with a
   cached shell fallback; same-origin assets are cache-first; fonts and logos
   are stale-while-revalidate. */

const VERSION = 'v15';
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

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async url => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
      } catch { /* ignore individual failures */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('monzo-') && k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isRemoteAsset = url => {
  const host = new URL(url).hostname;
  return host === 'logo.clearbit.com'
      || host === 'fonts.googleapis.com'
      || host === 'fonts.gstatic.com'
      || host.endsWith('.gstatic.com');
};

async function navigationHandler(request){
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch {
    return (await cache.match(request))
        || (await cache.match('./index.html'))
        || (await cache.match('./'))
        || new Response('Offline', {
             status: 503, headers: { 'Content-Type': 'text/plain' }
           });
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit){
    fetch(request)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      })
      .catch(() => {});
    return hit;
  }
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await network) || new Response('', { status: 504 });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (request.mode === 'navigate'){
    event.respondWith(navigationHandler(request));
    return;
  }
  if (url.origin === location.origin){
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isRemoteAsset(request.url)) event.respondWith(staleWhileRevalidate(request));
});
