(function(){
  'use strict';
  document.addEventListener('click',async function(e){
    const btn=e.target&&e.target.closest?e.target.closest('#txAdminLogin'):null;
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const msg=document.getElementById('txMsg');
    const input=document.getElementById('txAdminCode');
    if(msg)msg.textContent='Doğrulanıyor...';
    try{
      const api=window.TradeXDeviceAdmin;
      if(!api||typeof api.verifyCode!=='function')throw new Error('Cihaz doğrulaması yüklenemedi.');
      const r=await api.verifyCode(input?input.value:'');
      if(!r.ok){if(msg)msg.textContent=r.error||'Admin doğrulaması başarısız.';return;}
      if(msg)msg.textContent='Cihaz doğrulandı.';
      setTimeout(()=>api.openAdmin(),100);
    }catch(err){if(msg)msg.textContent=err&&err.message?err.message:'Admin doğrulaması başarısız.';}
  },true);
})();
