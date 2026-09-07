'use strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const INDEX='index.html',MANIFEST='manifest.webmanifest',SW='sw.js';
const XRAY_FILES=['xray-engine-v1.js','xray-ui-v1.js','xray-analog-columns-v1.js','xray-v1.css'];
const version=String(JSON.parse(await fs.readFile('app-version.json','utf8')).version||'4.3.1');
let html=await fs.readFile(INDEX,'utf8'),manifestText=await fs.readFile(MANIFEST,'utf8');
html=html.replace(/Версия v\d+\.\d+\.\d+/g,`Версия v${version}`);
if(!html.includes('combo-search-v1.js'))html=html.replace('</body>',`<script src="combo-search-v1.js?v=${version}"></script>\n</body>`);
function ni(x){return x.replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,'<meta name="app-build" content="BUILD">')
.replace(/serviceWorker\.register\(['"]sw\.js(?:\?v=[^'"]*)?['"]/g,"serviceWorker.register('sw.js?v=BUILD'")
.replace(/combo-search-v1\.js\?v=[^"']+/g,'combo-search-v1.js?v=VERSION')
.replace(/xray-engine-v1\.js\?v=[^"']+/g,'xray-engine-v1.js?v=XRAY')
.replace(/xray-ui-v1\.js\?v=[^"']+/g,'xray-ui-v1.js?v=XRAY')
.replace(/xray-analog-columns-v1\.js\?v=[^"']+/g,'xray-analog-columns-v1.js?v=XRAY')
.replace(/xray-v1\.css\?v=[^"']+/g,'xray-v1.css?v=XRAY')}
function nm(x){try{const m=JSON.parse(x);m.start_url='./?v=BUILD';return JSON.stringify(m)}catch{return x}}
let xp='';for(const f of XRAY_FILES){try{xp+=await fs.readFile(f,'utf8')}catch{}}
const build=crypto.createHash('sha256').update(ni(html)).update(nm(manifestText)).update(version).update(xp).digest('hex').slice(0,12);
if(/<meta\s+name=["']app-build["']/i.test(html))html=html.replace(/<meta\s+name=["']app-build["']\s+content=["'][^"']*["']\s*\/?>/i,`<meta name="app-build" content="${build}">`);
else html=html.replace(/<meta name="theme-color"[^>]*>/i,m=>`${m}\n<meta name="app-build" content="${build}">`);
html=html.replace(/combo-search-v1\.js\?v=[^"']+/g,`combo-search-v1.js?v=${build}`)
.replace(/xray-engine-v1\.js\?v=[^"']+/g,`xray-engine-v1.js?v=${build}`)
.replace(/xray-ui-v1\.js\?v=[^"']+/g,`xray-ui-v1.js?v=${build}`)
.replace(/xray-analog-columns-v1\.js\?v=[^"']+/g,`xray-analog-columns-v1.js?v=${build}`)
.replace(/xray-v1\.css\?v=[^"']+/g,`xray-v1.css?v=${build}`);
if(!html.includes("updateViaCache:'none'"))throw new Error('Не найдена robust регистрация Service Worker');
html=html.replace(/serviceWorker\.register\('sw\.js\?v=[^']*'/g,`serviceWorker.register('sw.js?v=${build}'`);
await fs.writeFile(INDEX,html,'utf8');
const manifest=JSON.parse(manifestText);manifest.start_url=`./?v=${build}`;manifest.scope='./';await fs.writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n','utf8');
const sw=`const CACHE='combo-keno-shell-${build}';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./combo-presets-v1.json','./keno-payouts-v1.json','./combo-search-v1.js','./xray-engine-v1.js','./xray-ui-v1.js','./xray-analog-columns-v1.js','./xray-v1.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);
if(u.pathname.endsWith('/combo-history-v1.json')||u.pathname.endsWith('/combo-status-v1.json')||u.pathname.endsWith('/data/xray-runtime.json')||u.pathname.includes('/xray-ai-model/')){e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));return}
if(u.origin!==self.location.origin)return;e.respondWith(fetch(new Request(e.request,{cache:'no-store'})).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
`;
await fs.writeFile(SW,sw,'utf8');
console.log(`APP BUILD PASS ${build} · v${version} · XRAY SERVER LIVE enabled`);