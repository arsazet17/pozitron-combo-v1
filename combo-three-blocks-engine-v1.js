/* COMBO KENO · 3 БЛОКА · engine v1.1 · 02.10.2026
   Только новая сетка 66 тиражей/сутки, начиная с №324994.
   После каждого N каждый блок формирует КОНКРЕТНЫЕ числа на N+1 и frozen сохраняется в Supabase.
   Сигнал/нет сигнала влияет на силу режима, но строки больше не остаются пустыми.
*/
(() => {
  'use strict';
  if (window.ComboThreeBlocksEngine) return;

  const NEW_GRID_START = 324994;
  const VERSION = 'TB1.1-2026-10-02';
  let reconcileBusy = false;

  const nums = d => Array.isArray(d?.balls) ? d.balls.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80) : [];
  const setOf = d => new Set(nums(d));
  const overlapCount = (a,b) => { let n=0; for(const x of a) if(b.has(x)) n++; return n; };
  const fmt = n => String(Number(n)).padStart(2,'0');
  const colOf = n => ((Number(n)-1)%10)+1;
  const range4 = n => Math.floor((Number(n)-1)/4);

  function draws(){
    try {
      const a = typeof window.getComboDraws === 'function' ? window.getComboDraws() : (typeof DRAWS!=='undefined'?DRAWS:[]);
      return (Array.isArray(a)?a:[]).filter(d=>Number(d?.draw)>=NEW_GRID_START).slice().sort((x,y)=>Number(x.draw)-Number(y.draw));
    } catch (_) { return []; }
  }

  function addDaysRu(date, days){
    const m=String(date||'').match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
    if(!m)return String(date||'');
    let y=Number(m[3]); if(y<100)y+=2000;
    const dt=new Date(Date.UTC(y,Number(m[2])-1,Number(m[1])));
    dt.setUTCDate(dt.getUTCDate()+days);
    return `${String(dt.getUTCDate()).padStart(2,'0')}.${String(dt.getUTCMonth()+1).padStart(2,'0')}.${String(dt.getUTCFullYear()%100).padStart(2,'0')}`;
  }

  function expectedNextMeta(a, idx){
    const n=a[idx];
    if(!n)return {date:'',time:''};
    if(a[idx+1])return {date:a[idx+1].date||'',time:a[idx+1].time||''};
    for(let i=idx-1;i>=0;i--){
      if(String(a[i]?.time||'')!==String(n.time||''))continue;
      const nx=a[i+1];
      if(!nx)continue;
      const crosses=String(nx.time||'') < String(a[i].time||'');
      return {date:crosses?addDaysRu(n.date,1):(n.date||''),time:nx.time||''};
    }
    return {date:n.date||'',time:''};
  }

  function featureRows(a, idx){
    const n=a[idx], current=nums(n);
    const rangeCounts=new Map(), colCounts=new Map();
    for(const x of current){
      const r=range4(x), c=colOf(x);
      rangeCounts.set(r,(rangeCounts.get(r)||0)+1);
      colCounts.set(c,(colCounts.get(c)||0)+1);
    }
    const history=a.slice(Math.max(0,idx-4),idx+1).map(setOf);
    return current.map(x=>{
      const R=rangeCounts.get(range4(x))||0;
      const C=colCounts.get(colOf(x))||0;
      const D=R*C;
      let F5=0; for(const s of history) if(s.has(x)) F5++;
      return {n:x,R,C,D,F5};
    });
  }

  function sortFeature(a,b){
    return b.D-a.D || b.F5-a.F5 || b.R-a.R || b.C-a.C || a.n-b.n;
  }

  function classifyLevel(interN2,j3){
    if(interN2<=2 && j3>=7)return 'L3';
    if(j3>=7 || interN2>=9)return 'L2';
    if(interN2<=2 && j3<7)return 'L1';
    return 'L0';
  }

  function takeUnique(rows,count){
    const out=[]; const seen=new Set();
    for(const x of rows){
      const n=Number(x?.n??x);
      if(!Number.isInteger(n)||seen.has(n))continue;
      seen.add(n); out.push(n);
      if(out.length>=count)break;
    }
    return out;
  }

  function analyzeAt(a, idx){
    if(idx<4 || !a[idx])return null;
    const N=a[idx], N1=a[idx-1], N2=a[idx-2], N3=a[idx-3];
    const sN=setOf(N), s1=setOf(N1), s2=setOf(N2), s3=setOf(N3);
    const interN2=overlapCount(sN,s2);

    // FROZEN-1: J3 = |(N ∩ (N−3)) \ ((N−1) ∪ (N−2))|.
    let j3=0;
    for(const x of sN) if(s3.has(x) && !s1.has(x) && !s2.has(x)) j3++;

    const level=classifyLevel(interN2,j3);
    const f=featureRows(a,idx);

    // B1: при сильном режиме сначала D>=9 и отсутствующие в N−1;
    // всегда сохраняем техническую K7, чтобы архив можно было сравнивать по каждому тиражу.
    const b1Signal=level!=='L0';
    const strict=f.filter(x=>!s1.has(x.n)&&x.D>=9).sort(sortFeature);
    const freshRest=f.filter(x=>!s1.has(x.n)&&x.D<9).sort(sortFeature);
    const repeated=f.filter(x=>s1.has(x.n)).sort(sortFeature);
    const b1K7=takeUnique([...strict,...freshRest,...repeated],7);

    // B2: U2 определяет силу режима 36+, но ядро и K3/K4/K7 считаются КАЖДЫЙ тираж.
    const u2=new Set([...s1,...s2]).size;
    const b2Signal=u2>=38;
    const b2Rank=f.slice().sort((a,b)=>{
      const pa=(a.C>=4&&a.D>=8)?1:0, pb=(b.C>=4&&b.D>=8)?1:0;
      return pb-pa || sortFeature(a,b);
    });
    const core9=takeUnique(b2Rank,9);
    const b2K3=core9.slice(0,3);
    const b2K4=core9.slice(0,4);
    const b2K7=core9.slice(0,7);

    // B3: сильные MAX/STRONG остаются отдельными, но для честного сравнения
    // технические K3/K4/K5 тоже frozen каждый тираж.
    const transition=[...sN].filter(x=>s1.has(x));
    const transitionCount=transition.length;
    const sumT=transition.reduce((z,x)=>z+x,0);
    const flow=sumT>=320?'HOT':(transitionCount<=2?'COLD':'NEUTRAL');
    const ranked=f.map(x=>{
      const max=x.R>=3&&x.C>=4&&x.F5>=3;
      const strong=!max&&x.D>=15;
      const watch=!max&&!strong&&x.D>=12;
      return {...x,cls:max?'MAX':strong?'STRONG':watch?'WATCH':'BASE'};
    }).sort((a,b)=>{
      const rank=x=>x.cls==='MAX'?4:x.cls==='STRONG'?3:x.cls==='WATCH'?2:1;
      return rank(b)-rank(a) || sortFeature(a,b);
    });
    const maxNums=ranked.filter(x=>x.cls==='MAX').map(x=>x.n);
    const strongNums=ranked.filter(x=>x.cls==='STRONG').map(x=>x.n);
    const watchNums=ranked.filter(x=>x.cls==='WATCH').map(x=>x.n);
    const rank5=takeUnique(ranked,5);
    const b3K3=rank5.slice(0,3);
    const b3K4=rank5.slice(0,4);
    const b3K5=rank5.slice(0,5);

    const next=expectedNextMeta(a,idx);
    return {
      algorithmVersion:VERSION,
      newGridStart:NEW_GRID_START,
      source:{draw:Number(N.draw),date:N.date||'',time:N.time||'',column:Number(N.column)||null,balls:nums(N)},
      target:{draw:Number(N.draw)+1,date:next.date,time:next.time},
      metrics:{interN2,j3,u2,transitionCount,sumT},
      blocks:{
        b1:{name:'ВХОД K7',level,signal:b1Signal,strictCandidates:strict.map(x=>x.n),k7:b1K7},
        b2:{name:'МОЩНОСТЬ K7',signal:b2Signal,u2,core9,k3:b2K3,k4:b2K4,k7:b2K7},
        b3:{name:'ПЕРЕХОДЫ',flow,transitionCount,sumT,max:maxNums,strong:strongNums,watch:watchNums,rank5,k3:b3K3,k4:b3K4,k5:b3K5}
      }
    };
  }

  function currentAnalysis(){
    const a=draws();
    return a.length?analyzeAt(a,a.length-1):null;
  }

  function frozenRecord(analysis){
    if(!analysis)return null;
    return {
      id:`tb-${analysis.target.draw}`,
      kind:'three_blocks',
      algorithmVersion:analysis.algorithmVersion,
      newGridStart:analysis.newGridStart,
      sourceDraw:analysis.source.draw,
      sourceDate:analysis.source.date,
      sourceTime:analysis.source.time,
      sourceColumn:analysis.source.column,
      sourceBalls:analysis.source.balls,
      targetDraw:analysis.target.draw,
      targetDate:analysis.target.date,
      targetTime:analysis.target.time,
      createdAt:Date.now(),
      frozen:true,
      metrics:analysis.metrics,
      blocks:analysis.blocks,
      result:null
    };
  }

  function scoreNums(list, fact){
    const target=new Set(nums(fact));
    const a=(Array.isArray(list)?list:[]).map(Number).filter(Number.isFinite);
    const hitNums=a.filter(n=>target.has(n));
    return {size:a.length,hits:hitNums.length,hitNums};
  }

  function scoreRecord(rec, fact){
    const b1=rec?.blocks?.b1||{}, b2=rec?.blocks?.b2||{}, b3=rec?.blocks?.b3||{};
    return {
      draw:Number(fact.draw),date:fact.date||'',time:fact.time||'',column:Number(fact.column)||null,balls:nums(fact),scoredAt:Date.now(),
      blocks:{
        b1:{k7:scoreNums(b1.k7,fact)},
        b2:{core9:scoreNums(b2.core9,fact),k3:scoreNums(b2.k3,fact),k4:scoreNums(b2.k4,fact),k7:scoreNums(b2.k7,fact)},
        b3:{k3:scoreNums(b3.k3,fact),k4:scoreNums(b3.k4,fact),k5:scoreNums(b3.k5,fact)}
      }
    };
  }

  async function reconcile(){
    if(reconcileBusy)return false;
    if(!window.ComboCloudHistory)return false;
    reconcileBusy=true;
    try{
      await Promise.resolve(window.ComboCloudHistory.ready);
      const a=draws();
      if(a.length<5)return false;
      const byDraw=new Map(a.map(d=>[Number(d.draw),d]));
      let rows=window.ComboCloudHistory.cached('three_blocks')||[];

      // Сначала закрываем старые frozen только фактом, не переписывая прогноз.
      for(const rec of rows){
        if(rec?.result || !Number(rec?.targetDraw))continue;
        const fact=byDraw.get(Number(rec.targetDraw));
        if(!fact)continue;
        const next={...rec,result:scoreRecord(rec,fact)};
        await window.ComboCloudHistory.upsert('three_blocks',rec.id||`tb-${rec.targetDraw}`,next);
      }

      rows=window.ComboCloudHistory.cached('three_blocks')||[];
      const analysis=analyzeAt(a,a.length-1);
      if(!analysis)return false;
      const id=`tb-${analysis.target.draw}`;
      const existing=rows.find(x=>String(x?.id)===id);
      const factAlreadyExists=byDraw.has(Number(analysis.target.draw));

      if(!existing){
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      } else if(!factAlreadyExists && !existing.result && existing.algorithmVersion!==VERSION){
        // Текущий ещё НЕ состоявшийся прогноз можно заменить новой версией движка.
        // Прошедшие факты никогда не переписываем.
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      }
      return true;
    } finally { reconcileBusy=false; }
  }

  window.ComboThreeBlocksEngine={
    VERSION,NEW_GRID_START,draws,currentAnalysis,analyzeAt,frozenRecord,scoreRecord,reconcile,fmt
  };
})();
