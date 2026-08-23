$('prepareOrder').onclick=()=>{
  const m=$('orderMarket').value,s=$('orderSymbol').value.trim().toUpperCase(),side=$('orderSide').value,p=+$('orderPrice').value,q=+$('orderQty').value,cap=+$('orderCapital').value,sp=+$('orderStopPct').value,tp=+$('orderTakePct').value,rp=+$('orderRiskPct').value,dp=+$('orderDailyPct').value,fee=+$('orderFeePct').value,slip=+$('orderSlipPct').value;
  if(!(s&&p>0&&q>0&&cap>0))return toast('Sembol, fiyat, miktar ve hesap büyüklüğünü gir','bad');
  const not=q*p,stop=side==='BUY'?p*(1-sp/100):p*(1+sp/100),take=side==='BUY'?p*(1+tp/100):p*(1-tp/100),loss=Math.abs(p-stop)*q,max=cap*rp/100,daily=cap*dp/100,friction=not*(fee+slip)/100;
  const checks=[['Miktar / nominal',q>0&&not>0,`Nominal ${fmt(not,2)}`],['İşlem riski',loss<=max,`${fmt(loss,2)} / limit ${fmt(max,2)}`],['Günlük zarar limiti',loss<=daily,`${fmt(loss,2)} / günlük ${fmt(daily,2)}`],['Komisyon + slippage',friction<max,`${fmt(friction,2)} tahmini maliyet`]];
  const pass=checks.every(x=>x[1]);preparedOrder={m,s,side,p,q,cap,stop,take,loss,max,daily,friction,pass};
  $('orderSummary').innerHTML=`<div class="${pass?'okCallout':'badCallout'}"><b>${s} • ${side==='BUY'?'AL':'SAT'}</b><br>Piyasa: ${marketName(m)}<br>Miktar: ${fmt(q,6)}<br>Fiyat: ${fmt(p,6)}<br>Nominal: ${fmt(not,2)}<br>Stop: ${fmt(stop,6)}<br>Take Profit: ${fmt(take,6)}<br>Tahmini zarar: ${fmt(loss,2)}<br>Maliyet: ${fmt(friction,2)}<br><b>${pass?'MANUEL ONAYA HAZIR':'RİSK KİLİDİ AKTİF'}</b></div>`;
  $('orderChecks').innerHTML=checks.map(x=>`<div class="reason"><i style="background:${x[1]?'#35d49a':'#ff6578'}"></i><span><b>${x[0]}: ${x[1]?'PASS':'BLOCK'}</b><br><span class="muted">${x[2]}</span></span></div>`).join('');$('copyOrder').disabled=false
};
$('copyOrder').onclick=async()=>{
  if(!preparedOrder)return;const o=preparedOrder,txt=`AL-SAT BOT PRO EMİR PLANI\n${o.s} ${o.side}\nPiyasa: ${marketName(o.m)}\nMiktar: ${o.q}\nFiyat: ${o.p}\nStop: ${o.stop}\nTake: ${o.take}\nTahmini zarar: ${o.loss}\nSonuç: ${o.pass?'PASS':'BLOCK'}`;
  try{await navigator.clipboard.writeText(txt);toast('Emir özeti kopyalandı','ok')}catch{toast('Tarayıcı kopyalamaya izin vermedi','bad')}
};

$('saveTd').onclick=()=>{const k=$('tdKey').value.trim();if(!k)return toast('API anahtarı boş','bad');safeSet(STORE.td,k);updateStatus();$('tdMessage').innerHTML='<span class="green">API anahtarı kaydedildi.</span>';toast('Twelve Data anahtarı kaydedildi','ok')};
$('testTd').onclick=async()=>{
  const k=$('tdKey').value.trim()||tdKey();if(!k)return toast('Önce API anahtarını gir','bad');$('tdMessage').textContent='Bağlantı test ediliyor...';
  try{const r=await fetch(`https://api.twelvedata.com/quote?symbol=AAPL&apikey=${encodeURIComponent(k)}`),d=await r.json();if(!r.ok||d.status==='error')throw Error(d.message||'API testi başarısız');safeSet(STORE.td,k);$('tdMessage').innerHTML=`<span class="green">Bağlantı başarılı.</span> AAPL: ${d.close||d.price||'veri geldi'} USD`;updateStatus();toast('Twelve Data bağlantısı başarılı','ok')}
  catch(e){$('tdMessage').innerHTML=`<span class="red">Bağlantı başarısız:</span> ${e.message}`;toast(e.message,'bad')}
};
$('removeTd').onclick=()=>{safeRemove(STORE.td);$('tdKey').value='';$('tdMessage').textContent='API anahtarı silindi.';updateStatus()};
$('exportData').onclick=()=>{
  const data={version:2,created:new Date().toISOString(),watch:getJson(STORE.watch,[]),trades:getJson(STORE.trades,[]),alerts:getJson(STORE.alerts,[]),prices:priceCache()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='al-sat-bot-pro-yedek.json';a.click();URL.revokeObjectURL(url)
};
$('importData').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.watch)setJson(STORE.watch,d.watch);if(d.trades)setJson(STORE.trades,d.trades);if(d.alerts)setJson(STORE.alerts,d.alerts);if(d.prices)setJson(STORE.prices,d.prices);renderAll();toast('Yedek yüklendi','ok')}catch{toast('Geçersiz yedek dosyası','bad')}e.target.value=''
};
$('resetData').onclick=()=>{if(confirm('Tüm yerel izleme, paper işlem, uyarı ve fiyat önbelleği silinsin mi?')){[STORE.watch,STORE.trades,STORE.alerts,STORE.prices].forEach(safeRemove);renderAll();toast('Yerel veriler temizlendi')}};

async function refreshQuick(){
  const box=$('quickQuotes'),cells=box.querySelectorAll('.quickQuote');
  const targets=[['crypto','BTCUSDT'],['crypto','ETHUSDT'],['us','AAPL'],['bist','XU100'],['bist','THYAO'],['bist','ASELS'],['bist','TUPRS'],['bist','BIMAS']];
  for(let i=0;i<targets.length;i++){
    const [m,s]=targets[i],cell=cells[i];if(!cell)continue;const pr=cell.querySelector('.qprice'),sm=cell.querySelector('small');pr.textContent='...';
    try{const q=await fetchQuote(m,s);pr.textContent=fmt(q.price,m==='crypto'?4:2)+' '+currency(m);pr.className='qprice '+(q.change>=0?'green':'red');sm.textContent=`${q.source} • ${q.change>=0?'+':''}${fmt(q.change,2)}%`}
    catch(e){pr.textContent='—';pr.className='qprice amber';sm.textContent=e.message}
  }
}
$('refreshQuick').onclick=refreshQuick;

function renderAll(){renderSymbols();renderPortfolio();renderAlerts();updateStatus()}
$('tdKey').value=tdKey();
renderAll();
setTimeout(refreshQuick,100);
