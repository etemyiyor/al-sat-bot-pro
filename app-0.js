'use strict';
const $=id=>document.getElementById(id);
const STORE={watch:'asbp_watch_v2',trades:'asbp_trades_v2',alerts:'asbp_alerts_v2',td:'asbp_td_key',prices:'asbp_price_cache_v2'};
const BIST=`AEFES AGESA AGHOL AKBNK AKSA AKSEN ALARK ALFAS ALTNY ANHYT ANSGR ARCLK ASELS ASTOR BERA BIMAS BRSAN BTCIM CANTE CCOLA CIMSA CWENE CVKMD DAPGM DOHOL ECILC EGEEN EKGYO ENJSA EREGL FROTO GARAN GESAN GUBRF HALKB HEKTS ISCTR ISMEN KARSN KCHOL KONTR KRDMD MAVI MGROS MIATK MPARK ODAS OYAKC PETKM PGSUS SAHOL SASA SISE SOKM TAVHL TCELL THYAO TKFEN TOASO TSKB TTKOM TTRAK TUPRS TURSG ULKER VAKBN VESTL YKBNK ZOREN DOAS ENKAI KOZAL`.split(' ');
const CRYPTO=`BTCUSDT ETHUSDT BNBUSDT SOLUSDT XRPUSDT ADAUSDT DOGEUSDT AVAXUSDT DOTUSDT LINKUSDT LTCUSDT TRXUSDT ATOMUSDT NEARUSDT APTUSDT ARBUSDT OPUSDT SUIUSDT TONUSDT SHIBUSDT PEPEUSDT UNIUSDT AAVEUSDT ETCUSDT FILUSDT INJUSDT ICPUSDT HBARUSDT RENDERUSDT TAOUSDT`.split(' ');
const US=`AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO JPM LLY V MA NFLX COST WMT ORCL AMD CRM BAC KO PEP DIS ADBE CSCO INTC QCOM TXN IBM UBER PLTR SHOP SNOW PYPL NKE BA CAT GE XOM CVX JNJ PFE MRK ABBV T VZ GS MS SPY QQQ`.split(' ');
const PRESETS={crypto:['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','LINKUSDT'],bist:['THYAO','ASELS','TUPRS','FROTO','GARAN','EREGL','KCHOL','BIMAS'],us:['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AMD']};

let market='crypto',currentQuote=null,lastAnalysis=null,preparedOrder=null;

function safeGet(k,fallback=''){try{return localStorage.getItem(k)??fallback}catch{return fallback}}
function safeSet(k,v){try{localStorage.setItem(k,v);return true}catch{return false}}
function safeRemove(k){try{localStorage.removeItem(k);return true}catch{return false}}
function getJson(k,fb){try{return JSON.parse(safeGet(k,JSON.stringify(fb)))||fb}catch{return fb}}
function setJson(k,v){return safeSet(k,JSON.stringify(v))}
function fmt(n,d=2){n=Number(n);return Number.isFinite(n)?n.toLocaleString('tr-TR',{maximumFractionDigits:d,minimumFractionDigits:d}):'—'}
function compact(n){n=Number(n);if(!Number.isFinite(n))return'—';return new Intl.NumberFormat('tr-TR',{notation:'compact',maximumFractionDigits:2}).format(n)}
function nowText(){return new Date().toLocaleString('tr-TR')}
function toast(msg,type=''){const t=$('toast');t.textContent=msg;t.className='toast show '+type;clearTimeout(t._timer);t._timer=setTimeout(()=>t.className='toast',3200)}
function listFor(m){return m==='crypto'?CRYPTO:m==='bist'?BIST:US}
function marketName(m){return m==='crypto'?'Kripto':m==='bist'?'BIST 100':'ABD'}
function currency(m){return m==='crypto'?'USDT':m==='bist'?'TRY':'USD'}
function tdKey(){return safeGet(STORE.td,'').trim()}
function tdQuery(extra=''){return `apikey=${encodeURIComponent(tdKey())}${extra}`}
function updateStatus(){
  const online=navigator.onLine;
  $('netPill').className='pill '+(online?'ok':'bad');$('netText').textContent=online?'İnternet bağlı':'İnternet yok';
  const has=!!tdKey();$('tdPill').className='pill '+(has?'ok':'');$('tdText').textContent=has?'Twelve Data hazır':'Twelve Data kapalı';
  $('dashApi').textContent=has?'AKTİF':'KAPALI';$('dashApi').className='metric '+(has?'green':'amber');
}
window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);

document.querySelectorAll('#nav a').forEach(a=>a.addEventListener('click',()=>{
  document.querySelectorAll('#nav a').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  a.classList.add('active');const p=$(a.dataset.page);if(p)p.classList.add('active');
  $('pageTitle').textContent=a.textContent.trim();
  window.scrollTo({top:0,behavior:'smooth'});
}));

function priceCache(){return getJson(STORE.prices,{})}
function cachePrice(m,s,p){const c=priceCache();c[m+':'+s]={price:Number(p),time:Date.now()};setJson(STORE.prices,c)}
function cachedPrice(m,s){return priceCache()[m+':'+s]?.price??null}

async function fetchQuote(m,s){
  if(m==='crypto'){
    const r=await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(s)}`);
    const d=await r.json();if(!r.ok)throw Error(d.msg||'Binance fiyatı alınamadı');
    const out={market:m,symbol:s,price:+d.lastPrice,change:+d.priceChangePercent,open:+d.openPrice,high:+d.highPrice,low:+d.lowPrice,volume:+d.quoteVolume,source:'Binance'};
    cachePrice(m,s,out.price);return out;
  }
  if(!tdKey())throw Error('Ayarlar bölümünden Twelve Data API anahtarını kaydet');
  const mic=m==='bist'?'&mic_code=XIST':'';
  const r=await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(s)}${mic}&${tdQuery()}`);
  const d=await r.json();if(!r.ok||d.status==='error')throw Error(d.message||'Twelve Data fiyatı alınamadı');
  const p=+(d.close??d.price);const out={market:m,symbol:s,price:p,change:+(d.percent_change??0),open:+d.open,high:+d.high,low:+d.low,volume:+d.volume,source:m==='bist'?'Twelve Data / XIST':'Twelve Data'};
  cachePrice(m,s,p);return out;
}
async function fetchSeries(m,s,interval='1h',size=180){
  if(m==='crypto'){
    const r=await fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(s)}&interval=${interval}&limit=${Math.min(size,500)}`);
    const d=await r.json();if(!r.ok)throw Error(d.msg||'Binance seri verisi alınamadı');
    return d.map(x=>({time:x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
  }
  if(!tdKey())throw Error('Twelve Data API anahtarı gerekli');
  const map={'15m':'15min','1h':'1h','4h':'4h','1d':'1day'};
  const mic=m==='bist'?'&mic_code=XIST':'';
  const r=await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(s)}&interval=${map[interval]||'1day'}&outputsize=${Math.min(size,500)}&order=asc${mic}&${tdQuery()}`);
  const d=await r.json();if(!r.ok||d.status==='error')throw Error(d.message||'Twelve Data seri verisi alınamadı');
  if(!Array.isArray(d.values))throw Error('Zaman serisi bulunamadı');
  return d.values.map(x=>({time:x.datetime,open:+x.open,high:+x.high,low:+x.low,close:+x.close,volume:+x.volume})).filter(x=>Number.isFinite(x.close));
}

function sma(a,p){return a.map((_,i)=>i+1<p?null:a.slice(i-p+1,i+1).reduce((s,x)=>s+x,0)/p)}
function ema(a,p){if(!a.length)return[];const k=2/(p+1);let e=a[0];return a.map((v,i)=>i===0?e:(e=v*k+e*(1-k)))}
function stdev(a){if(!a.length)return 0;const m=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=1;i<=p;i++){const d=a[i]-a[i-1];if(d>=0)g+=d;else l-=d}let ag=g/p,al=l/p;for(let i=p+1;i<a.length;i++){const d=a[i]-a[i-1],gg=d>0?d:0,ll=d<0?-d:0;ag=(ag*(p-1)+gg)/p;al=(al*(p-1)+ll)/p}return al===0?100:100-(100/(1+ag/al))}
