// Durable owned decisions without marking a player ready for the turn.
const Orders=require('./player-orders.js');
const fail=code=>{const error=new Error(code);error.code=code;throw error;};
const integer=(value,min=0)=>Number.isSafeInteger(value) && value>=min;
const record=value=>value && typeof value==='object' && !Array.isArray(value);
const response=value=>({revision:value.revision,turn:value.turn,ids:value.ids.map(id=>({kind:id.kind,tempId:id.tempId,id:id.id}))});
function revision(game,player){return game.config.networkHost.changes?.[player]?.revision || 0;}
function validateSaved(game){
 const receipts=game.config.networkHost.changes;if(receipts===undefined)return;
 if(!record(receipts) || Object.keys(receipts).length>game.config.numHumans)fail('invalid_host_orders');
 for(const [key,value] of Object.entries(receipts)){
  const player=Number(key);
  if(String(player)!==key || !integer(player,1) || !game.config.isHumanPlayer(player) || !record(value) || Object.keys(value).some(key=>!['revision','turn','postId','digest','ids'].includes(key)) ||
   !integer(value.revision,1) || !integer(value.turn,1) || value.turn>game.turn ||
   typeof value.postId!=='string' || !/^[a-f0-9]{32}$/.test(value.postId) || typeof value.digest!=='string' || !/^[a-f0-9]{64}$/.test(value.digest) ||
   !Array.isArray(value.ids) || value.ids.length>300000)fail('invalid_host_orders');
  const temporary=new Set(),assigned=new Set();for(const id of value.ids){
   if(!record(id) || Object.keys(id).some(key=>!['kind','tempId','id'].includes(key)) || !['fleet','rendezvous'].includes(id.kind) || !integer(id.tempId,1) || !integer(id.id,1) || temporary.has(id.kind+':'+id.tempId) || assigned.has(id.kind+':'+id.id))fail('invalid_host_orders');
   temporary.add(id.kind+':'+id.tempId);assigned.add(id.kind+':'+id.id);
  }
 }
}
function save(host,player,request){
 if(!record(request) || Object.keys(request).some(key=>!['revision','playerRevision','initialStateRevision','orders'].includes(key)) || !integer(request.revision) || !record(request.orders))fail('bad_orders');
 const playerRevision=request.playerRevision===undefined?0:request.playerRevision,initialStateRevision=request.initialStateRevision===undefined?0:request.initialStateRevision;
 if(!integer(playerRevision) || !integer(initialStateRevision))fail('bad_orders');
 const orders=request.orders,game=host.game,metadata=game.config.networkHost,previous=metadata.changes?.[player];
 const digest=require('crypto').createHash('sha256').update(JSON.stringify(request)).digest('hex');
 if(previous && previous.postId===orders.postId){if(previous.digest!==digest)fail('bad_orders');return response(previous);}
 if(orders.gameId!==metadata.id)fail('wrong_game');if(orders.turn!==game.turn)fail('wrong_turn');
 if(!game.players[player] || game.players[player].isComputer)fail('bad_orders');
 if(!game.canAdvanceTurns())fail('game_complete');
 const current=revision(game,player);if(request.revision!==current || current===Number.MAX_SAFE_INTEGER || playerRevision!==(metadata.playerStateRevision || 0) || initialStateRevision!==(metadata.initialStateRevision || 0))fail('stale_orders');
 host.transact(staged=>{
  const ids=Orders.apply(staged,player,orders);
  staged.config.networkHost.changes={...(staged.config.networkHost.changes || {}),[player]:{revision:current+1,turn:orders.turn,postId:orders.postId,digest,ids}};
 });
 return response(host.game.config.networkHost.changes[player]);
}
module.exports={revision,validateSaved,save};
