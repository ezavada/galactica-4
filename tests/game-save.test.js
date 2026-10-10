const test=require('./test-framework.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Chart=require('../src/js/chart-names.js'),Common=require('../src/js/common.js');
function fixture(generated=false) {
 const game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:!generated,sectorSize:1,numHumans:1,numComputers:1,gameTitle:'Save 星'}));
 let home=game.stars.find(s=>s.owner===1),enemy=game.stars.find(s=>s.owner===2);
 if(!generated){home=game.factory.createStar(100000,100000,'Home 星');home.owner=1;home.techLevel=8;home.population=10000;enemy=game.factory.createStar(900000,900000,'Enemy');enemy.owner=2;enemy.population=10000;game.players[1].homeStarId=home.id;game.players[2].homeStarId=enemy.id;}
 return {game,home,enemy};
}
function restored(game){return Save.restore(Save.serialize(game));}
function throws(fn){let rejected=false;try{fn();}catch(e){rejected=true;}test.assertTrue(rejected);}
module.exports=()=>test.describe('Complete local game save documents',()=>{
 test.it('round trips a generated galaxy with exact player and map state, without generating a replacement',()=>{
  const {game}=fixture(true),loaded=restored(game);test.assertEqual(loaded.config.gameTitle,'Save 星');test.assertEqual(loaded.stars.length,game.stars.length);test.assertFalse(loaded.stars[0]===game.stars[0]);
  test.assertEqual(JSON.stringify(Save.snapshot(loaded)),JSON.stringify(Save.snapshot(game)));test.assertFalse(loaded.config.skipMapGeneration);test.assertTrue(loaded.restoredFromSave);
 });
 test.it('retains allocation targets, fractional credits, paused/switched hulls and commissioning milestones',()=>{
  const {game,home}=fixture();home.growth.value=20;home.growth.desired=70;home.growth.locked=true;home.paidTowardResearch=998.5;home.startBuildingShip('colony');home.currentShip.progress=67.25;home.paidTowardShipBuilding=123.5;home.buildCredits.battleship=444;game.players[1].builtFighterClasses.add(3);
  const loaded=restored(game),star=loaded.stars[0];test.assertEqual(star.growth.value,20);test.assertEqual(star.growth.desired,70);test.assertTrue(star.growth.locked);test.assertTrue(typeof star.growth.adjustValue==='function');test.assertEqual(star.paidTowardResearch,998.5);test.assertEqual(star.currentShip.progress,67.25);test.assertEqual(star.buildCredits.battleship,444);test.assertTrue(loaded.players[1].builtFighterClasses.has(3));
 });
 test.it('preserves nested fleets, common references, live and remembered courses and free-space rendezvous',()=>{
  const {game,home,enemy}=fixture(),ship=game.factory.createShip(home.x,home.y,'battleship',home,true),root=game.factory.createFleet(home.x,home.y,1,'Root'),group=game.factory.createFleet(home.x,home.y,1,'Group');group.addShip(ship);root.addShip(group);
  const point=game.factory.createRendezvous(500000,600000,1,'Space');point.fleet=root;home.defaultDestination=point;root.course.addPlayerWaypoint(enemy);root.course.addPlayerWaypoint({x:200000,y:700000});root.course.loop=true;root.course.hunt=true;root.course.swapMemory();game.selectedObject=group;
  const loaded=restored(game),fleet=loaded.allFleets.find(f=>f.name==='Root'),child=fleet.ships[0];test.assertTrue(child.fleet===fleet);test.assertTrue(child.ships[0].fleet===child);test.assertTrue(loaded.selectedObject===child);test.assertTrue(fleet.course.owner===fleet);test.assertTrue(fleet.course.waypoints[1].target===loaded.stars[1]);test.assertTrue(fleet.course.memory.waypoints[1].target===loaded.stars[1]);test.assertTrue(loaded.allRendezvous[0].fleet===fleet);test.assertTrue(loaded.stars[0].defaultDestination===loaded.allRendezvous[0]);test.assertTrue(fleet.course.loop&&fleet.course.hunt);test.assertEqual(fleet.getSize(),1);
 });
 test.it('retains fog memory and hidden-homeworld aliases without revealing or recalculating enemies',()=>{
  const {game,enemy}=fixture();enemy.setVisibilityTo(1,Common.VisibilityLevel.CLASS);enemy.setLastSeen(1,3);enemy.setVisibilityTo(1,0);const lastSeenBy=enemy.lastSeenBy[1];game.turn=5;
  const loaded=restored(game);test.assertEqual(loaded.stars[1].getVisibilityTo(1),0);test.assertEqual(loaded.stars[1].getLastSeen(1),3);test.assertEqual(loaded.stars[1].lastSeenBy[1],lastSeenBy);
  enemy.lastSeen[1]=0;const alias=Chart.displayName(game,enemy,1);const hidden=restored(game);test.assertEqual(Chart.displayName(hidden,hidden.stars[1],1),alias);test.assertFalse(alias===enemy.name);
 });
 test.it('preserves queued reports, attention event identity and historical removed subjects',()=>{
  const {game,home}=fixture(),ship=game.factory.createShip(home.x,home.y,'scout',home,true);game.attention.request(ship);game.overlay={type:'lab',classIndex:1};game.overlayQueue=[{type:'stardock',classIndex:2}];const event=game.recordEvent('Lost','Destroyed',{subject:ship,recipient:1});game.entityRemoved(ship);
  const loaded=restored(game);test.assertEqual(loaded.allShips.length,0);test.assertTrue(loaded.eventLog.find(e=>e.title==='Lost').subject.game===loaded);test.assertTrue(loaded.attention.queue[0].event===loaded.eventLog.find(e=>e.type==='callIn'));test.assertTrue(loaded.attention.queue[0].object===loaded.eventLog.find(e=>e.title==='Lost').subject);test.assertEqual(loaded.overlay.type,'lab');test.assertEqual(loaded.overlayQueue[0].type,'stardock');
 });
 test.it('rebuilds spatial lookup and reconnects factories/rules/combat/visibility to the loaded graph',()=>{
  const {game,home}=fixture(),loaded=restored(game),star=loaded.stars[0];test.assertTrue(loaded.factory.game===loaded);test.assertTrue(star.game===loaded);test.assertTrue(loaded.combatSystem.game===loaded);test.assertTrue(loaded.visibilityCalculator.game===loaded);test.assertTrue(loaded.spatialPartition.getEntitiesInRange(home.x,home.y,1000).includes(star));
 });
 test.it('reserves entity IDs beyond saved and already open documents without collisions',()=>{
  const {game}=fixture();game.stars[0].id=100000;const loaded=restored(game),next=loaded.factory.createStar(1,1,'Next');test.assertTrue(next.id>100000);const other=game.factory.createStar(2,2,'Other');test.assertTrue(other.id>next.id);
 });
 test.it('retains terminal results, queued conclusions and replay state',()=>{
  const {game}=fixture();game.turn=9;game.markGameWon(1);const loaded=restored(game);test.assertTrue(loaded.isGameOver);test.assertEqual(loaded.winningPlayerNum,1);test.assertEqual(loaded.victoryTurn,9);test.assertEqual(loaded.overlay.kind,'win');test.assertTrue(loaded.getEventRows().some(e=>e.outcome));
 });
 test.it('restores camera and selection before the next drawing frame without replacing them with the homeworld',()=>{
  const {game,enemy}=fixture();game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);game.setSelectedObject(enemy);display.camera.setZoom(1.8);display.camera.centerOn(enemy.x,enemy.y);game.showNebula=false;game.mapDisplayMode='production';game.uiWindow='events';game.eventPage=2;game.eventDetailPage=1;
  const loaded=restored(game);loaded.port=game.port;const loadedDisplay=new Display(loaded);test.assertTrue(loadedDisplay.selectedObject===loaded.stars[1]);test.assertEqual(loadedDisplay.camera.zoom,1.8);test.assertEqual(loadedDisplay.camera.panX,display.camera.panX);test.assertFalse(loaded.showNebula);test.assertEqual(loaded.mapDisplayMode,'production');test.assertEqual(loaded.uiWindow,'events');test.assertEqual(loaded.eventPage,2);test.assertEqual(loaded.eventDetailPage,1);
 });
 test.it('continues movement and economy identically after round trip under the same random seed',()=>{
  const {game,home}=fixture();game.aiManager.processAITurns=()=>{};const ship=game.factory.createShip(home.x,home.y,'scout',home,true);ship.destination={x:800000,y:home.y};home.startBuildingShip('colony');home.currentShip.progress=10;const loaded=restored(game);loaded.aiManager.processAITurns=()=>{};
  pdg.srand(9876);game.endTurn();pdg.srand(9876);loaded.endTurn();test.assertEqual(loaded.turn,game.turn);test.assertEqual(loaded.allShips[0].x,game.allShips[0].x);test.assertEqual(loaded.stars[0].population,home.population);test.assertEqual(loaded.stars[0].currentShip.progress,home.currentShip.progress);test.assertEqual(loaded.stars[0].paidTowardResearch,home.paidTowardResearch);
 });
 test.it('rejects invalid headers, versions, references, classes, duplicate IDs and containment cycles',()=>{
  const {game}=fixture();throws(()=>Save.restore('garbage'));const mutate=fn=>{const d=Save.snapshot(game);fn(d);throws(()=>Save.restore(JSON.stringify(d)));};
  mutate(d=>d.version=99);mutate(d=>d.format='Other');mutate(d=>d.graph.root={ref:999999});mutate(d=>d.graph.nodes[0].type='Function');mutate(d=>d.graph.nodes.find(n=>n.type==='Star').properties.find(p=>p[0]==='x')[1]='bad');
  const second=game.factory.createStar(1,1,'Duplicate');second.id=game.stars[0].id;throws(()=>restored(game));game.stars.pop();
  const fleet=game.factory.createFleet(1,1,1,'Cycle');fleet.ships=[fleet];fleet.fleet=fleet;throws(()=>restored(game));
 });
 test.it('rejects prototype injection and dangling references without mutating the running game',()=>{
  const {game}=fixture(),before=game.stars[0].name;const doc=Save.snapshot(game);doc.graph.nodes[0].properties.push(['__proto__',{ref:0}]);throws(()=>Save.restore(JSON.stringify(doc)));test.assertEqual(game.stars[0].name,before);test.assertEqual({}.polluted,undefined);
  doc.graph.nodes[0].properties.pop();doc.graph.nodes[0].properties.push(['bad',{ref:-1}]);throws(()=>Save.restore(JSON.stringify(doc)));test.assertTrue(game.factory.game===game);
 });
});
