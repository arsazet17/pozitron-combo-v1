import {createHash} from 'node:crypto';

export const SCHEMA_VERSION=5;
export const COMBO_KEYS=['combo5A','combo5B','combo7A','combo7B'];
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=(code,detail='')=>{throw new Error(code+(detail?': '+detail:''));};
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const engineVersion=f=>f.engineVersion||f.version;
export function picks(f){
 return {combo5A:f.combo5A??f.combo5,combo5B:f.combo5B??[],combo7A:f.combo7A??f.combo7,combo7B:f.combo7B??[]};
}
export function frozenProjection(f){
 const keys=['sourceDraw','targetDraw','createdAt','sourceDate','sourceTime','targetDate','targetTime','sourceColumn','current20','predicted20','combo5','combo7','version','modelVersion','modelLatestDraw','structure','movementEdges','transitions','payoutVersion','payoutSnapshot'];
 const out={engineVersion:engineVersion(f),...picks(f)};
 for(const k of keys)if(has(f,k))out[k]=f[k];
 return out;
}
export const fingerprint=f=>'sha256:'+digest(frozenProjection(f));
export const hitNumbers=(pick,fact)=>pick.filter(n=>fact.includes(n));
function checkNumbers(a,size,label){
 if(!Array.isArray(a)||a.length!==size||new Set(a).size!==size||a.some(n=>!Number.isInteger(n)||n<1||n>80))fail('INVALID_NUMBERS',label);
}
export function savedTotal(f){
 let total=0;for(const k of COMBO_KEYS){const alias=k==='combo5A'?'combo5Payout':k==='combo7A'?'combo7Payout':null;
 const val=f[k+'Payout']??(alias?f[alias]:undefined);
 if(val!==undefined){if(typeof val!=='number'||!Number.isFinite(val)||val<0)fail('INVALID_PAYOUT',k);total+=val;}
 }return total;
}
export function validateForecast(f,{settled=false,strict=true}={}){
 if(!f||typeof f!=='object'||Array.isArray(f))fail('INVALID_FORECAST');
 if(!Number.isInteger(f.sourceDraw)||!Number.isInteger(f.targetDraw)||f.sourceDraw<1||f.targetDraw!==f.sourceDraw+1)fail('INVALID_TARGET');
 if(typeof engineVersion(f)!=='string'||!engineVersion(f))fail('INVALID_ENGINE_VERSION');
 if(f.engineVersion&&f.version&&f.engineVersion!==f.version)fail('ENGINE_VERSION_MISMATCH');
 if(!Number.isFinite(Date.parse(f.createdAt)))fail('INVALID_CREATED_AT');
 checkNumbers(f.predicted20,20,'predicted20');
 const legacy=engineVersion(f).startsWith('XRAY-SERVER-'),p=picks(f);
 for(const [k,n] of [['combo5A',5],['combo5B',5],['combo7A',7],['combo7B',7]]){
 if(legacy&&(k==='combo5B'||k==='combo7B')&&!p[k].length)continue;
 checkNumbers(p[k],n,k);if(p[k].some(x=>!f.predicted20.includes(x)))fail('COMBO_OUTSIDE_20',k);
 }
 if(strict&&(!f.engineVersion||f.forecastFingerprint!==fingerprint(f)))fail('FINGERPRINT_MISMATCH',String(f.targetDraw));
 if(!strict&&f.forecastFingerprint&&f.forecastFingerprint!==fingerprint(f))fail('FINGERPRINT_MISMATCH',String(f.targetDraw));
 if(f.status!==(settled?'settled':'pending'))fail('INVALID_FORECAST_STATUS');
 if(strict&&(f.lateForecast||f.replacedForecast)&&f.statisticsEligible!==false)fail('UNTRUSTED_STATISTICS');
 if(!settled)return true;
 if(f.factDraw!==f.targetDraw||!Number.isFinite(Date.parse(f.settledAt)))fail('INVALID_SETTLEMENT');
 checkNumbers(f.factBalls,20,'factBalls');
 const h20=f.forecast20Hits??f.layerHits;
 if(canonical(h20)!==canonical(hitNumbers(f.predicted20,f.factBalls)))fail('HITS_MISMATCH','20');
 for(const k of COMBO_KEYS){
 if(!p[k].length)continue;
 const alias=k==='combo5A'?'combo5':k==='combo7A'?'combo7':null;
 const h=f[k+'Hits']??(alias?f[alias+'Hits']:undefined),pay=f[k+'Payout']??(alias?f[alias+'Payout']:undefined);
 if(canonical(h)!==canonical(hitNumbers(p[k],f.factBalls)))fail('HITS_MISMATCH',k);
 if(typeof pay!=='number'||!Number.isFinite(pay)||pay<0)fail('INVALID_PAYOUT',k);
 }
 if((strict||f.totalPayout!==undefined)&&f.totalPayout!==savedTotal(f))fail('TOTAL_PAYOUT_MISMATCH');
 if(strict&&(f.lateForecast||f.replacedForecast)&&f.statisticsEligible!==false)fail('UNTRUSTED_STATISTICS');
 return true;
}
export function validateRuntime(rt,{strict=true}={}){
 if(!rt||typeof rt!=='object'||Array.isArray(rt)||!Array.isArray(rt.history)||!has(rt,'forecast'))fail('INVALID_RUNTIME_STRUCTURE');
 if(strict&&rt.schemaVersion!==SCHEMA_VERSION)fail('UNMIGRATED_RUNTIME');
 const seen=new Set();
 for(const f of rt.history){validateForecast(f,{settled:true,strict});if(seen.has(f.targetDraw))fail('DUPLICATE_TARGET');seen.add(f.targetDraw);}
 if(rt.forecast){validateForecast(rt.forecast,{strict});if(seen.has(rt.forecast.targetDraw))fail('DUPLICATE_TARGET');}
 if(rt.status==='error'&&(!rt.anomaly||!['MISSING_TARGET_FACT','MISSED_FORECAST_WINDOW'].includes(rt.anomaly.code)))fail('INVALID_ANOMALY');
 return true;
}
export function makeGuard(rt){
 validateRuntime(rt);
 const records={};for(const f of rt.history)records[f.targetDraw]={forecastFingerprint:f.forecastFingerprint,settledDigest:digest(f)};
 if(rt.forecast)records[rt.forecast.targetDraw]={forecastFingerprint:rt.forecast.forecastFingerprint,settledDigest:null};
 return {schemaVersion:1,historyCount:rt.history.length,records};
}
export function validateGuard(guard,rt){
 if(!guard||guard.schemaVersion!==1||!Number.isInteger(guard.historyCount)||guard.historyCount<0||!guard.records||typeof guard.records!=='object'||Array.isArray(guard.records))fail('INVALID_GUARD');
 if(Object.values(guard.records).filter(x=>x.settledDigest!==null).length!==guard.historyCount)fail('INVALID_GUARD_COUNT');
 const current=makeGuard(rt);
 if(current.historyCount<guard.historyCount)fail('HISTORY_SHRINK');
 for(const [id,row] of Object.entries(guard.records)){
 if(!/^[1-9]\d*$/.test(id)||!row||typeof row.forecastFingerprint!=='string'||!/^sha256:[a-f0-9]{64}$/.test(row.forecastFingerprint)||!(row.settledDigest===null||/^[a-f0-9]{64}$/.test(row.settledDigest)))fail('INVALID_GUARD_RECORD');
 const next=current.records[id];if(!next)fail('LOST_TARGET',id);
 if(next.forecastFingerprint!==row.forecastFingerprint)fail('FROZEN_CHANGED',id);
 if(row.settledDigest!==null&&row.settledDigest!==next.settledDigest)fail('SETTLED_CHANGED',id);
 }
 return true;
}
export function assertMonotonic(previous,next){
 validateRuntime(previous);validateRuntime(next);
 return validateGuard(makeGuard(previous),next);
}
export function parseRuntime(text){
 let rt;try{rt=JSON.parse(text);}catch{fail('CORRUPT_RUNTIME_JSON');}validateRuntime(rt);return rt;
}
export function normalizeDraws(raw){
 const list=Array.isArray(raw)?raw:raw?.draws;if(!Array.isArray(list)||list.length<20)fail('INVALID_HISTORY_INPUT');
 const seen=new Set();return list.map(d=>{
 const draw=Number(d?.draw??d?.number??d?.id),balls=(d?.balls??d?.numbers)?.map(Number);
 if(!Number.isInteger(draw)||draw<1||seen.has(draw))fail('INVALID_OR_DUPLICATE_DRAW');seen.add(draw);checkNumbers(balls,20,'draw '+draw);
 return {draw,date:String(d.date||''),time:String(d.time||''),column:Number(d.column)||null,balls};
 }).sort((a,b)=>a.draw-b.draw);
}
export function validatePayouts(p){
 if(!p||typeof p.version!=='string'||!p.combination)fail('INVALID_PAYOUT_TABLE');
 for(const size of [5,7]){const table=p.combination[size];if(!table||typeof table!=='object'||Array.isArray(table)||!Object.keys(table).length)fail('INVALID_PAYOUT_TABLE');for(const [k,v] of Object.entries(table))if(!/^\d+$/.test(k)||Number(k)>size||typeof v!=='number'||!Number.isFinite(v)||v<0)fail('INVALID_PAYOUT_TABLE');}
 return p;
}
export function officialTime(date,time){
 const m=String(date).match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
 return m&&/^\d{2}:\d{2}$/.test(time)?Date.parse('20'+m[3]+'-'+m[2]+'-'+m[1]+'T'+time+':00+03:00'):NaN;
}
export function addDiagnostics(f){
 const out=clone(f);out.engineVersion=engineVersion(out);
 out.forecastFingerprint=fingerprint(out);
 if(out.status==='settled'){
 if(out.forecast20Hits===undefined)out.forecast20Hits=clone(out.layerHits);
 if(out.totalPayout===undefined)out.totalPayout=savedTotal(out);
 const t=officialTime(out.factDate,out.factTime);if(Number.isFinite(t)&&Date.parse(out.createdAt)>=t)out.lateForecast=true;
 }
 out.statisticsEligible=!(out.lateForecast||out.replacedForecast);
 return out;
}
// Explicit, one-time adoption only; never called by the normal builder.
export function adoptLegacyRuntime(rt){
 validateRuntime(rt,{strict:false});const out=clone(rt);
 out.schemaVersion=SCHEMA_VERSION;out.history=out.history.map(addDiagnostics);if(out.forecast)out.forecast=addDiagnostics(out.forecast);
 validateRuntime(out);return out;
}
export function initialRuntime(){
 return {schemaVersion:SCHEMA_VERSION,version:4,forecast:null,history:[],generation:'INIT',status:'live'};
}
function stamp(rt,now){
 const out=clone(rt);out.updatedAt=now;
 const material=clone(out);delete material.updatedAt;delete material.generation;out.generation=digest(material);
 return out;
}
function setOfficial(rt,latest){rt.latestOfficial=clone(latest);}
export function settlePending(rt,draws,payouts,now){
 validateRuntime(rt);validatePayouts(payouts);const out=clone(rt),latest=draws.at(-1),f=out.forecast;
 if(!f)return {runtime:out,settled:false,blocked:out.status==='error'};
 const fact=draws.find(d=>d.draw===f.targetDraw);
 if(!fact){
 if(latest.draw>f.targetDraw){
 if(out.anomaly?.code==='MISSING_TARGET_FACT'&&out.anomaly.targetDraw===f.targetDraw&&out.anomaly.latestDraw===latest.draw)return {runtime:out,settled:false,blocked:true};
 out.status='error';out.anomaly={code:'MISSING_TARGET_FACT',targetDraw:f.targetDraw,latestDraw:latest.draw,detectedAt:now};setOfficial(out,latest);
 return {runtime:stamp(out,now),settled:false,blocked:true};
 }
 return {runtime:out,settled:false,blocked:out.anomaly?.code==='MISSING_TARGET_FACT'};
 }
 const settled={...f,status:'settled',factDraw:fact.draw,factDate:fact.date,factTime:fact.time,factColumn:fact.column,factBalls:clone(fact.balls),forecast20Hits:hitNumbers(f.predicted20,fact.balls),layerHits:hitNumbers(f.predicted20,fact.balls),settledAt:now};
 const table=validatePayouts(f.payoutSnapshot||payouts);settled.settlementPayoutVersion=table.version;
 for(const [k,pick] of Object.entries(picks(f))){settled[k+'Hits']=hitNumbers(pick,fact.balls);settled[k+'Payout']=Number(table.combination[pick.length]?.[settled[k+'Hits'].length]||0);}
 settled.totalPayout=savedTotal(settled);settled.winningCombos=COMBO_KEYS.filter(k=>settled[k+'Payout']>0);
 // Legacy aliases retain the exact forecast numbers.
 settled.combo5Hits=clone(settled.combo5AHits);settled.combo7Hits=clone(settled.combo7AHits);settled.combo5Payout=settled.combo5APayout;settled.combo7Payout=settled.combo7APayout;
 const t=officialTime(fact.date,fact.time);if(Number.isFinite(t)&&Date.parse(f.createdAt)>=t)settled.lateForecast=true;
 settled.statisticsEligible=!(settled.lateForecast||settled.replacedForecast);
 validateForecast(settled,{settled:true});
 if(out.history.some(x=>x.targetDraw===settled.targetDraw))fail('DUPLICATE_TARGET');
 out.history.unshift(settled);out.forecast=null;out.status='live';delete out.anomaly;setOfficial(out,latest);
 const result=stamp(out,now);assertMonotonic(rt,result);return {runtime:result,settled:true,blocked:false};
}
function inferNext(draws,s){
 for(let j=draws.length-2;j>=0;j--)if(draws[j].time===s.time&&draws[j+1].draw===draws[j].draw+1){
 const a=officialTime(draws[j].date,'00:00'),b=officialTime(draws[j+1].date,'00:00'),t=officialTime(s.date,'00:00');
 if(![a,b,t].every(Number.isFinite))continue;
 const x=new Date(t+Math.round((b-a)/86400000)*86400000+10800000);
 return {draw:s.draw+1,date:String(x.getUTCDate()).padStart(2,'0')+'.'+String(x.getUTCMonth()+1).padStart(2,'0')+'.'+String(x.getUTCFullYear()).slice(-2),time:draws[j+1].time};
 }return {draw:s.draw+1,date:s.date,time:null};
}
export function createNextForecast(rt,draws,payouts,analyze,movement,now,{resumeGap=false}={}){
 validateRuntime(rt);validatePayouts(payouts);
 if(rt.forecast)return clone(rt);
 const out=clone(rt),latest=draws.at(-1),last=out.history.reduce((m,x)=>Math.max(m,x.targetDraw),0);
 if(out.anomaly?.code==='MISSING_TARGET_FACT')fail('MISSING_TARGET_FACT');
 if(last&&latest.draw>last&&!resumeGap){
 if(out.anomaly?.code==='MISSED_FORECAST_WINDOW'&&out.anomaly.latestDraw===latest.draw)return out;
 out.status='error';out.anomaly={code:'MISSED_FORECAST_WINDOW',targetDraw:last+1,latestDraw:latest.draw,detectedAt:now};setOfficial(out,latest);return stamp(out,now);
 }
 if(last&&latest.draw<last)fail('HISTORY_INPUT_BEHIND_SETTLEMENT');
 if(out.history.some(x=>x.targetDraw===latest.draw+1))fail('DUPLICATE_TARGET');
 if(last&&latest.draw>last){out.missingForecasts=out.missingForecasts||[];out.missingForecasts.push({fromDraw:last+1,toDraw:latest.draw,reason:'NO_PUBLISHED_FORECAST',acknowledgedAt:now});}
 const structure=analyze(draws),target=inferNext(draws,latest),predicted20=structure.ranked20,edges=movement(latest.balls,predicted20,draws);
 const f={id:'xr-frozen-'+target.draw,status:'pending',createdAt:now,version:structure.version,engineVersion:structure.version,sourceDraw:latest.draw,sourceDate:latest.date,sourceTime:latest.time,sourceColumn:latest.column,current20:clone(latest.balls),targetDraw:target.draw,targetDate:target.date,targetTime:target.time,predicted20:clone(predicted20),
 combo5A:clone(structure.combo5A),combo5B:clone(structure.combo5B),combo7A:clone(structure.combo7A),combo7B:clone(structure.combo7B),combo5:clone(structure.combo5A),combo7:clone(structure.combo7A),
 structure:clone(structure),movementEdges:clone(edges),transitions:edges.map(e=>({from:e.from,to:e.to,kind:'change',relation:e.type,strength:e.strength})),payoutVersion:payouts.version,payoutSnapshot:clone(payouts),statisticsEligible:true};
 const expected=officialTime(f.targetDate,f.targetTime);
 if(Number.isFinite(expected)&&Date.parse(now)>=expected){f.lateForecast=true;f.statisticsEligible=false;}
 f.forecastFingerprint=fingerprint(f);validateForecast(f);
 out.forecast=f;out.status='live';delete out.anomaly;setOfficial(out,latest);out.model={version:structure.version,latestDraw:latest.draw,trainedAt:null};
 const result=stamp(out,now);assertMonotonic(rt,result);return result;
}
// checkpoint must durably persist both runtime and its guard; forecast math runs only after it resolves.
export async function advanceRuntime(rt,draws,payouts,{analyze,movement,checkpoint,now=()=>new Date().toISOString(),resumeGap=false}){
 validateRuntime(rt);const settled=settlePending(rt,draws,payouts,now());let current=settled.runtime;
 if(canonical(current)!==canonical(rt))await checkpoint(current);
 if(settled.blocked&&!(resumeGap&&current.anomaly?.code==='MISSED_FORECAST_WINDOW'))return {runtime:current,blocked:true};
 if(current.forecast)return {runtime:current,blocked:false};
 const next=createNextForecast(current,draws,payouts,analyze,movement,now(),{resumeGap});
 if(canonical(next)!==canonical(current))await checkpoint(next);
 return {runtime:next,blocked:next.status==='error'};
}

export function assertLegacyAdoption(previous,next){
 validateRuntime(previous,{strict:false});validateRuntime(next);
 if(previous.schemaVersion===SCHEMA_VERSION)return assertMonotonic(previous,next);
 if(next.history.length<previous.history.length)fail('HISTORY_SHRINK');
 for(const old of previous.history){
 const record=next.history.find(x=>x.targetDraw===old.targetDraw);if(!record)fail('LOST_TARGET',String(old.targetDraw));
 for(const k of Object.keys(old))if(canonical(old[k])!==canonical(record[k]))fail('LEGACY_FIELD_CHANGED',old.targetDraw+' '+k);
 if(fingerprint(old)!==record.forecastFingerprint)fail('FROZEN_CHANGED',String(old.targetDraw));
 }
 if(previous.forecast){
 const old=previous.forecast,record=next.forecast?.targetDraw===old.targetDraw?next.forecast:next.history.find(x=>x.targetDraw===old.targetDraw);
 if(!record||fingerprint(old)!==record.forecastFingerprint)fail('LOST_OR_CHANGED_PENDING');
 }
 return true;
}
