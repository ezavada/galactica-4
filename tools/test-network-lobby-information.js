// Actual native public inspections and settings updates; automated audio is muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),{JoinWindow}=require('../src/js/network-join.js'),Information=require('../src/js/network-game-information.js'),I18n=require('../src/js/i18n.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-lobby-'));let host=null,window=null;const peers=[];
(async()=>{
 for(const language of ['en','de','es','fr','ja','ru']){
  pdg.res.setLanguage(language);host=NetworkHost.create({numHumans:2,numComputers:1,sectorSize:1,density:1,compSkill:1,compAdvantage:3,fastGame:true,omniscient:false,maxTimePerTurn:172800,endEarly:false},path.join(directory,language+'.json'));
  host.game.turn=2;host.clock.reset(host.game,false);host.clock.remainingMs=315000;host.clock.pause();host.persist();const address=await host.listen();
  window=new JoinWindow({defaultName:()=> 'Editing '+language});window.open();window.address.text='http://127.0.0.1:'+address.port;window.password.text='secret draft';assert(await window.inspect());window.focus='password';window.action('gameInformation');
  assert.equal(window.info.skill,1);assert.equal(window.info.advantage,3);assert(window.info.fastGame);assert(window.info.fogOfWar);assert.equal(window.info.clock.secondsRemaining,315);
  host.updateSettings({compSkill:5,compAdvantage:-3,fastGame:false,omniscient:true,maxTimePerTurn:3600,endEarly:true},0);
  for(let i=1;i<=2;i++){const peer=new NetworkClient(window.address.text);await peer.connect({name:'Player '+i+' '+language,password:'test password'});peers.push(peer);}
  window.nextInspection=0;assert(await window.poll());assert.equal(window.stage,'information');assert.equal(window.focus,'password');assert.equal(window.name.text,'Editing '+language);assert.equal(window.password.text,'secret draft');
  assert.equal(window.info.skill,5);assert.equal(window.info.advantage,-3);assert(!window.info.fastGame);assert(!window.info.fogOfWar);assert(window.info.endEarly);assert.equal(window.info.maxTimePerTurn,3600);assert.equal(window.info.clock.limitSeconds,172800);assert.equal(window.info.clock.secondsRemaining,315);
  const rows=Information.rows(window.info,window.inspectedAt),text=key=>rows.find(r=>r.key===key).text;
  assert.equal(text('ai'),I18n.formatString(1232,'',I18n.getString(305),'-3'));assert.equal(text('status'),I18n.formatString(1238,'',I18n.getString(1240)));assert.equal(text('activeLimit'),I18n.formatString(1237,'',Information.duration(172800)));assert.equal(text('clock'),I18n.formatString(1046,'','00:05:15'));
  // A real malformed HTTP response must preserve the last inspected information,
  // show a safe localized error, and permit recovery on the next public query.
  const original=host.handle.bind(host),snapshot=window.info;let malformed=true;
  host.handle=(req,res)=>{if(req.url==='/info' && malformed){malformed=false;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({...host.info(),clock:{secondsRemaining:-1,paused:false,running:true}}));return;}original(req,res);};
  window.nextInspection=0;assert.equal(await window.poll(),false);assert.equal(window.info,snapshot);assert.equal(window.message,I18n.getString(1029));assert.equal(window.password.text,'secret draft');window.nextInspection=0;assert(await window.poll());assert.equal(window.message,'');
  window.key(pdg.key_Escape);assert.equal(window.stage,'form');assert(window.active);assert.equal(window.password.text,'secret draft');
  window.mode='rejoin';window.name.text='Player 1 '+language;assert.equal(await window.connect(),false);assert.equal(window.message,I18n.getString(1022));
  assert(await window.refreshInfo());assert.equal(window.message,I18n.getString(1022));malformed=true;assert.equal(await window.refreshInfo(),false);assert.equal(window.message,I18n.getString(1029));assert(await window.refreshInfo());assert.equal(window.message,I18n.getString(1022));
  window.focus='password';window.password.selected=true;window.key(65);assert.equal(window.message,'');malformed=true;assert.equal(await window.refreshInfo(),false);assert.equal(window.message,I18n.getString(1029));assert(await window.refreshInfo());assert.equal(window.message,'');assert.equal(window.password.text,'A');window.cancel();window=null;
  while(peers.length)await peers.pop().disconnect();await host.close();host=null;
 }
 console.log('PASS native public lobby information in six languages: real read-only HTTP refresh, live full-slot and editable settings changes, configured/current timer distinction, exact paused countdown, preserved credentials/focus, malformed-clock rejection and recovery, actual wrong-password denial retained through metadata refresh/failure/recovery and cleared by editing');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{try{if(window)window.cancel();while(peers.length)await peers.pop().disconnect();if(host)await host.close();}finally{fs.rmSync(directory,{recursive:true,force:true});process.exit(process.exitCode || 0);}});
