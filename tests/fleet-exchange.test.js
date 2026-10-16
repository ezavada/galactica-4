const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js');
function fixture(){
 const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
 const display=new Display(game);game.display=display;
 const star=game.factory.createStar(200000,200000,'Home');star.owner=1;star.techLevel=8;
 const fleet=game.factory.createFleet(star.x,star.y,1,'Fleet');
 const ships=['battleship','scout','colony'].map(type=>game.factory.createShip(star.x,star.y,type,star,true));
 fleet.addShip(ships[0]);fleet.addShip(ships[1]);game.setSelectedObject(star);
 const click=(type,match=()=>true)=>{const row=display.getFleetExchangeActions().find(r=>r.action.type===type&&match(r.action));return !!row&&game.handleUIClick(row.rect.x+row.rect.width/2,row.rect.y+row.rect.height/2);};
 const select=(side,object)=>click('fleetExchangeSelect',a=>a.side===side&&a.object===object);
 return {game,display,star,fleet,ships,click,select};
}
module.exports=()=>test.describe('Shared-container fleet exchange',()=>{
 test.it('notifies client creation only after a new fleet has its member and parent',()=>{
  const {game,star,ships,select,click}=fixture(),created=[];game.clientPlayerNum=1;
  game.networkCommands={available:()=>true,created:object=>created.push(object)};
  game.showFleetExchange(star);select('main',ships[2]);test.assertTrue(click('exchangeFleetMember'));
  test.assertEqual(created.length,1);test.assertTrue(created[0].star===star && created[0].ships.includes(ships[2]) && ships[2].fleet===created[0]);
 });

 test.it('retains the selected destination while selecting a main ship and moves it into that fleet',()=>{
  const {game,star,fleet,ships,select,click}=fixture();test.assertTrue(game.showFleetExchange(star));
  test.assertTrue(select('main',fleet));test.assertTrue(select('main',ships[2]));test.assertTrue(game.fleetExchange.active===fleet);
  test.assertTrue(click('exchangeFleetMember'));test.assertTrue(ships[2].fleet===fleet);test.assertEqual(game.uiWindow,'fleetExchange');
 });
 test.it('exchanges a selected sub-list member back to the enclosing system',()=>{
  const {game,star,fleet,ships,select,click}=fixture();game.showFleetExchange(star);select('main',fleet);select('sub',ships[0]);
  test.assertTrue(click('exchangeFleetMember'));test.assertNull(ships[0].fleet);test.assertTrue(ships[0].star===star);
  test.assertTrue(game.getFleetExchangeState().main.includes(ships[0]));
 });
 test.it('creates a new top-level fleet when no destination is active',()=>{
  const {game,star,ships,select,click}=fixture();game.showFleetExchange(star);select('main',ships[2]);
  test.assertTrue(click('exchangeFleetMember'));const created=ships[2].fleet;
  test.assertTrue(game.allFleets.includes(created));test.assertNull(created.fleet);test.assertTrue(created.star===star);
  test.assertTrue(game.fleetExchange.active===created);
 });
 test.it('wraps whole groups in a new nested group and returns a member to the main fleet without flattening',()=>{
  const {game,fleet,ships,select,click}=fixture();game.showFleetExchange(fleet);select('main',ships[0]);click('exchangeFleetMember');
  const group=ships[0].fleet;select('main',group);test.assertTrue(click('fleetExchangeNew'));test.assertTrue(click('exchangeFleetMember'));
  const outer=group.fleet;test.assertTrue(outer.fleet===fleet);test.assertTrue(ships[0].fleet===group);
  select('sub',group);test.assertTrue(click('exchangeFleetMember'));test.assertTrue(group.fleet===fleet);test.assertTrue(ships[0].fleet===group);
 });
 test.it('inspects selected groups and returns to enclosing fleet and system',()=>{
  const {game,star,fleet,ships,select,click}=fixture();game.showFleetExchange(fleet);select('main',ships[0]);click('exchangeFleetMember');
  const group=ships[0].fleet;select('main',group);test.assertTrue(click('fleetExchangeOpen'));test.assertTrue(game.fleetExchange.container===group);
  test.assertTrue(click('fleetExchangeParent'));test.assertTrue(game.fleetExchange.container===fleet);
  test.assertTrue(click('fleetExchangeParent'));test.assertTrue(game.fleetExchange.container===star);
 });
 test.it('opens independently hidden subgroups through Class-visible fleet tables and revokes inherited access',()=>{
  const {game,display,fleet,ships,star,select,click}=fixture();star.owner=2;star.setVisibilityTo(1,0);
  const child=game.factory.createFleet(fleet.x,fleet.y,2,'Secret subgroup');child.addShip(ships[0]);fleet.addShip(child);
  const inner=game.factory.createFleet(fleet.x,fleet.y,2,'Secret inner');inner.addShip(ships[0]);child.addShip(inner);
  fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
  for(const object of [child,inner,ships[0]]){object.owner=2;object.setVisibilityTo(1,Common.VisibilityLevel.NONE);}
  ships[0].name='Private member';ships[0].damage=ships[0].power*25;
  test.assertTrue(game.showFleetExchange(fleet));test.assertTrue(select('main',child));
  test.assertTrue(game.fleetExchange.active===child);test.assertTrue(game.getFleetExchangeState().sub.includes(inner));
  test.assertTrue(click('fleetExchangeOpen'));test.assertTrue(game.fleetExchange.container===child);
  test.assertTrue(select('main',inner));test.assertTrue(click('fleetExchangeOpen'));
  const row=display.getFleetExchangeLayout().lists[0].rows[0];test.assertTrue(row.object===ships[0]);test.assertEqual(row.data.health,'75%');
  test.assertFalse(row.data.title.includes(ships[0].name));test.assertFalse(game.canExchangeFleetMember());
  test.assertEqual(display.getFleetKnowledge(inner).level,Common.VisibilityLevel.NONE);
  test.assertEqual(display.getShipDiagnostics(ships[0]).health,'?');
  test.assertTrue(click('fleetExchangeParent'));test.assertTrue(game.fleetExchange.container===child);
  fleet.setVisibilityTo(1,Common.VisibilityLevel.TECH);test.assertFalse(game.canViewFleetExchange(inner));test.assertNull(game.getFleetExchangeState());
  fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertTrue(game.canViewFleetExchange(inner));
  child.ships.splice(child.ships.indexOf(inner),1);test.assertFalse(game.canViewFleetExchange(inner));child.ships.push(inner);
  game.entityRemoved(child);test.assertFalse(game.canViewFleetExchange(inner));
 });
 test.it('refuses inherited table access through a hidden containment cycle',()=>{
  const {game,fleet}=fixture(),child=game.factory.createFleet(fleet.x,fleet.y,2,'Cycle');
  fleet.owner=2;fleet.setVisibilityTo(1,0);child.setVisibilityTo(1,0);
  fleet.fleet=child;child.ships.push(fleet);child.fleet=fleet;fleet.ships.push(child);
  test.assertFalse(game.canViewFleetExchange(child));test.assertFalse(game.canViewFleetExchange(fleet));
 });
 test.it('renders scrap and call-in table cues with v3 priority while protecting enemy flags',()=>{
  const {game,display,fleet,ships}=fixture(),ship=ships[0];game.showFleetExchange(fleet);game.selectFleetExchangeMember('main',ship);
  test.assertTrue(game.executeUIAction({type:'fleetExchangeScrap'}));let data=display.getFleetExchangeLayout().lists[0].rows.find(r=>r.object===ship).data;
  test.assertEqual(data.nameColor,'red');test.assertEqual(data.nameStyle,pdg.textStyle_Bold|pdg.textStyle_Underline);
  const texts=[];display.drawWindowPanel=()=>{};display.drawTextLine=(...args)=>texts.push(args);display.drawRoundedRect=()=>{};display.drawUIButton=()=>{};display.drawFleetExchangeWindow();
  test.assertTrue(texts.some(args=>args[0]===data.title && args[3]==='red' && args[5]===(pdg.textStyle_Bold|pdg.textStyle_Underline)));
  game.systemShipWindowStar=game.stars[0];game.uiWindow='systemShips';display.drawDivider=()=>{};texts.length=0;display.drawSystemShipWindow();
  test.assertTrue(texts.some(args=>String(args[0]).includes(ship.name) && args[3]==='red' && args[5]===(pdg.textStyle_Bold|pdg.textStyle_Underline)));game.uiWindow='fleetExchange';
  ship.userCallIn=true;test.assertEqual(display.getFleetMemberDiagnostics(fleet,ship).nameColor,'yellow');ship.userCallIn=false;
  test.assertTrue(game.executeUIAction({type:'fleetExchangeScrap'}));test.assertEqual(display.getFleetMemberDiagnostics(fleet,ship).nameStyle,pdg.textStyle_Plain);
  ship.course.replace({x:ship.x+1000,y:ship.y});test.assertEqual(display.getFleetMemberDiagnostics(fleet,ship).nameStyle,pdg.textStyle_Bold);
  fleet.owner=2;ship.owner=2;fleet.setVisibilityTo(1,3);ship.setScrap(true);ship.userCallIn=true;
  data=display.getFleetMemberDiagnostics(fleet,ship);test.assertEqual(data.nameColor,'lightgray');test.assertEqual(data.nameStyle,pdg.textStyle_Plain);
 });
 test.it('marks patrolling table members in every language without altering standalone names or commands',()=>{
  const {game,display,fleet,ships}=fixture(),language=pdg.res.getLanguage();fleet.setPatrol(true);
  try{for(const [lang,label] of [['en','Patrolling'],['de','Auf Patrouille'],['es','Patrullando'],['fr','En patrouille'],['ja','哨戒中'],['ru','Патрулирование']]){
   pdg.res.setLanguage(lang);display.reloadUIStrings();const title=display.getShipDiagnostics(ships[0]).title;
   test.assertEqual(display.getFleetMemberDiagnostics(fleet,ships[0]).title,title+' · '+label);
   test.assertEqual(display.getShipDiagnostics(ships[0]).title,title);
   test.assertFalse(game.canExchangeFleetMember());
  }}finally{pdg.res.setLanguage(language);display.reloadUIStrings();}
  ships[0].setPatrol(false);test.assertEqual(display.getFleetMemberDiagnostics(fleet,ships[0]).title,display.getShipDiagnostics(ships[0]).title);
 });
 test.it('uses knowledge-safe fleet and group titles in rows and exchange headers',()=>{
  const {game,display,fleet,ships}=fixture(),child=game.factory.createFleet(fleet.x,fleet.y,2,'Private subgroup');
  child.addShip(ships[0]);fleet.addShip(child);fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);child.setVisibilityTo(1,0);
  test.assertEqual(display.getFleetTableTitle(fleet),'Fleet Fleet');test.assertEqual(display.getFleetTableTitle(child),'? Group');
  test.assertEqual(display.getFleetMemberDiagnostics(fleet,child).title,'? Group');
  game.showFleetExchange(fleet);game.selectFleetExchangeMember('main',child);
  const texts=[];display.drawWindowPanel=()=>{};display.drawTextLine=t=>texts.push(String(t));display.drawRoundedRect=()=>{};display.drawUIButton=()=>{};
  display.drawFleetExchangeWindow();test.assertTrue(texts.includes('Fleet contents: ? Group'));test.assertFalse(texts.some(t=>t.includes('Private subgroup')));
  game.executeUIAction({type:'fleetExchangeOpen'});texts.length=0;display.drawFleetExchangeWindow();test.assertTrue(texts.includes('? Group'));test.assertFalse(texts.some(t=>t.includes('Private subgroup')));
  child.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertEqual(display.getFleetTableTitle(child),'Private subgroup Group');
  child.owner=1;child.setVisibilityTo(1,0);test.assertEqual(display.getFleetTableTitle(child),'Private subgroup Group');
 });
 test.it('uses a localized group noun rather than the Group action verb in every language',()=>{
  const {game,display,fleet,ships}=fixture(),child=game.factory.createFleet(fleet.x,fleet.y,2,'Private subgroup'),language=pdg.res.getLanguage();
  child.addShip(ships[0]);fleet.addShip(child);child.setVisibilityTo(1,0);
  try{for(const [lang,label] of [['en','Group'],['de','Gruppe'],['es','Grupo'],['fr','Groupe'],['ja','グループ'],['ru','Группа']]){
   pdg.res.setLanguage(lang);display.reloadUIStrings();test.assertEqual(display.getFleetTableTitle(child),'? '+label);
  }}finally{pdg.res.setLanguage(language);display.reloadUIStrings();}
 });
 test.it('refuses stale destinations without silently creating a replacement fleet',()=>{
  const {game,star,fleet,ships,select}=fixture();game.showFleetExchange(star);select('main',fleet);select('main',ships[2]);
  game.entityRemoved(fleet);const count=game.allFleets.length;
  test.assertFalse(game.exchangeFleetMember());test.assertEqual(game.allFleets.length,count);test.assertNull(ships[2].fleet);
 });
 test.it('prevents self exchange, patrol transfers and foreign edits and exposes fleet-table statistics while masking unknown names',()=>{
  const {game,display,star,fleet,ships,select}=fixture();game.showFleetExchange(star);select('main',fleet);test.assertFalse(game.canExchangeFleetMember());
  select('main',ships[2]);ships[2].setPatrol(true);test.assertFalse(game.canExchangeFleetMember());ships[2].setPatrol(false);ships[2].owner=2;test.assertFalse(game.canExchangeFleetMember());
  fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);ships[0].owner=2;ships[0].name='Secret';ships[0].setVisibilityTo(1,0);
  game.showFleetExchange(fleet);const row=display.getFleetExchangeLayout().lists[0].rows.find(r=>r.object===ships[0]);
  test.assertFalse(row.data.title.includes('Secret'));test.assertEqual(row.data.healthRatio,1);test.assertEqual(display.getShipDiagnostics(ships[0]).healthRatio,null);
 });
 test.it('pages through both lists and revalidates selection after removals',()=>{
  const {game,display,star,fleet,ships,click}=fixture();for(let i=0;i<20;i++)fleet.addShip(game.factory.createShip(star.x,star.y,'scout',star,true));
  game.showFleetExchange(fleet);test.assertTrue(click('fleetExchangePage',a=>a.side==='main'));const rows=display.getFleetExchangeLayout().lists[0].rows;
  test.assertTrue(rows.length>0);test.assertTrue(click('fleetExchangeSelect',a=>a.object===rows[0].object));
  const selected=game.fleetExchange.selection;fleet.removeShip(selected);test.assertFalse(game.exchangeFleetMember());
 });
 test.it('rejects an unregistered source even when a stale direct member reference remains',()=>{
  const {game,fleet,ships,select}=fixture();game.showFleetExchange(fleet);select('main',ships[0]);
  game.entityRemoved(ships[0]);const count=game.allFleets.length;
  test.assertFalse(game.exchangeFleetMember());test.assertEqual(game.allFleets.length,count);
 });
 test.it('keeps Enter Tab and outside clicks modal and closes with Escape',()=>{
  const {game,star}=fixture();game.showFleetExchange(star);const turn=game.turn;
  game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);game.handleUIClick(1,1);
  test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'fleetExchange');game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);
 });
 test.it('fits translated buttons and exposes resource-based sorting in every supported language',()=>{
  const {game,display,star,fleet,ships,select}=fixture(),language=pdg.res.getLanguage();
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);display.reloadUIStrings();game.showFleetExchange(star);select('main',fleet);select('sub',ships[0]);
   const layout=display.getFleetExchangeLayout();for(const row of display.getFleetExchangeActions()){
    test.assertTrue(row.rect.x>=layout.rect.x&&row.rect.x+row.rect.width<=layout.rect.x+layout.rect.width);
    test.assertTrue(row.rect.y+row.rect.height<=layout.rect.y+layout.rect.height);
   }
   test.assertTrue(game.executeUIAction({type:'fleetExchangeSort',key:'power'}));test.assertEqual(game.fleetExchange.sort.key,'power');
  }}finally{pdg.res.setLanguage(language);}
 });
});
