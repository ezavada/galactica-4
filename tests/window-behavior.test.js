const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Preferences=require('../src/js/drawing-preferences.js'),Placement=require('../src/js/window-placement.js');
function fixture(preferences){const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};game.drawingPreferences=preferences;return {game,display:new Display(game)};}
function preferences(){const data=new Map();return {data,prefs:Preferences.createPreferences({window:{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}}})};}
module.exports=()=>test.describe('System window modality and title dragging',()=>{
 test.it('clunks outside system windows without changing the map, while Events allows map input',()=>{
  const {game,display}=fixture(),cues=[];game.sound={play:id=>cues.push(id)};
  for(const name of ['settings','comparison','menu','games','view','mapDisplay','colonyDefaults','fleets','systemComparison']){
   game.uiWindow=name;const turn=game.turn;test.assertTrue(game.handleUIClick(1,1));test.assertEqual(cues.pop(),1012);test.assertEqual(game.turn,turn);
   game.handleMouseRightClick(1,1);test.assertEqual(cues.pop(),1012);
  }
  game.uiWindow='settings';game.pendingCourseEdit={};test.assertTrue(game.handleUIClick(1,1));test.assertEqual(cues.pop(),1012);game.pendingCourseEdit=null;
  game.uiWindow='events';test.assertEqual(display.getUIActionAt(1,1),null);test.assertEqual(cues.length,0);
 });
 test.it('moves settings controls with the title, clamps to the viewport, and restores configuration in a fresh game',()=>{
  const {prefs}=preferences(),{game,display}=fixture(prefs);game.uiWindow='settings';
  const original=display.getSettingsWindowRect(),button=display.getSettingsActionRegions()[0].rect;
  test.assertFalse(game.beginUIWindowDrag(original.x+5,original.y+40));
  test.assertTrue(game.beginUIWindowDrag(original.x+20,original.y+14));game.updateUIWindowDrag(original.x+50,original.y+44);
  const moved=display.getSettingsWindowRect(),control=display.getSettingsActionRegions()[0].rect;
  test.assertEqual(control.x-button.x,moved.x-original.x);test.assertEqual(control.y-button.y,moved.y-original.y);
  game.endUIWindowDrag(-900,900);const rect=display.getSettingsWindowRect();test.assertEqual(rect.x,10);test.assertEqual(rect.y+rect.height,590);
  const fresh=fixture(prefs);fresh.game.uiWindow='settings';test.assertEqual(fresh.display.getSettingsWindowRect().y,rect.y);
  fresh.game.port.getDrawingArea=()=>new pdg.Rect(640,480);const smaller=fresh.display.getSettingsWindowRect();test.assertTrue(smaller.x+smaller.width<=640);test.assertTrue(smaller.y+smaller.height<=480);
 });
 test.it('moves Compare Players and retains its position, and allows foreground View zoom actions',()=>{
  const {prefs}=preferences(),{game,display}=fixture(prefs);game.uiWindow='comparison';let rect=display.getComparisonWindowRect();
  test.assertTrue(game.beginUIWindowDrag(rect.x+20,rect.y+14));game.endUIWindowDrag(rect.x+20,rect.y+84);
  test.assertEqual(display.getComparisonWindowRect().y,rect.y+70);test.assertEqual(prefs.readWindowPosition('comparison').y,rect.y+70);
  game.uiWindow='view';const button=display.getViewActionRegions().find(b=>b.action.type==='zoomIn'),zoom=display.camera.zoom;
  game.handleUIClick(button.rect.x+5,button.rect.y+5);test.assertTrue(display.camera.zoom>zoom);
 });
 test.it('drags the foreground report even when a modal system table is behind it',()=>{
  const {game,display}=fixture();game.uiWindow='fleets';game.overlay={type:'report',eventId:null};const rect=display.getReportLayout(game.overlay).rect;
  test.assertTrue(game.beginUIWindowDrag(rect.x+20,rect.y+14));test.assertEqual(game.uiWindowDrag.positionName,'report');
  game.endUIWindowDrag(rect.x+50,rect.y+44);test.assertEqual(display.getReportLayout(game.overlay).rect.y,rect.y+30);
 });
 test.it('drags Events and object inspectors without saving their positions as system defaults',()=>{
  const {prefs,data}=preferences(),{game,display}=fixture(prefs);game.uiWindow='events';let rect=display.getEventWindowRect();
  test.assertTrue(game.beginUIWindowDrag(rect.x+20,rect.y+14));game.endUIWindowDrag(rect.x+40,rect.y+44);
  test.assertEqual(data.size,0);game.uiWindow=null;
  const star=game.factory.createStar(100000,100000,'Home');star.owner=1;game.setSelectedObject(star);rect=display.getSelectedObjectPanelRect(star);
  test.assertTrue(game.beginUIWindowDrag(rect.x+20,rect.y+14));game.endUIWindowDrag(rect.x+40,rect.y+44);
  test.assertEqual(display.getSelectedObjectPanelRect(star).y,Math.min(590-rect.height,rect.y+30));test.assertEqual(data.size,0);
 });
 test.it('persists native positions, rejects malformed config, and keeps controls aligned in application dialogs',()=>{
  const values=new Map(),prefs=Preferences.createPreferences({pdg:{cfg:{useConfig:()=>{},getConfigString:k=>values.get(k),setConfigString:(k,v)=>values.set(k,v)}}});
  prefs.writeWindowPosition('startup',{x:25,y:45});test.assertEqual(prefs.readWindowPosition('startup').y,45);
  values.set('windowPosition.settings','{"x":"bad","y":40}');test.assertEqual(prefs.readWindowPosition('settings'),null);
  const placement=new Placement(prefs),layout={rect:{x:10,y:10,width:200,height:100},buttons:[{rect:{x:20,y:60,width:50,height:20}}]},screen={width:800,height:600};
  test.assertTrue(placement.begin('startup',layout.rect,30,20,screen));placement.end(1000,1000);
  const moved=placement.layout('startup',layout,screen);test.assertEqual(moved.rect.x+moved.rect.width,790);test.assertEqual(moved.rect.y+moved.rect.height,590);
  test.assertEqual(moved.buttons[0].rect.x-moved.rect.x,10);test.assertEqual(prefs.readWindowPosition('startup').x,moved.rect.x);
 });
});
