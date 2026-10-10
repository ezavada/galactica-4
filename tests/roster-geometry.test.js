const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Preferences=require('../src/js/roster-preferences.js');
function fixture(){
 const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));let size={width:1024,height:768};
 game.port={getDrawingArea:()=>new pdg.Rect(size.width,size.height),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size*.62};
 const display=new Display(game);game.display=display;game.uiWindow='fleets';
 const star=game.factory.createStar(65536,131072,'Home');star.owner=1;star.techLevel=8;
 for(let i=0;i<32;i++)game.factory.createShip(star.x,star.y,'scout',star,true).name='Ship '+i;
 const writes=[];game.rosterPreferences={writeGeometry:geometry=>writes.push({...geometry})};
 const begin=mode=>{const r=display.getFleetRosterDragRegions().find(r=>r.mode===mode).rect;test.assertTrue(game.beginUIWindowDrag(r.x+r.width/2,r.y+r.height/2));return {x:r.x+r.width/2,y:r.y+r.height/2};};
 return {game,display,writes,begin,setSize:(width,height)=>{size={width,height};}};
}
module.exports=()=>test.describe('Fleet roster window geometry',()=>{
 test.it('moves from the title bar with captured release outside the starting window and saves once per gesture',()=>{
  const {game,display,writes,begin}=fixture(),initial=display.getFleetWindowRect(),point=begin('move');
  game.updateUIWindowDrag(point.x+40,point.y+60);test.assertEqual(display.getFleetWindowRect().x,initial.x+40);test.assertEqual(writes.length,0);
  game.endUIWindowDrag(point.x+50,point.y+70);const rect=display.getFleetWindowRect();test.assertEqual(rect.x,initial.x+50);test.assertEqual(rect.y,initial.y+70);test.assertEqual(writes.length,1);test.assertNull(game.uiWindowDrag);
 });
 test.it('clamps extreme drag positions while keeping the complete frame on screen',()=>{
  const {game,display,begin}=fixture(),point=begin('move');game.updateUIWindowDrag(point.x+100000,point.y+100000);let rect=display.getFleetWindowRect();
  test.assertTrue(rect.x+rect.width<=1014);test.assertTrue(rect.y+rect.height<=758);
  game.endUIWindowDrag(-100000,-100000);rect=display.getFleetWindowRect();test.assertEqual(rect.x,10);test.assertEqual(rect.y,10);
 });
 test.it('resizes height from the corner and recalculates paging without losing any units',()=>{
  const {game,display,begin}=fixture(),point=begin('resize');game.endUIWindowDrag(point.x,point.y-200);
  const layout=display.getFleetRosterLayout();test.assertEqual(layout.rect.height,322);test.assertEqual(layout.pageSize,6);
  const objects=[];for(let page=0;page<layout.pages;page++){game.fleetRosterPage=page;objects.push(...display.getFleetRosterLayout().visibleRows.map(row=>row.object));}
  test.assertEqual(objects.length,32);test.assertEqual(new Set(objects).size,32);
 });
 test.it('retains the minimum usable height and clamps the resize against the lower viewport edge',()=>{
  const {game,display,begin}=fixture();let point=begin('resize');game.endUIWindowDrag(point.x,-10000);test.assertEqual(display.getFleetWindowRect().height,158);
  point=begin('resize');game.endUIWindowDrag(point.x,10000);const rect=display.getFleetWindowRect();test.assertTrue(rect.y+rect.height<=758);
 });
 test.it('ignores non-finite pointer input and refuses drag capture from table cells and buttons',()=>{
  const {game,display,begin}=fixture(),rect=display.getFleetWindowRect();test.assertFalse(game.beginUIWindowDrag(rect.x+40,rect.y+80));test.assertFalse(game.beginUIWindowDrag(NaN,rect.y));
  const point=begin('move');game.updateUIWindowDrag(NaN,point.y);test.assertNull(game.fleetRosterGeometry);game.endUIWindowDrag();
 });
 test.it('ends capture on Escape without dismissing the window and keeps Enter Tab and right click modal',()=>{
  const {game,writes,begin}=fixture(),point=begin('move'),turn=game.turn;game.updateUIWindowDrag(point.x+20,point.y+20);
  game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);test.assertEqual(game.turn,turn);test.assertFalse(game.requestEndTurn());test.assertTrue(game.handleMouseRightClick(1,1));
  game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindowDrag);test.assertEqual(game.uiWindow,'fleets');test.assertEqual(writes.length,1);
  game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);
 });
 test.it('saves the default bounds when closed and restores chosen bounds on reopening',()=>{
  const {game,display,writes}=fixture(),initial=display.getFleetWindowRect();game.executeUIAction({type:'closeFleetRoster'});
  test.assertEqual(writes.length,1);test.assertEqual(writes[0].height,initial.height);game.openUIWindow('fleets');test.assertEqual(display.getFleetWindowRect().height,initial.height);
 });
 test.it('stops captured input on a viewport change and does not overwrite preferred bounds merely to fit',()=>{
  const {game,display,begin,setSize}=fixture();game.fleetRosterGeometry={x:150,y:120,height:500};begin('move');setSize(640,480);game.updateUIWindowDrag(300,300);
  test.assertNull(game.uiWindowDrag);const rect=display.getFleetWindowRect();test.assertTrue(rect.x+rect.width<=630);test.assertTrue(rect.y+rect.height<=470);
  test.assertEqual(game.fleetRosterGeometry.height,500);test.assertEqual(game.fleetRosterGeometry.x,150);setSize(1024,768);test.assertEqual(display.getFleetWindowRect().height,500);test.assertEqual(display.getFleetWindowRect().x,150);
 });
 test.it('ends a gesture before switching windows and ignores subsequent stale motion',()=>{
  const {game,begin,writes}=fixture(),point=begin('move');game.updateUIWindowDrag(point.x+20,point.y+20);game.openUIWindow('events');
  test.assertNull(game.uiWindowDrag);test.assertFalse(game.updateUIWindowDrag(500,500));test.assertTrue(writes.length>0);test.assertEqual(game.uiWindow,'events');
 });
 test.it('persists bounds independently of sort in both native and browser storage and rejects malformed shapes',()=>{
  const data={},storage={getItem:key=>data[key]||null,setItem:(key,value)=>data[key]=value};const prefs=Preferences.createPreferences({window:{localStorage:storage}});
  prefs.write({key:'power',ascending:false});prefs.writeGeometry({x:20,y:90,height:360});test.assertEqual(prefs.readGeometry().height,360);test.assertEqual(prefs.read().key,'power');
  const config={useConfig:()=>{},getConfigString:key=>data[key],setConfigString:(key,value)=>data[key]=value};const native=Preferences.createPreferences({pdg:{cfg:config}});
  native.writeGeometry({x:100,y:80,height:400});test.assertEqual(native.readGeometry().x,100);test.assertNull(Preferences.normalizeGeometry({x:NaN,y:0,height:200}));test.assertNull(Preferences.normalizeGeometry({x:0,y:0,height:120}));
  data['galactica.fleetGeometry']='broken';test.assertNull(prefs.readGeometry());data['galactica.fleetGeometry']='{"x":0,"y":0,"height":"300"}';test.assertNull(prefs.readGeometry());
  const broken=Preferences.createPreferences({window:{get localStorage(){throw Error('Denied');}}});broken.writeGeometry({x:0,y:0,height:300});test.assertNull(broken.readGeometry());
 });
 test.it('keeps resize hit regions separate from paging and close controls in every language',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const {game,display}=fixture();display.reloadUIStrings();game.fleetRosterGeometry={x:30,y:90,height:326};
   const corner=display.getFleetRosterDragRegions().find(r=>r.mode==='resize').rect;
   for(const action of display.getFleetListActionRegions().filter(r=>r.label))test.assertFalse(display.containsPoint(action.rect,corner.x+corner.width/2,corner.y+corner.height/2));
  }}finally{pdg.res.setLanguage(language);}
 });
});
