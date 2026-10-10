// Convert a validated local turn without regenerating its galaxy or touching its source.
const Save=require('./game-save.js'),Config=require('./game-config.js'),Game=require('./game.js'),{AIManager}=require('./ai-manager.js');
function failure(code){const error=new Error(code);error.code=code;return error;}
function prepare(text,numHumans){
 if(!Number.isInteger(numHumans) || numHumans<1 || numHumans>99)throw failure('invalid_conversion');
 const game=Save.restore(text),old=game.config;
 if(old.hosting || old.networkHost!==undefined || numHumans>old.totalPlayers)throw failure('invalid_conversion');
 const skills=new Map([...game.aiManager.aiPlayers].map(([id,ai])=>[id,ai.skillManager.getSkillLevel()]));
 game.config=new Config({...old,numHumans,numComputers:old.totalPlayers-numHumans,hosting:true,maxTimePerTurn:0,endEarly:true,skipMapGeneration:false,autoplay:{...old.autoplay,enabled:false},humanPlayerNames:{}});
 game.aiManager=new AIManager(game,game.rules);
 for(let id=1;id<=old.totalPlayers;id++){
  const player=game.players[id];player.isComputer=id>numHumans;player.isHuman=!player.isComputer;player.isLoggedIn=false;player.lastTurnPosted=0;
  if(player.isComputer)game.aiManager.initializeAIPlayer(id,skills.has(id)?skills.get(id):Game.mapV3SkillToAISkillLevel(game.config.getAISkillForPlayer(id)));
 }
 return game;
}
module.exports={prepare,failure};
