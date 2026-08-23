(function(){
  if(typeof fetchQuote!=='function'||typeof fetchSeries!=='function')return;
  const qPrev=fetchQuote,sPrev=fetchSeries;
  fetchQuote=async function(m,s){
    const q=await qPrev(m,s);
    if(m==='bist' && /twelve/i.test(String(q?.source||''))) throw Error('BIST için Twelve Data kullanımı engellendi. Bloomberg backend gerekli.');
    return q;
  };
  fetchSeries=async function(m,s,interval='1h',size=180){
    if(m==='bist'){
      try{return await sPrev(m,s,interval,size)}
      catch(e){
        if(/twelve/i.test(String(e?.message||''))) throw Error('BIST için Twelve Data devre dışı. Bloomberg backend bağlantısını kontrol et.');
        throw e;
      }
    }
    return sPrev(m,s,interval,size);
  };
  document.querySelectorAll('option').forEach(o=>{if(/BIST\s*\/\s*Twelve|BIST.*Twelve/i.test(o.textContent||''))o.textContent='BIST / Bloomberg'});
  const note=document.getElementById('scanNote');if(note&&/BIST.*Twelve/i.test(note.textContent||''))note.textContent='BIST taraması yalnızca Bloomberg backend verisini kullanır.';
  const tvNote=document.getElementById('tvNote');if(tvNote&&/BIST.*Twelve/i.test(tvNote.textContent||''))tvNote.textContent='BIST sayısal verisi yalnızca Bloomberg backend üzerinden gelir. TradingView grafiği bağımsızdır.';
  const src=document.getElementById('analysisSource');if(src&&/Twelve/i.test(src.textContent||''))src.textContent='Kaynak: Bloomberg';

  document.title='TradeX AI | Trading Terminal';
  const style=document.createElement('style');
  style.textContent=`
    .tradexBrand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#fff;min-width:0}
    .tradexMark{width:52px;height:52px;flex:0 0 52px;border-radius:14px;overflow:hidden;background:#061027;border:1px solid rgba(72,190,255,.42);box-shadow:0 10px 34px rgba(0,0,0,.38)}
    .tradexMark img{display:block;width:100%;height:100%;object-fit:cover}
    .tradexText{min-width:0;line-height:1.02}
    .tradexName{font-size:18px;font-weight:950;letter-spacing:.1px;white-space:nowrap}
    .tradexName .ai{color:#35d49a}
    .tradexSub{margin-top:5px;color:#8fa0b8;font-size:10px;letter-spacing:.7px;text-transform:uppercase;white-space:nowrap}
    .mobileTradexBrand{display:none}
    @media(max-width:800px){
      .mobileTradexBrand{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;padding:10px 11px;border:1px solid #223044;border-radius:14px;background:linear-gradient(180deg,rgba(16,24,35,.96),rgba(10,17,26,.96));box-shadow:0 10px 32px rgba(0,0,0,.24)}
      .mobileTradexBrand .tradexMark{width:44px;height:44px;flex-basis:44px;border-radius:12px}
      .mobileTradexBrand .tradexName{font-size:16px}
      .mobileTradexBrand .tradexSub{font-size:9px;margin-top:4px}
      .mobileTradexBadge{font-size:9px;font-weight:800;letter-spacing:.5px;color:#9ff4d6;border:1px solid rgba(53,212,154,.28);background:rgba(53,212,154,.08);padding:6px 8px;border-radius:999px;white-space:nowrap}
    }
  `;
  document.head.appendChild(style);

  const mark=`<span class="tradexMark"><img src="./tradex-ai-logo.webp?v=1" alt="TradeX AI"></span>`;
  const text=`<span class="tradexText"><span class="tradexName">TradeX <span class="ai">AI</span></span><span class="tradexSub">AI Trading Terminal</span></span>`;

  const desktopLogo=document.querySelector('.logo');
  if(desktopLogo){desktopLogo.innerHTML=`<a class="tradexBrand" href="#dashboard" aria-label="TradeX AI ana sayfa">${mark}${text}</a>`;}

  const main=document.querySelector('.main');
  const topbar=document.querySelector('.topbar');
  if(main&&topbar&&!document.querySelector('.mobileTradexBrand')){
    const mobile=document.createElement('div');
    mobile.className='mobileTradexBrand';
    mobile.innerHTML=`<a class="tradexBrand" href="#dashboard" aria-label="TradeX AI ana sayfa">${mark}${text}</a><span class="mobileTradexBadge">LIVE TERMINAL</span>`;
    main.insertBefore(mobile,topbar);
  }
})();