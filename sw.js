const CACHE='combo-keno-shell-e3a93c130e94';
const SHELL=[
 './',
 './index.html',
 './manifest.webmanifest',
 './icon-192.png',
 './icon-512.png',
 './combo-presets-v1.json',
 './keno-payouts-v1.json',
 './combo-search-v1.js'
];

self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
 caches.keys()
  .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;

 const u=new URL(e.request.url);

 if(
  u.pathname.endsWith('/combo-history-v1.json') ||
  u.pathname.endsWith('/combo-status-v1.json')
 ){
  e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));
  return;
 }

 if(u.origin!==self.location.origin)return;

 e.respondWith(
  fetch(new Request(e.request,{cache:'no-store'}))
   .then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
   })
   .catch(()=>caches.match(e.request))
 );
});
