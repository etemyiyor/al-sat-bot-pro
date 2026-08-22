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
POPULAR = {"THYAO", "ASELS", "TUPRS", "FROTO", "GARAN", "EREGL", "KCHOL", "BIMAS"}
UA = "Mozilla/5.0 (GitHub Actions; AL-SAT BOT PRO)"


def ticker(symbol: str) -> str:
    symbol = symbol.strip().upper()
    return "XU100.IS" if symbol in {"XU100", "BIST100"} else f"{symbol}.IS"


def yahoo_rows(symbol: str, range_: str, interval: str) -> list[dict]:
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{ticker(symbol)}?range={range_}&interval={interval}"
        "&includePrePost=false&events=div%2Csplits"
    )
    last_error = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=25) as response:
                payload = json.load(response)
            result = (payload.get("chart", {}).get("result") or [None])[0]
            if not result:
                raise RuntimeError(payload.get("chart", {}).get("error") or "Yahoo result empty")
            quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
            timestamps = result.get("timestamp") or []
            rows = []
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
                rows.append({
                    "time": int(ts) * 1000,
                    "open": float(o), "high": float(h), "low": float(l),
                    "close": float(c), "volume": float(v),
                })
            if not rows:
                raise RuntimeError("Yahoo returned no OHLC rows")
            return rows
        except Exception as exc:
            last_error = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"{symbol}: {last_error}")


def write_json(symbol: str, filename: str, rows: list[dict]) -> None:
    dest = OUT / "data" / "bist" / symbol
    dest.mkdir(parents=True, exist_ok=True)
    (dest / filename).write_text(
        json.dumps({
            "symbol": symbol,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "rows": rows,
        }, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def patch_index(html: str) -> str:
    helper = r'''
async function fetchGithubBistSeries(s,interval='1d',size=180){
  s=(s||'').trim().toUpperCase().replace(/\.IS$/,'');
  if(['BIST100','BIST-100','BIST_100'].includes(s))s='XU100';
  let file='1d.json',aggregate=null;
  if(interval==='15m')file='15m.json';
  else if(interval==='1h')file='1h.json';
  else if(interval==='4h'){file='1h.json';aggregate=4*60*60*1000}
  else if(interval==='1w'){file='1d.json';aggregate=7*24*60*60*1000}
  else if(interval==='1mo'){file='1d.json';aggregate=30*24*60*60*1000}
  const load=async(name)=>{
    const url=new URL(`./data/bist/${encodeURIComponent(s)}/${name}`,document.baseURI);
    const r=await fetch(url.toString()+`?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw Error(`GitHub BIST veri dosyası yok (${r.status})`);
    const j=await r.json();
    return Array.isArray(j.rows)?j.rows:[];
  };
  let rows=[];
  try{rows=await load(file)}catch(e){if(file!=='1d.json')rows=await load('1d.json');else throw e}
  const out=rows.map(x=>({time:+x.time,open:+x.open,high:+x.high,low:+x.low,close:+x.close,volume:+x.volume||0})).filter(x=>Number.isFinite(x.close));
  const finalRows=aggregate?aggregateBars(out,aggregate):out;
  if(!finalRows.length)throw Error('GitHub BIST veri dosyası boş');
  return finalRows.slice(-Math.min(size,500));
}
async function fetchBistSeries(s,interval='1d',size=180){
  try{return await fetchGithubBistSeries(s,interval,size)}
  catch(githubErr){
    try{return await fetchYahooBistSeries(s,interval,size)}
    catch(yahooErr){throw Error(`BIST verisi alınamadı. GitHub: ${githubErr.message} • Yedek: ${yahooErr.message}`)}
  }
}
'''
    needle = "async function fetchYahooBistSeries(s,interval='1d',size=180){"
    if "function fetchGithubBistSeries" not in html:
        html = html.replace(needle, helper + "\n" + needle, 1)
    html = html.replace("const rows=await fetchYahooBistSeries(s,'1d',8);", "const rows=await fetchBistSeries(s,'1d',8);")
    html = html.replace("return await fetchYahooBistSeries(s,interval,size);", "return await fetchBistSeries(s,interval,size);")
    html = html.replace("Yahoo Finance / BIST • gecikmeli", "GitHub Pages BIST • gecikmeli")
    html = html.replace("Yahoo Finance / BIST", "GitHub Pages / BIST")
    html = html.replace("Yahoo / BIST", "GitHub Pages / BIST")
    html = html.replace("BIST: Yahoo Finance gecikmeli", "BIST: GitHub Pages veri önbelleği")
    html = html.replace("BIST • Yahoo", "BIST • GitHub Pages")
    return html


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    html = INDEX.read_text(encoding="utf-8")
    match = re.search(r"const BIST=`([^`]*)`\.split\(' '\)", html)
    if not match:
        raise SystemExit("BIST symbol list not found in index.html")
    symbols = [s for s in match.group(1).split() if s]

    failures = []
    for idx, symbol in enumerate(symbols, 1):
        try:
            write_json(symbol, "1d.json", yahoo_rows(symbol, "1y", "1d"))
            if symbol in POPULAR:
                write_json(symbol, "1h.json", yahoo_rows(symbol, "3mo", "60m"))
                write_json(symbol, "15m.json", yahoo_rows(symbol, "1mo", "15m"))
        except Exception as exc:
            failures.append(str(exc))
        if idx % 10 == 0:
            print(f"BIST cache: {idx}/{len(symbols)}")
        time.sleep(0.12)

    (OUT / "index.html").write_text(patch_index(html), encoding="utf-8")
    (OUT / "bist-status.json").write_text(json.dumps({
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "symbols_total": len(symbols),
        "failures": failures,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Built Pages site. Symbols={len(symbols)} failures={len(failures)}")
    if failures:
        print("\n".join(failures[:20]))


if __name__ == "__main__":
    main()
