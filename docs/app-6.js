(function(){
  const dashboard=document.getElementById('dashboard');
  if(!dashboard||document.getElementById('marketCommandCenter'))return;

  const hero=document.createElement('div');
  hero.id='marketCommandCenter';
  hero.className='marketCommandCenter';
  hero.innerHTML=`
    <div class="mcGlow mcGlowOne"></div><div class="mcGlow mcGlowTwo"></div>
    <div class="mcMain">
      <div class="mcEyebrow"><span class="livePulse"></span> MARKET COMMAND CENTER <span class="mcVersion">PRO v16</span></div>
      <h2>Piyasayı <span>tek merkezden</span> yönet.</h2>
      <p>Kripto, BIST 100 ve ABD piyasalarını teknik analiz, TradingView ve AI PRO sinyalleriyle aynı terminalde takip et.</p>
      <div class="mcActions">
        <button class="mcBtn mcPrimary" data-go="ai">AI PRO Analiz</button>
        <button class="mcBtn" data-go="markets">Piyasaları Aç</button>
        <button class="mcBtn" data-go="tradingview">TradingView</button>
      </div>
      <div class="mcStats">
        <div><span>PİYASA</span><b>3</b><small>Kripto • BIST • ABD</small></div>
        <div><span>ANALİZ MOTORU</span><b>AI PRO</b><small>Çoklu zaman dilimi</small></div>
        <div><span>RİSK MODU</span><b>AKTİF</b><small>Stop • hedef • skor</small></div>
      </div>
    </div>
    <div class="mcVisual">
      <div class="radarWrap">
        <div class="radarRing r1"></div><div class="radarRing r2"></div><div class="radarRing r3"></div>
        <div class="radarSweep"></div>
        <div class="radarCore"><span>AI</span><b>PRO</b></div>
        <i class="radarDot d1"></i><i class="radarDot d2"></i><i class="radarDot d3"></i><i class="radarDot d4"></i>
      </div>
      <div class="mcSignal"><span>MODEL DURUMU</span><b>QUANT ENGINE ONLINE</b><small>Trend • Momentum • Volatilite • Hacim</small></div>
    </div>`;
  dashboard.insertBefore(hero,dashboard.firstChild);

  const flow=document.createElement('div');
  flow.className='marketFlow';
  flow.innerHTML=`<div class="marketFlowLabel"><span class="livePulse"></span> PİYASA AKIŞI</div><div class="marketFlowTrack" id="marketFlowTrack">
    <div class="flowItem"><b>BTC/USDT</b><span data-flow="0">Binance</span></div>
    <div class="flowItem"><b>ETH/USDT</b><span data-flow="1">Binance</span></div>
    <div class="flowItem"><b>AAPL</b><span data-flow="2">ABD</span></div>
    <div class="flowItem"><b>THYAO</b><span data-flow="3">BIST</span></div>
    <div class="flowItem accent"><b>XU100</b><span>BIST 100</span></div>
    <div class="flowItem purple"><b>AI PRO</b><span>Quant Engine</span></div>
  </div>`;
  hero.insertAdjacentElement('afterend',flow);

  function go(page){
    const link=document.querySelector(`#nav a[data-page="${page}"]`);
    if(link){link.click();return}
    const section=document.getElementById(page);
    if(section){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));section.classList.add('active')}
  }
  hero.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));

  document.querySelectorAll('#nav a').forEach(a=>{
    const p=a.dataset.page;
    const icons={dashboard:'◈',markets:'⌁',analysis:'⌁',tradingview:'▤',scanner:'⌕',portfolio:'◆',risk:'◎',orderplan:'⇄',settings:'⚙',ai:'✦'};
    if(!a.querySelector('.navGlyph')){
      const g=document.createElement('span');g.className='navGlyph';g.textContent=icons[p]||'•';
      const dot=a.querySelector('.navDot');if(dot)dot.replaceWith(g);else a.prepend(g);
    }
  });

  const clock=document.createElement('div');
  clock.className='terminalClock';clock.innerHTML='<span>IST</span><b id="terminalClockTime">--:--:--</b>';
  const topbar=document.querySelector('.topbar');if(topbar)topbar.appendChild(clock);
  function tick(){const e=document.getElementById('terminalClockTime');if(e)e.textContent=new Date().toLocaleTimeString('tr-TR',{hour12:false})}
  tick();setInterval(tick,1000);

  function syncFlow(){
    const cards=document.querySelectorAll('#quickQuotes .quickQuote');
    cards.forEach((c,i)=>{const t=document.querySelector(`[data-flow="${i}"]`);if(!t)return;const p=c.querySelector('.qprice')?.textContent||'',s=c.querySelector('small')?.textContent||'';if(p&&p!=='—'&&p!=='...')t.innerHTML=`<strong>${p}</strong> <em>${s.split('•').pop()?.trim()||''}</em>`});
  }
  syncFlow();setInterval(syncFlow,2500);
})();