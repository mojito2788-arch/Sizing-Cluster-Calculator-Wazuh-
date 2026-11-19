const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript({content:`window.__savedSettings={};window.nativeSettings=null;window.nativeCSV=null;window.webkit={messageHandlers:{settings:{postMessage:x=>window.nativeSettings=x},exportCSV:{postMessage:x=>window.nativeCSV=x}}};`+fs.readFileSync(path.join(__dirname,'../Sources/storage.js'),'utf8')});
  await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'../website/index.html')).href);
  assert.equal(await p.evaluate(fs.readFileSync(path.join(__dirname,'../Sources/smoke.js'),'utf8')),'PASS');
  await p.waitForFunction(()=>window.nativeCSV!==null);
  const result=await p.evaluate(()=>({csv:window.nativeCSV,settings:window.nativeSettings}));
  assert.match(result.csv,/"Deployment","aio"/);
  assert.match(result.settings['cluster-sizing-local-v2'],/1234/);
  p.on('dialog',d=>d.accept());await p.locator('#reset').click();
  assert.equal(await p.locator('#a-inputMode').inputValue(),'inventory');
  assert.deepEqual(errors,[]);
  console.log('PASS: packaged offline page, all sizing paths, native export bridge, settings, reset; Edge only, not native macOS.');
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
