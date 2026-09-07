import * as tf from '@tensorflow/tfjs-node';
import fs from 'node:fs/promises';

const HISTORY_FILE='combo-history-v1.json';
const OUT_DIR='xray-ai-model';
const WINDOW=5;
const RANGE=80;
const LSTM_UNITS=128;
const TRAIN_DRAWS=Math.max(1000,Number(process.env.XRAY_TRAIN_DRAWS||2000));
const EPOCHS=Math.max(1,Number(process.env.XRAY_EPOCHS||100));
const BATCH_SIZE=Math.max(1,Number(process.env.XRAY_BATCH_SIZE||8));
const LR=0.0001;

function normalizeHistory(raw){
  const list=Array.isArray(raw)?raw:(raw?.draws||[]);
  return list.map(d=>({
    draw:Number(d?.draw??d?.number??d?.id),date:String(d?.date||''),time:String(d?.time||''),column:Number(d?.column)||null,
    balls:(Array.isArray(d?.balls)?d.balls:Array.isArray(d?.numbers)?d.numbers:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=80)
  })).filter(d=>Number.isInteger(d.draw)&&d.balls.length===20&&new Set(d.balls).size===20).sort((a,b)=>a.draw-b.draw);
}
function oneHot80(draw){const v=Array(RANGE).fill(0);for(const n of draw.balls)v[n-1]=1;return v;}
function prepareData(draws){
  const encoded=draws.map(oneHot80),xs=[],ys=[];
  for(let i=0;i<=encoded.length-WINDOW-1;i++){
    xs.push(encoded.slice(i,i+WINDOW));
    ys.push(encoded[i+WINDOW]);
  }
  return {xs,ys};
}
function attentionMechanism(dropoutOutput){
  const attentionDense=tf.layers.dense({units:1,activation:'tanh'});
  const attentionWeights=attentionDense.apply(dropoutOutput);
  return tf.layers.dot({axes:[1,1]}).apply([attentionWeights,dropoutOutput]);
}
function buildModel(){
  const inputs=tf.input({shape:[WINDOW,RANGE]});
  const lstmOutput=tf.layers.lstm({units:LSTM_UNITS,returnSequences:true,kernelInitializer:'glorotNormal',recurrentInitializer:'glorotNormal',kernelRegularizer:tf.regularizers.l2({l2:0.001})}).apply(inputs);
  const dropout=tf.layers.dropout({rate:0.5}).apply(lstmOutput);
  const context=attentionMechanism(dropout);
  const flat=tf.layers.flatten().apply(context);
  const outputs=tf.layers.dense({units:RANGE,activation:'sigmoid',kernelInitializer:'glorotNormal',kernelRegularizer:tf.regularizers.l2({l2:0.01})}).apply(flat);
  const model=tf.model({inputs,outputs});
  model.compile({optimizer:tf.train.adam(LR),loss:'binaryCrossentropy',metrics:['accuracy']});
  return model;
}
function topN(probs,n=20){return Array.from({length:RANGE},(_,i)=>i+1).sort((a,b)=>(probs[b-1]-probs[a-1])||(a-b)).slice(0,n)}

const raw=JSON.parse(await fs.readFile(HISTORY_FILE,'utf8'));
const all=normalizeHistory(raw);
if(all.length<1006)throw new Error(`XRAY TRAIN: мало истории (${all.length}), нужно минимум 1006`);
const trainDraws=all.slice(-Math.min(TRAIN_DRAWS,all.length));
const {xs,ys}=prepareData(trainDraws);
if(xs.length<1000)throw new Error(`XRAY TRAIN: мало окон 5→1 (${xs.length})`);
const x=tf.tensor3d(xs,[xs.length,WINDOW,RANGE]),y=tf.tensor2d(ys,[ys.length,RANGE]);
const split=Math.floor(xs.length*0.80),xTrain=x.slice([0,0,0],[split,-1,-1]),yTrain=y.slice([0,0],[split,-1]);
const model=buildModel();
model.summary();
await model.fit(xTrain,yTrain,{epochs:EPOCHS,batchSize:BATCH_SIZE,shuffle:true,validationSplit:0.2,verbose:1,callbacks:[tf.callbacks.earlyStopping({monitor:'val_loss',patience:10,restoreBestWeights:true})]});
await fs.mkdir(OUT_DIR,{recursive:true});
await model.save(`file://${process.cwd()}/${OUT_DIR}`);

const last5=all.slice(-WINDOW),px=tf.tensor3d([last5.map(oneHot80)],[1,WINDOW,RANGE]),py=model.predict(px),p=Array.from(await py.data()).slice(0,RANGE),preview=topN(p,20);
const meta={version:'XRAY-AI-2.0.0',architecture:'Attention LSTM 5→1 adapted from kyr0/lotto-ai',window:WINDOW,range:RANGE,numbersPerDraw:20,lstmUnits:LSTM_UNITS,dropout:0.5,l2Lstm:0.001,l2Output:0.01,optimizer:'adam',learningRate:LR,loss:'binaryCrossentropy',epochsMax:EPOCHS,batchSize:BATCH_SIZE,historyDrawsUsed:trainDraws.length,trainingWindows:xs.length,latestDraw:all.at(-1).draw,latestDate:all.at(-1).date,latestTime:all.at(-1).time,trainedAt:new Date().toISOString(),previewTop20:preview};
await fs.writeFile(`${OUT_DIR}/meta.json`,JSON.stringify(meta,null,2)+'\n','utf8');
console.log('XRAY TRAIN PASS',meta);
px.dispose();py.dispose();xTrain.dispose();yTrain.dispose();x.dispose();y.dispose();model.dispose();
