const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1,width=800,height=600){
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true,omniscient:true}));
 const star=game.factory.createStar(0,0,'Origin 星 $&');star.owner=owner;star.techLevel=15;
 game.factory.createStar(1000000,0,'Other').owner=owner===1?2:1;
 game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);
 return {game,star,display};
}
function report(f,kind){
 if(kind==='commissioning'){f.star.startBuildingShip('battleship');f.star.completeShip();}
 else f.game.recordDiscoveryReports(f.star,3);
 const event=f.game.eventLog.find(e=>e.recipient===1 && (kind==='commissioning'?e.commissioning:e.discovery));
 f.game.clearEventPresentations();f.game.turn=2;test.assertTrue(f.game.replayReport(event));return event;
}
module.exports=()=>test.describe('Source owner illustrations in Events replay',()=>{
 test.it('replays actual owner commissioning with retained art and complete text after save and object changes',()=>{
  const f=fixture(),event=report(f,'commissioning'),layout=f.display.getReportLayout(f.game.overlay);
  test.assertEqual(layout.illustration.kind,'stardock');test.assertContains(event.message,'15');
  const paths=layout.illustration.layers.map(l=>l.path).join('|'),message=event.message;
  f.game.allShips.forEach(ship=>{ship.name='Changed';ship.techLevel=75;});f.star.name='Changed';
  const restored=Save.restore(Save.serialize(f.game));restored.port=f.game.port;const display=new Display(restored);
  test.assertEqual(display.getReportLayout(restored.overlay).illustration.layers.map(l=>l.path).join('|'),paths);
  test.assertEqual(restored.eventLog.find(e=>e.id===event.id).message,message);restored.dismissEventPresentation();test.assertEqual(restored.turn,2);
 });
 test.it('shows source Lab art only to its owner, including when the viewer is omniscient',()=>{
  const own=fixture(),event=report(own,'discovery'),layout=own.display.getReportLayout(own.game.overlay);
  test.assertEqual(layout.illustration.kind,'lab');test.assertContains(event.message,'15');
  for(const kind of ['commissioning','discovery']){const foreign=fixture(2);report(foreign,kind);test.assertNull(foreign.display.getReportLayout(foreign.game.overlay).illustration);}
 });
 test.it('keeps complete translated text, illustration and paged controls separated at supported viewport sizes',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(const kind of ['commissioning','discovery'])for(const [width,height] of [[800,600],[640,480],[320,240]]){
    const f=fixture(1,width,height),event=report(f,kind),layout=f.display.getReportLayout(f.game.overlay),art=layout.illustration;
    test.assertNotNull(art);test.assertTrue(art.rect.bottom<layout.bodyY);test.assertTrue(layout.bodyY+layout.visibleLines.length*18<=Math.min(...layout.buttons.map(b=>b.rect.y)));
    test.assertTrue(layout.rect.y+layout.rect.height<=height);test.assertEqual(layout.lines.join('').replace(/\s/g,''),event.message.replace(/\s/g,''));test.assertFalse(/\{\d+\}/.test(event.message));
   }
  }}finally{pdg.res.setLanguage(language);}
 });
});
