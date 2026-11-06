'use strict';
const https=require('node:https');
const zlib=require('node:zlib');
const URL='https://www.bseindia.com/data/xml/sensexrss.xml';
// BSE sends whitespace-prefixed HTTP header lines. Allow that syntax only for
// this fixed public feed; TLS certificate verification stays enabled.
function readFeed(){return new Promise((resolve,reject)=>{
 const req=https.get(URL,{insecureHTTPParser:true,headers:{Accept:'application/rss+xml, application/xml, text/xml','Accept-Encoding':'identity'}},res=>{
  if(res.statusCode!==200){res.resume();reject(Error('BSE HTTP '+res.statusCode));return}
  const parts=[];let size=0;res.on('data',part=>{size+=part.length;if(size>262144){res.destroy(Error('BSE feed too large'));return}parts.push(part)});
  res.on('error',reject);res.on('end',()=>{try{let raw=Buffer.concat(parts);if(res.headers['content-encoding']==='gzip')raw=zlib.gunzipSync(raw);resolve(raw.toString('utf8'))}catch(e){reject(e)}});
 });req.setTimeout(15000,()=>req.destroy(Error('BSE request timed out')));req.on('error',reject);
})}
function parseBseRss(xml,source){
 const item=xml.match(/<item\b[^>]*>([\s\S]*?)<\/item>/i)?.[1];
 const title=item?.match(/<title>([^<]+)<\/title>/i)?.[1];
 const match=title?.match(/^SENSEX\s*:\s*([\d,.]+)\s*\*\s*([+-]?[\d,.]+)\s*\(([+-]?[\d,.]+)\s*%\)/i);
 const rawDate=item?.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1];
 if(!match||!rawDate)throw Error('BSE Sensex feed format unavailable');
 const [last,variation,percentChange]=match.slice(1).map(x=>Number(x.replace(/,/g,'')));
 const previousClose=last-variation;
 if(![last,variation,percentChange,previousClose].every(Number.isFinite)||last<=0||previousClose<=0||Math.abs(variation/previousClose*100-percentChange)>.02)throw Error('Inconsistent BSE Sensex values');
 const dt=rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/);
 if(!dt)throw Error('BSE timestamp unavailable');
 const [,mo,day,year,h,min,sec,ampm]=dt,hr=Number(h)%12+(ampm==='PM'?12:0);
 const quoteTime=year+'-'+mo.padStart(2,'0')+'-'+day.padStart(2,'0')+'T'+String(hr).padStart(2,'0')+':'+min+':'+sec+'+05:30';
 if(!Number.isFinite(Date.parse(quoteTime)))throw Error('Invalid BSE timestamp');
 return {...source,last,variation,percentChange,previousClose,decimals:2,changeDecimals:2,quoteTime,timestamp:'BSE · '+day.padStart(2,'0')+'/'+mo.padStart(2,'0')+'/'+year+' '+h+':'+min+':'+sec+' '+ampm+' IST · source update',url:URL,fetchedAt:new Date().toISOString(),stale:false};
}
async function getSensex(source){return parseBseRss(await readFeed(),source)}
module.exports={parseBseRss,getSensex};
