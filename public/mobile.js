(()=>{
 const filter=document.querySelector('#filter'),refresh=document.querySelector('#refresh');
 let quotesPending=false,extrasPending=false;
 function notice(){const p=document.querySelector('#connectionNotice');p.hidden=navigator.onLine;p.textContent='Offline. Connect to the internet for current quotes. Displayed values may be outdated.';refresh.disabled=!navigator.onLine}
 function active(){document.querySelectorAll('.extra-tabs button').forEach(b=>b.removeAttribute('aria-current'));const names={all:'Watchlist',India:'India & Shares',US:'US & Shares',World:'World Markets',lucknow:'Lucknow Metals',fii:'FII / DII',Currency:'USD / INR',energy:'Oil'};for(const b of document.querySelectorAll('.extra-tabs button'))if(b.textContent===names[filter.value])b.setAttribute('aria-current','page')}
 async function quotes(force=false){if(document.hidden||!navigator.onLine||quotesPending)return;quotesPending=true;const view=filter.value;try{await Promise.all([loadNse(force),loadGlobal(force)])}finally{quotesPending=false;if(view!==filter.value)quotes()}}
 async function extras(force=false){if(document.hidden||!navigator.onLine||extrasPending)return;extrasPending=true;try{await window.refreshExtras?.(force)}finally{extrasPending=false}}
 refresh.onclick=async()=>{if(!navigator.onLine)return;refresh.disabled=true;refresh.textContent='Refreshing…';try{await Promise.all([quotes(true),extras(true)])}finally{refresh.disabled=!navigator.onLine;refresh.textContent='↻ Refresh'}};
 filter.addEventListener('change',()=>{active();try{localStorage.setItem('marketdesk-mobile-view',filter.value)}catch{}quotes()});
 setInterval(()=>quotes(),60000);
 setInterval(()=>{if(filter.value==='Currency'||document.querySelector('details[data-share-group][open]'))extras()},120000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){notice();quotes();if(['lucknow','fii','Currency'].includes(filter.value))extras()}});
 window.addEventListener('offline',()=>{notice();document.querySelectorAll('.quote').forEach(h=>h.dataset.symbol.startsWith('NSE:')?paintNse(h):paintGlobal(h))});
 window.addEventListener('online',()=>{notice();quotes();extras()});
 notice();let view='India';try{view=localStorage.getItem('marketdesk-mobile-view')||view}catch{}if([...filter.options].some(o=>o.value===view))filter.value=view;filter.dispatchEvent(new Event('change'));
 if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
