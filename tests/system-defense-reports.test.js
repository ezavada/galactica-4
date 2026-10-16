const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js'),I18n=require('../src/js/i18n.js');
function fixture(attackerOwner=1,defenderOwner=2,ground=false,count=2) {
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:2}));game.showEnemyEvents=false;
 const homes=[1,2,3].map(owner=>{const s=game.factory.createStar(owner*1000000,0,'Home '+owner);s.owner=owner;s.population=100;s.techLevel=20;return s;});
 game.players[attackerOwner].name='Attacker Д $&';game.players[defenderOwner].name='Defender 星';
 const target=game.factory.createStar(0,0,'Survivor 星 $&');target.owner=defenderOwner;target.population=100000;target.techLevel=100;
 const attack=game.factory.createShip(-1000,0,'battleship',homes[attackerOwner-1],true);attack.star=null;attack.x=-1000;attack.y=0;attack.techLevel=ground?4:2;attack.power=10;
 const defenders=Array.from({length:count},(_,i)=>{const s=game.factory.createShip(0,0,'battleship',target,true);target.shipArrived(s);s.power=ground||i===0?1:100;s.techLevel=2;s.getOneAttackAgainst=()=>ground||i===0?0:100000;return s;});
 attack.getOneAttackAgainst=subject=>subject===target?0:ground?1000:101;
 target.getOneAttackAgainst=()=>100000;
 game.port={getDrawingArea:()=>new pdg.Rect(480,400),getTextWidth:(t,size=11)=>Array.from(String(t)).length*size/2};const display=new Display(game);game.setDisplay(display);
 return {game,target,attack,defenders,display};
}
function battle(f){pdg.srand(42);f.game.combatSystem.resolveCombat(f.attack,f.target);return f.game.eventLog.filter(e=>e.systemDefense);}
function removeStubs(f){delete f.attack.getOneAttackAgainst;delete f.target.getOneAttackAgainst;for(const ship of f.defenders)delete ship.getOneAttackAgainst;}
module.exports=()=>test.describe('V3 surviving system defense reports',()=>{
 test.it('reports failed space attacks to the defender, attacker and observers with the source tally',()=>{
  const f=fixture(),events=battle(f);test.assertEqual(events.length,3);test.assertEqual(f.target.owner,2);test.assertFalse(f.game.allShips.includes(f.attack));test.assertTrue(f.game.allShips.includes(f.defenders[1]));
  for(const e of events){test.assertEqual(e.type,Common.EventType.SYSTEM_DEFENSE_LOSSES);test.assertEqual(e.systemDefense.shipsLost,1);test.assertContains(e.message,'Survivor 星 $&');}
  test.assertEqual(events[0].systemDefense.side,'attacker');test.assertEqual(events[1].systemDefense.side,'defender');test.assertTrue(events[2].observer);test.assertFalse(f.game.isEventAccessible(events[1]));
 });
 test.it('attributes mixed-owner defenders to the last hostile ship owner as in RemoveAllies',()=>{
  const f=fixture();f.defenders[1].owner=3;const events=battle(f);test.assertEqual(events.length,3);
  test.assertTrue(events.every(e=>e.systemDefense.defenderOwner===3));test.assertEqual(events.find(e=>e.recipient===2).systemDefense.side,'observer');test.assertEqual(events.find(e=>e.recipient===3).systemDefense.side,'defender');
 });
 test.it('preserves the v3 ground reserve counting quirk and suppresses its zero-loss result',()=>{
  let f=fixture(1,2,true),events=battle(f);test.assertEqual(events.length,3);test.assertEqual(events[0].systemDefense.shipsLost,1);test.assertTrue(f.defenders.every(s=>!f.game.allShips.includes(s)));test.assertEqual(f.target.owner,2);
  f=fixture(1,2,true,1);test.assertEqual(battle(f).length,0);test.assertFalse(f.game.allShips.includes(f.defenders[0]));test.assertEqual(f.target.owner,2);
 });
 test.it('suppresses zero-loss failures, surviving attackers and successful invasions',()=>{
  let f=fixture();f.attack.getOneAttackAgainst=()=>0;test.assertEqual(battle(f).length,0);
  f=fixture();f.attack.getOneAttackAgainst=()=>0;for(const s of f.defenders)s.getOneAttackAgainst=()=>0;test.assertEqual(battle(f).length,0);test.assertTrue(f.game.allShips.includes(f.attack));
  f=fixture();f.attack.getOneAttackAgainst=()=>100000000;for(const s of f.defenders)s.getOneAttackAgainst=()=>0;f.target.getOneAttackAgainst=()=>0;test.assertEqual(battle(f).length,0);test.assertEqual(f.target.owner,0);
 });
 test.it('keeps participant focus private and gates optional observer playback by detection',()=>{
  const f=fixture(2,3),events=battle(f),observer=events.find(e=>e.recipient===1);test.assertTrue(observer.observer);test.assertNull(f.game.overlay);
  f.target.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertFalse(f.game.replayReport(observer));test.assertFalse(f.game.getEventRows().includes(observer));
  f.target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);test.assertTrue(f.game.replayReport(observer));test.assertFalse(f.game.overlay.automaticObserver);test.assertNotNull(f.game.getReportDestructionPosition(observer));f.game.dismissEventPresentation();
  const g=fixture(2,1),local=battle(g).find(e=>e.recipient===1);test.assertEqual(local.systemDefense.side,'defender');g.target.owner=3;g.target.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertTrue(g.game.isEventAccessible(local));test.assertEqual(g.game.getEventFocus(local).x,0);
 });
 test.it('automatically plays the destruction notice without an extra alert, while manual replay includes its text',()=>{
  const f=fixture(2,3);f.game.config.omniscient=true;f.game.showEnemyEvents=true;const event=battle(f).find(e=>e.recipient===1);
  test.assertEqual(f.game.overlay.eventId,event.id);test.assertTrue(f.game.overlay.animationOnly);test.assertTrue(f.game.overlay.automaticObserver);
  f.game.dismissEventPresentation();test.assertTrue(event.handled);test.assertTrue(f.game.replayReport(event));test.assertFalse(f.game.overlay.animationOnly);test.assertFalse(f.game.overlay.automaticObserver);
 });
 test.it('preserves snapshots and replay across saves without changing turns or duplicating events',()=>{
  const f=fixture(),event=battle(f).find(e=>e.recipient===1);removeStubs(f);const text=event.message;f.target.name='Renamed';f.game.players[2].name='Changed';
  const g=Save.restore(Save.serialize(f.game)),report=g.eventLog.find(e=>e.id===event.id);test.assertEqual(report.message,text);test.assertEqual(report.systemDefense.starName,'Survivor 星 $&');while(g.overlay)g.dismissEventPresentation();
  const count=g.eventLog.length;test.assertTrue(g.replayReport(report));test.assertEqual(g.overlay.eventId,report.id);g.dismissEventPresentation();test.assertEqual(g.turn,1);test.assertEqual(g.eventLog.length,count);
 });

 test.it('uses the correct ship count forms for every defense perspective in all six languages',()=>{
  const language=pdg.res.getLanguage();
  const words={en:['ship','ships'],de:['Schiff','Schiffe'],es:['nave','naves'],fr:['vaisseau','vaisseaux'],ru:['корабль','корабля','кораблей']};
  const counts=[[1,0],[2,1],[5,2],[11,2],[21,0],[22,1],[25,2],[101,0],[111,2],[1001,0]];
  try{for(const code of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(code);
   for(const [attacker,defender] of [[1,2],[2,1],[2,3]])for(const [count,russianForm] of counts){
    const f=fixture(attacker,defender),event=f.game.recordSystemDefenseLosses(f.target,attacker,defender,count).find(e=>e.recipient===1);
    const number=I18n.formatInteger(count),index=code==='ru'?russianForm:count===1?0:1;
    let unit=code==='ja'?number+'隻':number+' '+words[code][index];
    if(event.systemDefense.side==='attacker'){
     if(code==='en')unit=number+' enemy '+words.en[index];
     if(code==='de')unit=number+(count===1?' feindliches Schiff':' feindliche Schiffe');
    }
    test.assertContains(event.message,unit);test.assertContains(event.message,'Survivor 星 $&');
    test.assertFalse(event.message.includes('|'));test.assertFalse(/\{\d+\}/.test(event.message));
    test.assertEqual(event.systemDefense.shipsLost,count);
   }
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('fits complete defender, attacker and observer text in all six languages',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const owners of [[1,2],[2,1],[2,3]]){
   const f=fixture(...owners);f.game.config.omniscient=true;const e=battle(f).find(e=>e.recipient===1);test.assertNotNull(e);test.assertFalse(/\{\d+\}/.test(e.message));test.assertContains(e.message,'Survivor 星 $&');test.assertTrue(f.game.replayReport(e));
   const id=e.systemDefense.side==='defender'?940:e.systemDefense.side==='attacker'?941:942;test.assertEqual(e.message,I18n.formatPluralString(id,'',1,'Survivor 星 $&',I18n.formatInteger(1),'Defender 星','Attacker Д $&'));
   const layout=f.display.getReportLayout({eventId:e.id,page:0});for(const line of layout.lines)test.assertTrue(f.game.port.getTextWidth(line,13)<=layout.rect.width-40);
  }}}finally{pdg.res.setLanguage(language);}
 });
});
