const test=require('./test-framework.js'),fs=require('fs'),os=require('os'),path=require('path');
const Clock=require('../src/js/client-clock.js'),State=require('../src/js/client-state.js'),Display=require('../src/js/display.js'),{NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),I18n=require('../src/js/i18n.js');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-countdown-'));try{
 const host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,maxTimePerTurn:172800,endEarly:false},path.join(dir,'host.json'));
 host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'Second'});host.game.turn=2;host.clock.reset(host.game,false);host.clock.remainingMs=315000;host.clock.pause();host.persist();
 const data=()=>host.playerState(2),model=State.restore(data());fn({host,data,model});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
module.exports=()=>test.describe('Authoritative client countdown presentation',()=>{
 test.it('restores only public countdown metadata and does not share mutable transport objects',()=>fixture(({data,model})=>{
  test.assertEqual(model.clientClock.secondsRemaining,315);test.assertTrue(model.clientClock.paused);test.assertFalse(model.clientClock.running);const source=data(),fresh=State.restore(source);source.clock.secondsRemaining=1;test.assertEqual(fresh.clientClock.secondsRemaining,315);test.assertFalse('networkHost' in model.config);
 }));
 test.it('rejects malformed, impossible and oversized host clocks before installing client state',()=>fixture(({data})=>{
  for(const clock of [null,[],{}, {secondsRemaining:null,paused:false,running:false},{secondsRemaining:-1,paused:false,running:true},{secondsRemaining:172801,paused:false,running:true},{secondsRemaining:1.5,paused:false,running:true},{secondsRemaining:NaN,paused:false,running:true},{secondsRemaining:1,paused:true,running:true},{secondsRemaining:null,paused:false,running:true},{secondsRemaining:1,paused:'yes',running:false}]){const s=data();s.clock=clock;let rejected=false;try{State.restore(s);}catch(e){rejected=e.message==='invalid_player_state';}test.assertTrue(rejected);}
  for(const update of [s=>s.turn=1,s=>s.isGameOver=true,s=>s.config.maxTimePerTurn=0]){const s=data();update(s);let rejected=false;try{State.restore(s);}catch(e){rejected=e.message==='invalid_player_state';}test.assertTrue(rejected);}
 }));
 test.it('ticks running host samples monotonically, holds paused/stopped samples and clamps at zero',()=>fixture(({model})=>{
  model.clientClock=Clock.receive({secondsRemaining:299,paused:false,running:true},model,1000);test.assertEqual(Clock.seconds(model.clientClock,3000),297);test.assertEqual(Clock.seconds(model.clientClock,0),299);test.assertEqual(Clock.seconds(model.clientClock,999999),0);
  for(const flags of [{paused:true,running:false},{paused:false,running:false}]){const clock=Clock.receive({secondsRemaining:299,...flags},model,1000);test.assertEqual(Clock.seconds(clock,999999),299);}
 }));
 test.it('uses v3 minute/hour/day boundaries without wrapping large durations',()=>{
  test.assertEqual(Clock.duration(0),'0:00');test.assertEqual(Clock.duration(299),'4:59');test.assertEqual(Clock.duration(300),'0:05');test.assertEqual(Clock.duration(3600),'1:00');test.assertEqual(Clock.duration(86400),'24:00');test.assertEqual(Clock.duration(172799),'47:59');test.assertEqual(Clock.duration(172800),I18n.formatString(1048,'',2));
 });
 test.it('replaces same-turn clock samples while preserving local orders, selection and camera',()=>fixture(({host,data,model})=>{
  const client=new NetworkClient('http://127.0.0.1:1234');client.install(model);const home=model.stars.find(e=>e.owner===2);home.growth.desired=61;model.selectedObject=home;model.savedCamera={zoom:1.5,panX:25,panY:20};
  host.clock.remainingMs=8000;host.clock.paused=false;const fresh=State.restore(data());test.assertEqual(client.install(fresh),model);test.assertEqual(model.clientClock.secondsRemaining,8);test.assertEqual(home.growth.desired,61);test.assertEqual(model.selectedObject,home);test.assertEqual(model.savedCamera.panX,25);
 }));
 test.it('never runs local simulation when an estimated countdown expires, including a posted turn',()=>fixture(({model})=>{
  model.clientClock=Clock.receive({secondsRemaining:1,paused:false,running:true},model,0);model.clientTurnPosted=true;const before={turn:model.turn,pop:model.stars.map(s=>s.population),ships:model.allShips.length};model.endTurn=()=>{throw Error('Client countdown advanced a turn');};
  test.assertEqual(Clock.label(model,10000),I18n.getString(1047));test.assertEqual(model.turn,before.turn);test.assertDeepEqual(model.stars.map(s=>s.population),before.pop);test.assertEqual(model.allShips.length,before.ships);test.assertTrue(model.clientTurnPosted);
 }));
 test.it('clears countdowns for legacy/unlimited/initial/completed views and replaces them on authoritative new turns',()=>fixture(({host,data,model})=>{
  const legacy=data();delete legacy.clock;test.assertEqual(Clock.label(State.restore(legacy)),null);
  const client=new NetworkClient('http://127.0.0.1:1234');client.install(model);host.transact(game=>{game.turn++;});const fresh=client.install(State.restore(data()));test.assertEqual(fresh.turn,3);test.assertEqual(fresh.clientClock.secondsRemaining,172800);
  for(const patch of [g=>g.config.maxTimePerTurn=0,g=>g.turn=1,g=>g.isGameOver=true]){const g={clientPlayerNum:2,turn:2,config:{maxTimePerTurn:10},isGameOver:false};patch(g);g.clientClock=Clock.receive({secondsRemaining:null,paused:false,running:false},g,0);test.assertEqual(Clock.label(g,0),null);}
 }));
 test.it('draws all six translated clock states within an expanded header while keeping local headers unchanged',()=>fixture(({model})=>{
  const language=pdg.res.getLanguage();model.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const d=new Display(model);let rect,lines=[];d.drawPanelSurface=r=>rect=r;d.drawTextLine=(text,x,y,color,size)=>lines.push({text,x,y,size});d.drawMapButtons=()=>{};d.visualTime=1000;
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const clock of [{secondsRemaining:299,paused:false,running:true},{secondsRemaining:315,paused:true,running:false},{secondsRemaining:0,paused:false,running:true},{secondsRemaining:172800,paused:true,running:false}]){
   model.clientClock=Clock.receive(clock,model,1000);lines=[];d.drawMainUI(model.turn,14,1);const line=lines.at(-1);test.assertEqual(line.text,Clock.label(model,1000));test.assertEqual(rect.height,76);test.assertTrue(line.y<rect.y+rect.height);test.assertTrue(model.port.getTextWidth(line.text,line.size)<=rect.width-28);
  }}model.clientPlayerNum=null;lines=[];d.drawMainUI(model.turn,14,1);test.assertEqual(rect.height,56);test.assertEqual(lines.length,2);}finally{pdg.res.setLanguage(language);d.dispose();}
 }));
});
