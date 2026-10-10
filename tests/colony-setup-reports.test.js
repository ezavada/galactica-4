const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1) {
 const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 const home=game.factory.createStar(100000,100000,'Home');home.owner=owner;home.techLevel=5;
 const enemy=game.factory.createStar(900000,900000,'Enemy');enemy.owner=owner===1?2:1;
 const target=game.factory.createStar(101000,100000,'S-123');
 const colony=game.factory.createShip(home.x,home.y,'colony',home,true);home.shipArrived(colony);
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
 const display=new Display(game);game.setSelectedObject(home);game.aiManager.processAITurns=()=>{};
 return {game,display,home,target,colony};
}
const report=game=>game.eventLog.find(event=>event.type===Common.EventType.RENAME_COLONY);
module.exports=()=>test.describe('V3 new colony naming and production reports',()=>{
 test.it('queues one private actionable report after actual neutral-system arrival',()=>{
  const {game,target,colony}=fixture();colony.destination=target;colony.move();const event=report(game);
  test.assertEqual(target.owner,1);test.assertTrue(game.allShips.includes(colony));test.assertDefined(event);test.assertEqual(event.recipient,1);test.assertTrue(event.subject===target);test.assertContains(event.message,'name your new colony');test.assertEqual(game.attention.pending().length,2);test.assertEqual(game.overlay.type,'report');game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.attention.pending().length,0);test.assertTrue(game.selectedObject===target);test.assertFalse(game.uiWindow==='rename');
 });
 test.it('retains player defaults and the ordinary colonization report',()=>{
  const {game,target,colony}=fixture();game.players[1].defaultGrowth=600;game.players[1].defaultShips=250;game.players[1].defaultTech=150;
  game.colonizeStar(target,colony);game.handleKeyPress(pdg.key_Escape);test.assertEqual(target.growth.desired,60);test.assertEqual(target.shipBuilding.desired,25);test.assertEqual(target.research.desired,15);test.assertTrue(game.eventLog.some(e=>e.type===Common.EventType.STAR_COLONIZED));test.assertFalse(game.colonizeStar(target,colony));test.assertEqual(game.eventLog.filter(e=>e.type===22).length,1);
 });
 test.it('does not prompt computer colonies or captured enemy systems',()=>{
  let f=fixture(2);f.game.colonizeStar(f.target,f.colony);test.assertEqual(report(f.game),undefined);test.assertEqual(f.game.attention.pending().length,0);
  f=fixture();f.game.colonizeStar(f.target,f.colony,2);test.assertEqual(report(f.game),undefined);test.assertTrue(f.game.eventLog.some(e=>e.type===Common.EventType.STAR_CAPTURED));
 });
 test.it('suppresses reports for recaptured or removed colonies even in omniscient mode',()=>{
  const {game,target,colony}=fixture();game.colonizeStar(target,colony);game.handleKeyPress(pdg.key_Escape);const event=report(game);game.config.omniscient=true;target.owner=2;
  test.assertFalse(game.isEventAccessible(event));test.assertEqual(game.attention.pending().length,0);test.assertFalse(game.focusEvent(event));target.owner=1;game.stars=game.stars.filter(s=>s!==target);test.assertFalse(game.isEventAccessible(event));test.assertEqual(game.attention.pending().length,0);
 });
 test.it('focuses and centers the colony with its instruction visible before rename and production editing',()=>{
  const {game,display,target,colony}=fixture();game.colonizeStar(target,colony);game.handleKeyPress(pdg.key_Escape);test.assertFalse(game.attention.next());test.assertTrue(game.selectedObject===target);test.assertEqual(game.attention.pending().length,0);test.assertEqual(game.eventSelection,report(game).id);test.assertTrue(display.getColonySetupLines(target).length>0);
  game.handleKeyPress(110);test.assertEqual(game.uiWindow,'rename');game.renameText='New 星';game.handleKeyPress(13);test.assertEqual(target.name,'New 星');test.assertEqual(game.turn,1);
  const slider=display.getStarAllocationSliderRegions(target)[0];const actual=target.growth.value;game.handleUIClick(slider.trackRect.x+slider.trackRect.width*.7,slider.trackRect.y+3);test.assertEqual(target.growth.desired,70);test.assertEqual(target.growth.value,actual);
 });
 test.it('requires attention confirmation before advancing and excludes the private report from another viewer',()=>{
  const {game,target,colony}=fixture();game.colonizeStar(target,colony);test.assertFalse(game.requestEndTurn());test.assertEqual(game.uiWindow,'endTurnConfirm');test.assertEqual(game.turn,1);game.getCurrentHumanPlayer=()=>2;test.assertFalse(game.isEventAccessible(report(game)));test.assertEqual(game.attention.pending().length,0);
 });
 test.it('can revisit last-turn instructions through the report list and Go to',()=>{
  const {game,display,target,colony}=fixture();game.colonizeStar(target,colony);game.handleKeyPress(pdg.key_Escape);game.turn=2;game.uiWindow='events';const event=report(game);test.assertTrue(game.selectEvent(event));const action=display.getEventActionRegions().find(r=>r.action.type==='goToEvent');test.assertDefined(action);test.assertTrue(game.executeUIAction(action.action));test.assertTrue(game.selectedObject===target);test.assertEqual(game.uiWindow,null);test.assertTrue(game.getColonySetupReport(target)===event);
 });
 test.it('preserves pending requests, shared subjects and guidance through local saves',()=>{
  const {game,target,colony}=fixture();game.colonizeStar(target,colony);const loaded=Save.restore(Save.serialize(game));test.assertEqual(loaded.attention.pending().length,2);test.assertEqual(loaded.overlay.type,'report');loaded.handleKeyPress(pdg.key_Escape);test.assertEqual(loaded.attention.pending().length,0);test.assertTrue(loaded.selectedObject===loaded.stars[2]);test.assertTrue(loaded.getColonySetupReport(loaded.selectedObject)===report(loaded));
 });
 test.it('fits complete translated guidance and production controls in every supported language',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const {game,display,target,colony}=fixture();game.colonizeStar(target,colony);game.handleKeyPress(pdg.key_Escape);game.attention.next();const layout=display.getStarDetailsLayout(target);test.assertGreaterThan(layout.hintLines.length,0);test.assertContains(layout.hintLines.join(' '),pdg.res.getString(856).split(' ')[0]);test.assertTrue(layout.rect.y>=0 && layout.rect.y+layout.rect.height<=600);for(const line of layout.hintLines)test.assertTrue(display.port.getTextWidth(line,11)<=332);const last=display.getStarAllocationSliderRegions(target)[2];test.assertTrue(last.rect.y+last.rect.height<layout.rect.y+layout.rect.height-40);}}
  finally{pdg.res.setLanguage(language);}
 });
});
