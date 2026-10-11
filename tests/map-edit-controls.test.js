const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Cursor=require('../src/js/map-cursor.js');
function fixture(x=0,y=0){
 const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 const star=game.factory.createStar(x,y,'Andromeda');star.owner=1;star.namedStar=true;game.setSelectedObject(star);
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size)=>Array.from(text).length*size/2};
 const display=new Display(game);display.camera.centerOn(x,y);display.scaledStarRadius=8;display.scaledShipRadius=5;
 return {game,star,display};
}
module.exports=()=>test.describe('Inline map editing and destination controls',()=>{
 test.it('keeps empty/unfinished systems out of both final radial actions and exposes completed groups only',()=>{
  const {game,star,display}=fixture();const actions=()=>display.getContextActions(star),last=()=>actions().slice(-2).map(a=>a.action.type).join(',');
  test.assertFalse(actions().some(a=>a.action.type==='showSystemShips'||a.action.type==='showFleetExchange'));
  star.startBuildingShip('scout');test.assertFalse(actions().some(a=>a.action.type==='showSystemShips'));
  star.completeShip();test.assertEqual(last(),'showSystemShips,showFleetExchange');
  test.assertEqual(actions().find(a=>a.action.shipType==='colony').key,'C');
  star.owner=2;star.setVisibilityTo(1,0);test.assertFalse(actions().some(a=>a.action.type==='showSystemShips'||a.action.type==='showFleetExchange'));
 });
 test.it('replaces selected names, edits by Unicode caret, accepts keypad Enter, and rolls back Escape without an event',()=>{
  const {game,star}=fixture(),old=star.name;game.beginRenameObject(star);
  for(const char of '京都🚀')game.handleKeyPress(char.codePointAt(0));test.assertEqual(game.renameText,'京都🚀');test.assertEqual(star.name,old);
  game.handleKeyPress(pdg.key_LeftArrow);game.handleKeyPress(8);game.handleKeyPress('α'.codePointAt(0));test.assertEqual(game.renameText,'京α🚀');
  const events=game.eventLog.length;game.handleKeyPress(pdg.key_Escape);test.assertEqual(star.name,old);test.assertEqual(game.eventLog.length,events);test.assertNull(game.renameTarget);
  game.beginRenameObject(star);game.handleKeyPress(65);game.handleKeyPress(pdg.key_Enter);test.assertEqual(star.name,'A');test.assertNull(game.uiWindow);
 });
 test.it('places the white editor over the centered map label at 150% text size and supports a clicked caret',()=>{
  const {game,star,display}=fixture();game.beginRenameObject(star);const rect=display.getRenameWindowRect(),marker=display.getMapMarker(star);
  test.assertEqual(rect.size,16.5);test.assertEqual(rect.x+rect.width/2,marker.x);test.assertEqual(rect.y+rect.size+5,marker.y+marker.radius+12);
  test.assertFalse(game.beginUIWindowDrag(rect.x+5,rect.y+5));game.executeUIAction(display.getUIActionAt(rect.x+6,rect.y+8));
  test.assertEqual(game.renameEditor.caret,0);game.handleKeyPress(88);test.assertEqual(game.renameText,'XAndromeda');
  game.renameText='航'.repeat(32);game.renameEditor.caret=32;const r=display.getRenameWindowRect();test.assertTrue(r.x>=10 && r.x+r.width<=790);
 });
 test.it('aligns destination labels, compacts buttons, and changes eligibility live in every language',()=>{
  const {game,star,display}=fixture(),previous=pdg.res.getLanguage();
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);display.reloadUIStrings();let row=display.getDefaultDestinationLayout(star);
   test.assertEqual(row.regions.length,1);test.assertEqual(row.regions[0].rect.height,16);test.assertEqual(row.valueX,row.x+display.getStarDiagnosticLabelWidth(star));
   star.setDefaultDestination({x:100,y:200});row=display.getDefaultDestinationLayout(star);test.assertEqual(row.regions.length,2);test.assertTrue(row.regions[1].rect.x+row.regions[1].rect.width<=display.getStarDetailsLayout(star).rect.x+360-12);star.setDefaultDestination(null);
  }}finally{pdg.res.setLanguage(previous);}
 });
 test.it('rubber-bands from the system or previous waypoint to the mouse at exactly half alpha, then clears on cancel',()=>{
  const {game,star,display}=fixture(),lines=[];display.port.drawLine=(a,b,c)=>lines.push([a,b,c]);display.createAttributes=options=>options;
  game.beginMapOrder(star);display.setHoverPoint(123,234);display.drawMapTargetPreview();test.assertEqual(lines.length,1);test.assertEqual(lines[0][1].x,123);test.assertEqual(lines[0][2].lineColor.alpha,.5);
  game.handleKeyPress(pdg.key_Escape);display.drawMapTargetPreview();test.assertEqual(lines.length,1);
  star.startBuildingShip('scout');const ship=star.completeShip();game.issuePlayerWaypoint(ship,{x:10000,y:20000});game.showCourse(ship);game.beginCourseEdit();game.overlay=null;game.overlayQueue=[];display.setHoverPoint(123,234);display.drawMapTargetPreview();
  test.assertEqual(lines[1][0].x,display.toScreenX(10000));test.assertEqual(lines[1][0].y,display.toScreenY(20000));
 });
 test.it('removes inspector hit targets and radial buttons while choosing orders, then restores them on cancel',()=>{
  const {game,star,display}=fixture(512000,512000);star.startBuildingShip('scout');const ship=star.completeShip();const fleet=game.factory.createFleet(star.x,star.y,1,'Fleet');fleet.addShip(game.factory.createShip(star.x,star.y,'scout',star,true));game.overlay=null;game.overlayQueue=[];
  for(const object of [star,ship,fleet]){game.setSelectedObject(object);const panel=display.getSelectedObjectPanelRect(object),before=display.getContextButtonRegions();test.assertDefined(panel);test.assertTrue(before.length>0,"Initial controls "+game.getObjectType(object));
   const point={x:panel.x+6,y:panel.y+42};test.assertDefined(display.getUIActionAt(point.x,point.y));
   test.assertTrue(game.beginMapOrder(object),"Begin order "+game.getObjectType(object));test.assertNull(display.getSelectedObjectPanelRect(object));test.assertEqual(display.getContextButtonRegions().length,0);test.assertEqual(display.getContextButtonArc(object,panel).length,0);test.assertNull(display.getUIActionAt(point.x,point.y));
   game.handleKeyPress(pdg.key_Escape);test.assertTrue(game.selectedObject===object,"Selection restored "+game.getObjectType(object));test.assertDefined(display.getSelectedObjectPanelRect(object));test.assertTrue(display.getContextButtonRegions().length>0,"Controls restored "+game.getObjectType(object));
  }
  game.setSelectedObject(star);game.beginRendezvousPlacement();test.assertNull(display.getSelectedObjectPanelRect(star));test.assertEqual(display.getContextButtonRegions().length,0);game.handleKeyPress(pdg.key_Escape);test.assertDefined(display.getSelectedObjectPanelRect(star));
 });
 test.it('restores crosshair/text cursors after targeting and edits without touching unrelated canvas styles',()=>{
  const canvas={style:{cursor:'default',color:'red'}},cursor=new Cursor({},pdg,canvas);cursor.set('crosshair');test.assertEqual(canvas.style.cursor,'crosshair');cursor.set('text');test.assertEqual(canvas.style.cursor,'text');cursor.dispose();test.assertEqual(canvas.style.cursor,'default');test.assertEqual(canvas.style.color,'red');
 });
});
