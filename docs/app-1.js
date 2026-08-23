function atr(rows,p=14){if(rows.length<2)return null;const tr=[];for(let i=1;i<rows.length;i++){const r=rows[i],pc=rows[i-1].close;tr.push(Math.max(r.high-r.low,Math.abs(r.high-pc),Math.abs(r.low-pc)))}return tr.length?p?tr.slice(-p).reduce((s,x)=>s+x,0)/Math.min(p,tr.length):null:null}
function technical(rows){
  const c=rows.map(x=>x.close),e20=ema(c,20),e50=ema(c,50),e12=ema(c,12),e26=ema(c,26),mac=e12.map((x,i)=>x-e26[i]),sig=ema(mac,9);
  const rv=rsi(c),at=atr(rows),s20=sma(c,20),last=c.at(-1),mean=s20.at(-1),sd=c.length>=20?stdev(c.slice(-20)):0,upper=mean==null?null:mean+2*sd,lower=mean==null?null:mean-2*sd;
  let score=0,reasons=[];
  if(last>e20.at(-1)){score+=15;reasons.push(['+', 'Fiyat EMA20 üzerinde'])}else{score-=15;reasons.push(['-', 'Fiyat EMA20 altında'])}
  if(e20.at(-1)>e50.at(-1)){score+=20;reasons.push(['+', 'EMA20, EMA50 üzerinde'])}else{score-=20;reasons.push(['-', 'EMA20, EMA50 altında'])}
  if(mac.at(-1)>sig.at(-1)){score+=20;reasons.push(['+', 'MACD sinyal çizgisinin üzerinde'])}else{score-=20;reasons.push(['-', 'MACD sinyal çizgisinin altında'])}
  if(rv!=null&&rv<30){score+=25;reasons.push(['+', 'RSI aşırı satım bölgesinde'])}
  else if(rv!=null&&rv>70){score-=25;reasons.push(['-', 'RSI aşırı alım bölgesinde'])}
  else if(rv!=null&&rv>=50){score+=10;reasons.push(['+', 'RSI 50 üzerinde'])}
  else if(rv!=null){score-=10;reasons.push(['-', 'RSI 50 altında'])}
  if(lower!=null&&last<lower){score+=20;reasons.push(['+', 'Fiyat alt Bollinger bandının altında'])}
  if(upper!=null&&last>upper){score-=20;reasons.push(['-', 'Fiyat üst Bollinger bandının üzerinde'])}
  score=Math.max(-100,Math.min(100,score));
  const label=score>=50?'GÜÇLÜ AL':score>=20?'AL':score<=-50?'GÜÇLÜ SAT':score<=-20?'SAT':'NÖTR';
  return {score,label,rsi:rv,ema20:e20.at(-1),ema50:e50.at(-1),macd:mac.at(-1),signal:sig.at(-1),atr:at,bb:{upper,mid:mean,lower},ema20Series:e20,ema50Series:e50,reasons,last};
}

function drawChart(rows,t){
  const canvas=$('priceChart'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,pad={l:54,r:18,t:18,b:28};
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#08111b';ctx.fillRect(0,0,W,H);
  const visible=rows.slice(-100),offset=rows.length-visible.length,vals=visible.flatMap(r=>[r.high,r.low]).filter(Number.isFinite);
  if(!vals.length)return;const min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
  const x=i=>pad.l+i*(W-pad.l-pad.r)/Math.max(1,visible.length-1),y=v=>pad.t+(max-v)/range*(H-pad.t-pad.b);
  ctx.strokeStyle='#18283a';ctx.lineWidth=1;ctx.font='12px system-ui';ctx.fillStyle='#7f91a9';
  for(let j=0;j<=4;j++){const yy=pad.t+j*(H-pad.t-pad.b)/4;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();const val=max-j*range/4;ctx.fillText(fmt(val,4),4,yy+4)}
  const candleW=Math.max(2,Math.min(8,(W-pad.l-pad.r)/visible.length*.58));
  visible.forEach((r,i)=>{const xx=x(i),yo=y(r.open),yc=y(r.close),yh=y(r.high),yl=y(r.low),up=r.close>=r.open;ctx.strokeStyle=up?'#35d49a':'#ff6578';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();ctx.fillRect(xx-candleW/2,Math.min(yo,yc),candleW,Math.max(1,Math.abs(yc-yo)))})
  function line(series,color){ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.beginPath();visible.forEach((_,i)=>{const v=series[offset+i];if(v==null)return;const xx=x(i),yy=y(v);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke()}
  line(t.ema20Series,'#65a9ff');line(t.ema50Series,'#b18cff');
}

function renderSymbols(){
  const q=$('marketSearch').value.trim().toUpperCase(),arr=listFor(market).filter(s=>s.includes(q));
  $('symbolCount').textContent=arr.length+' sembol';
  $('symbolGrid').innerHTML=arr.map(s=>`<div class="symbol" data-symbol="${s}"><strong>${s}</strong><span>${s==='XU100'?'BIST 100 Endeksi':marketName(market)}</span></div>`).join('');
  document.querySelectorAll('.symbol').forEach(el=>el.onclick=()=>openQuote(el.dataset.symbol));
}
document.querySelectorAll('#marketTabs [data-market]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#marketTabs [data-market]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  market=b.dataset.market;
  $('marketSearch').value='';
  $('quoteCard').classList.add('hidden');
  renderSymbols();
  if(market==='bist')toast('BIST 100 listesi açıldı: XU100 ve hisseler','ok');
});
$('marketSearch').oninput=renderSymbols;

async function openQuote(s){
  $('quoteCard').classList.remove('hidden');$('quoteSymbol').textContent=s;$('quotePrice').textContent='Yükleniyor...';$('quoteChange').textContent='';currentQuote=null;
  try{
    const q=await fetchQuote(market,s);currentQuote=q;
    $('quoteSource').textContent=q.source+(market==='bist'?' • veri gecikmeli/EOD olabilir':'');
    $('quotePrice').textContent=fmt(q.price,market==='crypto'?6:2)+' '+currency(market);
    $('paperPrice').value=q.price;
    const ch=Number(q.change);$('quoteChange').textContent=(ch>=0?'+':'')+fmt(ch,2)+'%';$('quoteChange').className='change '+(ch>=0?'green':'red');
    $('qOpen').textContent=fmt(q.open,4);$('qHigh').textContent=fmt(q.high,4);$('qLow').textContent=fmt(q.low,4);$('qVolume').textContent=compact(q.volume);
  }catch(e){$('quotePrice').textContent='Veri alınamadı';$('quoteChange').textContent=e.message;$('quoteChange').className='change amber';toast(e.message,'bad')}
}
$('addWatch').onclick=()=>{
  if(!currentQuote)return;const a=getJson(STORE.watch,[]);if(!a.some(x=>x.symbol===currentQuote.symbol&&x.market===currentQuote.market)){a.unshift({symbol:currentQuote.symbol,market:currentQuote.market,added:Date.now()});setJson(STORE.watch,a);toast('İzleme listesine eklendi','ok')}else toast('Zaten izleme listesinde');renderAll();
};
$('addAlert').onclick=()=>{
  if(!currentQuote)return;const val=prompt(`${currentQuote.symbol} için hedef fiyat:`,String(currentQuote.price));if(val===null)return;const target=Number(val);if(!(target>0))return toast('Geçerli hedef fiyat gir','bad');
  const type=target>=currentQuote.price?'above':'below',a=getJson(STORE.alerts,[]);a.unshift({id:Date.now(),symbol:currentQuote.symbol,market:currentQuote.market,target,type,created:Date.now()});setJson(STORE.alerts,a);renderAlerts();toast('Fiyat uyarısı eklendi','ok')
};
$('paperExecute').onclick=()=>{
  if(!currentQuote)return toast('Önce bir sembol seç','bad');const qty=+$('paperQty').value,price=+$('paperPrice').value,side=$('paperSide').value;if(!(qty>0&&price>0))return toast('Miktar ve fiyat geçerli olmalı','bad');
  const a=getJson(STORE.trades,[]);a.unshift({id:Date.now(),time:Date.now(),market:currentQuote.market,symbol:currentQuote.symbol,side,qty,price});setJson(STORE.trades,a.slice(0,500));cachePrice(currentQuote.market,currentQuote.symbol,price);renderAll();toast('Paper işlem kaydedildi','ok')
};