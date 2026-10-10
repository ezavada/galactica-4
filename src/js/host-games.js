// Desktop listeners live independently of client/local documents.
function createService(env=globalThis){
 const records=[],conversions=new Map();const supported=!env.document;
 function describe(record){return {id:record.host.game.config.networkHost.id,title:record.host.game.config.gameTitle,file:record.file,port:record.port,address:record.address,info:record.host.info(),administration:{players:require('./host-players.js').describe(record.host.game),playersRevision:require('./host-players.js').revision(record.host.game),settings:require('./host-settings.js').snapshot(record.host.game),settingsRevision:record.host.game.config.networkHost.settingsRevision || 0,complete:record.host.game.isGameOver,pending:record.host.game.config.networkHost.players.flatMap((claim,index)=>{const p=record.host.game.players[record.host.game.config.getHumanPlayerSlots()[index]];return claim && p.isAlive && p.lastTurnPosted<record.host.game.turn?[{player:record.host.game.config.getHumanPlayerSlots()[index],name:claim.name}]:[];})}};}
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
  }catch(error){
   release();if(error.code==='local_turn_file'){
    const token=require('crypto').randomBytes(16).toString('hex'),path=require('path'),name=require('./document-files.js').suggestedName(error.local.title).replace(/\.gad4\.json$/,'.host.gad4.json');
    conversions.set(token,{text:error.sourceText,file:target});error.conversion={...error.local,token,file:target,suggestedFile:path.join(path.dirname(target),name)};delete error.sourceText;
   }throw error;
  }
  const record={host,file:target,port:listen.port,address:null,release};records.push(record);return retry(record);
 }
 async function convert(token,file,numHumans,listen={port:0}){
  if(!supported)throw {code:'desktop_host_required'};
  const source=conversions.get(token);if(!source)throw {code:'invalid_conversion_offer'};
  const lease=require('./host-file-lease.js'),target=lease.canonical(file,false);if(require('fs').existsSync(target))throw {code:'EEXIST'};const release=lease.acquire(target);let host;
  try{host=require('./network-host.js').NetworkHost.fromLocal(source.text,numHumans,target);}catch(error){release();throw error;}
  conversions.delete(token);const record={host,file:target,port:listen.port,address:null,release};records.push(record);return retry(record);
 }
 function discardConversion(token){return conversions.delete(token);}
 async function stop(record){
  if(!records.includes(record))return false;
  await record.host.close();record.address=null;record.release();records.splice(records.indexOf(record),1);return true;
 }
 async function turnControl(record,action,expectedTurn){
  if(!supported)throw {code:'desktop_host_required'};if(!records.includes(record) || !record.address)throw {code:'invalid_host_record'};
  if(record.host.game.isGameOver)throw {code:'game_complete'};
  if(action==='pause')record.host.pauseClock();else if(action==='resume')record.host.resumeClock();else if(action==='end')record.host.forceEndTurn(expectedTurn);else throw {code:'invalid_host_action'};return record;
 }
 async function changePlayer(record,value,revision,turn){if(!supported)throw {code:'desktop_host_required'};if(!records.includes(record) || !record.address)throw {code:'invalid_host_record'};record.host.changePlayer(value,revision,turn);return record;}
 async function updateSettings(record,value,revision){if(!supported)throw {code:'desktop_host_required'};if(!records.includes(record) || !record.address)throw {code:'invalid_host_record'};record.host.updateSettings(value,revision);return record;}
 async function closeAll(){for(const record of [...records])await stop(record);}
 return {supported,records,describe,create,open,convert,discardConversion,retry,stop,turnControl,changePlayer,updateSettings,closeAll,latest:()=>records.at(-1) || null};
}
module.exports={createService};
