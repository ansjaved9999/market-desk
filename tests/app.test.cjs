const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),vm=require('node:vm');
const {handler,normalize}=require('../server.cjs');
const {selectSources}=require('../global-feed.cjs');
test('view selection never fetches unrelated global markets',()=>{
 const india=selectSources('India');assert.deepEqual(india.map(q=>q.symbol).sort(),['BSE:BANKEX','BSE:SENSEX']);
 assert(selectSources('World','Japan').every(q=>q.country==='Japan'));
 assert.equal(selectSources('World','Pakistan').length,1);
 assert(selectSources('energy').every(q=>q.oil));
 assert(selectSources('US').every(q=>q.group==='US'));
});
test('NSE parser rejects missing values and duplicate rows',()=>{
 const q=normalize({data:[{index:'NIFTY 50',last:100,variation:2,percentChange:2},{index:'NIFTY 50',last:100,variation:2,percentChange:2},{index:'Bad',last:null,variation:0,percentChange:0}]});
 assert.equal(q.data.length,1);assert.throws(()=>normalize({data:[]}));
});
test('public assets and API boundaries',async t=>{
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const url of ['/','/extras.js','/mobile.js','/mobile.css','/manifest.webmanifest','/sw.js','/apple-touch-icon.png','/health'])assert.equal((await fetch(base+url)).status,200,url);
 assert.equal((await fetch(base+'/server.cjs')).status,404);
 assert.equal((await fetch(base+'/world-indices.json')).status,404);
 assert.equal((await fetch(base+'/api/global',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/api/global',{headers:{'sec-fetch-site':'cross-site'}})).status,403);
 assert.equal((await fetch(base+'/api/global?view=bad')).status,502);
 const manifest=await(await fetch(base+'/manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');
});
test('browser scripts parse and API responses are never service-worker cached',()=>{
 const h=fs.readFileSync('public/index.html','utf8');new vm.Script(h.match(/<script>([\s\S]*?)<\/script>/)[1]);
 for(const f of ['extras.js','mobile.js','sw.js'])new vm.Script(fs.readFileSync('public/'+f,'utf8'));
 assert(fs.readFileSync('public/sw.js','utf8').includes("u.pathname.startsWith('/api/')"));
});
