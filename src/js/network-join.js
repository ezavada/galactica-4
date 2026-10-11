// Admission keeps tokens transient; remembered passwords require explicit device opt-in.
const Information=require('./network-game-information.js');
const Names=require('./player-name.js'),I18n=require('./i18n.js'),Network=require('./network-client.js');
const errorIds={admin_disabled:1166,invalid_admin_password:1157,invalid_admin_state:1029,invalid_admin_action:1032,invalid_host_address:1020,bad_login_request:1021,bad_password:1022,duplicate_name:1023,
 game_full:1024,player_not_found:1025,wrong_game:1026,bad_protocol:1027,network_timeout:1028,
 network_bad_response:1029,invalid_player_state:1029,wrong_player:1029,network_response_too_large:1029,
 host_save_failed:1030,host_state_failed:1030,not_logged_in:1031,admin_ejected:1142,not_admitted:1150,stale_server_state:1029,bad_orders:1040,wrong_turn:1041,already_posted:1042,game_complete:1043,orders_too_large:1044};
function errorText(error){return I18n.getString(errorIds[error && error.code] || 1032);}
class JoinWindow {
 constructor({create=address=>new Network.NetworkClient(address),createAdmin=address=>new (require('./network-admin-client.js').NetworkAdminClient)(address),install,find=()=>null,defaultName=()=>'',passwordPreferences=null,hostPreferences=null,discovery=null}={}){
  this.discovery=discovery;this.discoveryScan=null;this.hostPreferences=hostPreferences;this.passwordPreferences=passwordPreferences;this.create=create;this.createAdmin=createAdmin;this.install=install;this.find=find;this.defaultName=defaultName;this.active=false;this.sequence=0;
 }
 open(descriptor=null){
  if(this.active)return false;
  this.bodyScroll=0;this.revealFocus=true;this.resetInspectionError();this.stage='form';this.active=true;this.busy=false;this.refreshing=null;this.client=null;this.owned=false;this.info=null;this.message='';this.page=0;
  this.address=Names.createEditor(descriptor?descriptor.address:'',256);
  this.name=Names.createEditor(descriptor && descriptor.role!=='administrator'?descriptor.name:this.defaultName());this.password=Names.createEditor('',64);this.admissionCode=Names.createEditor('',64);
  this.rememberPassword=false;this.savedPasswordLoaded=false;this.mode=descriptor && descriptor.role==='administrator'?'administrator':descriptor?'rejoin':'join';this.expectedId=descriptor?descriptor.gameId:null;this.focus=descriptor?'password':'address';if(descriptor)this.loadSavedPassword();return true;
 }
 stopDiscovery(){++this.sequence;if(this.discoveryScan){this.discoveryScan.close();this.discoveryScan=null;}}
 openLan(){
  if(!this.discovery || !this.active || this.busy)return false;this.stopDiscovery();if(this.owned && this.client)this.client.disconnect({keepView:true});this.client=null;this.owned=false;this.clearPasswordIdentity();this.admissionCode.text='';this.clearInfo();this.stage='lan';this.lanRows=[];this.lanSelection=null;this.focus='lan';this.message=I18n.getString(1193);const sequence=this.sequence;
  if(!this.discovery.supported()){this.message=I18n.getString(1195);return true;}
  const valid=()=>this.active && this.stage==='lan' && this.sequence===sequence;
  const failed=()=>{if(valid())this.message=I18n.getString(1196);};
  try{this.discoveryScan=this.discovery.browse({onChange:rows=>{if(!valid())return;this.lanRows=rows;this.page=Math.min(this.page,Math.max(0,Math.ceil(rows.length/4)-1));if(!rows.some(row=>require('./network-discovery.js').identity(row)===this.lanSelection))this.lanSelection=rows[this.page*4]?require('./network-discovery.js').identity(rows[this.page*4]):null;const selected=rows.findIndex(row=>require('./network-discovery.js').identity(row)===this.lanSelection);if(selected>=0)this.page=Math.floor(selected/4);this.message='';},onError:failed});Promise.resolve(this.discoveryScan.ready).then(()=>{if(valid() && this.message===I18n.getString(1193))this.message='';},failed);}catch(error){failed();}return true;
 }
 async chooseLan(){
  if(this.stage!=='lan' || this.busy)return false;const row=this.lanRows.find(row=>require('./network-discovery.js').identity(row)===this.lanSelection);if(!row)return false;
  const saved=this.hostPreferences && this.hostPreferences.list().find(s=>s.address===row.address && s.gameId===row.gameId && s.role==='player');this.stopDiscovery();this.stage='form';this.address=Names.createEditor(row.address,256);this.name=Names.createEditor(saved?saved.name:this.defaultName());this.mode=saved?'rejoin':'join';this.expectedId=row.gameId;this.clearPasswordIdentity();this.info=null;this.page=0;this.loadSavedPassword();return this.inspect();
 }
 openSavedHosts(){
  if(!this.hostPreferences || !this.active || this.busy)return false;this.stopDiscovery();if(this.owned && this.client)this.client.disconnect({keepView:true});this.client=null;this.owned=false;this.clearPasswordIdentity();this.admissionCode.text='';this.clearInfo();this.savedHosts=this.hostPreferences.list();this.savedSelection=this.savedHosts.length?require('./network-host-preferences.js').identity(this.savedHosts[0]):null;this.page=0;this.stage='hosts';this.focus=this.savedHosts.length?'savedHosts':'address';this.message='';return true;
 }
 addSavedHost(){
  if(this.stage!=='hosts' || this.busy)return false;let address;try{address=Network.normalizeAddress(this.address.text);}catch(error){this.message=errorText(error);return false;}
  if(!this.hostPreferences.upsert({address})){this.message=I18n.getString(1188);return false;}this.savedHosts=this.hostPreferences.list();this.savedSelection=require('./network-host-preferences.js').identity(this.savedHosts.find(r=>r.address===address && r.gameId===null));this.page=0;this.focus='savedHosts';this.message='';return true;
 }
 removeSavedHost(){
  if(this.stage!=='hosts' || this.busy || !this.savedSelection)return false;if(!this.hostPreferences.remove(this.savedSelection)){this.message=I18n.getString(1188);return false;}this.savedHosts=this.hostPreferences.list();this.page=Math.min(this.page,Math.max(0,Math.ceil(this.savedHosts.length/4)-1));this.savedSelection=this.savedHosts[this.page*4]?require('./network-host-preferences.js').identity(this.savedHosts[this.page*4]):null;this.message='';return true;
 }
 async chooseSavedHost(){
  if(this.stage!=='hosts' || this.busy)return false;const row=this.savedHosts.find(r=>require('./network-host-preferences.js').identity(r)===this.savedSelection);if(!row)return false;
  this.stage='form';this.address=Names.createEditor(row.address,256);this.name=Names.createEditor(row.name || this.defaultName());this.mode=row.role==='administrator'?'administrator':row.gameId?'rejoin':'join';this.expectedId=row.gameId;this.clearPasswordIdentity();this.info=null;this.page=0;this.loadSavedPassword();return this.inspect();
 }
 passwordIdentity(){return this.expectedId?{address:this.client?this.client.address:this.address.text,gameId:this.expectedId,role:this.mode==='administrator'?'administrator':'player',name:this.mode==='administrator'?'':this.name.text.trim()}:null;}
 loadSavedPassword(){
  if(!this.passwordPreferences || this.password.text)return false;const id=this.passwordIdentity(),password=id && this.passwordPreferences.read(id);
  if(password===null || password===undefined)return false;this.password=Names.createEditor(password,64);this.rememberPassword=true;this.savedPasswordLoaded=true;return true;
 }
 clearPasswordIdentity(){this.password=Names.createEditor('',64);this.rememberPassword=false;this.savedPasswordLoaded=false;}
 cancel(){
  if(!this.active)return false;const wasBusy=this.busy;this.stopDiscovery();++this.sequence;this.active=false;this.busy=false;
  this.clearPasswordIdentity();this.admissionCode.text='';if((this.owned || wasBusy) && this.client)this.client.disconnect({keepView:true});this.client=null;return true;
 }
 resetInspectionError(){this.inspectionError=null;this.inspectionPreviousMessage='';}
 clearInfo(){this.resetInspectionError();this.info=null;this.expectedId=null;this.page=0;}
 selectSlot(slot){
  if(this.busy)return false;this.mode=slot.status==='occupied'?'rejoin':'join';
  this.name=Names.createEditor(slot.status==='occupied'?slot.name:this.defaultName());this.clearPasswordIdentity();this.admissionCode.text='';if(this.mode==='rejoin')this.loadSavedPassword();
  this.revealFocus=true;this.focus=slot.status==='occupied'?'password':'name';this.message='';return true;
 }
 async inspect(){
  if(!this.active || this.busy)return false;this.resetInspectionError();const sequence=++this.sequence;this.busy=true;this.message=I18n.getString(1012);
  try{
   if(this.owned && this.client)this.client.disconnect({keepView:true});
   this.client=(this.mode==='administrator'?this.createAdmin:this.create)(this.address.text);this.owned=true;
   const info=await this.client.inspect();if(sequence!==this.sequence || !this.active)return false;
   if(this.expectedId && info.gameId!==this.expectedId)throw {code:'wrong_game'};
   this.info=info;this.inspectedAt=Information.now();this.nextInspection=this.inspectedAt+3000;this.informationPage=0;this.expectedId=info.gameId;this.page=0;this.loadSavedPassword();this.message='';this.revealFocus=true;this.focus=this.mode==='join'?'name':'password';return true;
  }catch(error){if(sequence===this.sequence && this.active){this.info=null;this.message=errorText(error);}return false;}
  finally{if(sequence===this.sequence)this.busy=false;}
 }
 poll(){
  if(!this.active || this.busy || this.refreshing || !this.info || !this.client || !['form','information'].includes(this.stage) || Information.now()<(this.nextInspection || 0))return false;
  return this.refreshInfo();
 }
 async refreshInfo(){
  if(!this.active || this.busy || this.refreshing || !this.info || !this.client)return false;
  const sequence=this.sequence,client=this.client,id=this.info.gameId,ticket={client};this.refreshing=ticket;this.nextInspection=Information.now()+3000;
  const valid=()=>this.active && this.sequence===sequence && this.client===client && this.info?.gameId===id && ['form','information'].includes(this.stage);
  try{const info=await client.inspect();if(!valid())return false;if(info.gameId!==id)throw {code:'wrong_game'};this.info=info;this.inspectedAt=Information.now();if(this.message===this.inspectionError)this.message=this.inspectionPreviousMessage;this.resetInspectionError();return true;}
  catch(error){if(valid()){if(this.message!==this.inspectionError)this.inspectionPreviousMessage=this.message;this.message=this.inspectionError=errorText(error);}return false;}
  finally{if(this.refreshing===ticket)this.refreshing=null;}
 }
 async connect(){
  if(!this.active || this.busy)return false;
  if(!this.info && !await this.inspect())return false;
  const name=this.name.text.trim();if(this.mode!=='administrator' && !Names.validName(name)){this.message=I18n.getString(1021);this.focus='name';return false;}
  this.resetInspectionError();const sequence=++this.sequence;this.busy=true;this.message=I18n.getString(1013);
  try{
   const existing=this.find(this.client.address,this.info.gameId,name,this.mode==='administrator'?'administrator':'player');
   if(existing){if(this.owned)this.client.disconnect();this.client=existing;this.owned=false;}
   const client=this.client,password=this.password.text,remember=this.rememberPassword,passwordId=this.passwordIdentity();
   const model=existing?await existing.rejoin(this.password.text):this.mode==='administrator'?await this.client.connect({password:this.password.text,gameId:this.info.gameId}):await this.client.connect({name,password:this.password.text,mode:this.mode,gameId:this.info.gameId,admissionCode:this.mode==='join'?this.admissionCode.text.trim():''});
   if(sequence!==this.sequence || !this.active){if(this.owned)client.disconnect({keepView:true});return false;}
   this.install(model,this.client);if(this.hostPreferences)this.hostPreferences.upsert({...this.client.descriptor(),title:this.info.title});if(this.passwordPreferences && passwordId)this.passwordPreferences.write(passwordId,password,remember);this.savedPasswordLoaded=false;this.rememberPassword=false;this.password.text='';this.admissionCode.text='';this.client=null;this.active=false;this.message='';return true;
  }catch(error){if(sequence===this.sequence && this.active)this.message=errorText(error);return false;}
  finally{if(sequence===this.sequence)this.busy=false;}
 }
 action(action,value){
  if(action==='cancel')return this.cancel();if(action==='scrollUp' || action==='scrollDown')return this.scroll((action==='scrollUp'?-1:1)*(this.scrollStep || 64));if(this.busy)return false;
  if(action==='gameInformation'){if(!this.info)return false;this.stage='information';this.informationPage=0;return true;}
  if(this.stage==='information'){if(action==='backInformation'){this.stage='form';return true;}if(action==='inspect'){this.informationPage=0;return this.refreshInfo();}if(action==='previous' || action==='next'){this.informationPage=Math.max(0,(this.informationPage || 0)+(action==='next'?1:-1));return true;}return false;}
  if(action==='lan' || action==='refreshLan')return this.openLan();if(action==='savedHosts')return this.openSavedHosts();
  if(this.stage==='lan'){if(action==='chooseLan')return this.chooseLan();if(action==='directAddress'){this.stopDiscovery();this.stage='form';this.clearInfo();this.focus='address';this.message='';return true;}const keyFor=require('./network-discovery.js').identity;if(action==='selectLan'){if(!this.lanRows.some(r=>keyFor(r)===value))return false;this.lanSelection=value;return true;}if(action==='previous' || action==='next'){this.page=Math.max(0,Math.min(Math.ceil(this.lanRows.length/4)-1,this.page+(action==='next'?1:-1)));this.lanSelection=this.lanRows[this.page*4]?keyFor(this.lanRows[this.page*4]):null;return true;}return false;}
if(this.stage==='hosts'){if(action==='addSavedHost')return this.addSavedHost();if(action==='removeSavedHost')return this.removeSavedHost();if(action==='chooseSavedHost')return this.chooseSavedHost();if(action==='directAddress'){this.stage='form';this.clearInfo();this.focus='address';this.message='';return true;}if(action==='selectSavedHost'){if(!this.savedHosts.some(r=>require('./network-host-preferences.js').identity(r)===value))return false;this.savedSelection=value;this.focus='savedHosts';return true;}if(action==='previous' || action==='next'){this.page=Math.max(0,Math.min(Math.ceil(this.savedHosts.length/4)-1,this.page+(action==='next'?1:-1)));this.savedSelection=this.savedHosts[this.page*4]?require('./network-host-preferences.js').identity(this.savedHosts[this.page*4]):null;return true;}return false;}
  if(action==='rememberPassword'){if(!this.passwordPreferences)return false;this.rememberPassword=!this.rememberPassword;return true;}if(action==='inspect')return this.inspect();if(action==='connect')return this.connect();
  if(['join','rejoin','administrator'].includes(action)){this.bodyScroll=0;this.revealFocus=true;if((this.mode==='administrator')!==(action==='administrator')){if(this.owned && this.client)this.client.disconnect({keepView:true});this.client=null;this.owned=false;this.info=null;this.clearPasswordIdentity();}this.mode=action;if(action!=='join'){this.admissionCode.text='';if(action==='administrator' || this.focus==='admissionCode')this.focus='password';}this.loadSavedPassword();this.message='';return true;}
  if((action==='previous' || action==='next') && this.info){this.page=Math.max(0,Math.min(Math.ceil(this.info.slots.length/4)-1,this.page+(action==='next'?1:-1)));return true;}
  return false;
 }
 key(key,pdgRef=globalThis.pdg){
  if(key===pdgRef.key_Escape)return this.stage==='information' && !this.busy?this.action('backInformation'):this.cancel();if(this.busy)return true;
  if(this.stage==='form' && (key===pdgRef.key_PageUp || key===pdgRef.key_PageDown)){this.scroll(key===pdgRef.key_PageUp?-120:120);return true;}
  if(this.stage==='information'){if(key===82 || key===114)this.action('inspect');return true;}
  if(this.stage==='lan'){if([13,10,3].includes(key)){this.chooseLan();return true;}if(key===82 || key===114){this.openLan();return true;}if(key===pdgRef.key_UpArrow || key===pdgRef.key_DownArrow){const keyFor=require('./network-discovery.js').identity,index=Math.max(0,Math.min(this.lanRows.length-1,this.lanRows.findIndex(r=>keyFor(r)===this.lanSelection)+(key===pdgRef.key_UpArrow?-1:1)));this.lanSelection=this.lanRows[index]?keyFor(this.lanRows[index]):null;this.page=Math.floor(index/4);}return true;}
  if(this.stage==='hosts'){if(key===pdgRef.key_Tab){this.focus=this.focus==='address'?'savedHosts':'address';return true;}if(key===pdgRef.key_UpArrow || key===pdgRef.key_DownArrow){const keyFor=require('./network-host-preferences.js').identity,index=Math.max(0,Math.min(this.savedHosts.length-1,this.savedHosts.findIndex(r=>keyFor(r)===this.savedSelection)+(key===pdgRef.key_UpArrow?-1:1)));this.savedSelection=this.savedHosts[index]?keyFor(this.savedHosts[index]):null;this.page=Math.floor(index/4);this.focus='savedHosts';return true;}if([13,10,3].includes(key)){this.focus==='address'?this.addSavedHost():this.chooseSavedHost();return true;}if(this.focus==='address')Names.edit(this.address,key,pdgRef);return true;}
  if(key===pdgRef.key_Tab){const fields=[...(this.mode==='administrator'?['address','password']:['address','name','password',...(this.mode==='join'?['admissionCode']:[])]),...(this.passwordPreferences?['rememberPassword']:[])];this.revealFocus=true;this.focus=fields[(fields.indexOf(this.focus)+1)%fields.length];if(this.focus!=='rememberPassword')this[this.focus].selected=true;return true;}
  if(this.focus==='rememberPassword'){if(key===32)this.action('rememberPassword');else if([13,10,3].includes(key))this.connect();return true;}
  if([13,10,3].includes(key)){if(this.focus==='address')this.inspect();else this.connect();return true;}
  const before=this[this.focus].text;Names.edit(this[this.focus],key,pdgRef);
  if(this[this.focus].text!==before){this.message='';if(this.focus==='address'){this.clearInfo();this.clearPasswordIdentity();}else if(this.focus==='name'){this.clearPasswordIdentity();this.loadSavedPassword();}else if(this.focus==='password')this.savedPasswordLoaded=false;}return true;
 }
 layout(width,height,measure=(text,size)=>Array.from(String(text)).length*size/2){
  if(this.active && this.stage==='form' && width<400)return this.compactLayout(width,height,measure);
  const layout=this.baseLayout(width,height,measure);if(!layout)return null;
  const {rect,scale}=layout,inner=rect.width-48,baseline=rect.y+(layout.messageY || 477)*scale;layout.statusLines=[];
  if(!this.message)return layout;
  let size=12;while(size>9 && measure(this.message,size)>inner)size--;
  if(measure(this.message,size)<=inner){layout.statusLines=[{text:this.message,size,point:{x:rect.x+24,y:baseline}}];return layout;}
  const lines=require('./text-wrapping.js')(this.message,inner,text=>measure(text,size)),pitch=size+1,heightNeeded=size+(lines.length-1)*pitch;
  const occupied=['fields','slots','checks','choices','buttons','labels'].flatMap(key=>(layout[key] || []).map(item=>item.rect));
  if(this.info && layout.kind!=='information')for(const y of [layout.infoTitleY || 260,layout.infoCountsY || 282])occupied.push({y:rect.y+y*scale-13,height:16});
  let top=rect.y+44*scale;const bottom=rect.y+rect.height-12,gaps=[];
  for(const area of occupied.sort((a,b)=>a.y-b.y)){if(area.y>top)gaps.push({top,bottom:Math.min(area.y,bottom)});top=Math.max(top,area.y+area.height);}
  if(top<bottom)gaps.push({top,bottom});
  const distance=gap=>Math.abs(Math.max(gap.top,Math.min(gap.bottom,baseline))-baseline);
  const gap=gaps.filter(gap=>gap.bottom-gap.top>=heightNeeded).sort((a,b)=>distance(a)-distance(b))[0] || gaps.sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))[0];
  const first=gap?Math.max(gap.top+size*.8,Math.min(baseline-(lines.length-1)*pitch/2,gap.bottom-size*.2-(lines.length-1)*pitch)):baseline;
  layout.statusLines=lines.map((text,index)=>({text,size,point:{x:rect.x+24,y:first+index*pitch}}));return layout;
 }
 scroll(delta){
  if(this.stage!=='form' || !this.scrollLimit)return false;
  this.revealFocus=false;this.bodyScroll=Math.max(0,Math.min(this.scrollLimit,(this.bodyScroll || 0)+delta));return true;
 }
 compactLayout(width,height,measure){
  const Caption=require('./button-caption.js'),wrap=require('./text-wrapping.js');
  const rect={x:12,y:12,width:width-24,height:height-24},scale=rect.height/548;
  const inner=rect.width-48,left=rect.x+24,bottom=rect.y+rect.height-12;
  const button=(action,id,key=null)=>({action,label:I18n.getString(id),key});
  const pack=(buttons,available)=>{
   let rows=[[]],used=0;for(const b of buttons){let size=12;
    while(size>9 && Caption.width(b.label,b.key,measure,{size})+12>available)size--;
    b.size=size;const w=Math.min(available,Caption.width(b.label,b.key,measure,{size})+12);
    if(used && used+6+w>available){rows.push([]);used=0;}
    b.rect={x:left+used,y:0,width:w,height:24};rows[rows.length-1].push(b);used+=w+6;
   }return rows;
  };
  const footer=[button('cancel',683,'Esc'),...(this.hostPreferences?[button('savedHosts',1183)]:[]),...(this.discovery?[button('lan',1191)]:[]),button('connect',this.mode==='administrator'?1163:this.mode==='rejoin'?1011:1010,'Enter')];
  const footerRows=pack(footer,inner),footerTop=bottom-footerRows.length*30+6;
  footerRows.forEach((row,index)=>row.forEach(b=>b.rect.y=footerTop+index*30));
  const status=wrap(this.message || '',inner,text=>measure(text,12));
  const statusHeight=status.length?status.length*14+8:0,statusTop=footerTop-statusHeight;
  const bodyClip={x:left,y:rect.y+44,width:inner,height:Math.max(40,statusTop-(rect.y+44)-8)};
  const bodyWidth=inner-22,fields=[],slots=[],checks=[],labels=[],bodyButtons=[];let y=bodyClip.y;
  const names=this.mode==='administrator'?['address','password']:['address','name','password',...(this.mode==='join'?['admissionCode']:[])];
  const fieldLabels=names.map(name=>I18n.getString(name==='admissionCode'?1147:name==='password'?1008:name==='name'?1007:1006));
  const column=Math.min(bodyWidth-80,Math.max(100,...fieldLabels.map(label=>Math.ceil(measure(label,12))+10)));
  for(const [index,name] of names.entries()){
   fields.push({name,label:fieldLabels[index],labelWidth:column-10,rect:{x:left+column,y,width:bodyWidth-column,height:24},labelPoint:{x:left,y:y+17},baseline:17});y+=30;
  }
  const roles=[button('inspect',1009),button('join',1010),button('rejoin',1011),button('administrator',1163)];
  for(const row of pack(roles,bodyWidth)){for(const b of row){b.rect.y=y;bodyButtons.push(b);}y+=30;}
  const label=text=>{for(const line of wrap(text,bodyWidth,t=>measure(t,12))){labels.push({text:line,size:12,baseline:13,rect:{x:left,y,width:bodyWidth,height:16}});y+=16;}};
  if(this.info){
   label(I18n.formatString(1014,'',this.info.title,this.info.turn));y+=4;
   const details=button('gameInformation',1230);pack([details],bodyWidth);details.rect.y=y;bodyButtons.push(details);y+=30;
   label(I18n.formatString(1015,'',this.info.humans,this.info.computers));y+=6;
   if(this.mode!=='administrator'){
    for(const slot of this.info.slots.slice(this.page*4,this.page*4+4)){
     slots.push({slot,rect:{x:left,y,width:bodyWidth,height:24},baseline:17,label:slot.status==='open'?I18n.formatString(1016,'',slot.player):I18n.formatString(1017,'',slot.player,slot.name,I18n.getString(slot.online?1018:1019))});y+=28;
    }
    if(this.info.slots.length>4){const pager=[button('previous',1033),button('next',1034)];pager[0].disabled=this.page===0;pager[1].disabled=(this.page+1)*4>=this.info.slots.length;for(const row of pack(pager,bodyWidth)){for(const b of row){b.rect.y=y;bodyButtons.push(b);}y+=30;}}
   }
  }
  if(this.passwordPreferences){checks.push({action:'rememberPassword',label:I18n.getString(1182),value:this.rememberPassword,rect:{x:left,y,width:bodyWidth,height:24}});y+=28;}
  this.scrollStep=Math.min(64,bodyClip.height/2);this.scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height);this.bodyScroll=Math.max(0,Math.min(this.scrollLimit,this.bodyScroll || 0));
  if(this.revealFocus){const target=fields.find(f=>f.name===this.focus) || (this.focus==='rememberPassword'?checks[0]:null);
   if(target){if(target.rect.y-this.bodyScroll<bodyClip.y)this.bodyScroll=target.rect.y-bodyClip.y;else if(target.rect.y+target.rect.height-this.bodyScroll>bodyClip.y+bodyClip.height)this.bodyScroll=target.rect.y+target.rect.height-bodyClip.y-bodyClip.height;}
   this.revealFocus=false;
  }
  for(const item of [...fields,...slots,...checks,...labels,...bodyButtons]){item.body=true;item.rect.y-=this.bodyScroll;if(item.labelPoint)item.labelPoint.y-=this.bodyScroll;}
  const scrollButtons=this.scrollLimit?[{action:'scrollUp',label:'↑',disabled:this.bodyScroll===0,rect:{x:left+bodyWidth+2,y:bodyClip.y,width:20,height:24}},{action:'scrollDown',label:'↓',disabled:this.bodyScroll===this.scrollLimit,rect:{x:left+bodyWidth+2,y:bodyClip.y+bodyClip.height-24,width:20,height:24}}]:[];
  const scrollTrack=this.scrollLimit?{x:left+bodyWidth+10,y:bodyClip.y+28,width:4,height:Math.max(4,bodyClip.height-56)}:null;
  const scrollThumb=scrollTrack?{...scrollTrack,height:Math.max(4,scrollTrack.height*bodyClip.height/(bodyClip.height+this.scrollLimit))}:null;
  if(scrollThumb)scrollThumb.y+=(scrollTrack.height-scrollThumb.height)*this.bodyScroll/this.scrollLimit;
  return {rect,scale,compact:true,titleHeight:40,scrollTrack,scrollThumb,bodyClip,fields,slots,checks,labels,buttons:[...bodyButtons,...footer,...scrollButtons],statusLines:status.map((text,index)=>({text,size:12,point:{x:left,y:statusTop+12+index*14}}))};
 }
 baseLayout(width,height,measure){
  if(!this.active)return null;const rect={width:Math.min(560,width-24),height:Math.min(548,height-24)};
  rect.x=(width-rect.width)/2;rect.y=(height-rect.height)/2;const scale=rect.height/548,at=(x,y,w,h)=>({x:rect.x+x,y:rect.y+y*scale,width:w,height:h*scale});
  const fieldsFor=(names,start,step)=>{
   const labels=names.map(name=>I18n.getString(name==='admissionCode'?1147:name==='password'?1008:name==='name'?1007:1006));
   const inner=rect.width-48,column=Math.min(inner-80,Math.max(116,...labels.map(label=>Math.ceil(measure(label,13))+12)));
   return names.map((name,index)=>({name,label:labels[index],labelWidth:column-12,rect:at(24+column,start+index*step,inner-column,32),labelPoint:{x:rect.x+24,y:rect.y+(start+21+index*step)*scale}}));
  };
  if(this.stage==='information'){
   const inner=rect.width-48,top=62*scale,lineHeight=18,pageSize=Math.max(1,Math.floor((452*scale-top-28)/lineHeight));
   const pages=[];let page=[];
   for(const row of Information.rows(this.info,this.inspectedAt)){
    const lines=Information.wrap(row.text,inner,measure).map(text=>({...row,text}));
    // Keep a wrapped setting's label and value on the same page. A long
    // player-supplied title can still span pages without losing characters.
    if(lines.length<=pageSize && page.length+lines.length>pageSize){pages.push(page);page=[];}
    for(const line of lines){if(page.length===pageSize){pages.push(page);page=[];}page.push(line);}
   }
   if(page.length || !pages.length)pages.push(page);this.informationPage=Math.max(0,Math.min(this.informationPage || 0,pages.length-1));
   const buttons=[...(pages.length>1?[{action:'previous',id:1033,disabled:this.informationPage===0,rect:at(24,452,inner/2-4,28)},{action:'next',id:1034,disabled:this.informationPage===pages.length-1,rect:at(28+inner/2,452,inner/2-4,28)}]:[]),{action:'backInformation',id:1243,key:'Esc',rect:at(24,496,inner/2-4,30)},{action:'inspect',id:1197,key:'R',rect:at(28+inner/2,496,inner/2-4,30)}];
   return {rect,scale,kind:'information',title:I18n.getString(1229),messageY:452-8/scale,fields:[],slots:[],checks:[],labels:pages[this.informationPage].map((row,i)=>({...row,size:12,baseline:14,rect:{x:rect.x+24,y:rect.y+top+i*lineHeight,width:inner,height:lineHeight}})),buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  if(this.stage==='lan'){
   const inner=rect.width-48,keyFor=require('./network-discovery.js').identity,third=(inner-16)/3,buttons=[{action:'refreshLan',id:1197,key:'R',rect:at(24,62,this.hostPreferences?inner/2-4:inner,28)},...(this.hostPreferences?[{action:'savedHosts',id:1183,rect:at(28+inner/2,62,inner/2-4,28)}]:[]),...(this.lanRows.length>4?[{action:'previous',id:1033,disabled:this.page===0,rect:at(24,428,inner/2-4,24)},{action:'next',id:1034,disabled:(this.page+1)*4>=this.lanRows.length,rect:at(28+inner/2,428,inner/2-4,24)}]:[]),{action:'cancel',id:683,key:'Esc',rect:at(24,496,third,30)},{action:'directAddress',id:1189,rect:at(32+third,496,third,30)},{action:'chooseLan',id:1186,key:'Enter',disabled:!this.lanSelection,rect:at(40+2*third,496,third,30)}];
   return {rect,scale,title:I18n.getString(1192),messageY:480,fields:[],slots:[],checks:[],labels:!this.lanRows.length && !this.message?[{text:I18n.getString(1194),rect:at(24,180,inner,40)}]:[],choices:this.lanRows.slice(this.page*4,this.page*4+4).map((row,i)=>({action:'selectLan',value:keyFor(row),active:keyFor(row)===this.lanSelection,label:row.title || row.address,details:[row.address,I18n.formatString(1198,'',row.turn,row.open,row.humans)],rect:at(24,96+i*80,inner,72)})),buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  if(this.stage==='hosts'){
   const inner=rect.width-48,keyFor=require('./network-host-preferences.js').identity,buttons=[{action:'addSavedHost',id:1184,rect:at(24,104,inner/2-4,28)},{action:'directAddress',id:1189,rect:at(28+inner/2,104,inner/2-4,28)},...(this.savedHosts.length>4?[{action:'previous',id:1033,disabled:this.page===0,rect:at(24,398,inner/2-4,24)},{action:'next',id:1034,disabled:(this.page+1)*4>=this.savedHosts.length,rect:at(28+inner/2,398,inner/2-4,24)}]:[]),{action:'removeSavedHost',id:1185,disabled:!this.savedSelection,rect:at(24,436,inner,28)},{action:'cancel',id:683,key:'Esc',rect:at(24,496,inner/2-4,30)},{action:'chooseSavedHost',id:1186,key:'Enter',disabled:!this.savedSelection,rect:at(28+inner/2,496,inner/2-4,30)}];
   return {rect,scale,title:I18n.getString(1183),messageY:480,fields:fieldsFor(['address'],62,0),slots:[],checks:[],labels:!this.savedHosts.length?[{text:I18n.getString(1187),rect:at(24,180,inner,40)}]:[],choices:this.savedHosts.slice(this.page*4,this.page*4+4).map((row,i)=>({action:'selectSavedHost',value:keyFor(row),active:keyFor(row)===this.savedSelection,label:row.title || row.address,detail:[row.title?row.address:'',row.role==='administrator'?I18n.getString(1190):row.name].filter(Boolean).join(' · '),rect:at(24,158+i*56,inner,50)})),buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
  }
  const inner=rect.width-48;
  const names=this.mode==='administrator'?['address','password']:['address','name','password',...(this.mode==='join'?['admissionCode']:[])],start=this.mode==='join'?46:62,step=this.mode==='join'?34:42;
  const fields=fieldsFor(names,start,step);
  const buttons=[{action:'inspect',id:1009,key:null,rect:at(24,190,inner/4-6,30)},
   {action:'join',id:1010,rect:at(24+inner/4,190,inner/4-6,30)},
   {action:'rejoin',id:1011,rect:at(24+inner*2/4,190,inner/4-6,30)},
   {action:'administrator',id:1163,rect:at(24+inner*3/4,190,inner/4,30)},
   {action:'cancel',id:683,key:'Esc',rect:at(24,496,inner/2-4,30)},
   {action:'connect',id:this.mode==='administrator'?1163:this.mode==='rejoin'?1011:1010,key:'Enter',rect:at(28+inner/2,496,inner/2-4,30)}];
  if(this.discovery){const count=this.hostPreferences?4:3,w=(inner-8*(count-1))/count;buttons.find(b=>b.action==='cancel').rect=at(24,496,w,30);let index=1;if(this.hostPreferences)buttons.push({action:'savedHosts',id:1183,rect:at(24+index++*(w+8),496,w,30)});buttons.push({action:'lan',id:1191,rect:at(24+index++*(w+8),496,w,30)});buttons.find(b=>b.action==='connect').rect=at(24+index*(w+8),496,w,30);}
  else if(this.hostPreferences){const third=(inner-16)/3;buttons.find(b=>b.action==='cancel').rect=at(24,496,third,30);buttons.find(b=>b.action==='connect').rect=at(40+2*third,496,third,30);buttons.push({action:'savedHosts',id:1183,rect:at(32+third,496,third,30)});}
  if(this.mode!=='administrator' && this.info && this.info.slots.length>4)buttons.push({action:'previous',id:1033,rect:at(24,404,inner/2-4,24)},{action:'next',id:1034,rect:at(28+inner/2,404,inner/2-4,24)});
  const informationWidth=Math.min(inner/2,Math.max(84,Math.ceil(measure(I18n.getString(1230),12))+24));
  if(this.info)buttons.push({action:'gameInformation',id:1230,rect:at(24+inner-informationWidth,228,informationWidth,30)});
  const slots=this.mode!=='administrator' && this.info?this.info.slots.slice(this.page*4,this.page*4+4).map((slot,index)=>({slot,rect:at(24,282+index*28,inner,26),label:slot.status==='open'?I18n.formatString(1016,'',slot.player):I18n.formatString(1017,'',slot.player,slot.name,I18n.getString(slot.online?1018:1019))})):[];
  return {rect,scale,infoTitleY:244,infoTitleWidth:inner-informationWidth-12,infoCountsY:266,messageY:480,fields,slots,checks:this.passwordPreferences?[{action:'rememberPassword',label:I18n.getString(1182),value:this.rememberPassword,rect:at(24,436,inner,24)}]:[],buttons:buttons.map(b=>({...b,label:I18n.getString(b.id)}))};
 }
}
module.exports={JoinWindow,errorText,errorIds};
