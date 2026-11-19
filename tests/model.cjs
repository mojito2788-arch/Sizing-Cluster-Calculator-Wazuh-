const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const {defaults,calculate}=require('../website/model.js');const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../website/data.js'),'utf8'),context);const d=context.window.SIZING_DATA.devices,a={...defaults};const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-8*Math.max(1,y),`${x} vs ${y}`);
let r=calculate(d,a);assert.equal(r.eps,4666);assert.equal(r.workers,3);assert.equal(r.indexers,3);assert.equal(r.total.cpu,64);assert.equal(r.total.ram,124);close(r.total.disk,11.8798828125);
const eps=calculate([],{...a,inputMode:'eps',directEPS:1000,eventSize:1,mode:'Events only'});close(eps.eps,1000);close(eps.eventDaily,1000*1024*86400/2**30);
for(const [ingestionUnit,ingestion] of [['GB/day',88.4736],['GiB/day',82.3974609375],['MB/s',1.024]]){const x=calculate([],{...a,inputMode:'ingestion',ingestionUnit,ingestion,eventSize:1,mode:'Events only'});close(x.eps,1000);close(x.stored,eps.stored);}
assert.equal(calculate(d,{...a,inputMode:'eps',directEPS:0}).eps,0);
assert.equal(calculate(d,{...a,inputMode:'ingestion',ingestion:0}).eps,0);
assert.throws(()=>calculate(d,{...a,inputMode:'ingestion',eventSize:0}));
const days=calculate(d,{...a,alertDays:60});close(days.alertStored/r.alertStored,60/45);
const aio=calculate(d,{...a,setup:'aio'});assert.equal(aio.total.nodes,1);assert.equal(aio.total.cpu,16);assert.equal(aio.effectiveReplicas,0);close(aio.stored,r.stored/2);assert.equal(aio.vms[0].disk,Math.ceil(aio.provisioned*1024)+100);assert.equal(aio.aioFits,false);
const aioZero=calculate(d,{...a,setup:'aio',inputMode:'eps',directEPS:0,apsOverride:0});assert.equal(aioZero.vms[0].disk,100);assert.equal(aioZero.aioFits,true);
const aioIgnore=calculate(d,{...a,setup:'aio',replicas:5,workerSpare:10,indexSpare:10});close(aioIgnore.total.disk,aio.total.disk);assert.equal(aioIgnore.total.nodes,1);
assert.equal(calculate(d,{...a,workerCapacity:2500}).workers,4);
console.log('PASS: inventory regression, 3 ingestion units, direct EPS, zero inputs, size validation, 45/60-day retention, AIO capacities, no AIO replicas/failover.');
