const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js'),Sound=require('../src/js/sound.js'),Common=require('../src/js/common.js');
function fixture(owner=2) {
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:2,skipMapGeneration:true}));
 game.rules.isFast=game.config.fastGame;
 const homes=[1,2,3].map(n=>{const star=game.factory.createStar(n*1000000,0,'Home '+n);star.owner=n;star.population=500;star.techLevel=8;return star;});
 const star=homes[owner-1];star.name='Origin 星 $&';game.players[owner].name='Faction Д $&';game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.aiManager.processAITurns=()=>{};game.rules.getStarResearchAmount=()=>0;
 return {game,display,star,homes,build:type=>{star.startBuildingShip(type);return star.completeShip();},reports:()=>game.eventLog.filter(e=>e.discovery),discover:()=>{star.techLevel=4;star.paidTowardResearch=990;game.rules.getStarResearchAmount=s=>s===star?20:0;star.update();}};
}
module.exports=()=>test.describe('V3 drive discovery broadcasts',()=>{
 test.it('broadcasts an actual research milestone with private owner Lab artwork and acknowledgment',()=>{
  const f=fixture(1);f.discover();test.assertEqual(f.reports().length,3);const event=f.reports().find(e=>!e.observer);test.assertEqual(event.discovery.techLevel,5);test.assertEqual(f.game.overlay.type,'lab');test.assertEqual(f.game.overlay.classIndex,1);test.assertEqual(f.game.overlay.eventId,event.id);f.game.dismissEventPresentation();test.assertTrue(event.handled);test.assertTrue(f.game.selectedObject===f.star);test.assertEqual(f.game.attention.pending().length,0);f.discover();test.assertEqual(f.reports().length,3);
 });
 test.it('conceals enemy discoveries without detection and shows observer text rather than Lab art',()=>{
  const f=fixture();f.discover();const event=f.reports().find(e=>e.recipient===1);test.assertNull(f.game.overlay);test.assertFalse(f.game.isEventAccessible(event));test.assertFalse(f.game.isEventAccessible(f.reports().find(e=>!e.observer)));f.star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertTrue(f.game.queueObserverReports());test.assertEqual(f.game.overlay.type,'report');test.assertEqual(f.game.overlay.eventId,event.id);test.assertContains(event.message,'Faction Д $&');test.assertContains(event.message,'Origin 星 $&');test.assertEqual(Sound.eventCue(event),1014);test.assertEqual(Sound.eventCue(f.reports().find(e=>!e.observer)),1013);
 });
 test.it('defers automatic observation until end-turn visibility is updated',()=>{
  const f=fixture();f.star.techLevel=4;f.star.paidTowardResearch=990;f.game.rules.getStarResearchAmount=s=>s===f.star?20:0;f.star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);let checked=false;f.game.visibilityCalculator.updateAllVisibility=()=>{checked=true;test.assertTrue(f.reports().length>0);test.assertNull(f.game.overlay);f.star.setVisibilityTo(1,Common.VisibilityLevel.NONE);};f.game.endTurn();test.assertTrue(checked);test.assertNull(f.game.overlay);test.assertFalse(f.game.updatingStars);
 });
 test.it('preserves snapshots in saves and manual replay with enemy playback disabled',()=>{
  const f=fixture();f.game.config.omniscient=true;f.game.showEnemyEvents=false;f.discover();test.assertNull(f.game.overlay);const original=f.reports().find(e=>e.recipient===1);f.star.name='Changed';f.game.players[2].name='Changed';f.star.techLevel=9;delete f.game.rules.getStarResearchAmount;const loaded=Save.restore(Save.serialize(f.game)),event=loaded.eventLog.find(e=>e.id===original.id);test.assertEqual(event.discovery.starName,'Origin 星 $&');test.assertEqual(event.discovery.techLevel,5);test.assertEqual(event.message,original.message);test.assertTrue(loaded.replayReport(event));test.assertFalse(loaded.overlay.automaticObserver);loaded.dismissEventPresentation();loaded.config.autoplay={enabled:true,showEventWindows:false};test.assertFalse(loaded.replayReport(event));
 });
 test.it('localizes both recipient narratives in all supported languages',()=>{
  const fs=require('fs'),path=require('path');for(const lang of ['en','de','es','fr','ja','ru']){const text=fs.readFileSync(path.join(__dirname,'../data/',lang==='en'?'strings.txt':'strings-'+lang+'.txt'),'utf8');for(const [id,count] of [[958,2],[959,3]]){const line=text.split('\n').find(l=>l.startsWith(id+'\t'));test.assertNotNull(line);for(let i=0;i<count;i++)test.assertContains(line,'{'+i+'}');}}
 });
});
