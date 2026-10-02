/* COMBO KENO · История свежих · Supabase + УДЛ v2 · 02.10.2026
   Основная история хранится в Supabase и одинакова на всех устройствах.
   Старый localStorage используется только один раз для автоматической миграции.
*/
(() => {
  'use strict';
  if (window.__comboFreshDeleteLoaderV2) return;
  window.__comboFreshDeleteLoaderV2 = true;

  function tracks(){
    try{return Array.isArray(window.ComboCloudFresh?.get?.())?window.ComboCloudFresh.get():[]}
    catch{return[]}
  }

  function installDeletePatch(){
    if (window.__comboFreshHistoryDeleteV2) return;
    window.__comboFreshHistoryDeleteV2 = true;

    if (!document.getElementById('comboFreshHistoryDeleteStyles')) {
      const s = document.createElement('style');
      s.id = 'comboFreshHistoryDeleteStyles';
      s.textContent = `
        #comboSearch .cfsTrackActions{display:flex;align-items:center;gap:6px;justify-content:flex-end}
        #comboSearch .cfsTrackDel{padding:7px 8px;font-size:10px;line-height:1;background:#281520;border-color:#6d3343;color:#ffd2d7;white-space:nowrap;min-width:45px}
        #comboSearch .cfsTrackDel:active{transform:scale(.96)}
        @media(max-width:390px){#comboSearch .cfsTrackActions{gap:4px}#comboSearch .cfsTrackDel,#comboSearch .cfsTrackOpen{padding:7px 6px;font-size:9px}}
      `;
      document.head.appendChild(s);
    }

    let scheduled = false;
    const patch = () => {
      scheduled = false;
      const body = document.getElementById('cfsHistoryBody');
      if (!body) return;
      const rows = [...body.querySelectorAll(':scope > .cfsTrackItem')];
      const a = tracks().sort((x,y)=>Number(y.createdAt||0)-Number(x.createdAt||0));

      rows.forEach((row, i) => {
        if (row.querySelector('.cfsTrackDel')) return;
        const open = row.querySelector('.cfsTrackOpen');
        const t = a[i];
        if (!open || !t || !t.id) return;

        const actions = document.createElement('div');
        actions.className = 'cfsTrackActions';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'cfsTrackDel';
        del.textContent = 'УДЛ';
        del.title = 'Удалить из общей облачной истории свежих';
        del.setAttribute('aria-label','Удалить комбу из общей истории свежих');

        del.onclick = async e => {
          e.preventDefault();
          e.stopPropagation();
          del.disabled = true;
          del.textContent = '…';
          const ok = await window.ComboCloudFresh?.delete?.(t.id);
          if (!ok) {
            del.disabled = false;
            del.textContent = 'УДЛ';
            alert('Не удалось удалить запись из Supabase. Повторите при наличии интернета.');
            return;
          }
          row.remove();
          window.dispatchEvent(new Event('focus'));
          setTimeout(schedulePatch,0);
        };

        open.before(actions);
        actions.appendChild(del);
        actions.appendChild(open);
      });
    };

    const schedulePatch = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(patch);
    };

    const root = document.documentElement;
    if (root) {
      const observer = new MutationObserver(schedulePatch);
      observer.observe(root, {childList:true, subtree:true});
    }
    window.addEventListener('focus', () => setTimeout(schedulePatch, 0));
    window.addEventListener('combo:fresh-cloud', () => setTimeout(schedulePatch, 0));
    schedulePatch();
  }

  function loadBase(){
    if (window.__comboFreshSplitV1) {
      installDeletePatch();
      return;
    }
    const currentSrc = document.currentScript && document.currentScript.src;
    const baseUrl = new URL('combo-fresh-split-v1-base.js?v=20261002-cloud2', currentSrc || location.href);
    const s = document.createElement('script');
    s.src = baseUrl.href;
    s.onload = installDeletePatch;
    s.onerror = () => console.error('COMBO FRESH: не загрузился базовый модуль', baseUrl.href);
    document.head.appendChild(s);
  }

  function ensureCloud(){
    if (window.ComboCloudHistory && window.ComboCloudFresh) {
      Promise.resolve(window.ComboCloudHistory.ready).finally(loadBase);
      return;
    }
    const currentSrc = document.currentScript && document.currentScript.src;
    const cloudUrl = new URL('combo-cloud-sync-v1.js?v=20261002-cloud2', currentSrc || location.href);
    const s = document.createElement('script');
    s.src = cloudUrl.href;
    s.onload = () => Promise.resolve(window.ComboCloudHistory?.ready).finally(loadBase);
    s.onerror = () => {
      console.error('COMBO CLOUD: модуль Supabase не загрузился', cloudUrl.href);
      alert('Облачная история Supabase не загрузилась. История не будет сохраняться локально.');
    };
    document.head.appendChild(s);
  }

  ensureCloud();
})();
