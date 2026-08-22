function tvMapSymbol(m,s){
  s=(s||'').trim().toUpperCase();
  if(m==='crypto') return `BINANCE:${s}`;
  if(m==='bist') return `BIST:${s}`;
  const ex=TV_US_KNOWN[s]||$('tvExchange').value||'NASDAQ';
  return `${ex}:${s}`;
}
function tvMapInterval(i){
  return {'15m':'15','1h':'60','4h':'240','1d':'D','1w':'W'}[i]||'60';
}
function setTvExchangeVisibility(){
  const us=$('tvMarket').value==='us';
  $('tvExchangeGroup').style.display=us?'block':'none';
}
function renderTradingViewWidget(m,s,int){
  const host=$('tvChartHost');
  const tvs=tvMapSymbol(m,s);
  $('tvChartLabel').textContent=tvs;
  host.innerHTML='<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
  const container=host.querySelector('.tradingview-widget-container');
  const script=document.createElement('script');
  script.type='text/javascript';
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async=true;
  script.text=JSON.stringify({
    autosize:true,
    symbol:tvs,
    interval:tvMapInterval(int),
    timezone:'exchange',
    theme:'dark',
    style:'1',
    locale:'tr',
    backgroundColor:'#08111b',
    gridColor:'rgba(40,58,78,0.35)',
    withdateranges:true,
    hide_side_toolbar:false,
    allow_symbol_change:true,
    save_image:false,
    details:true,
    hotlist:false,
    calendar:false,
    support_host:'https://www.tradingview.com'
  });
  container.appendChild(script);
}
async function loadTvData(){
  const m=$('tvMarket').value;
  const s=$('tvSymbol').value.trim().toUpperCase();
  const int=$('tvInterval').value;
  if(!s)return toast('Sembol gir','bad');
  $('tvStatusText').textContent='Yükleniyor';
  $('tvQuotePrice').textContent='...';
  renderTradingViewWidget(m,s,int);
  try{
    const q=await fetchQuote(m,s);
    $('tvQuotePrice').textContent=fmt(q.price,m==='crypto'?6:2)+' '+currency(m);
    $('tvQuoteChange').textContent=(q.change>=0?'+':'')+fmt(q.change,2)+'%';
    $('tvQuoteChange').className=q.change>=0?'green':'red';
    $('tvDataSource').textContent=q.source;
    let seriesInt=int==='1w'?'1d':int;
    const rows=await fetchSeries(m,s,seriesInt,200);
    if(rows.length>=55){
      const t=technical(rows);
      $('tvRsi').textContent=fmt(t.rsi,2);
      $('tvScore').textContent=`${t.score} • ${t.label}`;
      $('tvScore').className=t.score>=20?'green':t.score<=-20?'red':'amber';
      $('tvEma20').textContent=fmt(t.ema20,4);
      $('tvEma50').textContent=fmt(t.ema50,4);
      $('tvMacd').textContent=fmt(t.macd,5);
      $('tvAtr').textContent=fmt(t.atr,4);
    }else{
      ['tvRsi','tvScore','tvEma20','tvEma50','tvMacd','tvAtr'].forEach(id=>$(id).textContent='Yetersiz veri');
    }
    $('tvNote').textContent=m==='bist'
      ?'BIST sayısal verisi Twelve Data / XIST üzerinden gelir ve abonelik planına göre gecikmeli veya EOD olabilir. TradingView grafiğinin veri seviyesi TradingView tarafına bağlıdır.'
      :m==='us'
      ?'ABD sayısal verisi Twelve Data üzerinden gelir. TradingView grafiği ayrı kaynaktan yüklenir; fiyat zamanlaması iki kaynakta aynı olmak zorunda değildir.'
      :'Kripto sayısal verisi Binance public API üzerinden gelir; TradingView grafiği BINANCE sembolünü kullanır.';
    $('tvStatusText').textContent='Hazır';
  }catch(e){
    $('tvQuotePrice').textContent='Veri yok';
    $('tvQuoteChange').textContent=e.message;
    $('tvQuoteChange').className='amber';
    $('tvStatusText').textContent='Veri hatası';
    toast(e.message,'bad');
  }
}
$('tvMarket').onchange=()=>{
  const m=$('tvMarket').value;
  $('tvSymbol').value=m==='crypto'?'BTCUSDT':m==='bist'?'THYAO':'AAPL';
  setTvExchangeVisibility();
};
$('loadTradingView').onclick=loadTvData;
$('tvSymbol').addEventListener('keydown',e=>{if(e.key==='Enter')loadTvData()});
$('tvInterval').onchange=()=>renderTradingViewWidget($('tvMarket').value,$('tvSymbol').value,$('tvInterval').value);
$('tvExchange').onchange=()=>{if($('tvMarket').value==='us')renderTradingViewWidget('us',$('tvSymbol').value,$('tvInterval').value)};

$('openInTradingView').onclick=()=>{
  const m=$('analysisMarket').value,s=$('analysisSymbol').value.trim().toUpperCase(),int=$('analysisInterval').value;
  $('tvMarket').value=m;$('tvSymbol').value=s;$('tvInterval').value=int;setTvExchangeVisibility();
  document.querySelectorAll('#nav a').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  const nav=document.querySelector('#nav a[data-page="tradingview"]');
  if(nav)nav.classList.add('active');
  $('tradingview').classList.add('active');
  $('pageTitle').textContent='Twelve + TradingView';
  loadTvData();
  window.scrollTo({top:0,behavior:'smooth'});
};

setTvExchangeVisibility();
setTimeout(()=>renderTradingViewWidget('crypto','BTCUSDT','1h'),180);

$('runScanner').onclick=async()=>{
  const m=$('scanMarket').value,int=$('scanInterval').value,limit=+$('scanLimit').value,syms=PRESETS[m].slice(0,limit);const body=$('scannerBody');body.innerHTML='';
  for(const s of syms){const tr=document.createElement('tr');tr.innerHTML=`<td>${s}</td><td colspan="6" class="amber">Yükleniyor...</td>`;body.appendChild(tr);try{const rows=await fetchSeries(m,s,int,120);if(rows.length<55)throw Error('Yetersiz veri');const t=technical(rows);tr.innerHTML=`<td>${s}</td><td>${fmt(t.last,4)}</td><td class="${t.score>=20?'green':t.score<=-20?'red':'amber'}">${t.score}</td><td>${t.label}</td><td>${fmt(t.rsi,1)}</td><td>${t.ema20>t.ema50?'Pozitif':'Negatif'}</td><td class="green">Tamam</td>`}catch(e){tr.innerHTML=`<td>${s}</td><td colspan="5">—</td><td class="red">${e.message}</td>`}}
};
$('scanMarket').onchange=()=>{$('scanNote').textContent=$('scanMarket').value==='crypto'?'Kripto taraması Binance public verisini kullanır.':'BIST/ABD taraması Twelve Data API kredisi kullanabilir.'};

$('calcRisk').onclick=()=>{
  const cap=+$('riskCapital').value,rp=+$('riskPct').value,en=+$('riskEntry').value,st=+$('riskStop').value,tg=+$('riskTarget').value,fr=+$('riskFriction').value;
  if(!(cap>0&&rp>0&&en>0&&st>0))return $('riskResult').innerHTML='<div class="badCallout">Sermaye, risk, giriş ve stop geçerli olmalı.</div>';
  const max=cap*rp/100,per=Math.abs(en-st),qty=max/per,not=qty*en,friction=not*fr/100,reward=tg>0?Math.abs(tg-en)*qty:0,rr=max?reward/max:0;
  $('riskResult').innerHTML=`<div class="kpiGrid" style="grid-template-columns:repeat(2,1fr)"><div class="kpi"><span>Maks. zarar</span><b>${fmt(max,2)}</b></div><div class="kpi"><span>Önerilen miktar</span><b>${fmt(qty,6)}</b></div><div class="kpi"><span>Pozisyon büyüklüğü</span><b>${fmt(not,2)}</b></div><div class="kpi"><span>Tahmini maliyet</span><b>${fmt(friction,2)}</b></div><div class="kpi"><span>Potansiyel kazanç</span><b>${fmt(reward,2)}</b></div><div class="kpi"><span>Risk / Ödül</span><b>1 : ${fmt(rr,2)}</b></div></div>`
};
