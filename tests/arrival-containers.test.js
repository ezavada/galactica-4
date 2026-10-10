const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Save=require('../src/js/game-save.js');
function fixture(owner=1) {
 const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
 const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
 const target=game.factory.createStar(100,0,'Target');target.owner=owner;target.techLevel=5;
 const ship=(star,type='scout')=>{const s=game.factory.createShip(star.x,star.y,type,star,true);star.shipArrived(s);return s;};
 const group=(star,name)=>{const f=game.factory.createFleet(star.x,star.y,star.owner,name);f.addShip(ship(star));star.shipArrived(f);return f;};
 return {game,home,target,ship,group};
}
module.exports=()=>test.describe('V3 highest-container arrival and survivor placement',()=>{
 test.it('includes every planetary defender when navigating to a nested enemy member',()=>{
  const {game,home,target,ship,group}=fixture(2),outer=group(target,'Outer'),inner=group(target,'Inner');outer.addShip(inner);
  const defense=ship(target,'defense');target.addDefenseSatellite(defense);const attacker=ship(home,'battleship'),nav=inner.getLeafShips()[0];
  const expected=outer.getLeafShips();const resolve=game.resolveCombat.bind(game);let destination,defenders;game.resolveCombat=(a,d)=>{destination=d;defenders=game.combatSystem.collectSpaceDefenders(d,a.owner,[a]);return resolve(a,d);};
  attacker.destination=nav;attacker.arriveAtDestination();test.assertTrue(destination===target);test.assertTrue(defenders.includes(defense));test.assertTrue(expected.every(s=>defenders.includes(s)));test.assertFalse(home.ships.includes(attacker));
 });
 test.it('colonizes a neutral system when the navigation target is a docked ship',()=>{
  const {game,home,target,ship}=fixture(0),resident=ship(target),colony=ship(home,'colony');colony.destination=resident;colony.arriveAtDestination();
  test.assertEqual(target.owner,1);test.assertFalse(game.allShips.includes(colony));test.assertEqual(game.attention.pending().length,2);test.assertEqual(game.overlay.type,'report');
 });
 test.it('removes the empty arriving fleet when its last colony ship establishes the system',()=>{
  const {game,home,target,ship}=fixture(0),incoming=game.factory.createFleet(home.x,home.y,1,'Colonists');incoming.addShip(ship(home,'colony'));home.shipArrived(incoming);incoming.destination=target;incoming.arriveAtDestination();test.assertEqual(target.owner,1);test.assertFalse(game.allFleets.includes(incoming));test.assertFalse(home.ships.includes(incoming));test.assertFalse(target.ships.includes(incoming));
 });
 test.it('docks at an allied system when the named satellite cannot hold ships',()=>{
  const {game,home,target,ship}=fixture(),defense=ship(target,'defense'),arriving=ship(home);target.addDefenseSatellite(defense);arriving.destination=defense;arriving.arriveAtDestination();
  test.assertTrue(arriving.star===target);test.assertTrue(target.ships.includes(arriving));test.assertFalse(home.ships.includes(arriving));test.assertEqual(arriving.fleet,null);
 });
 test.it('keeps an arriving fleet as a child group of the destination fleet',()=>{
  const {game,home,target,group}=fixture(),incoming=group(home,'Incoming'),guard=group(target,'Guard'),member=incoming.getLeafShips()[0];incoming.destination=guard;incoming.arriveAtDestination();
  test.assertTrue(incoming.fleet===guard);test.assertTrue(member.fleet===incoming);test.assertTrue(game.allFleets.includes(incoming));test.assertTrue(target.ships.includes(guard));test.assertFalse(target.ships.includes(incoming));test.assertFalse(home.ships.includes(incoming));test.assertEqual(incoming.destination,null);
  const loaded=Save.restore(Save.serialize(game)),saved=loaded.allFleets.find(f=>f.name==='Incoming');test.assertEqual(saved.fleet.name,'Guard');test.assertTrue(saved.getDockedStar()===loaded.stars[1]);
 });
 test.it('joins the immediate parent of a nested navigation ship without pulling that ship out',()=>{
  const {game,home,target,group}=fixture(),outer=group(target,'Outer'),inner=group(target,'Inner'),incoming=group(home,'Incoming'),nav=inner.getLeafShips()[0];outer.addShip(inner);incoming.destination=nav;incoming.arriveAtDestination();
  test.assertTrue(incoming.fleet===inner);test.assertTrue(nav.fleet===inner);test.assertTrue(inner.fleet===outer);test.assertTrue(target.ships.includes(outer));test.assertFalse(target.ships.includes(inner));
 });
 test.it('preserves later fleet arrivals as groups at a rendezvous',()=>{
  const {game,home,group}=fixture(),first=group(home,'First'),second=group(home,'Second'),r=game.factory.createRendezvous(200,0,1,'Meet');first.destination=r;first.arriveAtDestination();second.destination=r;second.arriveAtDestination();
  test.assertTrue(r.getFleet()===first);test.assertTrue(second.fleet===first);test.assertTrue(game.allFleets.includes(second));test.assertEqual(first.getSize(),2);test.assertEqual(first.star,null);test.assertFalse(home.ships.includes(first));
 });
 test.it('resolves anchored rendezvous arrivals against the anchor rather than the assembly reference',()=>{
  const {game,home,target,ship,group}=fixture(),assembly=group(home,'Assembly'),r=game.factory.createRendezvous(target.x,target.y,1,'Meet',target);r.setFleet(assembly);
  test.assertTrue(game.getArrivalTopContainer(r)===target);r.setFleet(null);const arriving=ship(home);arriving.destination=r;arriving.arriveAtDestination();test.assertTrue(arriving.fleet.getDockedStar()===target);test.assertTrue(target.ships.includes(arriving.fleet));
 });
 test.it('falls back to the surviving captured system after the navigation ship is destroyed',()=>{
  const {game,home,target,ship}=fixture(2),nav=ship(target),arriving=ship(home,'battleship');game.shouldResolveCombat=()=>true;game.resolveCombat=(a,d)=>{test.assertTrue(d===target);game.entityRemoved(nav);target.owner=1;};arriving.destination=nav;arriving.arriveAtDestination();
  test.assertTrue(arriving.star===target);test.assertTrue(target.ships.includes(arriving));test.assertEqual(arriving.fleet,null);
 });
 test.it('leaves survivors in space when the containing system remains hostile',()=>{
  const {game,home,target,ship}=fixture(2),nav=ship(target),arriving=ship(home);game.shouldResolveCombat=()=>true;game.resolveCombat=()=>{};arriving.destination=nav;arriving.arriveAtDestination();test.assertEqual(arriving.star,null);test.assertEqual(arriving.fleet,null);test.assertFalse(target.ships.includes(arriving));test.assertEqual(arriving.x,target.x);
 });
 test.it('rejects destroyed empty fleet targets and advances to the next coordinate leg',()=>{
  const {game,home,ship}=fixture(),empty=game.factory.createFleet(100,0,1,'Empty'),arriving=ship(home);arriving.speed=100;game.issuePlayerWaypoint(arriving,empty);game.issuePlayerWaypoint(arriving,{x:300,y:0});arriving.move();test.assertEqual(arriving.fleet,null);test.assertEqual(arriving.destination.x,300);
 });
 test.it('registers direct fleet arrivals in neutral and allied system contents',()=>{
  for(const owner of [0,1]){const {game,home,target,group}=fixture(owner),incoming=group(home,'Incoming');incoming.destination=target;incoming.arriveAtDestination();test.assertTrue(incoming.star===target);test.assertTrue(target.ships.includes(incoming));test.assertFalse(home.ships.includes(incoming));}
 });
});
