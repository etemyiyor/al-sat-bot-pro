(function(){
  'use strict';

  async function api(path,options={}){
    const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    let d={};try{d=await r.json()}catch{}
    if(!r.ok||d.ok===false)throw new Error(d.error||`İstek başarısız (${r.status})`);
    return d;
  }

  function styles(){
    if(document.getElementById('asbp-login-style'))return;
    const s=document.createElement('style');s.id='asbp-login-style';s.textContent=`
      #asbpLoginGate{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 20% 0%,#142235 0,#08111b 38%,#05080d 100%);display:grid;place-items:center;padding:20px;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
      .asbp-auth-card{width:min(460px,100%);background:rgba(10,17,27,.97);border:1px solid #213248;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:26px}
      .asbp-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}.asbp-auth-mark{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#10b981,#22d3ee);display:grid;place-items:center;color:#041014;font-weight:900}.asbp-auth-brand b{font-size:20px}.asbp-auth-brand small{display:block;color:#8ea1bb;margin-top:3px}
      .asbp-auth-title{font-size:26px;font-weight:800;margin:0 0 7px}.asbp-auth-sub{color:#8ea1bb;font-size:14px;line-height:1.55;margin-bottom:20px}
      .asbp-auth-group{margin:12px 0}.asbp-auth-group label{display:block;font-size:12px;color:#9db0c9;margin:0 0 7px}.asbp-auth-group input{box-sizing:border-box;width:100%;height:48px;border-radius:12px;border:1px solid #26384f;background:#09121d;color:#f4f8ff;padding:0 14px;font-size:16px;outline:none}.asbp-auth-group input:focus{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.1)}
      .asbp-auth-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;font-size:13px;color:#9db0c9}.asbp-auth-row label{display:flex;align-items:center;gap:8px}.asbp-auth-row input{accent-color:#22d3ee}
      .asbp-auth-btn{width:100%;height:48px;border:0;border-radius:12px;margin-top:16px;background:linear-gradient(135deg,#10b981,#22d3ee);color:#041014;font-weight:900;font-size:15px;cursor:pointer}.asbp-auth-btn:disabled{opacity:.55;cursor:wait}
      .asbp-auth-alt{margin-top:14px;text-align:center;font-size:13px;color:#8ea1bb}.asbp-auth-link{background:none;border:0;color:#67e8f9;font-weight:700;cursor:pointer;padding:4px}
      .asbp-auth-msg{min-height:20px;margin-top:10px;font-size:13px}.asbp-auth-msg.bad{color:#ff7f8c}.asbp-auth-msg.ok{color:#55e6b5}
      .asbp-lock{overflow:hidden!important}
      #asbpLogout{position:fixed;right:14px;bottom:14px;z-index:99998;background:#111b28;color:#e7effb;border:1px solid #2b3c52;border-radius:999px;padding:9px 13px;font:600 12px system-ui;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.3)}
      #asbpUserBadge{position:fixed;right:86px;bottom:14px;z-index:99997;background:#0b1622;color:#8fdcff;border:1px solid #213248;border-radius:999px;padding:9px 13px;font:600 12px system-ui}
      @media(max-width:800px){#asbpLogout{bottom:82px;right:10px}#asbpUserBadge{bottom:82px;right:82px}.asbp-auth-card{padding:22px 18px;border-radius:18px}.asbp-auth-title{font-size:23px}}
    `;document.head.appendChild(s);
  }

  function showGate(mode='login'){
    let gate=document.getElementById('asbpLoginGate');
    if(!gate){gate=document.createElement('div');gate.id='asbpLoginGate';document.body.appendChild(gate)}
    document.documentElement.classList.add('asbp-lock');document.body.classList.add('asbp-lock');
    render(gate,mode);
  }

  function render(gate,mode){
    const login=mode==='login';
    gate.innerHTML=`<div class="asbp-auth-card">
      <div class="asbp-auth-brand"><div class="asbp-auth-mark">A/S</div><div><b>AL-SAT BOT PRO</b><small>Cloudflare Güvenli Giriş</small></div></div>
      <h1 class="asbp-auth-title">${login?'Giriş Yap':'Hesap Oluştur'}</h1>
      <div class="asbp-auth-sub">${login?'Farklı cihazlardan aynı hesabınla terminale erişebilirsin.':'Hesabın Cloudflare D1 veritabanında tutulur; şifren hashlenerek saklanır.'}</div>
      <form id="asbpAuthForm">
        <div class="asbp-auth-group"><label>${login?'E-posta / Kullanıcı adı':'Kullanıcı adı'}</label><input id="asbpIdentity" autocomplete="username" required minlength="3" maxlength="64"></div>
        ${login?'':'<div class="asbp-auth-group"><label>E-posta (isteğe bağlı)</label><input id="asbpEmail" type="email" autocomplete="email"></div>'}
        <div class="asbp-auth-group"><label>Şifre</label><input id="asbpPass" type="password" autocomplete="${login?'current-password':'new-password'}" required minlength="8"></div>
        ${login?'':'<div class="asbp-auth-group"><label>Şifre tekrar</label><input id="asbpPass2" type="password" autocomplete="new-password" required minlength="8"></div>'}
        ${login?'<div class="asbp-auth-row"><label><input id="asbpRemember" type="checkbox" checked> Beni hatırla</label></div>':''}
        <button class="asbp-auth-btn" id="asbpSubmit" type="submit">${login?'GİRİŞ YAP':'HESAP OLUŞTUR'}</button>
        <div id="asbpAuthMsg" class="asbp-auth-msg"></div>
      </form>
      <div class="asbp-auth-alt">${login?'Hesabın yok mu? <button class="asbp-auth-link" id="asbpSwitch">Hesap oluştur</button>':'Zaten hesabın var mı? <button class="asbp-auth-link" id="asbpSwitch">Giriş yap</button>'}</div>
    </div>`;
    document.getElementById('asbpSwitch').onclick=()=>render(gate,login?'register':'login');
    document.getElementById('asbpAuthForm').onsubmit=async e=>{
      e.preventDefault();
      const btn=document.getElementById('asbpSubmit'),msg=document.getElementById('asbpAuthMsg');
      btn.disabled=true;msg.textContent='Kontrol ediliyor...';msg.className='asbp-auth-msg';
      try{
        const identity=document.getElementById('asbpIdentity').value.trim();
        const password=document.getElementById('asbpPass').value;
        let d;
        if(login){
          d=await api('/auth/login',{method:'POST',body:JSON.stringify({identity,password,remember:!!document.getElementById('asbpRemember')?.checked})});
        }else{
          const p2=document.getElementById('asbpPass2').value;if(password!==p2)throw new Error('Şifreler aynı değil.');
          d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:identity,email:document.getElementById('asbpEmail').value.trim(),password})});
        }
        msg.textContent='Başarılı. Terminal açılıyor...';msg.className='asbp-auth-msg ok';
        unlock(d.user);
      }catch(err){msg.textContent=err.message||'İşlem başarısız.';msg.className='asbp-auth-msg bad'}finally{btn.disabled=false}
    };
  }

  function unlock(user){
    document.getElementById('asbpLoginGate')?.remove();
    document.documentElement.classList.remove('asbp-lock');document.body.classList.remove('asbp-lock');
    addUserControls(user);
  }

  function addUserControls(user){
    document.getElementById('asbpLogout')?.remove();document.getElementById('asbpUserBadge')?.remove();
    const badge=document.createElement('div');badge.id='asbpUserBadge';badge.textContent=user?.username||'Kullanıcı';document.body.appendChild(badge);
    const b=document.createElement('button');b.id='asbpLogout';b.textContent='Çıkış';b.onclick=async()=>{try{await api('/auth/logout',{method:'POST',body:'{}'})}catch{}location.reload()};document.body.appendChild(b);
  }

  async function boot(){
    styles();showGate('login');
    try{const d=await api('/auth/me',{method:'GET'});unlock(d.user)}catch(err){
      const msg=document.getElementById('asbpAuthMsg');
      if(/D1|veritabanı/i.test(err.message||'')){msg.textContent='Sunucu hesap sistemi hazırlanıyor. Cloudflare D1 bağlantısını kontrol et.';msg.className='asbp-auth-msg bad'}
    }
  }
  boot();
})();
