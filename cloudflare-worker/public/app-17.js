(function(){
  'use strict';
  const ADMIN_CODE_SHA256='20c2fdb6313ee964ce25daa9d24acf93495b5d58e93ff3035abed50783279b1b';
  const DB_NAME='tradex_admin_device_v1',STORE='keys',KEY_ID='admin-device-key',TAG_KEY='tradex_admin_device_tag_v1';
  const te=new TextEncoder();
  function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  async function sha256(s){return hex(await crypto.subtle.digest('SHA-256',te.encode(s)))}
  function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function putKey(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(key,KEY_ID);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  async function getKey(){try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(KEY_ID);r.onsuccess=()=>{db.close();resolve(r.result||null)};r.onerror=()=>{db.close();reject(r.error)}})}catch{return null}}
  async function signTag(key){const sig=await crypto.subtle.sign('HMAC',key,te.encode('TradeXAI-admin-device-v1'));return hex(sig)}
  async function trustDevice(){const key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256',length:256},false,['sign','verify']);await putKey(key);const tag=await signTag(key);localStorage.setItem(TAG_KEY,tag);return true}
  async function isTrusted(){try{const key=await getKey(),tag=localStorage.getItem(TAG_KEY);if(!key||!tag)return false;return (await signTag(key))===tag}catch{return false}}
  function openAdmin(){document.getElementById('tradexSubGate')?.remove();document.getElementById('tradexSubBadge')?.remove();const b=document.createElement('div');b.id='tradexSubBadge';b.textContent='ADMIN • Bu cihaz doğrulandı';document.body.appendChild(b)}
  async function enhance(){const btn=document.getElementById('txAdminLogin'),input=document.getElementById('txAdminCode'),gate=document.getElementById('tradexSubGate');if(!btn||!input||!gate)return;if(gate.dataset.deviceAdminBound)return;gate.dataset.deviceAdminBound='1';
    if(await isTrusted()){openAdmin();return}
    const old=btn.onclick;btn.textContent='GİRİŞ YAP';btn.onclick=async e=>{e?.preventDefault?.();e?.stopPropagation?.();const msg=document.getElementById('txMsg');if(msg)msg.textContent='Doğrulanıyor...';const code=String(input.value||'').trim();if(!code){if(msg)msg.textContent='Admin kodunu gir.';return}if(await sha256(code)!==ADMIN_CODE_SHA256){if(msg)msg.textContent='Admin kodu hatalı.';return}try{await trustDevice();if(msg)msg.textContent='Cihaz doğrulandı.';setTimeout(openAdmin,150)}catch(err){if(msg)msg.textContent='Cihaz anahtarı oluşturulamadı.';if(old)btn.onclick=old}}
  }
  const obs=new MutationObserver(()=>{enhance()});obs.observe(document.documentElement,{childList:true,subtree:true});enhance();
})();
