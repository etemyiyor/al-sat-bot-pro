(function(){
  'use strict';
  const LOGO='./tradex-ai-logo.webp?v=20260823-2';

  function installStyle(){
    if(document.getElementById('tradex-real-logo-style')) return;
    const s=document.createElement('style');
    s.id='tradex-real-logo-style';
    s.textContent=`
      .tradexRealLogo{display:block;width:54px;height:54px;object-fit:cover;border-radius:14px;border:1px solid rgba(58,169,255,.38);box-shadow:0 8px 28px rgba(0,0,0,.38)}
      .asbp-auth-brand .tradexRealLogo{width:64px;height:64px;border-radius:17px;flex:0 0 64px}
      .asbp-auth-brand .tradexAuthName{font-size:21px;font-weight:900;color:#f4f8ff;line-height:1.05}
      .asbp-auth-brand .tradexAuthName span{color:#38a9ff}
      .asbp-auth-brand .tradexAuthSub{display:block;color:#8ea1bb;font-size:12px;margin-top:5px}
      .tradexMark{background:none!important;border:0!important;box-shadow:none!important;overflow:visible!important}
      .tradexMark:before,.tradexMark svg{display:none!important}
      .tradexMark .tradexRealLogo{width:46px;height:46px;border-radius:13px}
      .mobileTradexBrand .tradexMark .tradexRealLogo{width:40px;height:40px;border-radius:11px}
    `;
    document.head.appendChild(s);
  }

  function replaceMainLogo(){
    document.querySelectorAll('.tradexMark').forEach(mark=>{
      if(mark.querySelector('.tradexRealLogo')) return;
      mark.innerHTML=`<img class="tradexRealLogo" src="${LOGO}" alt="TradeX AI">`;
    });
  }

  function replaceAuthLogo(){
    const brand=document.querySelector('.asbp-auth-brand');
    if(!brand) return;
    if(brand.dataset.tradexLogo==='1') return;
    const sub=/Yerel/i.test(brand.textContent||'')?'Yerel güvenli giriş':'Cloudflare güvenli giriş';
    brand.innerHTML=`<img class="tradexRealLogo" src="${LOGO}" alt="TradeX AI Logo"><div><div class="tradexAuthName">TradeX <span>AI</span></div><small class="tradexAuthSub">${sub}</small></div>`;
    brand.dataset.tradexLogo='1';
  }

  function apply(){
    document.title='TradeX AI | AI Trading Terminal';
    replaceMainLogo();
    replaceAuthLogo();
  }

  installStyle();
  apply();
  const obs=new MutationObserver(apply);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',apply);
})();
