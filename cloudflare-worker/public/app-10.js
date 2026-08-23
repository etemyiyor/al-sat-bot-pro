(function(){
  'use strict';

  const BIST_CURRENT=`AEFES AKBNK AKSA AKSEN ALARK ALTNY ANSGR ARCLK ASELS ASTOR BALSU BIMAS BRSAN BRYAT BSOKE BTCIM CANTE CCOLA CIMSA CVKMD CWENE DAPGM DOAS DOHOL DSTKF ECILC EFOR EKGYO ENERY ENJSA ENKAI EREGL ESEN EUPWR EUREN FENER FROTO GARAN GENIL GESAN GLRMK GRSEL GRTHO GSRAY GUBRF HALKB HEKTS IEYHO ISCTR ISMEN IZENR KCHOL KLRHO KONTR KRDMD KTLEV KUYAS MAGEN MAVI MGROS MIATK MPARK OBAMS ODAS ODINE OTKAR OYAKC PAHOL PASEU PATEK PETKM PGSUS PSGYO QUAGR RALYH REEDR SAHOL SARKY SASA SISE SKBNK SOKM TAVHL TCELL THYAO TKFEN TOASO TRALT TRENJ TRMET TSKB TTKOM TUKAS TUPRS TURSG ULKER VAKBN VESTL YKBNK ZOREN`.split(' ');

  const originalListFor=typeof listFor==='function'?listFor:null;
  listFor=function(m){
    if(m==='bist') return BIST_CURRENT;
    return originalListFor?originalListFor(m):[];
  };
  if(typeof PRESETS!=='undefined'){
    PRESETS.bist=['XU100','ASELS','BIMAS','TUPRS','THYAO','AKBNK','DSTKF','EREGL','ASTOR','ODINE','KCHOL','KTLEV','RALYH','IEYHO','ESEN'];
  }

  const baseTechnical=typeof technical==='function'?technical:null;
  technical=function(rows){
    const t=baseTechnical(rows);
    const c=rows.map(r=>Number(r.close)).filter(Number.isFinite);
    const v=rows.map(r=>Number(r.volume)||0);
    const last=c.at(-1), prev5=c.length>5?c.at(-6):last, prev20=c.length>20?c.at(-21):last;
    const ret5=prev5?((last/prev5)-1)*100:0;
    const ret20=prev20?((last/prev20)-1)*100:0;
    const volAvg=v.slice(-20).reduce((a,b)=>a+b,0)/Math.max(1,Math.min(20,v.length));
    const volRatio=volAvg>0?(v.at(-1)||0)/volAvg:1;
    const atrPct=t.atr&&last?100*t.atr/last:0;
    const macHist=(Number(t.macd)||0)-(Number(t.signal)||0);

    let bonus=0, extra=[];
    if(ret5>1){bonus+=6;extra.push(['+','5 periyot momentum pozitif'])}
    else if(ret5<-1){bonus-=6;extra.push(['-','5 periyot momentum negatif'])}
    if(ret20>3){bonus+=8;extra.push(['+','20 periyot trend getirisi güçlü'])}
    else if(ret20<-3){bonus-=8;extra.push(['-','20 periyot trend getirisi zayıf'])}
    if(macHist>0){bonus+=5;extra.push(['+','MACD histogramı pozitif'])}
    else if(macHist<0){bonus-=5;extra.push(['-','MACD histogramı negatif'])}
    if(volRatio>1.35){
      const up=ret5>=0; bonus+=up?5:-5; extra.push([up?'+':'-',`Hacim teyidi ${volRatio.toFixed(2)}x`]);
    }
    if(atrPct>5){bonus-=Math.sign(t.score||1)*4;extra.push(['-','Yüksek volatilite: sinyal güveni düşürüldü'])}

    const score=Math.max(-100,Math.min(100,Math.round(t.score+bonus)));
    const label=score>=60?'GÜÇLÜ AL':score>=25?'AL':score<=-60?'GÜÇLÜ SAT':score<=-25?'SAT':'NÖTR';
    const agreement=Math.min(1,Math.max(0,1-Math.abs(ret5-ret20)/20));
    const confidence=Math.max(35,Math.min(95,Math.round(50+Math.abs(score)*0.32+agreement*18-Math.max(0,atrPct-2)*2)));
    return {...t,score,label,reasons:[...t.reasons,...extra],ret5,ret20,volRatio,atrPct,macHist,confidence};
  };

  const baseRenderAnalysis=typeof renderAnalysis==='function'?renderAnalysis:null;
  if(baseRenderAnalysis){
    renderAnalysis=function(a){
      baseRenderAnalysis(a);
      const t=a.t;
      const st=document.getElementById('signalText');
      if(st) st.textContent=`Skor ${t.score}/100 • Güven ${t.confidence||'—'}% • ${a.s} • ${a.int}`;
      const src=document.getElementById('analysisSource');
      if(src&&a.m!=='crypto') src.textContent=`Kaynak: Cloudflare Worker / Bloomberg • ${a.s}`;
    };
  }

  const originalRenderSymbols=typeof renderSymbols==='function'?renderSymbols:null;
  renderSymbols=function(){
    if(originalRenderSymbols) originalRenderSymbols();
    if(typeof market!=='undefined'&&market==='bist'){
      const count=document.getElementById('symbolCount');
      if(count) count.textContent='100 BIST hissesi';
    }
  };

  const note=document.getElementById('scanNote');
  if(note) note.textContent='BIST/ABD taraması Cloudflare Worker verisini kullanır. Teknik skor EMA, MACD, RSI, Bollinger, momentum, hacim ve volatiliteyi birlikte değerlendirir.';

  const ai=document.getElementById('ai');
  if(ai){
    const footer=ai.querySelector('.footerNote');
    if(footer) footer.textContent='AI PRO; çoklu zaman dilimi, trend, momentum, volatilite, hacim ve risk modellerini birleştiren yerel quant analiz motorudur. Yatırım tavsiyesi değildir.';
  }

  if(typeof renderSymbols==='function') renderSymbols();
})();
