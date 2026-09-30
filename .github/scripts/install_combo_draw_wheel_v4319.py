from pathlib import Path
import re, json

p = Path('combo-search-v1.js')
s = p.read_text(encoding='utf-8')

def must_replace(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'PATCH NOT FOUND: {label}')
    s = s.replace(old, new, 1)

must_replace("const EXT_VERSION='v4.1.31';", "const EXT_VERSION='v4.3.19';", 'extension version')
must_replace("const DETAIL_MIN_DRAWS=5;", "const DETAIL_MIN_DRAWS=1;", 'detail min draws')

old_css = """      .csModes button{padding:9px 3px;font-size:11px}.csDate{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end;margin-top:7px}
"""
new_css = """      .csModes button{padding:9px 3px;font-size:11px}.csDate{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end;margin-top:7px}
      .csWindowWheel{display:grid;grid-template-columns:44px minmax(72px,1fr) 44px 58px;gap:6px;align-items:center;margin-top:7px}.csWheelBtn{height:40px;padding:0;font-size:20px;line-height:1;background:#0a1c2d;border-color:#315b7d}.csWheelValue{height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #315b7d;border-radius:11px;background:#020912;color:#fff;font-size:18px;font-weight:950;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 1px rgba(53,169,255,.08)}.csWheelMax{height:40px;padding:0 5px;font-size:10px;background:#102a43;border-color:#315b7d}.csWheelHint{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.25}.csRange{width:100%;accent-color:var(--green);margin:6px 0 2px;height:22px;touch-action:pan-x}
"""
must_replace(old_css, new_css, 'wheel css')

old_detail_css = ".csDrawCount{display:flex;align-items:center;gap:5px;margin-left:auto;font-size:11px;color:var(--muted);font-weight:850}.csDrawCount input{width:72px;background:#061421;color:#fff;border:1px solid #315b7d;border-radius:9px;padding:8px 7px;text-align:center;font-weight:900}"
new_detail_css = ".csDrawCount{display:flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;color:var(--muted);font-weight:850}.csDetailCounter{display:grid;grid-template-columns:34px 54px 34px 48px;gap:4px;align-items:center}.csDetailCounter button{height:34px;padding:0;font-size:18px;border-radius:9px;background:#0a1c2d}.csDetailCounter .csWheelValue{height:34px;font-size:15px;border-radius:9px}.csDetailCounter .csWheelMax{font-size:9px}.csDetailRange{flex:1 1 100%;width:100%}"
must_replace(old_detail_css, new_detail_css, 'detail counter css')

old_modes = '''        <div class="csModes" id="csWindowModes">
          <button type="button" data-csw="5">5</button>
          <button type="button" class="active" data-csw="10">10</button>
          <button type="button" data-csw="20">20</button>
          <button type="button" data-csw="60">60</button>
        </div>
'''
new_modes = old_modes + '''        <div class="csWindowWheel" id="csWindowWheel">
          <button id="csWindowMinus" class="csWheelBtn" type="button" aria-label="Минус один тираж">−</button>
          <div id="csWindowValue" class="csWheelValue" aria-live="polite">10</div>
          <button id="csWindowPlus" class="csWheelBtn" type="button" aria-label="Плюс один тираж">+</button>
          <button id="csWindowMax" class="csWheelMax" type="button">MAX</button>
        </div>
        <input id="csWindowRange" class="csRange" type="range" min="1" max="100" value="10" aria-label="Количество тиражей">
        <div class="csWheelHint">Можно выбрать любое число тиражей: − / +, ползунок или MAX = весь доступный архив.</div>
'''
must_replace(old_modes, new_modes, 'search wheel html')

anchor = '''  function setActive(box,attr,val){
    box?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.getAttribute(attr))===Number(val)));
  }

'''
helper = anchor + '''  function archiveDrawCount(){
    if(typeof DRAWS!=='undefined'&&Array.isArray(DRAWS)&&DRAWS.length)return DRAWS.length;
    if(Array.isArray(state.draws)&&state.draws.length)return state.draws.length;
    return Math.max(1,Number(state.window)||10);
  }

  function clampDrawCount(v,max=archiveDrawCount()){
    v=Math.floor(Number(v));
    if(!Number.isFinite(v))v=1;
    return Math.max(1,Math.min(Math.max(1,max),v));
  }

  function syncWindowWheel(){
    const max=archiveDrawCount();
    state.window=clampDrawCount(state.window,max);
    if(q('csWindowValue'))q('csWindowValue').textContent=String(state.window);
    const range=q('csWindowRange');
    if(range){range.max=String(max);range.value=String(state.window)}
    if(q('csWindowMinus'))q('csWindowMinus').disabled=state.window<=1;
    if(q('csWindowPlus'))q('csWindowPlus').disabled=state.window>=max;
    setActive(q('csWindowModes'),'data-csw',state.window);
  }

  function chooseWindow(v,auto=false){
    state.window=clampDrawCount(v);
    state.date='';
    if(q('csDateInput'))q('csDateInput').value='';
    syncWindowWheel();
    if(auto)scheduleAutoRun();
    else clearOldResult(`Выбрано ${state.window} тиражей — нажмите «НАЙТИ КОМБЫ».`);
  }

'''
must_replace(anchor, helper, 'window helpers')

pattern = r"  async function buildCandidates\(draws,k\)\{.*?\n  \}\n\n  function pickDiverse"
m = re.search(pattern, s, re.S)
if not m:
    raise SystemExit('PATCH NOT FOUND: buildCandidates')
new_build = '''  async function buildCandidates(draws,k){
    const freq=Array(81).fill(0);
    for(const d of draws)for(const n of d.balls)freq[n]++;

    // Большие окна считаем в облегчённом режиме, но итоговые кандидаты
    // проверяем по всему выбранному отрезку.
    const n=draws.length;
    const extra=n<=120?4:n<=500?3:n<=3000?2:1;
    const pool=new Map();
    for(let di=0;di<draws.length;di++){
      const d=draws[di];
      const ranked=[...d.balls].sort((a,b)=>freq[b]-freq[a]||a-b);
      const core=ranked.slice(0,Math.min(ranked.length,k+extra));
      combinations(core,k,nums=>{
        const key=comboKey(nums),old=pool.get(key);
        if(old)old.seedFull++;
        else pool.set(key,{nums,seedFull:1});
      });
      if(di%24===0)await new Promise(r=>setTimeout(r,0));
    }

    let seeds=[...pool.values()];
    const evalLimit=n<=120?Infinity:n<=500?8000:n<=3000?2500:n<=12000?900:350;
    if(Number.isFinite(evalLimit)&&seeds.length>evalLimit){
      const fsum=x=>x.nums.reduce((z,a)=>z+freq[a],0);
      seeds.sort((a,b)=>b.seedFull-a.seedFull||fsum(b)-fsum(a)||comboKey(a.nums).localeCompare(comboKey(b.nums)));
      seeds=seeds.slice(0,evalLimit);
    }

    const sets=draws.map(d=>new Set(d.balls));
    const rows=[];
    let i=0;
    for(const seed of seeds){
      const nums=seed.nums;
      let full=0,sum=0,withHit=0,near=0,run=0,maxRun=0;
      const hits=[];
      for(const ds of sets){
        let h=0;for(const x of nums)if(ds.has(x))h++;
        hits.push(h);sum+=h;
        if(h===k)full++;
        if(h>0){withHit++;run++;if(run>maxRun)maxRun=run}else run=0;
        if(h>=k-1)near++;
      }
      if(full>0){
        const score=full*10000+near*500+sum*20+withHit*5+maxRun;
        rows.push({nums,full,sum,withHit,near,maxRun,hits,score});
      }
      if(++i%120===0)await new Promise(r=>setTimeout(r,0));
    }
    rows.sort((a,b)=>b.score-a.score||b.full-a.full||b.sum-a.sum||comboKey(a.nums).localeCompare(comboKey(b.nums)));
    return{rows,poolSize:pool.size,evaluated:seeds.length,scalable:seeds.length<pool.size};
  }

  function pickDiverse'''
s = s[:m.start()] + new_build + s[m.end():]

detail_old = '<label class="csDrawCount">Тиражей <input id="csDrawCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${count}" aria-label="Количество тиражей"></label>'
detail_new = '<div class="csDrawCount"><span>Тиражей</span><div class="csDetailCounter"><button id="csDrawMinus" type="button" aria-label="Минус один тираж">−</button><div id="csDrawValue" class="csWheelValue">${count}</div><button id="csDrawPlus" type="button" aria-label="Плюс один тираж">+</button><button id="csDrawMax" class="csWheelMax" type="button">MAX</button></div></div><input id="csDrawRange" class="csRange csDetailRange" type="range" min="1" max="${Math.max(1,archive.length)}" value="${count}" aria-label="Количество показанных тиражей">'
must_replace(detail_old, detail_new, 'detail wheel html')

old_handlers = '''      const input=q('csDrawCount');
      const apply=()=>{let v=Math.floor(Number(input.value));if(!Number.isFinite(v)||v<DETAIL_MIN_DRAWS)v=DETAIL_MIN_DRAWS;count=v;detailDrawCounts.set(key,v);render()};
      input.onchange=apply;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply()}};
'''
new_handlers = '''      const maxCount=Math.max(1,archive.length);
      const setCount=v=>{count=Math.max(DETAIL_MIN_DRAWS,Math.min(maxCount,Math.floor(Number(v)||DETAIL_MIN_DRAWS)));detailDrawCounts.set(key,count);render()};
      const minus=q('csDrawMinus'),plus=q('csDrawPlus'),maxBtn=q('csDrawMax'),range=q('csDrawRange');
      if(minus){minus.disabled=count<=DETAIL_MIN_DRAWS;minus.onclick=()=>setCount(count-1)}
      if(plus){plus.disabled=count>=maxCount;plus.onclick=()=>setCount(count+1)}
      if(maxBtn)maxBtn.onclick=()=>setCount(maxCount);
      if(range){
        range.oninput=e=>{const v=Math.max(DETAIL_MIN_DRAWS,Math.min(maxCount,Math.floor(Number(e.target.value)||DETAIL_MIN_DRAWS)));const out=q('csDrawValue');if(out)out.textContent=String(v)};
        range.onchange=e=>setCount(e.target.value);
      }
'''
must_replace(old_handlers, new_handlers, 'detail wheel handlers')

old_bind = '''    q('csWindowModes')?.querySelectorAll('[data-csw]').forEach(b=>b.onclick=()=>{
      state.window=Number(b.dataset.csw);
      state.date='';
      q('csDateInput').value='';
      setActive(q('csWindowModes'),'data-csw',state.window);
      scheduleAutoRun();
    });
'''
new_bind = '''    q('csWindowModes')?.querySelectorAll('[data-csw]').forEach(b=>b.onclick=()=>chooseWindow(Number(b.dataset.csw),true));
    if(q('csWindowMinus'))q('csWindowMinus').onclick=()=>chooseWindow(state.window-1,false);
    if(q('csWindowPlus'))q('csWindowPlus').onclick=()=>chooseWindow(state.window+1,false);
    if(q('csWindowMax'))q('csWindowMax').onclick=()=>chooseWindow(archiveDrawCount(),false);
    if(q('csWindowRange')){
      q('csWindowRange').oninput=e=>{
        state.window=clampDrawCount(e.target.value);
        state.date='';
        if(q('csDateInput'))q('csDateInput').value='';
        if(q('csWindowValue'))q('csWindowValue').textContent=String(state.window);
        setActive(q('csWindowModes'),'data-csw',state.window);
        clearOldResult(`Выбрано ${state.window} тиражей — нажмите «НАЙТИ КОМБЫ».`);
      };
      q('csWindowRange').onchange=()=>syncWindowWheel();
    }
'''
must_replace(old_bind, new_bind, 'search wheel handlers')

old_status = "      q('csStatus').textContent=`Готово: проверен пул ${built.poolSize.toLocaleString('ru-RU')} реально собиравшихся вариантов. Оставлено ${picked.length} разных комб; почти одинаковые отброшены.`;\n"
new_status = """      q('csStatus').textContent=built.scalable
        ?`Готово: собран пул ${built.poolSize.toLocaleString('ru-RU')} вариантов; подробно проверено ${built.evaluated.toLocaleString('ru-RU')} по всем ${draws.length} выбранным тиражам. Оставлено ${picked.length} разных комб.`
        :`Готово: проверен пул ${built.poolSize.toLocaleString('ru-RU')} реально собиравшихся вариантов. Оставлено ${picked.length} разных комб; почти одинаковые отброшены.`;
"""
must_replace(old_status, new_status, 'scalable status')

old_nav = '''      window.scrollTo({top:0,behavior:'smooth'});
    };
'''
new_nav = '''      syncWindowWheel();
      window.scrollTo({top:0,behavior:'smooth'});
    };
'''
must_replace(old_nav, new_nav, 'sync wheel on nav')

must_replace('    css();addSection();addNav();bind();patchHistoryDismiss();\n', '    css();addSection();addNav();bind();patchHistoryDismiss();syncWindowWheel();\n', 'sync wheel init')

p.write_text(s, encoding='utf-8')

OLD = '4318maxd7a01'
NEW = '4319drawwheel'
for name in ['index.html','sw.js','manifest.webmanifest']:
    fp = Path(name)
    if fp.exists():
        txt = fp.read_text(encoding='utf-8').replace(OLD, NEW)
        if name == 'index.html':
            txt = txt.replace('Версия v4.3.18', 'Версия v4.3.19')
        fp.write_text(txt, encoding='utf-8')

Path('app-version.json').write_text(json.dumps({'version':'4.3.19','build':NEW}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
