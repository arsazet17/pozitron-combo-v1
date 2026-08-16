const CACHE='combo-keno-shell-v4';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./combo-presets-v1.json','./keno-payouts-v1.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.endsWith('combo-history-v1.json')||u.pathname.endsWith('combo-status-v1.json')||u.pathname.endsWith('keno-payouts-v1.json')){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));return}e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
