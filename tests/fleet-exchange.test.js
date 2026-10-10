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
 test.it('refuses stale destinations without silently creating a replacement fleet',()=>{
  const {game,star,fleet,ships,select}=fixture();game.showFleetExchange(star);select('main',fleet);select('main',ships[2]);
  game.entityRemoved(fleet);const count=game.allFleets.length;
  test.assertFalse(game.exchangeFleetMember());test.assertEqual(game.allFleets.length,count);test.assertNull(ships[2].fleet);
 });
 test.it('prevents self exchange, patrol transfers and foreign edits and masks unknown member diagnostics',()=>{
  const {game,display,star,fleet,ships,select}=fixture();game.showFleetExchange(star);select('main',fleet);test.assertFalse(game.canExchangeFleetMember());
  select('main',ships[2]);ships[2].setPatrol(true);test.assertFalse(game.canExchangeFleetMember());ships[2].setPatrol(false);ships[2].owner=2;test.assertFalse(game.canExchangeFleetMember());
  fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);ships[0].owner=2;ships[0].name='Secret';ships[0].setVisibilityTo(1,0);
  game.showFleetExchange(fleet);const row=display.getFleetExchangeLayout().lists[0].rows.find(r=>r.object===ships[0]);
  test.assertFalse(row.data.title.includes('Secret'));test.assertNull(row.data.healthRatio);
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
