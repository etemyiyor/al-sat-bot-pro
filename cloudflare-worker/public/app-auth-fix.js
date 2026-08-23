(function(){
  'use strict';
  function sync(){
    const login=document.getElementById('asbpLoginGate');
    const sub=document.getElementById('tradexSubGate');
    if(login&&sub) sub.remove();
  }
  const obs=new MutationObserver(sync);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  sync();
})();
