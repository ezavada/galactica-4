const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Preferences=require('../src/js/roster-preferences.js');
function fixture(width=800,height=600){
 const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
 game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size*.62};
 const display=new Display(game);game.display=display;game.uiWindow='fleets';
 const star=game.factory.createStar(65536,131072,'Home');star.owner=1;star.techLevel=8;
 const ship=(type='scout',name='Unit',complete=true)=>{const s=game.factory.createShip(star.x,star.y,type,star,complete);s.name=name;return s;};
 const fleet=game.factory.createFleet(star.x,star.y,1,'Alpha');fleet.addShip(ship('battleship','Atlas'));fleet.addShip(ship('colony','Colonist'));
 const click=(type,match=()=>true)=>{const row=display.getFleetListActionRegions().find(r=>r.action.type===type&&match(r.action));return !!row&&game.handleUIClick(row.rect.x+row.rect.width/2,row.rect.y+row.rect.height/2);};
 return {game,display,star,ship,fleet,click};
}
module.exports=()=>test.describe('V3 fleet comparison roster',()=>{
 test.it('lists top-level owned fleets and ships but excludes contained groups dead enemies and docked satellites',()=>{
  const {game,fleet,ship}=fixture();const solo=ship('scout','Solo'),hull=ship('battleship','Hull',false),satellite=ship('defense','Satellite');
  const spaceSatellite=ship('defense','Space satellite');spaceSatellite.star=null;
  const enemy=ship('battleship','Enemy');enemy.owner=2;
  const dead=ship('battleship','Dead');dead.damage=dead.power*100+1;
  const nested=game.factory.createFleet(fleet.x,fleet.y,1,'Nested');nested.addShip(ship());fleet.addShip(nested);
  const rows=game.getFleetListRows().map(row=>row.object);
  test.assertContains(rows,fleet);test.assertContains(rows,solo);test.assertContains(rows,hull);test.assertContains(rows,spaceSatellite);
  for(const object of [satellite,enemy,dead,nested,...fleet.getLeafShips()])test.assertFalse(rows.includes(object));
 });
 test.it('uses direct member counts recursive colony capability live aggregates and v3 damage percentages',()=>{
  const {game,fleet}=fixture();const group=game.factory.createFleet(fleet.x,fleet.y,1,'Group');group.addShip(fleet.ships[1]);fleet.addShip(group);
  fleet.ships[0].damage=80;const row=game.getFleetListRows().find(r=>r.object===fleet);
  test.assertEqual(row.ships,2);test.assertEqual(row.colony,2);test.assertEqual(row.tech,8);test.assertEqual(row.damage,5);test.assertEqual(row.power,16);
 });
 test.it('starts numeric sorts highest first and supports reversing without losing row identity',()=>{
  const {game,ship,click}=fixture();ship('scout','Slow');
  for(const key of ['tech','speed','power','ships','damage','colony']){
   test.assertTrue(click('sortFleetRoster',a=>a.key===key));test.assertFalse(game.fleetRosterSort.ascending);
   const rows=game.getFleetListRows();for(let i=1;i<rows.length;i++)test.assertTrue(rows[i-1][key]>=rows[i][key]);
   test.assertTrue(click('sortFleetRoster',a=>a.key===key));test.assertTrue(game.fleetRosterSort.ascending);
  }
 });
 test.it('ranks colony-bearing fleets ahead of standalone colony ships and other units',()=>{
  const {game,fleet,ship,click}=fixture();const colony=ship('colony','Solo colony');ship('scout','Scout');
  click('sortFleetRoster',a=>a.key==='colony');const rows=game.getFleetListRows();test.assertTrue(rows[0].object===fleet);test.assertTrue(rows[1].object===colony);
 });
 test.it('sorts destinationless units then named targets alphabetically then patrols and formats open-space coordinates',()=>{
  const {game,fleet,ship,click}=fixture();const first=ship('scout','First'),second=ship('scout','Second'),patrol=ship('scout','Patrol');
  first.setDestination(game.factory.createStar(65536,131072,'A'));second.setDestination(game.factory.createStar(131072,196608,'Z'));patrol.setPatrol(true);
  const space=ship('scout','Space');space.setDestination({x:65536,y:131072});
  click('sortFleetRoster',a=>a.key==='destination');const rows=game.getFleetListRows();test.assertTrue(rows[0].object===fleet);test.assertTrue(rows[rows.length-1].object===patrol);
  test.assertTrue(rows.findIndex(r=>r.object===first)<rows.findIndex(r=>r.object===second));
  test.assertEqual(rows.find(r=>r.object===space).destination,'(1.00, 2.00)');
 });
 test.it('retains private rendezvous rows with assembling fleet statistics and actual light-year coordinates',()=>{
  const {game,fleet}=fixture();const point=game.factory.createRendezvous(fleet.x,fleet.y,1,'Point');point.setFleet(fleet);
  const row=game.getFleetListRows().find(r=>r.object===point);test.assertEqual(row.kind,'rendezvous');test.assertEqual(row.power,16);test.assertEqual(row.destination,'(1.00, 2.00)');
  test.assertEqual(game.getFleetListRows(2).length,0);
 });
 test.it('selects and centers on the first click and closes for a double click on the same live row',()=>{
  const {game,fleet,click}=fixture();let time=1000;game.getCurrentMilliseconds=()=>time;
  test.assertTrue(click('fleetRosterSelect',a=>a.object===fleet));test.assertTrue(game.selectedObject===fleet);test.assertEqual(game.uiWindow,'fleets');
  time+=100;test.assertTrue(click('fleetRosterSelect',a=>a.object===fleet));test.assertNull(game.uiWindow);
 });
 test.it('does not double-click different rows or accept removed or newly contained units',()=>{
  const {game,fleet,ship,click}=fixture();const solo=ship();game.getCurrentMilliseconds=()=>1000;
  click('fleetRosterSelect',a=>a.object===fleet);click('fleetRosterSelect',a=>a.object===solo);test.assertEqual(game.uiWindow,'fleets');
  fleet.addShip(solo);test.assertFalse(game.selectFleetRosterObject(solo));game.entityRemoved(fleet);test.assertFalse(game.selectFleetRosterObject(fleet));
 });
 test.it('exposes all later-page units and clamps the page after the list contracts',()=>{
  const {game,display,ship,click}=fixture();const units=[];for(let i=0;i<35;i++)units.push(ship('scout','Unit '+i));
  while(click('fleetRosterPage',a=>a.page>game.fleetRosterPage)){}const layout=display.getFleetRosterLayout();test.assertEqual(layout.page,layout.pages-1);
  test.assertTrue(click('fleetRosterSelect',a=>a.object===layout.visibleRows[0].object));
  units.forEach(unit=>game.entityRemoved(unit));test.assertEqual(display.getFleetRosterLayout().page,0);
 });
 test.it('keeps outside clicks Enter and Tab modal and clears double-click state on reopening',()=>{
  const {game,fleet,click}=fixture();const turn=game.turn;click('fleetRosterSelect',a=>a.object===fleet);
  game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);game.handleUIClick(1,1);test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'fleets');
  game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);game.openUIWindow('fleets');test.assertNull(game.fleetRosterLastClick);
 });
 test.it('fits all eight translated columns and paging controls at supported logical screen sizes',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(const [width,height] of [[800,600],[640,480],[640,600]]){const {display}=fixture(width,height);display.reloadUIStrings();const layout=display.getFleetRosterLayout();
    test.assertEqual(layout.columns.length,8);for(const column of layout.columns)test.assertTrue(column.offset+column.width<=layout.rect.width-14+.01,lang+' '+width+' '+column.key+' exceeds '+layout.rect.width+' at '+(column.offset+column.width));
    test.assertTrue(layout.rect.y+layout.rect.height<=height);for(const region of display.getFleetListActionRegions())test.assertTrue(region.rect.x+region.rect.width<=layout.rect.x+layout.rect.width);
   }
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('persists validated sort choices through browser and native storage and survives corrupt unavailable storage',()=>{
  const values={},storage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};const prefs=Preferences.createPreferences({window:{localStorage:storage}});
  test.assertEqual(prefs.read().key,'name');prefs.write({key:'power',ascending:false});test.assertEqual(prefs.read().key,'power');test.assertFalse(prefs.read().ascending);
  values['galactica.fleetSort']='{"key":"bad","ascending":false}';test.assertEqual(prefs.read().key,'name');values['galactica.fleetSort']='bad';test.assertEqual(prefs.read().key,'name');
  const config={useConfig:()=>{},getConfigString:k=>values[k],setConfigString:(k,v)=>values[k]=v};const native=Preferences.createPreferences({pdg:{cfg:config}});
  native.write({key:'colony',ascending:false});test.assertEqual(native.read().key,'colony');
  const broken=Preferences.createPreferences({window:{get localStorage(){throw Error('Unavailable');}}});broken.write({key:'ships',ascending:false});test.assertEqual(broken.read().key,'name');
  const {game,click}=fixture();game.rosterPreferences=prefs;click('sortFleetRoster',a=>a.key==='damage');test.assertEqual(prefs.read().key,'damage');
 });
});
