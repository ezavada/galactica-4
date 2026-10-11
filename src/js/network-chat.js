// Chat has its own history/cancellation state; polling never replaces game orders.
const {protocol}=require('./network-protocol.js'),HTTP=require('./network-http.js'),Names=require('./player-name.js');
const maxText=256,maxHistory=1000;
const fail=HTTP.failure;
function validText(text){return typeof text==='string' && text.trim().length>0 && Array.from(text).length<=maxText && !/[\u0000-\u001f\u007f-\u009f]/.test(text);}
function validate(input,session){
 if(!input || input.protocol!==protocol || input.gameId!==session.gameId || !Number.isSafeInteger(input.cursor) || input.cursor<0 || !Array.isArray(input.messages) || input.messages.length>maxHistory || !Array.isArray(input.players) || input.players.length>99 || typeof input.administrator!=='boolean')throw fail('network_bad_response');
 const viewer=session.role==='administrator'?-2:session.player;let previous=0;
 const messages=input.messages.map(row=>{
  if(!row || !Number.isSafeInteger(row.id) || row.id<=previous || row.id>input.cursor || typeof row.requestId!=='string' || !/^[a-f0-9]{32}$/.test(row.requestId) || !Number.isInteger(row.from) || !(row.from===-2 || row.from>=1 && row.from<=99) || !Number.isInteger(row.to) || !(row.to===-2 || row.to>=0 && row.to<=99) || row.to!==0 && row.to!==viewer && row.from!==viewer || !Names.validName(row.name) || !validText(row.text) || !Number.isSafeInteger(row.turn) || row.turn<1 || typeof row.offline!=='boolean')throw fail('network_bad_response');
  previous=row.id;const {id,requestId,from,to,name,text,turn,offline}=row;return {id,requestId,from,to,name,text,turn,offline};
 });
 let last=0;const players=input.players.map(p=>{if(!p || !Number.isInteger(p.player) || p.player<=last || p.player>99 || typeof p.assigned!=='boolean' || typeof p.online!=='boolean' || p.online && !p.assigned || (p.assigned?!Names.validName(p.name):p.name!==''))throw fail('network_bad_response');last=p.player;return {player:p.player,name:p.name,assigned:p.assigned,online:p.online};});
 return {cursor:input.cursor,messages,players,administrator:input.administrator};
}
class NetworkChat {
 constructor(client){this.client=client;this.cursor=0;this.messages=[];this.players=[];this.administrator=false;this.refreshPromise=null;this.sendPromise=null;this.pending=null;this.onChange=null;this.acknowledged=new Set();this.ackPromise=null;}
 install(value){
  if(value.cursor<this.cursor)throw fail('network_bad_response');
  const previous=this.cursor;this.cursor=value.cursor;this.messages=value.messages;this.players=value.players;this.administrator=value.administrator;
  if(this.pending){const accepted=this.messages.find(row=>row.requestId===this.pending.body.requestId && row.from===(this.client.session.role==='administrator'?-2:this.client.session.player));if(accepted)this.pending.accepted=accepted;}
  const incoming=this.messages.filter(row=>row.id>previous);if(this.onChange)this.onChange(incoming);return incoming;
 }
 refresh(){
  if(this.refreshPromise)return this.refreshPromise;const client=this.client,session=client.session,generation=client.generation;
  if(!session)return Promise.reject(fail('not_logged_in'));
  const operation=(async()=>{const data=await client.send('/chat',{token:session.token,limit:2*1024*1024});if(generation!==client.generation || session!==client.session)throw fail('network_cancelled');return this.install(validate(data,session));})();
  this.refreshPromise=operation;operation.then(()=>{if(this.refreshPromise===operation)this.refreshPromise=null;},()=>{if(this.refreshPromise===operation)this.refreshPromise=null;});return operation;
 }
 send(to,text){
  if(this.sendPromise)return this.sendPromise;const client=this.client,session=client.session,generation=client.generation;
  if(!session)return Promise.reject(fail('not_logged_in'));if(!validText(text) || !Number.isInteger(to) || !(to===-2 || to>=0 && to<=99))return Promise.reject(fail('bad_chat'));
  if(this.pending && (this.pending.body.to!==to || this.pending.body.text!==text))return Promise.reject(fail('network_busy'));
  if(!this.pending){let requestId;if(typeof window!=='undefined'){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);requestId=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}else requestId=require('crypto').randomBytes(16).toString('hex');this.pending={body:{gameId:session.gameId,requestId,to,text},accepted:null};}
  const pending=this.pending;
  const operation=(async()=>{
   try{let row=pending.accepted;if(!row)row=await client.send('/chat',{method:'POST',token:session.token,body:pending.body,limit:4096});if(generation!==client.generation || session!==client.session)throw fail('network_cancelled');
    const sender=session.role==='administrator'?-2:session.player;
    const checked=validate({protocol,gameId:session.gameId,cursor:row.id,messages:[row],players:[],administrator:false},session).messages[0];
    if(checked.requestId!==pending.body.requestId || checked.from!==sender || checked.to!==to || checked.text!==text)throw fail('network_bad_response');
    pending.accepted=checked;if(this.refreshPromise)await this.refreshPromise;await this.refresh();if(generation!==client.generation || session!==client.session)throw fail('network_cancelled');this.pending=null;return checked;
   }catch(error){if(this.pending===pending && ['bad_chat','wrong_game','chat_recipient_unavailable','chat_history_full'].includes(error.code))this.pending=null;throw error;}
  })();
  this.sendPromise=operation;operation.then(()=>{if(this.sendPromise===operation)this.sendPromise=null;},()=>{if(this.sendPromise===operation)this.sendPromise=null;});return operation;
 }
 acknowledge(eventIds){
  if(this.ackPromise)return this.ackPromise;const client=this.client,session=client.session,generation=client.generation;
  if(!session)return Promise.reject(fail('not_logged_in'));const ids=eventIds.filter(id=>!this.acknowledged.has(id)).slice(0,100);if(!ids.length)return Promise.resolve(true);
  const operation=(async()=>{const input=await client.send('/chat/ack',{method:'POST',token:session.token,body:{gameId:session.gameId,eventIds:ids},limit:4096});if(generation!==client.generation || session!==client.session)throw fail('network_cancelled');if(input.gameId!==session.gameId || !Array.isArray(input.eventIds) || JSON.stringify(input.eventIds)!==JSON.stringify(ids))throw fail('network_bad_response');for(const id of ids)this.acknowledged.add(id);while(this.acknowledged.size>2000)this.acknowledged.delete(this.acknowledged.values().next().value);return true;})();
  this.ackPromise=operation;operation.then(()=>{if(this.ackPromise===operation)this.ackPromise=null;},()=>{if(this.ackPromise===operation)this.ackPromise=null;});return operation;
 }
 detach(){this.refreshPromise=null;this.sendPromise=null;this.onChange=null;}
}
module.exports={NetworkChat,validate,validText,maxText,maxHistory};
