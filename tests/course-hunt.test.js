const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Display=require('../src/js/display.js');
function fixture(){
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const ship=game.factory.createShip(0,0,'battleship',home,true);ship.speed=100;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.setSelectedObject(ship);game.showCourse(ship);
    return {game,home,ship,display};
}
const hunt=game=>game.executeUIAction({type:'toggleCourseHunt'});
const order=(game,ship)=>game.issuePlayerWaypoint(ship,{x:300,y:0});
module.exports=function(){test.describe('V3 course Hunt control',()=>{
    test.it('enables and disables Hunt without altering course progress, loop or destination',()=>{
        const {game,ship}=fixture();order(game,ship);ship.course.loop=true;const revision=ship.course.revision;
        test.assertTrue(hunt(game));test.assertTrue(ship.course.hunt);test.assertEqual(ship.destination.x,300);
        test.assertEqual(ship.course.current,1);test.assertTrue(ship.course.loop);test.assertEqual(ship.course.revision,revision);
        test.assertTrue(hunt(game));test.assertFalse(ship.course.hunt);
    });
    test.it('requires a plotted course and nonzero movement speed',()=>{
        const {game,ship,display}=fixture();test.assertFalse(hunt(game));order(game,ship);ship.speed=0;
        test.assertFalse(hunt(game));test.assertFalse(display.getCourseActionRegions().some(r=>r.action.type==='toggleCourseHunt'));
        ship.speed=100;test.assertTrue(game.canToggleCourseHunt());
    });
    test.it('blocks enemy, allied read-only, unfinished, removed and fleet-member editing',()=>{
        const {game,home,ship}=fixture();order(game,ship);ship.owner=2;game.config.omniscient=true;test.assertFalse(hunt(game));
        ship.owner=1;ship.progress=20;test.assertFalse(hunt(game));ship.progress=100;
        const fleet=game.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);test.assertFalse(hunt(game));
        fleet.removeShip(ship);ship.star=home;game.entityRemoved(ship);test.assertFalse(hunt(game));
    });
    test.it('reserves H for Hunt and uses Home for home-system navigation',()=>{
        const {game,ship}=fixture();order(game,ship);let homeCalls=0;game.selectHomeStar=()=>homeCalls++;
        game.handleKeyPress(104);test.assertTrue(ship.course.hunt);test.assertEqual(homeCalls,0);test.assertEqual(game.uiWindow,'course');
        game.handleKeyPress(72);test.assertFalse(ship.course.hunt);test.assertEqual(homeCalls,0);
        game.uiWindow=null;game.handleKeyPress(104);test.assertTrue(ship.course.hunt);test.assertEqual(homeCalls,0);
        game.handleKeyPress(pdg.key_Home);test.assertEqual(homeCalls,1);
    });
    test.it('keeps Hunt in memory and clears it with the active course',()=>{
        const {game,ship}=fixture();order(game,ship);hunt(game);game.executeUIAction({type:'swapCourseMemory'});
        game.clearOrders(ship);test.assertFalse(ship.course.hunt);game.executeUIAction({type:'swapCourseMemory'});test.assertTrue(ship.course.hunt);
    });
    test.it('preserves Hunt across waypoint editing, insertion and looping',()=>{
        const {game,ship}=fixture();order(game,ship);hunt(game);ship.course.edit(1,{x:400,y:0});
        ship.course.insert({x:500,y:0});game.executeUIAction({type:'toggleCourseLoop'});test.assertTrue(ship.course.hunt);
    });
    test.it('clears Hunt when the last destination is deleted or the course finishes',()=>{
        const {game,ship}=fixture();order(game,ship);hunt(game);ship.course.delete(1);test.assertFalse(ship.course.hunt);
        order(game,ship);hunt(game);ship.speed=400;ship.move();test.assertFalse(ship.course.hunt);test.assertEqual(ship.destination,null);
    });
    test.it('supports eligible fleets and rejects empty or zero-speed fleets',()=>{
        const {game,ship}=fixture(),fleet=game.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);fleet.totalSpeed=100;
        game.showCourse(fleet);order(game,fleet);test.assertTrue(hunt(game));test.assertTrue(fleet.course.hunt);
        fleet.totalSpeed=0;test.assertFalse(hunt(game));fleet.totalSpeed=100;fleet.removeShip(ship);test.assertFalse(hunt(game));
    });
    test.it('retains v3 flag-only movement behavior instead of seeking unrelated targets',()=>{
        const {game,ship}=fixture();order(game,ship);hunt(game);ship.move();test.assertEqual(ship.x,100);
        test.assertEqual(ship.destination.x,300);test.assertTrue(ship.course.hunt);test.assertEqual(ship.course.current,1);
    });
    test.it('localizes mode controls and keeps them separated from one another and Escape',()=>{
        const {game,ship,display}=fixture();order(game,ship);const previous=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(lang);const regions=display.getCourseActionRegions();
            const modes=['toggleCourseLoop','swapCourseMemory','toggleCourseHunt'].map(type=>regions.find(r=>r.action.type===type));
            test.assertEqual(modes[2].label,pdg.res.getString(741));test.assertEqual(modes[2].key,'H');
            test.assertFalse(modes[2].active);hunt(game);test.assertTrue(display.getCourseActionRegions().find(r=>r.action.type==='toggleCourseHunt').active);hunt(game);
            for(let i=1;i<modes.length;i++)test.assertTrue(modes[i-1].rect.x+modes[i-1].rect.width<modes[i].rect.x);
            const rect=display.getCourseWindowLayout().rect;test.assertTrue(modes[2].rect.x+modes[2].rect.width<rect.x+rect.width-100);
        }}finally{pdg.res.setLanguage(previous);}
    });
});};
