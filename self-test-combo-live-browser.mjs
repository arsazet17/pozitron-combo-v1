// Real DOM regression on an isolated local server; never writes production data.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const archive=JSON.parse(await fs.readFile('combo-history-v1.json','utf8'));
const tail=archive.slice(-106);let count=100,statusRequests=0,historyRequests=0,statusFailure=false,nextBuild=null;
const root=process.cwd(),errors=[],dialogs=[];
const server=http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';
  const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error('path');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html');
  if(name==='combo-status-v1.json'){statusRequests++;if(statusFailure){res.writeHead(503);res.end('offline');return}res.end(JSON.stringify({latestDraw:tail[count-1].draw}));return}
  if(name==='combo-history-v1.json'){historyRequests++;res.end(JSON.stringify(tail.slice(0,count)));return}
  if(name==='app-version.json'&&nextBuild){res.end(JSON.stringify({build:nextBuild}));return}
  res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.route('https://**/*',route=>route.abort());
 const page=await context.newPage();let navigations=0;
 page.on('pageerror',error=>errors.push(error.message));page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept()});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.waitForFunction(()=>DRAWS.length===100&&!autoRefreshBusy);
 await page.locator('#tableDrawerBtn').click();await page.locator('#tableMatrixBtn').click();
 await page.locator('[data-cm-action="numbers"]').click();await page.locator('[data-cm-action="numbers"]').click();
 const id=tail[80].draw;await page.locator('[data-cm-row="'+id+'"]').click();
 await page.evaluate(()=>{tableRecentWindow=5;tableParityFilter='even';tableMarkedNumbers.add(5);cmReduce=3;cmEmpty=2;cmTemperature=true;cmReverse=true;cmTrg=true;renderTableDrawer();});
 await page.evaluate(()=>{const el=document.querySelector('.cm-scroll');el.scrollTop=250;el.scrollLeft=12;document.querySelector('#tableDrawerBody').scrollTop=100;window.testToolbar=document.querySelector('.cm-toolbar');window.testRange=document.querySelector('#cmReduce');window.testRow=document.querySelector('.cm-inline-a.active');});
 const state=()=>page.evaluate(()=>({open:cmOpen,table:!document.querySelector('#tableDrawer').classList.contains('hidden'),numbers:cmNumbers,individual:[...cmIndividual],count:cmCount,reverse:cmReverse,reduce:cmReduce,empty:cmEmpty,temp:cmTemperature,trg:cmTrg,parity:tableParityFilter,recent:tableRecentWindow,marked:[...tableMarkedNumbers],width:document.querySelector('.cm-table').getBoundingClientRect().width,bodyScroll:document.querySelector('#tableDrawerBody').scrollTop}));
 const before=await state();
 // Let the actual 10-second timer deliver the next draw; keep the table open.
 count=101;await page.waitForFunction(latest=>DRAWS.at(-1).draw===latest,tail[100].draw,{timeout:20000});
 assert.deepEqual(await state(),before);
 assert(await page.evaluate(()=>window.testToolbar===document.querySelector('.cm-toolbar')&&window.testRange===document.querySelector('#cmReduce')&&window.testRow===document.querySelector('.cm-inline-a.active')),'matrix controls remain mounted');
 assert(await page.locator('[data-cm-draw="'+tail[100].draw+'"]').count());
 assert(await page.locator('[data-tdraw="'+tail[100].draw+'"]').count());
 assert.match(await page.locator('#dbline').textContent(),new RegExp(String(tail[100].draw)));
 const scroll=await page.locator('.cm-scroll').evaluate(el=>[el.scrollTop,el.scrollLeft]);
 // A published app build must not reload an open table or discard its A controls.
 nextBuild='0123456789ab';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(build=>sessionStorage.getItem('combo-app-reloaded:'+location.pathname+':'+build)==='1',nextBuild);
 assert.deepEqual(await state(),before);assert.deepEqual(await page.locator('.cm-scroll').evaluate(el=>[el.scrollTop,el.scrollLeft]),scroll);
 assert(await page.evaluate(()=>window.testToolbar===document.querySelector('.cm-toolbar')&&window.testRange===document.querySelector('#cmReduce')&&window.testRow===document.querySelector('.cm-inline-a.active')));
 await page.evaluate(()=>refreshAllFromTable());assert.deepEqual(await state(),before);assert.deepEqual(await page.locator('.cm-scroll').evaluate(el=>[el.scrollTop,el.scrollLeft]),scroll);
 assert.match(await page.locator('#comboToast').textContent(),/^Новых тиражей нет\. Последний №\d+/);assert.equal(dialogs.length,0,'no blocking dialogs');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'refresh notice never widens the page');
 count=102;await page.evaluate(()=>refreshAllFromTable());assert.deepEqual(await state(),before);
 assert.equal(await page.evaluate(()=>DRAWS.at(-1).draw),tail[101].draw);
 // Recover a failed request and catch up multiple draws without losing table state.
 statusFailure=true;await page.evaluate(()=>autoRefreshLive(true));assert.deepEqual(await state(),before);
 assert.equal(await page.evaluate(()=>DRAWS.at(-1).draw),tail[101].draw);
 statusFailure=false;count=105;await page.evaluate(()=>autoRefreshLive(true));
 assert.deepEqual(await state(),before);
 assert.deepEqual(await page.evaluate(()=>({count:DRAWS.length,unique:new Set(DRAWS.map(d=>d.draw)).size,last:DRAWS.at(-1).draw})),{count:105,unique:105,last:tail[104].draw});
 await page.locator('#closeTableDrawer').click();await page.locator('.nav[data-sec="any"]').click();
 const active=await page.locator('.nav[data-sec="any"]').getAttribute('class');
 count=106;await page.locator('#refreshBtn').click();await page.waitForFunction(latest=>DRAWS.at(-1).draw===latest,tail[105].draw);
 assert.equal(await page.locator('.nav[data-sec="any"]').getAttribute('class'),active);
 assert.equal(navigations,1,'no refresh navigates or reloads');assert.deepEqual(errors,[]);
 assert(historyRequests>=4&&statusRequests>=4);
 console.log('PASS real browser: timer + manual updates, published app build, outage recovery, multi-draw catch-up without duplicates, matrix A states, filters, controls, width, scroll, no navigation or JS errors');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
