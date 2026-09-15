import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Execute the shipped browser functions; fixtures never modify the archive.
const html=await fs.readFile('index.html','utf8');
const code=html.slice(html.indexOf('async function fetchJSONLive('),html.indexOf("document.querySelectorAll('.nav[data-sec]')"));
const archive=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const tail=archive.slice(-4);
for(let i=1;i<tail.length;i++)assert.equal(tail[i].draw,tail[i-1].draw+1);
let available=[tail[0]], failure=null, notifications=0;
const timeouts=new Map(),intervals=[],events={},requests=[];
let nextTimer=0;
const env={
 DRAWS:[tail[0]],PRESETS:{},PAYOUTS:{},syncMeta:null,autoRefreshBusy:false,AUTO_REFRESH_MS:10000,
 AbortController,Date,JSON,URL,Promise,
 console:{warn(){},error(){}},
 document:{hidden:false,addEventListener:(name,fn)=>{events[name]=fn}},
 setTimeout:(fn,ms)=>{const id=++nextTimer;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),
 openIntervalHistory(){},updateDbLine(){},renderFields(){},refreshOpenHistory(){},notifyComboXray(){notifications++},
 renderGroups(){},renderCombos(){},renderPick(){},$:()=>({textContent:''}),
 fetch:async(url,options)=>{
  requests.push({url,options});
  assert.equal(options.cache,'no-store');assert.match(url,/_live=\d+/);
  if(failure==='http')return {ok:false,status:503};
  if(failure==='headers')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  return {ok:true,text:async()=>{
   if(failure==='body')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted body')),{once:true}));
   if(failure==='html')return '<html>temporary gateway error</html>';
   if(url.startsWith('combo-status'))return JSON.stringify({latestDraw:available.at(-1).draw+(failure==='lag'?1:0)});
   if(url.startsWith('combo-history'))return JSON.stringify(available);
   return '{}';
  }};
 }
};
env.window={setTimeout:env.setTimeout,setInterval:(fn,ms)=>intervals.push({fn,ms}),addEventListener:(name,fn)=>{events[name]=fn}};
vm.createContext(env);vm.runInContext(code,env);
env.startAutoRefresh();assert.equal(intervals.length,1);assert.equal(intervals[0].ms,10000);
const tick=()=>intervals[0].fn();
for(let i=1;i<=3;i++){
 available=tail.slice(0,i+1);await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(env.DRAWS)),available);
 assert.equal(new Set(env.DRAWS.map(d=>d.draw)).size,i+1);
 assert.equal(env.autoRefreshBusy,false);
 console.log(`PASS automatic update ${i}: ${tail[i-1].draw} -> ${tail[i].draw}; no missing or duplicate draw`);
}
const saved=JSON.stringify(env.DRAWS);
await tick();assert.equal(notifications,3,'unchanged status does not redraw');
for(const mode of ['headers','body']){
 failure=mode;
 const pending=env.autoRefreshLive(true);
 await Promise.resolve();await Promise.resolve();
 const before=requests.length;await tick();assert.equal(requests.length,before,'no concurrent refresh');
 const timeout=[...timeouts.values()].find(t=>t.ms===30000);assert(timeout,'request deadline installed');timeout.fn();
 await pending;assert.equal(env.autoRefreshBusy,false);assert.equal(JSON.stringify(env.DRAWS),saved);
 failure=null;await env.autoRefreshLive(true);assert.equal(env.autoRefreshBusy,false);
 console.log(`PASS stalled ${mode}: abort, unlock, preserve archive, recover on next update`);
}
for(const mode of ['http','html','lag']){
 failure=mode;await env.autoRefreshLive(true);assert.equal(env.autoRefreshBusy,false);assert.equal(JSON.stringify(env.DRAWS),saved);
 failure=null;await env.autoRefreshLive(true);
}
console.log('PASS HTTP failure, invalid JSON/HTML and publication lag preserve data and recover');
env.document.hidden=true;const before=requests.length;await tick();assert.equal(requests.length,before);
env.document.hidden=false;await events.visibilitychange();await events.online();
// An initial outage previously returned before startAutoRefresh forever.
timeouts.clear();intervals.length=0;failure='http';await env.load();
assert.equal(intervals.length,0);const retry=[...timeouts.values()].find(t=>t.ms===10000);assert(retry);
failure=null;await retry.fn();assert.equal(intervals.length,1);assert.equal(JSON.stringify(env.DRAWS),saved);
console.log('PASS initial load outage retries and starts automatic refresh after recovery');
