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
  function normalize(){
    const g=document.getElementById('tradexSubGate');if(!g)return;
    style();
    const title=g.querySelector('.tx-title');
    const btnUnlock=document.getElementById('txUnlock');
    const btnCreate=document.getElementById('txCreate');
    if(btnUnlock){
      if(title)title.textContent='Giriş Yap';
      const muted=g.querySelector('.tx-title + .tx-muted');if(muted)muted.textContent='TradeX AI hesabına giriş yap.';
      btnUnlock.textContent='GİRİŞ YAP';
      const pass=document.getElementById('txLoginPass');
      if(pass){const group=pass.closest('.tx-field');const lab=group?.querySelector('label');if(lab)lab.textContent='Şifre';
        if(!document.getElementById('txLoginIdentity')){const d=document.createElement('div');d.className='tx-field';d.innerHTML='<label>Kullanıcı adı veya e-posta</label><input id="txLoginIdentity" type="text" autocomplete="username" placeholder="Kullanıcı adı veya e-posta">';group?.parentElement?.insertBefore(d,group);}
      }
      const reset=document.getElementById('txReset');if(reset)reset.textContent='Hesabı değiştir / Yeni hesap oluştur';
      const brandSub=g.querySelector('.tx-head .tx-muted');if(brandSub)brandSub.textContent='Güvenli giriş';
    }
    if(btnCreate){
      if(title)title.textContent='Hesap Oluştur';
      const muted=g.querySelector('.tx-title + .tx-muted');if(muted)muted.textContent='TradeX AI hesabını oluştur ve abonelik planını seç.';
      btnCreate.textContent='HESAP OLUŞTUR';
      const brandSub=g.querySelector('.tx-head .tx-muted');if(brandSub)brandSub.textContent='Yeni hesap';
      const note=g.querySelector('.tx-note');if(note)note.textContent='Bilgilerin güvenli şekilde şifrelenerek korunur.';
    }
    const adminBtn=document.getElementById('txAdminLogin');if(adminBtn){if(title)title.textContent='Yönetici Girişi';adminBtn.textContent='GİRİŞ YAP'}
  }
  style();normalize();
  const obs=new MutationObserver(()=>requestAnimationFrame(normalize));
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
