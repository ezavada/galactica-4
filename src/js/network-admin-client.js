// Administrator transport is separate from ordinary player ownership/posting.
const Network=require('./network-client.js'),State=require('./client-state.js'),HTTP=require('./network-http.js'),{protocol}=require('./network-protocol.js'),Admin=require('./admin-password.js');
const fail=HTTP.failure,hex=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function validateStatus(input){
 if(!input || input.protocol!==protocol || input.role!=='administrator' || !hex(input.gameId))throw fail('network_bad_response');
 const info=Network.validateInfo(input.info);if(info.gameId!==input.gameId)throw fail('wrong_game');
 const data=input.administration;if(!data || typeof data!=='object' || Array.isArray(data) || typeof data.complete!=='boolean')throw fail('network_bad_response');
 let settings,admission;try{settings=require('./host-settings.js').validate(data.settings);admission=require('./host-admission.js').validate(data.admission);}catch(e){throw fail('network_bad_response');}
 for(const key of ['settingsRevision','playersRevision','admissionRevision'])if(!Number.isSafeInteger(data[key]) || data[key]<0)throw fail('network_bad_response');
 const total=info.humans+info.computers,humanIds=info.slots.map(p=>p.player);
 if(!Array.isArray(data.players) || data.players.length!==total || !Array.isArray(data.pending) || data.pending.length>info.humans)throw fail('network_bad_response');
 const players=data.players.map((p,i)=>{if(!p || p.player!==i+1 || typeof p.name!=='string' || p.name.length>4096 || ['isComputer','isAlive','assigned','online'].some(k=>typeof p[k]!=='boolean') || p.isComputer===humanIds.includes(p.player) || p.isComputer && (!p.assigned || p.online))throw fail('network_bad_response');return {player:p.player,name:p.name,isComputer:p.isComputer,isAlive:p.isAlive,assigned:p.assigned,online:p.online};});
 let initialState;
 if(data.initialState!==undefined){
  if(!Array.isArray(data.initialState) || !Number.isSafeInteger(data.initialStateRevision) || data.initialStateRevision<0)throw fail('network_bad_response');
  const ids=new Set();initialState=data.initialState.map(s=>{if(!s || !Number.isSafeInteger(s.id) || s.id<1 || ids.has(s.id) || typeof s.name!=='string' || s.name.length>4096 || !Number.isSafeInteger(s.owner) || s.owner<0 || s.owner>total || !Number.isFinite(s.population) || s.population<0 || !Number.isSafeInteger(s.technology) || s.technology<0 || s.shipType!==null && !require('./initial-state-edit.js').types.includes(s.shipType))throw fail('network_bad_response');ids.add(s.id);return {id:s.id,name:s.name,owner:s.owner,population:s.population,technology:s.technology,shipType:s.shipType};});
 }
 const seen=new Set(),pending=data.pending.map(p=>{const source=p && players[p.player-1];if(!source || source.isComputer || !source.assigned || !source.isAlive || p.name!==source.name || seen.has(p.player))throw fail('network_bad_response');seen.add(p.player);return {player:p.player,name:p.name};});
 try{require('./client-clock.js').receive(input.info.clock,{config:settings,turn:info.turn,isGameOver:data.complete});}catch(e){throw fail('network_bad_response');}
 info.clock={};for(const key of ['turn','paused','running','secondsRemaining','limitSeconds'])if(input.info.clock[key]!==undefined)info.clock[key]=input.info.clock[key];
 return {protocol,role:'administrator',gameId:input.gameId,info,administration:{...(initialState===undefined?{}:{initialState,initialStateRevision:data.initialStateRevision}),complete:data.complete,settings,settingsRevision:data.settingsRevision,admission,admissionRevision:data.admissionRevision,players,playersRevision:data.playersRevision,pending}};
}
class NetworkAdminClient extends Network.NetworkClient {
 constructor(address,options){super(address,options);this.role='administrator';this.administration=null;this.actionPromise=null;}
 descriptor(){return this.identity?{address:this.address,role:'administrator',gameId:this.identity.gameId}:null;}
 install(fresh){if(this.model && fresh.clientGameId===this.model.clientGameId){if(fresh.turn<this.model.turn)throw fail('stale_server_state');Network.preservePresentation(this.model,fresh);}this.model=fresh;return fresh;}
 async view(session){const input=await this.send('/admin/view',{token:session.token}),status=validateStatus(input);if(status.gameId!==session.gameId)throw fail('wrong_game');let model;try{model=State.restoreAdmin(input.state);}catch(e){throw fail('invalid_player_state');}if(model.clientGameId!==session.gameId || model.turn!==status.info.turn || model.isGameOver!==status.administration.complete)throw fail('network_bad_response');return {status,model};}
 async connect({password='',gameId}={}){
  if(this.session)throw fail('already_connected');if(this.connecting)throw fail('network_busy');if(!Admin.validPassword(password) || !password || gameId!==undefined && !hex(gameId))throw fail('bad_login_request');
  const generation=++this.generation;this.connecting=true;this.status='connecting';let accepted=null;const current=()=>{if(generation!==this.generation)throw fail('network_cancelled');};
  try{const info=await this.inspect();current();if(gameId!==undefined && info.gameId!==gameId)throw fail('wrong_game');const reply=await this.send('/admin/login',{method:'POST',body:{protocol,gameId:info.gameId,password}});if(!reply || reply.protocol!==protocol || reply.role!=='administrator' || reply.gameId!==info.gameId || !hex(reply.token))throw fail('network_bad_response');accepted={token:reply.token,gameId:reply.gameId,role:'administrator'};current();
   const view=await this.view(accepted);current();const model=this.install(view.model);this.identity={role:'administrator',gameId:accepted.gameId};this.session=accepted;this.administration=view.status;this.status='connected';return model;
  }catch(e){if(accepted && (!this.session || this.session.token!==accepted.token))try{await this.send('/admin/logout',{method:'POST',token:accepted.token,body:{},timeout:1000});}catch(ignored){}if(generation===this.generation)this.status='connection_lost';throw e;}
  finally{if(generation===this.generation)this.connecting=false;}
 }
 refresh(){
  if(!this.session)return Promise.reject(fail('not_logged_in'));if(this.actionPromise)return this.actionPromise.then(()=>this.model);if(this.refreshPromise)return this.refreshPromise;const session=this.session,generation=this.generation;
  const operation=(async()=>{try{const view=await this.view(session);if(generation!==this.generation || this.session!==session)throw fail('network_cancelled');this.administration=view.status;const model=this.install(view.model);this.status='connected';return model;}catch(e){if(generation===this.generation && this.session===session){this.status='connection_lost';if(e.code==='not_logged_in')this.session=null;}throw e;}})();
  this.refreshPromise=operation;operation.then(()=>{if(this.refreshPromise===operation)this.refreshPromise=null;},()=>{if(this.refreshPromise===operation)this.refreshPromise=null;});return operation;
 }
 act(value){
  if(!this.session)return Promise.reject(fail('not_logged_in'));if(this.actionPromise)return Promise.reject(fail('network_busy'));const session=this.session,generation=this.generation;
  const current=()=>{if(generation!==this.generation || this.session!==session)throw fail('network_cancelled');};
  const operation=(async()=>{try{if(this.refreshPromise)await this.refreshPromise;current();const result=validateStatus(await this.send('/admin/action',{method:'POST',token:session.token,body:value}));current();if(result.gameId!==session.gameId)throw fail('wrong_game');const view=await this.view(session);current();this.install(view.model);this.administration=view.status;this.status='connected';return this.administration;}
   catch(e){if(generation===this.generation && this.session===session && e.code==='not_logged_in'){this.session=null;this.status='connection_lost';}throw e;}})();
  this.actionPromise=operation;operation.then(()=>{if(this.actionPromise===operation)this.actionPromise=null;},()=>{if(this.actionPromise===operation)this.actionPromise=null;});return operation;
 }

 post(){return Promise.reject(fail('invalid_admin_action'));}
 async disconnect({keepView=false}={}){const session=this.session;++this.generation;this.session=null;this.status='idle';this.connecting=false;this.refreshPromise=null;this.actionPromise=null;for(const handle of this.pending)handle.cancel();if(!keepView){this.model=null;this.administration=null;}if(!session)return false;try{await this.send('/admin/logout',{method:'POST',token:session.token,body:{},timeout:1000});return true;}catch(e){return false;}}
 async rejoin(password=''){if(!this.identity)throw fail('not_logged_in');const identity=this.identity,closing=this.disconnect({keepView:true}),generation=this.generation;await closing;if(generation!==this.generation)throw fail('network_cancelled');return this.connect({password,gameId:identity.gameId});}
}
module.exports={NetworkAdminClient,validateStatus};
