const CRYPTO = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT"];
const BIST = ["THYAO.IS", "ASELS.IS", "TUPRS.IS", "FROTO.IS", "PGSUS.IS", "ENJSA.IS", "EREGL.IS"];

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
async function tg(env, method, body) {
  const r = await fetch("https://api.telegram.org/bot"+env.TELEGRAM_BOT_TOKEN+"/"+method, {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error("Telegram API request failed");
  return d.result;
}
function allowed(env, id) {
  return String(env.TELEGRAM_ALLOWED_USER_IDS || "").split(",").map(x=>x.trim()).filter(Boolean).includes(String(id));
}
async function send(env, chatId, text) { return tg(env,"sendMessage",{chat_id:chatId,text,disable_web_page_preview:true}); }
function ema(a,p) { const alpha=2/(p+1); let x=a[0]; for(const v of a.slice(1)) x=alpha*v+(1-alpha)*x; return x; }
function rsi(a,p=14) {
  const d=a.slice(1).map((v,i)=>v-a[i]).slice(-p);
  const gain=d.reduce((s,v)=>s+Math.max(0,v),0)/p, loss=d.reduce((s,v)=>s+Math.max(0,-v),0)/p;
  if(!loss) return gain?100:50;
  return 100-100/(1+gain/loss);
}
function analyse(symbol,price,change,closes,source) {
  if(closes.length<30) throw new Error("Yetersiz mum verisi");
  const f=ema(closes.slice(-50),12), s=ema(closes.slice(-50),26), rv=rsi(closes);
  let signal="BEKLE", reason="EMA12/EMA26 ve RSI koşulları net değil";
  if(f>s && rv>=52 && rv<70){signal="AL";reason="Yukarı trend; RSI "+rv.toFixed(1);}
  else if(f<s && rv<=48){signal="SAT";reason="Aşağı trend; RSI "+rv.toFixed(1);}
  return {symbol,price,change_pct:change,source,signal,reason,rsi:Number(rv.toFixed(2))};
}
async function cryptoData(symbol) {
  const base="https://api.binance.com/api/v3";
  const [t,ks]=await Promise.all([
    fetch(base+"/ticker/24hr?symbol="+symbol).then(r=>{if(!r.ok)throw new Error("Binance ticker error");return r.json()}),
    fetch(base+"/klines?symbol="+symbol+"&interval=1h&limit=100").then(r=>{if(!r.ok)throw new Error("Binance candle error");return r.json()})
  ]);
  return analyse(symbol,Number(t.lastPrice),Number(t.priceChangePercent),ks.slice(0,-1).map(k=>Number(k[4])),"Binance public API");
}
async function bistData(symbol) {
  const u="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=5d&interval=60m";
  const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 TradeXTelegramBot/1.0","Accept":"application/json"}});
  const d=await r.json(), q=d?.chart?.result?.[0]?.indicators?.quote?.[0];
  if(!r.ok||!q)throw new Error("BIST verisi alınamadı");
  const closes=(q.close||[]).filter(x=>x!==null).map(Number);
  if(closes.length<30)throw new Error("Yetersiz BIST saatlik veri");
  const last=closes[closes.length-1], prev=closes[closes.length-2];
  return analyse(symbol,last,(last/prev-1)*100,closes.slice(0,-1),"Yahoo Finance; gecikmeli olabilir");
}
async function market() {
  const results=[], errors=[];
  for(const s of CRYPTO){try{results.push(await cryptoData(s));}catch(e){errors.push(s);}}
  for(const s of BIST){try{results.push(await bistData(s));}catch(e){errors.push(s);}}
  return {results,errors};
}
function help(){return "AL-SAT BOTU\n/fiyat BTCUSDT\n/analiz THYAO\n/piyasa\n/sinyaller\n/durum\n/help\n\nKripto + BIST saatlik analiz. Gerçek emirler KAPALI.";}
function formatAll(items){return items.length?items.map(x=>x.symbol+": "+Number(x.price).toLocaleString("tr-TR",{maximumFractionDigits:6})+" | "+x.signal+" | RSI "+x.rsi+" | 24s "+x.change_pct.toFixed(2)+"%").join("\n"):"Veri alınamadı; daha sonra tekrar dene.";}
async function processUpdate(update,env){
  const m=update.message;if(!m?.text||!m.chat?.id)return;
  if(!allowed(env,m.from?.id)){await send(env,m.chat.id,"Erişim reddedildi. Telegram kullanıcı kimliğin TELEGRAM_ALLOWED_USER_IDS gizli ayarına eklenmeli.");return;}
  const parts=m.text.trim().split(/\s+/),cmd=parts[0].split("@")[0].toLowerCase();
  if(cmd==="/start"||cmd==="/help"){await send(env,m.chat.id,help());return;}
  if(cmd==="/durum"){await send(env,m.chat.id,"Bot webhook modunda. Saatlik analiz planlandı. Gerçek emirler: KAPALI.");return;}
  const d=await market();
  if(cmd==="/piyasa"||cmd==="/sinyaller"){await send(env,m.chat.id,formatAll(d.results)+(d.errors.length?"\nVeri alınamayanlar: "+d.errors.join(", "):""));return;}
  if(cmd==="/fiyat"||cmd==="/analiz"){
    const sym=(parts[1]||"BTCUSDT").toUpperCase().replace("/","");
    const item=d.results.find(x=>x.symbol===sym||x.symbol.replace(".IS","")===sym);
    if(!item){await send(env,m.chat.id,"Sembol bulunamadı veya veri kaynağı yanıt vermedi. /piyasa yaz.");return;}
    await send(env,m.chat.id,item.symbol+"\nFiyat: "+item.price+"\n24 saat: "+item.change_pct.toFixed(2)+"%\nSinyal: "+item.signal+"\n"+item.reason+"\nKaynak: "+item.source+"\nAnaliz sinyalidir; emir gönderilmedi.");return;
  }
  await send(env,m.chat.id,"Komut anlaşılmadı. /help yaz.");
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==="/health")return json({ok:true,service:"telegram-trading-bot",live_orders_enabled:false});
  if(u.pathname!=="/telegram")return json({ok:false,error:"Not found"},404);
  if(request.method!=="POST")return json({ok:false,error:"POST only"},405);
  if(!env.TELEGRAM_WEBHOOK_SECRET||request.headers.get("X-Telegram-Bot-Api-Secret-Token")!==env.TELEGRAM_WEBHOOK_SECRET)return json({ok:false,error:"Unauthorized"},401);
  let update;try{update=await request.json();}catch{return json({ok:false},400);}
  try{await processUpdate(update,env);}catch(e){console.error("Update failed",String(e));}
  return json({ok:true});
 },
 async scheduled(controller,env,ctx){
  ctx.waitUntil((async()=>{
   const d=await market(), alerts=d.results.filter(x=>x.signal==="AL"||x.signal==="SAT");
   if(!alerts.length)return;
   const ids=String(env.TELEGRAM_ALLOWED_USER_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
   const msg="SAATLİK ANALİZ\n"+alerts.map(x=>x.signal+" · "+x.symbol+"\nFiyat: "+x.price+"\n"+x.reason).join("\n\n")+"\n\nGerçek emir gönderilmedi.";
   for(const id of ids){try{await send(env,id,msg);}catch(e){console.error("Notification failed",String(e));}}
  })());
 }
};
