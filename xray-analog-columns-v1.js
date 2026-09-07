(function(){
'use strict';

function getDraws(){
  try{
    const d=typeof window.getComboDraws==='function'?window.getComboDraws():[];
    return Array.isArray(d)?d:[];
  }catch(e){ return []; }
}

function decorate(){
  const rows=document.querySelectorAll('.xrayAnalogs .xrayAnalogRow');
  if(!rows.length) return;

  const draws=getDraws();
  if(!draws.length) return;

  const byNumber=new Map(draws.map((d,i)=>[Number(d.draw),i]));

  rows.forEach(row=>{
    const b=row.querySelector('b');
    const spans=row.querySelectorAll('span');
    const em=row.querySelector('em');
    if(!b || !spans.length) return;

    const m=(b.textContent||'').match(/(\d+)/);
    if(!m) return;
    const drawNo=Number(m[1]);
    const idx=byNumber.get(drawNo);
    if(idx==null) return;

    const d0=draws[idx];
    const d1=draws[idx+1];
    const d2=draws[idx+2];
    const d3=draws[idx+3];

    const col=x=>{
      const n=Number(x?.column);
      return Number.isFinite(n)&&n>0?String(n):'—';
    };

    // First span remains date/time only. Remove the old "→ №next time" span.
    spans[0].textContent=`${d0?.date||'—'} ${d0?.time||'—'}`;
    if(spans[1]) spans[1].remove();

    let movement=row.querySelector('.xrayAnalogColumns');
    if(!movement){
      movement=document.createElement('span');
      movement.className='xrayAnalogColumns';
      if(em) row.insertBefore(movement,em); else row.appendChild(movement);
    }
    movement.textContent=`ст.${col(d0)} → ${col(d1)} → ${col(d2)} → ${col(d3)}`;
    movement.title='Столб этого похожего тиража → три следующих фактических столба';
  });
}

const style=document.createElement('style');
style.textContent=`
.xrayAnalogRow .xrayAnalogColumns{
  white-space:nowrap;
  font-weight:800;
  letter-spacing:.15px;
  color:#dbeafe;
  margin-left:auto;
  padding:0 8px;
}
@media(max-width:560px){
  .xrayAnalogRow{gap:6px!important}
  .xrayAnalogRow .xrayAnalogColumns{font-size:12px;padding:0 4px}
}
`;
document.head.appendChild(style);

const observer=new MutationObserver(()=>decorate());
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',decorate);
setTimeout(decorate,300);
})();
