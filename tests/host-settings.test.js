const test=require('./test-framework.js'),fs=require('fs'),os=require('os'),path=require('path');
const Host=require('../src/js/network-host.js').NetworkHost,Settings=require('../src/js/host-settings.js'),Save=require('../src/js/game-save.js'),Clock=require('../src/js/client-clock.js');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-settings-'));try{const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1,maxTimePerTurn:300,endEarly:false},path.join(dir,'host.json'));let now=0;host.clock.now=()=>now;fn(host,v=>{now=v;});}finally{fs.rmSync(dir,{recursive:true,force:true});}}
function change(host,values={}){host.updateSettings({...Settings.snapshot(host.game),...values},host.game.config.networkHost.settingsRevision || 0);}
function later(host){host.game.turn=2;host.clock.reset(host.game,false);host.persist();host.server={};host.clock.start();}
function rejects(fn,expected){let code;try{fn();}catch(e){code=e.code || e.message;}test.assertEqual(code,expected);}
module.exports=()=>test.describe('Durable active host settings',()=>{
 test.it('adopts initial-state simulation changes and added defenders without dropping unrelated player decisions',()=>fixture(host=>{
  const State=require('../src/js/client-state.js'),Client=require('../src/js/network-client.js').NetworkClient;
  const client=new Client('localhost:7777'),old=client.install(State.restore(host.playerState(1))),home=old.stars.find(s=>s.owner===1);home.name='Draft 星';home.growth.desired=60;home.shipBuilding.desired=30;home.research.desired=10;
  const marker=old.createRendezvousAt(home.x+10,home.y+20,1,'Draft point',home);home.defaultDestination=marker;old.selectedObject=home;
  host.editInitialState({action:'population',star:home.id,value:12345},0,1);host.editInitialState({action:'ship',star:home.id,value:'defense'},1,1);
  const fresh=client.install(State.restore(host.playerState(1))),updated=fresh.stars.find(s=>s.id===home.id);
  test.assertEqual(updated.population,12345);test.assertEqual(updated.name,'Draft 星');test.assertEqual(updated.growth.desired,60);test.assertEqual(updated.defenseSatellites.length,1);test.assertTrue(updated.defaultDestination===marker && marker.anchor===updated);test.assertTrue(fresh.selectedObject===updated);test.assertTrue(client.hasUnsavedChanges());
  host.saveOrders(1,{revision:fresh.clientOrderRevision,playerRevision:fresh.clientPlayerRevision,initialStateRevision:fresh.clientInitialStateRevision,orders:require('../src/js/player-orders.js').snapshot(fresh,'e'.repeat(32))});test.assertEqual(host.game.stars.find(s=>s.id===home.id).population,12345);test.assertEqual(host.game.stars.find(s=>s.id===home.id).name,'Draft 星');
 }));

 test.it('rejects fixed galaxy/roster fields and malformed settings before modifying the host',()=>fixture(host=>{
  const before=Save.serialize(host.game),valid=Settings.snapshot(host.game);
  for(const value of [null,[],{}, {...valid,gameTitle:'Changed'},{...valid,numHumans:1},{...valid,sectorSize:2},{...valid,density:3},{...valid,compSkill:0},{...valid,compAdvantage:4},{...valid,fastGame:1},{...valid,omniscient:'yes'},{...valid,endEarly:null},{...valid,maxTimePerTurn:0.5},{...valid,maxTimePerTurn:Math.floor(Number.MAX_SAFE_INTEGER/1000)+1}])rejects(()=>host.updateSettings(value,0),'invalid_host_settings');
  test.assertEqual(Save.serialize(host.game),before);
 }));
 test.it('applies global AI, speed and fog settings without changing the galaxy, economy, claims or turn',()=>fixture(host=>{
  const g=host.game,title=g.config.gameTitle,stars=g.stars.map(s=>[s.id,s.x,s.y,s.owner,s.population,s.techLevel]),claims=JSON.stringify(g.config.networkHost.players);
  change(host,{compSkill:1,compAdvantage:3,fastGame:false,omniscient:true,endEarly:true});
  test.assertFalse(host.game.rules.isFast);test.assertEqual(host.game.players[3].compSkill,1);test.assertEqual(host.game.players[3].compAdvantage,3);test.assertDeepEqual(host.game.config.aiSkillByPlayer,{});test.assertEqual(host.game.config.compSkill,1);test.assertEqual(host.game.config.compAdvantage,3);test.assertTrue(host.game.config.omniscient);test.assertEqual(host.game.turn,1);test.assertEqual(host.game.config.gameTitle,title);test.assertEqual(JSON.stringify(host.game.config.networkHost.players),claims);
  test.assertDeepEqual(host.game.stars.map(s=>[s.id,s.x,s.y,s.owner,s.population,s.techLevel]),stars);test.assertEqual(host.game.config.networkHost.settingsRevision,1);
  const reopened=Host.open(host.file);test.assertDeepEqual(Settings.snapshot(reopened.game),Settings.snapshot(host.game));
 }));
 test.it('preserves a running current deadline when the next-turn budget decreases, including after reopening',()=>fixture((host,time)=>{
  later(host);time(25000);change(host,{maxTimePerTurn:60});test.assertEqual(host.clock.snapshot().remainingMs,275000);test.assertEqual(host.clock.snapshot().limitMs,300000);test.assertTrue(host.clock.info().running);test.assertEqual(host.game.config.maxTimePerTurn,60);
  const reopened=Host.open(host.file);test.assertEqual(reopened.clock.snapshot().remainingMs,275000);test.assertEqual(reopened.clock.info().limitSeconds,300);test.assertFalse(reopened.clock.info().running);
  const client=Clock.receive(host.clock.info(),host.game,0);test.assertEqual(Clock.seconds(client,1000),274);
  time(299999);test.assertFalse(host.tick());time(300000);test.assertTrue(host.tick());test.assertEqual(host.game.turn,3);test.assertEqual(host.clock.info().secondsRemaining,60);test.assertFalse('limitSeconds' in host.clock.info());
 }));
 test.it('does not extend the active deadline when increasing or resaving a positive budget',()=>fixture((host,time)=>{
  later(host);time(20000);change(host,{maxTimePerTurn:600});change(host);time(30000);test.assertEqual(host.clock.snapshot().remainingMs,270000);test.assertEqual(host.clock.limit,300000);test.assertEqual(host.clock.configuredLimit,600000);
  host.forceEndTurn(2);test.assertEqual(host.clock.info().secondsRemaining,600);
 }));
 test.it('clears disabled timers and starts a fresh enabled limit while preserving pause',()=>fixture((host,time)=>{
  later(host);time(20000);host.pauseClock();change(host,{maxTimePerTurn:0});test.assertEqual(host.clock.info().secondsRemaining,null);test.assertTrue(host.clock.paused);
  change(host,{maxTimePerTurn:60});test.assertEqual(host.clock.info().secondsRemaining,60);test.assertFalse(host.clock.info().running);test.assertTrue(host.clock.paused);time(999999);test.assertFalse(host.tick());host.resumeClock();test.assertTrue(host.clock.info().running);
 }));
 test.it('keeps turn one untimed and begins its newly configured budget on the next turn',()=>fixture(host=>{
  host.server={};change(host,{maxTimePerTurn:60});test.assertEqual(host.clock.info().secondsRemaining,null);test.assertFalse(host.clock.info().running);host.forceEndTurn(1);test.assertEqual(host.clock.info().secondsRemaining,60);
 }));
 test.it('rolls back settings, AI, clock and revision on failed writes and allows a safe retry',()=>fixture((host,time)=>{
  later(host);time(20000);const before=Save.serialize(host.game),saved=fs.readFileSync(host.file,'utf8'),clock=host.clock.snapshot(),original=host.fs;
  host.fs={...fs,writeFileSync:()=>{throw Error('disk full');}};rejects(()=>change(host,{compSkill:1,compAdvantage:3,fastGame:false,omniscient:true,maxTimePerTurn:60}),'host_save_failed');
  test.assertEqual(Save.serialize(host.game),before);test.assertEqual(fs.readFileSync(host.file,'utf8'),saved);test.assertDeepEqual(host.clock.snapshot(),clock);test.assertEqual(host.clock.configuredLimit,300000);
  host.fs=original;change(host,{maxTimePerTurn:60});test.assertEqual(host.game.config.networkHost.settingsRevision,1);
 }));
 test.it('rejects stale drafts and accepts post-result settings without rewriting the result',()=>fixture(host=>{
  const draft=Settings.snapshot(host.game);change(host,{compSkill:1});rejects(()=>host.updateSettings(draft,0),'stale_host_settings');test.assertEqual(host.game.config.compSkill,1);
  host.game.markGameWon(1);change(host,{compSkill:2});test.assertEqual(host.game.config.compSkill,2);test.assertEqual(host.game.winningPlayerNum,1);
 }));
 test.it('refreshes same-turn settings while preserving editable orders, new groups, selection and report subjects',()=>fixture(host=>{
  const State=require('../src/js/client-state.js'),Client=require('../src/js/network-client.js').NetworkClient,Orders=require('../src/js/player-orders.js');
  host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'Second'});
  const home=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);host.game.recordEvent('Report','Test report',{subject:ship,recipient:1});
  const client=new Client('localhost:7777'),old=client.install(State.restore(host.playerState(1))),own=old.stars.find(s=>s.id===home.id),courier=old.allShips.find(s=>s.id===ship.id);
  own.name='Draft name';own.growth.desired=60;own.shipBuilding.desired=30;own.research.desired=10;own.growth.locked=true;
  const fleet=old.factory.createFleet(courier.x,courier.y,1,'Draft fleet');fleet.star=own;fleet.addShip(courier);const marker=old.createRendezvousAt(-500,1000,1,'Draft marker');fleet.course.replace(marker);fleet.course.swapMemory();own.setDefaultDestination(marker);
  old.selectedObject=fleet;old.display={camera:{zoom:2,panX:10,panY:20}};old.players[1].defaultGrowth=500;old.players[1].defaultShips=300;old.players[1].defaultTech=200;const baseline=JSON.stringify(old.clientOrderBase);
  change(host,{fastGame:false,compSkill:1});const fresh=client.install(State.restore(host.playerState(1)));
  test.assertFalse(fresh===old);test.assertTrue(fresh.selectedObject===fleet);test.assertTrue(fleet.game===fresh);test.assertTrue(courier.fleet===fleet);test.assertTrue(fleet.ships.includes(courier));test.assertTrue(own.defaultDestination===marker);test.assertTrue(fleet.course.memory.waypoints[0].target===marker);test.assertFalse(fresh.rules.isFast);test.assertEqual(JSON.stringify(fresh.clientOrderBase),baseline);test.assertDeepEqual(fresh.savedCamera,{zoom:2,panX:10,panY:20});
  const report=fresh.eventLog.find(e=>e.message==='Test report');test.assertTrue(report.subject===courier);test.assertTrue(fresh.attention.queue.find(e=>e.event===report).object===courier);
  host.postOrders(1,Orders.snapshot(fresh,'d'.repeat(32)));const actual=host.game.stars.find(s=>s.id===home.id);test.assertEqual(actual.name,'Draft name');test.assertEqual(actual.growth.desired,60);test.assertTrue(actual.growth.locked);test.assertEqual(host.game.players[1].defaultGrowth,500);test.assertEqual(host.game.allFleets.find(e=>e.name==='Draft fleet').ships[0].id,ship.id);test.assertEqual(host.game.allRendezvous.find(e=>e.name==='Draft marker').x,-500);
 }));
 test.it('does not resurrect locally removed private markers or dismantled fleets on a settings refresh',()=>fixture(host=>{
  const State=require('../src/js/client-state.js'),Client=require('../src/js/network-client.js').NetworkClient,Orders=require('../src/js/player-orders.js');
  const home=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);
  const fleet=host.game.factory.createFleet(ship.x,ship.y,1,'Old fleet');fleet.star=home;fleet.addShip(ship);const marker=host.game.createRendezvousAt(home.x+20,home.y+20,1,'Old point');home.setDefaultDestination(marker);
  const client=new Client('localhost:7777'),old=client.install(State.restore(host.playerState(1))),member=old.allShips.find(s=>s.id===ship.id),group=old.allFleets.find(f=>f.id===fleet.id),point=old.allRendezvous.find(r=>r.id===marker.id),own=old.stars.find(s=>s.id===home.id);
  group.removeShip(member);member.star=own;own.ships.push(member);old.entityRemoved(group);old.entityRemoved(point);own.defaultDestination=null;
  change(host,{compAdvantage:2});const fresh=client.install(State.restore(host.playerState(1)));test.assertFalse(fresh.allFleets.some(f=>f.id===fleet.id));test.assertFalse(fresh.allRendezvous.some(r=>r.id===marker.id));test.assertNull(own.defaultDestination);test.assertNull(member.fleet);
  host.postOrders(1,Orders.snapshot(fresh,'e'.repeat(32)));test.assertFalse(host.game.allFleets.some(f=>f.id===fleet.id));test.assertFalse(host.game.allRendezvous.some(r=>r.id===marker.id));test.assertEqual(host.game.allShips.find(s=>s.id===ship.id).star.id,home.id);
 }));
 test.it('removes newly hidden foreign targets while retaining map coordinates and local decisions',()=>fixture(host=>{
  const State=require('../src/js/client-state.js'),Client=require('../src/js/network-client.js').NetworkClient;
  change(host,{omniscient:true});const enemyHome=host.game.stars.find(s=>s.owner===2),enemy=host.game.factory.createShip(enemyHome.x,enemyHome.y,'scout',enemyHome,true);enemyHome.ships.push(enemy);
  const client=new Client('localhost:7777'),old=client.install(State.restore(host.playerState(1))),home=old.stars.find(s=>s.owner===1),target=old.allShips.find(s=>s.id===enemy.id);test.assertNotNull(target);home.setDefaultDestination(target);
  change(host,{omniscient:false});for(const e of host.game.allShips.filter(e=>e.owner!==1))e.setVisibilityTo(1,0);
  const fresh=client.install(State.restore(host.playerState(1)));test.assertFalse(fresh.allShips.some(e=>e.id===enemy.id));test.assertNull(home.defaultDestination);test.assertTrue(fresh.stars.includes(home));
 }));
 test.it('rejects malformed saved or advertised retained timer ceilings',()=>fixture(host=>{
  later(host);const C=require('../src/js/host-clock.js');for(const limitMs of [0,-1000,1001,'300000',Number.MAX_SAFE_INTEGER]){host.game.config.networkHost.clock={turn:2,remainingMs:1000,paused:false,limitMs};rejects(()=>new C(host.game),'invalid_host_clock');}
  for(const limitSeconds of [0,1.5,'300',Number.MAX_SAFE_INTEGER])rejects(()=>Clock.receive({secondsRemaining:10,paused:false,running:true,limitSeconds},host.game),'invalid_player_state');
 }));
});
