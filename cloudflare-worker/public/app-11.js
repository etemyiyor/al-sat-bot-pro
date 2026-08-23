(function(){
  'use strict';
  const ACCOUNT_KEY='asbp_local_account_v1';
  const SESSION_KEY='asbp_session_v1';

  const enc=new TextEncoder();
  const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function derive(password,salt){
    const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},key,256);
    return b64(bits);
  }
  function getAccount(){try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'null')}catch{return null}}
  function hasSession(){try{return sessionStorage.getItem(SESSION_KEY)==='ok'||localStorage.getItem(SESSION_KEY)==='ok'}catch{return false}}
  function setSession(remember){try{(remember?localStorage:sessionStorage).setItem(SESSION_KEY,'ok')}catch{}}
  function clearSession(){try{sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}catch{}}

  function styles(){
    const s=document.createElement('style');
    s.id='asbp-login-style';
    s.textContent=`
      #asbpLoginGate{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 20% 0%,#142235 0,#08111b 38%,#05080d 100%);display:grid;place-items:center;padding:20px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
      .asbp-auth-card{width:min(440px,100%);background:rgba(10,17,27,.96);border:1px solid #213248;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:26px}
      .asbp-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.asbp-auth-mark{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#10b981,#22d3ee);display:grid;place-items:center;color:#041014;font-weight:900}.asbp-auth-brand b{font-size:20px}.asbp-auth-brand small{display:block;color:#8ea1bb;margin-top:3px}
      .asbp-auth-title{font-size:26px;font-weight:800;margin:0 0 7px}.asbp-auth-sub{color:#8ea1bb;font-size:14px;line-height:1.55;margin-bottom:20px}
      .asbp-auth-group{margin:12px 0}.asbp-auth-group label{display:block;font-size:12px;color:#9db0c9;margin:0 0 7px}.asbp-auth-group input{box-sizing:border-box;width:100%;height:48px;border-radius:12px;border:1px solid #26384f;background:#09121d;color:#f4f8ff;padding:0 14px;font-size:16px;outline:none}.asbp-auth-group input:focus{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.1)}
      .asbp-auth-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;font-size:13px;color:#9db0c9}.asbp-auth-row label{display:flex;align-items:center;gap:8px}.asbp-auth-row input{accent-color:#22d3ee}
      .asbp-auth-btn{width:100%;height:48px;border:0;border-radius:12px;margin-top:16px;background:linear-gradient(135deg,#10b981,#22d3ee);color:#041014;font-weight:900;font-size:15px;cursor:pointer}.asbp-auth-btn:disabled{opacity:.55;cursor:wait}
      .asbp-auth-alt{margin-top:12px;text-align:center;font-size:13px;color:#8ea1bb}.asbp-auth-link{background:none;border:0;color:#67e8f9;font-weight:700;cursor:pointer;padding:4px}
      .asbp-auth-msg{min-height:20px;margin-top:10px;font-size:13px}.asbp-auth-msg.bad{color:#ff7f8c}.asbp-auth-msg.ok{color:#55e6b5}
      .asbp-lock{overflow:hidden!important}
      #asbpLogout{position:fixed;right:14px;bottom:14px;z-index:99998;background:#111b28;color:#e7effb;border:1px solid #2b3c52;border-radius:999px;padding:9px 13px;font:600 12px system-ui;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.3)}
      @media(max-width:800px){#asbpLogout{bottom:82px;right:10px}.asbp-auth-card{padding:22px 18px;border-radius:18px}.asbp-auth-title{font-size:23px}}
    `;
    document.head.appendChild(s);
  }

  function showGate(){
    if(document.getElementById('asbpLoginGate'))return;
    document.documentElement.classList.add('asbp-lock');document.body.classList.add('asbp-lock');
    const gate=document.createElement('div');gate.id='asbpLoginGate';document.body.appendChild(gate);
    render();
  }

  function render(forceMode){
    const gate=document.getElementById('asbpLoginGate');if(!gate)return;
    const account=getAccount();const mode=forceMode||(account?'login':'register');
    gate.innerHTML=`<div class="asbp-auth-card">
      <div class="asbp-auth-brand"><div class="asbp-auth-mark">A/S</div><div><b>AL-SAT BOT PRO</b><small>AI Piyasa Analiz Terminali</small></div></div>
      <h1 class="asbp-auth-title">${mode==='login'?'Giriş Yap':'Hesap Oluştur'}</h1>
      <div class="asbp-auth-sub">${mode==='login'?'Terminale erişmek için hesabınla giriş yap.':'Bu cihaz için yerel bir terminal hesabı oluştur. Şifren düz metin olarak saklanmaz.'}</div>
      <form id="asbpAuthForm">
        <div class="asbp-auth-group"><label>${mode==='login'?'E-posta / Kullanıcı adı':'E-posta veya kullanıcı adı'}</label><input id="asbpUser" autocomplete="username" required minlength="3" value="${mode==='login'&&account?esc(account.user):''}"></div>
        <div class="asbp-auth-group"><label>Şifre</label><input id="asbpPass" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" required minlength="6"></div>
        ${mode==='register'?'<div class="asbp-auth-group"><label>Şifre tekrar</label><input id="asbpPass2" type="password" autocomplete="new-password" required minlength="6"></div>':''}
        ${mode==='login'?'<div class="asbp-auth-row"><label><input id="asbpRemember" type="checkbox"> Beni hatırla</label><button type="button" class="asbp-auth-link" id="asbpReset">Hesabı sıfırla</button></div>':''}
        <button class="asbp-auth-btn" id="asbpSubmit" type="submit">${mode==='login'?'GİRİŞ YAP':'HESAP OLUŞTUR'}</button>
        <div id="asbpAuthMsg" class="asbp-auth-msg"></div>
      </form>
      ${mode==='register'&&account?'<div class="asbp-auth-alt"><button class="asbp-auth-link" id="asbpToLogin">Zaten hesabım var</button></div>':''}
    </div>`;
    const form=document.getElementById('asbpAuthForm');
    form.onsubmit=async e=>{
      e.preventDefault();const btn=document.getElementById('asbpSubmit'),msg=document.getElementById('asbpAuthMsg');btn.disabled=true;msg.textContent='Kontrol ediliyor...';msg.className='asbp-auth-msg';
      try{
        const user=document.getElementById('asbpUser').value.trim();const pass=document.getElementById('asbpPass').value;
        if(user.length<3)throw Error('Kullanıcı adı en az 3 karakter olmalı.');if(pass.length<6)throw Error('Şifre en az 6 karakter olmalı.');
        if(mode==='register'){
          const p2=document.getElementById('asbpPass2').value;if(pass!==p2)throw Error('Şifreler aynı değil.');
          const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await derive(pass,salt);
          localStorage.setItem(ACCOUNT_KEY,JSON.stringify({user,salt:b64(salt),hash,createdAt:Date.now()}));
          msg.textContent='Hesap oluşturuldu. Giriş ekranı açılıyor...';msg.className='asbp-auth-msg ok';setTimeout(()=>render('login'),350);return;
        }
        const a=getAccount();if(!a||user.toLowerCase()!==String(a.user).toLowerCase())throw Error('Kullanıcı adı veya şifre hatalı.');
        const hash=await derive(pass,unb64(a.salt));if(hash!==a.hash)throw Error('Kullanıcı adı veya şifre hatalı.');
        setSession(!!document.getElementById('asbpRemember')?.checked);gate.remove();document.documentElement.classList.remove('asbp-lock');document.body.classList.remove('asbp-lock');addLogout();
      }catch(err){msg.textContent=err.message||'Giriş başarısız.';msg.className='asbp-auth-msg bad'}finally{btn.disabled=false}
    };
    const reset=document.getElementById('asbpReset');if(reset)reset.onclick=()=>{if(confirm('Bu cihazdaki yerel giriş hesabı silinsin mi?')){localStorage.removeItem(ACCOUNT_KEY);clearSession();render('register')}};
    const toLogin=document.getElementById('asbpToLogin');if(toLogin)toLogin.onclick=()=>render('login');
  }

  function addLogout(){
    if(document.getElementById('asbpLogout'))return;
    const b=document.createElement('button');b.id='asbpLogout';b.textContent='Çıkış';b.onclick=()=>{clearSession();location.reload()};document.body.appendChild(b);
  }

  styles();
  if(hasSession())addLogout();else showGate();
})();
