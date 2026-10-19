// Verified FULL20 official Stoloto mirror. Never replace the COMBO UI or its forecasts.
import fs from 'node:fs/promises';
const url='https://raw.githubusercontent.com/arsazet17/pozitron-keno-4m/main/data/full20_draws.json';
const historyFile='combo-history-v1.json', statusFile='combo-status-v1.json';
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);
let upstream;
try {
  const response=await fetch(url+'?t='+Date.now(),{signal:controller.signal,headers:{'Cache-Control':'no-cache'}});
  if(!response.ok) throw new Error('FULL20 HTTP '+response.status);
  upstream=await response.json();
} finally {clearTimeout(timer)}
if(!Array.isArray(upstream)||!upstream.length)throw new Error('FULL20 empty');
const raw=JSON.parse(await fs.readFile(historyFile,'utf8'));
if(!Array.isArray(raw)||!raw.length)throw new Error('COMBO history empty');
const valid=d=>Number.isSafeInteger(Number(d?.draw))&&/^\d{2}\.\d{2}\.\d{2}$/.test(String(d?.date||''))&&/^\d{2}:\d{2}$/.test(String(d?.time||''))&&Number.isInteger(Number(d?.column))&&Number(d.column)>=1&&Number(d.column)<=10&&Array.isArray(d.balls)&&d.balls.length===20&&new Set(d.balls.map(Number)).size===20&&d.balls.every(n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=80);
const official=upstream.filter(valid).sort((a,b)=>a.draw-b.draw);
const last=raw.at(-1);
const lastId=Number(last.draw);
const newest=official.at(-1);
if(!newest||newest.draw<lastId)throw new Error('FULL20 mirror behind COMBO');
const anchor=official.find(d=>d.draw===lastId);
if(!anchor)throw new Error('FULL20 anchor missing; refusing unchecked import');
const equal=(a,b)=>a.date===b.date&&a.time===b.time&&JSON.stringify(a.balls.map(Number))===JSON.stringify(b.balls.map(Number));
if(!equal(anchor,last))throw new Error('FULL20 anchor differs from COMBO');
const existing=new Map(raw.map(d=>[Number(d.draw),d]));
let next=lastId+1;
const fresh=official.filter(d=>d.draw>lastId);
for(const d of fresh){
 if(Number(d.draw)!==next++)throw new Error('FULL20 gap at '+next);
 if(!valid(d))throw new Error('FULL20 invalid '+d.draw);
 existing.set(Number(d.draw),{draw:Number(d.draw),date:d.date,time:d.time,column:Number(d.column),balls:d.balls.map(Number),source:'Stoloto OAuth · FULL20 verified mirror'});
}
const combined=[...existing.values()].sort((a,b)=>Number(a.draw)-Number(b.draw));
const status={version:'1.0.6',source:url,updatedAt:new Date().toISOString(),drawsStored:combined.length,latestDraw:Number(combined.at(-1).draw),latestDate:combined.at(-1).date,latestTime:combined.at(-1).time,verification:'full20-official-mirror-anchored',stableDraws:Math.min(10,official.length),checkedTail:Math.min(10,official.length),added:fresh.length,latestOfficial:{draw:Number(newest.draw),date:newest.date,time:newest.time,column:Number(newest.column)}};
if(fresh.length)await fs.writeFile(historyFile,JSON.stringify(combined)+'\n');
await fs.writeFile(statusFile,JSON.stringify(status,null,2)+'\n');
console.log('COMBO FULL20 VERIFIED: anchor #'+lastId+' added '+fresh.length+' latest #'+newest.draw);
