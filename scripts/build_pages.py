from __future__ import annotations

import json
import re
import shutil
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
INDEX = ROOT / "index.html"
UA = "Mozilla/5.0 (GitHub Actions; AL-SAT BOT PRO)"


def ticker(symbol: str) -> str:
    symbol = symbol.strip().upper()
    return "XU100.IS" if symbol in {"XU100", "BIST100", "BIST-100"} else f"{symbol}.IS"


def yahoo_rows(symbol: str, range_: str, interval: str) -> list[dict]:
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{ticker(symbol)}?range={range_}&interval={interval}"
        "&includePrePost=false&events=div%2Csplits"
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=25) as response:
                payload = json.load(response)
            result = (payload.get("chart", {}).get("result") or [None])[0]
            if not result:
                raise RuntimeError(payload.get("chart", {}).get("error") or "Yahoo result empty")
            quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
            timestamps = result.get("timestamp") or []
            rows: list[dict] = []
            for i, ts in enumerate(timestamps):
                try:
                    o = quote.get("open", [])[i]
                    h = quote.get("high", [])[i]
                    l = quote.get("low", [])[i]
                    c = quote.get("close", [])[i]
                    v = quote.get("volume", [])[i] or 0
                except (IndexError, TypeError):
                    continue
                if any(x is None for x in (o, h, l, c)):
                    continue
                rows.append(
                    {
                        "time": int(ts) * 1000,
                        "open": float(o),
                        "high": float(h),
                        "low": float(l),
                        "close": float(c),
                        "volume": float(v),
                    }
                )
            if not rows:
                raise RuntimeError("Yahoo returned no OHLC rows")
            return rows
        except Exception as exc:
            last_error = exc
            time.sleep(1.1 * (attempt + 1))
    raise RuntimeError(f"{symbol}: {last_error}")


def write_json(symbol: str, filename: str, rows: list[dict]) -> None:
    dest = OUT / "data" / "bist" / symbol
    dest.mkdir(parents=True, exist_ok=True)
    (dest / filename).write_text(
        json.dumps(
            {
                "symbol": symbol,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "rows": rows,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


def extract_bist_symbols(html: str) -> list[str]:
    match = re.search(r"const\s+PRESETS=\{bist:\[([^\]]+)\]", html)
    if match:
        symbols = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
        if symbols:
            return symbols

    match = re.search(r"const\s+BIST=`([^`]*)`\.split\(['\"]\s*['\"]\)", html)
    if match:
        symbols = [s for s in match.group(1).split() if s]
        if symbols:
            return symbols

    raise RuntimeError("BIST symbol list not found in index.html")


def patch_index(html: str) -> str:
    replacement = r'''async function publicJson(url){
  if(String(url).includes('query1.finance.yahoo.com/v8/finance/chart/')){
    try{
      const u=new URL(url),raw=decodeURIComponent(u.pathname.split('/').pop()||'').toUpperCase();
      let symbol=raw.replace(/\.IS$/,'');if(symbol==='BIST100')symbol='XU100';
      const interval=(u.searchParams.get('interval')||'1d').toLowerCase();
      let file=interval==='15m'?'15m.json':(interval==='60m'||interval==='1h')?'1h.json':'1d.json';
      const local=new URL(`./data/bist/${encodeURIComponent(symbol)}/${file}`,document.baseURI);
      let r=await fetch(local.toString()+`?v=${Date.now()}`,{cache:'no-store'});
      if(!r.ok&&file!=='1d.json'){
        file='1d.json';
        const fallback=new URL(`./data/bist/${encodeURIComponent(symbol)}/${file}`,document.baseURI);
        r=await fetch(fallback.toString()+`?v=${Date.now()}`,{cache:'no-store'});
      }
      if(!r.ok)throw Error(`GitHub BIST cache HTTP ${r.status}`);
      const payload=await r.json(),rows=Array.isArray(payload.rows)?payload.rows:[];
      if(!rows.length)throw Error('GitHub BIST cache boş');
      return {chart:{result:[{timestamp:rows.map(x=>Math.floor((+x.time)/1000)),indicators:{quote:[{
        open:rows.map(x=>+x.open),high:rows.map(x=>+x.high),low:rows.map(x=>+x.low),close:rows.map(x=>+x.close),volume:rows.map(x=>+x.volume||0)
      }]}}],error:null}};
    }catch(cacheErr){console.warn('GitHub BIST cache fallback:',cacheErr)}
  }
  const arr=[url,'https://corsproxy.io/?url='+encodeURIComponent(url),'https://api.allorigins.win/raw?url='+encodeURIComponent(url)];let e;
  for(const u of arr){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}catch(x){e=x}}
  throw Error('BIST veri bağlantısı kurulamadı: '+(e?.message||''));
}'''

    pattern = re.compile(r"async function publicJson\(url\)\{.*?\}\nasync function fetchQuote", re.S)
    html, count = pattern.subn(replacement + "\nasync function fetchQuote", html, count=1)
    if count != 1:
        raise RuntimeError("publicJson function could not be patched")

    html = html.replace("Yahoo Finance / BIST • gecikmeli", "GitHub Pages / BIST • gecikmeli")
    html = html.replace("Yahoo / BIST", "GitHub Pages / BIST")
    html = html.replace("BIST: Yahoo Finance gecikmeli", "BIST: GitHub Pages veri önbelleği")
    html = html.replace("BIST • Yahoo", "BIST • GitHub Pages")
    return html


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    html = INDEX.read_text(encoding="utf-8")
    symbols = extract_bist_symbols(html)
    failures: list[str] = []

    for idx, symbol in enumerate(symbols, 1):
        for filename, range_, interval in (
            ("1d.json", "1y", "1d"),
            ("1h.json", "3mo", "60m"),
            ("15m.json", "1mo", "15m"),
        ):
            try:
                write_json(symbol, filename, yahoo_rows(symbol, range_, interval))
            except Exception as exc:
                failures.append(f"{symbol}/{filename}: {exc}")
        print(f"BIST cache: {idx}/{len(symbols)} {symbol}")
        time.sleep(0.15)

    (OUT / "index.html").write_text(patch_index(html), encoding="utf-8")
    (OUT / "bist-status.json").write_text(
        json.dumps(
            {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "symbols_total": len(symbols),
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Built Pages site. Symbols={len(symbols)} failures={len(failures)}")
    if failures:
        print("\n".join(failures[:30]))


if __name__ == "__main__":
    main()
