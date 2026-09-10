const CACHE='combo-keno-shell-951df9a069ef';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./combo-presets-v1.json','./keno-payouts-v1.json','./combo-search-v1.js','./xray-engine-v1.js','./xray-ui-v1.js','./xray-analog-columns-v1.js','./xray-v1.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);
if(u.pathname.endsWith('/combo-history-v1.json')||u.pathname.endsWith('/combo-status-v1.json')||u.pathname.endsWith('/data/xray-runtime.json')||u.pathname.includes('/xray-ai-model/')){e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));return}
if(u.origin!==self.location.origin)return;e.respondWith(fetch(new Request(e.request,{cache:'no-store'})).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
