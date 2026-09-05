const CACHE='combo-keno-shell-active-table-20260905-1542';
const SHELL=[
 './',
 './index.html',
 './manifest.webmanifest',
 './icon-192.png',
 './icon-512.png',
 './combo-presets-v1.json',
 './keno-payouts-v1.json',
 './combo-search-v1.js'
];

const TABLE_ACTIVE_PATCH="\n;(() => {\n  'use strict';\n\n  const STYLE_ID = 'tableEchoActiveStyles';\n  let tableEchoActive = false;\n  let wrapped = false;\n\n  function ensureStyles(){\n    if(document.getElementById(STYLE_ID)) return;\n    const s=document.createElement('style');\n    s.id=STYLE_ID;\n    s.textContent=`\n      .tableDrawerHead{grid-template-columns:1fr auto auto!important}\n      .tableEchoBtn{\n        padding:5px 10px!important;\n        min-width:72px;\n        background:#0a1c2d!important;\n        border-color:#315b7d!important;\n        color:#cfe0ee!important;\n      }\n      .tableEchoBtn.active{\n        background:linear-gradient(180deg,#2c7d40,#1e5b32)!important;\n        border-color:#55c876!important;\n        color:#fff!important;\n      }\n      .recentDrawNum.tableEcho{\n        color:#fff!important;\n        font-weight:950!important;\n        box-shadow:none!important;\n      }\n      .recentDrawNum.tableEcho.manual{\n        background:linear-gradient(180deg,#6fd33f,#2f9626)!important;\n        box-shadow:0 0 0 1px #8ff75f inset!important;\n      }\n      .recentDrawNum.tableEcho.c1{\n        background:linear-gradient(180deg,#4caf50,#2e7d32)!important;\n        box-shadow:0 0 0 1px #7ce886 inset!important;\n      }\n      .recentDrawNum.tableEcho.c2{\n        background:linear-gradient(180deg,#d8b733,#a68607)!important;\n        box-shadow:0 0 0 1px #f4d85e inset!important;\n      }\n      .recentDrawNum.tableEcho.c3{\n        background:linear-gradient(180deg,#cf5454,#972c2c)!important;\n        box-shadow:0 0 0 1px #ff9292 inset!important;\n      }\n      .recentDrawNum.tableEcho.c4{\n        background:linear-gradient(180deg,#4fc3f7,#1976d2)!important;\n        box-shadow:0 0 0 1px #9be6ff inset!important;\n      }\n      .recentDrawNum.tableEcho.c5{\n        background:linear-gradient(180deg,#3f51b5,#24358f)!important;\n        box-shadow:0 0 0 1px #91a0ff inset!important;\n      }\n      .recentDrawNum.tableEcho.overlap{\n        background:linear-gradient(180deg,#8e44ad,#5e2b78)!important;\n        box-shadow:0 0 0 1px #d4a1ff inset,0 0 0 2px rgba(255,255,255,.12)!important;\n      }\n    `;\n    document.head.appendChild(s);\n  }\n\n  function classForMeta(meta){\n    if(!meta) return '';\n    if(meta.manualColor) return meta.manualColor;\n    if(meta.colors && meta.colors.length>1) return 'overlap';\n    if(meta.colors && meta.colors.length===1) return meta.colors[0];\n    if(meta.manual) return 'manual';\n    return '';\n  }\n\n  function syncButton(){\n    const head=document.querySelector('.tableDrawerHead');\n    if(!head) return;\n    let b=document.getElementById('tableEchoActiveBtn');\n    if(!b){\n      b=document.createElement('button');\n      b.id='tableEchoActiveBtn';\n      b.type='button';\n      b.className='tableEchoBtn';\n      const close=document.getElementById('closeTableDrawer');\n      if(close) head.insertBefore(b,close); else head.appendChild(b);\n      b.onclick=()=>{\n        tableEchoActive=!tableEchoActive;\n        applyEcho();\n      };\n    }\n    b.textContent=tableEchoActive?'Актив ✓':'Актив';\n    b.classList.toggle('active',tableEchoActive);\n    b.setAttribute('aria-pressed',tableEchoActive?'true':'false');\n  }\n\n  function clearEcho(){\n    document.querySelectorAll('.recentDrawNum.tableEcho').forEach(el=>{\n      el.classList.remove('tableEcho','manual','c1','c2','c3','c4','c5','overlap');\n    });\n  }\n\n  function applyEcho(){\n    ensureStyles();\n    syncButton();\n    clearEcho();\n    if(!tableEchoActive) return;\n\n    try{\n      const recent = (typeof getRecentVisibleDraws==='function') ? getRecentVisibleDraws() : [];\n      const numberMap = (typeof getTableNumberMap==='function') ? getTableNumberMap(recent) : new Map();\n\n      document.querySelectorAll('.recentDrawItem').forEach(card=>{\n        card.querySelectorAll('.recentDrawNum').forEach(el=>{\n          const n=Number(el.textContent.trim());\n          const cls=classForMeta(numberMap.get(n));\n          if(cls) el.classList.add('tableEcho',cls);\n        });\n      });\n    }catch(e){\n      console.warn('TABLE ACTIVE ECHO',e);\n    }\n  }\n\n  function wrapRender(){\n    if(wrapped) return;\n    if(typeof renderTableDrawer!=='function') return;\n    const original=renderTableDrawer;\n    renderTableDrawer=function(){\n      const r=original.apply(this,arguments);\n      setTimeout(applyEcho,0);\n      return r;\n    };\n    wrapped=true;\n    applyEcho();\n  }\n\n  const boot=()=>{\n    ensureStyles();\n    wrapRender();\n\n    const observer=new MutationObserver(()=>{\n      if(!wrapped) wrapRender();\n      if(document.querySelector('.tableDrawerHead')) syncButton();\n    });\n    observer.observe(document.documentElement,{subtree:true,childList:true});\n\n    document.addEventListener('click',e=>{\n      if(e.target.closest('[data-twindow],[data-tdraw],[data-tcell],[data-paint],#tableClearAll')){\n        setTimeout(applyEcho,0);\n      }\n    },true);\n  };\n\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});\n  else boot();\n})();\n";

self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
 caches.keys()
  .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;

 const u=new URL(e.request.url);

 if(
  u.pathname.endsWith('/combo-history-v1.json') ||
  u.pathname.endsWith('/combo-status-v1.json')
 ){
  e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));
  return;
 }

 if(u.origin!==self.location.origin)return;

 if(u.pathname.endsWith('/combo-search-v1.js')){
  e.respondWith(
   fetch(new Request(e.request,{cache:'no-store'}))
    .then(async r=>{
      if(!r.ok)return r;
      const text=await r.text();
      return new Response(text+'\n'+TABLE_ACTIVE_PATCH,{
        status:r.status,
        statusText:r.statusText,
        headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}
      });
    })
    .catch(()=>caches.match(e.request))
  );
  return;
 }

 e.respondWith(
  fetch(new Request(e.request,{cache:'no-store'}))
   .then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
   })
   .catch(()=>caches.match(e.request))
 );
});
