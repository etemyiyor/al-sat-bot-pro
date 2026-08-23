const te=new TextEncoder();
const b64url=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')};
async function mac(secret,data){const k=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(await crypto.subtle.sign('HMAC',k,te.encode(data)))}
async function issue(env){const payload={role:'admin',iat:Date.now(),exp:Date.now()+12*60*60*1000,nonce:crypto.randomUUID()};const raw=b64url(te.encode(JSON.stringify(payload)));return raw+'.'+await mac(String(env.ADMIN_ACCESS_CODE),raw)}
async function verify(env,token){if(!env.ADMIN_ACCESS_CODE||!String(token||'').includes('.'))return null;const [raw,sig]=String(token).split('.',2);if(await mac(String(env.ADMIN_ACCESS_CODE),raw)!==sig)return null;try{const pad=raw.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw.length%4)%4);const p=JSON.parse(atob(pad));if(p.role!=='admin'||Number(p.exp)<=Date.now())return null;return p}catch{return null}}
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export async function handleSecurity(request,env,url){const path=url.pathname.replace(/\/+$/,'')||'/';
 if(path==='/security/admin-login'&&request.method==='POST'){if(!env.ADMIN_ACCESS_CODE)return json({ok:false,error:'Admin erişimi henüz yapılandırılmadı.'},503);const body=await request.json().catch(()=>({}));const code=String(body.code||'');if(!code||code!==String(env.ADMIN_ACCESS_CODE))return json({ok:false,error:'Admin doğrulaması başarısız.'},401);return json({ok:true,token:await issue(env),expiresIn:43200})}
 if(path==='/security/admin-verify'&&request.method==='POST'){const body=await request.json().catch(()=>({}));const p=await verify(env,body.token);return json({ok:true,active:!!p,expiresAt:p?.exp||0})}
 return json({ok:false,error:'Security endpoint bulunamadı.'},404)}
