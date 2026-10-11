// Public host settings only; this panel never exposes credentials or player state.
const I18n=require('./i18n.js'),Clock=require('./client-clock.js');
const now=()=>globalThis.pdg?.tm?.getMilliseconds?.() ?? Date.now();
function duration(seconds){
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),pad=n=>String(n).padStart(2,'0');
 const time=pad(hours)+':'+pad(minutes)+':'+pad(seconds%60);
 return days?I18n.formatPluralString(1244,'{0} day|{0} days',days,I18n.formatInteger(days))+' · '+time:time;
}
function rows(info,receivedAt,time=now()){
 if(!info)return [];
 const result=[{key:'title',text:I18n.formatString(1014,'',info.title,info.turn)},{key:'players',text:I18n.formatString(1015,'',info.humans,info.computers)}];
 const add=(key,id,...values)=>result.push({key,text:I18n.formatString(id,'',...values)}),yes=value=>I18n.getString(value?807:808);
 if(info.sectorSize!==undefined && info.density!==undefined)add('map',1231,info.sectorSize,info.density);
 if(info.skill!==undefined && info.advantage!==undefined)add('ai',1232,I18n.getString(300+info.skill),info.advantage>0?'+'+info.advantage:String(info.advantage));
 for(const [key,id] of [['fastGame',1233],['fogOfWar',1234],['endEarly',1235]])if(info[key]!==undefined)add(key,id,yes(info[key]));
 if(info.maxTimePerTurn!==undefined)add('limit',1236,info.maxTimePerTurn?duration(info.maxTimePerTurn):I18n.getString(1242));
 if(info.clock){
  const clock=info.clock;if(clock.limitSeconds!==undefined && clock.limitSeconds!==info.maxTimePerTurn)add('activeLimit',1237,duration(clock.limitSeconds));
  const left=Clock.seconds({...clock,receivedAt:receivedAt ?? time},time);
  result.push({key:'clock',text:left===null?I18n.getString(clock.paused?1049:1113):I18n.formatString(clock.paused?1046:1045,'',duration(left))});
 }
 add('status',1238,I18n.getString(info.slots.some(slot=>slot.status==='open')?1239:1240));
 if(info.requiresAdmissionCode!==undefined)add('admission',1241,yes(info.requiresAdmissionCode));
 return result;
}
function wrap(text,width,measure){return require('./text-wrapping.js')(text,width,t=>measure(t,12));}

module.exports={rows,duration,wrap,now};
