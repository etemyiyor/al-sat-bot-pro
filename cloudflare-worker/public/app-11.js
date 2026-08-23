(function(){
  'use strict';
  const LOCAL_ACCOUNT='tradex_local_account_v2';
  const LOCAL_SESSION='tradex_local_session_v2';
  const LOGO='./tradex-ai-logo.webp?v=20260823-5';
  const enc=new TextEncoder();

  async function api(path,options={}){
    const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    let d={};try{d=await r.json()}catch{}
    const err=new Error(d.error||`İstek başarısız (${r.status})`);err.status=r.status;err.data=d;
    if(!r.ok||d.ok===false)throw err;
    return d;
  }

  const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function localHash(password,salt){
    const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
    return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},key,256));
  }
  function getLocalAccount(){try{return JSON.parse(localStorage.getItem(LOCAL_ACCOUNT)||'null')}catch{return null}}
  function localLogged(){try{return localStorage.getItem(LOCAL_SESSION)==='ok'||sessionStorage.getItem(LOCAL_SESSION)==='ok'}catch{return false}}
  function setLocalSession(remember){try{(remember?localStorage:sessionStorage).setItem(LOCAL_SESSION,'ok')}catch{}}
  function clearLocal(){try{localStorage.removeItem(LOCAL_SESSION);sessionStorage.removeItem(LOCAL_SESSION)}catch{}}

  function styles(){
    if(document.getElementById('tradex-login-style'))return;
    const s=document.createElement('style');
    s.id='tradex-login-style';
    s.textContent=`
      #asbpLoginGate{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 20% 0%,#142235 0,#08111b 38%,#05080d 100%);display:grid;place-items:center;padding:20px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
      .asbp-auth-card{width:min(460px,100%);background:rgba(10,17,27,.98);border:1px solid #213248;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:26px}
      .asbp-auth-brand{display:flex;align-items:center;gap:14px;margin-bottom:22px}
      .asbp-auth-logo{width:66px;height:66px;border-radius:18px;object-fit:cover;border:1px solid rgba(56,169,255,.42);box-shadow:0 10px 30px rgba(0,0,0,.4)}
      .asbp-auth-brand b{font-size:22px}.asbp-auth-brand b span{color:#38a9ff}.asbp-auth-brand small{display:block;color:#8ea1bb;margin-top:5px}
      .asbp-auth-title{font-size:26px;font-weight:800;margin:0 0 7px}.asbp-auth-sub{color:#8ea1bb;font-size:14px;line-height:1.55;margin-bottom:20px}
      .asbp-auth-group{margin:12px 0}.asbp-auth-group label{display:block;font-size:12px;color:#9db0c9;margin:0 0 7px}
      .asbp-auth-group input{box-sizing:border-box;width:100%;height:48px;border-radius:12px;border:1px solid #26384f;background:#09121d;color:#f4f8ff;padding:0 14px;font-size:16px;outline:none}
      .asbp-auth-btn{width:100%;height:48px;border:0;border-radius:12px;margin-top:16px;background:linear-gradient(135deg,#10b981,#22d3ee);color:#041014;font-weight:900;font-size:15px;cursor:pointer}
      .asbp-auth-row{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:13px;color:#9db0c9}.asbp-auth-alt{text-align:center;margin-top:14px;color:#8ea1bb;font-size:13px}.asbp-auth-link{background:none;border:0;color:#67e8f9;font-weight:700;cursor:pointer}.asbp-auth-msg{min-height:20px;margin-top:10px;font-size:13px}.asbp-auth-msg.bad{color:#ff7f8c}.asbp-auth-msg.ok{color:#55e6b5}.asbp-auth-msg.warn{color:#f2c66d}
      #asbpLogout,#asbpUserBadge{position:fixed;bottom:14px;z-index:99998;border-radius:999px;padding:9px 13px;font:600 12px system-ui}#asbpLogout{right:14px;background:#111b28;color:#e7effb;border:1px solid #2b3c52}#asbpUserBadge{right:86px;background:#0b1622;color:#8fdcff;border:1px solid #213248}
      @media(max-width:800px){#asbpLogout{bottom:82px;right:10px}#asbpUserBadge{bottom:82px;right:82px}.asbp-auth-card{padding:22px 18px}.asbp-auth-logo{width:58px;height:58px;border-radius:16px}}
    `;
    document.head.appendChild(s);
  }

  function gate(){let g=document.getElementById('asbpLoginGate');if(!g){g=document.createElement('div');g.id='asbpLoginGate';document.body.appendChild(g)}return g}
  function unlock(user,mode){document.getElementById('asbpLoginGate')?.remove();addControls(user,mode)}
  function addControls(user,mode){
    document.getElementById('asbpLogout')?.remove();document.getElementById('asbpUserBadge')?.remove();
    const badge=document.createElement('div');badge.id='asbpUserBadge';badge.textContent=(user?.username||'Kullanıcı')+(mode==='local'?' • Yerel':'');document.body.appendChild(badge);
    const b=document.createElement('button');b.id='asbpLogout';b.textContent='Çıkış';b.onclick=async()=>{if(mode==='server'){try{await api('/auth/logout',{method:'POST',body:'{}'})}catch{}}else clearLocal();location.reload()};document.body.appendChild(b)
  }

  function render(mode='login',fallback=false){
    const g=gate(),login=mode==='login',local=getLocalAccount();
    g.innerHTML=`<div class="asbp-auth-card"><div class="asbp-auth-brand"><img class="asbp-auth-logo" src="${LOGO}" alt="TradeX AI Logo"><div><b>TradeX <span>AI</span></b><small>${fallback?'Yerel güvenli giriş':'Cloudflare güvenli giriş'}</small></div></div><h1 class="asbp-auth-title">${login?'Giriş Yap':'Hesap Oluştur'}</h1><div class="asbp-auth-sub">${fallback?'Bu geçici Cloudflare sürümünde yerel güvenli hesap kullanılır. Hesabın yalnızca bu cihazda saklanır.':login?'TradeX AI hesabınla terminale giriş yap.':'TradeX AI hesabını oluştur.'}</div><form id="asbpAuthForm"><div class="asbp-auth-group"><label>${login?'E-posta / Kullanıcı adı':'Kullanıcı adı'}</label><input id="asbpIdentity" required minlength="3" value="${fallback&&login&&local?local.user:''}"></div>${login||fallback?'':'<div class="asbp-auth-group"><label>E-posta (isteğe bağlı)</label><input id="asbpEmail" type="email"></div>'}<div class="asbp-auth-group"><label>Şifre</label><input id="asbpPass" type="password" required minlength="8"></div>${login?'':'<div class="asbp-auth-group"><label>Şifre tekrar</label><input id="asbpPass2" type="password" required minlength="8"></div>'}<div class="asbp-auth-row">${login?'<label><input id="asbpRemember" type="checkbox" checked> Beni hatırla</label>':''}</div><button class="asbp-auth-btn" id="asbpSubmit" type="submit">${login?'GİRİŞ YAP':'HESAP OLUŞTUR'}</button><div id="asbpAuthMsg" class="asbp-auth-msg ${fallback?'warn':''}">${fallback&&!local?'Önce hesap oluştur.':''}</div></form><div class="asbp-auth-alt"><button class="asbp-auth-link" id="asbpSwitch">${login?'Hesap oluştur':'Giriş yap'}</button></div></div>`;
    document.getElementById('asbpSwitch').onclick=()=>render(login?'register':'login',fallback);
    document.getElementById('asbpAuthForm').onsubmit=async e=>{
      e.preventDefault();
      const msg=document.getElementById('asbpAuthMsg'),identity=document.getElementById('asbpIdentity').value.trim(),password=document.getElementById('asbpPass').value;
      msg.textContent='Kontrol ediliyor...';msg.className='asbp-auth-msg';
      try{
        if(fallback){
          if(login){
            const a=getLocalAccount();if(!a)throw Error('Önce hesap oluştur');if(identity.toLowerCase()!==String(a.user).toLowerCase())throw Error('Kullanıcı adı veya şifre hatalı');
            const h=await localHash(password,unb64(a.salt));if(h!==a.hash)throw Error('Kullanıcı adı veya şifre hatalı');setLocalSession(!!document.getElementById('asbpRemember')?.checked);unlock({username:a.user},'local');return;
          }
          const p2=document.getElementById('asbpPass2').value;if(password!==p2)throw Error('Şifreler aynı değil');
          const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await localHash(password,salt);localStorage.setItem(LOCAL_ACCOUNT,JSON.stringify({user:identity,salt:b64(salt),hash}));setLocalSession(true);unlock({username:identity},'local');return;
        }
        let d;
        if(login)d=await api('/auth/login',{method:'POST',body:JSON.stringify({identity,password,remember:!!document.getElementById('asbpRemember')?.checked})});
        else{const p2=document.getElementById('asbpPass2').value;if(password!==p2)throw Error('Şifreler aynı değil');d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:identity,email:document.getElementById('asbpEmail').value.trim(),password})})}
        unlock(d.user,'server');
      }catch(err){msg.textContent=err.message||'İşlem başarısız';msg.className='asbp-auth-msg bad'}
    };
  }

  async function boot(){
    styles();document.title='TradeX AI | AI Trading Terminal';
    try{
      const health=await api('/health',{method:'GET'});
      if(!health.authDatabaseConfigured){
        const account=getLocalAccount();
        if(account&&localLogged())unlock({username:account.user},'local');
        else render(account?'login':'register',true);
        return;
      }
      try{const d=await api('/auth/me',{method:'GET'});unlock(d.user,'server')}
      catch{render('login',false)}
    }catch{
      const account=getLocalAccount();
      if(account&&localLogged())unlock({username:account.user},'local');
      else render(account?'login':'register',true);
    }
  }
  boot();
})();
