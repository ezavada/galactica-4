const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1) {
 const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 const star=game.factory.createStar(100000,100000,'Repair Yard');star.owner=owner;star.techLevel=4;
 const ship=game.factory.createShip(star.x,star.y,'battleship',star,true);star.shipArrived(ship);ship.name='Atlas 星';ship.damage=90;
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
 const display=new Display(game);return {game,star,ship,display};
}
const reports=game=>game.eventLog.filter(e=>[Common.EventType.SHIP_REPAIRED,Common.EventType.FLEET_REPAIRED].includes(e.type));
module.exports=()=>test.describe('V3 complete repair notices',()=>{
 test.it('emits one private ship completion notice only after a positive repair reaches zero',()=>{
  const {game,star,ship}=fixture();star.repairDockedShips();const event=reports(game)[0];test.assertEqual(ship.damage,0);test.assertEqual(reports(game).length,1);test.assertEqual(event.type,Common.EventType.SHIP_REPAIRED);test.assertEqual(event.recipient,1);test.assertTrue(event.subject===ship);test.assertContains(event.message,'Atlas 星');test.assertEqual(game.attention.pending().length,1);test.assertNull(game.overlay);
  star.repairDockedShips();test.assertEqual(reports(game).length,1);ship.name='Renamed';test.assertContains(event.message,'Atlas 星');
 });
 test.it('delivers completion through a real end turn and retains it in the last-turn list and attention',()=>{
  const {game,star,ship}=fixture();star.population=500;const enemy=game.factory.createStar(900000,900000,'Enemy');enemy.owner=2;enemy.population=500;game.aiManager.processAITurns=()=>{};
  game.endTurn();test.assertEqual(game.turn,2);test.assertEqual(ship.damage,0);const event=reports(game)[0];test.assertDefined(event);test.assertTrue(game.getEventRows().includes(event));test.assertTrue(game.attention.pending().some(entry=>entry.event===event));test.assertTrue(game.focusEvent(event,true));test.assertTrue(game.selectedObject===ship);test.assertEqual(game.turn,2);
 });
 test.it('does not emit completion for partial repairs, patrol, plotted courses, satellites or computer systems',()=>{
  for(const mode of ['partial','patrol','course','satellite','computer']) {
   const {game,star,ship}=fixture(mode==='computer'?2:1);
   if(mode==='partial')ship.damage=200;if(mode==='patrol')ship.setPatrol(true);if(mode==='course')ship.destination=star;if(mode==='satellite')ship.type='defense';
   star.repairDockedShips();test.assertEqual(reports(game).length,0,mode);
  }
 });
 test.it('reports only the fully repaired top-level fleet including nested members',()=>{
  const {game,star,ship}=fixture(),other=game.factory.createShip(star.x,star.y,'battleship',star,true);star.shipArrived(other);other.damage=20;
  const inner=game.factory.createFleet(star.x,star.y,1),fleet=game.factory.createFleet(star.x,star.y,1);inner.addShip(ship);fleet.addShip(inner);fleet.addShip(other);fleet.star=star;fleet.name='Group 星';fleet.calculateFleetStats();
  star.repairDockedShips();test.assertEqual(fleet.damage,0);test.assertEqual(reports(game).length,1);test.assertEqual(reports(game)[0].type,Common.EventType.FLEET_REPAIRED);test.assertTrue(reports(game)[0].subject===fleet);test.assertContains(reports(game)[0].message,'Group 星');test.assertEqual(game.attention.pending().length,1);
 });
 test.it('does not report a partially repaired fleet when one member completes',()=>{
  const {game,star,ship}=fixture(),other=game.factory.createShip(star.x,star.y,'battleship',star,true);star.shipArrived(other);other.damage=200;
  const fleet=game.factory.createFleet(star.x,star.y,1);fleet.addShip(ship);fleet.addShip(other);fleet.star=star;fleet.calculateFleetStats();star.repairDockedShips();test.assertEqual(ship.damage,0);test.assertGreaterThan(fleet.damage,0);test.assertEqual(reports(game).length,0);
 });
 test.it('keeps notices private even under omniscient viewing and focuses without advancing',()=>{
  const {game,star,ship}=fixture();star.repairDockedShips();const event=reports(game)[0];game.config.omniscient=true;game.getCurrentHumanPlayer=()=>2;test.assertFalse(game.isEventAccessible(event));test.assertEqual(game.attention.pending().length,0);game.getCurrentHumanPlayer=()=>1;test.assertTrue(game.attention.next());test.assertTrue(game.selectedObject===ship);test.assertNull(game.overlay);test.assertTrue(event.handled);test.assertTrue(game.replayReport(event));test.assertEqual(game.overlay.type,'report');game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.turn,1);test.assertEqual(game.attention.pending().length,0);
 });
 test.it('retains literal names, private recipients and pending attention through saves and manual replay',()=>{
  const {game,star}=fixture();star.repairDockedShips();game.turn=2;const loaded=Save.restore(Save.serialize(game)),event=reports(loaded)[0];test.assertEqual(loaded.attention.pending().length,1);test.assertTrue(loaded.replayReport(event));test.assertEqual(loaded.overlay.type,'report');test.assertEqual(loaded.overlay.eventId,event.id);test.assertNull(loaded.getReportDestructionPosition(event));loaded.handleKeyPress(pdg.key_Escape);test.assertNull(loaded.overlay);test.assertEqual(loaded.turn,2);test.assertContains(event.message,'Atlas 星');
 });
 test.it('fits complete translated ship and fleet reports in all supported languages',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const {game,star,ship,display}=fixture();star.repairDockedShips();game.turn=2;const event=reports(game)[0];test.assertContains(event.message,'Atlas 星');test.assertTrue(game.replayReport(event));const layout=display.getReportLayout(game.overlay);test.assertTrue(layout.rect.y>=0);test.assertTrue(layout.rect.y+layout.rect.height<=600);test.assertGreaterThan(layout.lines.length,0);test.assertTrue(pdg.res.getString(949).includes('{0}'));}}
  finally{pdg.res.setLanguage(language);}
 });
});
