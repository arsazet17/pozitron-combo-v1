from pathlib import Path

p = Path('k7-interval-builder.html')
s = p.read_text(encoding='utf-8')

if 'LAB v1.5' not in s:
    raise SystemExit('Expected LAB v1.5 not found')
s = s.replace('LAB v1.5', 'LAB v1.6', 1)

css_marker = '</style>'
css = '''
.sectionToggle{float:right;margin:-2px 0 8px 8px;padding:7px 9px;border-radius:9px;background:#0a1c2d;border:1px solid #355a76;color:#d9e8f3;font-size:10px;font-weight:900;line-height:1;white-space:nowrap}
.card.collapsed{padding-bottom:10px}
.card.collapsed > *:not(.sectionToggle):not(.sectionTitleKeep){display:none!important}
.card.collapsed .sectionToggle{margin-bottom:0}
.sectionTitleKeep{display:inline-block;max-width:70%}
@media(max-width:520px){.sectionToggle{font-size:9px;padding:7px 8px}.sectionTitleKeep{max-width:64%}}
'''
if css_marker not in s:
    raise SystemExit('style marker not found')
s = s.replace(css_marker, css + css_marker, 1)

js_marker = "$('build').onclick=build;"
js = '''function initSectionToggles(){
 document.querySelectorAll('.card').forEach(card=>{
   if(card.querySelector(':scope > .sectionToggle'))return;
   const title=card.firstElementChild;
   if(!title)return;
   title.classList.add('sectionTitleKeep');
   const btn=document.createElement('button');
   btn.type='button';btn.className='sectionToggle';btn.textContent='− СВЕРНУТЬ';
   btn.addEventListener('click',()=>{
     const collapsed=card.classList.toggle('collapsed');
     btn.textContent=collapsed?'＋ РАЗВЕРНУТЬ':'− СВЕРНУТЬ';
   });
   card.insertBefore(btn,title.nextSibling);
 });
}
initSectionToggles();
'''
if js_marker not in s:
    raise SystemExit('JS init marker not found')
s = s.replace(js_marker, js + js_marker, 1)

p.write_text(s, encoding='utf-8')
print('K7 LAB v1.6 collapse controls applied')
