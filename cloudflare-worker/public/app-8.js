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

  // TradeX AI branding — works without an external image file and keeps mobile/desktop consistent.
  document.title='TradeX AI | Trading Terminal';
  const style=document.createElement('style');
  style.textContent=`
    .tradexBrand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#fff;min-width:0}
    .tradexMark{width:46px;height:46px;flex:0 0 46px;border-radius:14px;position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 30% 20%,rgba(56,189,248,.28),transparent 48%),linear-gradient(145deg,#07131f,#0d2232);border:1px solid rgba(72,190,255,.42);box-shadow:0 10px 34px rgba(0,0,0,.38),inset 0 0 22px rgba(37,211,166,.06)}
    .tradexMark:before{content:'';position:absolute;inset:7px;border:1px solid rgba(44,210,171,.22);border-radius:10px;transform:rotate(45deg)}
    .tradexMark svg{width:31px;height:31px;position:relative;z-index:2;filter:drop-shadow(0 0 8px rgba(54,211,173,.28))}
    .tradexText{min-width:0;line-height:1.02}
    .tradexName{font-size:18px;font-weight:950;letter-spacing:.1px;white-space:nowrap}
    .tradexName .ai{color:#35d49a}
    .tradexSub{margin-top:5px;color:#8fa0b8;font-size:10px;letter-spacing:.7px;text-transform:uppercase;white-space:nowrap}
    .mobileTradexBrand{display:none}
    @media(max-width:800px){
      .mobileTradexBrand{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;padding:10px 11px;border:1px solid #223044;border-radius:14px;background:linear-gradient(180deg,rgba(16,24,35,.96),rgba(10,17,26,.96));box-shadow:0 10px 32px rgba(0,0,0,.24)}
      .mobileTradexBrand .tradexMark{width:40px;height:40px;flex-basis:40px;border-radius:12px}
      .mobileTradexBrand .tradexMark svg{width:27px;height:27px}
      .mobileTradexBrand .tradexName{font-size:16px}
      .mobileTradexBrand .tradexSub{font-size:9px;margin-top:4px}
      .mobileTradexBadge{font-size:9px;font-weight:800;letter-spacing:.5px;color:#9ff4d6;border:1px solid rgba(53,212,154,.28);background:rgba(53,212,154,.08);padding:6px 8px;border-radius:999px;white-space:nowrap}
    }
  `;
  document.head.appendChild(style);

  const mark=`<span class="tradexMark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 43L25 31L34 38L51 20" stroke="#35D49A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 20H51V31" stroke="#65A9FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 20H31" stroke="#EAF6FF" stroke-width="4" stroke-linecap="round"/><path d="M22 20V46" stroke="#EAF6FF" stroke-width="4" stroke-linecap="round"/></svg></span>`;
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