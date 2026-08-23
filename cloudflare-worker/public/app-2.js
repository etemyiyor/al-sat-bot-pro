function computePortfolio(){
  const trades=[...getJson(STORE.trades,[])].sort((a,b)=>a.time-b.time),map={},realizedBy='mixed';let realized=0;
  for(const tr of trades){
    const k=tr.market+':'+tr.symbol;if(!map[k])map[k]={market:tr.market,symbol:tr.symbol,qty:0,avg:0,realized:0};
    const p=map[k],q=Number(tr.qty),price=Number(tr.price);
    if(tr.side==='BUY'){const newQty=p.qty+q;p.avg=newQty>0?(p.avg*p.qty+price*q)/newQty:0;p.qty=newQty}
    else{const sell=Math.min(q,Math.max(0,p.qty));const rz=(price-p.avg)*sell;p.realized+=rz;realized+=rz;p.qty=Math.max(0,p.qty-q);if(p.qty===0)p.avg=0}
  }
  return {positions:Object.values(map).filter(x=>x.qty>1e-12),realized};
}
function renderPortfolio(){
  const trades=getJson(STORE.trades,[]),pf=computePortfolio(),cache=priceCache();let cost=0;
  $('positionBody').innerHTML=pf.positions.length?pf.positions.map(p=>{const last=cache[p.market+':'+p.symbol]?.price??null,c=p.qty*p.avg;cost+=c;const up=last==null?null:(last-p.avg)*p.qty;return `<tr><td>${p.symbol}</td><td>${marketName(p.market)}</td><td>${fmt(p.qty,6)}</td><td>${fmt(p.avg,4)}</td><td>${last==null?'—':fmt(last,4)}</td><td class="${up==null?'':up>=0?'green':'red'}">${up==null?'—':fmt(up,2)}</td></tr>`}).join(''):`<tr><td colspan="6" class="empty">Açık paper pozisyon yok.</td></tr>`;
  $('tradeBody').innerHTML=trades.length?trades.map(t=>`<tr><td>${new Date(t.time).toLocaleString('tr-TR')}</td><td>${t.symbol}</td><td>${marketName(t.market)}</td><td class="${t.side==='BUY'?'green':'red'}">${t.side==='BUY'?'AL':'SAT'}</td><td>${fmt(t.qty,6)}</td><td>${fmt(t.price,4)}</td><td>${fmt(t.qty*t.price,2)}</td></tr>`).join(''):`<tr><td colspan="7" class="empty">Paper işlem yok.</td></tr>`;
  const w=getJson(STORE.watch,[]);$('watchBody').innerHTML=w.length?w.map((x,i)=>`<tr><td>${x.symbol}</td><td>${marketName(x.market)}</td><td>${new Date(x.added).toLocaleDateString('tr-TR')}</td><td><button class="btn" onclick="removeWatch(${i})">Sil</button></td></tr>`).join(''):`<tr><td colspan="4" class="empty">İzleme listesi boş.</td></tr>`;
  $('pfOpen').textContent=pf.positions.length;$('pfCost').textContent=fmt(cost,2);$('pfRealized').textContent=fmt(pf.realized,2);$('pfRealized').className='metric '+(pf.realized>=0?'green':'red');$('pfTrades').textContent=trades.length;
  $('dashWatch').textContent=w.length;$('dashPositions').textContent=pf.positions.length;$('dashRealized').textContent=fmt(pf.realized,2);$('dashRealized').className='metric '+(pf.realized>=0?'green':'red');
}
window.removeWatch=i=>{const w=getJson(STORE.watch,[]);w.splice(i,1);setJson(STORE.watch,w);renderPortfolio();toast('İzleme listesinden kaldırıldı')};
$('clearPaper').onclick=()=>{if(confirm('Tüm paper işlem geçmişi silinsin mi?')){safeRemove(STORE.trades);renderAll();toast('Paper geçmişi silindi')}};
$('refreshPositions').onclick=async()=>{
  const pf=computePortfolio();for(const p of pf.positions){try{await fetchQuote(p.market,p.symbol)}catch{}}renderPortfolio();toast('Pozisyon fiyatları yenilendi','ok')
};

function renderAlerts(){
  const a=getJson(STORE.alerts,[]);$('alertList').innerHTML=a.length?a.map(x=>`<div class="reason"><i></i><span><b>${x.symbol}</b> ${x.type==='above'?'≥':'≤'} ${fmt(x.target,4)} ${currency(x.market)} <button class="btn" style="padding:4px 7px;margin-left:6px" onclick="removeAlert(${x.id})">Sil</button></span></div>`).join(''):`<div class="empty">Fiyat uyarısı yok.</div>`
}
window.removeAlert=id=>{setJson(STORE.alerts,getJson(STORE.alerts,[]).filter(x=>x.id!==id));renderAlerts()};
$('clearAlerts').onclick=()=>{safeRemove(STORE.alerts);renderAlerts()};
$('checkAlerts').onclick=async()=>{
  const a=getJson(STORE.alerts,[]);if(!a.length)return toast('Kontrol edilecek uyarı yok');
  let hit=0;for(const x of a){try{const q=await fetchQuote(x.market,x.symbol);if((x.type==='above'&&q.price>=x.target)||(x.type==='below'&&q.price<=x.target)){hit++;toast(`${x.symbol} hedefe ulaştı: ${fmt(q.price,4)}`,'ok')}}catch{}}
  if(!hit)toast('Henüz tetiklenen uyarı yok')
};

$('analysisMarket').onchange=()=>{const m=$('analysisMarket').value;$('analysisSymbol').value=m==='crypto'?'BTCUSDT':m==='bist'?'XU100':'AAPL';$('analysisSource').textContent=m==='crypto'?'Kaynak: Binance':m==='bist'?'Kaynak: Twelve Data / XIST':'Kaynak: Twelve Data';$('tvMarket').value=m;$('tvSymbol').value=$('analysisSymbol').value;setTvExchangeVisibility()};
$('runAnalysis').onclick=async()=>{
  const m=$('analysisMarket').value,s=$('analysisSymbol').value.trim().toUpperCase(),int=$('analysisInterval').value;$('signalLabel').textContent='Yükleniyor';$('signalText').textContent='Veri alınıyor...';
  try{const rows=await fetchSeries(m,s,int,200);if(rows.length<55)throw Error('Teknik analiz için en az 55 veri noktası gerekli');const t=technical(rows);lastAnalysis={m,s,int,rows,t};renderAnalysis(lastAnalysis)}
  catch(e){$('signalLabel').textContent='HATA';$('signalLabel').className='metric red';$('signalText').textContent=e.message;toast(e.message,'bad')}
};
function renderAnalysis(a){
  const {m,s,int,rows,t}=a,score=t.score;$('signalLabel').textContent=t.label;$('signalLabel').className='metric '+(score>=20?'green':score<=-20?'red':'amber');$('signalText').textContent=`Skor ${score}/100 • ${s} • ${int}`;
  $('scoreCircle').textContent=score;$('scoreCircle').style.borderColor=score>=20?'#35d49a':score<=-20?'#ff6578':'#f2c66d';$('scoreBar').style.width=((score+100)/2)+'%';
  $('signalReasons').innerHTML=t.reasons.map(r=>`<div class="reason"><i style="background:${r[0]==='+'?'#35d49a':'#ff6578'}"></i><span>${r[1]}</span></div>`).join('');
  $('kpiRsi').textContent=fmt(t.rsi,2);$('kpiMacd').textContent=fmt(t.macd,5);$('kpiEma20').textContent=fmt(t.ema20,4);$('kpiEma50').textContent=fmt(t.ema50,4);$('kpiAtr').textContent=fmt(t.atr,4);$('kpiBb').textContent=`${fmt(t.bb.lower,2)} / ${fmt(t.bb.upper,2)}`;
  $('analysisSource').textContent=m==='crypto'?`Kaynak: Binance • ${s}`:m==='bist'?`Kaynak: Twelve Data / XIST • ${s} • BIST planına göre gecikmeli/EOD olabilir`:`Kaynak: Twelve Data • ${s}`;
  $('chartMeta').textContent=`${rows.length} mum • Son ${fmt(t.last,4)}`;drawChart(rows,t)
}

const TV_US_KNOWN={
  AAPL:'NASDAQ',MSFT:'NASDAQ',NVDA:'NASDAQ',AMZN:'NASDAQ',GOOGL:'NASDAQ',
  META:'NASDAQ',TSLA:'NASDAQ',AMD:'NASDAQ',NFLX:'NASDAQ',AVGO:'NASDAQ',
  INTC:'NASDAQ',QCOM:'NASDAQ',ADBE:'NASDAQ',CSCO:'NASDAQ',
  JPM:'NYSE',BAC:'NYSE',WMT:'NYSE',DIS:'NYSE',KO:'NYSE',PEP:'NASDAQ',
  XOM:'NYSE',CVX:'NYSE',IBM:'NYSE',BA:'NYSE',CAT:'NYSE',GE:'NYSE'
};