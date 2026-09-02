const CACHE='combo-keno-shell-4116-search-auto1';
const SEARCH_SCRIPT='./combo-search-v1.js?v=4116-search-auto1';
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

function autoUpdateBootstrap(){
 return `<script id="comboAutoUpdate4116">
 (()=>{if(window.__comboAutoUpdate4116)return;window.__comboAutoUpdate4116=true;
 const check=async()=>{try{
   if(!('serviceWorker' in navigator))return;
   const reg=await navigator.serviceWorker.getRegistration();
   if(reg)await reg.update();
 }catch(e){console.warn('COMBO update check',e)}};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(window.__comboReloading)return;
   window.__comboReloading=true;
   location.reload();
 });
 window.setInterval(check,30000);
 window.addEventListener('focus',check);
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 setTimeout(check,1200);
 })();
 </script>`;
}

async function injectAppExtensions(response){
 if(!response || !response.ok)return response;
 const type=response.headers.get('content-type')||'';
 if(!type.includes('text/html'))return response;

 let text=await response.text();

 // Подключаем поиск комб даже если index.html пока старый.
 if(!text.includes('combo-search-v1.js')){
   const tag=`<script src="${SEARCH_SCRIPT}"></script>`;
   text=text.includes('</body>')?text.replace('</body>',tag+'\n</body>'):text+tag;
 }

 // Автоматическая проверка новой сборки как в M5M:
 // updateViaCache:none + registration.update() + reload при controllerchange.
 if(!text.includes('comboAutoUpdate4116')){
   const boot=autoUpdateBootstrap();
   text=text.includes('</body>')?text.replace('</body>',boot+'\n</body>'):text+boot;
 }

 const headers=new Headers(response.headers);
 headers.delete('content-length');
 headers.set('cache-control','no-store, no-cache, must-revalidate');
 return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);

 // Живой архив и статус никогда не кэшируем.
 if(
  u.pathname.endsWith('/combo-history-v1.json') ||
  u.pathname.endsWith('/combo-status-v1.json')
 ){
  e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));
  return;
 }

 if(u.origin!==self.location.origin)return;

 const isHtml=e.request.mode==='navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
 if(isHtml){
   e.respondWith((async()=>{
     try{
       const r=await fetch(new Request(e.request,{cache:'no-store'}));
       const raw=r.clone();
       caches.open(CACHE).then(c=>c.put(e.request,raw)).catch(()=>{});
       return await injectAppExtensions(r);
     }catch(err){
       const cached=await caches.match(e.request) || await caches.match('./index.html');
       return cached ? injectAppExtensions(cached) : Response.error();
     }
   })());
   return;
 }

 // Статика: сначала сеть, cache только как offline fallback.
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
