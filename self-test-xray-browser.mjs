// Optional real-browser regression: PLAYWRIGHT_MODULE and CHROMIUM_PATH can point to installed tools.
// All cloud traffic is mocked; this test never changes production preferences or forecasts.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),runtime=JSON.parse(await fs.readFile('data/xray-runtime.json','utf8'));
const archive=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
let runtimeRequests=0,notModified=0;
const server=http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';
  const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error('path');
  if(name==='data/xray-runtime.json'){
   runtimeRequests++;res.setHeader('ETag','"xray-test"');
   if(req.headers['if-none-match']==='"xray-test"'){notModified++;res.writeHead(304);res.end();return}
  }
  const body=await fs.readFile(file);res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html');res.end(body);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 let hidden=[],postFail=false;
 await context.route('https://**/*',async route=>{
  const req=route.request();if(req.url().includes('/functions/v1/combo-history')){
   if(req.method()==='POST'){
    if(postFail)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"test offline"}'});
    const p=req.postDataJSON();hidden.push({item_id:p.id,payload:p.payload});
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify({items:req.url().includes('xray_archive_prefs')?hidden:[],ok:true})});
  }
  return route.abort();
 });
 const page=await context.newPage(),errors=[];
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(origin,{waitUntil:'load'});
 await page.waitForFunction(()=>window.ComboXrayUI?.getRuntime()?.history?.length>0);
 await page.locator('.nav[data-sec="xray"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.xrayFactBlock .xatTrackBtn').length===4);
 assert.equal(await page.locator('.xrayArchiveItem').count(),0,'closed history does not build hidden cards');
 assert.equal(await page.locator('.xrayFactBlock .xrayExplicitMeta').count(),1,'one metadata block');
 assert.equal(await page.locator('.xrayFactBlock .xatOrderBtn').count(),0,'no duplicate sort controls');
 await page.locator('[data-xfold="archive"]').click();
 assert.equal(await page.locator('.xrayArchiveItem').count(),Math.min(10,runtime.history.length));
 const cards=page.locator('.xrayArchiveItem');
 const target0=Number(await cards.first().getAttribute('data-target'));
 assert.equal(target0,Number(runtime.history[0].targetDraw));
 const readNums=locator=>locator.locator('span').evaluateAll(nodes=>nodes.map(n=>Number(n.textContent.match(/\d+/)[0])));
 assert.deepEqual(await readNums(cards.first().locator('.xray20Nums').first()),[...runtime.history[0].factBalls].sort((a,b)=>a-b));
 await page.locator('.xrayFactBlock [data-xray-sort-toggle]').click();
 assert.deepEqual(await readNums(cards.first().locator('.xray20Nums').first()),runtime.history[0].factBalls,'draw order restored from immutable record');
 const before=JSON.stringify(runtime.history[0]);
 for(let i=0;i<4;i++){
  const label=['5A','5B','7A','7B'][i],row=page.locator('.xrayFactBlock .xrayComboRow').nth(i);
  const hit=runtime.history[0]['combo'+label+'Hits']||[];
  assert.equal(await row.locator('.hit').count(),hit.length,'saved '+label+' hits');
  await row.locator('.xatTrackBtn').click();
  await page.waitForFunction(()=>document.querySelector('.xrayFactBlock .xatTrackPanel')?.textContent.includes('ТИРАЖЕЙ ДАЛЬШЕ'));
 }
 assert.equal(await page.locator('.xrayFactBlock .xatTrackPanel').count(),1,'switching branches replaces tracking');
 await page.locator('[data-xpage="1"]').click();
 assert.equal(Number(await cards.first().getAttribute('data-target')),Number(runtime.history[10].targetDraw),'correct page records');
 const rec=runtime.history[10],nums=rec.combo5A||rec.combo5;
 await cards.first().locator('.xatTrackBtn').first().click();
 await page.waitForFunction(()=>document.querySelector('.xrayArchiveItem .xatTrackPanel')?.textContent.includes('ТИРАЖЕЙ ДАЛЬШЕ'));
 const next=archive.filter(d=>Number(d.draw)>Number(rec.factDraw||rec.targetDraw)).sort((a,b)=>Number(a.draw)-Number(b.draw))[0];
 if(next){const expected=nums.filter(n=>next.balls.includes(n));assert.equal(await cards.first().locator('.xatTrackRow .xatTrackHits').first().textContent(),expected.length+'/'+nums.length);assert.equal(await cards.first().locator('.xatTrackRow .xatTrackDraw').first().textContent(),'№'+next.draw)}
 await cards.first().locator('.xrayTrackBtn').click();
 await page.waitForFunction(()=>document.querySelector('.xrayArchiveItem .xatTrackPanel')?.textContent.includes('Для набора из 20 чисел'));
 assert.equal(await page.locator('.nav[data-sec="xray"]').getAttribute('class'),'nav on','tracking stays inside XRAY');
 // No request/data refresh should destroy an open check when the server has not changed.
 await page.evaluate(()=>window.ComboXrayUI.refresh());assert(notModified>0,'conditional request reused unchanged runtime');
 assert.equal(await cards.first().locator('.xatTrackPanel').count(),1);
 // Failure must not hide a card; successful hiding must not relabel adjacent records.
 postFail=true;await cards.first().locator('.xrayDeleteBtn').click();await page.waitForFunction(()=>!document.querySelector('.xrayArchiveItem .xrayDeleteBtn')?.disabled);
 assert.equal(Number(await cards.first().getAttribute('data-target')),Number(rec.targetDraw));
 postFail=false;await cards.first().locator('.xrayDeleteBtn').click();
 await page.waitForFunction(target=>Number(document.querySelector('.xrayArchiveItem')?.dataset.target)!==target,Number(rec.targetDraw));
 assert.equal(Number(await cards.first().getAttribute('data-target')),Number(runtime.history[11].targetDraw));
 assert((await cards.first().locator('.xrayExplicitMeta').textContent()).includes('№'+runtime.history[11].factDraw));
 // A long archive scan yields to clicks, and a closed panel cannot be repopulated later.
 await page.evaluate(async()=>{
  const card=document.querySelector('.xrayArchiveItem'),btn=card.querySelector('.xatTrackBtn');
  card.querySelector('.xatTrackPanel')?.remove();
  const rec=window.ComboXrayUI.getRuntime().history.find(e=>Number(e.targetDraw)===Number(card.dataset.target));
  const work=window.ComboXrayTracking.open(card,{...rec,factDraw:1},'5A',btn);
  await new Promise(resolve=>setTimeout(()=>{btn.click();resolve()},0));await work;
 });
 assert.equal(await cards.first().locator('.xatTrackPanel').count(),0,'cancelled scan does not restore its panel');
 // Failed archive fetch releases the operation; retry can use the shared archive immediately.
 await page.route('**/combo-history-v1.json?xray=*',route=>route.abort());
 await page.evaluate(()=>{window.testSavedDraws=DRAWS;DRAWS=[]});
 await cards.first().locator('.xatTrackBtn').first().click();
 await page.locator('[data-track-retry]').waitFor();
 await page.evaluate(()=>{DRAWS=window.testSavedDraws;delete window.testSavedDraws});
 await page.locator('[data-track-retry]').click();
 await page.waitForFunction(()=>document.querySelector('.xrayArchiveItem .xatTrackPanel')?.textContent.includes('ТИРАЖЕЙ ДАЛЬШЕ'));
 await page.unroute('**/combo-history-v1.json?xray=*');
 // Runtime failure retains the last good frozen data and offers a working retry.
 await page.route('**/data/xray-runtime.json',route=>route.fulfill({status:503,body:'offline'}));
 await page.evaluate(()=>window.ComboXrayUI.refresh());
 assert.equal(await page.locator('[data-xray-retry]').count(),1);
 assert.equal(await page.locator('.xrayFactBlock .xrayComboRow').count(),4);
 await page.unroute('**/data/xray-runtime.json');
 await page.locator('[data-xray-retry]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-xray-retry]'));
 // A stable idle DOM proves observer feedback has stopped. Ignore intentional SVG redraws.
 const changes=await page.evaluate(async()=>{
  let count=0;const observer=new MutationObserver(records=>{count+=records.filter(r=>!r.target.closest?.('#xrayOverlay')).length});
  observer.observe(document.getElementById('xrayRoot'),{childList:true,subtree:true});
  await new Promise(resolve=>setTimeout(resolve,350));observer.disconnect();return count;
 });
 assert.equal(changes,0,'no self-triggered DOM rewrites while idle');
 await page.locator('[data-xfold="fact"]').click();assert.equal(await page.locator('[data-xfold="fact"]').getAttribute('aria-expanded'),'false');
 await page.locator('[data-xfold="fact"]').click();assert.equal(await page.locator('[data-xfold="fact"]').getAttribute('aria-expanded'),'true');
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('#xrayRoot *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({parent:el.parentElement.className,tag:el.tagName,cls:String(el.className),text:el.textContent.slice(0,60),right:el.getBoundingClientRect().right})));
  if(overflow.length)await page.screenshot({path:'/tmp/xray-overflow.png',fullPage:true});
  assert.deepEqual(overflow,[],'XRAY fits screen at '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.xrayFactBlock').screenshot({path:'/tmp/xray-fact-verified.png'});
 await cards.first().screenshot({path:'/tmp/xray-history-verified.png'});
 assert.equal(JSON.stringify(runtime.history[0]),before,'fixture unchanged');
 assert.deepEqual(errors,[],'no JavaScript exceptions');
 console.log('PASS XRAY real browser: '+runtime.history.length+' saved records, lazy pages, four branches, saved hits, live tracking, sorting, cloud failure/success, cancellation, fetch recovery, 304 reuse, idle DOM and 320/390/768px layouts. Runtime requests: '+runtimeRequests);
 await context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
