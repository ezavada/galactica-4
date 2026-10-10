const Name=require('./player-name.js'),I18n=require('./i18n.js'),Config=require('./game-config.js'),Setup=require('./startup-setup.js'),Files=require('./document-files.js');
const units=[{id:1056,multiplier:60},{id:1057,multiplier:3600},{id:1058,multiplier:86400},{id:1059,multiplier:604800}];
function whole(text,min,max){return typeof text==='string' && /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text)) && Number(text)>=min && Number(text)<=max?Number(text):null;}
function errorText(error){return I18n.getString(error && error.code==='invalid_host_port'?1067:error && error.code==='host_file_busy'?1086:error && error.code==='EEXIST'?1068:error && error.code==='host_listen_failed'?1069:error && error.code==='desktop_host_required'?1066:error && ['EACCES','EPERM','EIO','ENOSPC','ENOENT','ENOTDIR','EINVAL','EROFS'].includes(error.code)?1099:1030);}
class HostWindow {
 constructor(backend,join){this.backend=backend;this.join=join;this.active=false;this.busy=false;}
 open(options={},record=this.backend.latest()){
  if(this.active || this.busy)return false;this.conversion=null;this.confirmation=null;this.active=true;this.message='';this.record=record;this.stage=record?'hosting':'form';
  const numHumans=Math.max(2,Math.min(99,options.numHumans || 2));
  this.config=new Config({...options,numHumans,numComputers:Math.min(99-numHumans,options.numComputers || 0),hosting:true});
  this.title=Name.createEditor(this.config.gameTitle,Setup.maximumTitleLength);this.humans=Name.createEditor(String(this.config.numHumans),2);this.computers=Name.createEditor(String(this.config.numComputers),2);
  this.file=Name.createEditor(Files.suggestedName(this.config.gameTitle),1024);this.port=Name.createEditor(record?String(this.backend.describe(record).port):'0',5);const limit=options.hosting?options.maxTimePerTurn || 0:300;this.unit=Math.max(0,units.map(u=>limit%u.multiplier===0).lastIndexOf(true));this.time=Name.createEditor(String(Math.max(1,Math.ceil(limit/units[this.unit].multiplier))),8);this.timed=limit>0;this.config.endEarly=options.hosting?options.endEarly!==false:true;this.focus='title';this.customFile=false;
  if(!this.backend.supported)this.message=I18n.getString(1066);return true;
 }
 openSaved(options={}){if(!this.open(options,null))return false;this.stage='open';this.file=Name.createEditor('',1024);this.focus='file';return true;}
 async resume(){
  if(this.busy)return false;if(!this.backend.supported){this.message=I18n.getString(1066);return false;}
  const port=whole(this.port.text,0,65535);if(port===null || !Name.validName(this.file.text,1024)){this.message=I18n.getString(1067);return false;}
  this.busy=true;this.message=I18n.getString(1085);
  try{this.record=await this.backend.open(this.file.text.trim(),{port});this.stage='hosting';this.port=Name.createEditor(String(this.backend.describe(this.record).port),5);this.message='';return true;}
  catch(error){if(error.conversion){this.conversion=error.conversion;this.stage='conversion';this.humans=Name.createEditor(String(error.conversion.totalPlayers),2);this.file=Name.createEditor(error.conversion.suggestedFile,1024);this.focus='file';this.message='';return false;}if(error.record){this.record=error.record;this.stage='hosting';}this.message=error.code==='host_listen_failed' || error.code==='host_file_busy'?errorText(error):I18n.getString(1087);return false;}
  finally{this.busy=false;}
 }
 async convert(){
  if(this.busy || !this.conversion)return false;const numHumans=whole(this.humans.text,1,this.conversion.totalPlayers),port=whole(this.port.text,0,65535);
  if(numHumans===null || port===null || !Name.validName(this.file.text,1024)){this.message=I18n.formatString(1095,'',this.conversion.totalPlayers);return false;}
  this.busy=true;this.message=I18n.getString(1094);
  try{this.record=await this.backend.convert(this.conversion.token,this.file.text.trim(),numHumans,{port});this.conversion=null;this.stage='hosting';this.port=Name.createEditor(String(this.backend.describe(this.record).port),5);this.message='';return true;}
  catch(error){if(error.record){this.record=error.record;this.conversion=null;this.stage='hosting';}this.message=error.code==='invalid_conversion_offer'?I18n.getString(1097):error.code==='invalid_conversion'?I18n.formatString(1095,'',this.conversion.totalPlayers):errorText(error);return false;}
  finally{this.busy=false;}
 }
 cancel(){if(!this.active || this.busy)return false;if(this.stage==='endTurn'){this.stage='hosting';this.confirmation=null;this.message='';return true;}if(this.conversion && this.backend.discardConversion)this.backend.discardConversion(this.conversion.token);this.conversion=null;this.active=false;return true;}
 options(){
  const numHumans=whole(this.humans.text,1,99),numComputers=whole(this.computers.text,0,98),port=whole(this.port.text,0,65535),time=this.timed?whole(this.time.text,1,Math.min(99999999,Math.floor(Number.MAX_SAFE_INTEGER/(1000*units[this.unit].multiplier)))):0;
  if(numHumans===null || numComputers===null || numHumans+numComputers>99 || port===null || time===null || !Name.validName(this.title.text,Setup.maximumTitleLength) || !Name.validName(this.file.text,1024))return null;
  const config=new Config({...this.config,numHumans,numComputers,gameTitle:this.title.text.trim(),maxTimePerTurn:time*units[this.unit].multiplier,endEarly:!this.timed || this.config.endEarly});
  if(config.validate().length)return null;return {config,file:this.file.text.trim(),listen:{port}};
 }
 async create(){
  if(this.busy)return false;if(!this.backend.supported){this.message=I18n.getString(1066);return false;}
  const options=this.options();if(!options){this.message=I18n.getString(1067);return false;}
  this.config=options.config;this.busy=true;this.message=I18n.getString(1061);
  try{this.record=await this.backend.create(options.config,options.file,options.listen);this.stage='hosting';this.port=Name.createEditor(String(this.backend.describe(this.record).port),5);this.message='';return true;}
  catch(error){if(error.record){this.record=error.record;this.stage='hosting';}this.message=errorText(error);return false;}
  finally{this.busy=false;}
 }
 async stop(){
  if(this.busy || !this.record)return false;this.busy=true;this.message=I18n.getString(1070);
  try{await this.backend.stop(this.record);this.record=null;this.active=false;return true;}catch(error){this.message=I18n.getString(1073);return false;}finally{this.busy=false;}
 }
 async retry(){if(this.busy || !this.record)return false;this.busy=true;this.message=I18n.getString(1061);try{const port=whole(this.port.text,0,65535);if(port===null)throw {code:'invalid_host_port'};await this.backend.retry(this.record,port);this.port=Name.createEditor(String(this.backend.describe(this.record).port),5);this.message='';return true;}catch(error){this.message=errorText(error);return false;}finally{this.busy=false;}}
 requestEnd(){
  if(this.busy || !this.record)return false;const info=this.backend.describe(this.record);if(!info.address || info.administration.complete)return false;
  if(!info.administration.pending.length)return this.control('end',info.info.turn);
  this.confirmation={turn:info.info.turn,pending:info.administration.pending.map(p=>({...p}))};this.page=0;this.stage='endTurn';this.message='';return true;
 }
 async control(action,turn){
  if(this.busy || !this.record)return false;this.busy=true;this.message=I18n.getString(1111);
  try{await this.backend.turnControl(this.record,action,turn);this.stage='hosting';this.confirmation=null;this.message='';return true;}
  catch(error){if(error.code==='stale_host_turn' || error.code==='game_complete'){this.stage='hosting';this.confirmation=null;}this.message=I18n.getString(error.code==='stale_host_turn'?1114:error.code==='game_complete'?1043:1030);return false;}
  finally{this.busy=false;}
 }
 action(action,value){
  if(action==='cancel')return this.cancel();if(this.busy)return false;
  if(action==='pause' || action==='resumeClock')return this.control(action==='pause'?'pause':'resume');if(action==='endNow')return this.requestEnd();if(action==='confirmEnd')return this.confirmation?this.control('end',this.confirmation.turn):false;if((action==='previous' || action==='next') && this.confirmation){this.page=Math.max(0,Math.min(Math.ceil(this.confirmation.pending.length/4)-1,this.page+(action==='next'?1:-1)));return true;}
  if(action==='convert')return this.convert();if(action==='resume')return this.resume();if(action==='openSaved'){this.active=false;return this.openSaved(this.config);}if(action==='create')return this.create();if(action==='stop')return this.stop();if(action==='retry')return this.retry();
  if(action==='join' && this.record){const info=this.backend.describe(this.record);if(!info.address)return false;this.active=false;return this.join(info);}
  if(action==='another'){this.active=false;return this.open(this.config,null);}
  if(action==='unit'){if(!Number.isInteger(value) || value<0 || value>=units.length)return false;this.unit=value;this.config.endEarly=value===0;}
  else if(action==='timed')this.timed=!this.timed;
  else if(action==='endEarly')this.config.endEarly=!this.config.endEarly;
  else if(action==='fast')this.config.fastGame=!this.config.fastGame;
  else if(action==='fog')this.config.omniscient=!this.config.omniscient;
  else if(action==='skill')return Setup.setSkill(this.config,value);
  else if(action==='advantage')return Setup.setAdvantage(this.config,value);
  else if(action==='size')return Setup.setSectorSize(this.config,value);
  else if(action==='density')return Setup.setDensity(this.config,value);
  else return false;this.message='';return true;
 }
 key(key,pdgRef=globalThis.pdg){
  if(key===pdgRef.key_Escape)return this.cancel();if(this.busy)return true;
  if(this.stage==='endTurn'){if([13,10,3].includes(key))this.action('confirmEnd');return true;}
  if(this.stage==='hosting'){if(key===pdgRef.key_Tab && !this.backend.describe(this.record).address){this.focus='port';this.port.selected=true;}else if([13,10,3].includes(key))this.action(this.backend.describe(this.record).address?'join':'retry');else if(this.focus==='port')Name.edit(this.port,key,pdgRef);return true;}
  const fields=this.stage==='conversion'?['file','humans','port']:this.stage==='open'?['file','port']:['title','humans','computers',...(this.timed?['time']:[]),'file','port'];
  if(key===pdgRef.key_Tab){this.focus=fields[(fields.indexOf(this.focus)+1)%fields.length];this[this.focus].selected=true;return true;}
  if([13,10,3].includes(key)){this.stage==='conversion'?this.convert():this.stage==='open'?this.resume():this.create();return true;}const before=this[this.focus].text;Name.edit(this[this.focus],key,pdgRef);
  if(this.focus==='file' && this.file.text!==before)this.customFile=true;
  if(this.focus==='title' && this.title.text!==before && !this.customFile)this.file=Name.createEditor(Files.suggestedName(this.title.text),1024);
  this.message='';return true;
 }
 layout(width,height){
  if(!this.active)return null;const baseHeight=this.stage==='endTurn'?360:this.stage==='conversion'?380:this.stage==='open'?300:568,rect={width:Math.min(600,width-24),height:Math.min(baseHeight,height-24)};rect.x=(width-rect.width)/2;rect.y=(height-rect.height)/2;
  const scale=rect.height/baseHeight,at=(x,y,w,h=26)=>({x:rect.x+x,y:rect.y+y*scale,width:w,height:h*scale});
  if(this.stage==='endTurn'){
   const inner=rect.width-48,c=this.confirmation,labels=[{text:I18n.formatString(1115,'',c.turn),rect:at(24,54,inner)},{text:I18n.formatString(1108,'',c.pending.length),rect:at(24,78,inner)},...c.pending.slice(this.page*4,this.page*4+4).map((p,i)=>({text:I18n.formatString(1112,'',p.player,p.name),rect:at(24,110+i*28,inner)}))];
   const buttons=[...(c.pending.length>4?[{action:'previous',id:1033,disabled:this.page===0,rect:at(24,232,inner/2-4)},{action:'next',id:1034,disabled:(this.page+1)*4>=c.pending.length,rect:at(28+inner/2,232,inner/2-4)}]:[]),{action:'cancel',id:1110,key:'Esc',rect:at(24,306,inner/2-4)},{action:'confirmEnd',id:1107,key:'Enter',rect:at(28+inner/2,306,inner/2-4)}];
   return {rect,scale,title:I18n.getString(1109),messageY:284,fields:[],choices:[],checks:[],labels,buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  if(this.stage==='conversion'){
   const inner=rect.width-48,source=this.conversion;
   return {rect,scale,title:I18n.getString(1090),messageY:290,fields:[{name:'file',label:I18n.getString(1091),rect:at(180,106,rect.width-204),labelRect:at(24,106,140)},{name:'humans',label:I18n.getString(1052),rect:at(180,152,80),labelRect:at(24,152,140)},{name:'port',label:I18n.getString(1053),rect:at(180,198,rect.width-204),labelRect:at(24,198,140)}],choices:[],checks:[],labels:[{text:I18n.formatString(1092,'',source.title,source.turn,source.totalPlayers),rect:at(24,58,inner)},{text:I18n.getString(1096),rect:at(24,242,inner)}],buttons:[{action:'cancel',id:683,key:'Esc',rect:at(24,322,inner/2-4)},{action:'convert',id:1093,key:'Enter',rect:at(28+inner/2,322,inner/2-4)}].map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  if(this.stage==='open'){
   const inner=rect.width-48;
   return {rect,scale,title:I18n.getString(1083),messageY:194,fields:[{name:'file',label:I18n.getString(1051),rect:at(180,70,rect.width-204),labelRect:at(24,70,140)},{name:'port',label:I18n.getString(1053),rect:at(180,116,rect.width-204),labelRect:at(24,116,140)}],choices:[],checks:[],labels:[],buttons:[{action:'cancel',id:683,key:'Esc',rect:at(24,240,inner/2-4)},{action:'resume',id:1084,key:'Enter',disabled:!this.backend.supported,rect:at(28+inner/2,240,inner/2-4)}].map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  if(this.stage==='hosting'){
   const info=this.backend.describe(this.record),inner=rect.width-48;
   return {rect,scale,title:I18n.formatString(1062,'',info.title),messageY:350,info,fields:info.address?[]:[{name:'port',label:I18n.getString(1053),rect:at(180,300,rect.width-204),labelRect:at(24,300,140)}],choices:[],checks:[],labels:info.address?[{text:info.administration.complete?I18n.getString(1043):info.info.clock.paused?info.info.clock.secondsRemaining===null?I18n.getString(1049):I18n.formatString(1046,'',require('./client-clock.js').duration(info.info.clock.secondsRemaining)):info.info.clock.secondsRemaining===null?I18n.getString(1113):I18n.formatString(1045,'',require('./client-clock.js').duration(info.info.clock.secondsRemaining)),rect:at(24,230,inner)}]:[],buttons:[
    ...(info.address?[{action:info.info.clock.paused?'resumeClock':'pause',id:info.info.clock.paused?1117:1116,disabled:info.administration.complete,rect:at(24,266,inner/2-4)},{action:'endNow',id:1107,disabled:info.administration.complete,rect:at(28+inner/2,266,inner/2-4)}]:[]),
    {action:'join',id:1063,key:'Enter',disabled:!info.address,rect:at(24,380,inner)},
    {action:'retry',id:1075,disabled:!!info.address,rect:at(24,418,inner)},
    {action:'another',id:1065,rect:at(24,456,inner)},
    {action:'stop',id:1064,rect:at(24,494,inner/2-4)},
    {action:'cancel',id:834,key:'Esc',rect:at(28+inner/2,494,inner/2-4)}].map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  const inner=rect.width-48,labelWidth=140,fieldX=180,fieldWidth=rect.width-fieldX-24;
  const field=(name,id,x,y,w,labelX=24)=>({name,label:I18n.getString(id),rect:at(x,y,w),labelRect:at(labelX,y,Math.max(0,x-labelX-8))});
  const fields=[field('title',825,fieldX,54,fieldWidth),field('humans',1052,180,92,64),field('computers',829,rect.width-90,92,66,rect.width/2),field('file',1051,fieldX,422,fieldWidth),field('port',1053,fieldX,460,fieldWidth)];
  if(this.timed)fields.push(field('time',1077,24,352,80,24));
  const choices=[],labels=[];
  function row(action,id,values,y,selected){labels.push({text:I18n.getString(id),rect:at(24,y,labelWidth)});const gap=4,w=(fieldWidth-gap*(values.length-1))/values.length;values.forEach((item,i)=>choices.push({action,value:item.value,label:item.label,active:item.value===selected,rect:at(fieldX+i*(w+gap),y,w)}));}
  row('skill',1078,Setup.skills.map(value=>({value,label:I18n.getString(300+value)})),130,this.config.compSkill);
  row('advantage',761,Setup.advantages.map(value=>({value,label:value>0?'+'+value:String(value)})),168,this.config.compAdvantage);
  row('size',1079,Setup.sectorSizes.map(value=>({value,label:value+'×'+value})),206,this.config.sectorSize);
  row('density',1080,Setup.densities.map(value=>({value,label:String(value)})),244,this.config.density);
  const checks=[{action:'fast',id:505,value:this.config.fastGame,rect:at(24,282,inner/2-4)},{action:'fog',id:508,value:!this.config.omniscient,rect:at(28+inner/2,282,inner/2-4)},
   {action:'timed',id:1054,value:this.timed,rect:at(24,316,inner)},...(this.timed?[{action:'endEarly',id:1055,value:this.config.endEarly,rect:at(24,386,inner)}]:[])].map(c=>({...c,label:I18n.getString(c.id)}));
  if(this.timed){const w=(inner-104-12)/4;units.forEach((unit,value)=>choices.push({action:'unit',value,label:I18n.getString(unit.id),active:value===this.unit,rect:at(128+value*(w+4),352,w)}));}
  return {rect,scale,title:I18n.getString(1050),fields,choices,checks,labels,buttons:[{action:'cancel',id:683,key:'Esc',rect:at(24,532,(inner-16)/3)},{action:'openSaved',id:1083,rect:at(32+(inner-16)/3,532,(inner-16)/3)},{action:'create',id:1060,key:'Enter',disabled:!this.backend.supported,rect:at(40+2*(inner-16)/3,532,(inner-16)/3)}].map(b=>({...b,label:I18n.getString(b.id)}))};
 }
}
module.exports={HostWindow,units,whole,errorText};
