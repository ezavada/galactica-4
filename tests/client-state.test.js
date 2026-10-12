const test=require('./test-framework.js'),Client=require('../src/js/client-state.js'),View=require('../src/js/host-view.js'),Save=require('../src/js/game-save.js'),Display=require('../src/js/display.js');
const Host=require('../src/js/network-host.js').NetworkHost,fs=require('fs'),os=require('os'),path=require('path');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-test-'));try{
 const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1},path.join(dir,'host.json')),game=host.game;
 host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'航行 Jäger Второй'});
 const own=game.stars.find(s=>s.owner===2),enemy=game.stars.find(s=>s.owner===1);
 const ship=game.factory.createShip(own.x,own.y,'scout',own,true);own.ships.push(ship);
 const hidden=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);hidden.name='Enemy secret';
 const fleet=game.factory.createFleet(enemy.x,enemy.y,1,'Enemy fleet');fleet.addShip(hidden);
 for(const e of [...game.stars,...game.allShips,...game.allFleets])e.setVisibilityTo(2,0);
 fleet.setVisibilityTo(2,1);
 const state=()=>({...View.snapshot(game,2),gameId:host.info().gameId});
 const display=client=>{client.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const d=new Display(client);client.display=d;return d;};
 fn({host,game,own,enemy,ship,hidden,fleet,state,display});
}finally{fs.rmSync(dir,{recursive:true,force:true});}}
const get=(client,kind,e)=>client[kind].find(row=>row.id===e.id);
function rejects(fn){let caught=false;try{fn();}catch(error){caught=error.message==='invalid_player_state';}test.assertTrue(caught);}
module.exports=()=>test.describe('Visibility-limited multiplayer client model',()=>{
 test.it('continues manual reports on their page and plays the cue only once across projection replacement',()=>fixture(({game,own,state})=>{
  const event=game.recordEvent('Report','Body',{subject:own,recipient:2});event.repair={name:own.name,fleet:false};
  const old=Client.restore(state());test.assertTrue(old.replayReport(old.eventLog.find(e=>e.id===event.id)));old.overlay.page=3;const overlay=old.overlay,started=overlay.createdAt;
  let cues=0;const sound=require('../src/js/sound.js').createSound({getSound:()=>({setLooping(){},setVolume(){},start(){cues++;},stop(){}})},{readSound:()=>true,writeSound(){}},()=>0);
  sound.present(old,overlay,false);test.assertEqual(cues,1);
  const fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);
  test.assertTrue(fresh.overlay===overlay);test.assertEqual(fresh.overlay.page,3);test.assertEqual(fresh.overlay.createdAt,started);test.assertTrue(fresh.eventLog.find(e=>e.id===event.id).subject===get(fresh,'stars',own));
  sound.present(fresh,fresh.overlay,false);test.assertEqual(cues,1);
 }));
 test.it('continues manual owner art and queued reports with fresh references and no duplicate incoming copy',()=>fixture(({game,own,ship,state})=>{
  const event=game.recordEvent('Class','Commissioned',{subject:ship,recipient:2});event.commissioning={owner:2,classIndex:1,shipType:'scout'};
  const message=game.recordEvent('Message','Hello',{recipient:2});message.playerMessage={sender:1,name:'First',text:'Hello'};
  const old=Client.restore(state());old.clearEventPresentations();old.showEventOverlay({type:'stardock',manual:true,eventId:event.id,ship:get(old,'allShips',ship),origin:get(old,'stars',own),classIndex:1});old.queueReport(old.eventLog.find(e=>e.id===message.id),false,true);
  const active=old.overlay;const fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);
  test.assertTrue(fresh.overlay===active);test.assertTrue(active.ship===get(fresh,'allShips',ship));test.assertTrue(active.origin===get(fresh,'stars',own));test.assertEqual(fresh.overlayQueue.length,1);test.assertEqual(fresh.overlayQueue[0].eventId,message.id);test.assertTrue(fresh.overlayQueue[0].manual);
  fresh.dismissEventPresentation();test.assertTrue(fresh.overlay.manual);test.assertEqual(fresh.overlay.eventId,message.id);
 }));
 test.it('drops missing or newly hidden manual reports and does not carry them across game, viewer or turn changes',()=>fixture(({game,enemy,state})=>{
  enemy.setVisibilityTo(2,4);const event=game.recordEvent('Enemy','Observed',{subject:enemy,recipient:2});event.observer=true;event.repair={name:enemy.name,fleet:false};
  const old=Client.restore(state());test.assertTrue(old.replayReport(old.eventLog.find(e=>e.id===event.id)));
  enemy.setVisibilityTo(2,0);let fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertNull(fresh.overlay);
  enemy.setVisibilityTo(2,4);game.eventLog=[];fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertNull(fresh.overlay);
  game.eventLog=[event];for(const change of [m=>m.clientGameId='other',m=>m.clientPlayerNum=1,m=>m.turn++]){fresh=Client.restore(state());change(fresh);require('../src/js/client-ui-refresh.js').preserveManualReports(old,fresh);test.assertNull(fresh.overlay);}
 }));
 test.it('continues manual outcomes and Lab review but leaves automatic playback separate',()=>fixture(({game,own,state})=>{
  const event=game.recordEvent('Outcome','Win',{recipient:2});event.outcome={kind:'win',playerNum:2,name:'Second',turn:1};
  const old=Client.restore(state());test.assertTrue(old.replayOutcome(old.eventLog.find(e=>e.id===event.id)));old.overlay.page=1;
  let fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertTrue(fresh.overlay===old.overlay);test.assertEqual(fresh.overlay.page,1);
  const lab=game.recordEvent('Lab','Discovery',{subject:own,recipient:2});lab.discovery={owner:2,classIndex:2};old.eventLog=Client.restore(state()).eventLog;old.showEventOverlay({type:'lab',manual:true,eventId:lab.id,origin:get(old,'stars',own)});
  fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertEqual(fresh.overlay.type,'lab');test.assertTrue(fresh.overlay.origin===get(fresh,'stars',own));
  old.overlay.manual=false;fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertNull(fresh.overlay);
 }));
 test.it('continues explicitly shown older held reports and starts a retained queued manual report when needed',()=>fixture(({game,own,state})=>{
  const first=game.recordEvent('Held','First',{subject:own,recipient:2});first.repair={name:own.name,fleet:false};
  const second=game.recordEvent('Held','Second',{subject:own,recipient:2});second.repair={name:own.name,fleet:false};game.turn=4;
  const old=Client.restore(state());old.toggleHoldGameReports();for(const event of old.eventLog.filter(e=>e.repair))old.queueReport(event);test.assertTrue(old.showPendingGameReports());const active=old.overlay;
  let fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertTrue(fresh.overlay===active);test.assertEqual(fresh.overlayQueue.length,1);test.assertTrue(fresh.holdGameReports);fresh.dismissEventPresentation();test.assertEqual(fresh.overlay.eventId,second.id);
  old.overlay.manual=false;fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);test.assertEqual(fresh.overlay.eventId,second.id);test.assertTrue(fresh.overlay.manual);test.assertEqual(fresh.overlayQueue.length,0);
 }));
 test.it('does not restart a manual destruction animation when its display is replaced',()=>fixture(({game,own,state,display})=>{
  const event=game.recordEvent('Destruction','Lost',{subject:own,recipient:2});event.destruction={side:'loser'};
  const old=Client.restore(state()),before=display(old);old.replayReport(old.eventLog.find(e=>e.id===event.id));before.visualTime=1000;test.assertNotNull(before.getDestructionEffect(old.overlay,true));before.visualTime=2000;test.assertNull(before.getDestructionEffect(old.overlay,true));
  const fresh=Client.restore(state());require('../src/js/network-client.js').preservePresentation(old,fresh);const after=display(fresh);after.continueManualReport(before);after.visualTime=2000;test.assertNull(after.getDestructionEffect(fresh.overlay,true));
 }));

 test.it('keeps existing and newly arrived attention reports accessible after same-turn polling',()=>fixture(({game,own,ship,state})=>{
  const rename=game.recordEvent('Rename','Colony',{subject:own,recipient:2,type:require('../src/js/common.js').EventType.RENAME_COLONY});
  const built=game.recordEvent('Built','Ship',{subject:ship,recipient:2,type:require('../src/js/common.js').EventType.SHIP_BUILT});built.automatic=false;
  const client=new (require('../src/js/network-client.js').NetworkClient)('localhost');client.model=Client.restore(state());client.savedOrders=require('../src/js/client-writeback.js').signature(client.model);const model=client.model;
  test.assertEqual(model.attention.manualPending().length,2);const incoming=game.recordEvent('More','Ship',{subject:ship,recipient:2,type:'callIn'});incoming.automatic=false;
  client.install(Client.restore(state()));test.assertTrue(client.model===model);test.assertEqual(model.attention.manualPending().length,3);for(const entry of model.attention.queue){test.assertTrue(model.eventLog.includes(entry.event));test.assertTrue(entry.object===get(model,entry.event.id===rename.id?'stars':'allShips',entry.event.id===rename.id?own:ship));}
  model.setSelectedObject(get(model,'stars',own));test.assertEqual(model.attention.manualPending().length,2);client.install(Client.restore(state()));test.assertEqual(model.attention.manualPending().length,2);test.assertTrue(model.eventLog.find(e=>e.id===rename.id).handled);
  game.eventLog=game.eventLog.filter(e=>e.id!==built.id);client.install(Client.restore(state()));test.assertFalse(model.attention.queue.some(e=>e.event.id===built.id));test.assertEqual(model.attention.manualPending().length,1);
 }));
 test.it('carries only unsaved decisions across a new turn while adopting host positions and route progress',()=>fixture(({game,own,ship,state})=>{
  ship.course.replace({x:own.x+100,y:own.y+100});ship.course.insert({x:own.x+10000,y:own.y+10000});
  const client=new (require('../src/js/network-client.js').NetworkClient)('localhost');client.model=Client.restore(state());client.savedOrders=require('../src/js/client-writeback.js').signature(client.model);
  const local=get(client.model,'allShips',ship);local.name='Newer name';get(client.model,'stars',own).name='Newer system';client.model.uiWindow='course';client.model.courseWindowObject=local;
  ship.x+=100;ship.y+=100;ship.course.current=1;ship.course.previous=0;ship.star=null;own.ships=own.ships.filter(s=>s!==ship);game.turn++;
  const model=client.install(Client.restore(state()));test.assertEqual(model.turn,2);test.assertEqual(get(model,'stars',own).name,'Newer system');test.assertEqual(get(model,'allShips',ship).name,'Newer name');test.assertEqual(get(model,'allShips',ship).x,ship.x);test.assertEqual(get(model,'allShips',ship).course.current,1);test.assertNull(get(model,'allShips',ship).star);test.assertNull(model.uiWindow);test.assertTrue(client.hasUnsavedChanges());
 }));
 test.it('keeps changed production, defaults, destinations and markers without reverting simulated values',()=>fixture(({game,own,state})=>{
  const removed=game.factory.createRendezvous(own.x,own.y,2,'Old point'),moved=game.factory.createRendezvous(own.x+20,own.y+30,2,'Moved point');
  const client=new (require('../src/js/network-client.js').NetworkClient)('localhost');client.model=Client.restore(state());client.savedOrders=require('../src/js/client-writeback.js').signature(client.model);const home=get(client.model,'stars',own);
  home.growth.desired=60;home.growth.locked=true;home.shipBuilding.desired=20;home.research.desired=20;home.startBuildingShip('scout');home.defaultDestination={x:own.x+5000,y:own.y+6000};Object.assign(client.model.players[2],{defaultGrowth:700,defaultShips:200,defaultTech:100});
  client.model.entityRemoved(get(client.model,'allRendezvous',removed));get(client.model,'allRendezvous',moved).x=own.x+1000;client.model.createRendezvousAt(own.x+70,own.y+80,2,'New point');
  own.growth.value=27;own.growth.rate=4;own.growth.benefit=8;own.population+=100;game.turn++;const population=own.population,model=client.install(Client.restore(state())),fresh=get(model,'stars',own);
  test.assertEqual(fresh.growth.desired,60);test.assertTrue(fresh.growth.locked);test.assertEqual(fresh.growth.value,27);test.assertEqual(fresh.growth.rate,4);test.assertEqual(fresh.growth.benefit,8);test.assertEqual(fresh.population,population);test.assertEqual(fresh.currentShip.type,'scout');test.assertEqual(fresh.defaultDestination.x,own.x+5000);test.assertEqual(model.players[2].defaultGrowth,700);test.assertFalse(model.allRendezvous.some(e=>e.id===removed.id));test.assertEqual(get(model,'allRendezvous',moved).x,own.x+1000);test.assertTrue(model.allRendezvous.some(e=>e.name==='New point'));
  test.assertEqual(require('../src/js/player-orders.js').apply(Save.restore(Save.serialize(game)),2,require('../src/js/player-orders.js').snapshot(model,'0'.repeat(32))).length,1);
 }));
 test.it('keeps newly appended legs after a completed host course and updates a replaced course origin',()=>fixture(({game,own,ship,state})=>{
  ship.course.replace({x:own.x+100,y:own.y+100});const saved=Client.restore(state()),baseline=require('../src/js/client-writeback.js').signature(saved);get(saved,'allShips',ship).course.insert({x:own.x+10000,y:own.y+10000});
  ship.x+=100;ship.y+=100;ship.course.clear();ship.star=null;own.ships=own.ships.filter(s=>s!==ship);game.turn++;
  let result=require('../src/js/client-draft-refresh.js').rebase(saved,Client.restore(state()),baseline,{advanceTurn:true}).model;test.assertEqual(get(result,'allShips',ship).course.current,1);test.assertEqual(get(result,'allShips',ship).course.waypoints.length,2);
  ship.x-=50;const stopped=require('../src/js/client-draft-refresh.js').rebase(saved,Client.restore(state()),baseline,{advanceTurn:true}).model;test.assertEqual(get(stopped,'allShips',ship).course.current,0);ship.x+=50;
  const draft=get(saved,'allShips',ship).course;draft.waypoints=[{x:own.x,y:own.y,target:{x:own.x,y:own.y}},{x:own.x+5000,y:own.y+5000,target:{x:own.x+5000,y:own.y+5000}}];draft.hasOrigin=true;draft.current=1;
  result=require('../src/js/client-draft-refresh.js').rebase(saved,Client.restore(state()),baseline,{advanceTurn:true}).model;test.assertEqual(get(result,'allShips',ship).course.waypoints[0].x,ship.x);test.assertEqual(get(result,'allShips',ship).course.current,1);
  draft.loop=true;result=require('../src/js/client-draft-refresh.js').rebase(saved,Client.restore(state()),baseline,{advanceTurn:true}).model;test.assertEqual(get(result,'allShips',ship).course.waypoints[0].x,own.x);
  const owner=get(result,'allShips',ship),loopBase={waypoints:[{x:own.x,y:own.y,target:null},{x:ship.x,y:ship.y,target:null}],current:1,previous:0,loop:true,hunt:false,hasOrigin:true},wrapped={waypoints:loopBase.waypoints.map(p=>({...p,target:{x:p.x,y:p.y}})),current:0,previous:1};
  const disabled=require('../src/js/client-turn-refresh.js').course({...loopBase,loop:false},loopBase,wrapped,owner);test.assertEqual(disabled.current,2);test.assertEqual(disabled.previous,1);
 }));
 test.it('places unsaved new fleets at the moved members and cancels grouping when the members separated',()=>fixture(({game,own,ship,state})=>{
  const other=game.factory.createShip(own.x,own.y,'scout',own,true);own.ships.push(other);
  const draft=Client.restore(state()),baseline=require('../src/js/client-writeback.js').signature(draft),fleet=draft.factory.createFleet(own.x,own.y,2,'New fleet');fleet.star=get(draft,'stars',own);fleet.addShip(get(draft,'allShips',ship));fleet.addShip(get(draft,'allShips',other));
  for(const member of [ship,other]){member.x+=1000;member.y+=1000;member.star=null;}own.ships=own.ships.filter(s=>s!==ship && s!==other);game.turn++;
  let result=require('../src/js/client-draft-refresh.js').rebase(draft,Client.restore(state()),baseline,{advanceTurn:true}).model;const group=result.allFleets.find(f=>f.name==='New fleet');test.assertNotNull(group);test.assertEqual(group.x,ship.x);test.assertNull(group.star);test.assertEqual(group.ships.length,2);
  const apply=model=>require('../src/js/player-orders.js').apply(Save.restore(Save.serialize(game)),2,require('../src/js/player-orders.js').snapshot(model,'0'.repeat(32)));test.assertEqual(apply(result).length,1);
  other.x+=100;result=require('../src/js/client-draft-refresh.js').rebase(draft,Client.restore(state()),baseline,{advanceTurn:true}).model;test.assertFalse(result.allFleets.some(f=>f.name==='New fleet'));test.assertNull(get(result,'allShips',ship).fleet);test.assertNull(get(result,'allShips',other).fleet);test.assertEqual(apply(result).length,0);
 }));
 test.it('does not carry decisions for captured objects or into a finished or explicitly discarded game',()=>fixture(({game,own,ship,state})=>{
  const client=new (require('../src/js/network-client.js').NetworkClient)('localhost');client.model=Client.restore(state());client.savedOrders=require('../src/js/client-writeback.js').signature(client.model);get(client.model,'allShips',ship).name='Lost ownership draft';get(client.model,'stars',own).name='Still owned draft';
  ship.owner=1;ship.setVisibilityTo(2,4);game.turn++;let fresh=Client.restore(state()),model=client.install(fresh);test.assertFalse(get(model,'allShips',ship).name==='Lost ownership draft');test.assertEqual(get(model,'stars',own).name,'Still owned draft');
  get(model,'stars',own).name='Another draft';game.turn++;fresh=Client.restore(state());fresh.canContinue=false;client.install(fresh);test.assertFalse(get(client.model,'stars',own).name==='Another draft');test.assertFalse(client.hasUnsavedChanges());
  get(client.model,'stars',own).name='Discard this';game.turn++;fresh=Client.restore(state());client.install(fresh,{discardOrders:true});test.assertFalse(get(client.model,'stars',own).name==='Discard this');test.assertFalse(client.hasUnsavedChanges());
 }));
 test.it('keeps local client reports distinct from future authoritative host report IDs',()=>fixture(({state})=>{
  const client=Client.restore(state()),nextId=client.nextEventId+1,local=client.recordEvent('Orders','Local edit');local.handled=true;
  test.assertTrue(local.id<0);test.assertEqual(client.nextEventId,nextId-1);
  const fresh=Client.restore(state());fresh.eventLog.push({id:nextId,handled:false});require('../src/js/network-client.js').preservePresentation(client,fresh);test.assertFalse(fresh.eventLog[fresh.eventLog.length-1].handled);
 }));
 test.it("reconstructs the second human identity and allows orders only on that player's entities",()=>fixture(({game,own,enemy,ship,state})=>{
  const original=Save.serialize(game);pdg.srand(719);const expected=pdg.rand();pdg.srand(719);const client=Client.restore(state());test.assertEqual(pdg.rand(),expected);const home=get(client,'stars',own),other=get(client,'stars',enemy),courier=get(client,'allShips',ship);
  test.assertEqual(client.getCurrentHumanPlayer(),2);test.assertTrue(client.canHumanControl(home));test.assertTrue(client.canHumanControl(courier));test.assertFalse(client.canHumanControl(other));
  test.assertEqual(client.players[2].name,'航行 Jäger Второй');test.assertEqual(client.players[2].homeStarId,own.id);test.assertEqual(courier.star,home);test.assertTrue(home.ships.includes(courier));
  client.executeUIAction({type:'buildShip',object:home,shipType:'colony'});test.assertEqual(home.currentShip.type,'colony');const previous=other.currentShip;client.executeUIAction({type:'buildShip',object:other,shipType:'colony'});test.assertTrue(other.currentShip===previous);test.assertEqual(Save.serialize(game),original);
 }));
 test.it('keeps transmitted star labels, including remembered homeworld names, independent of missing foreign private records',()=>fixture(({game,enemy,state})=>{
  let data=state(),client=Client.restore(data),star=get(client,'stars',enemy);test.assertEqual(client.getStarDisplayName(star),data.entities.find(r=>r.kind==='star' && r.id===enemy.id).name);test.assertTrue(star.name!==enemy.name);
  enemy.setVisibilityTo(2,1);enemy.setLastSeen(2,game.turn);enemy.setVisibilityTo(2,0);data=state();client=Client.restore(data);star=get(client,'stars',enemy);test.assertEqual(client.getStarDisplayName(star),enemy.name);test.assertFalse('password' in data.privatePlayer);
 }));
 test.it('renders unknown fleet speed without inventing members, deleting the fleet, or recalculating its received statistics',()=>fixture(({fleet,hidden,state,display})=>{
  const data=state(),client=Client.restore(data),remote=get(client,'allFleets',fleet),d=display(client),row=data.entities.find(r=>r.kind==='fleet' && r.id===fleet.id);
  test.assertFalse(remote.isEmpty());test.assertFalse(remote.isDead());test.assertEqual(remote.ships.length,0);test.assertFalse(!!get(client,'allShips',hidden));
  const info=d.getFleetDiagnostics(remote);test.assertEqual(info.count,'?');test.assertEqual(info.power,'?');test.assertEqual(remote.totalSpeed,row.speed);test.assertEqual(d.getFleetDetailsLayout(remote).visibleShips.length,0);
 }));
 test.it('restores class-visible fleet nesting and supplied defenses without needing the hidden simulation',()=>fixture(({game,fleet,hidden,enemy,state,display})=>{
  fleet.setVisibilityTo(2,3);enemy.setVisibilityTo(2,4);const data=state(),client=Client.restore(data),remote=get(client,'allFleets',fleet),member=get(client,'allShips',hidden),star=get(client,'stars',enemy),d=display(client);
  test.assertEqual(member.fleet,remote);test.assertTrue(remote.ships.includes(member));test.assertEqual(d.getFleetDiagnostics(remote).count,'1');
  test.assertDeepEqual(star.getDefenseBreakdown(),data.entities.find(r=>r.kind==='star' && r.id===enemy.id).defense);test.assertFalse(client.canHumanControl(member));
 }));
 test.it('restores route references and memory while preventing client End Turn from running production or AI',()=>fixture(({own,ship,state})=>{
  ship.course.replace(own);ship.course.swapMemory();const client=Client.restore(state()),courier=get(client,'allShips',ship),home=get(client,'stars',own);
  test.assertEqual(courier.course.waypoints[0].target,home);test.assertEqual(courier.course.memory.waypoints[0].target,home);
  const turn=client.turn;client.aiManager.processAITurns=()=>{throw Error('Client simulated AI');};test.assertFalse(client.endTurn());test.assertEqual(client.turn,turn);
  let invalidSave=false;try{Save.serialize(client);}catch(error){invalidSave=true;}test.assertTrue(invalidSave);
 }));
 test.it('keeps owned decisions editable after rejoining a posted turn while retaining its identity',()=>fixture(({game,own,state})=>{
  game.players[2].lastTurnPosted=game.turn;const client=Client.restore(state());test.assertTrue(client.clientTurnPosted);test.assertEqual(client.getCurrentHumanPlayer(),2);test.assertTrue(client.canHumanControl(get(client,'stars',own)));client.networkCommands={available:()=>true};test.assertFalse(client.canRequestEndTurn());
 }));
 test.it('allows posted owner actions while keeping posting, terminal, dead and administrator views protected',()=>fixture(({game,own,enemy,ship,state})=>{
  game.players[2].lastTurnPosted=game.turn;const client=Client.restore(state()),home=get(client,'stars',own),courier=get(client,'allShips',ship);client.networkCommands={available:()=>true};
  test.assertTrue(client.canHumanControl(home));test.assertFalse(client.canHumanControl(get(client,'stars',enemy)));test.assertFalse(client.canRequestEndTurn());test.assertTrue(client.beginRendezvousPlacement());client.handleKeyPress(pdg.key_Escape);test.assertNotNull(client.createRendezvousAt(home.x+10,home.y+20,2,'Posted point'));test.assertTrue(client.beginRenameObject(home));client.handleRenameKey(pdg.key_Escape,'');test.assertTrue(client.showCourse(courier));client.uiWindow=null;
  for(const flags of [{clientPosting:true},{isGameOver:true,canContinue:false},{clientAdministrator:true}]){Object.assign(client,flags);test.assertFalse(client.canHumanControl(home));test.assertFalse(client.beginRendezvousPlacement());test.assertNull(client.createRendezvousAt(home.x,home.y,2,'Blocked'));Object.assign(client,{clientPosting:false,isGameOver:false,clientAdministrator:false});}
  client.players[2].isAlive=false;test.assertFalse(client.canHumanControl(home));test.assertFalse(client.beginRendezvousPlacement());
 }));
 test.it('removes departing fleets from their systems so subsequent saves and reopen remain valid',()=>fixture(({game,own,ship})=>{
  const fleet=game.factory.createFleet(own.x,own.y,2,'Departing fleet');fleet.star=own;fleet.addShip(ship);own.ships.push(fleet);fleet.course.replace({x:own.x+50000,y:own.y+50000});fleet.move();test.assertNull(fleet.star);test.assertFalse(own.ships.includes(fleet));const restored=Save.restore(Save.serialize(game));test.assertNotNull(restored.allFleets.find(e=>e.id===fleet.id));
  fleet.x=own.x;fleet.y=own.y;fleet.syncShipPositions();fleet.star=own;own.ships.push(fleet);fleet.setDestination({x:own.x+70000,y:own.y+70000});test.assertNull(fleet.star);test.assertFalse(own.ships.includes(fleet));test.assertNotNull(Save.restore(Save.serialize(game)).allFleets.find(e=>e.id===fleet.id));
 }));
 test.it('keeps unsaved posted decisions across same-turn context updates and the next authoritative turn',()=>fixture(({game,own,state})=>{
  game.players[2].lastTurnPosted=game.turn;const client=new (require('../src/js/network-client.js').NetworkClient)('localhost');client.model=Client.restore(state());client.savedOrders=require('../src/js/client-writeback.js').signature(client.model);get(client.model,'stars',own).name='Waiting draft';test.assertTrue(client.hasUnsavedChanges());
  game.config.networkHost.initialStateRevision=1;own.population=12345;client.install(Client.restore(state()));test.assertTrue(client.model.clientTurnPosted);test.assertEqual(get(client.model,'stars',own).name,'Waiting draft');test.assertEqual(get(client.model,'stars',own).population,12345);
  game.turn++;client.install(Client.restore(state()));test.assertFalse(client.model.clientTurnPosted);test.assertEqual(get(client.model,'stars',own).name,'Waiting draft');test.assertTrue(client.hasUnsavedChanges());
 }));
 test.it('uses complete host comparison totals and native-language labels despite the partial map',()=>fixture(({game,state})=>{
  const client=Client.restore(state()),language=pdg.res.getLanguage();test.assertTrue(client.allShips.length<game.allShips.length);test.assertEqual(client.getMapShipCount(),game.allShips.length);
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const rows=client.getPlayerComparisonRows();
   test.assertEqual(rows[0].name,pdg.res.getString(811));test.assertEqual(rows[1].type,pdg.res.getString(300));test.assertEqual(rows[3].type,pdg.res.getString(504));test.assertEqual(rows[2].name,'航行 Jäger Второй');
   for(const source of state().comparisons){const row=rows.find(r=>r.playerNum===source.playerNum);test.assertEqual(row.ships,source.ships);test.assertEqual(row.population,source.population);test.assertEqual(row.production,source.production);}
  }}finally{pdg.res.setLanguage(language);}
 }));
 test.it('rejects malformed versions, slots, numbers, identities, dangling links and containment cycles before exposing a client',()=>fixture(({state,own,ship,fleet,hidden,game})=>{
  for(const mutate of [s=>s.version=99,s=>s.viewer=3,s=>s.map.width=0,s=>s.privatePlayer.playerNum=1,s=>s.entities.push(s.entities[0]),s=>s.entities[0].owner=999,s=>s.entities[0].kind='constructor',s=>s.entities[0].x=null,s=>s.comparisons.pop(),s=>s.comparisons[1].isComputer=true,s=>s.privatePlayer.defaultGrowth='bad',s=>s.map.width+=1,s=>s.entities.find(e=>e.kind==='ship' && e.id===ship.id).star={kind:'star',id:999999},s=>s.events=[{id:1,turn:1,title:'Wrong',message:'Private',recipient:1}]]){const data=state();mutate(data);rejects(()=>Client.restore(data));}
  fleet.setVisibilityTo(2,3);const data=state(),row=data.entities.find(e=>e.kind==='fleet' && e.id===fleet.id);row.ships=[{kind:'fleet',id:fleet.id}];rejects(()=>Client.restore(data));
 }));
});
