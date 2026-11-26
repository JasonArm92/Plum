const V='monzo-v4-4';
const SHELL=['./','./index.html','./manifest.webmanifest','./monzo-tile.svg','./monzo-mark.svg','./monzo-mark-white.svg','./monzo-maskable.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{
    if(res.ok&&new URL(e.request.url).origin===location.origin){const copy=res.clone();caches.open(V).then(c=>c.put(e.request,copy))}
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
