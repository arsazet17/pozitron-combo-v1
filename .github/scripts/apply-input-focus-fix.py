from pathlib import Path
import re

p = Path("index.html")
text = p.read_text(encoding="utf-8")
pattern = re.compile(r'function renderFields\(prefix\)\{.*?\}\nfunction bindParams\(root=document\)', re.S)
replacement = '''function renderFields(prefix){
  const box=$(prefix+'Fields');
  if(!box)return;
  const active=document.activeElement;
  if(active && box.contains(active) && active.matches('input[data-f]')) return;
  let h='';
  if(filter.mode==='one')h=`<label class="wide">Номер тиража<input data-f="one" type="number" value="${filter.one}"></label>`;
  if(filter.mode==='date')h=`<label class="wide">Дата<input data-f="date" type="date" value="${filter.date}"></label>`;
  if(filter.mode==='dates')h=`<label>От<input data-f="fromDate" type="date" value="${filter.fromDate}"></label><label>До<input data-f="toDate" type="date" value="${filter.toDate}"></label>`;
  if(filter.mode==='last')h=`<label class="wide">Количество тиражей<input data-f="count" type="number" min="1" max="${DRAWS.length||31027}" value="${filter.count}"></label>`;
  if(filter.mode==='range')h=`<label>С №<input data-f="fromDraw" type="number" value="${filter.fromDraw}"></label><label>По №<input data-f="toDraw" type="number" value="${filter.toDraw}"></label>`;
  box.innerHTML=h;
  box.querySelectorAll('[data-f]').forEach(el=>el.oninput=()=>{
    filter[el.dataset.f]=el.value;
    document.querySelectorAll('[id$="ModeLabel"]').forEach(x=>x.textContent=modeLabel());
  });
}
function bindParams(root=document)'''
new_text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("ERROR: renderFields block not found exactly once")
assert new_text.count("function renderFields(prefix)") == 1
assert "const active=document.activeElement;" in new_text
p.write_text(new_text, encoding="utf-8")
bad=Path("index.html.patch")
if bad.exists(): bad.unlink()
print("OK")
