(function(root){
const defaults={inputMode:"inventory",directEPS:4666,ingestion:400,ingestionUnit:"GB/day",eventSize:1,setup:"multi",aioCpu:16,aioRam:32,aioOs:100,aioEPS:5000,aioIndex:2000,aioMaxDisk:4000,alertDays:45,factor:1,burst:1.25,usePeak:true,epsOverride:null,mode:'Alerts only',ratio:20,apsOverride:null,alertSize:null,eventDays:45,utilization:85,replicas:1,os:5,workerCapacity:5000,minWorkers:2,workerSpare:1,indexCapacity:2000,minIndexers:3,indexSpare:1,maxDisk:4000,rebuild:true,workerCpu:8,workerRam:16,workerDisk:500,indexCpu:12,indexRam:24,masterCpu:4,masterRam:4,masterDisk:300,hosts:2,cores:80,overcommit:2,cpuReserve:20,hostRam:256,ramReserve:10,drives:8,driveTB:4,parity:1,diskReserve:20};
function calculate(devices,inputs){
const a={...defaults,...inputs};const aio=a.setup==='aio';const effectiveReplicas=aio?0:a.replicas;
const calculatedEPS=devices.reduce((v,d)=>v+d.quantity*d.eps,0), weighted=calculatedEPS?devices.reduce((v,d)=>v+d.quantity*d.eps*d.size,0)/calculatedEPS:0;
const sourceSize=a.inputMode==='inventory'?weighted:a.eventSize;
if(a.inputMode!=='inventory'&&!(sourceSize>0))throw new Error('Average event size must be greater than zero.');
const ingestionBytes=a.ingestion*(a.ingestionUnit==='GiB/day'?2**30:a.ingestionUnit==='MB/s'?1e6*86400:1e9);
const eps=a.inputMode==='eps'?a.directEPS:a.inputMode==='ingestion'?ingestionBytes/(sourceSize*1024*86400):calculatedEPS;
const aps=a.apsOverride===null?eps*a.ratio/100:a.apsOverride,alertSize=a.alertSize===null?sourceSize:a.alertSize;
const daily=(rate,size)=>rate*size*86400/1048576;
const alertDaily=daily(aps,alertSize),eventDaily=daily(eps,sourceSize),alertStored=alertDaily*a.alertDays*a.factor*(1+effectiveReplicas)/1024,eventStored=eventDaily*a.eventDays*a.factor*(1+effectiveReplicas)/1024;
const stored=a.mode==='Alerts only'?alertStored:a.mode==='Events only'?eventStored:alertStored+eventStored, provisioned=stored/(a.utilization/100),indexed=a.mode==='Alerts only'?aps:a.mode==='Events only'?eps:eps+aps;
const workerRate=eps*a.burst,indexRate=indexed*a.burst,workerActive=Math.ceil(workerRate/a.workerCapacity),workers=Math.max(a.minWorkers,workerActive+a.workerSpare),indexActive=Math.ceil(indexRate/a.indexCapacity);
const storageNodes=Math.ceil(provisioned*1024/a.maxDisk)+(a.rebuild?a.indexSpare:0),topology=Math.max(a.minIndexers,a.indexSpare+1,a.replicas+1+(a.rebuild?a.indexSpare:0)),indexers=Math.max(indexActive+a.indexSpare,storageNodes,topology),dataDisk=Math.ceil(provisioned*1024/(indexers-(a.rebuild?a.indexSpare:0)));
let vms=[{name:'Dashboard + master',count:1,cpu:a.masterCpu,ram:a.masterRam,disk:a.masterDisk},{name:'Worker manager',count:workers,cpu:a.workerCpu,ram:a.workerRam,disk:a.workerDisk},{name:'Indexer',count:indexers,cpu:a.indexCpu,ram:a.indexRam,disk:dataDisk+a.os}];
const aioDataDisk=Math.ceil(provisioned*1024);
const aioFits=workerRate<=a.aioEPS&&indexRate<=a.aioIndex&&aioDataDisk<=a.aioMaxDisk;
if(aio)vms=[{name:'All-in-one (AIO)',count:1,cpu:a.aioCpu,ram:a.aioRam,disk:aioDataDisk+a.aioOs}];
const total={nodes:0,cpu:0,ram:0,disk:0};vms.forEach(v=>{total.nodes+=v.count;total.cpu+=v.count*v.cpu;total.ram+=v.count*v.ram;total.disk+=v.count*v.disk/1024;});
const host={cpu:a.cores*a.overcommit*(1-a.cpuReserve/100),ram:a.hostRam*(1-a.ramReserve/100),disk:Math.max(0,a.drives-a.parity)*a.driveTB*1e12/2**40*(1-a.diskReserve/100)};
return {aio,aioFits,aioDataDisk,effectiveReplicas,sourceSize,calculatedEPS,weighted,eps,aps,alertSize,alertDaily,eventDaily,alertStored,eventStored,stored,provisioned,indexed,workerRate,indexRate,workerActive,workers,indexActive,storageNodes,topology,indexers,dataDisk,vms,total,host};
}
const api={defaults,calculate};if(typeof module!=='undefined')module.exports=api;else root.SizingModel=api;
})(typeof window!=='undefined'?window:globalThis);


