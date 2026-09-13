'use strict';
const BUILD='6e10917c6177';
const CACHE_PREFIX='combo-keno-shell-';
const CACHE=CACHE_PREFIX+BUILD;
const SHELL=['./','./index.html','./?v='+BUILD,'./manifest.webmanifest?v='+BUILD,'./icon-192.png','./icon-512.png','./combo-search-v1.js?v='+BUILD,'./xray-engine-v1.js?v='+BUILD,'./xray-ui-v1.js?v='+BUILD,'./xray-analog-columns-v1.js?v='+BUILD,'./xray-v1.css?v='+BUILD];
const SCOPE=new URL(self.registration.scope);
const SHELL_URLS=new Set(SHELL.map(path=>new URL(path,SCOPE).href));
function liveData(url){return /\/(?:combo-history-v1|combo-search-log-v1|combo-status-v1|combo-presets-v1|keno-payouts-v1|app-version)\.json$/.test(url.pathname)||url.pathname.startsWith(new URL('./data/',SCOPE).pathname)||url.pathname.includes('/xray-ai-model/')}
async function migrateClients(){if(!self.clients||typeof self.clients.matchAll!=='function')return;const target=new URL('./',SCOPE);target.searchParams.set('v',BUILD);target.searchParams.set('_sw_migrate',String(Date.now()));const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});await Promise.all(clients.map(client=>client.navigate?client.navigate(target.href).catch(()=>null):null))}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(new URL(path,SCOPE),{cache:'no-store'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(()=>migrateClients())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const network=()=>fetch(new Request(event.request,{cache:'no-store'}));
 if(liveData(url)){event.respondWith(network());return}
 if(event.request.mode==='navigate'){event.respondWith(network().catch(async()=>{const cache=await caches.open(CACHE),shell=await cache.match(new URL('./index.html',SCOPE).href);return shell||Response.error()}));return}
 if(SHELL_URLS.has(url.href)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||network()));return}
 event.respondWith(network());
});
