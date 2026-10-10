const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js'),I18n=require('../src/js/i18n.js');
function fixture() {
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:2}));
 const homes=[1,2,3].map(owner=>{const star=game.factory.createStar(owner*1000000,0,'Home '+owner);star.owner=owner;star.population=100;star.techLevel=20;return star;});
 game.players[2].name='Invader Д $&';game.players[3].name='Defender 星';
 const target=game.factory.createStar(0,0,'Captured 星 $&');target.owner=3;target.population=1;target.techLevel=1;target.setVisibilityTo(1,Common.VisibilityLevel.NONE);
 const fleet=game.factory.createFleet(-1000,0,2,'Invaders'),warship=game.factory.createShip(-1000,0,'battleship',homes[1],true),colony=game.factory.createShip(-1000,0,'colony',homes[1],true);
 fleet.addShip(warship);fleet.addShip(colony);fleet.star=null;fleet.x=-1000;fleet.y=0;fleet.syncShipPositions();fleet.setDestination(target);
 game.port={getDrawingArea:()=>new pdg.Rect(320,340),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
 const display=new Display(game);game.setDisplay(display);return {game,display,target,fleet,warship,colony};
}
function invade(f){pdg.srand(42);f.fleet.move();return f.game.eventLog.find(e=>e.occupation&&e.occupation.side==='observer');}
module.exports=()=>test.describe('V3 capture observer reports',()=>{
 test.it('broadcasts capture to outsiders while hiding an undetected subject under fog',()=>{
  const f=fixture(),event=invade(f);test.assertEqual(f.target.owner,2);test.assertNotNull(event);test.assertEqual(event.recipient,1);test.assertTrue(event.observer);
  test.assertContains(event.message,'Invader Д $&');test.assertContains(event.message,'Defender 星');test.assertContains(event.message,'Captured 星 $&');
  test.assertFalse(f.game.isEventAccessible(event));test.assertFalse(f.game.getEventRows().includes(event));test.assertFalse(f.game.replayReport(event));test.assertNull(f.game.getEventFocus(event));
  test.assertNull(f.game.overlay);test.assertEqual(f.game.attention.pending().length,0);
  test.assertFalse(f.game.eventLog.some(e=>e.occupation&&e.occupation.kind==='defendersLost'&&e.recipient===1));
 });
 test.it('allows any current detection and suppresses observer access again after detection is lost',()=>{
  const f=fixture();f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);const event=invade(f);
  test.assertTrue(f.game.getEventRows().includes(event));test.assertTrue(f.game.getEventFocus(event).object===f.target);test.assertNull(f.game.overlay);
  f.target.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(f.game.isEventAccessible(event));test.assertFalse(f.game.selectEvent(event));test.assertFalse(f.game.replayReport(event));
 });
 test.it('allows allied and all-visible capture reports without leaking private resistance or destruction',()=>{
  const f=fixture(),event=invade(f);f.game.players[2].isAllyOf=owner=>owner===1||owner===2;test.assertTrue(f.game.isEventAccessible(event));delete f.game.players[2].isAllyOf;
  test.assertFalse(f.game.isEventAccessible(event));f.game.config.omniscient=true;test.assertTrue(f.game.getEventRows().includes(event));
  test.assertFalse(f.game.getEventRows().some(e=>e.occupation&&e.occupation.side!=='observer'));
  const privateEvent=f.game.recordEvent('Combat','Private',{recipient:2,subject:f.target});privateEvent.destruction={kind:'ship'};
  test.assertFalse(f.game.isEventAccessible(privateEvent));test.assertFalse(f.game.replayReport(privateEvent));
 });
 test.it('preserves literal observer snapshots and visibility gates through complete saves and manual replay',()=>{
  const f=fixture();f.game.config.omniscient=true;const event=invade(f),message=event.message;f.target.name='Changed';f.game.players[2].name='Changed';
  const loaded=Save.restore(Save.serialize(f.game)),report=loaded.eventLog.find(e=>e.id===event.id);
  test.assertTrue(report.observer);test.assertEqual(report.message,message);test.assertEqual(report.occupation.attackerName,'Invader Д $&');test.assertNull(loaded.overlay);
  loaded.uiWindow='events';test.assertTrue(loaded.replayReport(report));test.assertEqual(loaded.overlay.eventId,report.id);test.assertFalse(loaded.overlay.animationOnly);
  const turn=loaded.turn;loaded.handleKeyPress(pdg.key_Escape);test.assertTrue(report.handled);test.assertEqual(loaded.turn,turn);test.assertNull(loaded.overlay);
  loaded.config.omniscient=false;test.assertFalse(loaded.isEventAccessible(report));
 });
 test.it('does not invent observer capture reports for resistance alone, failed invasions or neutral colonies',()=>{
  let f=fixture();f.fleet.removeShip(f.colony);f.game.removeDestroyedShip(f.colony,2,false);pdg.srand(42);f.fleet.move();
  test.assertEqual(f.target.owner,0);test.assertFalse(f.game.eventLog.some(e=>e.observer));
  f=fixture();f.target.owner=0;f.fleet.move();test.assertEqual(f.target.owner,2);test.assertFalse(f.game.eventLog.some(e=>e.occupation));
  f=fixture();f.target.population=100000;f.target.techLevel=100;f.warship.getOneAttackAgainst=()=>0;f.colony.getOneAttackAgainst=()=>0;f.target.getOneAttackAgainst=()=>10000;
  f.fleet.move();test.assertEqual(f.target.owner,3);test.assertFalse(f.game.eventLog.some(e=>e.observer));
 });
 test.it('localizes complete observer narratives and fits replay controls in every supported language',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   const f=fixture();f.game.config.omniscient=true;const event=invade(f);test.assertFalse(/\{\d+\}/.test(event.message));test.assertContains(event.message,'Captured 星 $&');
   test.assertEqual(event.message,I18n.formatString(937,'','Captured 星 $&','Invader Д $&','Defender 星'));test.assertTrue(f.game.replayReport(event));
   const layout=f.display.getReportLayout(f.game.overlay);test.assertTrue(layout.lines.length>0);
   for(const line of layout.lines)test.assertTrue(f.game.port.getTextWidth(line,13)<=layout.rect.width-40);
   for(const button of layout.buttons)test.assertTrue(button.rect.x>=layout.rect.x&&button.rect.x+button.rect.width<=layout.rect.x+layout.rect.width);
  }}finally{pdg.res.setLanguage(language);}
 });
});
