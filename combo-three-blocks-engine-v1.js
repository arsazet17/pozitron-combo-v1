/* COMBO KENO · 3 БЛОКА · engine v3 · 02.10.2026
   Архитектура возвращена к согласованной схеме:
   B1 = ВХОД K7 (N∩N−2 + J3) — сигнал, не выдуманный селектор 7 чисел.
   B2 = МОЩНОСТЬ K7 (U2) — сигнал 9+/36+, не копия B1.
   B3 = ПЕРЕХОДЫ — только конкретные STRONG/MAX числа и честные K3/K4/K5.
   Каждый прогноз замораживается ДО следующего тиража и потом только оценивается.
*/
(() => {
  'use strict';
  if (window.ComboThreeBlocksEngine && window.ComboThreeBlocksEngine.VERSION === 'TB3-2026-10-02') return;

  const NEW_GRID_START = 324994;
  const VERSION = 'TB3-2026-10-02';
  let reconcileBusy = false;

  const PAYOUTS = {
    10:{0:200,4:100,5:250,6:750,7:5000,8:50000,9:1000000,10:10000000},
    9:{0:150,4:150,5:300,6:1000,7:10000,8:210000,9:4000000},
    8:{0:150,4:200,5:500,6:2500,7:53300,8:1500000},
    7:{0:150,3:100,4:200,5:1200,6:10000,7:250000},
    6:{3:200,4:750,5:4180,6:75000},
    5:{3:400,4:1920,5:20000},
    4:{2:100,3:300,4:3300},
    3:{2:300,3:1500},
    2:{1:100,2:300},
    1:{1:280}
  };

  const nums = d => Array.isArray(d?.balls) ? d.balls.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80) : [];
  const setOf = d => new Set(nums(d));
  const overlapCount = (a,b) => { let n=0; for(const x of a) if(b.has(x)) n++; return n; };
  const choose = (n,k) => { if(k<0||k>n)return 0; k=Math.min(k,n-k); let z=1; for(let i=1;i<=k;i++)z=z*(n-k+i)/i; return Math.round(z); };
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
      const nx=a[i+1]; if(!nx)continue;
      const crosses=String(nx.time||'') < String(a[i].time||'');
      return {date:crosses?addDaysRu(n.date,1):(n.date||''),time:nx.time||''};
    }
    return {date:n.date||'',time:''};
  }

  function b1Level(interN2,j3){
    if(interN2<=2 && j3>=7)return 'MAX';
    if(j3>=7 || interN2>=9)return 'STRONG';
    if(interN2<=2)return 'WATCH';
    return 'NONE';
  }

  function featureRows(a,idx){
    const current=nums(a[idx]);
    const rangeCounts=new Map(), colCounts=new Map();
    for(const x of current){
      const r=range4(x),c=colOf(x);
      rangeCounts.set(r,(rangeCounts.get(r)||0)+1);
      colCounts.set(c,(colCounts.get(c)||0)+1);
    }
    const hist=a.slice(Math.max(0,idx-4),idx+1).map(setOf);
    return current.map(n=>{
      const R=rangeCounts.get(range4(n))||0;
      const C=colCounts.get(colOf(n))||0;
      let F5=0; for(const s of hist)if(s.has(n))F5++;
      return {n,R,C,D:R*C,F5};
    });
  }

  function densityRank(x){
    const cls=x.R>=3&&x.C>=4&&x.F5>=3?'MAX':(x.D>=15?'STRONG':(x.D>=12?'WATCH':''));
    const rank=cls==='MAX'?3:cls==='STRONG'?2:cls==='WATCH'?1:0;
    return {...x,cls,rank};
  }

  function analyzeAt(a,idx){
    if(idx<4||!a[idx])return null;
    const N=a[idx],N1=a[idx-1],N2=a[idx-2],N3=a[idx-3];
    const sN=setOf(N),s1=setOf(N1),s2=setOf(N2),s3=setOf(N3);

    // B1 — только сигнал входа K7.
    const nN2=[...sN].filter(x=>s2.has(x)).sort((x,y)=>x-y);
    const j3Numbers=[...sN].filter(x=>s3.has(x)&&!s1.has(x)&&!s2.has(x)).sort((x,y)=>x-y);
    const interN2=nN2.length,j3=j3Numbers.length,level=b1Level(interN2,j3);
    const b1Signal=level==='STRONG'||level==='MAX';

    // B2 — только мощность уже возможного K7-узла.
    const u2=new Set([...s1,...s2]).size;
    const b2Signal=u2>=38;

    // B3 — конкретные переходные числа. Никакой BASE-добивки.
    const transition=[...sN].filter(x=>s1.has(x)).sort((x,y)=>x-y);
    const sumT=transition.reduce((z,x)=>z+x,0);
    const flow=sumT>=320?'HOT':(transition.length<=2?'COLD':'NEUTRAL');
    const density=featureRows(a,idx).map(densityRank).sort((p,q)=>q.rank-p.rank||q.D-p.D||q.F5-p.F5||p.n-q.n);
    const max=density.filter(x=>x.cls==='MAX').map(x=>x.n);
    const strong=density.filter(x=>x.cls==='STRONG').map(x=>x.n);
    const watch=density.filter(x=>x.cls==='WATCH').map(x=>x.n);
    const confirmed=[...max,...strong];
    const k3=confirmed.length>=3?confirmed.slice(0,3):[];
    const k4=confirmed.length>=4?confirmed.slice(0,4):[];
    const k5=confirmed.length>=5?confirmed.slice(0,5):[];

    const next=expectedNextMeta(a,idx);
    return {
      algorithmVersion:VERSION,newGridStart:NEW_GRID_START,
      source:{draw:Number(N.draw),date:N.date||'',time:N.time||'',column:Number(N.column)||null,balls:nums(N)},
      target:{draw:Number(N.draw)+1,date:next.date,time:next.time},
      blocks:{
        b1:{name:'ВХОД K7',method:'ENTRY_K7',level,signal:b1Signal,interN2,j3,nN2,j3Numbers,combos:[]},
        b2:{name:'МОЩНОСТЬ K7',method:'POWER_U2',signal:b2Signal,u2,threshold:38,combos:[]},
        b3:{name:'ПЕРЕХОДЫ',method:'DENSITY_STRICT',flow,transitionCount:transition.length,sumT,transition,max,strong,watch,k3,k4,k5}
      }
    };
  }

  function currentAnalysis(){const a=draws();return a.length?analyzeAt(a,a.length-1):null;}

  function frozenRecord(x){
    if(!x)return null;
    return {
      id:`tb-${x.target.draw}`,kind:'three_blocks',algorithmVersion:x.algorithmVersion,newGridStart:x.newGridStart,
      sourceDraw:x.source.draw,sourceDate:x.source.date,sourceTime:x.source.time,sourceColumn:x.source.column,sourceBalls:x.source.balls,
      targetDraw:x.target.draw,targetDate:x.target.date,targetTime:x.target.time,
      createdAt:Date.now(),frozen:true,blocks:x.blocks,result:null
    };
  }

  function prizeFor(size,hits){return Number(PAYOUTS?.[Number(size)]?.[Number(hits)]||0);}
  function scoreCombo(list,fact){
    const arr=(Array.isArray(list)?list:[]).map(Number).filter(Number.isFinite);
    const fs=new Set(nums(fact));
    const hitNums=arr.filter(n=>fs.has(n));
    return {numbers:arr,size:arr.length,hits:hitNums.length,hitNums,prize:arr.length?prizeFor(arr.length,hitNums.length):0};
  }

  function scoreRecord(rec,fact){
    const source=new Set((rec.sourceBalls||[]).map(Number));
    const factSet=setOf(fact);
    const k=overlapCount(source,factSet);
    const b1=rec.blocks?.b1||{},b2=rec.blocks?.b2||{},b3=rec.blocks?.b3||{};
    const s3=scoreCombo(b3.k3,fact),s4=scoreCombo(b3.k4,fact),s5=scoreCombo(b3.k5,fact);
    const totalPrize=s3.prize+s4.prize+s5.prize;
    return {
      draw:Number(fact.draw),date:fact.date||'',time:fact.time||'',column:Number(fact.column)||null,balls:nums(fact),scoredAt:Date.now(),
      overlapK:k,k7plus:k>=7,k9plus:k>=9,k7Nodes:k>=7?choose(k,7):0,
      b1:{signal:Boolean(b1.signal),level:b1.level||'NONE',hit:Boolean(b1.signal)?k>=7:null},
      b2:{signal:Boolean(b2.signal),u2:Number(b2.u2)||0,hit:Boolean(b2.signal)?k>=9:null},
      b3:{k3:s3,k4:s4,k5:s5,totalPrize,winningCombos:[s3,s4,s5].filter(x=>x.size&&x.prize>0).length}
    };
  }

  async function reconcile(){
    if(reconcileBusy||!window.ComboCloudHistory)return false;
    reconcileBusy=true;
    try{
      await Promise.resolve(window.ComboCloudHistory.ready);
      const a=draws(); if(a.length<5)return false;
      const byDraw=new Map(a.map(d=>[Number(d.draw),d]));
      let rows=window.ComboCloudHistory.cached('three_blocks')||[];

      // Любой уже сохранённый frozen после прихода факта только оцениваем — прогноз не меняем.
      for(const rec of rows){
        if(rec?.result||!Number(rec?.targetDraw))continue;
        const fact=byDraw.get(Number(rec.targetDraw)); if(!fact)continue;
        await window.ComboCloudHistory.upsert('three_blocks',rec.id||`tb-${rec.targetDraw}`,{...rec,result:scoreRecord(rec,fact)});
      }

      rows=window.ComboCloudHistory.cached('three_blocks')||[];
      const analysis=analyzeAt(a,a.length-1); if(!analysis)return false;
      const id=`tb-${analysis.target.draw}`;
      const existing=rows.find(x=>String(x?.id)===id);
      const factExists=byDraw.has(Number(analysis.target.draw));

      // Текущий ещё НЕ состоявшийся frozen можно заменить новой версией движка.
      if(!existing){
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      }else if(!factExists&&!existing.result&&existing.algorithmVersion!==VERSION){
        await window.ComboCloudHistory.upsert('three_blocks',id,frozenRecord(analysis));
      }
      return true;
    }catch(e){console.error('COMBO 3 BLOCKS reconcile',e);return false}
    finally{reconcileBusy=false;}
  }

  window.ComboThreeBlocksEngine={VERSION,NEW_GRID_START,PAYOUTS,draws,currentAnalysis,analyzeAt,frozenRecord,scoreRecord,reconcile};
})();
