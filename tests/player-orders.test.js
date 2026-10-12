const test=require('./test-framework.js'),fs=require('fs'),os=require('os'),path=require('path'),{NetworkHost}=require('../src/js/network-host.js'),View=require('../src/js/host-view.js'),State=require('../src/js/client-state.js'),Orders=require('../src/js/player-orders.js'),Save=require('../src/js/game-save.js');
const id='a'.repeat(32);
const Game=require('../src/js/game.js'),Random=require('../src/js/simulation-random.js');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-orders-'));try{
 const host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1},path.join(dir,'host.json'));
 host.login.login({protocol:1,name:'First',mode:'join'});host.login.login({protocol:1,name:'Second',mode:'join'});
 const home=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);
 const client=State.restore({...View.snapshot(host.game,1),gameId:host.info().gameId});fn({host,home,ship,client,snapshot:()=>Orders.snapshot(client,id)});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
function rejects(fn,code){let actual;try{fn();}catch(e){actual=e.code;}test.assertEqual(actual,code);}
module.exports=()=>test.describe('Authoritative multiplayer orders',()=>{
 test.it('does not transmit fixed defense patrol state as a mobile order or alter it during writeback',()=>fixture(({host,home})=>{
  const defense=home.buildCompletedShip('defense');test.assertTrue(defense.onPatrol);
  const client=State.restore(host.playerState(1)),body=Orders.snapshot(client,'f'.repeat(32)),row=body.entities.find(e=>e.kind==='ship' && e.id===defense.id);
  test.assertFalse(row.onPatrol);test.assertFalse(row.userCallIn);
  host.saveOrders(1,{revision:0,orders:body});test.assertTrue(host.game.allShips.find(s=>s.id===defense.id).onPatrol);test.assertEqual(host.game.turn,1);test.assertEqual(host.game.players[1].lastTurnPosted,0);
 }));

 test.it('posts only decision fields, applies production targets/names/defaults, and freezes the submitted turn',()=>fixture(({host,home,client,snapshot})=>{
  const own=client.stars.find(s=>s.id===home.id);own.name='新しい星';own.growth.desired=60;own.shipBuilding.desired=30;own.research.desired=10;own.growth.locked=true;own.startBuildingShip('colony');
  const body=snapshot(),text=JSON.stringify(body);for(const secret of ['population','techLevel','power','damage','paidToward','visibilityTo','password','hash','salt'])test.assertFalse(text.includes(secret));
  host.postOrders(1,body);const updated=host.game.stars.find(s=>s.id===home.id);test.assertEqual(updated.name,'新しい星');test.assertEqual(updated.growth.desired,60);test.assertTrue(updated.growth.locked);test.assertEqual(updated.currentShip.type,'colony');test.assertEqual(updated.population,home.population);test.assertEqual(host.game.players[1].lastTurnPosted,1);test.assertEqual(host.game.turn,1);
 }));
 test.it('waits for every assigned living human and resolves an untimed turn once',()=>fixture(({host,snapshot})=>{
  const first=snapshot();host.postOrders(1,first);const second=State.restore({...View.snapshot(host.game,2),gameId:host.info().gameId});host.postOrders(2,Orders.snapshot(second,'b'.repeat(32)));test.assertEqual(host.game.turn,2);test.assertEqual(host.game.players[1].lastTurnPosted,1);
  const saved=Save.serialize(host.game);host.postOrders(1,first);test.assertEqual(Save.serialize(host.game),saved);test.assertEqual(host.game.turn,2);
 }));
 test.it('rejects forged owners, simulation fields, missing ships, malformed allocations, stale turns and duplicate-ID payload changes atomically',()=>fixture(({host,snapshot})=>{
  for(const mutate of [b=>b.entities[0].population=99,b=>b.entities[0].owner=2,b=>b.entities=b.entities.filter(e=>e.kind!=='ship'),b=>b.entities[0].allocations[0].desired=1001,b=>b.defaults.defaultGrowth=1000,b=>b.entities.push({...b.entities[0]})]){
   const before=Save.serialize(host.game),body=snapshot();mutate(body);rejects(()=>host.postOrders(1,body),'bad_orders');test.assertEqual(Save.serialize(host.game),before);
  }
  const stale=snapshot();stale.turn=2;rejects(()=>host.postOrders(1,stale),'wrong_turn');const original=snapshot();host.postOrders(1,original);const changed=JSON.parse(JSON.stringify(original));changed.defaults.defaultBuildType=2;rejects(()=>host.postOrders(1,changed),'bad_orders');const again=snapshot();again.postId='c'.repeat(32);rejects(()=>host.postOrders(1,again),'already_posted');
 }));
 test.it('creates/remaps groups and private rendezvous with ordered routes and remembered courses',()=>fixture(({host,home,ship,client,snapshot})=>{
  const own=client.stars.find(s=>s.id===home.id),courier=client.allShips.find(s=>s.id===ship.id),fleet=client.factory.createFleet(courier.x,courier.y,1,'隊列');fleet.star=own;fleet.addShip(courier);
  const marker=client.createRendezvousAt(-500,1000,1,'集合');fleet.course.replace(marker);fleet.course.swapMemory();fleet.userCallIn=true;
  host.postOrders(1,snapshot());const actual=host.game.allFleets.find(e=>e.name==='隊列'),rz=host.game.allRendezvous.find(e=>e.name==='集合'),member=host.game.allShips.find(e=>e.id===ship.id);
  test.assertEqual(member.fleet,actual);test.assertTrue(actual.ships.includes(member));test.assertEqual(actual.course.waypoints[0].target,rz);test.assertEqual(actual.course.memory.waypoints[0].target,rz);test.assertTrue(actual.userCallIn);test.assertEqual(rz.x,-500);test.assertEqual(host.game.config.networkHost.posts[1].ids.length,2);
  test.assertEqual(NetworkHost.open(host.file).game.allFleets.find(e=>e.name==='隊列').ships[0].id,member.id);
 }));
 test.it('rejects distant membership and hidden target IDs without changing the host document',()=>fixture(({host,ship,client,snapshot})=>{
  const before=Save.serialize(host.game),body=snapshot(),row=body.entities.find(e=>e.kind==='ship'),foreign=host.game.stars.find(s=>s.owner===2);
  row.parent={kind:'star',id:foreign.id,created:false};rejects(()=>host.postOrders(1,body),'bad_orders');test.assertEqual(Save.serialize(host.game),before);
  const enemy=host.game.factory.createShip(foreign.x,foreign.y,'scout',foreign,true);foreign.ships.push(enemy);enemy.setVisibilityTo(1,0);const next=snapshot();next.entities.find(e=>e.kind==='ship').course.waypoints=[{x:0,y:0,target:{kind:'ship',id:enemy.id,created:false}}];rejects(()=>host.postOrders(1,next),'bad_orders');
 }));
 test.it('rolls back posting and turn resolution when the atomic host save fails',()=>fixture(({host,snapshot})=>{
  const before=Save.serialize(host.game),old=host.game;host.persist=()=>{throw Error('disk unavailable');};rejects(()=>host.postOrders(1,snapshot()),'host_save_failed');test.assertTrue(host.game===old);test.assertTrue(host.login.game===old);test.assertEqual(Save.serialize(host.game),before);
 }));
 test.it('removes a private marker and clears its destination references without losing the owned units',()=>fixture(({host,home,ship})=>{
  const marker=host.game.createRendezvousAt(home.x+200,home.y+100,1,'Old point');home.setDefaultDestination(marker);ship.course.replace(marker);ship.course.swapMemory();host.persist();
  const client=State.restore({...View.snapshot(host.game,1),gameId:host.info().gameId}),local=client.allRendezvous.find(e=>e.id===marker.id);client.deleteRendezvous(local);
  host.postOrders(1,Orders.snapshot(client,id));test.assertEqual(host.game.allRendezvous.length,0);test.assertNull(host.game.stars.find(e=>e.id===home.id).defaultDestination);
  test.assertEqual(host.game.allShips.find(e=>e.id===ship.id).course.waypoints.length,0);test.assertEqual(NetworkHost.open(host.file).game.allShips.length,1);
 }));
 test.it('rejects nested-group cycles and self-target courses atomically',()=>fixture(({host,ship,client})=>{
  const courier=client.allShips.find(e=>e.id===ship.id),a=client.factory.createFleet(courier.x,courier.y,1,'A'),b=client.factory.createFleet(courier.x,courier.y,1,'B');
  a.addShip(courier);a.fleet=b;b.fleet=a;const request=Orders.snapshot(client,id),before=Save.serialize(host.game),nextId=require('../src/js/fleet.js').nextId;rejects(()=>host.postOrders(1,request),'bad_orders');test.assertEqual(require('../src/js/fleet.js').nextId,nextId);test.assertEqual(Save.serialize(host.game),before);
  const simple=State.restore({...View.snapshot(host.game,1),gameId:host.info().gameId}),own=simple.allShips.find(e=>e.id===ship.id);own.course.waypoints=[{x:own.x,y:own.y,target:own}];rejects(()=>host.postOrders(1,Orders.snapshot(simple,id)),'bad_orders');test.assertEqual(Save.serialize(host.game),before);
 }));
 test.it('commissions fully paid hulls only on the host, never by trusting newly invented client ships',()=>fixture(({host,home})=>{
  home.buildCredits.scout=host.game.rules.getShipBuildCost({type:'scout',techLevel:home.techLevel},home);const count=host.game.allShips.length;
  const client=State.restore({...View.snapshot(host.game,1),gameId:host.info().gameId}),local=client.stars.find(e=>e.id===home.id);local.startBuildingShip('scout');test.assertEqual(client.allShips.length,count);test.assertEqual(local.currentShip.progress,100);
  host.postOrders(1,Orders.snapshot(client,id));test.assertEqual(host.game.allShips.length,count+1);test.assertEqual(host.game.turn,1);test.assertEqual(NetworkHost.open(host.file).game.allShips.length,count+1);
 }));
 test.it('preserves patrol/call-in/scrap decisions and prevents unassigned slots from ending an untimed turn',()=>fixture(({host,ship,client})=>{
  const own=client.allShips.find(e=>e.id===ship.id);own.onPatrol=true;own.userCallIn=true;const claim=host.game.config.networkHost.players[1];host.game.config.networkHost.players[1]=null;
  host.postOrders(1,Orders.snapshot(client,id));const actual=host.game.allShips.find(e=>e.id===ship.id);test.assertTrue(actual.onPatrol);test.assertTrue(actual.userCallIn);test.assertFalse(actual.toBeScrapped);test.assertEqual(host.game.turn,1);
  own.onPatrol=false;own.toBeScrapped=true;host.game.config.networkHost.players[1]=claim;host.game.players[1].lastTurnPosted=0;host.game.players[2].lastTurnPosted=1;host.postOrders(1,Orders.snapshot(client,'f'.repeat(32)));test.assertFalse(host.game.allShips.some(e=>e.id===ship.id));test.assertTrue(host.game.eventLog.some(e=>e.type==='scrap' && e.recipient===1));
 }));
 test.it('keeps failed turn-resolution randomness in the staging game and leaves global PDG RNG untouched',()=>fixture(({host,snapshot})=>{
  host.postOrders(1,snapshot());const second=State.restore({...View.snapshot(host.game,2),gameId:host.info().gameId}),body=Orders.snapshot(second,'b'.repeat(32));
  const before=Save.serialize(host.game),state=host.game.tutorialRandom.state,original=Game.prototype.endTurn;
  Game.prototype.endTurn=function(){Random.next(this);return original.call(this);};host.persist=()=>{throw Error('disk failed');};
  pdg.srand(910);const expected=pdg.rand();pdg.srand(910);
  try{rejects(()=>host.postOrders(2,body),'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertEqual(host.game.tutorialRandom.state,state);test.assertEqual(pdg.rand(),expected);}finally{Game.prototype.endTurn=original;}
 }));
 test.it('retains posted receipts across reopening and keeps timed turns pending unless endEarly is set',()=>fixture(({host,snapshot})=>{
  const body=snapshot();host.game.turn=2;body.turn=2;host.game.config.maxTimePerTurn=3600;host.game.config.endEarly=false;host.clock.reset(host.game,false);host.postOrders(1,body);const second=State.restore({...View.snapshot(host.game,2),gameId:host.info().gameId});host.postOrders(2,Orders.snapshot(second,'b'.repeat(32)));test.assertEqual(host.game.turn,2);const reopened=NetworkHost.open(host.file);const before=Save.serialize(reopened.game);reopened.postOrders(1,body);test.assertEqual(Save.serialize(reopened.game),before);
 }));
 test.it('durably writes unposted decisions without readiness, simulation or clock advancement',()=>fixture(({host,home,client,snapshot})=>{
  host.game.turn=2;client.turn=2;host.game.config.maxTimePerTurn=3600;host.game.config.endEarly=true;host.clock.reset(host.game,false);
  const turn=host.game.turn,posted=host.game.players[1].lastTurnPosted,clock=host.clock.snapshot(),own=client.stars.find(s=>s.id===home.id);
  own.name='Saved Ω';own.growth.desired=60;own.shipBuilding.desired=30;own.research.desired=10;
  const result=host.saveOrders(1,{revision:0,orders:snapshot()});test.assertEqual(result.revision,1);test.assertEqual(host.game.turn,turn);test.assertEqual(host.game.players[1].lastTurnPosted,posted);test.assertFalse(host.ready(host.game));test.assertDeepEqual(host.clock.snapshot(),clock);
  const actual=host.game.stars.find(s=>s.id===home.id);test.assertEqual(actual.name,'Saved Ω');test.assertEqual(actual.growth.desired,60);test.assertEqual(actual.population,home.population);test.assertEqual(actual.techLevel,home.techLevel);
  const restored=NetworkHost.open(host.file);test.assertEqual(restored.game.stars.find(s=>s.id===home.id).name,'Saved Ω');test.assertEqual(restored.playerState(1).orderRevision,1);test.assertEqual(restored.playerState(2).orderRevision,0);
  test.assertFalse('changes' in host.info());test.assertFalse(JSON.stringify(host.playerState(2)).includes('digest'));
 }));
 test.it('retries lost writeback acknowledgments without duplicate objects and rejects older revisions',()=>fixture(({host,home,ship,client,snapshot})=>{
  const local=client.allShips.find(s=>s.id===ship.id),fleet=client.factory.createFleet(local.x,local.y,1,'Saved fleet');fleet.star=client.stars.find(s=>s.id===home.id);fleet.addShip(local);
  const marker=client.createRendezvousAt(home.x+200,home.y+100,1,'Saved point');fleet.course.replace(marker);
  const request={revision:0,orders:snapshot()},first=host.saveOrders(1,request),before=Save.serialize(host.game);test.assertEqual(first.ids.length,2);
  test.assertDeepEqual(host.saveOrders(1,request),first);test.assertEqual(Save.serialize(host.game),before);test.assertEqual(host.game.allFleets.length,1);test.assertEqual(host.game.allRendezvous.length,1);
  first.ids[0].id=999999;test.assertTrue(host.saveOrders(1,request).ids[0].id!==999999);
  const fresh=State.restore(host.playerState(1));fresh.stars.find(s=>s.id===home.id).name='Newer';host.saveOrders(1,{revision:1,orders:Orders.snapshot(fresh,'b'.repeat(32))});
  const saved=Save.serialize(host.game);rejects(()=>host.saveOrders(1,request),'stale_orders');test.assertEqual(Save.serialize(host.game),saved);
 }));
 test.it('keeps writeback receipts across reopening and does not reapply an acknowledged old turn',()=>fixture(({host,snapshot})=>{
  const request={revision:0,orders:snapshot()};host.saveOrders(1,request);host.forceEndTurn(1);
  const restored=NetworkHost.open(host.file),before=Save.serialize(restored.game);test.assertEqual(restored.saveOrders(1,request).turn,1);test.assertEqual(restored.game.turn,2);test.assertEqual(Save.serialize(restored.game),before);
 }));
 test.it('rejects malformed, forged, stale and already-posted writebacks atomically',()=>fixture(({host,snapshot})=>{
  for(const request of [{revision:-1,orders:snapshot()},{revision:0,orders:snapshot(),extra:true},{revision:0,orders:{...snapshot(),entities:[]}},{revision:0,orders:{...snapshot(),turn:2}},{revision:0,orders:{...snapshot(),gameId:'f'.repeat(64)}}]){
   const before=Save.serialize(host.game);let error;try{host.saveOrders(1,request);}catch(e){error=e;}test.assertTrue(!!error.code);test.assertEqual(Save.serialize(host.game),before);
  }
  const original={revision:0,orders:snapshot()};host.saveOrders(1,original);const changed=JSON.parse(JSON.stringify(original));changed.orders.entities[0].name='Altered retry';rejects(()=>host.saveOrders(1,changed),'bad_orders');
  const fresh=State.restore(host.playerState(1)),posted=Orders.snapshot(fresh,'b'.repeat(32));host.postOrders(1,posted);rejects(()=>host.saveOrders(1,{revision:1,orders:Orders.snapshot(fresh,'c'.repeat(32))}),'already_posted');
 }));
 test.it('rolls back writeback edits, receipts and allocated identifiers on failed durable save',()=>fixture(({host,home,client,snapshot})=>{
  client.createRendezvousAt(home.x,home.y,1,'Pending point');const before=Save.serialize(host.game),old=host.game,counter=require('../src/js/rendezvous.js').nextId,persist=host.persist.bind(host);
  host.persist=()=>{throw Error('write unavailable');};const request={revision:0,orders:snapshot()};rejects(()=>host.saveOrders(1,request),'host_save_failed');test.assertTrue(host.game===old);test.assertEqual(Save.serialize(host.game),before);test.assertEqual(require('../src/js/rendezvous.js').nextId,counter);test.assertEqual(host.playerState(1).orderRevision,0);
  host.persist=persist;test.assertEqual(host.saveOrders(1,request).revision,1);
 }));
 test.it('validates saved writeback metadata and clears it when a human role is removed',()=>fixture(({host,snapshot})=>{
  host.saveOrders(1,{revision:0,orders:snapshot()});const valid=fs.readFileSync(host.file,'utf8');
  for(const mutate of [r=>r.revision=0,r=>r.digest='bad',r=>r.turn=99,r=>r.ids=[{kind:'star',id:1,tempId:1}],r=>r.secret=true,r=>r.ids=[{kind:'fleet',id:1,tempId:1,secret:true}]]){
   mutate(host.game.config.networkHost.changes[1]);fs.writeFileSync(host.file,Save.serialize(host.game));rejects(()=>NetworkHost.open(host.file),'invalid_host_orders');host.game=Save.restore(valid);host.login.game=host.game;
  }
  fs.writeFileSync(host.file,valid);host.changePlayer({player:1,action:'computer',name:'Computer Ω'},host.game.config.networkHost.playersRevision,1);test.assertFalse(!!host.game.config.networkHost.changes[1]);test.assertTrue(!!NetworkHost.open(host.file));
 }));

 test.it('rejects writeback snapshots from before authoritative initial-state changes',()=>fixture(({host,home,snapshot})=>{
  const request={revision:0,orders:snapshot()};host.editInitialState({action:'population',star:home.id,value:12345},0,1);
  const before=Save.serialize(host.game);rejects(()=>host.saveOrders(1,request),'stale_orders');test.assertEqual(Save.serialize(host.game),before);
  const state=host.playerState(1),model=State.restore(state);model.stars.find(s=>s.id===home.id).name='After edit';
  host.saveOrders(1,{revision:state.orderRevision,playerRevision:state.playerRevision,initialStateRevision:state.initialStateRevision,orders:Orders.snapshot(model,id)});
  test.assertEqual(host.game.stars.find(s=>s.id===home.id).population,12345);test.assertEqual(host.game.stars.find(s=>s.id===home.id).name,'After edit');
 }));

});
