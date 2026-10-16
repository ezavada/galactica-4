// Local games share the initial-state dialog without acquiring host credentials.
const Edit=require('./initial-state-edit.js');
function createService(game,changed=()=>{}){
 const record={localInitialEditor:true};
 function describe(){return {address:'local',info:{turn:game.turn,totalPlayers:game.config.totalPlayers},administration:{complete:game.isGameOver,initialState:Edit.describe(game),initialStateRevision:Edit.revision(game)}};}
 return {supported:true,latest:()=>record,describe,
  async editInitialState(r,value,revision,turn){
   if(r!==record || game.clientPlayerNum || game.clientAdministrator || game.config.networkHost)throw {code:'invalid_initial_state'};
   if(revision!==Edit.revision(game) || turn!==game.turn)throw {code:'stale_initial_state'};
   Edit.apply(game,value);changed(game);return record;
  }
 };
}
module.exports={createService};
