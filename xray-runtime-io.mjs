import fs from 'node:fs/promises';
import {canonical,parseRuntime,validateRuntime,validateGuard,makeGuard,assertMonotonic,initialRuntime} from './xray-runtime-core.mjs';

export async function optionalText(path,io=fs){
 try{return await io.readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export async function atomicJSON(path,value,io=fs){
 const temp=path+'.tmp';let file;
 try{file=await io.open(temp,'wx');await file.writeFile(JSON.stringify(value,null,2)+'\n','utf8');await file.sync();await file.close();file=null;await io.rename(temp,path);}
 catch(e){if(file)await file.close().catch(()=>{});if(e.code!=='EEXIST')await io.rm(temp,{force:true}).catch(()=>{});throw e;}
}
export async function readState({runtimePath='data/xray-runtime.json',guardPath='data/xray-runtime.guard.json',baselineRuntime=null,baselineGuard=null,everExisted=true,io=fs}={}){
 // Read and validate everything before any file is modified.
 const text=await optionalText(runtimePath,io),guardText=await optionalText(guardPath,io);
 if(text===null){
 if(everExisted||guardText!==null||baselineRuntime!==null||baselineGuard!==null)throw new Error('MISSING_EXISTING_RUNTIME');
 return {runtime:initialRuntime(),guard:null,originalText:null};
 }
 const runtime=parseRuntime(text);
 if(guardText===null)throw new Error('MISSING_RUNTIME_GUARD');
 let guard;try{guard=JSON.parse(guardText);}catch{throw new Error('CORRUPT_RUNTIME_GUARD');}
 validateGuard(guard,runtime);
 if(baselineRuntime!==null)assertMonotonic(parseRuntime(baselineRuntime),runtime);
 if(baselineGuard!==null)validateGuard(JSON.parse(baselineGuard),runtime);
 return {runtime,guard,originalText:text,needsGuardRefresh:canonical(guard)!==canonical(makeGuard(runtime))};
}
export async function persistState(next,state,{runtimePath='data/xray-runtime.json',guardPath='data/xray-runtime.guard.json',io=fs}={}){
 validateRuntime(next);assertMonotonic(state.runtime,next);if(state.guard)validateGuard(state.guard,next);
 const onDisk=await optionalText(runtimePath,io);
 if(onDisk!==state.originalText)throw new Error('CONCURRENT_RUNTIME_WRITE');
 const guard=makeGuard(next),encoded=JSON.stringify(next,null,2)+'\n';
 // Runtime first: if interrupted, the old guard can only be behind, never ahead.
 // The next run validates all old records before advancing the guard.
 if(onDisk!==encoded)await atomicJSON(runtimePath,next,io);
 await atomicJSON(guardPath,guard,io);
 state.runtime=next;state.guard=guard;state.originalText=encoded;
}
