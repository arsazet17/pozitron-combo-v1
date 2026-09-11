'use strict';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const read=file=>fs.readFile(file,'utf8');
const ui=await read('xray-ui-v1.js'),index=await read('index.html'),sw=await read('sw.js'),buildScript=await read('refresh-combo-build.mjs');
const manifest=JSON.parse(await read('manifest.webmanifest')),version=JSON.parse(await read('app-version.json'));
const sources=[...buildScript.matchAll(/'([^']+\.(?:js|mjs|css))'/g)].map(x=>x[1]);
const names=[...new Set(['index.html','manifest.webmanifest','sw.js','app-version.json',...sources.filter(x=>x!=='sw.js')])];
const disk=Object.fromEntries(await Promise.all(names.map(async name=>[name,await read(name)])));
const tests=[];
async function check(name,fn){await fn();tests.push(name);console.log('PASS '+name)}
const n20=Array.from({length:20},(_,i)=>i+1);
const forecast={sourceDraw:10,targetDraw:11,createdAt:'2026-01-01T00:00:00Z',engineVersion:'test',forecastFingerprint:'abc',predicted20:[...n20.slice(1),21],current20:n20,combo5A:n20.slice(0,5),combo5B:n20.slice(5,10),combo7A:n20.slice(0,7),combo7B:n20.slice(7,14),structure:{},movementEdges:[...Array.from({length:12},()=>({from:2,to:21,type:'ASC'})),{from:1,to:21,type:'ASC'},{from:1,to:2,type:'ASC'},{from:2,to:2,type:'ASC'}]};
const entry={...forecast,sourceDraw:9,targetDraw:10,factDraw:10,factBalls:n20,forecast20Hits:[1,2],combo5AHits:[1],combo5BHits:[],combo7AHits:[],combo7BHits:[],combo5Payout:40,combo5BPayout:0,combo7Payout:0,combo7BPayout:0,lateForecast:true,replacedForecast:true,statisticsEligible:false};
let fixture={status:'live',generation:'a',forecast,history:[entry],latestOfficial:{draw:10,balls:n20}};
let offline=false,width=0;const raf=[],events={},attrs={},children=[],observers={};
const nodes={xrayRoot:{innerHTML:'',addEventListener(type,fn){events['root:'+type]=fn}},xray:{},xrayOverlay:{replaceChildren(){children.length=0},removeAttribute(k){delete attrs[k]},setAttribute(k,v){attrs[k]=v},appendChild(x){children.push(x)}},xrayStage:{getBoundingClientRect(){return {left:0,top:0,width,height:width}},getClientRects(){return width?[{}]:[]},querySelector(selector){return {getBoundingClientRect(){const n=Number(selector.match(/\d+/)[0]);return {left:n*10,top:20,width:10,height:10}}}}}};
const documentMock={hidden:false,getElementById(id){return nodes[id]},querySelectorAll(){return []},querySelector(){return nodes.xrayRoot.innerHTML.includes('xrayLiveCard')?{}:null},addEventListener(type,fn){events['document:'+type]=fn},createElementNS(){return {attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v},appendChild(c){this.children.push(c)}}}};
const windowMock={addEventListener(type,fn){events[type]=fn}};
const env={window:windowMock,document:documentMock,fetch:async url=>{if(offline)throw new Error('offline');return {ok:true,json:async()=>String(url).startsWith('keno-')?{combination:{}}:structuredClone(fixture)}},requestAnimationFrame:fn=>{raf.push(fn);return raf.length},setInterval(){},ResizeObserver:class{constructor(fn){observers.resize=fn}observe(){}disconnect(){}},MutationObserver:class{constructor(fn){observers.visibility=fn}observe(){}disconnect(){}},console:{warn(){},error(){}}};
new Function(...Object.keys(env),ui)(...Object.values(env));
await windowMock.ComboXrayUI.refresh();
function drawFrames(){while(raf.length)raf.shift()()}
await check('UI public API and distinct fact / frozen / settled labels',()=>{
 assert.equal(typeof windowMock.ComboXrayUI.notifyDataUpdated,'function');
 assert.equal(typeof windowMock.ComboXrayUI.renderOverlay,'function');
 assert(!('notifyXrayDataUpdated' in windowMock));assert(!index.includes('notifyXrayDataUpdated'));
 assert(index.includes('x.notifyDataUpdated()'));
 assert(nodes.xrayRoot.innerHTML.includes('ФАКТ ТЕКУЩЕГО ТИРАЖА'));
 assert(nodes.xrayRoot.innerHTML.includes('FROZEN-прогноз'));
 assert(nodes.xrayRoot.innerHTML.includes('Проверка frozen-прогноза на №10'));
 assert(nodes.xrayRoot.innerHTML.includes('Повтор из факта источника'));
 assert(!nodes.xrayRoot.innerHTML.includes('>Совпало<'));
});
await check('UI saved legacy branch payouts and total; late/replaced excluded',()=>{
 assert(nodes.xrayRoot.innerHTML.includes('Итого выигрыш: 40 ₽'));
 assert(nodes.xrayRoot.innerHTML.includes('>0 ₽</strong>'));
 assert(nodes.xrayRoot.innerHTML.includes('создан после времени тиража'));
 assert(nodes.xrayRoot.innerHTML.includes('прогноз заменялся'));
 assert(nodes.xrayRoot.innerHTML.includes('Исключён из честной статистики'));
});
await check('UI hidden overlay waits for dimensions and redraws after activation',()=>{
 drawFrames();assert.equal(children.length,0);assert.equal(attrs.viewBox,undefined);
 width=200;observers.visibility();drawFrames();assert.equal(attrs.viewBox,'0 0 200 200');
 assert.equal(children.length,2);assert.equal(children[1].attrs['marker-end'],'url(#xrayArrow-asc)');
 width=300;observers.resize();events.resize();events.orientationchange();events['root:toggle']();drawFrames();assert.equal(attrs.viewBox,'0 0 300 300');
});
await check('UI arrows and movement list exclude retained numbers before the display limit',()=>{
 const lines=children.filter(x=>x.attrs.class?.startsWith('xrayArrowLine'));
 assert.equal(lines.length,1);
 assert.equal(lines[0].attrs.x1,15);assert.equal(lines[0].attrs.x2,215);
 assert(nodes.xrayRoot.innerHTML.includes('01→21 · ASC'));
 assert(!nodes.xrayRoot.innerHTML.includes('02→21 · ASC'));
 assert(!nodes.xrayRoot.innerHTML.includes('01→02 · ASC'));
 assert(!nodes.xrayRoot.innerHTML.includes('02→02 · ASC'));
});
await check('UI shows stopped runtime and retains last good data offline',async()=>{
 fixture={...fixture,status:'error',anomaly:{code:'MISSING_TARGET_FACT',targetDraw:11,latestDraw:12}};
 await windowMock.ComboXrayUI.refresh();assert(nodes.xrayRoot.innerHTML.includes('MISSING_TARGET_FACT'));assert(nodes.xrayRoot.innerHTML.includes('Frozen-прогноз сохранён'));
 offline=true;await windowMock.ComboXrayUI.refresh();assert(nodes.xrayRoot.innerHTML.includes('Показаны последние успешно загруженные данные'));assert(nodes.xrayRoot.innerHTML.includes('FROZEN-прогноз'));
});
const build=version.build;
await check('PWA build ID, shell queries and manifest are consistent',()=>{
 assert.match(build,/^[a-f0-9]{12}$/);assert(index.includes('name="app-build" content="'+build+'"'));
 assert(index.includes("sw.js?v="+build+"'"));assert.equal(manifest.start_url,'./?v='+build);assert.equal(manifest.scope,'./');
 assert(sw.includes("const BUILD='"+build+"'"));
 const assets=[...index.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(x=>x[1]);
 assert(assets.every(x=>x.endsWith('?v='+build)));
});
const handlers={},deleted=[],networkCalls=[];let networkOffline=true,cachedShell=new Response('offline-shell'),cachedAsset=new Response('offline-js'),added=[];
const cacheMock={async addAll(list){added=list},async match(req){const url=typeof req==='string'?req:req.url;return url.endsWith('/index.html')?cachedShell:url.includes('xray-ui-v1.js?v='+build)?cachedAsset:undefined}};
const scope='https://example.test/combo/',selfMock={registration:{scope},skipWaiting:async()=>{},clients:{claim:async()=>{}},addEventListener(type,fn){handlers[type]=fn}};
const cacheStorage={open:async()=>cacheMock,keys:async()=>['other-app-cache','combo-keno-shell-old','combo-keno-shell-'+build],delete:async key=>{deleted.push(key);return true}};
new Function('self','caches','fetch','URL','Request','Response',sw)(selfMock,cacheStorage,async req=>{networkCalls.push(req);if(networkOffline)throw new Error('offline');return new Response('live')},URL,Request,Response);
async function eventDone(name){let promise;handlers[name]({waitUntil(p){promise=p}});await promise}
async function request(url,mode){let handled=false,promise;const req=new Request(url);handlers.fetch({request:mode?{url:req.url,method:'GET',mode}:req,respondWith(p){handled=true;promise=p}});return {handled,response:handled?await promise:null}}
await check('PWA install caches actual versioned requests; activate retains foreign cache',async()=>{
 await eventDone('install');assert(added.includes('./xray-ui-v1.js?v='+build));assert(!added.some(x=>/history|runtime|payout|presets|status/.test(x)));
 await eventDone('activate');assert.deepEqual(deleted,['combo-keno-shell-old']);
 const asset=await request(scope+'xray-ui-v1.js?v='+build);assert.equal(await asset.response.text(),'offline-js');
});
await check('PWA offline navigation uses shell, data always uses network no-store',async()=>{
 // Browser navigation Request.mode is read-only; a Request shim below models the request clone.
 let promise;const nav={url:scope+'?_v=123',method:'GET',mode:'navigate'};
 const NativeRequest=Request;
 class RequestShim{constructor(request,options){this.url=request.url;this.method=request.method;this.cache=options?.cache}}
 new Function('self','caches','fetch','URL','Request','Response',sw)(selfMock,cacheStorage,async req=>{networkCalls.push(req);throw new Error('offline')},URL,RequestShim,Response);
 handlers.fetch({request:nav,respondWith(p){promise=p}});assert.equal(await (await promise).text(),'offline-shell');
 for(const path of ['combo-history-v1.json','combo-status-v1.json','combo-presets-v1.json','keno-payouts-v1.json','app-version.json','data/xray-runtime.json']){
  await assert.rejects(()=>request(scope+path),/offline/);assert.equal(networkCalls.at(-1).cache,'no-store');
 }
 assert.equal((await request('https://other.test/data/xray-runtime.json')).handled,false);
});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function generate(files){const memory={...files},fsMock={readFile:async name=>{if(!(name in memory))throw new Error('missing '+name);return memory[name]},writeFile:async(name,text)=>{memory[name]=text}};await new AsyncFunction('fs','crypto','console',buildScript.replace(/^import .*;\n/gm,''))(fsMock,crypto,{log(){}});return memory}
await check('APP BUILD is idempotent and independent of live archive/runtime/status',async()=>{
 const first=await generate(disk),second=await generate(first);for(const file of ['index.html','sw.js','manifest.webmanifest','app-version.json'])assert.equal(first[file],second[file],file);
 const data=await generate({...first,'combo-history-v1.json':'new draw','combo-status-v1.json':'new status','data/xray-runtime.json':'new frozen'});
 for(const file of ['index.html','sw.js','manifest.webmanifest','app-version.json'])assert.equal(first[file],data[file],file);
});
await check('APP BUILD changes when installed mathematical engine or UI changes',async()=>{
 const first=await generate(disk);
 for(const file of ['xray-structure-engine-v4.mjs','xray-runtime-core.mjs','xray-ui-v1.js']){
  assert(file in first,'Missing build input '+file);
  const changed=await generate({...first,[file]:first[file]+'\n// build-input-test\n'});
  assert.notEqual(JSON.parse(first['app-version.json']).build,JSON.parse(changed['app-version.json']).build,file);
 }
});
console.log('XRAY UI / PWA PASS '+tests.length+' checks');
