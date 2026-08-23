(function(){
  'use strict';
  function style(){
    if(document.getElementById('tradex-normal-auth-style'))return;
    const s=document.createElement('style');s.id='tradex-normal-auth-style';s.textContent=`
      #tradexSubGate{background:linear-gradient(160deg,#07111d 0%,#0b1725 48%,#07101a 100%)!important}
      #tradexSubGate .tx-shell{width:min(440px,calc(100% - 24px))!important;padding:28px 24px!important;border-radius:20px!important;background:#0b1522!important;box-shadow:0 24px 70px rgba(0,0,0,.5)!important}
      #tradexSubGate .tx-head{justify-content:center;text-align:center;flex-direction:column;gap:10px!important}
      #tradexSubGate .tx-logo{width:70px!important;height:70px!important;border-radius:18px!important}
      #tradexSubGate .tx-head b{font-size:22px}
      #tradexSubGate .tx-title{text-align:center;font-size:25px!important;margin:16px 0 6px!important}
      #tradexSubGate .tx-muted{text-align:center}
      #tradexSubGate .tx-form{grid-template-columns:1fr!important;gap:12px!important;margin-top:20px!important}
      #tradexSubGate .tx-field label{font-size:12px!important}
      #tradexSubGate .tx-field input{height:50px!important;font-size:16px!important;border-radius:12px!important}
      #tradexSubGate .tx-actions{display:flex!important;flex-direction:column-reverse!important;gap:10px!important;margin-top:18px!important}
      #tradexSubGate .tx-actions .tx-btn{width:100%!important;height:50px!important}
      #tradexSubGate .tx-note{font-size:11px!important;text-align:center!important;background:transparent!important;border:0!important;color:#71849b!important;padding:4px!important}
      #tradexSubGate .tx-msg{text-align:center!important}
      #tradexSubGate .tx-plans{grid-template-columns:repeat(3,1fr)!important}
      #tradexSubGate .tx-plans~.tx-form{grid-template-columns:repeat(2,1fr)!important}
      #tradexSubGate .tx-payframe{width:100%!important}
      @media(max-width:760px){#tradexSubGate .tx-shell{width:calc(100% - 12px)!important;padding:22px 16px!important}#tradexSubGate .tx-plans,#tradexSubGate .tx-plans~.tx-form{grid-template-columns:1fr!important}}
    `;document.head.appendChild(s);
  }
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function normalize(){
    const g=document.getElementById('tradexSubGate');if(!g)return;
    style();
    const title=g.querySelector('.tx-title');
    const btnUnlock=document.getElementById('txUnlock');
    const btnCreate=document.getElementById('txCreate');
    if(btnUnlock&&!g.dataset.normalLogin){
      g.dataset.normalLogin='1';delete g.dataset.normalRegister;
      setText(title,'Giriş Yap');
      setText(g.querySelector('.tx-title + .tx-muted'),'TradeX AI hesabına giriş yap.');
      setText(btnUnlock,'GİRİŞ YAP');
      const pass=document.getElementById('txLoginPass');
      if(pass){const group=pass.closest('.tx-field');setText(group?.querySelector('label'),'Şifre');
        if(!document.getElementById('txLoginIdentity')){const d=document.createElement('div');d.className='tx-field';d.innerHTML='<label>Kullanıcı adı veya e-posta</label><input id="txLoginIdentity" type="text" autocomplete="username" placeholder="Kullanıcı adı veya e-posta">';group?.parentElement?.insertBefore(d,group);}
      }
      setText(document.getElementById('txReset'),'Hesap Oluştur / Hesabı Değiştir');
      setText(g.querySelector('.tx-head .tx-muted'),'Güvenli giriş');
    }
    if(btnCreate&&!g.dataset.normalRegister){
      g.dataset.normalRegister='1';delete g.dataset.normalLogin;
      setText(title,'Hesap Oluştur');
      setText(g.querySelector('.tx-title + .tx-muted'),'TradeX AI hesabını oluştur ve abonelik planını seç.');
      setText(btnCreate,'HESAP OLUŞTUR');
      setText(g.querySelector('.tx-head .tx-muted'),'Yeni hesap');
      setText(g.querySelector('.tx-note'),'Bilgilerin güvenli şekilde şifrelenerek korunur.');
    }
    const adminBtn=document.getElementById('txAdminLogin');if(adminBtn&&!g.dataset.normalAdmin){g.dataset.normalAdmin='1';setText(title,'Yönetici Girişi');setText(adminBtn,'GİRİŞ YAP')}
  }
  style();normalize();
  let queued=false;
  const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;normalize()})});
  obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
})();
