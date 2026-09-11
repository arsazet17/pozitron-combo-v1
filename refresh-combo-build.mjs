'use strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const INDEX='index.html',MANIFEST='manifest.webmanifest',SW='sw.js';
const ASSETS=['combo-search-v1.js','xray-engine-v1.js','xray-ui-v1.js','xray-analog-columns-v1.js','xray-v1.css'];
// Live archives, runtime and status deliberately do not participate in APP BUILD.
const APP_SOURCES=[...ASSETS,'xray-structure-engine-v4.mjs','xray-runtime-core.mjs','xray-runtime-io.mjs','build-xray-runtime.mjs','refresh-combo-build.mjs'];
const appVersion=JSON.parse(await fs.readFile('app-version.json','utf8'));
const version=String(appVersion.version||'');
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid app version');
let html=await fs.readFile(INDEX,'utf8');
const manifest=JSON.parse(await fs.readFile(MANIFEST,'utf8'));
html=html.replace(/Версия v\d+\.\d+\.\d+/g,`Версия v${version}`);
function versionAssets(text,value){for(const file of [...ASSETS,'manifest.webmanifest']){const escaped=file.replace(/\./g,'\\.');text=text.replace(new RegExp('('+escaped+')(?:\\?v=[^"\\\'\\s<>]+)?(?=["\\\'])','g'),'$1?v='+value)}return text}
function normalizedHTML(text){return versionAssets(text,'BUILD').replace(/(<meta\s+name=["']app-build["']\s+content=["'])[^"']*(["'])/i,'$1BUILD$2').replace(/serviceWorker\.register\(['"]sw\.js(?:\?v=[^'"]*)?['"]/g,"serviceWorker.register('sw.js?v=BUILD'")}
const normalizedManifest={...manifest,start_url:'./?v=BUILD',scope:'./'};
const hash=crypto.createHash('sha256').update(normalizedHTML(html)).update(JSON.stringify(normalizedManifest)).update(version);
for(const file of APP_SOURCES)hash.update('\n'+file+'\n').update(await fs.readFile(file,'utf8'));
const build=hash.digest('hex').slice(0,12);
html=versionAssets(html,build);
if(!/<meta\s+name=["']app-build["']/i.test(html))throw new Error('Missing app-build meta');
html=html.replace(/(<meta\s+name=["']app-build["']\s+content=["'])[^"']*(["'])/i,'$1'+build+'$2');
if(!html.includes("updateViaCache:'none'"))throw new Error('Missing uncached Service Worker registration');
html=html.replace(/serviceWorker\.register\(['"]sw\.js(?:\?v=[^'"]*)?['"]/g,"serviceWorker.register('sw.js?v="+build+"'");
manifest.start_url='./?v='+build;manifest.scope='./';
const sw="'use strict';\nconst BUILD='__BUILD__';\nconst CACHE_PREFIX='combo-keno-shell-';\nconst CACHE=CACHE_PREFIX+BUILD;\nconst SHELL=['./','./index.html','./?v='+BUILD,'./manifest.webmanifest?v='+BUILD,'./icon-192.png','./icon-512.png','./combo-search-v1.js?v='+BUILD,'./xray-engine-v1.js?v='+BUILD,'./xray-ui-v1.js?v='+BUILD,'./xray-analog-columns-v1.js?v='+BUILD,'./xray-v1.css?v='+BUILD];\nconst SCOPE=new URL(self.registration.scope);\nconst SHELL_URLS=new Set(SHELL.map(path=>new URL(path,SCOPE).href));\nfunction liveData(url){return /\\/(?:combo-history-v1|combo-status-v1|combo-presets-v1|keno-payouts-v1|app-version)\\.json$/.test(url.pathname)||url.pathname.startsWith(new URL('./data/',SCOPE).pathname)||url.pathname.includes('/xray-ai-model/')}\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',event=>{\n if(event.request.method!=='GET')return;\n const url=new URL(event.request.url);\n if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;\n const network=()=>fetch(new Request(event.request,{cache:'no-store'}));\n if(liveData(url)){event.respondWith(network());return}\n if(event.request.mode==='navigate'){event.respondWith(network().catch(async()=>{const cache=await caches.open(CACHE),shell=await cache.match(new URL('./index.html',SCOPE).href);return shell||Response.error()}));return}\n if(SHELL_URLS.has(url.href)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||network()));return}\n // Unknown and old-build URLs are never populated into this build's cache.\n event.respondWith(network());\n});\n".replace('__BUILD__',build);
const files={[INDEX]:html,[MANIFEST]:JSON.stringify(manifest,null,2)+'\n',[SW]:sw,'app-version.json':JSON.stringify({...appVersion,build},null,2)+'\n'};
for(const [file,text] of Object.entries(files))if(await fs.readFile(file,'utf8')!==text)await fs.writeFile(file,text,'utf8');
console.log('APP BUILD PASS '+build+' · v'+version);
