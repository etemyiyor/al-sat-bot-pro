(function(){
  'use strict';
  const te=new TextEncoder();
  const BASE_SALT=te.encode('TradeXAI-password-proof-v1');
  async function proof(password){
    const key=await crypto.subtle.importKey('raw',te.encode(String(password)),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:BASE_SALT,iterations:180000,hash:'SHA-256'},key,256);
    return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input?.url||'');
      if((url==='/auth/register'||url==='/auth/login')&&init?.method==='POST'&&typeof init.body==='string'){
        const data=JSON.parse(init.body);
        if(data.password&&!data.passwordProof){
          data.passwordProof=await proof(data.password);
          delete data.password;
          init={...init,body:JSON.stringify(data)};
        }
      }
    }catch{}
    return nativeFetch(input,init);
  };
})();
