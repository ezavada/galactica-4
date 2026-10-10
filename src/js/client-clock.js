// The countdown is presentation only. Only a fresh host state can advance turns.
const I18n=require('./i18n.js');
const now=()=>pdg.tm.getMilliseconds();
function receive(value,game,time=now()){
 if(value===undefined)return null;const configured=game.config.maxTimePerTurn,limit=value && value.limitSeconds!==undefined?value.limitSeconds:configured;
 if(!value || typeof value!=='object' || Array.isArray(value) || typeof value.paused!=='boolean' || typeof value.running!=='boolean' ||
  value.paused && value.running || !Number.isSafeInteger(configured) || configured<0 || value.limitSeconds!==undefined && (!configured || game.turn===1 || game.isGameOver || !Number.isSafeInteger(value.limitSeconds) || value.limitSeconds<1 || value.limitSeconds>Math.floor(Number.MAX_SAFE_INTEGER/1000)) || !Number.isSafeInteger(limit) || limit<0 ||
  value.secondsRemaining!==null && (!Number.isSafeInteger(value.secondsRemaining) || value.secondsRemaining<0 || value.secondsRemaining>limit) ||
  (game.turn===1 || !limit || game.isGameOver) && value.secondsRemaining!==null ||
  game.turn>1 && limit>0 && !game.isGameOver && value.secondsRemaining===null || value.running && value.secondsRemaining===null)throw Error('invalid_player_state');
 return {secondsRemaining:value.secondsRemaining,paused:value.paused,running:value.running,receivedAt:time,...(value.limitSeconds!==undefined?{limitSeconds:value.limitSeconds}:{})};
}
function seconds(clock,time=now()){
 if(clock.secondsRemaining===null)return null;
 const elapsed=clock.running && !clock.paused?Math.max(0,time-clock.receivedAt)/1000:0;
 return Math.max(0,Math.ceil(clock.secondsRemaining-elapsed));
}
function duration(value){
 const days=Math.floor(value/86400);if(days>1)return I18n.formatString(1048,'{0} days',I18n.formatInteger(days));
 const hours=Math.floor(value/3600),minutes=Math.floor(value/60)%60,pad=n=>String(n).padStart(2,'0');
 return hours || value>=300?hours+':'+pad(minutes):Math.floor(value/60)+':'+pad(value%60);
}
function label(game,time=now()){
 const clock=game.clientClock;if(!game.clientPlayerNum || !clock || game.isGameOver)return null;
 const left=seconds(clock,time);if(left===null)return clock.paused?I18n.getString(1049,'Paused'):null;
 if(clock.paused)return I18n.formatString(1046,'Paused: {0}',duration(left));
 return left===0?I18n.getString(1047,'Awaiting next turn…'):I18n.formatString(1045,'Time remaining: {0}',duration(left));
}
module.exports={receive,seconds,duration,label};
