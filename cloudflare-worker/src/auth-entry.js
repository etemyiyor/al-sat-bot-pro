import app from './index.js';

const SESSION_COOKIE='asbp_session';
const SESSION_SECONDS=60*60*24*30;
const KDF_ITERATIONS=30000;
const te=new TextEncoder();

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const cookie=(name,value,maxAge=SESSION_SECONDS)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
async function sha(v){return hex(await crypto.subtle.digest('SHA-256',te.encode(String(v))))}
async function hashPassword(password,salt){const key=await crypto.subtle.importKey('raw',te.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:KDF_ITERATIONS,hash:'SHA-256'},key,256);return hex(bits)}
async function body(req){try{return await req.json()}catch{return {}}}
async function session(env,userId,remember=true){const raw=crypto.getRandomValues(new Uint8Array(32));const token=b64(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');const tokenHash=await sha(token);const ttl=remember?SESSION_SECONDS:43200,now=Date.now();await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(tokenHash,userId,now+ttl*1000,now).run();return{token,ttl}}

async function register(req,env){
 if(!env.DB)return json({ok:false,error:'D1 bağlantısı yok'},503);
 const b=await body(req),username=String(b.username||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
 if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username))return json({ok:false,error:'Kullanıcı adı 3-32 karakter olmalı; yalnızca harf, rakam, nokta, alt çizgi ve tire kullan.'},400);
 if(email&&!/^\S+@\S+\.\S+$/.test(email))return json({ok:false,error:'Geçerli e-posta gir.'},400);
 if(password.length<8)return json({ok:false,error:'Şifre en az 8 karakter olmalı.'},400);
 const exists=await env.DB.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE OR (?<>"" AND email=? COLLATE NOCASE) LIMIT 1').bind(username,email,email).first();
 if(exists)return json({ok:false,error:'Bu kullanıcı adı veya e-posta zaten kayıtlı.'},409);
 const id=crypto.randomUUID(),salt=crypto.getRandomValues(new Uint8Array(16)),passwordHash=await hashPassword(password,salt),now=Date.now();
 await env.DB.prepare('INSERT INTO users (id,username,email,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?)').bind(id,username,email||null,passwordHash,b64(salt),now).run();
 const s=await session(env,id,true);
 return json({ok:true,user:{id,username,email:email||null}},201,{'Set-Cookie':cookie(SESSION_COOKIE,s.token,s.ttl)});
}

async function login(req,env){
 if(!env.DB)return json({ok:false,error:'D1 bağlantısı yok'},503);
 const b=await body(req),identity=String(b.identity||'').trim(),password=String(b.password||''),remember=b.remember!==false;
 if(!identity||!password)return json({ok:false,error:'Kullanıcı adı ve şifre gerekli.'},400);
 const user=await env.DB.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE LIMIT 1').bind(identity,identity.toLowerCase()).first();
 if(!user)return json({ok:false,error:'Kullanıcı adı/e-posta veya şifre hatalı.'},401);
 const actual=await hashPassword(password,unb64(user.password_salt));
 if(actual!==user.password_hash)return json({ok:false,error:'Kullanıcı adı/e-posta veya şifre hatalı.'},401);
 const s=await session(env,user.id,remember);await env.DB.prepare('UPDATE users SET last_login_at=? WHERE id=?').bind(Date.now(),user.id).run();
 return json({ok:true,user:{id:user.id,username:user.username,email:user.email||null}},200,{'Set-Cookie':cookie(SESSION_COOKIE,s.token,s.ttl)});
}

export default{async fetch(request,env,ctx){const p=new URL(request.url).pathname.replace(/\/+$/,'')||'/';try{if(p==='/auth/register'&&request.method==='POST')return await register(request,env);if(p==='/auth/login'&&request.method==='POST')return await login(request,env);return await app.fetch(request,env,ctx)}catch(e){return json({ok:false,error:e?.message||'Sunucu hatası'},e?.status||500)}}};
