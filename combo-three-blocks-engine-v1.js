/* COMBO KENO · 3 БЛОКА · engine v2 · 02.10.2026
   Три блока = три РАЗНЫХ анализа. Никакого общего top-D списка для всех блоков.
   B1: вход K7 + временные аналоги этого же времени.
   B2: мощность U2 + структура двух предыдущих тиражей.
   B3: только переходная плотность MAX/STRONG/WATCH; слабые числа не добиваются искусственно.
*/
(() => {
  'use strict';
  if (window.ComboThreeBlocksEngine) return;

  const NEW_GRID_START = 324994;
  const VERSION = 'TB2-2026-10-02';
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
    const current=nums(a[idx]);
    const s1=idx>0?setOf(a[idx-1]):new Set();
    const s2=idx>1?setOf(a[idx-2]):new Set();
    const s3=idx>2?setOf(a[idx-3]):new Set();
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
      let F5=0; for(const s of history) if(s.has(x)) F5++;
      return {n:x,R,C,D:R*C,F5,inN1:s1.has(x),inN2:s2.has(x),inN3:s3.has(x)};
    });
  }

  function classifyLevel(interN2,j3){
    if(interN2<=2 && j3>=7)return 'L3';
    if(j3>=7 || interN2>=9)return 'L2';
    if(interN2<=2 && j3<7)return 'L1';
    return 'L0';
  }

  function takeUnique(rows,count){
    const out=[],seen=new Set();
    for(const x of rows){
      const n=Number(x?.n??x);
      if(!Number.isInteger(n)||seen.has(n))continue;
      seen.add(n); out.push(n);
      if(out.length>=count)break;
    }
    return out;
  }

  // B1 exact-number layer: only historical analogues of the SAME source time.
  // This deliberately does not use B2/B3 ranking.
  function timeAnalogRank(a, idx, features, j3Set, b1Signal){
    const sourceTime=String(a[idx]?.time||'');
    const prior=[];
    for(let j=0;j<idx;j++){
      if(String(a[j]?.time||'')!==sourceTime || !a[j+1])continue;
      prior.push([setOf(a[j]),setOf(a[j+1])]);
    }
    return features.map(x=>{
      let exposure=0,hits=0;
      for(const [src,next] of prior){
        if(!src.has(x.n))continue;
        exposure++;
        if(next.has(x.n))hits++;
      }
      // Bayesian smoothing around the natural 0.25 repeat baseline.
      const analogRate=(hits+2)/(exposure+8);
      const j3Boost=b1Signal&&j3Set.has(x.n)?0.035:0;
      const freshBoost=!x.inN1?0.010:0;
      return {...x,exposure,analogHits:hits,analogRate,score:analogRate+j3Boost+freshBoost};
    }).sort((p,q)=>q.score-p.score || q.exposure-p.exposure || q.F5-p.F5 || p.n-q.n);
  }

  // B2 exact-number layer: two-draw structural pressure only.
  // Strongly prefers N−2 returners / two-draw bridges, not the B1 time analogue and not B3 D/F5 ladder.
  function powerRank(features){
    return features.map(x=>{
      const return2=x.inN2&&!x.inN1?3.2:0;
      const bridge=x.inN1&&x.inN2?2.1:0;
      const recent=x.inN1&&!x.inN2?1.0:0;
      const column=x.C>=4?1.15:(x.C===3?0.45:0);
      const range=x.R>=3?0.85:(x.R===2?0.25:0);
      const score=return2+bridge+recent+column+range;
      return {...x,powerScore:score};
    }).sort((p,q)=>q.powerScore-p.powerScore || Number(q.inN2)-Number(p.inN2) || q.C-p.C || q.R-p.R || p.n-q.n);
  }

  function buildBalancedK7(core){
    const c=Array.isArray(core)?core:[];
    if(c.length<9)return {k7a:c.slice(0,7),k7b:c.slice(0,7),k7c:c.slice(0,7)};
    return {
      k7a:[c[0],c[1],c[2],c[3],c[4],c[5],c[6]],
      k7b:[c[0],c[1],c[2],c[3],c[4],c[7],c[8]],
      k7c:[c[0],c[1],c[2],c[5],c[6],c[7],c[8]],
    };
  }

  function analyzeAt(a, idx){
    if(idx<4 || !a[idx])return null;
    const N=a[idx], N1=a[idx-1], N2=a[idx-2], N3=a[idx-3];
    const sN=setOf(N), s1=setOf(N1), s2=setOf(N2), s3=setOf(N3);
    const interN2=overlapCount(sN,s2);

    const j3Set=new Set();
    for(const x of sN) if(s3.has(x) && !s1.has(x) && !s2.has(x)) j3Set.add(x);
    const j3=j3Set.size;
    const level=classifyLevel(interN2,j3);
    const f=featureRows(a,idx);

    // B1 = ENTRY regime + same-time historical analogue ranking.
    const b1Signal=level!=='L0';
    const b1Rank=timeAnalogRank(a,idx,f,j3Set,b1Signal);
    const b1K7=takeUnique(b1Rank,7);
    const analogTop=b1Rank.slice(0,7).map(x=>({n:x.n,rate:x.analogRate,exposure:x.exposure,hits:x.analogHits,j3:j3Set.has(x.n)}));

    // B2 = POWER regime + two-draw structural core.
    const u2=new Set([...s1,...s2]).size;
    const b2Signal=u2>=38;
    const b2Rank=powerRank(f);
    const core9=takeUnique(b2Rank,9);
    const {k7a,k7b,k7c}=buildBalancedK7(core9);
    const b2K4=core9.slice(0,4);

    // B3 = transition density. No BASE padding.
    const transition=[...sN].filter(x=>s1.has(x));
    const transitionCount=transition.length;
    const sumT=transition.reduce((z,x)=>z+x,0);
    const flow=sumT>=320?'HOT':(transitionCount<=2?'COLD':'NEUTRAL');
    const density=f.map(x=>{
      const max=x.R>=3&&x.C>=4&&x.F5>=3;
      const strong=!max&&x.D>=15;
      const watch=!max&&!strong&&x.D>=12;
      return {...x,cls:max?'MAX':strong?'STRONG':watch?'WATCH':''};
    }).sort((p,q)=>{
      const rank=x=>x.cls==='MAX'?3:x.cls==='STRONG'?2:x.cls==='WATCH'?1:0;
      return rank(q)-rank(p) || q.D-p.D || q.F5-p.F5 || p.n-q.n;
    });
    const maxNums=density.filter(x=>x.cls==='MAX').map(x=>x.n);
    const strongNums=density.filter(x=>x.cls==='STRONG').map(x=>x.n);
    const watchNums=density.filter(x=>x.cls==='WATCH').map(x=>x.n);
    const confirmed=takeUnique([...maxNums,...strongNums],20);
    const b3K3=confirmed.length>=3?confirmed.slice(0,3):[];
    const b3K4=confirmed.length>=4?confirmed.slice(0,4):[];
    const b3K5=confirmed.length>=5?confirmed.slice(0,5):[];

    const next=expectedNextMeta(a,idx);
    return {
      algorithmVersion:VERSION,
      newGridStart:NEW_GRID_START,
      source:{draw:Number(N.draw),date:N.date||'',time:N.time||'',column:Number(N.column)||null,balls:nums(N)},
      target:{draw:Number(N.draw)+1,date:next.date,time:next.time},
      metrics:{interN2,j3,u2,transitionCount,sumT},
      blocks:{
        b1:{name:'ВХОД K7',method:'TIME_ANALOG',level,signal:b1Signal,k7:b1K7,analogTop,j3Numbers:[...j3Set]},
        b2:{name:'МОЩНОСТЬ K7',method:'U2_STRUCTURE',signal:b2Signal,u2,core9,k4:b2K4,k7a,k7b,k7c},
        b3:{name:'ПЕРЕХОДЫ',method:'DENSITY_STRICT',flow,transitionCount,sumT,max:maxNums,strong:strongNums,watch:watchNums,k3:b3K3,k4:b3K4,k5:b3K5}
      }
    };
  }

  function currentAnalysis(){ const a=draws(); return a.length?analyzeAt(a,a.length-1):null; }

  function frozenRecord(analysis){
    if(!analysis)return null;
    return {
      id:`tb-${analysis.target.draw}`,
      kind:'three_blocks',algorithmVersion:analysis.algorithmVersion,newGridStart:analysis.newGridStart,
      sourceDraw:analysis.source.draw,sourceDate:analysis.source.date,sourceTime:analysis.source.time,sourceColumn:analysis.source.column,sourceBalls:analysis.source.balls,
      targetDraw:analysis.target.draw,targetDate:analysis.target.date,targetTime:analysis.target.time,
      createdAt:Date.now(),frozen:true,metrics:analysis.metrics,blocks:analysis.blocks,result:null
    };
  }

  function scoreNums(list, fact){
    const target=new Set(nums(fact));
    const arr=(Array.isArray(list)?list:[]).map(Number).filter(Number.isFinite);
    const hitNums=arr.filter(n=>target.has(n));
    return {size:arr.length,hits:hitNums.length,hitNums};
  }

  function scoreRecord(rec, fact){
    const b1=rec?.blocks?.b1||{},b2=rec?.blocks?.b2||{},b3=rec?.blocks?.b3||{};
    return {
      draw:Number(fact.draw),date:fact.date||'',time:fact.time||'',column:Number(fact.column)||null,balls:nums(fact),scoredAt:Date.now(),
      blocks:{
        b1:{k7:scoreNums(b1.k7,fact)},
        b2:{core9:scoreNums(b2.core9,fact),k4:scoreNums(b2.k4,fact),k7a:scoreNums(b2.k7a||b2.k7,fact),k7b:scoreNums(b2.k7b,fact),k7c:scoreNums(b2.k7c,fact)},
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
      const a=draws(); if(a.length<5)return false;
      const byDraw=new Map(a.map(d=>[Number(d.draw),d]));
      let rows=window.ComboCloudHistory.cached('three_blocks')||[];
      for(const rec of rows){
        if(rec?.result || !Number(rec?.targetDraw))continue;
        const fact=byDraw.get(Number(rec.targetDraw)); if(!fact)continue;
        await window.ComboCloudHistory.upsert('three_blocks',rec.id||`tb-${rec.targetDraw}`,{...rec,result:scoreRecord(rec,fact)});
      }
      rows=window.ComboCloudHistory.cached('three_blocks')||[];
      const analysis=analyzeAt(a,a.length-1); if(!analysis)return false;
      const id=`tb-${analysis.target.draw}`;
      const existing=rows.find(x=>String(x?.id)===id);
      const factAlreadyExists=byDraw.has(Number(analysis.target.draw));
      if(!existing){
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      } else if(!factAlreadyExists && !existing.result && existing.algorithmVersion!==VERSION){
        // Разрешено заменить только ещё НЕ состоявшийся текущий frozen при смене версии движка.
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      }
      return true;
    } finally {reconcileBusy=false;}
  }

  window.ComboThreeBlocksEngine={VERSION,NEW_GRID_START,draws,currentAnalysis,analyzeAt,frozenRecord,scoreRecord,reconcile,fmt};
})();
