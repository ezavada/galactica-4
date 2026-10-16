// Authenticated chat routing and durable offline player reports.
const crypto=require('crypto'),Names=require('./player-name.js');
const {protocol}=require('./network-protocol.js');
const administrator=-2,all=0,maximumText=256,maximumHistory=1000;
const hex=value=>typeof value==='string' && /^[a-f0-9]{32}$/.test(value);
const keyValid=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
function fail(code){const error=new Error(code);error.code=code;throw error;}
function validText(text){return typeof text==='string' && text.trim().length>0 && Array.from(text).length<=maximumText && !/[\u0000-\u001f\u007f-\u009f]/.test(text);}
function claimKey(game,player){
 const host=game.config.networkHost;
 const claim=player===administrator?host.admin:host.players[game.config.getHumanPlayerSlots().indexOf(player)];
 return claim?crypto.createHash('sha256').update(String(player)+':'+claim.salt).digest('hex'):player===administrator?null:crypto.createHash('sha256').update(host.id+':pending:'+player).digest('hex');
}
function validateSaved(game){
 const value=game.config.networkHost.chat;if(value===undefined)return;
 if(!value || !Number.isSafeInteger(value.nextId) || value.nextId<0 || !Array.isArray(value.messages) || value.messages.length>maximumHistory)fail('invalid_host_chat');
 let previous=0;
 for(const row of value.messages){
  if(!row || !Number.isSafeInteger(row.id) || row.id<=previous || row.id>value.nextId || !hex(row.requestId) || !keyValid(row.senderKey) || !Number.isInteger(row.from) || !(row.from===administrator || game.config.isHumanPlayer(row.from)) || !Number.isInteger(row.to) || !(row.to===all || row.to===administrator || game.config.isHumanPlayer(row.to)) || !Names.validName(row.name) || !validText(row.text) || !Number.isSafeInteger(row.turn) || row.turn<1 || !Array.isArray(row.audience) || row.audience.length>100 || !row.audience.includes(row.senderKey) || row.to===all && row.offline || row.audience.some(k=>!keyValid(k)) || new Set(row.audience).size!==row.audience.length || typeof row.offline!=='boolean')fail('invalid_host_chat');
  previous=row.id;
 }
}
function publicMessage(row){const {id,requestId,from,to,name,text,turn,offline}=row;return {id,requestId,from,to,name,text,turn,offline};}
function bindClaim(game,player,previousKey){
 const key=claimKey(game,player),host=game.config.networkHost;
 if(host.chat)host.chat={...host.chat,messages:host.chat.messages.map(row=>row.to===player && row.offline && row.audience.includes(previousKey)?{...row,audience:row.audience.map(value=>value===previousKey?key:value)}:row)};
 game.eventLog=game.eventLog.map(event=>event.recipient===player && event.playerMessage?.claim===previousKey?{...event,playerMessage:{...event.playerMessage,claim:key}}:event);
}
class HostChat {
 constructor(host){this.host=host;validateSaved(host.game);}
 authenticate(token){
  if(this.host.admin.sessions.has(token)){this.host.admin.authenticate(token);return administrator;}
  return this.host.login.authenticate(token).player;
 }
 online(player){return player===administrator?this.host.admin.enabled && this.host.admin.sessions.size>0:!!this.host.game.players[player].isLoggedIn;}
 view(token){
  const player=this.authenticate(token),game=this.host.game,key=claimKey(game,player),value=game.config.networkHost.chat || {nextId:0,messages:[]};
  return {protocol,gameId:game.config.networkHost.id,cursor:value.nextId,messages:value.messages.filter(row=>row.audience.includes(key)).map(publicMessage),players:this.host.login.info().map(s=>({player:s.player,name:s.name || '',assigned:s.status==='occupied',online:!!s.online})),administrator:this.online(administrator)};
 }
 send(token,input){
  const from=this.authenticate(token),host=this.host,game=host.game;
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==4 || Object.keys(input).some(k=>!['gameId','requestId','to','text'].includes(k)) || !hex(input.requestId) || !validText(input.text) || !Number.isInteger(input.to))fail('bad_chat');
  if(input.gameId!==game.config.networkHost.id)fail('wrong_game');
  if(input.to!==all && !(input.to===administrator?host.admin.enabled:game.config.isHumanPlayer(input.to) && claimKey(game,input.to)))fail('chat_recipient_unavailable');
  const senderKey=claimKey(game,from),value=game.config.networkHost.chat || {nextId:0,messages:[]};
  const existing=value.messages.find(row=>row.senderKey===senderKey && row.requestId===input.requestId);
  if(existing){if(existing.to!==input.to || existing.text!==input.text)fail('bad_chat');return publicMessage(existing);}
  if(value.nextId===Number.MAX_SAFE_INTEGER)fail('chat_history_full');
  const audience=new Set([senderKey]);
  if(input.to===all){for(const player of game.config.getHumanPlayerSlots())if(this.online(player)){const key=claimKey(game,player);if(key)audience.add(key);}if(this.online(administrator))audience.add(claimKey(game,administrator));}
  else audience.add(claimKey(game,input.to));
  const offline=input.to!==all && !this.online(input.to);
  if(offline && input.to!==administrator && game.eventLog.filter(e=>e.playerMessage && !e.handled).length>=maximumHistory)fail('chat_history_full');
  const row={id:value.nextId+1,requestId:input.requestId,from,to:input.to,name:from===administrator?'Administrator':game.players[from].name,text:input.text,turn:game.turn,offline,senderKey,audience:[...audience]};
  host.transact(staged=>{
   staged.config.networkHost.chat={nextId:row.id,messages:[...value.messages,row].slice(-maximumHistory)};
   if(offline && input.to!==administrator){
    const event=staged.recordEvent(row.name,row.text,{type:'playerMessage',recipient:input.to});
    event.playerMessage={sender:from,name:row.name,text:row.text,claim:claimKey(staged,input.to)};
   }
  });
  return publicMessage(row);
 }
 acknowledge(token,input){
  const player=this.authenticate(token),host=this.host;
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==2 || !Object.hasOwn(input,'gameId') || !Array.isArray(input.eventIds) || input.eventIds.length>100 || input.eventIds.some(id=>!Number.isSafeInteger(id) || id<1) || new Set(input.eventIds).size!==input.eventIds.length)fail('bad_chat');
  if(input.gameId!==host.game.config.networkHost.id)fail('wrong_game');
  const key=claimKey(host.game,player),ids=new Set(input.eventIds);
  if(host.game.eventLog.some(e=>ids.has(e.id) && e.recipient===player && e.playerMessage?.claim===key && !e.handled))host.transact(game=>{for(const event of game.eventLog)if(ids.has(event.id) && event.recipient===player && event.playerMessage?.claim===key)event.handled=true;});
  return {gameId:input.gameId,eventIds:input.eventIds};
 }
 handle(req,res){
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  const respond=(status,body)=>{res.writeHead(status,headers);res.end(body===undefined?'':JSON.stringify(body));};
  const token=()=>typeof req.headers?.authorization==='string' && req.headers.authorization.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
  if(req.method==='OPTIONS'){respond(204);return;}
  try{this.authenticate(token());}catch(error){respond(401,{error:error.code || 'not_logged_in'});return;}
  if(req.url==='/chat/ack' && req.method!=='POST'){respond(405,{error:'method_not_allowed'});return;}
  if(req.method==='GET'){try{respond(200,this.view(token()));}catch(error){respond(error.code==='not_logged_in'?401:500,{error:error.code || 'host_state_failed'});}return;}
  if(req.method!=='POST'){respond(405,{error:'method_not_allowed'});return;}
  let body='',bytes=0,answered=false;req.setEncoding('utf8');req.on('error',()=>{answered=true;});
  req.on('data',part=>{bytes+=Buffer.byteLength(part);if(bytes>4096){if(!answered){answered=true;respond(413,{error:'chat_too_large'});}return;}body+=part;});
  req.on('end',()=>{if(answered)return;let input;try{input=JSON.parse(body);}catch(error){respond(400,{error:'bad_chat'});return;}
   try{respond(200,req.url==='/chat/ack'?this.acknowledge(token(),input):this.send(token(),input));}catch(error){const status=['not_logged_in','admin_ejected'].includes(error.code)?401:error.code==='bad_chat'?400:['wrong_game','chat_recipient_unavailable','chat_history_full'].includes(error.code)?409:500;respond(status,{error:status===500?'host_save_failed':error.code});}
  });
 }
}
module.exports={HostChat,claimKey,bindClaim,validateSaved,validText,publicMessage,administrator,all,maximumText,maximumHistory};
