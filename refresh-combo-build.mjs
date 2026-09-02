'use strict';

import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const INDEX='index.html';
const MANIFEST='manifest.webmanifest';
const SW='sw.js';

const version=String(
  JSON.parse(await fs.readFile('app-version.json','utf8')).version || '4.1.16'
);

let html=await fs.readFile(INDEX,'utf8');
let manifestText=await fs.readFile(MANIFEST,'utf8');

html=html.replace(/Версия v4\.1\.\d+/g,`Версия v${version}`);

if(!html.includes('combo-search-v1.js')){
  html=html.replace('</body>',`<script src="combo-search-v1.js?v=${version}"></script>\n</body>`);
}

function normalizedIndex(x){
  return x
    .replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,'<meta name="app-build" content="BUILD">')
    .replace(/serviceWorker\.register\(['"]sw\.js(?:\?v=[^'"]*)?['"]/g,"serviceWorker.register('sw.js?v=BUILD'")
    .replace(/combo-search-v1\.js\?v=[^"']+/g,'combo-search-v1.js?v=VERSION');
}

function normalizedManifest(x){
  try{
    const m=JSON.parse(x);
    m.start_url='./?v=BUILD';
    return JSON.stringify(m);
  }catch{
    return x;
  }
}

const build=crypto.createHash('sha256')
  .update(normalizedIndex(html))
  .update(normalizedManifest(manifestText))
  .update(version)
  .digest('hex')
  .slice(0,12);

if(/<meta\s+name=["']app-build["']/i.test(html)){
  html=html.replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,`<meta name="app-build" content="${build}">`);
}else{
  html=html.replace(/<meta name="theme-color"[^>]*>/i,m=>`${m}\n<meta name="app-build" content="${build}">`);
}

html=html.replace(/combo-search-v1\.js\?v=[^"']+/g,`combo-search-v1.js?v=${build}`);

const simple=/if\('serviceWorker' in navigator\)navigator\.serviceWorker\.register\('sw\.js(?:\?v=[^']*)?'\)\.catch\(\(\)=>\{\}\);/;
const robust=`if('serviceWorker' in navigator){
 window.addEventListener('load',async()=>{
  try{
   const reg=await navigator.serviceWorker.register('sw.js?v=${build}',{updateViaCache:'none'});
   await reg.update();
  }catch(e){console.warn('SW update',e)}
 });
}`;

if(simple.test(html)){
  html=html.replace(simple,robust);
}else if(!html.includes("updateViaCache:'none'")){
  throw new Error('Не найдена регистрация Service Worker');
}else{
  html=html.replace(/serviceWorker\.register\('sw\.js\?v=[^']*'/g,`serviceWorker.register('sw.js?v=${build}'`);
}

if(!html.includes('id="comboAutoUpdate"')){
  const auto=`<script id="comboAutoUpdate">
(()=>{
 let reloading=false;
 const check=async()=>{
  try{
   if(!('serviceWorker' in navigator))return;
   const reg=await navigator.serviceWorker.getRegistration();
   if(reg)await reg.update();
  }catch(e){console.warn('COMBO auto update',e)}
 };
 if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(reloading)return;
   reloading=true;
   location.reload();
  });
  setInterval(check,600000);
  addEventListener('focus',check);
  addEventListener('pageshow',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  setTimeout(check,1500);
 }
})();
</script>`;
  html=html.replace('</body>',auto+'\n</body>');
}

await fs.writeFile(INDEX,html,'utf8');

const manifest=JSON.parse(manifestText);
manifest.start_url=`./?v=${build}`;
manifest.scope='./';
await fs.writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');

const sw=`const CACHE='combo-keno-shell-${build}';
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
`;

await fs.writeFile(SW,sw,'utf8');
console.log(`APP BUILD PASS ${build} · v${version} · combo-search enabled · auto-update enabled`);
