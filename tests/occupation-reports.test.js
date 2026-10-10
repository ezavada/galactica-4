const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),Save=require('../src/js/game-save.js'),I18n=require('../src/js/i18n.js');
function fixture(attackingOwner=1,defendingOwner=2,colony=true) {
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:2,skipMapGeneration:true}));
 const bases=[1,2,3].map(owner=>{const star=game.factory.createStar(owner*1000000,0,'Home '+owner);star.owner=owner;star.population=100;star.techLevel=20;return star;});
 const target=game.factory.createStar(0,0,'Colony 星 $&');target.owner=defendingOwner;target.population=1;target.techLevel=1;
 game.players[attackingOwner].name='Attacker Д';game.players[defendingOwner].name='Defender 星';
 const fleet=game.factory.createFleet(target.x+1000,target.y,attackingOwner,'Invaders'),origin=bases[attackingOwner-1];
 const battleship=game.factory.createShip(fleet.x,fleet.y,'battleship',origin,true);fleet.addShip(battleship);
 let colonyShip=null;if(colony){colonyShip=game.factory.createShip(fleet.x,fleet.y,'colony',origin,true);fleet.addShip(colonyShip);}
 fleet.star=null;fleet.setDestination(target);
 game.port={getDrawingArea:()=>new pdg.Rect(480,400),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);
 return {game,display,target,fleet,battleship,colonyShip,bases};
}
function invade(f){pdg.srand(42);f.fleet.move();return f.game.eventLog.filter(e=>e.occupation);}
module.exports=()=>test.describe('V3 system resistance and capture reports',()=>{
 test.it('reports the last defenders to both participants even when no colony can occupy the system',()=>{
  const f=fixture(1,2,false),events=invade(f);test.assertEqual(f.target.owner,0);test.assertEqual(events.length,2);
  test.assertTrue(events.every(e=>e.type===Common.EventType.DEFENDERS_LOST));
  test.assertContains(events[0].message,'crushed the last resistance');test.assertContains(events[1].message,'last defenders');
  test.assertEqual(f.game.overlay.eventId,events[0].id);test.assertFalse(f.game.eventLog.some(e=>e.type===Common.EventType.STAR_CAPTURED));
 });
 test.it('queues resistance then capture reports after actual fleet arrival, retains the old owner and consumes the colony',()=>{
  const f=fixture(),events=invade(f);test.assertEqual(f.target.owner,1);test.assertEqual(events.length,5);test.assertFalse(f.game.allShips.includes(f.colonyShip));
  test.assertEqual(events[0].occupation.kind,'defendersLost');test.assertEqual(events[2].occupation.kind,'capture');
  test.assertContains(events[2].message,'You took');test.assertContains(events[2].message,'Defender 星');test.assertContains(events[3].message,'You lost');test.assertContains(events[3].message,'Attacker Д');
  for(const e of events){test.assertEqual(e.occupation.previousOwner,2);test.assertEqual(e.occupation.attackerOwner,1);test.assertTrue(e.subject===f.target);}
  f.game.dismissEventPresentation();test.assertEqual(f.game.overlay.eventId,events[2].id);test.assertEqual(f.game.turn,1);
 });
 test.it('presents the defending player perspective and remembers the system after ownership and visibility change',()=>{
  const f=fixture(2,1),events=invade(f),local=events.filter(e=>e.recipient===1);test.assertEqual(local.length,2);test.assertEqual(f.target.owner,2);
  test.assertEqual(f.game.overlay.eventId,local[0].id);test.assertTrue(local.every(e=>e.occupation.side==='defender'));
  f.target.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertTrue(f.game.isEventAccessible(local[1]));
  const focus=f.game.getEventFocus(local[1]);test.assertEqual(focus.object,null);test.assertEqual(focus.x,0);test.assertEqual(focus.y,0);
  test.assertFalse(f.game.getEventRows().some(e=>e.recipient===2));
 });
 test.it('does not report surrendered resistance or capture when the attackers fail or a neutral star is colonized',()=>{
  let f=fixture();f.target.population=100000;f.target.techLevel=100;
  f.battleship.getOneAttackAgainst=()=>0;f.colonyShip.getOneAttackAgainst=()=>0;f.target.getOneAttackAgainst=()=>10000;
  test.assertEqual(invade(f).length,0);test.assertEqual(f.target.owner,2);
  f=fixture();f.target.owner=0;f.fleet.move();test.assertEqual(f.target.owner,1);test.assertFalse(f.game.eventLog.some(e=>e.occupation));
  test.assertTrue(f.game.eventLog.some(e=>e.type===Common.EventType.RENAME_COLONY));
 });
 test.it('keeps resistance private while saving public capture and participant snapshots',()=>{
  const outsider=fixture(2,3);outsider.game.config.omniscient=true;invade(outsider);test.assertFalse(outsider.game.getEventRows().some(e=>e.occupation&&e.occupation.kind==='defendersLost'));test.assertEqual(outsider.game.getEventRows().filter(e=>e.occupation&&e.occupation.side==='observer').length,1);test.assertEqual(outsider.game.overlay,null);
  const f=fixture();invade(f);const snapshot=JSON.stringify(f.game.eventLog.filter(e=>e.occupation).map(e=>[e.message,e.occupation]));
  f.target.name='Renamed';f.game.players[2].name='Changed';const loaded=Save.restore(Save.serialize(f.game));
  test.assertEqual(JSON.stringify(loaded.eventLog.filter(e=>e.occupation).map(e=>[e.message,e.occupation])),snapshot);
  const id=loaded.overlayQueue.find(o=>loaded.eventLog.find(e=>e.id===o.eventId&&e.occupation&&e.occupation.kind==='capture')).eventId;
  loaded.dismissEventPresentation();test.assertEqual(loaded.overlay.eventId,id);test.assertTrue(loaded.eventLog.find(e=>e.id===id).subject===loaded.stars[3]);
 });
 test.it('retains terminal-turn capture messages for Events replay without duplicating logs or advancing time',()=>{
  const f=fixture();f.game.turn=7;f.bases[1].owner=0;f.bases[2].owner=0;invade(f);test.assertTrue(f.game.isGameOver);
  while(f.game.overlay)f.game.dismissEventPresentation();const event=f.game.eventLog.find(e=>e.occupation&&e.occupation.kind==='capture'&&e.recipient===1),count=f.game.eventLog.length;
  test.assertTrue(f.game.getEventRows().includes(event));f.game.uiWindow='events';f.game.eventSelection=event.id;f.game.handleKeyPress(13);
  test.assertEqual(f.game.overlay.eventId,event.id);test.assertEqual(f.game.eventLog.length,count);test.assertEqual(f.game.turn,7);f.game.handleKeyPress(pdg.key_Escape);test.assertEqual(f.game.turn,7);
 });
 test.it('keeps complete translated participant text and literal names in measured report layouts',()=>{
  const lang=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);
   for(const owner of [1,2]){const f=fixture(owner,owner===1?2:1),events=invade(f).filter(e=>e.recipient===1);test.assertEqual(events.length,2);
    for(const event of events){test.assertContains(event.message,'Colony 星 $&');test.assertFalse(/\{\d+\}/.test(event.message));test.assertTrue(f.game.isEventAccessible(event));
     const layout=f.display.getReportLayout({eventId:event.id,page:0});test.assertTrue(layout.lines.length>0);for(const line of layout.lines)test.assertTrue(f.display.port.getTextWidth(line,13)<=layout.rect.width-40);
     test.assertContains(event.message,I18n.getString(event.occupation.kind==='capture'?(owner===1?929:930):(owner===1?931:932)).split('{')[0]);
    }
   }
  }}finally{pdg.res.setLanguage(lang);}
 });
});
