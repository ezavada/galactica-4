const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Sound=require('../src/js/sound.js'),Common=require('../src/js/common.js');
function fixture() {
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);
 const star=game.factory.createStar(200000,200000,'Home');star.owner=1;star.techLevel=8;
 const ship=game.factory.createShip(star.x,star.y,'battleship',star,true);star.shipArrived(ship);ship.name='Zeta Д 星';game.setSelectedObject(ship);
 const cues=[];game.sound=Sound.createSound({getSound:file=>({setLooping:()=>{},stop:()=>{},start:()=>cues.push(file)})},{readSound:()=>true,writeSound:()=>{}});
 return {game,display,star,ship,cues};
}
module.exports=()=>test.describe('V3 containing-object keyboard navigation',()=>{
 test.it('selects a docked ship’s system and remembers the child for Right Arrow inspection',()=>{
  const {game,display,star,ship,cues}=fixture(),turn=game.turn;game.handleKeyPress(pdg.key_LeftArrow);
  test.assertTrue(game.selectedObject===star);test.assertEqual(game.uiWindow,'fleetExchange');test.assertTrue(game.fleetExchange.container===star);test.assertTrue(game.fleetExchange.selection===ship);test.assertTrue(display.getFleetExchangeLayout().lists[0].rows.some(row=>row.object===ship));test.assertEqual(cues.length,0);
  game.handleKeyPress(pdg.key_RightArrow);test.assertTrue(game.selectedObject===ship);test.assertNull(game.uiWindow);test.assertEqual(game.turn,turn);test.assertTrue(ship.star===star);
 });
 test.it('walks each actual nested container and returns through the remembered group',()=>{
  const {game,star,ship}=fixture();const top=game.factory.createFleet(star.x,star.y,1,'Top'),inner=game.factory.createFleet(star.x,star.y,1,'Inner');inner.addShip(ship);top.addShip(inner);
  game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===inner);test.assertTrue(game.fleetExchange.selection===ship);
  game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===top);test.assertTrue(game.fleetExchange.selection===inner);
  game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===star);test.assertTrue(game.fleetExchange.selection===top);
  game.handleKeyPress(pdg.key_RightArrow);test.assertTrue(game.selectedObject===top);test.assertTrue(game.fleetExchange.container===top);test.assertTrue(inner.fleet===top);test.assertTrue(ship.fleet===inner);
  game.handleKeyPress(pdg.key_RightArrow);test.assertTrue(game.selectedObject===inner);test.assertTrue(game.fleetExchange.selection===ship);game.handleKeyPress(pdg.key_RightArrow);test.assertTrue(game.selectedObject===ship);test.assertNull(game.uiWindow);
 });
 test.it('reveals the remembered child on a later sorted page',()=>{
  const {game,display,star,ship}=fixture();for(let n=0;n<16;n++){const extra=game.factory.createShip(star.x,star.y,'scout',star,true);star.shipArrived(extra);extra.name='Alpha '+n;}
  game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.fleetExchange.pages.main>0);test.assertTrue(display.getFleetExchangeLayout().lists[0].rows.some(row=>row.object===ship));game.handleKeyPress(pdg.key_RightArrow);test.assertTrue(game.selectedObject===ship);
 });
 test.it('plays No more at a top-level system or a ship in space without changing selection or turn',()=>{
  const {game,star,ship,cues}=fixture(),turn=game.turn;game.setSelectedObject(star);game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===star);test.assertNull(game.uiWindow);test.assertEqual(cues.join(','),'sounds/1012.wav');
  ship.star=null;game.setSelectedObject(ship);game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===ship);test.assertEqual(cues.length,2);test.assertEqual(game.turn,turn);game.sound.setEnabled(false);game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(cues.length,2);
 });
 test.it('rejects stale children and hidden or stale containers without exposing them or playing a cue',()=>{
  const {game,star,ship,cues}=fixture();game.allShips.splice(game.allShips.indexOf(ship),1);test.assertFalse(game.selectContainingObject());test.assertTrue(game.selectedObject===ship);game.allShips.push(ship);
  star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(game.selectContainingObject());test.assertTrue(game.selectedObject===ship);test.assertNull(game.uiWindow);test.assertEqual(cues.length,0);star.owner=1;game.stars.splice(game.stars.indexOf(star),1);test.assertFalse(game.selectContainingObject());
 });
 test.it('allows a known enemy fleet’s container list without granting owner controls',()=>{
  const {game,star,ship}=fixture();ship.owner=2;const fleet=game.factory.createFleet(star.x,star.y,2,'Enemy');fleet.addShip(ship);fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===fleet);test.assertTrue(game.fleetExchange.selection===ship);test.assertFalse(game.canHumanControl(fleet));test.assertFalse(game.canExchangeFleetMember());
 });
 test.it('preserves map targeting and active drags',()=>{
  const {game,ship,cues}=fixture();for(const field of ['pendingMapOrderObject','pendingRendezvousPlacement','uiSliderDrag','uiMapScrollDrag','uiWindowDrag']){game[field]={};game.handleKeyPress(pdg.key_LeftArrow);test.assertTrue(game.selectedObject===ship);test.assertNull(game.uiWindow);test.assertEqual(cues.length,0);game[field]=null;}
 });
 test.it('leaves modal and editor arrow behavior intact',()=>{
  const {game,ship}=fixture();game.uiWindow='settings';game.settingsPage=1;game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.settingsPage,0);test.assertTrue(game.selectedObject===ship);game.uiWindow='course';game.courseWindowObject=ship;game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.uiWindow,'course');test.assertTrue(game.selectedObject===ship);
  game.uiWindow='rename';game.renameTarget=ship;game.renameText='Atlas';game.renameCursor=3;game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.uiWindow,'rename');test.assertTrue(game.selectedObject===ship);
  game.uiWindow=null;game.overlay={type:'report',eventId:123,page:1};game.display.getReportLayout=()=>({pages:2,page:1});game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.overlay.page,0);test.assertTrue(game.selectedObject===ship);
 });
});
