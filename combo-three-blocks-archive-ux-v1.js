/* COMBO KENO · 3 БЛОКА · archive UX v1 · 02.10.2026
   Крупнее шрифт, большая кнопка Открыть/Свернуть, вся строка архива раскрывается по нажатию.
*/
(() => {
  'use strict';
  if (window.__comboThreeBlocksArchiveUXV1) return;
  window.__comboThreeBlocksArchiveUXV1 = true;

  function installCss(){
    if(document.getElementById('comboThreeBlocksArchiveUXStyles')) return;
    const s=document.createElement('style');
    s.id='comboThreeBlocksArchiveUXStyles';
    s.textContent=`
      #comboThreeBlocksRoot .tb4Head{padding:11px 12px}
      #comboThreeBlocksRoot .tb4Head b{font-size:18px!important}
      #comboThreeBlocksRoot .tb4Head small{font-size:11px!important;line-height:1.35}
      #comboThreeBlocksRoot .tb4Body{padding:9px!important;gap:9px!important}
      #comboThreeBlocksRoot .tb4Target{font-size:12px!important;line-height:1.35;padding:8px 10px!important}
      #comboThreeBlocksRoot .tb4Title{font-size:13px!important}
      #comboThreeBlocksRoot .tb4Badge{font-size:9.5px!important;padding:3px 6px!important}
      #comboThreeBlocksRoot .tb4Metric{font-size:10px!important;padding:6px!important}
      #comboThreeBlocksRoot .tb4Metric b{font-size:12px!important;margin-top:2px}
      #comboThreeBlocksRoot .tb4Prob{font-size:10.5px!important;line-height:1.3}
      #comboThreeBlocksRoot .tb4Label{font-size:10.5px!important}
      #comboThreeBlocksRoot .tb4Chip{font-size:10px!important;padding:4px 6px!important}
      #comboThreeBlocksRoot .tb4Combo{font-size:10px!important;grid-template-columns:42px 1fr auto!important;min-height:24px}
      #comboThreeBlocksRoot .tb4Btn{font-size:9px!important;padding:4px 7px!important}
      #comboThreeBlocksRoot .tb4FooterNote{font-size:9.5px!important;margin-top:4px}
      #comboThreeBlocksRoot .tb4CommonHead b{font-size:12px!important}
      #comboThreeBlocksRoot .tb4Filter{font-size:10px!important;padding:7px 10px!important;min-height:34px}
      #comboThreeBlocksRoot .tb4Cloud{font-size:10.5px!important;line-height:1.35}
      #comboThreeBlocksRoot .tb4Open{font-size:10px!important;padding:7px 9px!important;min-width:72px!important;background:#123b59;border-color:#3c7ca8;color:#e9f7ff}
      #comboThreeBlocksRoot .tb4Del{font-size:10px!important;padding:7px 9px!important;min-width:46px!important}
      #comboThreeBlocksRoot .tb4Detail{padding:8px!important;gap:7px!important}
      #comboThreeBlocksRoot .tb4DetailSec{padding:8px!important}
      #comboThreeBlocksRoot .tb4DetailTitle{font-size:11px!important;margin-bottom:5px}
      #comboThreeBlocksRoot .tb4Fact{font-size:10.5px!important;line-height:1.45}
      #comboThreeBlocksRoot .tb4More{font-size:10.5px!important;padding:8px 10px!important}
      #comboThreeBlocksRoot .tb4NoRows{font-size:11px!important}

      @media(max-width:500px){
        #comboThreeBlocksRoot .tb4Blocks{gap:4px!important}
        #comboThreeBlocksRoot .tb4Block{padding:6px!important}
        #comboThreeBlocksRoot .tb4Title{font-size:11.5px!important}
        #comboThreeBlocksRoot .tb4Badge{font-size:8.5px!important;padding:3px 4px!important}
        #comboThreeBlocksRoot .tb4Metric{font-size:9px!important;padding:5px 4px!important}
        #comboThreeBlocksRoot .tb4Metric b{font-size:10.5px!important}
        #comboThreeBlocksRoot .tb4Prob{font-size:9.5px!important}
        #comboThreeBlocksRoot .tb4Label{font-size:9.5px!important}
        #comboThreeBlocksRoot .tb4Chip{font-size:9px!important;padding:3px 4px!important}
        #comboThreeBlocksRoot .tb4Combo{font-size:9px!important;grid-template-columns:37px 1fr auto!important}
        #comboThreeBlocksRoot .tb4FooterNote{font-size:9px!important}

        #comboThreeBlocksRoot .tb4Table{gap:7px!important}
        #comboThreeBlocksRoot .tb4Row.head{display:none!important}
        #comboThreeBlocksRoot .tb4Table>div:not(.tb4Row){border:1px solid #294f6b;border-radius:10px;background:#081827;overflow:hidden}
        #comboThreeBlocksRoot .tb4Table>div:not(.tb4Row)>.tb4Row{border:0!important;border-radius:0!important}
        #comboThreeBlocksRoot .tb4Row:not(.head){
          display:grid!important;
          grid-template-columns:auto 1fr auto!important;
          grid-template-areas:
            'open draw del'
            'time time time'
            'b1 b2 b3'
            'combo combo result'
            'fact fact result'!important;
          gap:6px!important;
          padding:8px!important;
          font-size:10px!important;
          cursor:pointer;
        }
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(1){grid-area:open}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(2){grid-area:draw;font-size:12px;font-weight:950;align-self:center}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(3){grid-area:time;color:#9fb6c7;font-size:10.5px}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(4){grid-area:b1}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(5){grid-area:b2}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(6){grid-area:b3}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(7){grid-area:combo;font-size:10.5px;color:#d8e7f2;line-height:1.35}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(8){grid-area:fact;font-size:10.5px;color:#b9cddd}
        #comboThreeBlocksRoot .tb4Row:not(.head)>span:nth-child(9){grid-area:result;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:5px;font-size:10.5px;font-weight:900;min-width:66px}
        #comboThreeBlocksRoot .tb4State{font-size:9.5px!important;padding:5px 6px!important;display:block}
        #comboThreeBlocksRoot .tb4Open{min-width:82px!important;min-height:34px}
        #comboThreeBlocksRoot .tb4Del{min-height:34px}
        #comboThreeBlocksRoot .tb4Detail{margin:0 7px 8px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function patchButtons(root){
    root.querySelectorAll('.tb4Open').forEach(b=>{
      const raw=(b.textContent||'').trim();
      const isOpen=raw==='−'||raw==='Свернуть';
      const wanted=isOpen?'Свернуть':'Открыть';
      if(raw!==wanted)b.textContent=wanted;
      b.setAttribute('aria-label',wanted+' запись архива');
    });
  }

  function installRowTap(root){
    if(root.dataset.archiveUxTap==='1') return;
    root.dataset.archiveUxTap='1';
    root.addEventListener('click',e=>{
      if(e.target.closest('button')) return;
      const row=e.target.closest('.tb4Row:not(.head)');
      if(!row) return;
      const btn=row.querySelector('.tb4Open');
      if(btn) btn.click();
    });
  }

  function apply(){
    installCss();
    const root=document.getElementById('comboThreeBlocksRoot');
    if(!root)return;
    installRowTap(root);
    patchButtons(root);
  }

  let queued=false;
  function schedule(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  function boot(){
    apply();
    const root=document.getElementById('comboThreeBlocksRoot');
    if(root){new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}
    window.addEventListener('combo:three-blocks-cloud',schedule);
    window.addEventListener('focus',schedule);
    setTimeout(schedule,300);setTimeout(schedule,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
