// V3 first-turn star editing; authority and persistence are provided by the caller.
const types=['defense','scout','colony','battleship'];
function failure(code){const error=new Error(code);error.code=code;throw error;}
function revision(game){return (game.config.networkHost || game.config).initialStateRevision || 0;}
function describe(game){return game.stars.map(s=>({id:s.id,name:s.name,owner:s.owner,population:s.population,technology:s.techLevel,shipType:s.currentShip?s.currentShip.type:null}));}
function apply(game,value){
 if(game.clientPlayerNum || game.clientAdministrator)failure('invalid_initial_state');
 if(game.isGameOver)failure('game_complete');if(game.turn!==1)failure('initial_state_closed');
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==3 || Object.keys(value).some(k=>!['action','star','value'].includes(k)) || !['population','technology','owner','ship'].includes(value.action) || !Number.isSafeInteger(value.star))failure('invalid_initial_state');
 const star=game.stars.find(s=>s.id===value.star);if(!star)failure('invalid_initial_state');
 const valid=value.action==='ship'?types.includes(value.value):Number.isSafeInteger(value.value) && value.value>=0 && value.value<=(value.action==='population'?4294967295:value.action==='technology'?65535:game.config.totalPlayers);
 const metadata=game.config.networkHost || game.config,current=revision(game),playerRevision=game.config.networkHost?game.config.networkHost.playerStateRevision || 0:0;
 if(!valid || !Number.isSafeInteger(current) || current<0 || current===Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(playerRevision) || playerRevision<0 || playerRevision===Number.MAX_SAFE_INTEGER)failure('invalid_initial_state');
 if(value.action==='population')star.population=value.value;
 else if(value.action==='technology'){star.techLevel=value.value;star.setScannerRange(game.rules.getScanRangeForTechLevel(star.techLevel));}
 else if(value.action==='owner'){
  star.owner=value.value;
  // The hosted editor seeds empty systems; the single-player editor retains zeros.
  if(game.config.networkHost){if(star.population===0)star.population=1;if(star.techLevel===0){star.techLevel=1;star.setScannerRange(game.rules.getScanRangeForTechLevel(1));}}
 }else star.buildCompletedShip(value.value);
 metadata.initialStateRevision=current+1;if(game.config.networkHost)game.config.networkHost.playerStateRevision=playerRevision+1;
 game.visibilityCalculator.updateAllVisibility();return star;
}
module.exports={types,revision,describe,apply,failure};
