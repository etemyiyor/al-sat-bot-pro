import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {pathToFileURL} from 'url';

const root=process.cwd();
const port=3000;
const host='0.0.0.0';

function json(res,code,obj){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,bad)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{ok(s?JSON.parse(s):{})}catch(e){bad(e)}})})}
async function api(req,res,u){let name=u.pathname.slice(5);if(!/^[a-z0-9-]+$/.test(name))return json(res,404,{error:'API bulunamadı'});let file=path.join(root,'api',name+'.js');if(!fs.existsSync(file))return json(res,404,{error:'API bulunamadı'});try{let mod=await import(pathToFileURL(file).href+'?t='+Date.now()),q=Object.fromEntries(u.searchParams.entries()),b=req.method==='POST'?await body(req):{};let r={method:req.method,query:q,body:b};let out={statusCode:200,headers:{}};let rr={status(c){out.statusCode=c;return rr},setHeader(k,v){out.headers[k]=v;return rr},json(o){res.writeHead(out.statusCode,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...out.headers});res.end(JSON.stringify(o));return rr},send(o){res.writeHead(out.statusCode,out.headers);res.end(typeof o==='string'?o:JSON.stringify(o));return rr}};await mod.default(r,rr)}catch(e){json(res,500,{error:e.message})}}
function staticFile(req,res,u){let p=u.pathname==='/'?'index.html':u.pathname.slice(1);p=path.normalize(p).replace(/^\.\.(\/|\\|$)/,'');let f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('404')}let ext=path.extname(f),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res)}
function lanAddresses(){const nets=os.networkInterfaces();const out=[];for(const list of Object.values(nets)){for(const n of list||[]){if(n.family==='IPv4'&&!n.internal)out.push(n.address)}}return [...new Set(out)]}
const server=http.createServer(async(req,res)=>{let u=new URL(req.url,'http://127.0.0.1:'+port);if(u.pathname==='/api/health')return json(res,200,{ok:true,port,lan:lanAddresses()});if(u.pathname.startsWith('/api/'))return api(req,res,u);return staticFile(req,res,u)});
server.on('error',e=>{console.error('\nSUNUCU HATASI:',e.message);if(e.code==='EADDRINUSE')console.error('3000 portu kullanımda. Eski AL-SAT BOT pencerelerini kapatıp tekrar deneyin.');process.exitCode=1});
server.listen(port,host,()=>{const lans=lanAddresses();console.log('\n========================================');console.log(' AL-SAT BOT PRO ÇALIŞIYOR');console.log('========================================');console.log('Bilgisayar: http://127.0.0.1:'+port);if(lans.length){console.log('\nTelefon (aynı Wi-Fi):');for(const ip of lans)console.log('http://'+ip+':'+port)}else console.log('\nTelefon adresi bulunamadı. Wi-Fi/Ethernet bağlantısını kontrol edin.');console.log('\nWindows Güvenlik Duvarı sorarsa Node.js için Özel ağlara izin verin.');console.log('Durdurmak için Ctrl+C\n')});
