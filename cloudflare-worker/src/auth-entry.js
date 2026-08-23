import app from './index.js';

const SESSION_COOKIE='asbp_session';
const SESSION_SECONDS=60*60*24*30;
const VERSION='auth-news-fallback-20260824-0042';
const te=new TextEncoder();

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s)};
const cookie=(name,value,maxAge=SESSION_SECONDS)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
async function sha(v){return hex(await crypto.subtle.digest('SHA-256',te.encode(String(v))))}
async function body(req){try{return await req.json()}catch{return {}}}
async function session(env,userId,remember=true){const raw=crypto.getRandomValues(new Uint8Array(32));const token=b64(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');const tokenHash=await sha(token);const ttl=remember?SESSION_SECONDS:43200,now=Date.now();await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(tokenHash,userId,now+ttl*1000,now).run();return{token,ttl}}
async function storedHash(proof,salt){return sha(`${salt}:${proof}`)}

function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))}
function stripHtml(s=''){return decodeXml(String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim())}
function tag(block,name){const m=String(block).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decodeXml(m[1]).trim():''}
function shortText(s,max=180){const x=stripHtml(s);return x.length>max?x.slice(0,max-1).trimEnd()+'…':x}
function timeLabel(date){const ms=Date.now()-date.getTime();if(!Number.isFinite(ms))return '';const min=Math.max(0,Math.floor(ms/60000));if(min<60)return `${min} dk önce`;const h=Math.floor(min/60);if(h<24)return `${h} sa önce`;const d=Math.floor(h/24);return `${d} gün önce`}
function parseRss(xml,category,defaultSource='Haber'){const items=[];const blocks=String(xml).match(/<item>[\s\S]*?<\/item>/gi)||[];for(const b of blocks){const title=stripHtml(tag(b,'title')),url=tag(b,'link'),pub=tag(b,'pubDate'),source=stripHtml(tag(b,'source'))||defaultSource,description=tag(b,'description');if(!title||!url)continue;const dt=new Date(pub||Date.now());items.push({title,url,source,category,publishedAt:Number.isFinite(dt.getTime())?dt.toISOString():new Date().toISOString(),timeLabel:timeLabel(dt),summary:shortText(description,180)})}return items}
async function fetchFeed(url,category,source){const r=await fetch(url,{headers:{'Accept':'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5','User-Agent':'Mozilla/5.0 TradeXAI/1.0'},cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)throw new Error(`${source} yanıt vermedi (${r.status})`);const items=parseRss(await r.text(),category,source);if(!items.length)throw new Error(`${source} boş yanıt verdi`);return items}
function googleUrl(q){const u=new URL('https://news.google.com/rss/search');u.searchParams.set('q',q);u.searchParams.set('hl','tr');u.searchParams.set('gl','TR');u.searchParams.set('ceid','TR:tr');return u.toString()}
function bingUrl(q){const u=new URL('https://www.bing.com/news/search');u.searchParams.set('q',q);u.searchParams.set('format','rss');u.searchParams.set('setlang','tr-tr');u.searchParams.set('cc','TR');return u.toString()}
async function searchNews(q,category,kind){const attempts=[()=>fetchFeed(googleUrl(q),category,'Google News'),()=>fetchFeed(bingUrl(q),category,'Bing News')];if(kind==='crypto')attempts.push(()=>fetchFeed('https://www.coindesk.com/arc/outboundfeeds/rss/',category,'CoinDesk'));if(kind==='stocks')attempts.push(()=>fetchFeed('https://feeds.marketwatch.com/marketwatch/topstories/',category,'MarketWatch'));const errors=[];for(const fn of attempts){try{return await fn()}catch(e){errors.push(e?.message||String(e))}}throw new Error(errors.join(' | '))}
async function news(topic='all'){
 const jobs=[];
 if(topic==='all'||topic==='stocks'){jobs.push(searchNews('Borsa İstanbul BIST 100 THYAO ASELSAN son 24 saat','Borsa','stocks'));jobs.push(searchNews('NASDAQ S&P 500 Dow Jones Wall Street stocks latest','ABD Borsaları','stocks'))}
 if(topic==='all'||topic==='crypto')jobs.push(searchNews('Bitcoin Ethereum kripto cryptocurrency latest','Kripto','crypto'));
 const settled=await Promise.allSettled(jobs),all=[],errors=[];for(const x of settled){if(x.status==='fulfilled')all.push(...x.value);else errors.push(x.reason?.message||String(x.reason))}
 const seen=new Set(),dedup=[];for(const n of all.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt))){const k=n.title.toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();if(seen.has(k))continue;seen.add(k);dedup.push(n);if(dedup.length>=24)break}
 if(!dedup.length)throw new Error(errors[0]||'Haberler alınamadı');
 return {ok:true,topic,updatedAt:new Date().toISOString(),items:dedup};
}

async function diag(env){
 const out={ok:true,version:VERSION,d1:!!env.DB,authScheme:'browser-pbkdf2+server-sha256',news:true,newsFallback:true};
 if(!env.DB)return out;
 try{const users=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();const sessions=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").first();const claims=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='owner_claims'").first();const cols=(await env.DB.prepare('PRAGMA table_info(users)').all()).results||[];out.tables={users:!!users,sessions:!!sessions,ownerClaims:!!claims};out.userColumns=cols.map(x=>x.name);out.writeReady=!!users&&!!sessions&&cols.some(x=>x.name==='password_hash')&&cols.some(x=>x.name==='password_salt')}catch(e){out.ok=false;out.error=e?.message||String(e)}
 return out;
}

async function register(req,env){
 if(!env.DB)return json({ok:false,error:'D1 bağlantısı yok'},503);
 const b=await body(req),username=String(b.username||'').trim(),email=String(b.email||'').trim().toLowerCase(),proof=String(b.passwordProof||'').trim().toLowerCase();
 if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username))return json({ok:false,error:'Kullanıcı adı 3-32 karakter olmalı; yalnızca harf, rakam, nokta, alt çizgi ve tire kullan.'},400);
 if(email&&!/^\S+@\S+\.\S+$/.test(email))return json({ok:false,error:'Geçerli e-posta gir.'},400);
 if(!/^[a-f0-9]{64}$/.test(proof))return json({ok:false,error:'Güvenli parola kanıtı oluşturulamadı. Sayfayı yenileyip tekrar dene.'},400);
 const exists=await env.DB.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE OR (?<>'' AND email=? COLLATE NOCASE) LIMIT 1").bind(username,email,email).first();
 if(exists)return json({ok:false,error:'Bu kullanıcı adı veya e-posta zaten kayıtlı.'},409);
 const id=crypto.randomUUID(),salt=crypto.randomUUID().replace(/-/g,''),passwordHash=await storedHash(proof,salt),now=Date.now();
 await env.DB.prepare('INSERT INTO users (id,username,email,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?)').bind(id,username,email||null,passwordHash,salt,now).run();
 const s=await session(env,id,true);
 return json({ok:true,user:{id,username,email:email||null}},201,{'Set-Cookie':cookie(SESSION_COOKIE,s.token,s.ttl)});
}

async function login(req,env){
 if(!env.DB)return json({ok:false,error:'D1 bağlantısı yok'},503);
 const b=await body(req),identity=String(b.identity||'').trim(),proof=String(b.passwordProof||'').trim().toLowerCase(),remember=b.remember!==false;
 if(!identity||!proof)return json({ok:false,error:'Kullanıcı adı ve şifre gerekli.'},400);
 if(!/^[a-f0-9]{64}$/.test(proof))return json({ok:false,error:'Güvenli parola kanıtı oluşturulamadı.'},400);
 const user=await env.DB.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE LIMIT 1').bind(identity,identity.toLowerCase()).first();
 if(!user)return json({ok:false,error:'Kullanıcı adı/e-posta veya şifre hatalı.'},401);
 const actual=await storedHash(proof,String(user.password_salt||''));
 if(actual!==user.password_hash)return json({ok:false,error:'Kullanıcı adı/e-posta veya şifre hatalı.'},401);
 const s=await session(env,user.id,remember);await env.DB.prepare('UPDATE users SET last_login_at=? WHERE id=?').bind(Date.now(),user.id).run();
 return json({ok:true,user:{id:user.id,username:user.username,email:user.email||null}},200,{'Set-Cookie':cookie(SESSION_COOKIE,s.token,s.ttl)});
}

export default{async fetch(request,env,ctx){const u=new URL(request.url),p=u.pathname.replace(/\/+$/,'')||'/';try{if(p==='/auth/diag'&&request.method==='GET')return json(await diag(env));if(p==='/auth/register'&&request.method==='POST')return await register(request,env);if(p==='/auth/login'&&request.method==='POST')return await login(request,env);if(p==='/news'&&request.method==='GET'){const topic=['all','stocks','crypto'].includes(u.searchParams.get('topic'))?u.searchParams.get('topic'):'all';return json(await news(topic),200,{'Cache-Control':'public, max-age=120, s-maxage=300'})}return await app.fetch(request,env,ctx)}catch(e){return json({ok:false,error:e?.message||'Sunucu hatası',version:VERSION},e?.status||500)}}};
