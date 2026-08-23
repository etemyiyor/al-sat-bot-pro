(function(){
  'use strict';
  const LOGO='./tradex-ai-logo.webp?v=20260823-4';

  function ensureStyle(){
    if(document.getElementById('tradex-final-brand-style')) return;
    const s=document.createElement('style');
    s.id='tradex-final-brand-style';
    s.textContent=`
      .tradex-login-logo{width:72px;height:72px;object-fit:cover;border-radius:18px;display:block;flex:0 0 72px;border:1px solid rgba(56,169,255,.45);box-shadow:0 12px 36px rgba(0,0,0,.42)}
      .tradex-login-name{font-size:24px;font-weight:950;letter-spacing:.2px;color:#f5f9ff;line-height:1}
      .tradex-login-name .ai{color:#38a9ff}
      .tradex-login-sub{display:block;margin-top:6px;color:#8ea1bb;font-size:12px;letter-spacing:.3px}
      .asbp-auth-brand{align-items:center!important;gap:14px!important}
      .asbp-auth-mark{display:none!important}
      @media(max-width:520px){.tradex-login-logo{width:62px;height:62px;flex-basis:62px;border-radius:16px}.tradex-login-name{font-size:21px}}
    `;
    document.head.appendChild(s);
  }

  function brandAuth(){
    const brand=document.querySelector('.asbp-auth-brand');
    if(!brand) return;
    if(brand.dataset.tradexFinal==='1') return;
    const sub=/Yerel/i.test(brand.textContent||'')?'Yerel güvenli giriş':'Cloudflare güvenli giriş';
    brand.innerHTML=`<img class="tradex-login-logo" src="${LOGO}" alt="TradeX AI Logo"><div><div class="tradex-login-name">TradeX <span class="ai">AI</span></div><small class="tradex-login-sub">${sub}</small></div>`;
    brand.dataset.tradexFinal='1';
  }

  function renameOldBrand(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while(n=walker.nextNode()){
      const tag=n.parentElement?.tagName;
      if(tag==='SCRIPT'||tag==='STYLE') continue;
      if(/AL-SAT BOT PRO|AL SAT BOT PRO/i.test(n.nodeValue||'')) nodes.push(n);
    }
    nodes.forEach(n=>{n.nodeValue=(n.nodeValue||'').replace(/AL-SAT BOT PRO/gi,'TradeX AI').replace(/AL SAT BOT PRO/gi,'TradeX AI')});
  }

  function apply(){
    ensureStyle();
    document.title='TradeX AI | AI Trading Terminal';
    brandAuth();
    renameOldBrand();
  }

  apply();
  let queued=false;
  const obs=new MutationObserver(()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  });
  obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',apply,{once:true});
})();
