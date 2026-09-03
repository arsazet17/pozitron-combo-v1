'use strict';
import fs from 'node:fs/promises';
const draws=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const OUT='combo-search-log-v1.json', WINDOWS=[5,10,20,60], SIZES=[3,4,5,6,7], LIMIT=4;
let log={version:'1.0.0',updatedAt:null,latestDraw:null,snapshots:[]};
try{log=JSON.parse(await fs.readFile(OUT,'utf8'))}catch(e){}
if(!Array.isArray(log.snapshots))log.snapshots=[];
function key(a){return [...a].sort((x,y)=>x-y).join('-')}
function overlap(a,b){let n=0;for(const x of a)if(b.includes(x))n++;return n}
function combs(a,k,cb){const p=new Array(k);function r(s,d){if(d===k){cb(p.slice());return}for(let i=s;i<=a.length-(k-d);i++){p[d]=a[i];r(i+1,d+1)}}r(0,0)}
function traj(nums,ds){const k=nums.length;let full=0,sum=0,withHit=0,near=0,run=0,maxRun=0;for(const d of ds){let h=0;for(const n of nums)if(d.balls.includes(n))h++;sum+=h;if(h===k)full++;if(h>0){withHit++;run++;maxRun=Math.max(maxRun,run)}else run=0;if(h>=k-1)near++;}const score=full*10000+near*500+sum*20+withHit*5+maxRun;return{full,sum,withHit,near,maxRun,score}}
function build(ds,k){const f=Array(81).fill(0);for(const d of ds)for(const n of d.balls)f[n]++;const pool=new Map();for(const d of ds){const ranked=[...d.balls].sort((a,b)=>f[b]-f[a]||a-b);const core=ranked.slice(0,Math.min(ranked.length,k+4));combs(core,k,nums=>pool.set(key(nums),nums));}const rows=[];for(const nums of pool.values()){const t=traj(nums,ds);if(t.full>0)rows.push({nums,...t})}rows.sort((a,b)=>b.score-a.score||b.full-a.full||b.sum-a.sum||key(a.nums).localeCompare(key(b.nums)));return{rows,poolSize:pool.size}}
function diverse(rows,k){const strict=Math.floor(k/2),out=[];for(const r of rows){if(out.every(p=>overlap(r.nums,p.nums)<=strict)){out.push(r);if(out.length>=LIMIT)return out}}for(let allowed=strict+1;allowed<=Math.max(strict,k-2)&&out.length<LIMIT;allowed++){for(const r of rows){if(out.includes(r))continue;if(out.every(p=>overlap(r.nums,p.nums)<=allowed)){out.push(r);if(out.length>=LIMIT)break}}}return out}
const latest=draws.at(-1); if(!latest)throw new Error('archive empty');
const existing=new Set(log.snapshots.map(s=>`${s.anchorDraw}:${s.window}:${s.size}`));
let added=0;
for(const w of WINDOWS){const ds=draws.slice(-w);for(const k of SIZES){const sig=`${latest.draw}:${w}:${k}`;if(existing.has(sig))continue;const b=build(ds,k);const p=diverse(b.rows,k);log.snapshots.push({createdAt:new Date().toISOString(),anchorDraw:latest.draw,anchorDate:latest.date,anchorTime:latest.time,window:w,size:k,drawsCount:ds.length,poolSize:b.poolSize,combos:p.map(r=>({nums:r.nums,full:r.full,near:r.near,sum:r.sum,withHit:r.withHit,maxRun:r.maxRun,score:r.score}))});added++;}}
log.snapshots=log.snapshots.slice(-2000);log.updatedAt=new Date().toISOString();log.latestDraw=latest.draw;log.latestDate=latest.date;log.latestTime=latest.time;log.added=added;
await fs.writeFile(OUT,JSON.stringify(log,null,2)+'\n','utf8');
console.log(`SEARCH LOG PASS latest=${latest.draw} added=${added}`);
