import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium, devices } from 'playwright';

// Real published v4.3.1 files, including its original bootstrap and Service Worker.
const legacyRef='d83e480002aac13bd33c3fbfcbc3836f34f9b299';
const legacyBuild='9ff2db6d7075';
const release=JSON.parse(await fs.readFile('app-version.json','utf8'));
const nextBuild='abcdef012345';
const parts=release.version.split('.').map(Number);parts[2]++;
const nextVersion=parts.join('.');
const snapshots=new Map();
let mode='legacy';
async function contents(file){
 if(mode==='legacy'&&/\.(?:html|js|css|webmanifest)$/.test(file)){
  if(!snapshots.has(file))snapshots.set(file,execFileSync('git',['show',legacyRef+':'+file]));
  return snapshots.get(file);
 }
 let value=await fs.readFile(file);
 if(mode==='next'&&['index.html','sw.js','manifest.webmanifest','app-version.json'].includes(file)){
  value=Buffer.from(value.toString().replaceAll(release.build,nextBuild).replaceAll(release.version,nextVersion));
 }
 return value;
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/combo/')){res.writeHead(404).end();return}
  let file=url.pathname.slice('/combo/'.length)||'index.html';
  if(file.includes('..')){res.writeHead(400).end();return}
  const data=await contents(file);
  const type=file.endsWith('.html')?'text/html':/\.(?:js|mjs)$/.test(file)?'text/javascript':
   file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'application/json';
  res.writeHead(200,{'content-type':type,'cache-control':'no-store','service-worker-allowed':'/combo/'});res.end(data);
 }catch(e){res.writeHead(404).end(String(e.message))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const scope='http://127.0.0.1:'+server.address().port+'/combo/';
const browser=await chromium.launch({headless:true});
async function waitRelease(page,version,build){
 await page.waitForFunction(({version,build})=>document.querySelector('.version')?.textContent==='Версия v'+version&&new URL(location.href).searchParams.get('v')===build,{version,build},{timeout:30000});
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
}
async function legacyClient(){
 mode='legacy';
 const context=await browser.newContext({...devices['Pixel 7'],serviceWorkers:'allow'});
 const page=await context.newPage();
 await page.goto(scope+'?v='+legacyBuild);
 await page.waitForFunction(()=>document.querySelector('.version')?.textContent==='Версия v4.3.1'&&navigator.serviceWorker.controller);
 await page.waitForTimeout(700);
 const keys=await page.evaluate(()=>caches.keys());
 assert(keys.includes('combo-keno-shell-'+legacyBuild));
 await page.evaluate(()=>caches.open('foreign-app-cache'));
 return {context,page};
}
async function assertCache(page,build){
 const keys=await page.evaluate(()=>caches.keys());
 assert(!keys.includes('combo-keno-shell-'+legacyBuild));
 assert(keys.includes('combo-keno-shell-'+build));
 assert(keys.includes('foreign-app-cache'));
}
try{
 // Warm Android PWA: the old document has none of the new page checker code.
 {
  const {context,page}=await legacyClient();
  let navigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
  mode='current';
  await page.evaluate(()=>dispatchEvent(new Event('focus')));
  await waitRelease(page,release.version,release.build);
  await page.waitForTimeout(1200);
  await assertCache(page,release.build);
  // history.replaceState can also emit framenavigated; count actual documents below.
  let documents=0;
  page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++});
  await page.evaluate(()=>{dispatchEvent(new Event('pageshow'));dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForTimeout(1200);
  assert.equal(documents,0,'No reload loop after legacy takeover');
  assert(navigations>0,'Legacy client must transition');
  console.log('PASS real v4.3.1 warm Android client -> '+release.version+'; old cache removed; no reload loop');
  await context.close();
 }
 // Cold launch through the unchanged, installed v4.3.1 manifest start_url.
 {
  const {context,page}=await legacyClient();
  await page.close();mode='current';
  const reopened=await context.newPage();
  await reopened.goto(scope+'?v='+legacyBuild);
  await waitRelease(reopened,release.version,release.build);
  await reopened.waitForTimeout(1200);
  await assertCache(reopened,release.build);
  console.log('PASS installed v4.3.1 start_url -> current build without clearing storage or reinstalling');
  await context.close();
 }
 // Future updates use the new app-version check, with exactly one document reload.
 {
  mode='current';
  const context=await browser.newContext({...devices['Pixel 7'],serviceWorkers:'allow'});
  const page=await context.newPage();
  await page.goto(scope+'?v='+release.build);
  await waitRelease(page,release.version,release.build);
  await page.waitForTimeout(1000);
  let documents=0;
  const versionRequests=[];
  page.on('request',request=>{
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++;
   if(request.url().includes('/app-version.json'))versionRequests.push(request.url());
  });
  mode='next';
  await page.evaluate(()=>dispatchEvent(new Event('focus')));
  await waitRelease(page,nextVersion,nextBuild);
  await page.waitForTimeout(1500);
  assert.equal(documents,1,'One document reload per new build');
  assert(versionRequests.length>0,'Return to app checks app-version.json');
  const keys=await page.evaluate(()=>caches.keys());
  assert(!keys.includes('combo-keno-shell-'+release.build));
  assert(keys.includes('combo-keno-shell-'+nextBuild));
  await context.setOffline(true);
  await page.evaluate(()=>dispatchEvent(new Event('focus')));
  await page.waitForTimeout(500);
  assert.equal(documents,1,'Offline does not reload or clear working build');
  await context.setOffline(false);
  await page.evaluate(()=>{dispatchEvent(new Event('online'));dispatchEvent(new Event('focus'))});
  await page.waitForTimeout(700);
  assert.equal(documents,1,'Same build/data refresh does not reload');
  console.log('PASS next build: no-store version check, exactly one reload, old cache removed, offline/same-build stable');
  await context.close();
 }
 console.log('PWA ANDROID UPGRADE PASS');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
