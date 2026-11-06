'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {globalQuotes}=require('./global-feed.cjs'),extras=require('./market-extras.cjs');
const PORT=Number(process.env.PORT)||19766,HOST=process.env.HOST||'0.0.0.0';
const root=path.join(__dirname,'public');
const assets=new Map([['/',['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],['/extras.js',['extras.js','text/javascript; charset=utf-8']],['/mobile.js',['mobile.js','text/javascript; charset=utf-8']],['/mobile.css',['mobile.css','text/css; charset=utf-8']],['/manifest.webmanifest',['manifest.webmanifest','application/manifest+json']],['/sw.js',['sw.js','text/javascript; charset=utf-8']],['/icon-192.png',['icon-192.png','image/png']],['/icon-512.png',['icon-512.png','image/png']],['/apple-touch-icon.png',['apple-touch-icon.png','image/png']]]);
let nseCache,nseTime=0,nsePending,nseError='';
function normalize(j){if(!Array.isArray(j?.data))throw Error('Invalid NSE response');const seen=new Set(),data=j.data.filter(q=>typeof q.index==='string'&&!seen.has(q.index)&&seen.add(q.index)&&[q.last,q.variation,q.percentChange].every(x=>x!==null&&x!==''&&Number.isFinite(Number(x)))).map(q=>({index:q.index,last:Number(q.last),variation:Number(q.variation),percentChange:Number(q.percentChange)}));if(!data.length)throw Error('NSE quote unavailable');return {data,timestamp:j.timestamp||'',fetchedAt:new Date().toISOString(),source:'https://www.nseindia.com/api/allIndices'}}
async function nse(force){if(nsePending)return nsePending;if(Date.now()-nseTime<(force?30000:60000)){if(nseCache)return {...nseCache,stale:!!nseError,error:nseError};if(nseError)throw Error(nseError)}nseTime=Date.now();nsePending=(async()=>{try{const r=await fetch('https://www.nseindia.com/api/allIndices',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('NSE source unavailable (HTTP '+r.status+')');nseCache=normalize(await r.json());nseError='';return {...nseCache,stale:false}}catch(e){nseError=e.message;if(nseCache)return {...nseCache,stale:true,error:nseError};throw e}finally{nsePending=null}})();return nsePending}
const counters=new Map();
function limited(key){const now=Date.now();let v=counters.get(key);if(!v||now-v.time>=60000){v={time:now,count:0};counters.set(key,v)}if(counters.size>1024){for(const [k,x]of counters)if(now-x.time>60000)counters.delete(k);if(counters.size>1024)counters.delete(counters.keys().next().value)}return ++v.count>120}
function send(req,res,status,data,type='application/json; charset=utf-8'){let body=Buffer.isBuffer(data)?data:Buffer.from(typeof data==='string'?data:JSON.stringify(data));res.statusCode=status;res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');if(body.length>1024&&/gzip/.test(req.headers['accept-encoding']||'')){body=zlib.gzipSync(body);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding')}res.setHeader('Content-Length',body.length);res.end(req.method==='HEAD'?undefined:body)}
function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(req,res,405,{error:'Method not allowed'})}
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/health')return send(req,res,200,{app:'market-desk-mobile',version:1});
 if(assets.has(u.pathname)){const [file,type]=assets.get(u.pathname);return send(req,res,200,fs.readFileSync(path.join(root,file)),type)}
 if(!u.pathname.startsWith('/api/'))return send(req,res,404,{error:'Not found'});
 if(req.headers['sec-fetch-site']==='cross-site')return send(req,res,403,{error:'Open Market Desk to view quotes'});
 if(limited(req.socket.remoteAddress||'unknown')){res.setHeader('Retry-After','60');return send(req,res,429,{error:'Please wait a minute before refreshing again'})}
 const force=u.searchParams.get('refresh')==='1';
 (async()=>{
  if(u.pathname==='/api/nse')return nse(force);
  if(u.pathname==='/api/global'){const view=u.searchParams.get('view')||'all',country=u.searchParams.get('country')||'all';if(!['all','India','US','World','Futures','Commodities','Currency','energy','all-futures'].includes(view)||country.length>40)throw Error('Unsupported market');return globalQuotes(force,view,country)}
  if(u.pathname==='/api/extras/stocks'&&!['nifty','sensex','dow','nasdaq'].includes(u.searchParams.get('group')))throw Error('Unsupported stock group');
  if(u.pathname==='/api/extras/fx'&&!['1d','5d','1mo'].includes(u.searchParams.get('range')||'1d'))throw Error('Unsupported chart range');
  if(['/api/extras/stocks','/api/extras/fx','/api/extras/metals','/api/extras/fii'].includes(u.pathname))return extras.route(u.pathname+u.search);
  throw Error('Unknown endpoint');
 })().then(data=>send(req,res,200,data)).catch(e=>send(req,res,502,{error:e.message}));
}
function start(){const server=http.createServer(handler);server.requestTimeout=90000;server.listen(PORT,HOST,()=>console.log('Market Desk mobile: http://127.0.0.1:'+PORT));return server}
module.exports={start,handler,normalize};if(require.main===module)start();
