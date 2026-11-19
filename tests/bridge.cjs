const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Storage {
  constructor(){ this.map = new Map(); }
  getItem(k){return this.map.get(String(k)) ?? null;}
  setItem(k,v){this.map.set(String(k),String(v));}
}
const localStorage = new Storage(), messages = [];
const window = {__savedSettings: {'cluster-theme':'dark','cluster-sizing-local-v2':'{"a":{}}'}, webkit:{messageHandlers:{settings:{postMessage:v=>messages.push(v)}}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../Sources/storage.js'),'utf8'),{window,Storage,localStorage});
assert.equal(localStorage.getItem('cluster-theme'),'dark');
assert.equal(messages.length,0);
localStorage.setItem('cluster-theme','light');
assert.equal(messages.at(-1)['cluster-theme'],'light');
assert.equal(messages.at(-1)['cluster-sizing-local-v2'],'{"a":{}}');
localStorage.setItem('unrelated','private');
assert.equal(messages.length,1);
assert.equal('unrelated' in messages[0],false);
assert.equal(window.__savedSettings,undefined);
console.log('PASS: native settings hydration, update, retained scenario, key allowlist.');
