/* COMBO KENO · единое облачное хранение Supabase v1 · 02.10.2026
   Постоянные данные НЕ живут в localStorage.
   Коллекции: fresh_watch, saved_any, three_blocks.
   Старые локальные записи мигрируют в Supabase при первом запуске устройства.
*/
(() => {
  'use strict';
  if (window.__comboCloudSyncV1) return;
  window.__comboCloudSyncV1 = true;

  const ENDPOINT = 'https://oviqrkdkahammpuyreil.supabase.co/functions/v1/combo-history';
  const API_KEY = 'sb_publishable_1m9JJLimTkluI2uS0r5VXA_EF3trjvU';
  const FRESH_KEY = 'comboKenoFreshWatchV1';
  const SAVED_ANY_KEY = 'comboKenoSavedAnyCombosV2';
  const KEY_TO_COLLECTION = new Map([
    [FRESH_KEY, 'fresh_watch'],
    [SAVED_ANY_KEY, 'saved_any'],
  ]);
  const EVENT_BY_COLLECTION = {
    fresh_watch: 'combo:fresh-cloud',
    saved_any: 'combo:saved-any-cloud',
    three_blocks: 'combo:three-blocks-cloud',
  };

  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  const states = new Map();
  const getState = collection => {
    if (!states.has(collection)) states.set(collection, {
      loaded: false,
      items: new Map(),
      pendingUpserts: new Map(),
      pendingDeletes: new Set(),
      busy: false,
      lastError: '',
    });
    return states.get(collection);
  };

  function idFor(collection, item) {
    if (!item || typeof item !== 'object') return '';
    if (collection === 'fresh_watch') return String(item.id || '').trim();
    if (collection === 'saved_any') {
      const nums = Array.isArray(item.nums) ? item.nums.map(Number).filter(Number.isFinite).sort((a,b)=>a-b) : [];
      return nums.length ? nums.join('-') : String(item.key || '').trim();
    }
    if (collection === 'three_blocks') return String(item.id || item.targetDraw || item.target_draw || '').trim();
    return String(item.id || '').trim();
  }

  function normalize(collection, item, forcedId='') {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const out = {...item};
    const id = String(forcedId || idFor(collection, out)).trim();
    if (!id) return null;
    out.id = id;
    if (collection === 'saved_any') {
      const nums = Array.isArray(out.nums) ? out.nums.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80) : [];
      out.nums = [...new Set(nums)].sort((a,b)=>a-b);
      if (!out.nums.length) return null;
      out.key = out.nums.join('-');
      out.createdAt = Number(out.createdAt) || Date.now();
    }
    if (collection === 'fresh_watch') {
      const nums = Array.isArray(out.nums) ? out.nums.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80) : [];
      if (!nums.length) return null;
      out.nums = [...new Set(nums)].sort((a,b)=>a-b);
      out.createdAt = Number(out.createdAt) || Date.now();
    }
    return out;
  }

  function sortedItems(collection) {
    const s = getState(collection);
    return [...s.items.values()].sort((a,b)=>(Number(b.createdAt||b.created_at||b.savedAt||0))-(Number(a.createdAt||a.created_at||a.savedAt||0)));
  }

  function emit(collection) {
    const name = EVENT_BY_COLLECTION[collection];
    if (name) window.dispatchEvent(new CustomEvent(name, {detail:{count:getState(collection).items.size}}));
  }

  async function request(method, collection, id='', payload=null) {
    const qs = new URLSearchParams({collection});
    if (id) qs.set('id', id);
    const opts = {
      method,
      headers: {'content-type':'application/json','apikey':API_KEY},
      cache: 'no-store',
    };
    if (payload !== null) opts.body = JSON.stringify(payload);
    const r = await fetch(`${ENDPOINT}?${qs.toString()}`, opts);
    let data = {};
    try { data = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(data?.detail || data?.error || `HTTP ${r.status}`);
    return data;
  }

  async function fetchRemote(collection) {
    const data = await request('GET', collection);
    const map = new Map();
    for (const row of (data.items || [])) {
      const x = normalize(collection, row?.payload, row?.item_id);
      if (x) map.set(x.id, x);
    }
    return map;
  }

  async function sendUpsert(collection, item) {
    const x = normalize(collection, item);
    if (!x) return false;
    await request('POST', collection, '', {collection, id:x.id, payload:x});
    return true;
  }

  async function sendDelete(collection, id) {
    await request('DELETE', collection, id);
    return true;
  }

  async function upsert(collection, item, {silent=false}={}) {
    const x = normalize(collection, item);
    if (!x) return false;
    const s = getState(collection);
    s.items.set(x.id, x);
    s.pendingDeletes.delete(x.id);
    s.pendingUpserts.set(x.id, x);
    if (!silent) emit(collection);
    try {
      await sendUpsert(collection, x);
      s.pendingUpserts.delete(x.id);
      s.lastError = '';
      return true;
    } catch (e) {
      s.lastError = String(e?.message || e);
      console.error('COMBO cloud upsert', collection, x.id, e);
      return false;
    }
  }

  async function remove(collection, id, {silent=false}={}) {
    id = String(id || '').trim();
    if (!id) return false;
    const s = getState(collection);
    s.items.delete(id);
    s.pendingUpserts.delete(id);
    s.pendingDeletes.add(id);
    if (!silent) emit(collection);
    try {
      await sendDelete(collection, id);
      s.pendingDeletes.delete(id);
      s.lastError = '';
      return true;
    } catch (e) {
      s.lastError = String(e?.message || e);
      console.error('COMBO cloud delete', collection, id, e);
      return false;
    }
  }

  async function flush(collection) {
    const s = getState(collection);
    for (const [id,item] of [...s.pendingUpserts]) {
      try { await sendUpsert(collection,item); s.pendingUpserts.delete(id); } catch (_) {}
    }
    for (const id of [...s.pendingDeletes]) {
      try { await sendDelete(collection,id); s.pendingDeletes.delete(id); } catch (_) {}
    }
  }

  async function refresh(collection, {mergePending=true}={}) {
    const s = getState(collection);
    if (s.busy) return sortedItems(collection);
    s.busy = true;
    try {
      const remote = await fetchRemote(collection);
      if (mergePending) {
        for (const [id,item] of s.pendingUpserts) remote.set(id,item);
        for (const id of s.pendingDeletes) remote.delete(id);
      }
      s.items = remote;
      s.loaded = true;
      s.lastError = '';
      emit(collection);
      return sortedItems(collection);
    } catch (e) {
      s.lastError = String(e?.message || e);
      console.error('COMBO cloud refresh', collection, e);
      return sortedItems(collection);
    } finally {
      s.busy = false;
    }
  }

  function readLegacy(key) {
    try {
      const raw = JSON.parse(nativeGet.call(localStorage, key) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }

  async function migrateCollection(collection, key) {
    const s = getState(collection);
    const legacy = readLegacy(key).map(x=>normalize(collection,x)).filter(Boolean);
    try {
      const remote = await fetchRemote(collection);
      for (const [id,item] of remote) s.items.set(id,item);
      for (const item of legacy) {
        if (!s.items.has(item.id)) {
          s.items.set(item.id,item);
          s.pendingUpserts.set(item.id,item);
        }
      }
      s.loaded = true;
      emit(collection);
      await flush(collection);
      // Локальная постоянная копия больше не нужна: Supabase — источник истины.
      nativeRemove.call(localStorage, key);
      emit(collection);
      return true;
    } catch (e) {
      // Если облако временно недоступно, старые данные остаются в памяти и на диске до успешной миграции.
      for (const item of legacy) s.items.set(item.id,item);
      s.loaded = true;
      s.lastError = String(e?.message || e);
      emit(collection);
      console.error('COMBO cloud migration', collection, e);
      return false;
    }
  }

  // Совместимость со старым кодом: он думает, что пишет в localStorage,
  // но для управляемых ключей запись идёт в Supabase + оперативную память.
  Storage.prototype.getItem = function(key) {
    const collection = this === localStorage ? KEY_TO_COLLECTION.get(String(key)) : null;
    if (!collection) return nativeGet.call(this,key);
    const s = getState(collection);
    if (!s.loaded) return nativeGet.call(this,key);
    return JSON.stringify(sortedItems(collection));
  };

  Storage.prototype.setItem = function(key, value) {
    const collection = this === localStorage ? KEY_TO_COLLECTION.get(String(key)) : null;
    if (!collection) return nativeSet.call(this,key,value);
    let arr = [];
    try { const p=JSON.parse(String(value)); arr=Array.isArray(p)?p:[]; } catch (_) { return; }
    const s = getState(collection);
    const incoming = new Map();
    for (const row of arr) {
      const x = normalize(collection,row);
      if (x) incoming.set(x.id,x);
    }
    if (collection === 'fresh_watch') {
      // Старый модуль делал slice(-100). Здесь НЕ считаем отсутствующие записи удалёнными.
      for (const x of incoming.values()) {
        s.items.set(x.id,x);
        s.pendingUpserts.set(x.id,x);
        void upsert(collection,x,{silent:true});
      }
      emit(collection);
      return;
    }
    if (collection === 'saved_any') {
      // Сохранённые вручную комбы — входящий список авторитетен, поэтому удаление синхронизируется тоже.
      const oldIds = new Set(s.items.keys());
      s.items = incoming;
      for (const x of incoming.values()) void upsert(collection,x,{silent:true});
      for (const id of oldIds) if (!incoming.has(id)) void remove(collection,id,{silent:true});
      emit(collection);
      return;
    }
  };

  Storage.prototype.removeItem = function(key) {
    const collection = this === localStorage ? KEY_TO_COLLECTION.get(String(key)) : null;
    if (!collection) return nativeRemove.call(this,key);
    // Не разрешаем старому коду случайно стереть общий облачный архив целиком.
  };

  window.ComboCloudHistory = {
    ready: null,
    list: async collection => {
      await refresh(collection);
      return sortedItems(collection);
    },
    cached: collection => sortedItems(collection),
    upsert: (collection,id,payload) => upsert(collection,{...payload,id:String(id)}),
    remove: (collection,id) => remove(collection,String(id)),
    refresh,
    status: collection => {
      const s=getState(collection); return {loaded:s.loaded,count:s.items.size,error:s.lastError};
    },
  };

  window.ComboCloudFresh = {
    get: () => sortedItems('fresh_watch'),
    delete: id => remove('fresh_watch',id),
    reload: () => refresh('fresh_watch'),
  };

  async function boot() {
    await Promise.all([
      migrateCollection('fresh_watch',FRESH_KEY),
      migrateCollection('saved_any',SAVED_ANY_KEY),
      refresh('three_blocks'),
    ]);
    try { if (typeof loadSavedAnyCombos === 'function') loadSavedAnyCombos(); } catch (_) {}
    try { if (typeof renderSavedCombos === 'function') renderSavedCombos(); } catch (_) {}
    window.dispatchEvent(new Event('focus'));
    return true;
  }

  const ready = boot();
  window.ComboCloudHistory.ready = ready;

  let pollBusy=false;
  async function syncAll() {
    if (pollBusy || document.hidden || !navigator.onLine) return;
    pollBusy=true;
    try {
      await Promise.all(['fresh_watch','saved_any','three_blocks'].map(async c=>{await flush(c);await refresh(c);}));
      try { if (typeof loadSavedAnyCombos === 'function') loadSavedAnyCombos(); } catch (_) {}
      try { if (typeof renderSavedCombos === 'function') renderSavedCombos(); } catch (_) {}
    } finally { pollBusy=false; }
  }
  window.addEventListener('focus',syncAll);
  window.addEventListener('online',syncAll);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncAll()});
  setInterval(syncAll,30000);
})();
