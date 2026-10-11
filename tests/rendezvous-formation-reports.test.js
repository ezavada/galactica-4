const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1) {
 const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 const home=game.factory.createStar(65536,65536,'Home');home.owner=owner;home.techLevel=5;home.population=500;
 const ship=game.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(ship);
 const rendezvous=game.factory.createRendezvous(home.x+1000,home.y,owner,'Gather 星');
 game.players[owner].name='Faction Д $&';game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
 const display=new Display(game);return {game,home,ship,rendezvous,display};
}
const reports=game=>game.eventLog.filter(e=>e.rendezvousFormation);
function arrive(f){f.ship.destination=f.rendezvous;f.ship.move();return f.rendezvous.getFleet();}
module.exports=()=>test.describe('V3 rendezvous fleet formation notices',()=>{
 test.it('creates owner and observer copies after an actual first-ship arrival, with naming guidance and coordinates',()=>{
  const f=fixture(),fleet=arrive(f),events=reports(f.game),event=events.find(e=>e.recipient===1);test.assertEqual(events.length,2);test.assertTrue(fleet.ships.includes(f.ship));test.assertTrue(event.subject===fleet);test.assertContains(event.message,'Please name it');test.assertContains(event.message,'(1.02, 1.00)');test.assertFalse(event.observer);test.assertFalse(event.automatic);test.assertTrue(f.game.attention.pending().some(e=>e.event===event));test.assertNull(f.game.overlay);
 });
 test.it('does not repeat a creation notice when another ship joins or an existing fleet is assigned',()=>{
  const f=fixture(),fleet=arrive(f),ship=f.game.factory.createShip(f.home.x,f.home.y,'scout',f.home,true);f.home.shipArrived(ship);ship.destination=f.rendezvous;ship.move();test.assertEqual(reports(f.game).length,2);test.assertEqual(fleet.ships.length,2);
  const point=f.game.factory.createRendezvous(f.home.x+2000,f.home.y,1,'Other');fleet.destination=point;fleet.move();test.assertTrue(point.getFleet()===fleet);test.assertEqual(reports(f.game).length,2);
 });
 test.it('does not invent the rendezvous notice for friendly ship-to-ship formation',()=>{
  const f=fixture(),other=f.game.factory.createShip(f.home.x+1000,f.home.y,'scout',f.home,true);other.star=null;f.ship.destination=other;f.ship.move();test.assertEqual(reports(f.game).length,0);test.assertTrue(f.ship.fleet===other.fleet);
 });
 test.it('gates observer notices on fleet detection, keeps naming guidance private and never automatically presents',()=>{
  const f=fixture(2),fleet=arrive(f),event=reports(f.game).find(e=>e.recipient===1);f.game.turn=2;test.assertTrue(event.observer);test.assertContains(event.message,'Faction Д $&');test.assertFalse(event.message.includes('Please name it'));test.assertFalse(f.game.isEventAccessible(event));test.assertEqual(f.game.attention.pending().length,0);
  fleet.setVisibilityTo(1,Common.VisibilityLevel.SPEED);test.assertTrue(f.game.getEventRows().includes(event));test.assertTrue(f.game.attention.pending().some(e=>e.event===event));test.assertFalse(f.game.queueObserverReports());test.assertNull(f.game.overlay);test.assertTrue(f.game.replayReport(event));test.assertNull(f.game.getReportDestructionPosition(event));f.game.handleKeyPress(pdg.key_Escape);test.assertEqual(f.game.turn,2);fleet.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(f.game.isEventAccessible(event));
 });
 test.it('retains recipients, literal identity, creation coordinates and manual-only flags through saves',()=>{
  const f=fixture(2),fleet=arrive(f);f.game.config.omniscient=true;f.game.turn=2;const event=reports(f.game).find(e=>e.recipient===1),message=event.message;f.game.players[2].name='Changed';fleet.x+=100000;
  const loaded=Save.restore(Save.serialize(f.game)),saved=reports(loaded).find(e=>e.recipient===1);test.assertEqual(saved.message,message);test.assertEqual(saved.position.x,f.rendezvous.x);test.assertFalse(saved.automatic);test.assertFalse(loaded.queueObserverReports());test.assertNull(loaded.overlay);test.assertTrue(loaded.replayReport(saved));test.assertEqual(loaded.overlay.eventId,saved.id);
 });
 test.it('allows attention to select the owner fleet for ordinary Unicode Rename without advancing',()=>{
  const f=fixture(),fleet=arrive(f);test.assertTrue(f.game.attention.next());test.assertTrue(f.game.selectedObject===fleet);test.assertNull(f.game.overlay);test.assertTrue(reports(f.game).find(e=>e.recipient===1).handled);f.game.handleKeyPress(110);test.assertEqual(f.game.uiWindow,'rename');f.game.renameText='Named 星';f.game.handleKeyPress(13);test.assertEqual(fleet.name,'Named 星');test.assertEqual(f.game.turn,1);
 });
 test.it('fits complete owner and observer notices in all six languages',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const owner of [1,2]){const f=fixture(owner);arrive(f);f.game.config.omniscient=true;f.game.turn=2;const event=reports(f.game).find(e=>e.recipient===1);test.assertFalse(/\{\d+\}/.test(event.message));test.assertTrue(f.game.replayReport(event));const layout=f.display.getReportLayout(f.game.overlay);for(const line of layout.lines)test.assertTrue(f.game.port.getTextWidth(line,13)<=layout.rect.width-40);for(const button of layout.buttons)test.assertTrue(button.rect.x>=layout.rect.x&&button.rect.x+button.rect.width<=layout.rect.x+layout.rect.width);}}}
  finally{pdg.res.setLanguage(language);}
 });
});
