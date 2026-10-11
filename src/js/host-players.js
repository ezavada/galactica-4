// Local host ownership operations matching v3's Change Player dialog.
const Names=require('./player-name.js'),Game=require('./game.js');
function failure(code){const e=new Error(code);e.code=code;throw e;}
function revision(game){return game.config.networkHost.playersRevision || 0;}
function describe(game){const slots=game.config.getHumanPlayerSlots();return game.players.slice(1).map(p=>({player:p.playerNum,name:p.name,isComputer:p.isComputer,isAlive:p.isAlive,assigned:p.isComputer || !!game.config.networkHost.players[slots.indexOf(p.playerNum)],online:p.isLoggedIn}));}
function apply(game,value){
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!['action','player','name'].includes(k)) || !['human','computer','remove','rename','kill','eject'].includes(value.action) || !Number.isInteger(value.player) || value.player<1 || value.player>game.config.totalPlayers)failure('invalid_host_player');
 const p=game.players[value.player],c=game.config,h=c.networkHost,slots=c.getHumanPlayerSlots(),index=slots.indexOf(value.player),claim=index>=0?h.players[index]:null;
 if(value.action!=='eject' && (h.playerStateRevision || 0)===Number.MAX_SAFE_INTEGER)failure('invalid_host_player');
 const role=value.action==='human' || value.action==='computer',named=value.action==='rename' || value.action==='computer';
 if(!named && Object.hasOwn(value,'name'))failure('invalid_host_player');
 if(named && (!Names.validName(value.name) || game.players.slice(1).some(other=>other!==p && other.name===value.name && (other.isComputer || h.players[slots.indexOf(other.playerNum)]))))failure('invalid_host_player');
 if(value.action==='human' && !p.isComputer || value.action==='computer' && p.isComputer || value.action==='remove' && (p.isComputer || !claim) || value.action==='rename' && !p.isComputer && !claim || value.action==='kill' && !p.isAlive || value.action==='eject' && (p.isComputer || !p.isLoggedIn || !claim))failure('invalid_host_player');
 if(role){
  const claims=new Map(slots.map((id,i)=>[id,h.players[i]]));p.isComputer=value.action==='computer';p.isHuman=!p.isComputer;p.isLoggedIn=false;p.lastTurnPosted=0;
  c.humanPlayerSlots=game.players.slice(1).filter(p=>!p.isComputer).map(p=>p.playerNum);c.numHumans=c.humanPlayerSlots.length;c.numComputers=c.totalPlayers-c.numHumans;
  h.players=c.humanPlayerSlots.map(id=>id===value.player?null:claims.get(id) || null);delete c.humanPlayerNames[value.player];delete c.aiSkillByPlayer[value.player];
  if(p.isComputer){p.name=value.name;p.isAlive=true;p.setAISkill(c.compSkill,c.compAdvantage);game.aiManager.initializeAIPlayer(p.playerNum,Game.mapV3SkillToAISkillLevel(c.getAISkillForPlayer(p.playerNum)));}
  else{p.setAISkill(0,0);game.aiManager.removeAIPlayer(p.playerNum);}
 }else if(value.action==='remove'){h.players[index]=null;delete c.humanPlayerNames[value.player];p.isLoggedIn=false;p.lastTurnPosted=0;}
 else if(value.action==='rename'){p.name=value.name;if(claim){h.players[index]={...claim,name:value.name};c.humanPlayerNames[value.player]=value.name;p.isLoggedIn=false;}}
 else if(value.action==='eject')p.isLoggedIn=false;
 else if(value.action==='kill'){
  // V3 neutralizes territory and lets end-of-turn defeat detection report death.
  for(const list of [game.stars,game.allShips,game.allFleets,game.allRendezvous])for(const e of list)if(e.owner===p.playerNum)e.owner=0;
 }
 if(role || value.action==='remove'){if(h.posts)delete h.posts[value.player];if(h.changes)delete h.changes[value.player];}
 h.playersRevision=revision(game)+1;if(value.action!=='eject'){h.playerStateRevision=(h.playerStateRevision || 0)+1;game.visibilityCalculator.updateAllVisibility();}
 return value.action==='eject' || role || value.action==='remove' || value.action==='rename' && !!claim;
}
module.exports={revision,describe,apply,failure};
