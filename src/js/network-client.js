// Live client transport. Tokens stay in memory; saved connection descriptors
// contain only the endpoint, game ID and player identity.
const State=require('./client-state.js'),Names=require('./player-name.js');
const HTTP=require('./network-http.js'),{protocol}=require('./network-protocol.js');
const fail=HTTP.failure,hex=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function normalizeAddress(address){
 if(typeof address!=='string' || !address.trim() || /[\s]/.test(address.trim()))throw fail('invalid_host_address');
 let url;try{url=new URL(address.includes('://')?address.trim():'http://'+address.trim());}catch(error){throw fail('invalid_host_address');}
 if(!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw fail('invalid_host_address');
 return url.origin;
}
function validateInfo(data){
 if(!data || typeof data!=='object' || data.protocol!==protocol)throw fail('bad_protocol');
 const integer=(n,min,max)=>Number.isSafeInteger(n) && n>=min && n<=max;
 if(!hex(data.gameId) || typeof data.title!=='string' || data.title.length>4096 || !integer(data.turn,1,Number.MAX_SAFE_INTEGER) || !integer(data.humans,0,99) || !integer(data.computers,0,99) || data.humans+data.computers<1 || data.humans+data.computers>99 || !Array.isArray(data.slots) || data.slots.length!==data.humans)throw fail('network_bad_response');
 const slots=data.slots.map((slot,index)=>{
  if(!slot || slot.player!==index+1 || !['open','occupied'].includes(slot.status) || slot.status==='occupied' && (!Names.validName(slot.name) || typeof slot.online!=='boolean'))throw fail('network_bad_response');
  return {player:slot.player,status:slot.status,...(slot.status==='occupied'?{name:slot.name,online:slot.online}:{})};
 });
 const names=slots.filter(s=>s.status==='occupied').map(s=>s.name);if(new Set(names).size!==names.length)throw fail('network_bad_response');
 for(const [key,min,max] of [['sectorSize',1,5],['density',1,10],['skill',1,5],['advantage',-3,3],['maxTimePerTurn',0,Number.MAX_SAFE_INTEGER]])if(data[key]!==undefined && !integer(data[key],min,max))throw fail('network_bad_response');
 for(const key of ['fastGame','fogOfWar','endEarly'])if(data[key]!==undefined && typeof data[key]!=='boolean')throw fail('network_bad_response');
 if(data.version!==undefined && (typeof data.version!=='string' || data.version.length>128))throw fail('network_bad_response');
 const info={protocol,gameId:data.gameId,title:data.title,turn:data.turn,humans:data.humans,computers:data.computers,slots};
 for(const key of ['version','sectorSize','density','fastGame','fogOfWar','skill','advantage','maxTimePerTurn','endEarly'])if(data[key]!==undefined)info[key]=data[key];
 return info;
}
function validateLogin(data,info,name){
 if(!data || data.protocol!==protocol)throw fail('bad_protocol');
 if(data.gameId!==info.gameId)throw fail('wrong_game');
 if(!hex(data.token) || data.name!==name || !Number.isSafeInteger(data.player) || data.player<1 || data.player>info.humans || !Number.isSafeInteger(data.turn) || data.turn<1)throw fail('network_bad_response');
 return {token:data.token,name,player:data.player,gameId:data.gameId};
}
function preservePresentation(old,fresh){
 for(const key of ['showGrid','showNebula','showShips','showAllCourses','showCourierCourses','showScannerRanges','showMapNames','showEnemyEvents','mapDisplayMode'])fresh[key]=old[key];
 const camera=old.display && old.display.camera;
 fresh.savedCamera=camera?{zoom:camera.zoom,panX:camera.panX,panY:camera.panY}:old.savedCamera || null;fresh.restoredFromSave=true;
 if(old.selectedObject){const lists=['stars','allShips','allFleets','allRendezvous'];const key=lists.find(key=>old[key].includes(old.selectedObject));fresh.selectedObject=key?fresh[key].find(e=>e.id===old.selectedObject.id) || null:null;}
 const handled=new Set(old.eventLog.filter(e=>e.handled).map(e=>e.id));
 for(const event of fresh.eventLog)if(handled.has(event.id))event.handled=true;
 for(const entry of fresh.attention.queue)if(entry.event && entry.event.handled)entry.handled=true;
}
class NetworkClient {
 constructor(address,{timeout=8000,request=HTTP.request}={}){
  this.address=normalizeAddress(address);if(!Number.isInteger(timeout) || timeout<1 || timeout>60000)throw fail('invalid_network_timeout');
  this.timeout=timeout;this.request=request;this.session=null;this.identity=null;this.model=null;this.status='idle';this.connecting=false;this.generation=0;this.pending=new Set();this.refreshPromise=null;this.postPromise=null;this.pendingPost=null;
 }
 get connected(){return this.status==='connected' && !!this.session;}
 descriptor(){return this.identity?{address:this.address,...this.identity}:null;}
 async send(path,options={}){
  const handle=this.request(this.address,{path,timeout:this.timeout,...options});this.pending.add(handle);
  try{return await handle.promise;}finally{this.pending.delete(handle);}
 }
 async inspect(){return validateInfo(await this.send('/info'));}
 install(fresh,{discardOrders=false}={}){
  const old=this.model;
  if(this.pendingPost && (fresh.turn!==this.pendingPost.turn || fresh.clientTurnPosted)){this.pendingPost=null;fresh.clientPosting=false;}
  if(old && old.clientGameId===fresh.clientGameId && old.clientPlayerNum===fresh.clientPlayerNum){
   if(fresh.turn<old.turn)throw fail('stale_server_state');
   if(fresh.turn===old.turn && fresh.clientTurnPosted===old.clientTurnPosted && fresh.isGameOver===old.isGameOver && !discardOrders){
    const changed=require('./host-settings.js').fields.some(k=>old.config[k]!==fresh.config[k]);
    if(changed){if(!old.clientTurnPosted)require('./client-settings-refresh.js').preserveOrders(old,fresh);preservePresentation(old,fresh);this.model=fresh;return fresh;}
    old.clientClock=fresh.clientClock;
    old.remoteComparisons=fresh.remoteComparisons;
    for(let i=1;i<old.players.length;i++){old.players[i].name=fresh.players[i].name;old.players[i].isAlive=fresh.players[i].isAlive;old.players[i].numPiecesRemaining=fresh.players[i].numPiecesRemaining;}
    return old;
   }
   preservePresentation(old,fresh);
  }
  this.model=fresh;return fresh;
 }
 state(data,session){
  let model;try{model=State.restore(data);}catch(error){throw fail('invalid_player_state');}
  if(model.clientGameId!==session.gameId)throw fail('wrong_game');
  if(model.clientPlayerNum!==session.player)throw fail('wrong_player');
  return model;
 }
 async connect({name,password='',mode='join',gameId}={}){
  if(this.session)throw fail('already_connected');if(this.connecting)throw fail('network_busy');
  if(!Names.validName(name) || typeof password!=='string' || Array.from(password).length>64 || /[\u0000-\u001f\u007f-\u009f]/.test(password) || !['join','rejoin'].includes(mode) || gameId!==undefined && !hex(gameId))throw fail('bad_login_request');
  const generation=++this.generation;this.connecting=true;this.status='connecting';let accepted=null;
  const current=()=>{if(generation!==this.generation)throw fail('network_cancelled');};
  try{
   const info=await this.inspect();current();if(gameId!==undefined && gameId!==info.gameId)throw fail('wrong_game');
   accepted=validateLogin(await this.send('/login',{method:'POST',body:{protocol,name,password,mode,gameId:info.gameId}}),info,name);current();this.identity={name,player:accepted.player,gameId:accepted.gameId};
   const fresh=this.state(await this.send('/state',{token:accepted.token}),accepted);current();
   const model=this.install(fresh);this.session=accepted;this.identity={name,player:accepted.player,gameId:accepted.gameId};this.status='connected';return model;
  }catch(error){
   if(accepted && (!this.session || this.session.token!==accepted.token))try{await this.send('/logout',{method:'POST',token:accepted.token,timeout:1000});}catch(ignored){}
   if(generation===this.generation)this.status='connection_lost';throw error;
  }finally{if(generation===this.generation)this.connecting=false;}
 }
 post(){
  if(this.postPromise)return this.postPromise;if(!this.session || !this.model)return Promise.reject(fail('not_logged_in'));
  if(this.model.clientTurnPosted)return Promise.reject(fail('already_posted'));
  const generation=this.generation,session=this.session;this.model.clientPosting=true;
  const operation=(async()=>{
   try{
    if(this.refreshPromise)await this.refreshPromise;
    if(generation!==this.generation || session!==this.session)throw fail('network_cancelled');
    if(!this.pendingPost){
     let id;if(typeof window!=='undefined'){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);id=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}else id=require('crypto').randomBytes(16).toString('hex');
     this.pendingPost=require('./player-orders.js').snapshot(this.model,id);
    }
    this.model.clientPosting=true;
    const data=await this.send('/orders',{method:'POST',token:session.token,body:this.pendingPost});
    if(generation!==this.generation || session!==this.session)throw fail('network_cancelled');
    const fresh=this.state(data,session),created=this.pendingPost.entities.filter(row=>row.created),ids=data.orderIds;
    if(fresh.turn<this.pendingPost.turn || fresh.turn===this.pendingPost.turn && !fresh.clientTurnPosted)throw fail('network_bad_response');
    if(!Array.isArray(ids) || ids.length!==created.length)throw fail('network_bad_response');
    const seen=new Set(),assigned=new Set();for(const row of ids){const match=created.find(e=>e.kind===row.kind && e.id===row.tempId);if(!match || !Number.isSafeInteger(row.id) || row.id<1 || seen.has(row.kind+':'+row.tempId) || assigned.has(row.kind+':'+row.id))throw fail('network_bad_response');seen.add(row.kind+':'+row.tempId);assigned.add(row.kind+':'+row.id);}
    const remaps=ids.map(row=>{const lists={fleet:'allFleets',rendezvous:'allRendezvous'};return {row,entity:this.model[lists[row.kind]].find(e=>e.owner===this.model.clientPlayerNum && e.id===row.tempId)};});
    for(const {row,entity} of remaps)if(entity)entity.id=row.id;
    this.pendingPost=null;this.model.clientPosting=false;this.status='connected';return this.install(fresh,{discardOrders:true});
   }catch(error){
    if(generation===this.generation && session===this.session){
     if(['bad_orders','orders_too_large','wrong_game'].includes(error.code)){this.pendingPost=null;this.model.clientPosting=false;}
     else if(['wrong_turn','already_posted','game_complete'].includes(error.code)){this.pendingPost=null;this.model.clientPosting=false;}
     else{if(!this.pendingPost && this.model)this.model.clientPosting=false;this.status='connection_lost';if(error.code==='not_logged_in')this.session=null;}
    }throw error;
   }
  })();
  this.postPromise=operation;operation.then(()=>{if(this.postPromise===operation)this.postPromise=null;},()=>{if(this.postPromise===operation)this.postPromise=null;});return operation;
 }
 refresh(options={}){
  if(!this.session)return Promise.reject(fail('not_logged_in'));if(this.postPromise)return this.postPromise;if(this.refreshPromise)return this.refreshPromise;
  const generation=this.generation,session=this.session;
  const operation=(async()=>{
   try{const fresh=this.state(await this.send('/state',{token:session.token}),session);
    if(generation!==this.generation || this.session!==session)throw fail('network_cancelled');
    const model=this.install(fresh,options);this.status='connected';return model;
   }catch(error){if(generation===this.generation && this.session===session){this.status='connection_lost';if(error.code==='not_logged_in')this.session=null;}throw error;}
  })();
  this.refreshPromise=operation;
  operation.then(()=>{if(this.refreshPromise===operation)this.refreshPromise=null;},()=>{if(this.refreshPromise===operation)this.refreshPromise=null;});return operation;
 }
 async disconnect({keepView=false}={}){
  const session=this.session;++this.generation;this.session=null;this.status='idle';this.connecting=false;this.refreshPromise=null;
  for(const handle of this.pending)handle.cancel();if(!keepView)this.model=null;
  if(!session)return false;try{await this.send('/logout',{method:'POST',token:session.token,timeout:1000});return true;}catch(error){return false;}
 }
 async rejoin(password=''){
  const identity=this.identity;if(!identity)throw fail('player_not_found');
  const closing=this.disconnect({keepView:true}),generation=this.generation;await closing;
  if(generation!==this.generation)throw fail('network_cancelled');return this.connect({name:identity.name,password,mode:'rejoin',gameId:identity.gameId});
 }
}
module.exports={NetworkClient,normalizeAddress,validateInfo,validateLogin,preservePresentation};
