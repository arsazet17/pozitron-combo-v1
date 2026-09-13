'use strict';
const BUILD='c72a8a49810f';
const CACHE_PREFIX='combo-keno-shell-';
const CACHE=CACHE_PREFIX+BUILD;
const SHELL=['./','./index.html','./?v='+BUILD,'./manifest.webmanifest?v='+BUILD,'./icon-192.png','./icon-512.png','./combo-search-v1.js?v='+BUILD,'./xray-engine-v1.js?v='+BUILD,'./xray-ui-v1.js?v='+BUILD,'./xray-analog-columns-v1.js?v='+BUILD,'./xray-v1.css?v='+BUILD];
const SCOPE=new URL(self.registration.scope);
const SHELL_URLS=new Set(SHELL.map(path=>new URL(path,SCOPE).href));
function liveData(url){return /\/(?:combo-history-v1|combo-search-log-v1|combo-status-v1|combo-presets-v1|keno-payouts-v1|app-version)\.json$/.test(url.pathname)||url.pathname.startsWith(new URL('./data/',SCOPE).pathname)||url.pathname.includes('/xray-ai-model/')}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(new URL(path,SCOPE),{cache:'no-store'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
 // v4.3.1 has no app-version checker. Move its installed start_url after takeover.
 const windows=await self.clients.matchAll({type:'window'});
 await Promise.all(windows.map(async client=>{
  const url=new URL(client.url);
  if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
  const previous=url.searchParams.get('v');
  if(!previous||previous===BUILD)return;
  // New pages own their one-shot reload; only migrate clients without the checker.
  const managed=await new Promise(resolve=>{
   const channel=new MessageChannel();
   const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value)};
   const timer=setTimeout(()=>finish(false),500);
   channel.port1.onmessage=event=>finish(event.data?.managed===true);
   client.postMessage({type:'COMBO_UPDATE_CLIENT'},[channel.port2]);
  });
  if(managed)return;
  url.searchParams.set('v',BUILD);url.searchParams.delete('_v');
  try{await client.navigate(url.href)}catch{}
 }));
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting())});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const network=()=>fetch(new Request(event.request,{cache:'no-store'}));
 if(liveData(url)||event.request.cache==='no-store'){event.respondWith(network());return}
 if(event.request.mode==='navigate'){event.respondWith(network().catch(async()=>{const cache=await caches.open(CACHE),shell=await cache.match(new URL('./index.html',SCOPE).href);return shell||Response.error()}));return}
 if(SHELL_URLS.has(url.href)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||network()));return}
 // Unknown and old-build URLs are never populated into this build's cache.
 event.respondWith(network());
});
