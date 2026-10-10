const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Preferences=require('../src/js/drawing-preferences.js'),Save=require('../src/js/game-save.js'),Help=require('../src/js/hover-help.js'),Common=require('../src/js/common.js');
function fixture(width=800,height=600){
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:2}));
 const target=game.factory.createStar(0,0,'Foreign 星');target.owner=2;target.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
 game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.setDisplay(display);
 return {game,display,target};
}
function capture(f){return f.game.recordOccupationReports(f.target,2,3,'capture').find(e=>e.observer);}
module.exports=()=>test.describe('Enemy event playback preference',()=>{
 test.it('defaults playback on and automatically focuses a visible foreign capture without advancing time',()=>{
  const f=fixture(),event=capture(f);test.assertTrue(f.game.showEnemyEvents);test.assertEqual(f.game.overlay.eventId,event.id);test.assertTrue(f.game.overlay.automaticObserver);
  test.assertTrue(f.game.selectedObject===f.target);test.assertFalse(event.handled);f.game.handleKeyPress(pdg.key_Escape);test.assertTrue(event.handled);test.assertNull(f.game.overlay);test.assertEqual(f.game.turn,1);
 });
 test.it('toggles playback through the actual settings hit target and retains manual replay when off',()=>{
  const f=fixture(),data=new Map();f.game.drawingPreferences=Preferences.createPreferences({window:{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}}});
  f.game.uiWindow='settings';const row=f.display.getSettingsActionRegions().find(r=>r.action.type==='toggleEnemyEvents');test.assertTrue(row.active);
  f.game.handleUIClick(row.rect.x+2,row.rect.y+2);test.assertFalse(f.game.showEnemyEvents);test.assertEqual(data.get('galactica.showEnemyEvents'),'false');
  const event=capture(f);test.assertNull(f.game.overlay);test.assertTrue(f.game.getEventRows().includes(event));test.assertTrue(f.game.replayReport(event));test.assertFalse(f.game.overlay.automaticObserver);
  f.game.dismissEventPresentation();test.assertEqual(f.game.turn,1);
 });
 test.it('queues retained accessible observers once when enabled and skips disabled or hidden queued copies',()=>{
  const f=fixture();f.game.showEnemyEvents=false;const event=capture(f);f.game.executeUIAction({type:'toggleEnemyEvents'});test.assertEqual(f.game.overlay.eventId,event.id);test.assertFalse(f.game.queueObserverReports());
  const second=capture(f);test.assertEqual(f.game.overlayQueue.length,1);f.game.showEnemyEvents=false;f.game.dismissEventPresentation();test.assertNull(f.game.overlay);test.assertFalse(second.handled);
  f.game.showEnemyEvents=true;f.target.setVisibilityTo(1,0);test.assertFalse(f.game.queueObserverReports());f.target.setVisibilityTo(1,1);test.assertTrue(f.game.queueObserverReports());
  f.target.setVisibilityTo(1,0);f.game.dismissEventPresentation();test.assertEqual(f.game.turn,1);
 });
 test.it('defers current-turn observer playback until movement and visibility processing finish',()=>{
  const f=fixture();f.game.turn=4;f.target.setVisibilityTo(1,0);f.game.movementTurn={};
  const event=capture(f);test.assertNull(f.game.overlay);delete f.game.movementTurn;
  f.target.setVisibilityTo(1,1);test.assertTrue(f.game.queueObserverReports());test.assertEqual(f.game.overlay.eventId,event.id);test.assertEqual(f.game.turn,4);
  test.assertFalse(f.game.queueObserverReports());test.assertEqual(f.game.overlayQueue.length,0);
 });
 test.it('honors fog, private recipients and quiet autoplay even when enemy playback is on',()=>{
  const f=fixture();f.target.setVisibilityTo(1,0);const event=capture(f);test.assertNull(f.game.overlay);test.assertFalse(f.game.queueObserverReports());
  f.game.config.omniscient=true;f.game.config.autoplay={enabled:true,showEventWindows:false};test.assertFalse(f.game.queueObserverReports());test.assertNull(f.game.overlay);test.assertTrue(f.game.getEventRows().includes(event));
  test.assertFalse(f.game.eventLog.filter(e=>e.recipient===2||e.recipient===3).some(e=>f.game.isEventAccessible(e)));
 });
 test.it('persists browser/native preferences and saves independent game choices and pending observer presentations',()=>{
  const values=new Map(),env={window:{localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}}},p=Preferences.createPreferences(env);test.assertTrue(p.readEnemyEvents());p.writeEnemyEvents(false);test.assertFalse(Preferences.createPreferences(env).readEnemyEvents());
  const native=Preferences.createPreferences({pdg:{cfg:{useConfig:()=>{},getConfigString:k=>values.get(k),setConfigString:(k,v)=>values.set(k,v)}}});test.assertTrue(native.readEnemyEvents());native.writeEnemyEvents(false);test.assertFalse(native.readEnemyEvents());
  const broken=Preferences.createPreferences({get window(){throw Error('denied');}});broken.writeEnemyEvents(false);test.assertTrue(broken.readEnemyEvents());
  const f=fixture();const event=capture(f),loaded=Save.restore(Save.serialize(f.game));test.assertTrue(loaded.showEnemyEvents);test.assertTrue(loaded.overlay.automaticObserver);test.assertEqual(loaded.overlay.eventId,event.id);
  f.game.showEnemyEvents=false;test.assertFalse(Save.restore(Save.serialize(f.game)).showEnemyEvents);
  const legacy=JSON.parse(Save.serialize(f.game)),root=legacy.graph.nodes[legacy.graph.root.ref];root.properties=root.properties.filter(pair=>pair[0]!=='showEnemyEvents');
  test.assertTrue(Save.restore(JSON.stringify(legacy)).showEnemyEvents);
  root.properties.push(['showEnemyEvents','invalid']);let rejected=false;try{Save.restore(JSON.stringify(legacy));}catch(error){rejected=true;}test.assertTrue(rejected);
 });
 test.it('keeps every localized setting reachable within short viewports with real page controls and hover help',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(const size of [[800,600],[320,340]]){const f=fixture(...size);f.game.uiWindow='settings';const seen=new Set();
    for(let page=0;page<4;page++){const rect=f.display.getSettingsWindowRect(),rows=f.display.getSettingsActionRegions();for(const row of rows){
     seen.add(row.action.type==='setLanguage'?row.action.language:row.action.type);test.assertTrue(row.rect.x>=rect.x&&row.rect.y>=rect.y);test.assertTrue(row.rect.x+row.rect.width<=rect.x+rect.width&&row.rect.y+row.rect.height<=rect.y+rect.height-16);
     if(row.action.type==='toggleEnemyEvents')test.assertContains(Help.describe(row.action),pdg.res.getString(939));
    }
    const next=rows.find(row=>row.action.type==='settingsPage'&&row.action.delta===1);if(!next)break;test.assertTrue(f.game.handleUIClick(next.rect.x+2,next.rect.y+2));
    }test.assertTrue(seen.has('toggleEnemyEvents'));test.assertTrue(seen.has('toggleControlHelp'));for(const code of ['en','de','es','fr','ja','ru'])test.assertTrue(seen.has(code));
    f.game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(f.game.settingsPage,Math.max(0,size[1]===340?1:0));
   }
  }}finally{pdg.res.setLanguage(language);}
 });
});
