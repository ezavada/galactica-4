// Player-facing admission. Passwords live only in the editor/request, never in preferences.
const Names=require('./player-name.js'),I18n=require('./i18n.js'),Network=require('./network-client.js');
const errorIds={invalid_host_address:1020,bad_login_request:1021,bad_password:1022,duplicate_name:1023,
 game_full:1024,player_not_found:1025,wrong_game:1026,bad_protocol:1027,network_timeout:1028,
 network_bad_response:1029,invalid_player_state:1029,wrong_player:1029,network_response_too_large:1029,
 host_save_failed:1030,host_state_failed:1030,not_logged_in:1031,stale_server_state:1029,bad_orders:1040,wrong_turn:1041,already_posted:1042,game_complete:1043,orders_too_large:1044};
function errorText(error){return I18n.getString(errorIds[error && error.code] || 1032);}
class JoinWindow {
 constructor({create=address=>new Network.NetworkClient(address),install,find=()=>null,defaultName=()=>''}={}){
  this.create=create;this.install=install;this.find=find;this.defaultName=defaultName;this.active=false;this.sequence=0;
 }
 open(descriptor=null){
  if(this.active)return false;
  this.active=true;this.busy=false;this.client=null;this.owned=false;this.info=null;this.message='';this.page=0;
  this.address=Names.createEditor(descriptor?descriptor.address:'',256);
  this.name=Names.createEditor(descriptor?descriptor.name:this.defaultName());this.password=Names.createEditor('',64);
  this.mode=descriptor?'rejoin':'join';this.expectedId=descriptor?descriptor.gameId:null;this.focus=descriptor?'password':'address';return true;
 }
 cancel(){
  if(!this.active)return false;const wasBusy=this.busy;++this.sequence;this.active=false;this.busy=false;
  this.password.text='';if((this.owned || wasBusy) && this.client)this.client.disconnect({keepView:true});this.client=null;return true;
 }
 clearInfo(){this.info=null;this.expectedId=null;this.page=0;}
 selectSlot(slot){
  if(this.busy)return false;this.mode=slot.status==='occupied'?'rejoin':'join';
  this.name=Names.createEditor(slot.status==='occupied'?slot.name:this.defaultName());this.password=Names.createEditor('',64);
  this.focus=slot.status==='occupied'?'password':'name';this.message='';return true;
 }
 async inspect(){
  if(!this.active || this.busy)return false;const sequence=++this.sequence;this.busy=true;this.message=I18n.getString(1012);
  try{
   if(this.owned && this.client)this.client.disconnect({keepView:true});
   this.client=this.create(this.address.text);this.owned=true;
   const info=await this.client.inspect();if(sequence!==this.sequence || !this.active)return false;
   if(this.expectedId && info.gameId!==this.expectedId)throw {code:'wrong_game'};
   this.info=info;this.expectedId=info.gameId;this.page=0;this.message='';this.focus=this.mode==='rejoin'?'password':'name';return true;
  }catch(error){if(sequence===this.sequence && this.active){this.info=null;this.message=errorText(error);}return false;}
  finally{if(sequence===this.sequence)this.busy=false;}
 }
 async connect(){
  if(!this.active || this.busy)return false;
  if(!this.info && !await this.inspect())return false;
  const name=this.name.text.trim();if(!Names.validName(name)){this.message=I18n.getString(1021);this.focus='name';return false;}
  const sequence=++this.sequence;this.busy=true;this.message=I18n.getString(1013);
  try{
   const existing=this.find(this.client.address,this.info.gameId,name);
   if(existing){if(this.owned)this.client.disconnect();this.client=existing;this.owned=false;}
   const client=this.client;
   const model=existing?await existing.rejoin(this.password.text):await this.client.connect({name,password:this.password.text,mode:this.mode,gameId:this.info.gameId});
   if(sequence!==this.sequence || !this.active){if(this.owned)client.disconnect({keepView:true});return false;}
   this.install(model,this.client);this.password.text='';this.client=null;this.active=false;this.message='';return true;
  }catch(error){if(sequence===this.sequence && this.active)this.message=errorText(error);return false;}
  finally{if(sequence===this.sequence)this.busy=false;}
 }
 action(action){
  if(action==='cancel')return this.cancel();if(this.busy)return false;
  if(action==='inspect')return this.inspect();if(action==='connect')return this.connect();
  if(action==='join' || action==='rejoin'){this.mode=action;this.message='';return true;}
  if((action==='previous' || action==='next') && this.info){this.page=Math.max(0,Math.min(Math.ceil(this.info.slots.length/4)-1,this.page+(action==='next'?1:-1)));return true;}
  return false;
 }
 key(key,pdgRef=globalThis.pdg){
  if(key===pdgRef.key_Escape)return this.cancel();if(this.busy)return true;
  if(key===pdgRef.key_Tab){const fields=['address','name','password'];this.focus=fields[(fields.indexOf(this.focus)+1)%3];this[this.focus].selected=true;return true;}
  if([13,10,3].includes(key)){if(this.focus==='address')this.inspect();else this.connect();return true;}
  const before=this[this.focus].text;Names.edit(this[this.focus],key,pdgRef);
  if(this[this.focus].text!==before){this.message='';if(this.focus==='address')this.clearInfo();}return true;
 }
 layout(width,height){
  if(!this.active)return null;const rect={width:Math.min(560,width-24),height:Math.min(548,height-24)};
  rect.x=(width-rect.width)/2;rect.y=(height-rect.height)/2;const scale=rect.height/548,at=(x,y,w,h)=>({x:rect.x+x,y:rect.y+y*scale,width:w,height:h*scale});
  const inner=rect.width-48,fieldWidth=inner-116;
  const fields=['address','name','password'].map((name,index)=>({name,label:I18n.getString(1006+index),rect:at(140,62+index*46,fieldWidth,32),labelPoint:{x:rect.x+24,y:rect.y+(83+index*46)*scale}}));
  const buttons=[{action:'inspect',id:1009,key:null,rect:at(24,202,inner/3-6,30)},
   {action:'join',id:1010,rect:at(24+inner/3,202,inner/3-6,30)},
   {action:'rejoin',id:1011,rect:at(24+inner*2/3,202,inner/3,30)},
   {action:'cancel',id:683,key:'Esc',rect:at(24,496,inner/2-4,30)},
   {action:'connect',id:this.mode==='rejoin'?1011:1010,key:'Enter',rect:at(28+inner/2,496,inner/2-4,30)}];
  if(this.info && this.info.slots.length>4)buttons.push({action:'previous',id:1033,rect:at(24,428,inner/2-4,24)},{action:'next',id:1034,rect:at(28+inner/2,428,inner/2-4,24)});
  const slots=this.info?this.info.slots.slice(this.page*4,this.page*4+4).map((slot,index)=>({slot,rect:at(24,300+index*30,inner,26),label:slot.status==='open'?I18n.formatString(1016,'',slot.player):I18n.formatString(1017,'',slot.player,slot.name,I18n.getString(slot.online?1018:1019))})):[];
  return {rect,scale,fields,slots,buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
 }
}
module.exports={JoinWindow,errorText,errorIds};
