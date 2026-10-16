const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Display=require('../src/js/display.js');
function fixture(type='battleship'){
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const ship=game.factory.createShip(0,0,type,home,true);home.shipArrived(ship);ship.speed=100;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.setSelectedObject(ship);game.showCourse(ship);
    return {game,home,ship,display};
}
module.exports=function(){test.describe('V3 course Patrol integration',()=>{
    test.it('enables docked Patrol and clears all waypoints/loop/Hunt while preserving memory',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,{x:300,y:0});ship.course.loop=true;ship.course.hunt=true;ship.course.swapMemory();
        test.assertTrue(game.togglePatrol(ship));test.assertTrue(ship.isOnPatrol());test.assertEqual(ship.course.waypoints.length,0);
        test.assertFalse(ship.course.loop);test.assertFalse(ship.course.hunt);test.assertTrue(ship.course.hasMemory);
    });
    test.it('routes P through the course editor and preserves the inspected object',()=>{
        const {game,ship}=fixture();game.handleKeyPress(112);test.assertTrue(ship.isOnPatrol());test.assertEqual(game.uiWindow,'course');
        game.handleKeyPress(80);test.assertFalse(ship.isOnPatrol());test.assertTrue(game.courseWindowObject===ship);
    });
    test.it('routes selected ship/fleet P ahead of production, including disabled space commands',()=>{
        const {game,home,ship}=fixture();game.uiWindow=null;game.handleKeyPress(112);test.assertTrue(ship.isOnPatrol());test.assertEqual(game.uiWindow,null);
        ship.star=null;game.handleKeyPress(80);test.assertEqual(game.uiWindow,null);test.assertTrue(ship.isOnPatrol());
        ship.star=home;const f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);game.setSelectedObject(f);game.handleKeyPress(112);
        test.assertTrue(f.isOnPatrol());test.assertEqual(game.uiWindow,null);game.setSelectedObject(home);game.handleKeyPress(112);test.assertEqual(game.uiWindow,'production');
    });
    test.it('rejects space, enemy, unfinished, removed and fleet-member Patrol commands',()=>{
        const {game,home,ship}=fixture();ship.star=null;test.assertFalse(game.togglePatrol(ship));ship.star=home;
        ship.owner=2;test.assertFalse(game.togglePatrol(ship));ship.owner=1;ship.progress=50;test.assertFalse(game.togglePatrol(ship));ship.progress=100;
        const f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);test.assertFalse(game.togglePatrol(ship));
        f.removeShip(ship);ship.star=home;game.entityRemoved(ship);test.assertFalse(game.togglePatrol(ship));
    });
    test.it('does not permit switching mandatory satellite Patrol off',()=>{
        const {game,ship,display}=fixture('defense');ship.setPatrol(true);test.assertFalse(game.togglePatrol(ship));test.assertTrue(ship.isOnPatrol());
        test.assertFalse(display.getContextActions(ship).some(r=>r.action.type==='togglePatrol'));
    });
    test.it('removes Patrol after adding a destination and keeps the remembered course',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,{x:300,y:0});ship.course.swapMemory();game.togglePatrol(ship);
        game.issuePlayerWaypoint(ship,{x:400,y:0});test.assertFalse(ship.isOnPatrol());test.assertTrue(ship.course.hasMemory);
    });
    test.it('propagates docked fleet Patrol to members and restores it off on command',()=>{
        const {game,home,ship,display}=fixture(),f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);f.star=home;game.setSelectedObject(f);game.showCourse(f);
        test.assertTrue(game.togglePatrol(f));test.assertTrue(f.isOnPatrol());test.assertTrue(ship.isOnPatrol());
        test.assertEqual(display.getFleetDetailsLayout(f).patrolHeight,18);test.assertTrue(game.togglePatrol(f));test.assertFalse(ship.isOnPatrol());
    });
    test.it('preserves independent member course flags when a fleet changes Patrol',()=>{
        const {game,ship}=fixture(),f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);ship.destination={x:400,y:0};ship.setPatrol(false);
        f.setPatrol(true);test.assertTrue(f.isOnPatrol());test.assertFalse(ship.isOnPatrol());
    });
    test.it('clears fleet docking at departure so space fleets cannot enable Patrol',()=>{
        const {game,home,ship}=fixture(),f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);f.star=home;f.totalSpeed=100;
        game.issuePlayerWaypoint(f,{x:400,y:0});test.assertTrue(game.canTogglePatrol(f));f.move();
        test.assertEqual(f.star,null);test.assertFalse(game.togglePatrol(f));test.assertEqual(f.x,100);
    });
    test.it('hides idle docked patrols from drawing/hit testing unless selected or departing',()=>{
        const {game,ship,display}=fixture();ship.setPatrol(true);game.setSelectedObject(null);
        test.assertTrue(display.isPatrolHiddenOnMap(ship));display.toScreenX=x=>x;display.toScreenY=y=>y;
        test.assertFalse(game.findObjectAtPosition(10,-6)===ship);display.drawShip(ship);
        game.setSelectedObject(ship);test.assertFalse(display.isPatrolHiddenOnMap(ship));
        game.setSelectedObject(null);ship.destination={x:400,y:0};test.assertFalse(display.isPatrolHiddenOnMap(ship));
    });
    test.it('keeps selected fleet patrols visible and conceals idle unselected fleets',()=>{
        const {game,home,ship,display}=fixture(),f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);f.star=home;f.setPatrol(true);
        game.setSelectedObject(null);test.assertTrue(display.isPatrolHiddenOnMap(f));display.drawFleet(f);
        game.setSelectedObject(f);test.assertFalse(display.isPatrolHiddenOnMap(f));
    });
    test.it('lets the system receive map clicks instead of an invisible patrolling fleet member',()=>{
        const {game,home,ship,display}=fixture(),f=game.factory.createFleet(0,0,1,'Guard');f.addShip(ship);f.star=home;f.setPatrol(true);
        game.setSelectedObject(home);test.assertTrue(game.findObjectAtPosition(display.toScreenX(home.x),display.toScreenY(home.y))===home);
    });
    test.it('uses v3 docked Patrol combat bonuses and excludes patrolling ships from repair',()=>{
        const {game,home,ship}=fixture();pdg.srand(424242);const ordinaryAttack=ship.getOneAttackAgainst(null);
        game.togglePatrol(ship);pdg.srand(424242);
        test.assertEqual(ship.getOneAttackAgainst(null),Math.floor(ordinaryAttack*1.25));
        ship.takeDamage(100);test.assertEqual(ship.damage,75);
        test.assertEqual(home.repairDockedShips(),0);test.assertEqual(ship.damage,75);game.togglePatrol(ship);home.repairDockedShips();test.assertEqual(ship.damage,0);
    });
    test.it('localizes editor Patrol state and keeps fleet status private from enemies',()=>{
        const {game,home,ship,display}=fixture();const previous=pdg.res.getLanguage();
        try{for(const language of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(language);const button=display.getCourseActionRegions().find(r=>r.action.type==='togglePatrol');
            test.assertEqual(button.label,pdg.res.getString(577));test.assertEqual(button.key,'P');game.togglePatrol(ship);
            test.assertTrue(display.getCourseActionRegions().find(r=>r.action.type==='togglePatrol').active);game.togglePatrol(ship);
        }}finally{pdg.res.setLanguage(previous);}
        const f=game.factory.createFleet(0,0,2,'Enemy');f.addShip(ship);f.star=home;f.setPatrol(true);game.config.omniscient=false;
        test.assertEqual(display.getFleetDetailsLayout(f).patrolHeight,0);
    });
});};
