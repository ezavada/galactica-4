// A separate host-owner role, matching v3's password-gated observer/admin login.
const crypto=require('crypto'),{protocol}=require('./network-protocol.js'),{validPassword}=require('./admin-password.js');
function failure(code){const error=new Error(code);error.code=code;throw error;}
function hash(password,salt){return crypto.pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');}
function credentials(password){if(!validPassword(password))failure('invalid_admin_password');if(!password)return null;const salt=crypto.randomBytes(32).toString('hex');return {salt,hash:hash(password,salt)};}
function validateSaved(value){if(value!==undefined && (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==2 || ['salt','hash'].some(k=>typeof value[k]!=='string' || !/^[a-f0-9]{64}$/.test(value[k]))))failure('invalid_host_admin');}
class HostAdmin {
 constructor(host){this.host=host;this.sessions=new Map();validateSaved(host.game.config.networkHost.admin);const revision=host.game.config.networkHost.adminRevision;if(revision!==undefined && (!Number.isSafeInteger(revision) || revision<0))failure('invalid_host_admin');}
 get enabled(){return this.host.game.config.networkHost.admin!==undefined;}
 revision(){return this.host.game.config.networkHost.adminRevision || 0;}
 login(request){
  if(!request || typeof request!=='object' || Array.isArray(request) || Object.keys(request).some(k=>!['protocol','gameId','password'].includes(k)) || request.protocol!==protocol)failure('bad_protocol');
  if(!this.enabled)failure('admin_disabled');
  if(request.gameId!==this.host.game.config.networkHost.id)failure('wrong_game');
  if(!validPassword(request.password) || !request.password)failure('bad_password');
  const saved=this.host.game.config.networkHost.admin;if(!crypto.timingSafeEqual(Buffer.from(saved.hash,'hex'),Buffer.from(hash(request.password,saved.salt),'hex')))failure('bad_password');
  this.sessions.clear();const token=crypto.randomBytes(32).toString('hex');this.sessions.set(token,true);return {protocol,role:'administrator',gameId:request.gameId,token};
 }
 authenticate(token){if(!this.enabled || typeof token!=='string' || !this.sessions.has(token))failure('not_logged_in');return true;}
 logout(token){this.authenticate(token);this.sessions.delete(token);return {role:'administrator'};}
 disconnectAll(){this.sessions.clear();}
 state(token){this.authenticate(token);return {...require('./host-view.js').adminSnapshot(this.host.game),gameId:this.host.game.config.networkHost.id,clock:this.host.clock.info()};}
 status(token){
  this.authenticate(token);const host=this.host,game=host.game,Players=require('./host-players.js'),Settings=require('./host-settings.js'),Admission=require('./host-admission.js'),slots=game.config.getHumanPlayerSlots();
  return {protocol,role:'administrator',gameId:game.config.networkHost.id,info:host.info(),administration:{initialState:require('./initial-state-edit.js').describe(game),initialStateRevision:require('./initial-state-edit.js').revision(game),complete:game.isGameOver,players:Players.describe(game),playersRevision:Players.revision(game),settings:Settings.snapshot(game),settingsRevision:game.config.networkHost.settingsRevision || 0,admission:Admission.snapshot(game),admissionRevision:Admission.revision(game),pending:slots.flatMap((id,i)=>{const claim=game.config.networkHost.players[i],p=game.players[id];return claim && p.isAlive && p.lastTurnPosted<game.turn?[{player:id,name:claim.name}]:[];})}};
 }
 action(token,value){
  this.authenticate(token);if(!value || typeof value!=='object' || Array.isArray(value))failure('invalid_admin_action');
  const fields={pause:['action'],resume:['action'],end:['action','turn'],settings:['action','settings','revision'],player:['action','change','revision','turn'],admission:['action','policy','revision'],initialState:['action','change','revision','turn']},keys=typeof value.action==='string' && Object.hasOwn(fields,value.action)?fields[value.action]:null;
  if(!keys || Object.keys(value).length!==keys.length || Object.keys(value).some(k=>!keys.includes(k)))failure('invalid_admin_action');
  const host=this.host;
  if(['pause','resume','end'].includes(value.action) && host.game.isGameOver)failure('game_complete');
  if(value.action==='pause')host.pauseClock();else if(value.action==='resume')host.resumeClock();else if(value.action==='end')host.forceEndTurn(value.turn);else if(value.action==='settings')host.updateSettings(value.settings,value.revision);else if(value.action==='player')host.changePlayer(value.change,value.revision,value.turn);else if(value.action==='initialState')host.editInitialState(value.change,value.revision,value.turn);else host.updateAdmission(value.policy,value.revision);
  return this.status(token);
 }
 handle(req,res){
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'},respond=(status,body)=>{res.writeHead(status,headers);res.end(body===undefined?'':JSON.stringify(body));},token=()=>typeof req.headers.authorization==='string' && req.headers.authorization.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
  if(!['/admin/login','/admin/logout','/admin/status','/admin/state','/admin/view','/admin/action'].includes(req.url)){respond(404,{error:'not_found'});return;}
  if(req.method==='OPTIONS'){respond(204);return;}
  if(req.url==='/admin/view' && req.method==='GET'){try{respond(200,{...this.status(token()),state:this.state(token())});}catch(e){respond(e.code==='not_logged_in'?401:500,{error:e.code==='not_logged_in'?e.code:'host_state_failed'});}return;}
  if(req.url==='/admin/state' && req.method==='GET'){try{this.authenticate(token());respond(200,this.state(token()));}catch(e){respond(e.code==='not_logged_in'?401:500,{error:e.code==='not_logged_in'?e.code:'host_state_failed'});}return;}
  if(req.url==='/admin/status' && req.method==='GET'){try{respond(200,this.status(token()));}catch(e){respond(401,{error:e.code || 'not_logged_in'});}return;}
  if(req.method!=='POST'){respond(405,{error:'method_not_allowed'});return;}
  if(req.url!=='/admin/login'){try{this.authenticate(token());}catch(e){respond(401,{error:e.code || 'not_logged_in'});return;}}
  let body='',bytes=0,answered=false;req.setEncoding('utf8');req.on('error',()=>{answered=true;});req.on('data',part=>{bytes+=Buffer.byteLength(part);if(bytes>65536){if(!answered){answered=true;respond(413,{error:'admin_request_too_large'});}return;}body+=part;});
  req.on('end',()=>{if(answered)return;let value;try{value=JSON.parse(body);}catch(e){respond(400,{error:'invalid_admin_action'});return;}
   try{if(req.url==='/admin/login')respond(200,this.login(value));else if(req.url==='/admin/logout'){if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length)failure('invalid_admin_action');respond(200,this.logout(token()));}else if(req.url==='/admin/action')respond(200,this.action(token(),value));else respond(405,{error:'method_not_allowed'});}
   catch(e){const statuses={admin_disabled:403,bad_password:401,not_logged_in:401,wrong_game:409,bad_protocol:400,invalid_admin_action:400,invalid_initial_state:400,initial_state_closed:409,stale_initial_state:409,invalid_host_player:400,invalid_host_settings:400,invalid_host_admission:400,stale_host_player:409,stale_host_settings:409,stale_host_admission:409,stale_host_turn:409,game_complete:409};const status=statuses[e.code] || 500;respond(status,{error:status===500?'host_save_failed':e.code});}
  });
 }
}
module.exports={HostAdmin,credentials,validateSaved,validPassword};
