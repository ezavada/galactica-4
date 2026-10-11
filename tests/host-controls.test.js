const I18n=require('../src/js/i18n.js');
const test=require('./test-framework.js'),fs=require('fs'),path=require('path'),os=require('os'),Host=require('../src/js/network-host.js').NetworkHost,Save=require('../src/js/game-save.js'),{HostWindow}=require('../src/js/network-host-setup.js');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-host-controls-'));try{const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1,maxTimePerTurn:300,endEarly:false},path.join(dir,'host.json'));fn(host);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
function form(pending=Array.from({length:7},(_,i)=>({player:i+1,name:'Captain '+i+' 星'}))){const record={},state={address:'http://127.0.0.1:1',title:'Host',info:{turn:2,clock:{paused:false,secondsRemaining:300}},administration:{complete:false,pending,players:[]}},backend={latest:()=>record,supported:true,describe:()=>state};const window=new HostWindow(backend,()=>true);window.open();return {window,state,backend};}
module.exports=()=>test.describe('Desktop host turn administration',()=>{
 test.it('shows the selected remote host connection failure above a stale operation caption in every language',()=>{
  const status=require('../src/js/network-host-status.js'),language=pdg.res.getLanguage(),client={},other={};
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const expired=I18n.getString(1031),window={record:{remoteAdministrator:true,client},message:I18n.getString(1030)},sessions=[{network:other,networkError:I18n.getString(1032)},{network:client,networkError:expired}];
   test.assertEqual(status.message(window,sessions),expired);sessions[1].networkError=null;test.assertEqual(status.message(window,sessions),window.message);window.message='';test.assertEqual(status.message(window,sessions),'');
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('isolates host status from unrelated client sessions and local host windows',()=>{
  const status=require('../src/js/network-host-status.js'),client={},sessions=[{network:client,networkError:'expired'},{network:undefined,networkError:'unrelated'}];
  for(const record of [null,{}, {client}, {remoteAdministrator:true,client:{} }])test.assertEqual(status.message({record,message:'local'},sessions),'local');
  test.assertEqual(status.message({record:{remoteAdministrator:true,client},message:''},sessions),'expired');test.assertEqual(status.message({record:null},sessions),'');
 });
 test.it('forces each requested turn once, rejects stale requests and continues after a recorded result',()=>fixture(host=>{
  host.server={};host.pauseClock();host.forceEndTurn(1);test.assertEqual(host.game.turn,2);test.assertTrue(host.clock.paused);test.assertEqual(Host.open(host.file).game.turn,2);const before=Save.serialize(host.game);let code;try{host.forceEndTurn(1);}catch(e){code=e.code;}test.assertEqual(code,'stale_host_turn');test.assertEqual(Save.serialize(host.game),before);host.game.markGameWon(1);host.forceEndTurn(2);test.assertEqual(host.game.turn,3);test.assertTrue(host.game.postGame);test.assertEqual(host.game.victoryTurn,2);
 }));
 test.it('rolls back a forced turn and paused clock on a failed save, then retries durably',()=>fixture(host=>{
  host.server={};host.pauseClock();const before=Save.serialize(host.game),clock=host.clock.snapshot(),persist=host.persist;host.persist=()=>{throw Error('disk full');};let code;try{host.forceEndTurn(1);}catch(e){code=e.code;}test.assertEqual(code,'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertDeepEqual(host.clock.snapshot(),clock);test.assertEqual(fs.readFileSync(host.file,'utf8'),before);host.persist=persist;host.forceEndTurn(1);test.assertEqual(Host.open(host.file).game.turn,2);test.assertTrue(host.clock.paused);
 }));
 test.it('captures every unposted player across pages and cancels back to live host status',()=>{
  const {window:w,state}=form();test.assertTrue(w.requestEnd());test.assertEqual(w.stage,'endTurn');test.assertEqual(w.confirmation.turn,2);state.administration.pending[0].name='Changed';test.assertEqual(w.confirmation.pending[0].name,'Captain 0 星');test.assertEqual(w.layout(800,600).labels.filter(l=>l.text.includes('Captain')).length,4);w.action('next');test.assertEqual(w.page,1);test.assertEqual(w.layout(800,600).labels.filter(l=>l.text.includes('Captain')).length,3);test.assertTrue(w.layout(800,600).buttons.find(b=>b.action==='next').disabled);w.action('next');test.assertEqual(w.page,1);w.action('previous');test.assertEqual(w.page,0);w.busy=true;test.assertFalse(w.cancel());w.busy=false;test.assertTrue(w.cancel());test.assertEqual(w.stage,'hosting');test.assertTrue(w.active);test.assertEqual(w.confirmation,null);
 });
 test.it('bounds translated controls and confirmation labels with visible error placement',()=>{
  const old=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const {window:w,state}=form();let layout=w.layout(800,600);test.assertEqual(layout.buttons.find(b=>b.action==='pause').label,pdg.res.getString(1116));state.info.clock.paused=true;test.assertEqual(w.layout(800,600).buttons.find(b=>b.action==='resumeClock').label,pdg.res.getString(1117));w.requestEnd();layout=w.layout(800,600);test.assertEqual(layout.title,pdg.res.getString(1109));for(const item of [...layout.labels,...layout.buttons]){const r=item.rect,b=layout.rect;test.assertTrue(r.x>=b.x && r.y>=b.y && r.x+r.width<=b.x+b.width && r.y+r.height<=b.y+b.height);}test.assertTrue(layout.messageY<layout.buttons.find(b=>b.action==='confirmEnd').rect.y-layout.rect.y);}}finally{pdg.res.setLanguage(old);}
 });
 test.it('disables controls for complete hosts and hides them until a listener starts',()=>{
  const {window:w,state}=form();state.administration.complete=true;test.assertTrue(w.layout(800,600).buttons.filter(b=>['pause','endNow'].includes(b.action)).every(b=>b.disabled));test.assertFalse(w.requestEnd());state.address=null;test.assertFalse(w.layout(800,600).buttons.some(b=>['pause','endNow'].includes(b.action)));test.assertFalse(w.requestEnd());
 });
});
