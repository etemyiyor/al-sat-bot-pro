(function(){
  'use strict';
  if(typeof STORE==='undefined') return;
  STORE.bb='asbp_bloomberg_backend_v1';

  // Aynı Cloudflare Worker üzerinde çalışan ön yüz için backend URL'sini otomatik bağla.
  try {
    const current=safeGet(STORE.bb,'').trim();
    if(!/^https?:\/\//i.test(current)) safeSet(STORE.bb, location.origin);
    if(STORE.td) safeRemove(STORE.td);
  } catch(e) {}

  function syncUi(){
    const input=document.getElementById('tdKey');
    const msg=document.getElementById('tdMessage');
    const save=document.getElementById('saveTd');
    const test=document.getElementById('testTd');
    const remove=document.getElementById('removeTd');

    if(input){
      input.type='url';
      input.value=location.origin;
      input.placeholder=location.origin;
      input.readOnly=true;
      const label=input.closest('.formGroup')?.querySelector('label');
      if(label) label.textContent='Cloudflare Worker URL';
    }
    if(save){
      save.textContent='Worker Otomatik Bağlı';
      save.disabled=true;
    }
    if(test){
      test.textContent='Worker Bağlantısını Test Et';
    }
    if(remove){
      remove.style.display='none';
    }
    if(msg){
      msg.innerHTML='<span class="green">Bu site kendi Cloudflare Worker adresine otomatik bağlı.</span>';
    }

    const card=input?.closest('.card');
    if(card){
      const h=card.querySelector('h2');
      if(h) h.textContent='Cloudflare Worker + Bloomberg';
      const p=card.querySelector('p');
      if(p) p.innerHTML='BIST ve ABD verileri <b>Cloudflare Worker</b> üzerinden alınır. Tarayıcıya Twelve Data anahtarı girilmez.';
    }

    // Kullanıcı arayüzünde eski Twelve Data metinlerini kaldır.
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n;
    while(n=walker.nextNode()){
      const tag=n.parentElement?.tagName;
      if(tag==='SCRIPT'||tag==='STYLE') continue;
      if(/Twelve/i.test(n.nodeValue||'')) nodes.push(n);
    }
    nodes.forEach(x=>{
      x.nodeValue=(x.nodeValue||'')
        .replace(/Twelve Data \/ XIST/gi,'Bloomberg / Cloudflare')
        .replace(/Twelve Data/gi,'Bloomberg / Cloudflare')
        .replace(/Twelve/gi,'Bloomberg');
    });

    if(typeof updateStatus==='function') updateStatus();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncUi);
  else syncUi();
})();
