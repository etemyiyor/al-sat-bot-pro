"""Telegram + mobile web trading monitor. Paper/analysis only; real orders are not implemented."""
import asyncio, hmac, json, logging, os
from datetime import datetime, timezone
from typing import Any
import httpx
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("trading-bot")
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
ALLOWED_IDS = {x.strip() for x in os.getenv("TELEGRAM_ALLOWED_USER_IDS", "").split(",") if x.strip()}
PANEL_USER, PANEL_PASS = os.getenv("PANEL_USERNAME", "admin"), os.getenv("PANEL_PASSWORD", "")
SCAN_SECONDS = max(300, int(os.getenv("SCAN_SECONDS", "3600")))
CRYPTO = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT"]
BIST = ["THYAO.IS", "ASELS.IS", "TUPRS.IS", "FROTO.IS", "PGSUS.IS", "ENJSA.IS", "EREGL.IS"]
state: dict[str, Any] = {"updated_at": None, "prices": {}, "signals": [], "errors": [], "mode": "PAPER_ONLY", "live_orders_enabled": False}
client = httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0), headers={"User-Agent": "TradingBotMVP/1.0"})
security = HTTPBasic()

PANEL = """<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0b1220"><title>Al-Sat Botu</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e5edf9;font:15px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}header{padding:24px 18px 14px;background:#111c30;position:sticky;top:0}h1{font-size:23px;margin:0 0 6px}.muted{color:#9caec7;font-size:12px}.wrap{max-width:900px;margin:auto;padding:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{background:#131f33;border:1px solid #24334c;border-radius:15px;padding:14px;min-width:0}.card h2{font-size:14px;margin:0 0 12px}.price{font-size:18px;font-weight:700;overflow-wrap:anywhere}.row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid #26354b}.tag{font-size:11px;border-radius:20px;padding:4px 8px;background:#26354b;white-space:nowrap}.buy{color:#71e2b1}.sell{color:#ff9b9b}button{background:#2563eb;color:white;border:0;border-radius:10px;padding:11px 14px;font-weight:600}footer{padding:22px 4px;color:#9caec7;font-size:12px;line-height:1.6}@media(min-width:650px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:360px){.grid{grid-template-columns:1fr}}
</style></head><body><header><div class="wrap" style="padding:0"><h1>📈 Al-Sat Botu</h1><div class="muted">Kripto + BIST · Saatlik analiz · Gerçek emirler kapalı</div></div></header><main class="wrap"><div style="display:flex;justify-content:space-between;align-items:center;margin:5px 0 14px;gap:10px"><span id="updated" class="muted">Veriler yükleniyor…</span><button onclick="load()">Yenile</button></div><div class="grid"><section class="card"><h2>Bot modu</h2><div id="mode" class="price">PAPER_ONLY</div><p class="muted">Canlı emir gönderimi devre dışı</p></section><section class="card"><h2>İzlenen varlıklar</h2><div id="count" class="price">—</div><p class="muted">Kripto + BIST</p></section><section class="card"><h2>Veri bağlantısı</h2><div id="health" class="price">Kontrol ediliyor</div><p class="muted">Gecikme kaynağa göre değişir</p></section></div><section class="card" style="margin-top:12px"><h2>Fiyatlar</h2><div id="prices">Yükleniyor…</div></section><section class="card" style="margin-top:12px"><h2>Son analizler</h2><div id="signals">Henüz sinyal yok.</div></section><footer>Teknik analiz bilgilendirme amaçlıdır; yatırım tavsiyesi veya kâr garantisi değildir. Binance herkese açık kripto API'si; Yahoo Finance BIST verisi gecikmeli/eksik olabilir. BIST emirleri ve gerçek emir iletimi bu MVP'de desteklenmez.</footer></main><script>
async function load(){try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const s=await r.json(),vals=Object.values(s.prices||{});document.querySelector('#updated').textContent='Son güncelleme: '+(s.updated_at||'henüz yok');document.querySelector('#mode').textContent=s.mode;document.querySelector('#count').textContent=vals.length;document.querySelector('#health').textContent=vals.length?'Veri alındı':'Veri bekleniyor';document.querySelector('#prices').innerHTML=vals.map(p=>'<div class="row"><div><b>'+p.symbol+'</b><div class="muted">'+p.source+' · '+p.timeframe+'</div></div><div style="text-align:right"><div class="price">'+(p.price==null?'—':Number(p.price).toLocaleString('tr-TR',{maximumFractionDigits:6}))+'</div><span class="tag '+(p.change_pct>0?'buy':p.change_pct<0?'sell':'')+'">'+(p.change_pct==null?'':(p.change_pct>0?'+':'')+Number(p.change_pct).toFixed(2)+'%')+'</span></div></div>').join('')||'Henüz fiyat verisi yok.';document.querySelector('#signals').innerHTML=(s.signals||[]).slice(0,25).map(x=>'<div class="row"><div><b>'+x.symbol+'</b><div class="muted">'+x.reason+'</div><div class="muted">'+x.time+'</div></div><span class="tag '+(x.signal==='AL'?'buy':x.signal==='SAT'?'sell':'')+'">'+x.signal+'</span></div>').join('')||'Henüz sinyal yok.'}catch(e){document.querySelector('#health').textContent='Bağlantı hatası'}}load();setInterval(load,60000);
</script></body></html>"""

def ema(values, period):
    a = 2 / (period + 1); result = values[0]
    for v in values[1:]: result = a * v + (1 - a) * result
    return result

def rsi(values, period=14):
    diffs = [values[i] - values[i-1] for i in range(1, len(values))][-period:]
    gains = sum(max(x, 0) for x in diffs) / period
    losses = sum(max(-x, 0) for x in diffs) / period
    if not losses: return 100.0 if gains else 50.0
    return 100 - 100 / (1 + gains / losses)

def analyze(symbol, price, change, closes, source):
    if len(closes) < 30: raise ValueError("Saatlik geçmiş veri yetersiz")
    f, s, rv = ema(closes[-50:], 12), ema(closes[-50:], 26), rsi(closes)
    signal, reason = "BEKLE", f"RSI {rv:.1f}; EMA12 {'>' if f>s else '<='} EMA26"
    if f > s and 52 <= rv < 70: signal, reason = "AL", f"Yukarı trend; RSI {rv:.1f}"
    elif f < s and rv <= 48: signal, reason = "SAT", f"Aşağı trend; RSI {rv:.1f}"
    return {"symbol":symbol,"price":price,"change_pct":change,"source":source,"timeframe":"1h","signal":signal,"reason":reason,"rsi":round(rv,2),"time":datetime.now(timezone.utc).isoformat()}

async def get_json(url, params=None):
    r = await client.get(url, params=params); r.raise_for_status(); return r.json()

async def crypto_data(symbol):
    base = "https://api.binance.com/api/v3"
    ticker = await get_json(base + "/ticker/24hr", {"symbol":symbol})
    candles = await get_json(base + "/klines", {"symbol":symbol,"interval":"1h","limit":100})
    closes = [float(k[4]) for k in candles[:-1]]  # ignore still-open candle
    return analyze(symbol,float(ticker["lastPrice"]),float(ticker["priceChangePercent"]),closes,"Binance public API")

async def bist_data(symbol):
    data = await get_json(f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}", {"range":"5d","interval":"1h"})
    result = data.get("chart",{}).get("result")
    if not result: raise ValueError("Yahoo Finance BIST verisi yok")
    closes = [float(x) for x in result[0]["indicators"]["quote"][0].get("close",[]) if x is not None]
    if len(closes)<30: raise ValueError("Saatlik BIST geçmiş veri yetersiz")
    return analyze(symbol,closes[-1],(closes[-1]/closes[-2]-1)*100,closes[:-1],"Yahoo Finance (gecikmeli olabilir)")

async def send_message(chat_id, text):
    if not TOKEN: return
    try:
        r=await client.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage",json={"chat_id":chat_id,"text":text,"disable_web_page_preview":True})
        r.raise_for_status()
    except Exception as e: log.warning("Telegram send failed: %s",e)

async def notify(signals):
    for uid in ALLOWED_IDS:
        for x in signals: await send_message(uid,f"{x['signal']} · {x['symbol']}\nFiyat: {x['price']}\n{x['reason']}\nSaatlik analiz; gerçek emir gönderilmedi.")

async def refresh():
    prices, signals, errors = {}, [], []
    for sym, fn in [(s,crypto_data) for s in CRYPTO]+[(s,bist_data) for s in BIST]:
        try:
            x=await fn(sym); prices[sym]=x
            if x["signal"]!="BEKLE": signals.append(x)
        except Exception as e:
            log.warning("Fetch failed %s: %s",sym,e); errors.append({"symbol":sym,"error":str(e)[:150]})
    state["prices"]=prices; state["signals"]=(signals+state["signals"])[:100]
    state["errors"]=errors; state["updated_at"]=datetime.now(timezone.utc).isoformat()
    if signals: await notify(signals)

async def tg_call(method, payload):
    r=await client.post(f"https://api.telegram.org/bot{TOKEN}/{method}",json=payload); r.raise_for_status()
    data=r.json()
    if not data.get("ok"): raise RuntimeError("Telegram API error")
    return data.get("result",[])

async def command(chat_id, user_id, text):
    if not ALLOWED_IDS or user_id not in ALLOWED_IDS:
        await send_message(chat_id,"Erişim reddedildi."); return
    cmd=text.split()[0].split("@")[0].lower()
    if cmd in ("/start","/help"):
        answer="Al-Sat Botu\n/fiyat BTCUSDT\n/analiz BTCUSDT\n/piyasa\n/sinyaller\n/durum\n/yenile\n\nGerçek emirler KAPALI."
    elif cmd=="/durum": answer=f"Mod: PAPER_ONLY\nGerçek emirler: KAPALI\nSon veri: {state['updated_at'] or 'yok'}\nFiyat kaydı: {len(state['prices'])}"
    elif cmd=="/yenile":
        await refresh(); answer="Veri yenileme denendi. /piyasa ile sonucu kontrol et."
    elif cmd in ("/piyasa","/sinyaller"):
        answer="\n".join(f"{x['symbol']}: {x['price']:.6g} | {x['signal']} | RSI {x['rsi']}" for x in list(state["prices"].values())[:25]) or "Veri yok; /yenile dene."
    elif cmd in ("/fiyat","/analiz"):
        args=text.split(maxsplit=1); sym=args[1].upper().strip().replace("/","") if len(args)>1 else "BTCUSDT"
        found=[x for x in state["prices"].values() if x["symbol"].upper()==sym or x["symbol"].upper().replace(".IS","")==sym]
        if not found: answer="Sembol bulunamadı/veri yok. /piyasa ile sembolleri gör."
        else:
            x=found[0]; answer=f"{x['symbol']}\nFiyat: {x['price']}\n24s değişim: {x['change_pct']:.2f}%\nSinyal: {x['signal']}\n{x['reason']}\nKaynak: {x['source']}\nEmir gönderilmedi."
    else: answer="Komut anlaşılmadı. /help"
    await send_message(chat_id,answer)

async def telegram_loop():
    if not TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN missing; Telegram polling disabled"); return
    offset=None
    while True:
        try:
            params={"timeout":25,"allowed_updates":json.dumps(["message"])}
            if offset is not None: params["offset"]=offset
            updates=await get_json(f"https://api.telegram.org/bot{TOKEN}/getUpdates",params)
            for u in updates.get("result",[]):
                offset=u["update_id"]+1; msg=u.get("message",{}); txt=msg.get("text","")
                if txt.startswith("/") and msg.get("chat",{}).get("id") is not None:
                    await command(str(msg["chat"]["id"]),str(msg.get("from",{}).get("id","")),txt)
        except asyncio.CancelledError: raise
        except Exception as e: log.warning("Telegram polling failed: %s",e); await asyncio.sleep(5)

async def scanner_loop():
    while True:
        try: await refresh()
        except asyncio.CancelledError: raise
        except Exception: log.exception("Scanner failure")
        await asyncio.sleep(SCAN_SECONDS)

app=FastAPI(title="Trading Bot MVP",docs_url=None,redoc_url=None)
@app.on_event("startup")
async def startup():
    app.state.tasks=[asyncio.create_task(scanner_loop()),asyncio.create_task(telegram_loop())]
@app.on_event("shutdown")
async def shutdown():
    for t in getattr(app.state,"tasks",[]): t.cancel()
    await client.aclose()

def auth(c: HTTPBasicCredentials=Depends(security)):
    if not PANEL_PASS: raise HTTPException(503,"Set PANEL_PASSWORD in hosting environment")
    good=hmac.compare_digest(c.username.encode(),PANEL_USER.encode()) and hmac.compare_digest(c.password.encode(),PANEL_PASS.encode())
    if not good: raise HTTPException(401,headers={"WWW-Authenticate":"Basic"},detail="Unauthorized")
    return c.username

@app.get("/health")
async def health(): return {"status":"ok","mode":"PAPER_ONLY","live_orders_enabled":False,"time":datetime.now(timezone.utc).isoformat()}
@app.get("/",response_class=HTMLResponse)
async def home(_: str=Depends(auth)): return HTMLResponse(PANEL)
@app.get("/api/state")
async def api_state(_: str=Depends(auth)): return JSONResponse({k:v for k,v in state.items() if k!="errors"})
@app.get("/api/errors")
async def api_errors(_: str=Depends(auth)): return {"errors":state["errors"]}
