import app from './auth-entry.js';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

async function readiness(env){
  const checks={
    worker:true,
    assets:!!env.ASSETS,
    d1:!!env.DB,
    billing:!!env.IYZICO_API_KEY&&!!env.IYZICO_SECRET_KEY&&!!env.IYZICO_PLAN_STARTER&&!!env.IYZICO_PLAN_PRO&&!!env.IYZICO_PLAN_BUSINESS,
    marketData:true,
    news:true
  };
  if(env.DB){
    try{
      const users=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
      const sessions=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").first();
      const claims=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='owner_claims'").first();
      checks.d1Tables=!!users&&!!sessions&&!!claims;
    }catch{checks.d1Tables=false}
  }else checks.d1Tables=false;
  const required=['worker','assets','d1','d1Tables','billing','marketData','news'];
  const ready=required.every(k=>checks[k]===true);
  return {ok:true,ready,version:'prod-v50-readiness-1',checks,time:new Date().toISOString()};
}

export default {
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(path==='/ready'&&request.method==='GET'){
      const r=await readiness(env);
      return json(r,r.ready?200:503);
    }
    return app.fetch(request,env,ctx);
  }
};
