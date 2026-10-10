const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Display=require('../src/js/display.js');
const Common=require('../src/js/common.js');
function fixture(type='battleship') {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const ship=game.factory.createShip(0,0,type,home,true);ship.speed=100;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.setSelectedObject(ship);
    return {game,home,ship,display};
}
const point=(x,y=0)=>({x,y});
module.exports=function(){
 test.describe('V3 waypoint courses',()=>{
    test.it('retains the origin and appends player destinations without replacing earlier legs',()=>{
        const {game,home,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(200));
        test.assertEqual(ship.course.waypoints.length,3);test.assertTrue(ship.course.waypoints[0].target===home);
        test.assertEqual(ship.course.current,1);test.assertEqual(ship.destination.x,100);
    });
    test.it('keeps legacy AI destination assignment as a one-point replacement',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));ship.setDestination(point(200));
        test.assertEqual(ship.course.waypoints.length,1);test.assertEqual(ship.destination.x,200);test.assertEqual(ship.course.current,0);
    });
    test.it('synchronizes direct destination writes and clears the entire course on null',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));ship.destination=point(200);
        test.assertEqual(ship.course.waypoints.length,1);ship.destination=null;test.assertEqual(ship.course.waypoints.length,0);
    });
    test.it('advances only one leg per turn, retaining the docked waypoint until the next departure',()=>{
        const {game,ship}=fixture();const target=game.factory.createStar(50,0,'Stop');target.owner=1;
        game.issuePlayerWaypoint(ship,target);game.issuePlayerWaypoint(ship,point(100));ship.move();
        test.assertEqual(ship.x,50);test.assertTrue(ship.star===target);test.assertEqual(ship.destination.x,100);
        ship.move();test.assertEqual(ship.x,100);test.assertEqual(ship.star,null);test.assertEqual(ship.course.waypoints.length,0);
    });
    test.it('uses the strict v3 speed boundary without a five-unit arrival allowance',()=>{
        const {ship}=fixture();ship.setDestination(point(104));ship.move();test.assertEqual(ship.x,100);test.assertNotNull(ship.destination);
        ship.move();test.assertEqual(ship.x,104);test.assertEqual(ship.destination,null);
    });
    test.it('inserts before the selected row and preserves the v3 numeric active index',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(300));
        game.issuePlayerWaypoint(ship,point(200),1);test.assertEqual(ship.destination.x,200);test.assertEqual(ship.course.current,1);
        test.assertEqual(ship.course.waypoints[2].target.x,100);
    });
    test.it('edits an active waypoint without replacing the rest of the course',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(300));
        game.issuePlayerWaypoint(ship,point(200),1,true);test.assertEqual(ship.destination.x,200);test.assertEqual(ship.course.waypoints.length,3);
    });
    test.it('deletes an active waypoint and starts the next one at the same index',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(300));
        ship.course.delete(1);test.assertEqual(ship.destination.x,300);
    });
    test.it('clears the lone origin after deleting the only destination',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));ship.course.delete(1);
        test.assertEqual(ship.destination,null);test.assertEqual(ship.course.waypoints.length,0);
    });
    test.it('does not mutate the course on invalid waypoint indices or non-finite points',()=>{
        const {game,ship}=fixture();test.assertFalse(game.issuePlayerWaypoint(ship,point(100),99));test.assertEqual(ship.course.waypoints.length,0);
        test.assertFalse(ship.course.insert({x:NaN,y:0}));test.assertFalse(ship.course.delete(-1));test.assertFalse(ship.course.edit(0,point(100)));
    });
    test.it('turns self-targeting into a coordinate snapshot',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,ship);ship.x=90;
        test.assertEqual(ship.destination.x,0);test.assertFalse(ship.destination===ship);
    });
    test.it('loops through the whole circuit including the origin',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(50));game.issuePlayerWaypoint(ship,point(100));ship.course.loop=true;
        ship.move();ship.move();test.assertEqual(ship.x,100);test.assertEqual(ship.course.current,0);
        ship.move();test.assertEqual(ship.x,0);test.assertEqual(ship.course.current,1);
    });
    test.it('automatically loops a courier after its second appended destination',()=>{
        const {game,ship}=fixture('scout');game.issuePlayerWaypoint(ship,point(100));test.assertFalse(ship.course.loop);
        game.issuePlayerWaypoint(ship,point(200));test.assertTrue(ship.course.loop);
    });
    test.it('finishes a one-point legacy route even when loop was enabled',()=>{
        const {ship}=fixture();ship.setDestination(point(10));ship.course.loop=true;ship.move();test.assertEqual(ship.destination,null);
    });
    test.it('clears course and loop state while preserving patrol on the clear command',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));ship.course.loop=true;ship.setPatrol(true);
        game.clearOrders(ship);test.assertEqual(ship.course.waypoints.length,0);test.assertFalse(ship.course.loop);test.assertTrue(ship.isOnPatrol());
    });
    test.it('tracks a moving ship and freezes its last coordinates after it is removed',()=>{
        const {game,home,ship}=fixture();const target=game.factory.createShip(50,0,'scout',home,true);
        ship.setDestination(target);target.x=100;test.assertEqual(ship.destination.x,100);
        target.x=200;game.entityRemoved(target);test.assertEqual(ship.destination.x,200);test.assertFalse(ship.destination===target);
    });
    test.it('does not advance or revive a destroyed ship after arrival combat',()=>{
        const {game,ship}=fixture();const enemy=game.factory.createStar(50,0,'Enemy');enemy.owner=2;
        game.issuePlayerWaypoint(ship,enemy);game.issuePlayerWaypoint(ship,point(300));
        game.shouldResolveCombat=()=>true;game.resolveCombat=()=>{ship.damage=999999;game.entityRemoved(ship);};
        ship.move();test.assertFalse(game.allShips.includes(ship));test.assertEqual(ship.course.current,1);
    });
    test.it('discards a joining ship course when it enters a fleet',()=>{
        const {game,home,ship}=fixture();const fleet=game.factory.createFleet(50,0,1,'Guard');
        fleet.addShip(game.factory.createShip(50,0,'scout',home,true));fleet.star=null;
        game.issuePlayerWaypoint(ship,fleet);game.issuePlayerWaypoint(ship,point(300));ship.move();
        test.assertTrue(ship.fleet===fleet);test.assertEqual(ship.course.waypoints.length,0);
    });
    test.it('advances fleet courses one leg per turn and keeps member positions synchronized',()=>{
        const {game,ship}=fixture();const fleet=game.factory.createFleet(0,0,1,'Fleet');fleet.addShip(ship);fleet.totalSpeed=100;
        game.issuePlayerWaypoint(fleet,point(50));game.issuePlayerWaypoint(fleet,point(100));fleet.move();
        test.assertEqual(fleet.x,50);test.assertEqual(ship.x,50);test.assertEqual(fleet.destination.x,100);
        fleet.move();test.assertEqual(fleet.x,100);test.assertEqual(ship.x,100);test.assertEqual(fleet.destination,null);
    });
    test.it('recalculates fleet pursuit against moving targets every turn',()=>{
        const {game,home,ship}=fixture();const fleet=game.factory.createFleet(0,0,1,'Fleet');fleet.addShip(ship);fleet.totalSpeed=100;
        const target=game.factory.createShip(100,0,'scout',home,true);fleet.setDestination(target);target.x=300;
        fleet.move();test.assertEqual(fleet.x,100);test.assertTrue(fleet.destination===target);
    });
    test.it('reports active-row and leg/remaining turn distances using the v3 integer convention',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(300));game.showCourse(ship);
        const rows=game.getCourseRows();test.assertEqual(rows[0].turns,null);test.assertTrue(rows[1].current);
        test.assertEqual(rows[1].turns,2);test.assertEqual(rows[1].remaining,2);test.assertEqual(rows[2].turns,3);
    });
    test.it('opens, selects, edits and cancels the foreground editor without changing orders',()=>{
        const {game,ship}=fixture();game.issuePlayerWaypoint(ship,point(100));game.showCourse(ship);
        game.executeUIAction({type:'selectWaypoint',index:1});game.executeUIAction({type:'editWaypoint'});
        test.assertEqual(game.uiWindow,null);test.assertTrue(game.isAwaitingMapTarget());
        game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.uiWindow,'course');test.assertEqual(ship.destination.x,100);
    });
    test.it('allows targeting through the hidden inspector and consumes the picker hint',()=>{
        const {game,ship,display}=fixture();game.showCourse(ship);const panel=display.getSelectedObjectPanelRect(ship);
        game.beginCourseEdit();test.assertEqual(display.getSelectedObjectPanelRect(ship),null);
        test.assertEqual(display.getUIActionAt(panel.x+20,panel.y+100),null);
        test.assertEqual(display.getUIActionAt(100,95).type,'consume');
        game.handleKeyPress(pdg.key_Escape);test.assertNotNull(display.getSelectedObjectPanelRect(ship));
    });
    test.it('maps an edit click back to the original editor and rejects stale pending edits',()=>{
        const {game,ship,display}=fixture();game.issuePlayerWaypoint(ship,point(100));game.showCourse(ship);game.courseSelection=1;
        game.beginCourseEdit(true);display.toGalacticX=x=>x;display.toGalacticY=y=>y;game.findObjectAtPosition=()=>null;
        game.handleMouseClick(200,20);test.assertEqual(ship.destination.x,200);test.assertEqual(game.uiWindow,'course');
        game.beginCourseEdit(true);ship.setDestination(point(300));game.handleMouseClick(400,0);test.assertEqual(ship.destination.x,300);
    });
    test.it('pages large courses within the screen and routes controls before the map',()=>{
        const {game,ship,display}=fixture();for(let i=0;i<30;i++)game.issuePlayerWaypoint(ship,point(100+i));game.showCourse(ship);
        const layout=display.getCourseWindowLayout();test.assertTrue(layout.pages>1);test.assertTrue(layout.rect.y+layout.rect.height<=600);
        const row=display.getCourseActionRegions()[0];test.assertEqual(display.getUIActionAt(row.rect.x+5,row.rect.y+5).type,'selectWaypoint');
        game.coursePage=99;test.assertEqual(display.getCourseWindowLayout().page,layout.pages-1);
    });
    test.it('hides ordinary courses independently of selected-course and privacy rules',()=>{
        const {game,ship,display}=fixture();ship.setDestination(point(100));game.setSelectedObject(null);
        let lines=0;display.port.drawLine=()=>lines++;display.drawCourseLines(ship,0,0,{});test.assertTrue(lines>0);
        game.showAllCourses=false;lines=0;display.drawCourseLines(ship,0,0,{});test.assertEqual(lines,0);
        game.setSelectedObject(ship);display.drawCourseLines(ship,0,0,{});test.assertTrue(lines>0);
        ship.owner=2;lines=0;display.drawCourseLines(ship,0,0,{});test.assertEqual(lines,0);
    });
    test.it('controls looping couriers separately from ordinary routes and keeps selected courier routes visible',()=>{
        const {game,ship,display}=fixture('scout');game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(200));ship.course.loop=true;
        game.setSelectedObject(null);game.showAllCourses=false;
        let lines=0;display.port.drawLine=()=>lines++;display.drawCourseLines(ship,0,0,{});test.assertTrue(lines>0);
        game.showCourierCourses=false;lines=0;display.drawCourseLines(ship,0,0,{});test.assertEqual(lines,0);
        game.showAllCourses=true;display.drawCourseLines(ship,0,0,{});test.assertEqual(lines,0);
        game.setSelectedObject(ship);display.drawCourseLines(ship,0,0,{});test.assertTrue(lines>0);
    });
    test.it('shows ally/omniscient courses read-only and never reveals enemy route lines',()=>{
        const {game,ship,display}=fixture();ship.owner=2;ship.setDestination(point(100));test.assertFalse(game.canViewCourse(ship));
        const lines=[];display.port.drawLine=(a,b)=>lines.push([a,b]);display.drawCourseLines(ship,0,0,{});test.assertEqual(lines.length,0);
        game.config.omniscient=true;game.showCourse(ship);test.assertFalse(game.canEditCourse(ship));
        test.assertFalse(display.getCourseActionRegions().some(r=>r.action.type==='addWaypoint'));
        game.handleCommandWindowKey(69,'e');test.assertEqual(game.uiWindow,'course');
    });
    test.it('identifies ship/fleet waypoint types without exposing low-visibility enemy names',()=>{
        const {game,ship,display}=fixture();ship.name='Atlas';test.assertEqual(display.getCourseWaypointDescription(ship),'Ship Atlas');
        ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.NONE);test.assertEqual(display.getCourseWaypointDescription(ship),'Ship '+ship.id);
        ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertEqual(display.getCourseWaypointDescription(ship),'Ship Atlas');
        const fleet=game.factory.createFleet(100,0,1,'Guard');test.assertEqual(display.getCourseWaypointDescription(fleet),'Fleet Guard');
    });
    test.it('draws the complete remaining loop including waypoints after wrapping to the origin',()=>{
        const {game,ship,display}=fixture();game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,point(200));
        ship.course.current=2;ship.course.loop=true;display.toScreenX=x=>x;display.toScreenY=y=>y;
        const targets=[];display.port.drawLine=(from,to)=>targets.push(to.x);display.drawCourseLines(ship,150,0,{});
        test.assertEqual(targets.join(','),'200,0,100,200');
    });
    test.it('blocks editing satellites, unfinished ships, fleet members and removed entities',()=>{
        const {game,home,ship}=fixture('defense');test.assertFalse(game.canEditCourse(ship));
        const pending=game.factory.createShip(0,0,'scout',home);test.assertFalse(game.canEditCourse(pending));
        const completed=game.factory.createShip(0,0,'battleship',home,true);const fleet=game.factory.createFleet(0,0,1,'Fleet');fleet.addShip(completed);
        test.assertFalse(game.canEditCourse(completed));test.assertTrue(game.canEditCourse(fleet));game.entityRemoved(fleet);test.assertFalse(game.canEditCourse(fleet));
    });
    test.it('clears removed rendezvous references from future legs without losing other destinations',()=>{
        const {game,ship}=fixture();const rendezvous=game.createRendezvousAt(200,0,1,'Meet');
        game.issuePlayerWaypoint(ship,point(100));game.issuePlayerWaypoint(ship,rendezvous);game.issuePlayerWaypoint(ship,point(300));
        game.deleteRendezvous(rendezvous);test.assertEqual(ship.course.waypoints.length,3);test.assertEqual(ship.destination.x,100);
    });
    test.it('uses localized course controls in all six languages and consumes Tab in the editor',()=>{
        const {game,ship,display}=fixture();game.showCourse(ship);const language=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(lang);const button=display.getCourseActionRegions().find(r=>r.action.type==='addWaypoint');
            test.assertEqual(button.label,pdg.res.getString(729));test.assertTrue(game.handleCommandWindowKey(9,'\t'));test.assertEqual(game.turn,1);
        }}finally{pdg.res.setLanguage(language);}
    });
 });
};
