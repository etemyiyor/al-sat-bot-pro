(function(){
  if(typeof fetchQuote!=='function'||typeof fetchSeries!=='function')return;
  const qPrev=fetchQuote,sPrev=fetchSeries;
  fetchQuote=async function(m,s){
    const q=await qPrev(m,s);
    if(m==='bist' && /twelve/i.test(String(q?.source||''))) throw Error('BIST için Twelve Data kullanımı engellendi. Bloomberg backend gerekli.');
    return q;
  };
  fetchSeries=async function(m,s,interval='1h',size=180){
    if(m==='bist'){
      try{return await sPrev(m,s,interval,size)}
      catch(e){
        if(/twelve/i.test(String(e?.message||''))) throw Error('BIST için Twelve Data devre dışı. Bloomberg backend bağlantısını kontrol et.');
        throw e;
      }
    }
    return sPrev(m,s,interval,size);
  };
  document.querySelectorAll('option').forEach(o=>{if(/BIST\s*\/\s*Twelve|BIST.*Twelve/i.test(o.textContent||''))o.textContent='BIST / Bloomberg'});
  const note=document.getElementById('scanNote');if(note&&/BIST.*Twelve/i.test(note.textContent||''))note.textContent='BIST taraması yalnızca Bloomberg backend verisini kullanır.';
  const tvNote=document.getElementById('tvNote');if(tvNote&&/BIST.*Twelve/i.test(tvNote.textContent||''))tvNote.textContent='BIST sayısal verisi yalnızca Bloomberg backend üzerinden gelir. TradingView grafiği bağımsızdır.';
  const src=document.getElementById('analysisSource');if(src&&/Twelve/i.test(src.textContent||''))src.textContent='Kaynak: Bloomberg';
})();