const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Rules=require('../src/js/rules.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Display=require('../src/js/display.js');
function fixture(){
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const ship=game.factory.createShip(0,0,'battleship',home,true);ship.speed=100;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>String(text).length*size/2};
    const display=new Display(game);game.display=display;game.setSelectedObject(ship);game.showCourse(ship);
    return {game,home,ship,display};
}
const order=game=>game.issuePlayerWaypoint(game.courseWindowObject,{x:100,y:0});
module.exports=function(){test.describe('V3 course memory',()=>{
    test.it('copies the first course without changing active progress or looping',()=>{
        const {game,ship}=fixture();order(game);game.issuePlayerWaypoint(ship,{x:200,y:0});ship.course.loop=true;ship.move();
        const revision=ship.course.revision;test.assertTrue(ship.course.swapMemory());test.assertTrue(ship.course.hasMemory);
        test.assertEqual(ship.course.current,2);test.assertEqual(ship.course.memory.current,2);test.assertTrue(ship.course.memory.loop);
        test.assertEqual(ship.course.revision,revision);
    });
    test.it('keeps saved waypoint arrays and coordinate values independent of edits',()=>{
        const {game,ship}=fixture();ship.star=null;order(game);ship.course.swapMemory();ship.course.edit(1,{x:300,y:0});
        test.assertEqual(ship.course.memory.waypoints[1].target.x,100);ship.course.waypoints[0].target.x=50;
        test.assertEqual(ship.course.memory.waypoints[0].target.x,0);
    });
    test.it('swaps different courses in both directions with their own active indices',()=>{
        const {game,ship}=fixture();order(game);ship.course.swapMemory();ship.destination={x:300,y:0};ship.course.swapMemory();
        test.assertEqual(ship.destination.x,100);test.assertEqual(ship.course.current,1);test.assertEqual(ship.course.memory.current,0);
        ship.course.swapMemory();test.assertEqual(ship.destination.x,300);test.assertEqual(ship.course.current,0);
    });
    test.it('restores the saved course after clearing the active course',()=>{
        const {game,ship}=fixture();order(game);ship.course.swapMemory();game.clearOrders(ship);test.assertTrue(ship.course.hasMemory);
        ship.course.swapMemory();test.assertEqual(ship.destination.x,100);test.assertFalse(ship.course.hasMemory);
    });
    test.it('treats an empty memory after swapping as the first-save case',()=>{
        const {game,ship}=fixture();order(game);ship.course.swapMemory();ship.course.clear();ship.course.swapMemory();
        ship.course.swapMemory();test.assertEqual(ship.destination.x,100);test.assertTrue(ship.course.hasMemory);
    });
    test.it('does not save patrol during the first copy, while model swaps retain subsequent flags',()=>{
        const {game,ship}=fixture();order(game);ship.setPatrol(true);ship.course.swapMemory();
        test.assertFalse(ship.course.memory.patrol);test.assertTrue(ship.isOnPatrol());
        ship.course.swapMemory();test.assertFalse(ship.isOnPatrol());test.assertTrue(ship.course.memory.patrol);
        ship.course.swapMemory();test.assertTrue(ship.isOnPatrol());
    });
    test.it('cancels patrol and selects the active waypoint when the player uses Memory',()=>{
        const {game,ship}=fixture();order(game);ship.setPatrol(true);game.courseSelection=1;game.coursePage=8;
        test.assertTrue(game.executeUIAction({type:'swapCourseMemory'}));test.assertFalse(ship.isOnPatrol());
        test.assertEqual(game.courseSelection,1);test.assertEqual(game.coursePage,0);test.assertEqual(game.uiWindow,'course');
    });
    test.it('reveals the active waypoint page after a memory refresh',()=>{
        const {game,ship,display}=fixture();for(let i=1;i<=15;i++)game.issuePlayerWaypoint(ship,{x:i*100,y:0});
        ship.course.current=12;game.executeUIAction({type:'swapCourseMemory'});
        test.assertEqual(game.courseSelection,12);test.assertEqual(game.coursePage,1);
        test.assertTrue(display.getCourseWindowLayout().visibleRows.some(row=>row.index===12));
    });
    test.it('keeps live system/ship object references in the remembered course',()=>{
        const {game,home,ship}=fixture(),target=game.factory.createShip(100,0,'scout',home,true);
        game.issuePlayerWaypoint(ship,target);ship.course.swapMemory();ship.course.clear();target.x=300;ship.course.swapMemory();
        test.assertTrue(ship.destination===target);test.assertEqual(ship.destination.x,300);
    });
    test.it('resolves a removed remembered object to its last coordinates',()=>{
        const {game,home,ship}=fixture(),target=game.factory.createShip(100,0,'scout',home,true);
        game.issuePlayerWaypoint(ship,target);ship.course.swapMemory();ship.course.clear();target.x=300;game.entityRemoved(target);ship.course.swapMemory();
        test.assertEqual(ship.destination.x,300);test.assertFalse(ship.destination===target);
    });
    test.it('preserves the origin, departed index and loop flag during swap',()=>{
        const {game,ship}=fixture();order(game);ship.course.previous=0;ship.course.loop=true;ship.course.swapMemory();
        ship.course.clear();ship.course.swapMemory();test.assertTrue(ship.course.hasOrigin);test.assertTrue(ship.course.loop);
        test.assertEqual(ship.course.previous,0);test.assertEqual(ship.course.current,1);
    });
    test.it('retains the v3 Hunt flag in memory while Clear removes it from the active course',()=>{
        const {game,ship}=fixture();order(game);ship.course.hunt=true;ship.course.swapMemory();ship.course.clear();
        test.assertFalse(ship.course.hunt);test.assertTrue(ship.course.memory.hunt);ship.course.swapMemory();test.assertTrue(ship.course.hunt);
    });
    test.it('supports fleet memory and recalculates movement after restoring it',()=>{
        const {game,ship}=fixture(),fleet=game.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);fleet.totalSpeed=100;
        game.showCourse(fleet);order(game);game.executeUIAction({type:'swapCourseMemory'});fleet.setDestination({x:0,y:400});
        game.executeUIAction({type:'swapCourseMemory'});test.assertEqual(fleet.destination.x,100);test.assertEqual(fleet.moveDelta.x,100);test.assertEqual(fleet.moveDelta.y,0);
    });
    test.it('disables empty memory use and hides the control from read-only allies',()=>{
        const {game,ship,display}=fixture();test.assertFalse(ship.course.swapMemory());test.assertFalse(game.executeUIAction({type:'swapCourseMemory'}));
        test.assertFalse(display.getCourseActionRegions().some(r=>r.action.type==='swapCourseMemory'));
        order(game);ship.owner=2;game.config.omniscient=true;
        test.assertFalse(game.executeUIAction({type:'swapCourseMemory'}));test.assertFalse(display.getCourseActionRegions().some(r=>r.action.type==='swapCourseMemory'));
    });
    test.it('routes Memory <M> ahead of the command menu and invalidates old target edits on swap',()=>{
        const {game,ship}=fixture();order(game);game.handleCommandWindowKey(77,'m');test.assertTrue(ship.course.hasMemory);test.assertEqual(game.uiWindow,'course');
        game.courseSelection=1;game.beginCourseEdit(true);ship.course.clear();ship.course.swapMemory();
        game.findObjectAtPosition=()=>null;game.display.toGalacticX=x=>x;game.display.toGalacticY=y=>y;
        game.handleMouseClick(300,0);test.assertEqual(ship.destination.x,100);
    });
    test.it('uses translated controls in all six languages, fitting beside Loop and Escape',()=>{
        const {game,ship,display}=fixture();order(game);const original=pdg.res.getLanguage();
        try{for(const language of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(language);const region=display.getCourseActionRegions().find(r=>r.action.type==='swapCourseMemory');
            test.assertEqual(region.label,pdg.res.getString(740));test.assertEqual(region.key,'M');
            test.assertTrue(region.rect.x+region.rect.width<display.getCourseWindowLayout().rect.x+display.getCourseWindowLayout().rect.width-100);
            game.executeUIAction(region.action);test.assertTrue(ship.course.hasMemory);
        }}finally{pdg.res.setLanguage(original);}
    });
});};
