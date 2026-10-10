const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Effect=require('../src/js/destruction-effect.js'),Save=require('../src/js/game-save.js');
function displayFor(game) {
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2,drawCircle:()=>{},drawLine:()=>{},drawRect:()=>{}};
 const display=new Display(game);game.setDisplay(display);display.visualTime=1000;return display;
}
function fixture() {
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:2}));
 const home=game.factory.createStar(0,0,'Home');home.owner=1;home.population=100;home.techLevel=20;
 const enemy=game.factory.createStar(100000,0,'Enemy');enemy.owner=2;enemy.population=100;enemy.techLevel=1;
 return {game,display:displayFor(game),home,enemy};
}
function report(game,home,losses=1,recipient=1) {
 const event=game.recordEvent('Combat','Report',{recipient,subject:home,position:{x:200000,y:300000}});
 event.combat={ownShipsLost:0,enemyShipsLost:losses};game.queueReport(event);return event;
}
module.exports=()=>test.describe('V3 destruction visual feedback',()=>{
 test.it('plays eight expanding and contracting frames at the source tick cadence without simulation randomness',()=>{
  let time=0;pdg.srand(427);const next=pdg.rand();pdg.srand(427);
  for(let frame=0;frame<8;frame++) {
   const state=Effect.sample(time+Effect.durations[frame]/2);test.assertEqual(state.frame,frame);test.assertGreaterThan(state.radius,0);time+=Effect.durations[frame];
  }
  test.assertEqual(Effect.sample(0).frame,0);test.assertNull(Effect.sample(-1));test.assertNull(Effect.sample(Infinity));test.assertNull(Effect.sample(Effect.duration));
  test.assertTrue(Effect.sample(250).radius>Effect.sample(10).radius);test.assertTrue(Effect.sample(500).radius<Effect.sample(250).radius);
  test.assertEqual(pdg.rand(),next);
 });
 test.it('uses actual combat casualty reports and their recorded location without retaining the destroyed object',()=>{
  const {game,display,home,enemy}=fixture(),attacker=game.factory.createShip(home.x,home.y,'battleship',home,true),defender=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);
  pdg.srand(42);game.combatSystem.resolveCombat(attacker,defender);test.assertFalse(game.allShips.includes(defender));
  const event=game.eventLog.find(e=>e.id===game.overlay.eventId);test.assertGreaterThan(event.combat.enemyShipsLost,0);
  const position=game.getReportDestructionPosition(event);test.assertEqual(position.x,enemy.x);test.assertEqual(position.y,enemy.y);
  display.drawDestructionEffect(game.overlay);const frame=display.getDestructionEffect(game.overlay);test.assertEqual(frame.frame,0);
  test.assertEqual(frame.x,display.toScreenX(position.x));test.assertEqual(frame.y,display.toScreenY(position.y));test.assertFalse(event.handled);
 });
 test.it('draws a cached burst before the complete report, consumes invisible controls and restores them when the animation finishes',()=>{
  const {game,display,home}=fixture();const event=report(game,home),overlay=game.overlay;let circles=0,lines=0,reports=0;
  display.port.drawCircle=()=>circles++;display.port.drawLine=()=>lines++;display.drawReport=()=>reports++;
  display.drawOverlay(overlay);test.assertEqual(circles,1);test.assertEqual(lines,10);test.assertEqual(reports,0);const glow=display.destructionGlow,streak=display.destructionStreak;
  const rect=display.getReportLayout(overlay).buttons[0].rect;test.assertEqual(display.getUIActionAt(rect.x+1,rect.y+1).type,'consume');
  display.visualTime+=100;display.drawOverlay(overlay);test.assertTrue(glow===display.destructionGlow);test.assertTrue(streak===display.destructionStreak);test.assertFalse(event.handled);
  display.visualTime=1000+Effect.duration;display.drawOverlay(overlay);test.assertEqual(reports,1);test.assertEqual(display.getUIActionAt(rect.x+1,rect.y+1).type,'dismissReport');
  game.handleUIClick(rect.x+1,rect.y+1);test.assertTrue(event.handled);test.assertEqual(game.overlay,null);test.assertEqual(game.turn,1);
 });
 test.it('shows defeated resistance but excludes neutral colonization, a surviving colony and zero-loss encounters',()=>{
  const {game,display,home}=fixture();const event=report(game,home,0);test.assertNull(game.getReportDestructionPosition(event));test.assertFalse(display.drawDestructionEffect(game.overlay));game.dismissEventPresentation();
  const target=game.factory.createStar(1000,0,'Neutral'),colony=game.factory.createShip(0,0,'colony',home,true);game.colonizeStar(target,colony);
  test.assertFalse(game.eventLog.some(e=>game.getReportDestructionPosition(e)));test.assertTrue(game.allShips.includes(colony));test.assertFalse(display.drawDestructionEffect(game.overlay));game.handleKeyPress(pdg.key_Escape);
  const events=game.recordOccupationReports(target,1,2,'defendersLost');test.assertTrue(game.getReportDestructionPosition(events[0])===events[0].position);
  test.assertTrue(display.drawDestructionEffect(game.overlay));
 });
 test.it('replays retained effects and starts restored pending effects on the new renderer clock without changing save metadata',()=>{
  const {game,display,home}=fixture();const event=report(game,home);display.drawDestructionEffect(game.overlay);display.visualTime+=400;
  const saved=Save.serialize(game),loaded=Save.restore(saved),newDisplay=displayFor(loaded);newDisplay.visualTime=9000;
  test.assertNull(newDisplay.getDestructionEffect(loaded.overlay));newDisplay.drawDestructionEffect(loaded.overlay);test.assertEqual(newDisplay.getDestructionEffect(loaded.overlay).frame,0);
  newDisplay.visualTime+=Effect.duration;loaded.dismissEventPresentation();loaded.uiWindow='events';test.assertTrue(loaded.replayReport(loaded.eventLog.find(e=>e.id===event.id)));
  newDisplay.drawDestructionEffect(loaded.overlay);test.assertEqual(newDisplay.getDestructionEffect(loaded.overlay).frame,0);test.assertEqual(loaded.turn,1);
 });
 test.it('respects private participants, quiet autoplay and reduced motion',()=>{
  const {game,display,home}=fixture();const privateEvent=report(game,home,1,2);test.assertNull(game.overlay);test.assertNull(game.getReportDestructionPosition(privateEvent));
  game.config.autoplay={enabled:true,showEventWindows:false};const quiet=report(game,home);test.assertNull(game.overlay);test.assertTrue(game.getEventRows().includes(quiet));
  game.config.autoplay.enabled=false;test.assertTrue(game.replayReport(quiet));display.visualEffects.reducedMotion=true;test.assertFalse(display.drawDestructionEffect(game.overlay));
  test.assertEqual(display.getUIActionAt(display.getReportLayout(game.overlay).buttons[0].rect.x+1,display.getReportLayout(game.overlay).buttons[0].rect.y+1).type,'dismissReport');
 });
});
