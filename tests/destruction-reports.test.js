const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Effect=require('../src/js/destruction-effect.js'),Save=require('../src/js/game-save.js'),I18n=require('../src/js/i18n.js');
function fixture(winner=1,loser=2,group=false,nested=false) {
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:2}));
 const homes=[1,2,3].map(owner=>{const star=game.factory.createStar(owner*1000000,0,'Home '+owner);star.owner=owner;star.population=100;star.techLevel=owner===winner?20:1;return star;});
 game.players[winner].name='Winner Д $&';game.players[loser].name='Loser 星';
 const strong=game.factory.createShip(0,0,'battleship',homes[winner-1],true),weak=game.factory.createShip(1000,0,'scout',homes[loser-1],true);
 strong.name='Hunter 星';weak.name='Victim Д $&';strong.star=null;weak.star=null;strong.x=0;weak.x=1000;strong.y=weak.y=0;
 let attacker=strong,target=weak;
 if(group) {
  attacker=game.factory.createFleet(0,0,winner,'Hunter fleet');attacker.addShip(strong);attacker.star=null;
  target=game.factory.createFleet(1000,0,loser,'Victim fleet 星 $&');
  if(nested){const child=game.factory.createFleet(1000,0,loser,'Subfleet');child.addShip(weak);target.addShip(child);}else target.addShip(weak);
  target.star=null;
 }
 game.port={getDrawingArea:()=>new pdg.Rect(480,400),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2,drawCircle:()=>{},drawLine:()=>{},drawRect:()=>{}};
 const display=new Display(game);game.setDisplay(display);display.visualTime=1000;
 return {game,display,homes,strong,weak,attacker,target};
}
function battle(f,reverse=false){const attacker=reverse?f.target:f.attacker,target=reverse?f.attacker:f.target;attacker.setDestination(target);pdg.srand(42);attacker.move();return f.game.eventLog.filter(e=>e.destruction);}
module.exports=()=>test.describe('V3 individual destruction reports',()=>{
 test.it('retains separate winner and loser notices after actual open-space ship arrival',()=>{
  const f=fixture(),events=battle(f);test.assertEqual(events.length,2);test.assertFalse(f.game.allShips.includes(f.weak));
  const winner=events.find(e=>e.recipient===1),loser=events.find(e=>e.recipient===2);
  test.assertEqual(winner.type,Common.EventType.SHIP_DESTROYED);test.assertContains(winner.message,'destroyed');test.assertContains(winner.message,'Victim Д $&');test.assertContains(winner.message,'Loser 星');
  test.assertContains(loser.message,'lost your starship');test.assertContains(loser.message,'Winner Д $&');test.assertEqual(winner.position.x,1000);test.assertEqual(winner.position.y,0);
  test.assertEqual(winner.destruction.side,'winner');test.assertEqual(loser.destruction.side,'loser');test.assertTrue(f.game.hasReplayableReport(winner));
 });
 test.it('suppresses ships defending their own systems but reports independent invading losses',()=>{
  let f=fixture();f.weak.star=f.homes[1];f.homes[1].ships.push(f.weak);test.assertEqual(battle(f).length,0);
  f=fixture();const target=f.homes[0];f.weak.x=target.x-1000;f.weak.y=target.y;f.weak.setDestination(target);
  f.weak.getOneAttackAgainst=()=>0;target.getOneAttackAgainst=()=>10000;f.weak.move();
  const events=f.game.eventLog.filter(e=>e.destruction);test.assertEqual(events.length,2);test.assertEqual(events[0].destruction.owner,2);test.assertEqual(events[0].destruction.opponentOwner,1);test.assertContains(events[0].message,target.name);
 });
 test.it('names the actual ship killer when several hostile owners defend a system',()=>{
  const f=fixture(2,1),target=f.homes[1];
  f.strong.star=target;target.ships.push(f.strong);f.strong.getOneAttackAgainst=()=>0;
  const third=f.game.factory.createShip(target.x,target.y,'battleship',f.homes[2],true);third.star=target;target.ships.push(third);third.getOneAttackAgainst=()=>10000;
  f.weak.getOneAttackAgainst=()=>0;f.weak.x=target.x-1000;f.weak.y=target.y;f.weak.setDestination(target);f.weak.move();
  const events=f.game.eventLog.filter(e=>e.destruction);test.assertEqual(events.length,2);
  test.assertTrue(events.every(e=>e.destruction.opponentOwner===3));test.assertEqual(events[0].recipient,3);test.assertEqual(events[1].recipient,1);
 });
 test.it('reports only the destroyed top-level fleet, even when nested cleanup already removed it',()=>{
  for(const nested of [false,true]){const f=fixture(1,2,true,nested),events=battle(f);test.assertEqual(events.length,2);
   test.assertTrue(events.every(e=>e.type===Common.EventType.FLEET_DESTROYED&&e.subject===f.target));
   test.assertFalse(f.game.allFleets.includes(f.target));test.assertFalse(events.some(e=>e.destruction.kind==='ship'));test.assertContains(events[0].message,'Victim fleet 星 $&');
  }
 });
 test.it('does not announce a surviving fleet when only one of its members is lost',()=>{
  const f=fixture(1,2,true),survivor=f.game.factory.createShip(1000,0,'battleship',f.homes[1],true);
  f.target.addShip(survivor);f.target.star=null;f.target.x=1000;f.target.y=0;f.target.syncShipPositions();f.weak.type='battleship';f.weak.power=50;f.weak.getOneAttackAgainst=()=>0;
  f.strong.power=100;f.strong.getOneAttackAgainst=()=>10000;survivor.power=100000;survivor.getOneAttackAgainst=()=>100000;
  const events=battle(f);test.assertFalse(f.game.allShips.includes(f.weak));test.assertTrue(f.game.allShips.includes(survivor));
  test.assertTrue(f.game.allFleets.includes(f.target));test.assertTrue(events.every(e=>e.subject!==f.target&&e.subject!==f.weak));
 });
 test.it('attributes a destroyed attacking fleet to the defender rather than its own owner',()=>{
  const f=fixture(1,2,true),events=battle(f,true);test.assertEqual(events.length,2);
  test.assertEqual(events[0].recipient,1);test.assertEqual(events[1].recipient,2);test.assertEqual(events[0].destruction.opponentOwner,1);test.assertEqual(events[0].destruction.owner,2);
  test.assertTrue(f.game.allFleets.includes(f.attacker));test.assertFalse(f.game.allFleets.includes(f.target));
 });
 test.it('automatically plays animation without another alert, then allows full narrative replay from Events',()=>{
  const f=fixture(1,2,true),events=battle(f),local=events.find(e=>e.recipient===1);
  test.assertTrue(f.game.eventLog.find(e=>e.id===f.game.overlay.eventId).combat!==undefined);f.game.dismissEventPresentation();
  const overlay=f.game.overlay;f.game.getCurrentMilliseconds=()=>f.display.visualTime;test.assertEqual(overlay.eventId,local.id);test.assertTrue(overlay.animationOnly);let reports=0;f.display.drawReport=()=>reports++;
  test.assertEqual(f.display.getUIActionAt(1,1).type,'consume');f.display.drawOverlay(overlay);test.assertEqual(f.display.getDestructionEffect(overlay).frame,0);
  f.display.visualTime+=Effect.duration;f.display.drawOverlay(overlay);test.assertNotNull(f.game.overlay);f.display.visualTime+=4000;f.display.drawOverlay(overlay);test.assertNull(f.game.overlay);test.assertEqual(reports,0);test.assertTrue(local.handled);test.assertEqual(f.game.turn,1);
  f.game.uiWindow='events';f.game.selectEvent(local);test.assertTrue(f.game.replayReport(local));test.assertFalse(f.game.overlay.animationOnly);
  f.display.drawOverlay(f.game.overlay);f.display.visualTime+=Effect.duration+1;f.display.drawOverlay(f.game.overlay);test.assertEqual(reports,1);test.assertEqual(f.game.turn,1);
 });
 test.it('preserves literal names, private perspectives and pending animation-only presentations through saves',()=>{
  const f=fixture(2,1,true);battle(f);const local=f.game.eventLog.find(e=>e.destruction&&e.recipient===1),text=local.message;
  f.target.name='Renamed';f.game.players[2].name='Changed';const loaded=Save.restore(Save.serialize(f.game)),event=loaded.eventLog.find(e=>e.id===local.id);
  test.assertEqual(event.message,text);test.assertEqual(event.destruction.name,'Victim fleet 星 $&');loaded.dismissEventPresentation();test.assertTrue(loaded.overlay.animationOnly);test.assertEqual(loaded.overlay.eventId,event.id);
  const outsider=fixture(2,3,true);outsider.game.config.omniscient=true;battle(outsider);test.assertFalse(outsider.game.getEventRows().some(e=>e.destruction));test.assertNull(outsider.game.overlay);
  const quiet=fixture(1,2,true);quiet.game.config.autoplay={enabled:true,showEventWindows:false};test.assertEqual(battle(quiet).length,2);test.assertNull(quiet.game.overlay);test.assertEqual(quiet.game.overlayQueue.length,0);
 });
 test.it('does not report consumed colonies or repeat a ship removal, and honors reduced motion',()=>{
  const f=fixture(),neutral=f.game.factory.createStar(1000,1000,'Neutral'),colony=f.game.factory.createShip(0,0,'colony',f.homes[0],true);
  f.game.colonizeStar(neutral,colony);test.assertFalse(f.game.eventLog.some(e=>e.destruction));test.assertNull(f.game.getReportDestructionPosition(f.game.eventLog.find(e=>e.colonization)));f.game.handleKeyPress(pdg.key_Escape);
  f.game.removeDestroyedShip(f.weak,1);const count=f.game.eventLog.length;f.game.removeDestroyedShip(f.weak,1);test.assertEqual(f.game.eventLog.length,count);
  f.display.visualEffects.reducedMotion=true;let now=0;f.game.getCurrentMilliseconds=()=>now;f.display.drawOverlay(f.game.overlay);test.assertNotNull(f.game.overlay);now=4000;f.display.drawOverlay(f.game.overlay);test.assertNull(f.game.overlay);test.assertEqual(f.game.turn,1);
 });
 test.it('provides complete translated ship and fleet winner/loser narratives and measured replay layouts',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);
   for(const group of [false,true])for(const winner of [1,2]){const f=fixture(winner,winner===1?2:1,group),events=battle(f),local=events.find(e=>e.recipient===1);
    test.assertEqual(events.length,2);test.assertContains(local.message,group?'Victim fleet 星 $&':'Victim Д $&');test.assertFalse(/\{\d+\}/.test(local.message));
    const id=group?(winner===1?935:936):(winner===1?933:934);test.assertContains(local.message,I18n.getString(id).split('{')[0]);
    const layout=f.display.getReportLayout({eventId:local.id,page:0});test.assertTrue(layout.lines.length>0);for(const line of layout.lines)test.assertTrue(f.game.port.getTextWidth(line,13)<=layout.rect.width-40);
   }
  }}finally{pdg.res.setLanguage(language);}
 });
});
