const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Rules=require('../src/js/rules.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
function fixture(){
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const ship=(x=0)=>{const s=game.factory.createShip(x,0,'battleship',home,true);s.star=null;s.speed=50;return s;};
    const fleet=(x=0)=>{const f=game.factory.createFleet(x,0,1,'Guard');f.addShip(ship(x));f.totalSpeed=50;return f;};
    return {game,home,ship,fleet};
}
module.exports=function(){test.describe('V3 pursuit movement ordering',()=>{
    test.it('lets a pursued ship move before a faster pursuer can intercept its old position',()=>{
        const {game,ship}=fixture(),p=ship(),target=ship(40);p.speed=60;p.setDestination(target);target.setDestination({x:500,y:0});
        game.moveAllShips();test.assertEqual(target.x,90);test.assertEqual(p.x,60);test.assertTrue(p.destination===target);
    });
    test.it('moves an eligible fleet before a standalone ship pursuing it',()=>{
        const {game,ship,fleet}=fixture(),p=ship(),target=fleet(40);p.speed=60;p.setDestination(target);target.setDestination({x:500,y:0});
        game.moveAllShips();test.assertEqual(target.x,90);test.assertEqual(p.x,60);test.assertEqual(target.ships[0].x,90);
    });
    test.it('follows the target member to its moving top fleet container',()=>{
        const {game,ship,fleet}=fixture(),p=ship(),target=fleet(40);p.speed=60;p.setDestination(target.ships[0]);target.setDestination({x:500,y:0});
        game.moveAllShips();test.assertEqual(target.x,90);test.assertEqual(p.x,60);test.assertEqual(target.ships[0].x,90);
    });
    test.it('moves fleet pursuers after their moving ship destination',()=>{
        const {game,ship,fleet}=fixture(),p=fleet(),target=ship(40);p.totalSpeed=60;p.setDestination(target);target.setDestination({x:500,y:0});
        game.moveAllShips();test.assertEqual(target.x,90);test.assertEqual(p.x,60);test.assertTrue(p.destination===target);
    });
    test.it('recursively orders a pursuit chain without moving any actor twice',()=>{
        const {game,ship}=fixture(),a=ship(),b=ship(100),c=ship(200),order=[];
        a.setDestination(b);b.setDestination(c);c.setDestination({x:500,y:0});
        [a,b,c].forEach((s,i)=>{const move=s.move.bind(s);s.move=()=>{move();order.push(i);};});
        game.moveAllShips();test.assertEqual(order.join(','),'2,1,0');test.assertEqual(c.x,250);
        game.moveAllShips();test.assertEqual(c.x,300);test.assertEqual(order.length,6);
    });
    test.it('terminates mutual pursuit with v3 mark-before-recursion semantics',()=>{
        const {game,ship}=fixture(),a=ship(),b=ship(200);a.setDestination(b);b.setDestination(a);
        game.moveAllShips();test.assertEqual(a.x,50);test.assertEqual(b.x,150);
    });
    test.it('terminates longer pursuit cycles and calls each actor once',()=>{
        const {game,ship}=fixture(),a=ship(),b=ship(300),c=ship(600),counts=new Map();
        a.setDestination(b);b.setDestination(c);c.setDestination(a);
        [a,b,c].forEach(s=>{const move=s.move.bind(s);s.move=()=>{counts.set(s,(counts.get(s)||0)+1);move();};});
        game.moveAllShips();[a,b,c].forEach(s=>test.assertEqual(counts.get(s),1));
    });
    test.it('leaves static star/coordinate targets in normal actor order',()=>{
        const {game,home,ship}=fixture(),a=ship(100),b=ship(200),order=[];a.setDestination(home);b.setDestination({x:500,y:0});
        [a,b].forEach((s,i)=>{const move=s.move.bind(s);s.move=()=>{order.push(i);move();};});
        game.moveAllShips();test.assertEqual(order.join(','),'0,1');test.assertEqual(a.x,50);
    });
    test.it('skips removed actors even when they occur later in the movement snapshot',()=>{
        const {game,ship}=fixture(),a=ship(),b=ship(100);let moved=false;a.move=()=>game.entityRemoved(b);b.move=()=>{moved=true;};
        game.moveAllShips();test.assertFalse(moved);
    });
    test.it('never independently moves a fleet member with stale individual orders',()=>{
        const {game,ship,fleet}=fixture(),f=fleet();f.setDestination({x:500,y:0});f.ships[0].destination={x:-500,y:0};
        let calls=0;f.ships[0].move=()=>calls++;game.moveAllShips();test.assertEqual(calls,0);test.assertEqual(f.ships[0].x,50);
    });
    test.it('does not permanently suppress direct movement outside turn processing',()=>{
        const {game,ship}=fixture(),a=ship();a.setDestination({x:500,y:0});game.moveAllShips();a.move();test.assertEqual(a.x,100);
    });
    test.it('processes departure before allowing the destination to flee',()=>{
        const {game,home,ship}=fixture(),a=ship(),b=ship(100),order=[];a.star=home;a.setDestination(b);b.setDestination({x:500,y:0});
        game.handleShipDepartureTechnology=()=>order.push('depart');const move=b.move.bind(b);b.move=()=>{order.push('target');move();};
        game.moveAllShips();test.assertEqual(order.join(','),'depart,target');test.assertEqual(a.star,null);
    });
    test.it('does not move a pursuing ship removed during its target’s turn',()=>{
        const {game,ship}=fixture(),a=ship(),b=ship(100);a.setDestination(b);b.setDestination({x:500,y:0});
        b.move=()=>game.entityRemoved(a);game.moveAllShips();test.assertEqual(a.x,0);test.assertFalse(game.allShips.includes(a));
    });
    test.it('does not move a pursuing fleet removed during its target’s turn',()=>{
        const {game,ship,fleet}=fixture(),a=fleet(),b=ship(100);a.setDestination(b);b.setDestination({x:500,y:0});
        b.move=()=>game.entityRemoved(a);game.moveAllShips();test.assertEqual(a.x,0);test.assertFalse(game.allFleets.includes(a));
    });
    test.it('applies pursuit ordering through the real end-turn movement phase',()=>{
        const {game,home,ship}=fixture(),a=ship(),b=ship(40);a.speed=60;a.setDestination(b);b.setDestination({x:500,y:0});
        game.aiManager=null;home.update=()=>{};game.endTurn();test.assertEqual(a.x,60);test.assertEqual(b.x,90);
    });
    test.it('cleans up movement state when an actor throws, allowing the next turn to run',()=>{
        const {game,ship}=fixture(),a=ship();const move=a.move.bind(a);a.move=()=>{throw Error('fixture');};
        try{game.moveAllShips();}catch(error){test.assertEqual(error.message,'fixture');}
        test.assertEqual(game.movementTurn,undefined);a.move=move;a.setDestination({x:500,y:0});game.moveAllShips();test.assertEqual(a.x,50);
    });
});};
