// Desktop listeners live independently of client/local documents.
function createService(env=globalThis){
 const records=[];const supported=!env.document;
 function describe(record){return {id:record.host.game.config.networkHost.id,title:record.host.game.config.gameTitle,file:record.file,port:record.port,address:record.address,info:record.host.info()};}
 async function retry(record,port=record.port){
  if(!records.includes(record))throw {code:'invalid_host_record'};
  if(record.host.server)return record;
  try{const bound=await record.host.listen({port,address:'0.0.0.0'});record.port=bound.port;record.address='http://127.0.0.1:'+bound.port;return record;}
  catch(error){record.address=null;const failed=new Error('host_listen_failed');failed.code=failed.message;failed.record=record;throw failed;}
 }
 async function create(options,file,listen){
  if(!supported)throw {code:'desktop_host_required'};
  const lease=require('./host-file-lease.js'),target=lease.canonical(file,false);if(require('fs').existsSync(target))throw {code:'EEXIST'};const release=lease.acquire(target);let host;
  try{host=require('./network-host.js').NetworkHost.create(options,target);}catch(error){release();throw error;}
  const record={host,file:host.file,port:listen.port,address:null,release};records.push(record);return retry(record);
 }
 async function open(file,listen={port:0}){
  if(!supported)throw {code:'desktop_host_required'};
  const lease=require('./host-file-lease.js'),target=lease.canonical(file,true);
  const existing=records.find(r=>r.file===target);if(existing)return existing;
  const release=lease.acquire(target);let host;
  try{
   host=require('./network-host.js').NetworkHost.open(target);
   if(records.some(r=>r.host.game.config.networkHost.id===host.game.config.networkHost.id))throw {code:'host_file_busy'};
  }catch(error){release();throw error;}
  const record={host,file:target,port:listen.port,address:null,release};records.push(record);return retry(record);
 }
 async function stop(record){
  if(!records.includes(record))return false;
  await record.host.close();record.address=null;record.release();records.splice(records.indexOf(record),1);return true;
 }
 async function closeAll(){for(const record of [...records])await stop(record);}
 return {supported,records,describe,create,open,retry,stop,closeAll,latest:()=>records.at(-1) || null};
}
module.exports={createService};
