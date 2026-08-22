(function(){
  if(typeof STORE==='undefined')return;
  STORE.bb='asbp_bloomberg_backend_v1';
  try{safeRemove(STORE.td)}catch(e){}

  const originalFetchQuote=fetchQuote;
  const originalFetchSeries=fetchSeries;
  const originalRenderAnalysis=typeof renderAnalysis==='function'?renderAnalysis:null;
  const originalLoadTvData=typeof loadTvData==='function'?loadTvData:null;

  function bbBase(){return safeGet(STORE.bb,'').trim().replace(/\/+$/,'')}
  function bbConfigured(){return /^https?:\/\//i.test(bbBase())}
  function bbUrl(path,params={}){
    const base=bbBase();if(!base)throw Error('Ayarlar bölümünden Bloomberg Backend URL gir');
    const u=new URL(base+path);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)u.searchParams.set(k,String(v))});return u.toString();
  }
  async function bbRequest(path,params){
    const r=await fetch(bbUrl(path,params),{headers:{Accept:'application/json'},cache:'no-store'});
    let d;try{d=await r.json()}catch{throw Error('Bloomberg backend geçerli JSON döndürmedi')}
    if(!r.ok||d?.error)throw Error(d?.message||d?.error||`Bloomberg backend hatası (${r.status})`);
    return d?.data??d;
  }
  function num(...vals){for(const v of vals){const n=Number(v);if(Number.isFinite(n))return n}return NaN}
  function normalizeQuote(m,s,d){
    const p=num(d.price,d.last,d.close,d.PX_LAST,d.px_last);
    if(!Number.isFinite(p))throw Error('Bloomberg backend fiyat alanı döndürmedi');
    const out={market:m,symbol:s,price:p,change:num(d.change_percent,d.percent_change,d.changePct,d.change,0),open:num(d.open,d.PX_OPEN,d.px_open),high:num(d.high,d.PX_HIGH,d.px_high),low:num(d.low,d.PX_LOW,d.px_low),volume:num(d.volume,d.VOLUME,d.px_volume,0),source:d.source||'Bloomberg'};
    cachePrice(m,s,p);return out;
  }
  function normalizeRows(d){
    const arr=Array.isArray(d)?d:(d.values||d.rows||d.series||[]);
    return arr.map(x=>({time:x.time??x.datetime??x.date??x.timestamp,open:num(x.open,x.OPEN,x.PX_OPEN),high:num(x.high,x.HIGH,x.PX_HIGH),low:num(x.low,x.LOW,x.PX_LOW),close:num(x.close,x.last,x.CLOSE,x.PX_LAST),volume:num(x.volume,x.VOLUME,0)})).filter(x=>Number.isFinite(x.close));
  }

  fetchQuote=async function(m,s){
    if(m==='crypto')return originalFetchQuote(m,s);
    const d=await bbRequest('/quote',{market:m,symbol:s});
    return normalizeQuote(m,s,d);
  };
  fetchSeries=async function(m,s,interval='1h',size=180){
    if(m==='crypto')return originalFetchSeries(m,s,interval,size);
    const d=await bbRequest('/series',{market:m,symbol:s,interval,limit:Math.min(size,500)});
    const rows=normalizeRows(d);if(!rows.length)throw Error('Bloomberg backend zaman serisi döndürmedi');return rows;
  };

  updateStatus=function(){
    const online=navigator.onLine;
    if($('netPill')){$('netPill').className='pill '+(online?'ok':'bad');$('netText').textContent=online?'İnternet bağlı':'İnternet yok'}
    const has=bbConfigured();
    if($('tdPill')){$('tdPill').className='pill '+(has?'ok':'');$('tdText').textContent=has?'Bloomberg hazır':'Bloomberg bağlı değil'}
    if($('dashApi')){$('dashApi').textContent=has?'BLOOMBERG':'KAPALI';$('dashApi').className='metric '+(has?'green':'amber')}
  };
  window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);

  function replaceBrand(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let n;
    while(n=walker.nextNode()){const tag=n.parentElement?.tagName;if(tag==='SCRIPT'||tag==='STYLE')continue;if(/Twelve/i.test(n.nodeValue||''))nodes.push(n)}
    nodes.forEach(x=>{x.nodeValue=x.nodeValue.replace(/Twelve Data \/ XIST/gi,'Bloomberg / BIST').replace(/Twelve Data/gi,'Bloomberg').replace(/Twelve/gi,'Bloomberg')});
  }
  replaceBrand();
  const obs=new MutationObserver(ms=>{for(const m of ms){for(const node of m.addedNodes){if(node.nodeType===1||node.nodeType===3)replaceBrand(node.nodeType===1?node:node.parentElement||document.body)}}});
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});

  const input=$('tdKey'),save=$('saveTd'),test=$('testTd'),remove=$('removeTd'),msg=$('tdMessage');
  if(input){input.type='url';input.autocomplete='off';input.placeholder='https://sunucun.com/api/bloomberg';input.value=bbBase();const lab=input.closest('.formGroup')?.querySelector('label');if(lab)lab.textContent='Bloomberg Backend URL'}
  const settingsCard=input?.closest('.card');
  if(settingsCard){const h=settingsCard.querySelector('h2');if(h)h.textContent='Bloomberg Market Data';const p=settingsCard.querySelector('p');if(p)p.innerHTML='BIST ve ABD verileri Bloomberg SAPI / Web API erişimini kullanan <b>güvenli sunucu katmanından</b> alınır. Bloomberg credential veya secret bilgisi bu tarayıcıya yazılmaz.'}
  if(save){save.textContent='Bloomberg Bağlantısını Kaydet';save.onclick=()=>{const v=input.value.trim().replace(/\/+$/,'');if(!/^https?:\/\//i.test(v))return toast('Geçerli bir Bloomberg backend URL gir','bad');safeSet(STORE.bb,v);updateStatus();if(msg)msg.innerHTML='<span class="green">Bloomberg backend adresi kaydedildi.</span>';toast('Bloomberg backend kaydedildi','ok')}}
  if(test){test.textContent='Bloomberg Bağlantısını Test Et';test.onclick=async()=>{const v=input.value.trim().replace(/\/+$/,'');if(v)safeSet(STORE.bb,v);if(!bbConfigured())return toast('Önce Bloomberg backend URL gir','bad');if(msg)msg.textContent='Bloomberg bağlantısı test ediliyor...';try{let d;try{d=await bbRequest('/health',{})}catch{d=await bbRequest('/quote',{market:'us',symbol:'AAPL'})}if(msg)msg.innerHTML='<span class="green">Bloomberg backend erişilebilir.</span>';updateStatus();toast('Bloomberg bağlantısı başarılı','ok')}catch(e){if(msg)msg.innerHTML=`<span class="red">Bağlantı başarısız:</span> ${e.message}`;toast(e.message,'bad')}}}
  if(remove){remove.textContent='Bloomberg Bağlantısını Sil';remove.onclick=()=>{safeRemove(STORE.bb);if(input)input.value='';if(msg)msg.textContent='Bloomberg backend bağlantısı silindi.';updateStatus()}}
  if(msg&&!bbConfigured())msg.innerHTML='Bloomberg erişimi için önce güvenli backend URL yapılandır.';

  if(settingsCard&&!document.getElementById('bbContract')){
    const c=document.createElement('div');c.id='bbContract';c.className='callout';c.style.marginTop='12px';c.innerHTML='<b>Bloomberg Backend sözleşmesi</b><br><span class="muted">/health • /quote?market=bist&symbol=THYAO • /series?market=bist&symbol=THYAO&interval=1d&limit=200</span><br><span class="small">Backend Bloomberg yetkisini sunucu tarafında tutmalı; secret tarayıcıya gönderilmemeli.</span>';settingsCard.appendChild(c);
  }

  if(originalRenderAnalysis){renderAnalysis=function(a){originalRenderAnalysis(a);if($('analysisSource'))$('analysisSource').textContent=a.m==='crypto'?`Kaynak: Binance • ${a.s}`:`Kaynak: Bloomberg • ${a.s}`}}
  if(originalLoadTvData){loadTvData=async function(){await originalLoadTvData();const m=$('tvMarket')?.value;if($('tvNote')&&m!=='crypto')$('tvNote').textContent=m==='bist'?'BIST sayısal verisi yapılandırdığın Bloomberg backend üzerinden gelir. XU100 grafiği TradingView BIST:XU100 ile bağımsız yüklenir.':'ABD sayısal verisi yapılandırdığın Bloomberg backend üzerinden gelir. TradingView grafiği ayrı kaynaktan yüklenir.';replaceBrand()}}
  if($('scanMarket'))$('scanMarket').onchange=()=>{$('scanNote').textContent=$('scanMarket').value==='crypto'?'Kripto taraması Binance public verisini kullanır.':'BIST/ABD taraması Bloomberg backend verisini kullanır.'};
  if($('analysisMarket'))$('analysisMarket').onchange=()=>{const m=$('analysisMarket').value;$('analysisSymbol').value=m==='crypto'?'BTCUSDT':m==='bist'?'XU100':'AAPL';$('analysisSource').textContent=m==='crypto'?'Kaynak: Binance':'Kaynak: Bloomberg';$('tvMarket').value=m;$('tvSymbol').value=$('analysisSymbol').value;setTvExchangeVisibility()};

  document.querySelectorAll('#quickQuotes .quickQuote small').forEach((el,i)=>{if(i>=2)el.textContent='Bloomberg'});
  const apiSub=$('dashApi')?.nextElementSibling;if(apiSub&&/Bloomberg|Twelve/i.test(apiSub.textContent))apiSub.textContent='Bloomberg Market Data';
  updateStatus();
})();