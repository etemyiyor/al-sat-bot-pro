(function(){
  'use strict';

  const USER_KEY='tradex_user_v1';
  const SUB_KEY='tradex_subscription_v1';
  const ADMIN_USERS=new Set(['admin']);

  const plans={
    starter:{id:'starter',name:'Başlangıç',price:299,desc:'Temel analiz ve piyasa ekranları',features:['BIST / ABD / Kripto piyasa ekranı','Teknik analiz','5 sembole kadar tarama','Paper portföy']},
    pro:{id:'pro',name:'Pro',price:599,desc:'Aktif yatırımcılar için gelişmiş araçlar',features:['Başlangıç planındaki her şey','Gelişmiş tarayıcı','Risk ve emir planı','TradingView terminali','Daha yüksek kullanım limiti'],popular:true},
    business:{id:'business',name:'Kurumsal',price:1299,desc:'Yoğun kullanım ve ekip ihtiyaçları',features:['Pro planındaki her şey','Sınırsız yerel izleme listesi','Öncelikli özellik erişimi','Gelişmiş admin görünümü']}
  };

  function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch{try{sessionStorage.setItem(key,JSON.stringify(val));return true}catch{return false}}}
  function remove(key){try{localStorage.removeItem(key)}catch{}try{sessionStorage.removeItem(key)}catch{}}
  function now(){return Date.now()}
  function isAdmin(user){return !!user && ADMIN_USERS.has(String(user.username||'').trim().toLowerCase())}
  function validSub(sub){return !!sub && sub.status==='active' && Number(sub.expiresAt)>now()}

  function style(){
    if(document.getElementById('tradex-sub-style'))return;
    const s=document.createElement('style');
    s.id='tradex-sub-style';
    s.textContent=`
      #tradexSubGate{position:fixed;inset:0;z-index:2147483600;background:radial-gradient(circle at 15% 0%,#172941 0,#08111b 38%,#04070c 100%);display:grid;place-items:center;padding:18px;overflow:auto;color:#eef5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
      .tx-sub-shell{width:min(1040px,100%);background:rgba(8,14,23,.985);border:1px solid #21334a;border-radius:24px;box-shadow:0 28px 100px rgba(0,0,0,.6);padding:24px}
      .tx-sub-head{display:flex;align-items:center;gap:14px;margin-bottom:18px}.tx-sub-logo{width:58px;height:58px;border-radius:16px;object-fit:cover;border:1px solid rgba(56,169,255,.42)}
      .tx-sub-brand{font-weight:950;font-size:22px}.tx-sub-brand span{color:#38a9ff}.tx-sub-muted{color:#8ea1bb;font-size:13px;line-height:1.5}
      .tx-sub-title{font-size:28px;font-weight:900;margin:8px 0}.tx-sub-form{max-width:520px;margin:0 auto}.tx-sub-group{margin:12px 0}.tx-sub-group label{display:block;font-size:12px;color:#9db0c9;margin-bottom:7px}.tx-sub-group input{box-sizing:border-box;width:100%;height:48px;border-radius:12px;border:1px solid #26384f;background:#09121d;color:#f4f8ff;padding:0 14px;font-size:16px;outline:none}
      .tx-sub-btn{height:48px;border:0;border-radius:12px;padding:0 18px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#10b981,#22d3ee);color:#041014}.tx-sub-btn.alt{background:#111c2a;color:#dce8f7;border:1px solid #2a3d56}.tx-sub-btn.full{width:100%}
      .tx-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px}.tx-plan{position:relative;border:1px solid #26384f;background:#0a121d;border-radius:18px;padding:18px;cursor:pointer;transition:.18s ease}.tx-plan:hover,.tx-plan.active{transform:translateY(-2px);border-color:#3db7ff;box-shadow:0 14px 40px rgba(0,0,0,.28)}.tx-plan.popular:before{content:'EN POPÜLER';position:absolute;right:12px;top:12px;font-size:10px;font-weight:900;color:#04212a;background:#67e8f9;padding:5px 7px;border-radius:999px}.tx-plan h3{margin:0 0 5px;font-size:20px}.tx-price{font-size:30px;font-weight:950;margin:14px 0}.tx-price small{font-size:12px;color:#8ea1bb;font-weight:600}.tx-plan ul{padding-left:18px;margin:14px 0 0;color:#b5c3d6;font-size:13px;line-height:1.75}
      .tx-sub-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px}.tx-sub-msg{min-height:20px;margin-top:10px;color:#ff8a98;font-size:13px}.tx-admin-note{margin-top:12px;padding:10px 12px;border:1px solid #24415b;background:#0a1724;border-radius:12px;color:#9fdcff;font-size:12px}
      #tradexSubBadge{position:fixed;left:14px;bottom:14px;z-index:99997;padding:8px 11px;border-radius:999px;background:#0b1622;color:#8fdcff;border:1px solid #213248;font:700 11px system-ui}
      @media(max-width:760px){#tradexSubGate{padding:10px}.tx-sub-shell{padding:18px 14px;border-radius:18px}.tx-plans{grid-template-columns:1fr}.tx-sub-title{font-size:23px}.tx-sub-actions{flex-direction:column}.tx-sub-actions .tx-sub-btn{width:100%}.tx-plan{padding:16px}}
    `;
    document.head.appendChild(s);
  }

  function gate(){let g=document.getElementById('tradexSubGate');if(!g){g=document.createElement('div');g.id='tradexSubGate';document.body.appendChild(g)}return g}
  function closeGate(){document.getElementById('tradexSubGate')?.remove()}
  function addBadge(user,sub){
    document.getElementById('tradexSubBadge')?.remove();
    const b=document.createElement('div');b.id='tradexSubBadge';
    b.textContent=isAdmin(user)?'ADMIN • Abonelik muaf':`${plans[sub?.plan]?.name||'Abonelik'} • Aktif`;
    document.body.appendChild(b);
  }

  function renderRegister(){
    const g=gate();
    g.innerHTML=`<div class="tx-sub-shell"><div class="tx-sub-head"><img class="tx-sub-logo" src="./tradex-ai-logo.webp?v=20260823-6" alt="TradeX AI"><div><div class="tx-sub-brand">TradeX <span>AI</span></div><div class="tx-sub-muted">Yeni kullanıcı erişimi</div></div></div><div class="tx-sub-form"><div class="tx-sub-title">Hesabını oluştur</div><div class="tx-sub-muted">Yeni kullanıcılar abonelik planı seçerek terminali kullanır. Admin hesabı abonelikten muaftır.</div><form id="txUserForm"><div class="tx-sub-group"><label>Kullanıcı adı</label><input id="txUsername" required minlength="3" maxlength="32" autocomplete="username"></div><div class="tx-sub-group"><label>E-posta</label><input id="txEmail" type="email" required autocomplete="email"></div><div class="tx-sub-group"><label>Şifre</label><input id="txPassword" type="password" required minlength="6" autocomplete="new-password"></div><button class="tx-sub-btn full" type="submit">DEVAM ET</button><div id="txUserMsg" class="tx-sub-msg"></div></form><div class="tx-admin-note">Admin kullanıcı adı: <b>admin</b>. Bu kullanıcı abonelik ekranını atlar.</div></div></div>`;
    document.getElementById('txUserForm').onsubmit=e=>{
      e.preventDefault();
      const username=document.getElementById('txUsername').value.trim();
      const email=document.getElementById('txEmail').value.trim();
      const password=document.getElementById('txPassword').value;
      const msg=document.getElementById('txUserMsg');
      if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username)){msg.textContent='Kullanıcı adı 3-32 karakter olmalı.';return}
      if(password.length<6){msg.textContent='Şifre en az 6 karakter olmalı.';return}
      const user={username,email,role:isAdmin({username})?'admin':'user',createdAt:now()};
      if(!write(USER_KEY,user)){msg.textContent='Bu tarayıcıda hesap bilgisi kaydedilemedi.';return}
      if(isAdmin(user)){
        remove(SUB_KEY);closeGate();addBadge(user,null);return;
      }
      renderPlans(user);
    };
  }

  function renderPlans(user){
    const g=gate();
    g.innerHTML=`<div class="tx-sub-shell"><div class="tx-sub-head"><img class="tx-sub-logo" src="./tradex-ai-logo.webp?v=20260823-6" alt="TradeX AI"><div><div class="tx-sub-brand">TradeX <span>AI</span></div><div class="tx-sub-muted">Hoş geldin, ${user.username}</div></div></div><div class="tx-sub-title">Abonelik planını seç</div><div class="tx-sub-muted">Terminale erişim için aktif plan gerekir. Planı daha sonra değiştirebilirsin.</div><div class="tx-plans">${Object.values(plans).map(p=>`<div class="tx-plan ${p.popular?'popular':''}" data-plan="${p.id}"><h3>${p.name}</h3><div class="tx-sub-muted">${p.desc}</div><div class="tx-price">₺${p.price}<small>/ay</small></div><ul>${p.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>`).join('')}</div><div class="tx-sub-actions"><button class="tx-sub-btn alt" id="txChangeUser">Kullanıcıyı değiştir</button><button class="tx-sub-btn" id="txStartSub" disabled>ABONELİĞİ BAŞLAT</button></div><div class="tx-admin-note">Şu anda ödeme tahsilatı bağlı değil. Bu ekran erişim/abonelik mantığını aktif eder; gerçek ödeme sağlayıcısı ayrıca bağlanmalıdır.</div><div id="txPlanMsg" class="tx-sub-msg"></div></div>`;
    let selected='';
    document.querySelectorAll('.tx-plan').forEach(el=>el.onclick=()=>{document.querySelectorAll('.tx-plan').forEach(x=>x.classList.remove('active'));el.classList.add('active');selected=el.dataset.plan;document.getElementById('txStartSub').disabled=false});
    document.getElementById('txChangeUser').onclick=()=>{remove(USER_KEY);remove(SUB_KEY);renderRegister()};
    document.getElementById('txStartSub').onclick=()=>{
      const msg=document.getElementById('txPlanMsg');if(!selected){msg.textContent='Önce bir plan seç.';return}
      const startedAt=now(),expiresAt=startedAt+30*24*60*60*1000;
      const sub={status:'active',plan:selected,startedAt,expiresAt,paymentMode:'not_connected'};
      if(!write(SUB_KEY,sub)){msg.textContent='Abonelik bilgisi kaydedilemedi.';return}
      closeGate();addBadge(user,sub);
    };
  }

  function boot(){
    style();
    const user=read(USER_KEY);
    const sub=read(SUB_KEY);
    if(!user){renderRegister();return}
    if(isAdmin(user)){closeGate();addBadge(user,null);return}
    if(!validSub(sub)){renderPlans(user);return}
    closeGate();addBadge(user,sub);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
})();
