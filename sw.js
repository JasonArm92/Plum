const C='plum-v21';
const SHELL=['./','index.html','manifest.json','icon.svg','icon-maskable.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  if(u.hostname.includes('financialmodelingprep'))return;
  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(hit=>{
      const net=fetch(e.request).then(r=>{caches.open(C).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit||caches.match('index.html'));
      return hit||net;
    }));
  }
});
self.addEventListener('periodicsync',e=>{
  if(e.tag==='plum-nudge')e.waitUntil(self.registration.showNotification('Plum',{body:'Prices have moved — check your portfolio.',icon:'icon.svg',badge:'icon.svg',tag:'nudge'}));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow('./'))});
