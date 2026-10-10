// Runtime elapsed time is monotonic. Saves store remaining time, so host downtime
// does not spend the turn, matching v3's saved countdown rather than wall time.
class HostClock {
 constructor(game,now=()=>require('perf_hooks').performance.now()){
  this.now=now;this.startedAt=null;this.limit=game.config.maxTimePerTurn*1000;this.configuredLimit=this.limit;
  const saved=game.config.networkHost.clock;
  if(saved && saved.limitMs!==undefined){if(!this.configuredLimit || game.turn===1 || game.isGameOver || !Number.isSafeInteger(saved.limitMs) || saved.limitMs<=0 || saved.limitMs>Math.floor(Number.MAX_SAFE_INTEGER/1000)*1000 || saved.limitMs%1000!==0)throw Error('invalid_host_clock');this.limit=saved.limitMs;}
  if(saved!==undefined && (!saved || saved.turn!==game.turn || typeof saved.paused!=='boolean' ||
   (game.isGameOver || game.turn===1 || !this.limit ? saved.remainingMs!==null : !Number.isFinite(saved.remainingMs) || saved.remainingMs<0 || saved.remainingMs>this.limit)))throw Error('invalid_host_clock');
  this.turn=game.turn;this.paused=saved?saved.paused:false;
  this.remainingMs=saved?saved.remainingMs:game.isGameOver || game.turn===1 || !this.limit?null:this.limit;
 }
 remaining(){return this.remainingMs===null?null:Math.max(0,this.remainingMs-(this.startedAt===null?0:Math.max(0,this.now()-this.startedAt)));}
 snapshot(){return {turn:this.turn,remainingMs:this.remaining(),paused:this.paused,...(this.limit!==this.configuredLimit?{limitMs:this.limit}:{})};}
 info(){const remaining=this.remaining();return {secondsRemaining:remaining===null?null:Math.ceil(remaining/1000),paused:this.paused,running:this.startedAt!==null,...(this.limit!==this.configuredLimit?{limitSeconds:Math.ceil(this.limit/1000)}:{})};}
 start(){if(!this.paused && this.remainingMs!==null && this.startedAt===null)this.startedAt=this.now();}
 stop(){this.remainingMs=this.remaining();this.startedAt=null;}
 pause(){this.stop();this.paused=true;}
 resume(running){this.paused=false;if(running)this.start();}
 reset(game,running){this.turn=game.turn;this.limit=game.config.maxTimePerTurn*1000;this.configuredLimit=this.limit;this.remainingMs=game.isGameOver || !this.limit || game.turn===1?null:this.limit;this.startedAt=null;if(running)this.start();}
 configure(game,running){const next=game.config.maxTimePerTurn*1000;if(next===this.configuredLimit)return;if(!next || !this.configuredLimit || game.turn===1 || game.isGameOver)this.reset(game,running);else this.configuredLimit=next;}
 expired(){return !this.paused && this.startedAt!==null && this.remaining()===0;}
}
module.exports=HostClock;
