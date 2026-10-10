const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js'),Sound=require('../src/js/sound.js'),Common=require('../src/js/common.js');
function fixture(owner=2) {
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:2,skipMapGeneration:true}));
 game.rules.isFast=game.config.fastGame;
 const homes=[1,2,3].map(n=>{const star=game.factory.createStar(n*1000000,0,'Home '+n);star.owner=n;star.population=500;star.techLevel=8;return star;});
 const star=homes[owner-1];star.name='Origin 星 $&';game.players[owner].name='Faction Д $&';game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.aiManager.processAITurns=()=>{};game.rules.getStarResearchAmount=()=>0;
 return {game,display,star,homes,build:type=>{star.startBuildingShip(type);return star.completeShip();},reports:()=>game.eventLog.filter(e=>e.commissioning)};
}
module.exports=()=>test.describe('V3 first-class commissioning broadcasts',()=>{
 test.it('broadcasts first hulls and higher fighter classes, with observer narratives and private owner art',()=>{
  const f=fixture();f.game.config.omniscient=true;
  for(const type of ['defense','scout','colony','battleship'])f.build(type);
  test.assertEqual(f.reports().length,12);const copies=f.reports().filter(e=>e.recipient===1);test.assertEqual(copies.length,4);test.assertTrue(copies.every(e=>e.observer&&e.subject===f.star));test.assertTrue(copies.every(e=>e.message.includes('Faction Д $&')&&e.message.includes('Origin 星 $&')&&e.message.includes('8')));test.assertFalse([f.game.overlay,...f.game.overlayQueue].some(o=>o.type==='stardock'));
  for(const type of ['defense','scout','colony','battleship'])f.build(type);test.assertEqual(f.reports().length,12);f.star.techLevel=15;f.build('battleship');test.assertEqual(f.reports().length,15);f.star.techLevel=5;f.build('battleship');test.assertEqual(f.reports().length,15);
 });
 test.it('retains the private owner illustrated event and acknowledges its attention request',()=>{
  const f=fixture(1),ship=f.build('scout'),event=f.reports().find(e=>!e.observer);test.assertEqual(f.game.overlay.type,'stardock');test.assertEqual(f.game.overlay.eventId,event.id);test.assertTrue(f.game.overlay.ship===ship);test.assertTrue(f.game.overlay.origin===f.star);test.assertTrue(event.subject===f.star);test.assertEqual(f.game.attention.pending().length,1);f.game.dismissEventPresentation();test.assertTrue(event.handled);test.assertEqual(f.game.attention.pending().length,0);test.assertTrue(f.game.selectedObject===f.star);
 });
 test.it('requires current detection or alliance for observer presentation and hides private owner copies',()=>{
  const f=fixture();f.build('scout');const event=f.reports().find(e=>e.recipient===1);test.assertFalse(f.game.isEventAccessible(event));test.assertNull(f.game.overlay);test.assertEqual(f.game.attention.pending().length,0);test.assertFalse(f.game.isEventAccessible(f.reports().find(e=>!e.observer)));f.star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertTrue(f.game.queueObserverReports());test.assertTrue(f.game.overlay.eventId===event.id);f.game.dismissEventPresentation();f.star.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(f.game.isEventAccessible(event));
 });
 test.it('retains manual replay with automatic playback off and remains silent in quiet autoplay',()=>{
  const f=fixture();f.game.config.omniscient=true;f.game.showEnemyEvents=false;f.build('colony');test.assertNull(f.game.overlay);f.game.turn++;const event=f.game.getEventRows().find(e=>e.commissioning);test.assertTrue(f.game.replayReport(event));test.assertFalse(f.game.overlay.automaticObserver);test.assertEqual(f.game.overlay.type,'report');test.assertNull(f.game.getReportDestructionPosition(event));f.game.dismissEventPresentation();f.game.config.autoplay={enabled:true,showEventWindows:false};test.assertFalse(f.game.replayReport(event));test.assertNull(f.game.overlay);
 });
 test.it('snapshots the class, faction, tech and construction origin before automatic departure and renaming',()=>{
  const f=fixture();f.game.config.omniscient=true;f.star.setDefaultDestination({x:f.star.x+1000000,y:f.star.y});const ship=f.build('battleship'),event=f.reports().find(e=>e.recipient===1),message=event.message;test.assertTrue(ship.x!==f.star.x);test.assertTrue(event.subject===f.star);test.assertEqual(event.position.x,f.star.x);test.assertEqual(event.commissioning.techLevel,8);f.star.name='Changed';f.game.players[2].name='Changed';ship.name='Changed';ship.techLevel=20;test.assertEqual(event.message,message);test.assertEqual(event.commissioning.starName,'Origin 星 $&');test.assertEqual(event.commissioning.ownerName,'Faction Д $&');
 });
 test.it('waits for the actual end-turn visibility update before showing an observer broadcast',()=>{
  const f=fixture();f.star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);f.star.startBuildingShip('scout');f.star.currentShip.cost=1;f.game.rules.getStarShipBuildingAmount=s=>s===f.star?1:0;
  let during=false;f.game.visibilityCalculator.updateAllVisibility=()=>{during=true;test.assertNull(f.game.overlay);test.assertTrue(f.reports().length>0);f.star.setVisibilityTo(1,Common.VisibilityLevel.NONE);};f.game.endTurn();test.assertTrue(during);test.assertNull(f.game.overlay);test.assertFalse(f.game.updatingStars);
 });
 test.it('preserves broadcasts, pending replay and milestones in saves and selects the observer sound',()=>{
  const f=fixture();f.game.config.omniscient=true;f.build('defense');delete f.game.rules.getStarResearchAmount;const loaded=Save.restore(Save.serialize(f.game)),event=loaded.eventLog.find(e=>e.commissioning&&e.recipient===1);test.assertTrue(event.subject===loaded.stars.find(s=>s.owner===2));test.assertTrue(event.observer);test.assertEqual(loaded.overlay.eventId,event.id);test.assertEqual(Sound.eventCue(event),1014);test.assertEqual(Sound.eventCue(loaded.eventLog.find(e=>e.commissioning&&!e.observer)),1011);loaded.overlay=null;loaded.overlayQueue=[];const star=loaded.stars.find(s=>s.owner===2);star.startBuildingShip('defense');star.completeShip();test.assertNull(loaded.overlay);loaded.turn++;test.assertTrue(loaded.replayReport(event));test.assertFalse(loaded.overlay.automaticObserver);
 });
 test.it('localizes the observer narrative in every supported language',()=>{
  const fs=require('fs'),path=require('path');for(const lang of ['en','de','es','fr','ja','ru']){const s=fs.readFileSync(path.join(__dirname,'../data/',lang==='en'?'strings.txt':'strings-'+lang+'.txt'),'utf8');const line=s.split('\n').find(line=>line.startsWith('957\t'));test.assertNotNull(line);for(const i of [0,1,2,3])test.assertContains(line,'{'+i+'}');}
 });
});
