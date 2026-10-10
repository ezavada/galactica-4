const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1) {
 const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:2,skipMapGeneration:true}));
 const homes=[1,2,3].map(n=>{const star=game.factory.createStar(n*1000000,0,'Home '+n);star.owner=n;star.population=500;star.techLevel=5;return star;});
 const home=homes[owner-1],target=game.factory.createStar(home.x+1000,0,'New 星 $&');
 const colony=game.factory.createShip(home.x,home.y,'colony',home,true);home.shipArrived(colony);game.players[owner].name='Faction Д $&';
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);
 return {game,display,homes,home,target,colony};
}
function arrive(f){f.colony.destination=f.target;f.colony.move();return f.game.eventLog.filter(e=>e.colonization);}
module.exports=()=>test.describe('V3 neutral-colony owner and observer reports',()=>{
 test.it('broadcasts recipient-specific snapshots after actual colonization and automatically presents the owner report',()=>{
  const f=fixture(),events=arrive(f),owner=events.find(e=>e.recipient===1);test.assertEqual(events.length,3);test.assertEqual(f.target.owner,1);test.assertTrue(f.game.allShips.includes(f.colony));test.assertEqual(owner.type,Common.EventType.STAR_COLONIZED);test.assertTrue(owner.subject===f.target);test.assertContains(owner.message,'You have colonized');test.assertContains(owner.message,'New 星 $&');test.assertEqual(f.game.overlay.eventId,owner.id);test.assertFalse(f.game.overlay.animationOnly);test.assertNull(f.game.getReportDestructionPosition(owner));test.assertEqual(f.game.attention.pending().length,2);
  f.game.handleKeyPress(pdg.key_Escape);test.assertEqual(f.game.turn,1);test.assertEqual(f.game.attention.pending().length,1);test.assertEqual(f.game.attention.pending()[0].event.type,Common.EventType.RENAME_COLONY);test.assertFalse(f.game.attention.pending()[0].event.handled);test.assertTrue(owner.handled);test.assertTrue(f.game.attention.next());test.assertEqual(f.game.attention.pending().length,0);test.assertTrue(f.game.selectedObject===f.target);test.assertEqual(f.game.eventLog.find(e=>e.id===f.game.eventSelection).type,Common.EventType.RENAME_COLONY);
 });
 test.it('hides an undetected observer copy and the separate private naming instruction',()=>{
  const f=fixture(2),event=arrive(f).find(e=>e.recipient===1);test.assertTrue(event.observer);test.assertContains(event.message,'Faction Д $&');test.assertFalse(f.game.isEventAccessible(event));test.assertNull(f.game.overlay);test.assertEqual(f.game.attention.pending().length,0);f.game.config.omniscient=true;test.assertTrue(f.game.isEventAccessible(event));test.assertFalse(f.game.getEventRows().some(e=>e.type===Common.EventType.RENAME_COLONY));test.assertFalse(f.game.isEventAccessible(f.game.eventLog.find(e=>e.colonization&&!e.observer)));
 });
 test.it('presents detected observer reports with Show enemy events and skips them again when knowledge is lost',()=>{
  const f=fixture(2);f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);const event=arrive(f).find(e=>e.recipient===1);test.assertEqual(f.game.overlay.eventId,event.id);test.assertTrue(f.game.overlay.automaticObserver);test.assertTrue(f.game.selectedObject===f.target);f.game.handleKeyPress(pdg.key_Escape);f.game.turn=2;test.assertTrue(f.game.replayReport(event));f.game.handleKeyPress(pdg.key_Escape);f.target.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(f.game.isEventAccessible(event));test.assertFalse(f.game.replayReport(event));
 });
 test.it('retains manual replay when automatic observer playback is off and keeps quiet autoplay quiet',()=>{
  const f=fixture(2);f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);f.game.showEnemyEvents=false;const event=arrive(f).find(e=>e.recipient===1);test.assertNull(f.game.overlay);test.assertFalse(f.game.queueObserverReports());f.game.turn=2;test.assertTrue(f.game.replayReport(event));test.assertFalse(f.game.overlay.automaticObserver);f.game.handleKeyPress(pdg.key_Escape);
  const quiet=fixture();quiet.game.config.autoplay={enabled:true,showEventWindows:false};arrive(quiet);test.assertNull(quiet.game.overlay);test.assertEqual(quiet.game.overlayQueue.length,0);test.assertTrue(quiet.game.eventLog.some(e=>e.colonization));
 });
 test.it('defers observer presentation until end-turn visibility refresh',()=>{
  const f=fixture(2);f.game.config.omniscient=true;f.colony.destination=f.target;f.game.aiManager.processAITurns=()=>{};
  const update=f.game.visibilityCalculator.updateAllVisibility.bind(f.game.visibilityCalculator);let refreshed=false;f.game.visibilityCalculator.updateAllVisibility=()=>{test.assertNull(f.game.overlay);refreshed=true;return update();};
  f.game.endTurn();test.assertTrue(refreshed);test.assertEqual(f.game.turn,2);test.assertDefined(f.game.eventLog.find(e=>e.id===f.game.overlay.eventId).colonization);test.assertTrue(f.game.overlay.automaticObserver);
 });
 test.it('processes disabled automatic observer reports without stealing attention and retains manual replay',()=>{
  const f=fixture(2);f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);f.game.showEnemyEvents=false;const selected=f.game.stars[0];f.game.setSelectedObject(selected);
  const event=arrive(f).find(e=>e.recipient===1);test.assertFalse(event.handled);test.assertFalse(f.game.queueObserverReports());test.assertTrue(event.handled);test.assertEqual(f.game.attention.pending().length,0);test.assertTrue(f.game.selectedObject===selected);test.assertNull(f.game.overlay);
  const loaded=Save.restore(Save.serialize(f.game)),saved=loaded.eventLog.find(e=>e.id===event.id);test.assertTrue(saved.handled);loaded.turn=2;loaded.showEnemyEvents=true;test.assertFalse(loaded.queueObserverReports());test.assertTrue(loaded.replayReport(saved));test.assertFalse(loaded.overlay.automaticObserver);
 });
 test.it('finishes queued enemy reports silently when playback is disabled during an owned report',()=>{
  const f=fixture(2);f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);f.game.setSelectedObject(f.game.stars[0]);f.game.overlay={type:'lab',classIndex:1};
  const event=arrive(f).find(e=>e.recipient===1);test.assertEqual(f.game.overlayQueue.length,1);f.game.showEnemyEvents=false;test.assertTrue(f.game.dismissEventPresentation());test.assertNull(f.game.overlay);test.assertEqual(f.game.overlayQueue.length,0);test.assertTrue(event.handled);test.assertEqual(f.game.attention.pending().length,0);test.assertTrue(f.game.selectedObject===f.game.stars[0]);
  f.game.turn=2;test.assertTrue(f.game.replayReport(event));test.assertFalse(f.game.overlay.automaticObserver);
 });
 test.it('preserves pending presentation, literal names and recipient privacy through saves and replay',()=>{
  const f=fixture(),event=arrive(f).find(e=>e.recipient===1),message=event.message;f.target.name='Renamed';f.game.players[1].name='Changed';const loaded=Save.restore(Save.serialize(f.game)),saved=loaded.eventLog.find(e=>e.id===event.id);test.assertEqual(saved.message,message);test.assertEqual(saved.colonization.starName,'New 星 $&');test.assertTrue(saved.subject===loaded.stars[3]);test.assertEqual(loaded.overlay.eventId,saved.id);loaded.handleKeyPress(pdg.key_Escape);test.assertTrue(saved.handled);test.assertEqual(loaded.attention.pending().length,1);test.assertEqual(loaded.attention.pending()[0].event.type,Common.EventType.RENAME_COLONY);test.assertTrue(loaded.attention.next());test.assertEqual(loaded.attention.pending().length,0);loaded.turn=2;test.assertTrue(loaded.replayReport(saved));loaded.handleKeyPress(pdg.key_Escape);test.assertEqual(loaded.turn,2);
 });
 test.it('does not invent neutral-colony reports for enemy captures or duplicate arrivals at owned systems',()=>{
  const f=fixture();f.game.colonizeStar(f.target,f.colony,2);test.assertFalse(f.game.eventLog.some(e=>e.colonization));const normal=fixture();arrive(normal);const count=normal.game.eventLog.filter(e=>e.colonization).length;test.assertFalse(normal.game.colonizeStar(normal.target,normal.colony));test.assertEqual(normal.game.eventLog.filter(e=>e.colonization).length,count);
 });
 test.it('fits complete owner and observer narratives and report controls in every supported language',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const owner of [1,2]){const f=fixture(owner);f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);const event=arrive(f).find(e=>e.recipient===1);test.assertFalse(/\{\d+\}/.test(event.message));test.assertContains(event.message,'New 星 $&');test.assertEqual(f.game.overlay.eventId,event.id);const layout=f.display.getReportLayout(f.game.overlay);for(const line of layout.lines)test.assertTrue(f.game.port.getTextWidth(line,13)<=layout.rect.width-40);for(const button of layout.buttons)test.assertTrue(button.rect.x>=layout.rect.x&&button.rect.x+button.rect.width<=layout.rect.x+layout.rect.width);}}}finally{pdg.res.setLanguage(language);}
 });
});
