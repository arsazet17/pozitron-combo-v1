/* COMBO KENO · История свежих · кнопка УДЛ v1 · 02.10.2026
   Loader: запускает исходный модуль и добавляет удаление отслеживаемой комбы
   прямо из блока «История свежих».
*/
(() => {
  'use strict';
  if (window.__comboFreshDeleteLoaderV1) return;
  window.__comboFreshDeleteLoaderV1 = true;

  const TRACK_KEY = 'comboKenoFreshWatchV1';

  function loadTracks(){
    try {
      const a = JSON.parse(localStorage.getItem(TRACK_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function saveTracks(a){
    try {
      localStorage.setItem(TRACK_KEY, JSON.stringify(a.slice(-100)));
    } catch (e) {
      console.warn('fresh watch delete save', e);
    }
  }

  function installDeletePatch(){
    if (window.__comboFreshHistoryDeleteV1) return;
    window.__comboFreshHistoryDeleteV1 = true;

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
      const tracks = loadTracks().sort((x,y)=>Number(y.createdAt||0)-Number(x.createdAt||0));
      const rows = [...body.querySelectorAll(':scope > .cfsTrackItem')];

      rows.forEach((row, i) => {
        if (row.querySelector('.cfsTrackDel')) return;
        const open = row.querySelector('.cfsTrackOpen');
        const t = tracks[i];
        if (!open || !t || !t.id) return;

        const actions = document.createElement('div');
        actions.className = 'cfsTrackActions';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'cfsTrackDel';
        del.textContent = 'УДЛ';
        del.title = 'Удалить из истории свежих';
        del.setAttribute('aria-label','Удалить комбу из истории свежих');

        del.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          const current = loadTracks();
          const next = current.filter(x => x && x.id !== t.id);
          if (next.length === current.length) return;
          saveTracks(next);
          window.dispatchEvent(new Event('focus'));
          setTimeout(schedulePatch, 0);
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
    schedulePatch();
  }

  function loadBase(){
    if (window.__comboFreshSplitV1) {
      installDeletePatch();
      return;
    }
    const currentSrc = document.currentScript && document.currentScript.src;
    const baseUrl = new URL('combo-fresh-split-v1-base.js?v=20261002-del1', currentSrc || location.href);
    const s = document.createElement('script');
    s.src = baseUrl.href;
    s.onload = installDeletePatch;
    s.onerror = () => console.error('COMBO FRESH: не загрузился базовый модуль', baseUrl.href);
    document.head.appendChild(s);
  }

  loadBase();
})();
