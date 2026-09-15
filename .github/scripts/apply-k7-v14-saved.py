from pathlib import Path
import re

p = Path('k7-interval-builder.html')
s = p.read_text(encoding='utf-8')

if 'LAB v1.3' not in s:
    raise SystemExit('Expected LAB v1.3 not found')
s = s.replace('LAB v1.3', 'LAB v1.4', 1)

old_help = '<div class="muted">Копировать ничего не нужно. Нажмите <b>«ПРОВЕРИТЬ ЭТУ K7»</b> — ниже автоматически откроется её история 7/7.</div>'
new_help = '<div class="muted">Для наблюдения вперёд нажмите <b>«СОХРАНИТЬ K7»</b>. В отдельный архив попадут только сохранённые вручную комбинации. «ПРОВЕРИТЬ ЭТУ K7» показывает прошлую историю 7/7.</div>'
if old_help not in s:
    raise SystemExit('Ready-K7 help not found')
s = s.replace(old_help, new_help, 1)

archive_card = '''\n <div class="card" id="savedCard">\n  <b>📚 Архив сохранённых K7</b>\n  <div class="muted">Сюда попадают <b>только K7, которые вы сами сохранили</b>. Отсчёт начинается со следующего тиража после сохранения. При каждом обновлении архива карточка сама пересчитывает новые тиражи, выигрыши и повторные 7/7.</div>\n  <div class="notice">Архив пока лабораторный и хранится в браузере этого устройства. В основное COMBO ничего не встроено.</div>\n  <div id="savedArchive" class="savedArchive"></div>\n </div>\n'''
marker = ''' <div class="card checkCard" id="checkCard">'''
if marker not in s:
    raise SystemExit('checkCard marker not found')
s = s.replace(marker, archive_card + '\n' + marker, 1)

css = '''\n.savedArchive{display:grid;gap:9px;margin-top:10px}.savedEmpty{padding:11px;border:1px dashed #3a5d77;border-radius:11px;color:#9fb4c5;font-size:12px}.savedItem{border:1px solid #315775;background:#071827;border-radius:13px;padding:10px}.savedTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.savedTitle{font-size:16px;font-weight:950}.savedMeta{font-size:10px;color:#9fb4c5;line-height:1.45;margin-top:3px}.savedStats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.savedStat{background:#0a2134;border:1px solid #294b66;border-radius:9px;padding:7px;text-align:center}.savedStat b{display:block;font-size:16px;color:#7ff158}.savedStat span{font-size:9px;color:#9fb4c5}.hitDist{margin-top:8px;padding:7px 8px;border-radius:9px;background:#0a1b2b;border:1px solid #284a65;font-size:10px;color:#c9d8e4;line-height:1.5}.savedActions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.danger{background:#35131a;border-color:#7b3544;color:#ffc0c8}.saveBtn.saved{background:#153a22;border-color:#3b8850;color:#9af274}.wins{margin-top:8px}.wins summary{cursor:pointer;font-weight:900;color:#ffd15d}.winRow{display:grid;grid-template-columns:52px 1fr auto;gap:6px;padding:7px 0;border-top:1px solid #1d3b52;font-size:10px}.winRow:first-of-type{margin-top:5px}.winHit{font-weight:950;color:#7ff158}.winMoney{font-weight:950;color:#ffd15d;white-space:nowrap}.full7tag{display:inline-block;margin-left:5px;padding:1px 5px;border-radius:6px;background:#4c2b08;border:1px solid #9b6b1a;color:#ffe29b;font-size:9px}.savedNums{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}.savedNums .n{padding:5px 6px}\n'''
s = s.replace('</style>', css + '</style>', 1)

old_globals = "let DRAWS=[],STATS=[],CURRENT_DRAWS=[],MATRIX_MODE='strict';"
new_globals = "const K7_SAVED_KEY='k7IntervalLabSavedV1';\nlet DRAWS=[],STATS=[],CURRENT_DRAWS=[],MATRIX_MODE='strict',PAYOUT7={0:150,3:100,4:200,5:1200,6:10000,7:250000};"
if old_globals not in s:
    raise SystemExit('globals marker not found')
s = s.replace(old_globals, new_globals, 1)

helpers = r'''
function readSaved(){
 try{const v=JSON.parse(localStorage.getItem(K7_SAVED_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}
}
function writeSaved(a){localStorage.setItem(K7_SAVED_KEY,JSON.stringify(a))}
function savedKey(nums){return [...nums].sort((a,b)=>a-b).join('-')}
function isSaved(nums){const k=savedKey(nums);return readSaved().some(x=>x.key===k)}
function saveK7(nums){
 const a=readSaved(),key=savedKey(nums);if(a.some(x=>x.key===key))return false;
 const last=DRAWS[DRAWS.length-1];if(!last)return false;
 a.unshift({key,nums:[...nums].sort((a,b)=>a-b),savedDraw:Number(last.draw),savedDate:last.date||'',savedTime:last.time||'',savedColumn:drawCol(last),savedAt:Date.now()});
 writeSaved(a);renderSavedArchive();renderCombos(LAST_COMBOS);return true;
}
function removeSaved(key){writeSaved(readSaved().filter(x=>x.key!==key));renderSavedArchive();renderCombos(LAST_COMBOS)}
function hitCount(nums,d){const set=new Set((d.balls||[]).map(Number));return nums.reduce((a,n)=>a+(set.has(n)?1:0),0)}
function rub(n){return Number(n||0).toLocaleString('ru-RU')+' ₽'}
function renderSavedArchive(){
 const box=$('savedArchive');if(!box)return;
 const saved=readSaved();
 if(!saved.length){box.innerHTML='<div class="savedEmpty">Пока ничего не сохранено. Нажмите «💾 СОХРАНИТЬ K7» у нужной комбинации.</div>';return}
 box.innerHTML=saved.map(item=>{
   const idx=DRAWS.findIndex(d=>Number(d.draw)===Number(item.savedDraw));
   const future=idx>=0?DRAWS.slice(idx+1):DRAWS.filter(d=>Number(d.draw)>Number(item.savedDraw));
   const dist=Array(8).fill(0),wins=[];
   future.forEach((d,j)=>{const h=hitCount(item.nums,d);dist[h]++;const pay=Number(PAYOUT7[h]||0);if(pay>0)wins.push({d,h,pay,after:j+1})});
   const sum=wins.reduce((a,x)=>a+x.pay,0),full7=wins.filter(x=>x.h===7);
   const distText=dist.map((v,h)=>`${h}/7: ${v}`).join(' · ');
   const winRows=wins.length?wins.slice().reverse().map(w=>`<div class="winRow"><div class="winHit">+${w.after}</div><div>№${w.d.draw} · ${w.d.date} <b>${w.d.time}</b> · ст${drawCol(w.d)} · <b>${w.h}/7</b>${w.h===7?'<span class="full7tag">7/7</span>':''}</div><div class="winMoney">${rub(w.pay)}</div></div>`).join(''):'<div class="muted" style="margin-top:6px">После сохранения выигрышных тиражей пока нет.</div>';
   return `<div class="savedItem"><div class="savedTop"><div><div class="savedTitle">${item.nums.map(fmt).join(' ')}</div><div class="savedMeta">Сохранена после №${item.savedDraw} · ${item.savedDate} ${item.savedTime} · ст${item.savedColumn}. Отсчёт — со следующего тиража.</div></div></div><div class="savedNums">${item.nums.map(n=>`<span class="n">${fmt(n)}</span>`).join('')}</div><div class="savedStats"><div class="savedStat"><b>${future.length}</b><span>ТИРАЖЕЙ ПОСЛЕ</span></div><div class="savedStat"><b>${wins.length}</b><span>ВЫИГРЫШНЫХ</span></div><div class="savedStat"><b>${full7.length}</b><span>ПОЛНЫХ 7/7</span></div></div><div class="hitDist">${distText}<br><b>Сумма выигрышей:</b> ${rub(sum)}</div><details class="wins"><summary>🔥 Выигрышные выходы (${wins.length})</summary>${winRows}</details><div class="savedActions"><button data-saved-check="${item.key}" class="gold">🔎 ПРОВЕРИТЬ ИСТОРИЮ</button><button data-remove-saved="${item.key}" class="danger">✕ УДАЛИТЬ</button></div></div>`
 }).join('');
 document.querySelectorAll('[data-remove-saved]').forEach(b=>b.onclick=()=>removeSaved(b.dataset.removeSaved));
 document.querySelectorAll('[data-saved-check]').forEach(b=>b.onclick=()=>{const nums=b.dataset.savedCheck.split('-').map(Number);$('k7').value=nums.map(fmt).join(' ');checkK7(nums);$('checkCard').scrollIntoView({behavior:'smooth',block:'start'})});
}
'''
insert_before = 'function renderCombos(combos){'
if insert_before not in s:
    raise SystemExit('renderCombos marker not found')
s = s.replace(insert_before, 'let LAST_COMBOS=[];\n' + helpers + '\n' + insert_before, 1)

new_render = r'''function renderCombos(combos){
 LAST_COMBOS=combos||[];
 const by=Object.fromEntries(STATS.map(s=>[s.n,s]));
 $('combos').innerHTML=LAST_COMBOS.map((c,i)=>{
   const details=c.nums.map(n=>`${fmt(n)}: инт${by[n].cur}/С${by[n].strictHits}/М${by[n].softHits}/F${(by[n].freq*100).toFixed(0)}%`).join(' · ');
   const full7=CURRENT_DRAWS.filter(d=>c.nums.every(n=>(d.balls||[]).map(Number).includes(n))).length;
   const saved=isSaved(c.nums);
   return `<div class="combo"><div class="comboTop"><div><b>K7-${i+1}</b><div class="badge">рейтинг ${c.avgScore.toFixed(1)} · пары ${(c.pairPct*100).toFixed(1)}% · столбов ${c.cols}/7 · полных 7/7 в окне: <b>${full7}</b></div></div></div><div class="nums" style="margin-top:7px">${c.nums.map(n=>`<span class="n">${fmt(n)}</span>`).join('')}</div><div class="detail">${details}</div><div class="comboBtns"><button data-save="${c.key}" class="ghost saveBtn ${saved?'saved':''}" ${saved?'disabled':''}>${saved?'✅ СОХРАНЕНА':'💾 СОХРАНИТЬ K7'}</button><button data-check="${c.key}" class="gold">🔎 ПРОВЕРИТЬ ЭТУ K7</button></div></div>`
 }).join('');
 document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const nums=b.dataset.save.split('-').map(Number);saveK7(nums)});
 document.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{
   const nums=b.dataset.check.split('-').map(Number);
   $('k7').value=nums.map(fmt).join(' ');
   checkK7(nums);
   $('checkCard').scrollIntoView({behavior:'smooth',block:'start'});
 });
}'''
s, n = re.subn(r'function renderCombos\(combos\)\{.*?\n\}\n\nfunction build\(\)', new_render + '\n\nfunction build()', s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'renderCombos replacement count={n}')

old_build_tail = "renderRank();renderCombos(combos);renderMatrix();"
new_build_tail = "renderRank();renderCombos(combos);renderSavedArchive();renderMatrix();"
if old_build_tail not in s:
    raise SystemExit('build render marker not found')
s = s.replace(old_build_tail,new_build_tail,1)

old_load = "DRAWS=await fetchJSON('combo-history-v1.json');"
new_load = "try{const pp=await fetchJSON('keno-payouts-v1.json');if(pp?.combination?.['7'])PAYOUT7=pp.combination['7']}catch{}\n   DRAWS=await fetchJSON('combo-history-v1.json');"
if old_load not in s:
    raise SystemExit('load marker not found')
s = s.replace(old_load,new_load,1)

if '💾 СОХРАНИТЬ K7' not in s or 'Архив сохранённых K7' not in s or 'K7_SAVED_KEY' not in s:
    raise SystemExit('v1.4 markers missing')

p.write_text(s,encoding='utf-8')
print('K7 LAB v1.4 saved archive patch OK')
