'use strict';

import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const INDEX='index.html';
const MANIFEST='manifest.webmanifest';
const SW='sw.js';
const XRAY_FILES=['xray-engine-v1.js','xray-ui-v1.js','xray-analog-columns-v1.js','xray-v1.css'];

const version=String(JSON.parse(await fs.readFile('app-version.json','utf8')).version||'4.3.0');
let html=await fs.readFile(INDEX,'utf8');
let manifestText=await fs.readFile(MANIFEST,'utf8');

html=html.replace(/Версия v\d+\.\d+\.\d+/g,`Версия v${version}`);
if(!html.includes('combo-search-v1.js'))html=html.replace('</body>',`<script src="combo-search-v1.js?v=${version}"></script>\n</body>`);

function normalizeIndex(x){return x
 .replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,'<meta name="app-build" content="BUILD">')
 .replace(/serviceWorker\.register\(['"]sw\.js(?:\?v=[^'"]*)?['"]/g,"serviceWorker.register('sw.js?v=BUILD'")
 .replace(/combo-search-v1\.js\?v=[^"']+/g,'combo-search-v1.js?v=VERSION')
 .replace(/xray-engine-v1\.js\?v=[^"']+/g,'xray-engine-v1.js?v=XRAY')
 .replace(/xray-ui-v1\.js\?v=[^"']+/g,'xray-ui-v1.js?v=XRAY')
 .replace(/xray-analog-columns-v1\.js\?v=[^"']+/g,'xray-analog-columns-v1.js?v=XRAY')
 .replace(/xray-v1\.css\?v=[^"']+/g,'xray-v1.css?v=XRAY');}
function normalizeManifest(x){try{const m=JSON.parse(x);m.start_url='./?v=BUILD';return JSON.stringify(m)}catch{return x}}
let xrayPayload='';for(const f of XRAY_FILES){try{xrayPayload+=await fs.readFile(f,'utf8')}catch{}}
const build=crypto.createHash('sha256').update(normalizeIndex(html)).update(normalizeManifest(manifestText)).update(version).update(xrayPayload).digest('hex').slice(0,12);

if(/<meta\s+name=["']app-build["']/i.test(html))html=html.replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,`<meta name="app-build" content="${build}">`);else html=html.replace(/<meta name="theme-color"[^>]*>/i,m=>`${m}\n<meta name="app-build" content="${build}">`);
html=html.replace(/combo-search-v1\.js\?v=[^"']+/g,`combo-search-v1.js?v=${build}`)
 .replace(/xray-engine-v1\.js\?v=[^"']+/g,`xray-engine-v1.js?v=${build}`)
 .replace(/xray-ui-v1\.js\?v=[^"']+/g,`xray-ui-v1.js?v=${build}`)
 .replace(/xray-analog-columns-v1\.js\?v=[^"']+/g,`xray-analog-columns-v1.js?v=${build}`)
 .replace(/xray-v1\.css\?v=[^"']+/g,`xray-v1.css?v=${build}`);

const simple=/if\('serviceWorker' in navigator\)navigator\.serviceWorker\.register\('sw\.js(?:\?v=[^']*)?'\)\.catch\(\(\)=>\{\}\);/;
const robust=`if('serviceWorker' in navigator){\n window.addEventListener('load',async()=>{\n  try{\n   const reg=await navigator.serviceWorker.register('sw.js?v=${build}',{updateViaCache:'none'});\n   await reg.update();\n  }catch(e){console.warn('SW update',e)}\n });\n}`;
if(simple.test(html))html=html.replace(simple,robust);else if(!html.includes("updateViaCache:'none'"))throw new Error('Не найдена регистрация Service Worker');else html=html.replace(/serviceWorker\.register\('sw\.js\?v=[^']*'/g,`serviceWorker.register('sw.js?v=${build}'`);

if(!html.includes('id="comboAutoUpdate"')){const auto=`<script id="comboAutoUpdate">\n(()=>{\n let reloading=false;\n const check=async()=>{try{if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update()}catch(e){console.warn('COMBO auto update',e)}};\n if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()});setInterval(check,600000);addEventListener('focus',check);addEventListener('pageshow',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});setTimeout(check,1500)}\n})();\n</script>`;html=html.replace('</body>',auto+'\n</body>')}
await fs.writeFile(INDEX,html,'utf8');

const manifest=JSON.parse(manifestText);manifest.start_url=`./?v=${build}`;manifest.scope='./';await fs.writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');
const sw=`const CACHE='combo-keno-shell-${build}';\nconst SHELL=[\n './',\n './index.html',\n './manifest.webmanifest',\n './icon-192.png',\n './icon-512.png',\n './combo-presets-v1.json',\n './keno-payouts-v1.json',\n './combo-search-v1.js',\n './xray-engine-v1.js',\n './xray-ui-v1.js',\n './xray-analog-columns-v1.js',\n './xray-v1.css'\n];\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{\n if(e.request.method!=='GET')return;const u=new URL(e.request.url);\n if(u.pathname.endsWith('/combo-history-v1.json')||u.pathname.endsWith('/combo-status-v1.json')||u.pathname.includes('/xray-ai-model/')){e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));return}\n if(u.origin!==self.location.origin)return;\n e.respondWith(fetch(new Request(e.request,{cache:'no-store'})).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request)));\n});\n`;
await fs.writeFile(SW,sw,'utf8');
console.log(`APP BUILD PASS ${build} · v${version} · XRAY-AI 5→1 enabled · auto-update enabled`);
