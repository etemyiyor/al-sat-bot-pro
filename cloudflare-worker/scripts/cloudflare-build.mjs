import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DB_NAME='tradex-ai-auth';
const run=(args,opts={})=>execFileSync(process.platform==='win32'?'npx.cmd':'npx',['wrangler',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],...opts});

function parseList(raw){
  const data=JSON.parse(raw);
  if(Array.isArray(data)) return data;
  if(Array.isArray(data?.result)) return data.result;
  return [];
}

function findDb(){
  const list=parseList(run(['d1','list','--json']));
  return list.find(x=>x?.name===DB_NAME) || null;
}

let db=findDb();
if(!db){
  console.log(`Creating D1 database ${DB_NAME}...`);
  run(['d1','create',DB_NAME],{stdio:'inherit'});
  db=findDb();
}
if(!db) throw new Error(`D1 database ${DB_NAME} could not be resolved`);
const dbId=db.uuid||db.id;
if(!dbId) throw new Error('D1 database id missing');

const base=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
base.d1_databases=[{binding:'DB',database_name:DB_NAME,database_id:dbId,migrations_dir:'migrations'}];
fs.writeFileSync(new URL('../wrangler.deploy.jsonc',import.meta.url),JSON.stringify(base,null,2)+'\n');

console.log('Applying D1 migrations...');
run(['d1','migrations','apply',DB_NAME,'--remote','--config','wrangler.deploy.jsonc'],{stdio:'inherit'});
console.log(`D1 ready: ${DB_NAME}`);
