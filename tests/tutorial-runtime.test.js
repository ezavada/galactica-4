const test=require('./test-framework.js'),fs=require('fs'),path=require('path');
const {createTutorialGame}=require('../src/js/tutorial-game.js'),Tutorial=require('../src/js/tutorial-controller.js'),Runtime=require('../src/js/tutorial-runtime.js'),Display=require('../src/js/display.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tutorial/galaxy.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-tutorial.json'),'utf8')).languages.en.pages;
function setup(){const game=createTutorialGame(fixture);game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);game.getCurrentMilliseconds=()=>100;game.aiManager.processAITurns=()=>{};const tutorial=new Tutorial(pages),runtime=new Runtime(game,tutorial),home=game.stars.find(s=>s.id===2),terra=game.stars.find(s=>s.id===9),s7=game.stars.find(s=>s.id===7);return {game,display,tutorial,runtime,home,terra,s7};}
function colony(game,home){const ship=game.factory.createShip(home.x,home.y,'colony',home,true);home.shipArrived(ship);return ship;}
module.exports=()=>test.describe('Tutorial bindings to real game actions',()=>{
 test.it('waits for a successful allocation change and the game clock debounce',()=>{
  const {game,tutorial,runtime,home}=setup();tutorial.goto(10);home.shipBuilding.locked=true;test.assertFalse(game.setStarAllocation(home,'shipBuilding',20));test.assertNull(tutorial.deadline);home.shipBuilding.locked=false;test.assertTrue(game.setStarAllocation(home,'shipBuilding',20));test.assertEqual(tutorial.deadline,2100);game.getCurrentMilliseconds=()=>2100;test.assertFalse(runtime.tick());game.getCurrentMilliseconds=()=>2101;test.assertTrue(runtime.tick());test.assertEqual(tutorial.pageId,11);test.assertTrue(game.selectedObject===home);
 });
 test.it('rejects a wrong first course without mutating the actual ship, then retries successfully',()=>{
  const {game,tutorial,home,terra,s7}=setup(),ship=colony(game,home);tutorial.goto(16);test.assertTrue(game.beginMapOrder(ship));test.assertEqual(tutorial.pageId,17);test.assertFalse(game.issuePlayerWaypoint(ship,s7));test.assertEqual(ship.course.waypoints.length,0);test.assertNull(ship.destination);test.assertEqual(tutorial.pageId,18);tutorial.pressButton();game.beginMapOrder(ship);test.assertTrue(game.issuePlayerWaypoint(ship,terra));test.assertEqual(tutorial.pageId,19);test.assertTrue(ship.destination===terra);
 });
 test.it('advances build lessons only for successful human hull choices through buttons or keys',()=>{
  const {game,tutorial,home}=setup(),enemy=game.stars.find(s=>s.owner===2);tutorial.goto(19);game.executeUIAction({type:'buildShip',object:enemy,shipType:'defense'});test.assertEqual(tutorial.pageId,19);game.executeUIAction({type:'buildShip',object:home,shipType:'scout'});test.assertEqual(tutorial.pageId,19);game.executeUIAction({type:'buildShip',object:home,shipType:'defense'});test.assertEqual(tutorial.pageId,20);game.executeUIAction({type:'equalizeAllocations',star:home});test.assertEqual(tutorial.pageId,21);tutorial.goto(31);game.handleStarKeyPress(home,'s'.charCodeAt(0));test.assertEqual(tutorial.pageId,32);test.assertEqual(home.currentShip.type,'scout');
 });
 test.it('records the forced colony name in the actual rename event while rejecting blank edits',()=>{
  const {game,tutorial,terra}=setup();terra.owner=1;tutorial.goto(25);game.beginRenameObject(terra);game.renameText='  ';game.commitRename();test.assertEqual(tutorial.pageId,25);game.beginRenameObject(terra);game.renameText='Wrong name';game.commitRename();test.assertEqual(terra.name,'New Terra');test.assertEqual(tutorial.pageId,26);test.assertContains(game.eventLog[game.eventLog.length-1].message,'New Terra');
 });
 test.it('keeps placement captured for a rejected point, then opens naming and binds the real rendezvous ID',()=>{
  const {game,display,tutorial,home,terra}=setup();tutorial.goto(38);game.beginRendezvousPlacement();test.assertEqual(tutorial.pageId,39);display.toGalacticX=x=>x;display.toGalacticY=y=>y;game.findObjectAtPosition=()=>null;const pending=game.pendingRendezvousPlacement;test.assertFalse(game.finishRendezvousPlacementAt(0,0));test.assertTrue(game.pendingRendezvousPlacement===pending);test.assertEqual(game.allRendezvous.length,0);const x=(home.x+terra.x)/2,y=(home.y+terra.y)/2;test.assertTrue(game.finishRendezvousPlacementAt(x,y));const point=game.allRendezvous[0];test.assertEqual(tutorial.pageId,40);test.assertEqual(tutorial.alphaId,point.id);test.assertTrue(game.renameTarget===point);test.assertEqual(game.uiWindow,'rename');game.renameText='Wrong';game.commitRename();test.assertEqual(point.name,'Alpha');test.assertEqual(tutorial.pageId,41);
 });
 test.it('sets both actual star auto-destinations to the bound point',()=>{
  const {game,tutorial,home,terra}=setup();terra.owner=1;tutorial.goto(39);const point=game.createRendezvousAt((home.x+terra.x)/2,(home.y+terra.y)/2);game.renameText='Alpha';game.commitRename();game.setSelectedObject(home);game.handleMouseRightClick(0,0,{target:point});test.assertTrue(home.getDefaultDestination()===point);test.assertEqual(tutorial.pageId,42);game.setSelectedObject(terra);game.handleMouseRightClick(0,0,{target:point});test.assertTrue(terra.getDefaultDestination()===point);test.assertEqual(tutorial.pageId,43);
 });
 test.it('uses real event windows and acknowledgment rather than treating End Turn as Next',()=>{
  const {game,tutorial}=setup();tutorial.goto(12);game.endTurn();test.assertEqual(game.turn,2);test.assertEqual(tutorial.pageId,13);test.assertEqual(game.overlay.type,'stardock');game.dismissEventPresentation();test.assertEqual(tutorial.pageId,14);game.overlay=null;game.overlayQueue=[];game.attention.next();test.assertEqual(tutorial.pageId,15);
 });
 test.it('acknowledges the first real ship report through Enter without processing another tutorial turn',()=>{
  const {game,tutorial}=setup();tutorial.goto(12);game.endTurn();test.assertEqual(tutorial.pageId,13);test.assertEqual(game.overlay.type,'stardock');
  const turn=game.turn;game.handleKeyPress(13);test.assertEqual(game.turn,turn);test.assertEqual(tutorial.pageId,14);
  for(let i=0;i<20 && game.overlay;i++)game.handleKeyPress(13);test.assertNull(game.overlay);
  game.handleKeyPress(pdg.key_Tab);test.assertEqual(tutorial.pageId,15);test.assertEqual(game.turn,turn);test.assertEqual(game.selectedObject.type,'colony');
 });
 test.it('selects the real newly commissioned Scout after its report before the next lesson orders',()=>{
  const {game,tutorial,home,runtime}=setup();game.turn=4;home.startBuildingShip('scout');tutorial.goto(32);game.endTurn();
  test.assertEqual(tutorial.pageId,33);test.assertEqual(game.overlay.type,'stardock');test.assertTrue(game.turnAttentionPending);
  game.handleKeyPress(13);test.assertEqual(tutorial.pageId,34);for(let i=0;i<20 && game.overlay;i++)game.handleKeyPress(13);test.assertNull(game.overlay);test.assertTrue(game.presentTurnAttention());
  test.assertEqual(game.selectedObject.type,'scout');test.assertEqual(game.selectedObject.id,runtime.roleIds.scout);test.assertEqual(tutorial.pageId,34);
  test.assertTrue(game.beginMapOrder(game.selectedObject));test.assertTrue(game.issuePlayerWaypoint(game.selectedObject,game.stars.find(s=>s.id===9)));test.assertEqual(tutorial.pageId,35);
 });
 test.it('distinguishes a real attention item from an empty queue and applies the source courier correction',()=>{
  const {game,tutorial,home,s7}=setup(),ship=game.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(ship);tutorial.goto(29);game.attention.request(ship);game.attention.next();test.assertEqual(tutorial.pageId,29);game.attention.next();test.assertEqual(tutorial.pageId,30);game.setSelectedObject(home);test.assertEqual(tutorial.pageId,31);tutorial.goto(44);game.attention.next();test.assertEqual(tutorial.pageId,45);test.assertTrue(ship.destination===s7);
 });
 test.it('advances actual patrol and comparison open/close actions',()=>{
  const {game,tutorial,home}=setup(),ship=colony(game,home);tutorial.goto(48);test.assertTrue(game.togglePatrol(ship));test.assertTrue(ship.isOnPatrol());test.assertEqual(tutorial.pageId,49);tutorial.goto(50);game.toggleUIWindow('comparison');test.assertEqual(game.uiWindow,'comparison');test.assertEqual(tutorial.pageId,51);game.executeUIAction({type:'closePlayerComparison'});test.assertEqual(tutorial.pageId,52);
 });
 test.it('uses the real fleet contents table without bypassing knowledge gates',()=>{
  const {game,tutorial,home}=setup(),ship=colony(game,home),fleet=game.factory.createFleet(home.x,home.y,1,'Fleet');fleet.addShip(ship);home.shipArrived(fleet);tutorial.goto(57);test.assertTrue(game.showFleetExchange(fleet));test.assertEqual(game.uiWindow,'fleetExchange');test.assertEqual(tutorial.pageId,58);
 });
 test.it('uses successful display zoom changes and restores wrapped methods exactly on disposal',()=>{
  const {game,display,tutorial,runtime}=setup();tutorial.goto(7);display.zoomIn();test.assertEqual(tutorial.deadline,3100);const inherited=Object.getPrototypeOf(game).issuePlayerWaypoint;test.assertTrue(Object.hasOwn(game,'issuePlayerWaypoint'));test.assertTrue(runtime.dispose());test.assertFalse(runtime.dispose());test.assertFalse(Object.hasOwn(game,'issuePlayerWaypoint'));test.assertTrue(game.issuePlayerWaypoint===inherited);test.assertTrue(!game.tutorialRuntime);tutorial.goto(10);game.setStarAllocation(game.selectedObject,'shipBuilding',20);test.assertNull(tutorial.deadline);
 });
 test.it('applies the late playback change before draining queued observer messages',()=>{
  const {game,tutorial}=setup();tutorial.goto(55);game.endTurn();test.assertTrue(game.overlayQueue.some(overlay=>overlay.automaticObserver));game.dismissEventPresentation();test.assertEqual(tutorial.pageId,56);test.assertFalse(game.showEnemyEvents);test.assertNull(game.overlay);test.assertEqual(game.overlayQueue.length,0);
 });
 test.it('retains the original courier identity rather than substituting another surviving scout',()=>{
  const {game,tutorial,runtime,home,s7}=setup(),first=game.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(first);game.setSelectedObject(first);const second=game.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(second);game.removeDestroyedShip(first,2,false);tutorial.goto(44);game.attention.queue=[];game.attention.next();test.assertEqual(runtime.roleIds.scout,first.id);test.assertNull(second.destination);test.assertFalse(second.destination===s7);
 });
 test.it('round-trips bound identities and controller progress and rejects a hull identity mismatch',()=>{
  const {game,tutorial,runtime,home}=setup(),ship=colony(game,home);game.setSelectedObject(ship);tutorial.goto(28);const saved=JSON.parse(JSON.stringify(runtime.snapshot()));tutorial.goto(50);runtime.restore(saved);test.assertEqual(tutorial.pageId,28);test.assertEqual(runtime.roleIds.colony,ship.id);test.assertThrows(()=>runtime.restore({...saved,roles:{colony:null,scout:ship.id}}));test.assertThrows(()=>runtime.restore({...saved,roles:{colony:-1,scout:null}}));
 });
 test.it('rolls back a failed attachment without leaving a partially wrapped game',()=>{
  const game=createTutorialGame(fixture),original=game.issuePlayerWaypoint;game.display={};test.assertThrows(()=>new Runtime(game,new Tutorial(pages)));test.assertTrue(game.issuePlayerWaypoint===original);test.assertFalse(Object.hasOwn(game,'issuePlayerWaypoint'));test.assertTrue(!game.tutorialRuntime);
 });
 test.it('does not persist tutorial playback/help changes into normal game preferences',()=>{
  const {game,tutorial}=setup();let writes=0;game.drawingPreferences={writeEnemyEvents:()=>writes++,writeControlHelp:()=>writes++};game.showEnemyEvents=false;game.showControlHelp=false;tutorial.goto(60);test.assertTrue(game.showEnemyEvents);test.assertTrue(game.showControlHelp);test.assertEqual(writes,0);
 });
});
