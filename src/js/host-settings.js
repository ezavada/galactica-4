// Active-host settings matching v3's editable setup fields; galaxy/roster stay fixed.
const fields=['compSkill','compAdvantage','fastGame','omniscient','maxTimePerTurn','endEarly'];
function failure(code){const e=new Error(code);e.code=code;throw e;}
function validate(value){
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==fields.length || Object.keys(value).some(k=>!fields.includes(k)))failure('invalid_host_settings');
 if(!Number.isInteger(value.compSkill) || value.compSkill<1 || value.compSkill>5 || !Number.isInteger(value.compAdvantage) || value.compAdvantage<-3 || value.compAdvantage>3 || !Number.isSafeInteger(value.maxTimePerTurn) || value.maxTimePerTurn<0 || value.maxTimePerTurn>Math.floor(Number.MAX_SAFE_INTEGER/1000) || ['fastGame','omniscient','endEarly'].some(k=>typeof value[k]!=='boolean'))failure('invalid_host_settings');
 return Object.fromEntries(fields.map(k=>[k,value[k]]));
}
function snapshot(game){return Object.fromEntries(fields.map(k=>[k,game.config[k]]));}
function apply(game,value){
 Object.assign(game.config,validate(value));game.config.aiSkillByPlayer={};game.rules.isFast=value.fastGame;
 for(const p of game.players)if(p && p.isComputer){p.setAISkill(value.compSkill,value.compAdvantage);game.aiManager.setAISkillLevel(p.playerNum,game.constructor.mapV3SkillToAISkillLevel(value.compSkill));}
 game.visibilityCalculator.updateAllVisibility();
}
module.exports={fields,validate,snapshot,apply,failure};
