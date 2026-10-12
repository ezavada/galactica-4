const test=require('./test-framework.js'),Common=require('../src/js/common.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(s,size=11)=>Array.from(String(s)).length*size/2};
    const display=new Display(game);game.display=display;
    const home=game.factory.createStar(200000,200000,'Home');home.owner=1;home.techLevel=8;
    const ship=game.factory.createShip(home.x,home.y,'battleship',home,true);ship.name='Alpha';
    const second=game.factory.createShip(home.x,home.y,'scout',home,true);second.name='Bravo';
    display.camera.centerOn(home.x,home.y);display.updateMapRenderingCalculations();
    return {game,display,home,ship,second};
}
module.exports=()=>test.describe('Map selection and overlap chooser',()=>{
    test.it('notifies writeback only when selection changes and includes Escape deselection',()=>{
        const {game,home,ship}=fixture(),calls=[];
        game.networkCommands={selectionChanged:(previous,next)=>calls.push([previous,next])};
        game.setSelectedObject(home);game.setSelectedObject(home);game.setSelectedObject(ship);
        test.assertEqual(calls.length,2);test.assertTrue(calls[1][0]===home && calls[1][1]===ship);
        game.handleKeyPress(pdg.key_Escape);test.assertEqual(calls.length,3);test.assertTrue(calls[2][0]===ship);test.assertNull(calls[2][1]);
    });

    test.it('schedules a complete owned rendezvous without a previous selection and excludes foreign/local creation',()=>{
        const {game,home}=fixture(),created=[];game.networkCommands={created:object=>created.push(object)};
        game.createRendezvousAt(home.x+10,home.y+20,1,'Local');test.assertEqual(created.length,0);
        game.clientPlayerNum=1;const marker=game.createRendezvousAt(home.x+30,home.y+40,1,'New point');
        test.assertEqual(created.length,1);test.assertTrue(created[0]===marker && game.allRendezvous.includes(marker));test.assertNull(game.selectedObject);test.assertEqual(marker.name,'New point');
        game.createRendezvousAt(home.x,home.y,2,'Foreign');test.assertEqual(created.length,1);
    });
    test.it('uses the same scaled docking offset and extent as drawing at every visible zoom',()=>{
        const {game,display,ship,second}=fixture();game.entityRemoved(second);
        for(const zoom of [.2,.3,.5,1,4]) {
            display.camera.setZoom(zoom);display.camera.centerOn(ship.x,ship.y);display.updateMapRenderingCalculations();
            const marker=display.getMapMarker(ship);let triangle;
            display.port.drawPolygon=polygon=>triangle=polygon;display.port.drawCircle=()=>{};display.port.drawRect=()=>{};
            display.port.drawText=()=>{};display.drawMobileMapName=()=>{};display.drawCourseLines=()=>{};
            display.drawShip(ship);test.assertNotNull(triangle);
            test.assertTrue(game.findObjectsAtPosition(marker.x,marker.y).includes(ship));
            test.assertFalse(game.findObjectsAtPosition(marker.x+marker.radius+1,marker.y).includes(ship));
            test.assertApproximately(marker.x,display.toScreenX(ship.x)+display.scaledStarRadius*1.25,.001);
        }
    });
    test.it('excludes omitted small mobiles, satellites, dead ships, empty fleets and fleet members',()=>{
        const {game,display,home,ship,second}=fixture();ship.star=null;second.star=null;
        display.camera.setZoom(.19);test.assertNull(display.getMapMarker(ship));game.setSelectedObject(ship);test.assertNotNull(display.getMapMarker(ship));
        ship.owner=2;ship.setVisibilityTo(1,0);test.assertNull(display.getMapMarker(ship));ship.owner=1;
        display.camera.setZoom(1);const fleet=game.factory.createFleet(home.x,home.y,1,'Fleet');test.assertNull(display.getMapMarker(fleet));
        fleet.addShip(second);test.assertNull(display.getMapMarker(second));test.assertNotNull(display.getMapMarker(fleet));
        display.camera.setZoom(.14);test.assertNull(display.getMapMarker(fleet));game.setSelectedObject(fleet);test.assertNotNull(display.getMapMarker(fleet));
        display.camera.setZoom(1);ship.damage=ship.power*100000;test.assertNull(display.getMapMarker(ship));
        const satellite=game.factory.createShip(home.x,home.y,'defense',home,true);test.assertNull(display.getMapMarker(satellite));
    });
    test.it('uses fleet size and last-drawn marker order rather than a fixed fleet hit radius',()=>{
        const {game,display,home,ship,second}=fixture();const fleet=game.factory.createFleet(home.x,home.y,1,'Fleet');
        fleet.addShip(ship);fleet.addShip(second);for(let i=0;i<20;i++)fleet.addShip(game.factory.createShip(home.x,home.y,'scout',home,true));
        const marker=display.getMapMarker(fleet);test.assertTrue(marker.radius>10);
        test.assertTrue(game.findObjectAtPosition(marker.x+marker.radius-.5,marker.y)===fleet);
        test.assertTrue(game.findObjectAtPosition(marker.x,marker.y)===fleet);
    });
    test.it('chooses any stacked docked ship without losing the original selection before choosing',()=>{
        const {game,display,home,ship,second}=fixture();game.setSelectedObject(home);const point=display.getMapMarker(ship);
        game.handleMouseClick(point.x,point.y);test.assertEqual(game.uiWindow,'mapPick');test.assertTrue(game.selectedObject===home);
        test.assertTrue(game.getMapSelectionRows().includes(ship));test.assertTrue(game.getMapSelectionRows().includes(second));
        test.assertTrue(game.chooseMapSelection(ship));test.assertTrue(game.selectedObject===ship);test.assertEqual(game.mapSelectionPicker,null);
    });
    test.it('preserves pending default-destination order on cancel, then orders the chosen target only',()=>{
        const {game,display,home,ship,second}=fixture();const point=display.getMapMarker(ship);game.setSelectedObject(home);
        game.beginMapOrder(home);game.handleMouseClick(point.x,point.y);
        test.assertNotNull(game.mapSelectionPicker);test.assertTrue(game.pendingMapOrderObject===home);
        game.handleKeyPress(pdg.key_Escape);test.assertTrue(game.pendingMapOrderObject===home);test.assertEqual(home.getDefaultDestination(),null);
        game.handleMouseClick(point.x,point.y);game.chooseMapSelection(second);
        test.assertTrue(home.getDefaultDestination()===second);test.assertEqual(game.pendingMapOrderObject,null);
    });
    test.it('preserves waypoint edit and revision on cancel, then edits the explicit chosen target',()=>{
        const {game,display,ship,second}=fixture();game.issuePlayerWaypoint(ship,{x:700000,y:700000});
        game.showCourse(ship);game.courseSelection=1;test.assertTrue(game.beginCourseEdit(true));
        const edit=game.pendingCourseEdit,point=display.getMapMarker(second),revision=ship.course.revision;
        game.handleMouseClick(point.x,point.y);test.assertNotNull(game.mapSelectionPicker);game.cancelMapSelection();
        test.assertTrue(game.pendingCourseEdit===edit);test.assertEqual(ship.course.revision,revision);
        game.handleMouseClick(point.x,point.y);const row=display.getMapSelectionActions().find(r=>r.action.object===second);
        game.handleUIClick(row.rect.x+row.rect.width/2,row.rect.y+row.rect.height/2);
        test.assertTrue(ship.course.waypoints[1].target===second);test.assertEqual(game.pendingCourseEdit,null);
        test.assertEqual(game.uiWindow,'course');
    });
    test.it('routes right-click and rendezvous placement to the explicitly chosen overlap',()=>{
        const {game,display,home,ship,second}=fixture();const point=display.getMapMarker(ship);game.setSelectedObject(home);
        game.handleMouseRightClick(point.x,point.y);test.assertEqual(game.uiWindow,'mapPick');game.chooseMapSelection(ship);
        test.assertTrue(home.getDefaultDestination()===ship);
        game.beginRendezvousPlacement();game.handleMouseClick(point.x,point.y);game.chooseMapSelection(second);
        test.assertEqual(game.allRendezvous.length,1);test.assertTrue(game.allRendezvous[0].anchor===second);
    });
    test.it('uses right-click as the pending waypoint or rendezvous target instead of replacing the active command',()=>{
        const {game,display,ship,second}=fixture();game.issuePlayerWaypoint(ship,{x:700000,y:700000});
        game.showCourse(ship);game.courseSelection=1;game.beginCourseEdit(true);
        const point=display.getMapMarker(second);game.handleMouseRightClick(point.x,point.y);
        test.assertNotNull(game.mapSelectionPicker);test.assertNotNull(game.pendingCourseEdit);
        game.chooseMapSelection(second);test.assertTrue(ship.course.waypoints[1].target===second);test.assertEqual(game.pendingCourseEdit,null);
        game.beginRendezvousPlacement();game.handleMouseRightClick(point.x,point.y);game.chooseMapSelection(second);
        test.assertEqual(game.allRendezvous.length,1);test.assertTrue(game.allRendezvous[0].anchor===second);
    });
    test.it('rejects removed or newly hidden candidates and keeps invisible objects out of the chooser',()=>{
        const {game,display,ship,second}=fixture();ship.owner=2;ship.setVisibilityTo(1,0);
        const point=display.getMapMarker(second);test.assertFalse(game.findObjectsAtPosition(point.x,point.y,true).includes(ship));
        game.beginMapSelection(point.x,point.y,'select',true);game.entityRemoved(second);
        test.assertFalse(game.chooseMapSelection(second));test.assertFalse(game.getMapSelectionRows().includes(second));game.cancelMapSelection();
        ship.owner=1;game.beginMapSelection(point.x,point.y,'select',true);game.showShips=false;
        test.assertFalse(game.chooseMapSelection(ship));test.assertFalse(game.getMapSelectionRows().includes(ship));
    });
    test.it('conceals unknown mobile names and enemy rendezvous while keeping chart names',()=>{
        const {game,display,home,ship}=fixture();ship.owner=2;ship.name='Secret Enemy';ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
        test.assertFalse(display.getMapSelectionLabel(ship).includes('Secret'));ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
        test.assertTrue(display.getMapSelectionLabel(ship).includes('Secret'));
        const rendezvous=game.factory.createRendezvous(home.x,home.y,2,'Enemy Plan');test.assertNull(display.getMapMarker(rendezvous));
    });
    test.it('shows allied plotted-course and scrap hints without revealing enemy flags',()=>{
        const {game,display,ship,second}=fixture();game.issuePlayerWaypoint(ship,{x:700000,y:700000});ship.setScrap(true);
        const point=display.getMapMarker(second);game.beginMapSelection(point.x,point.y,'select');
        let row=display.getMapSelectionActions().find(r=>r.action.object===ship);
        test.assertTrue(row.bold);test.assertTrue(row.fullLabel.includes(pdg.res.getString(756)));
        ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
        row=display.getMapSelectionActions().find(r=>r.action.object===ship);
        test.assertFalse(row.bold);test.assertFalse(row.fullLabel.includes(pdg.res.getString(756)));
    });
    test.it('uses the active human viewer for unknown-name and marker visibility rules',()=>{
        const {game,display,ship}=fixture();ship.owner=2;ship.setVisibilityTo(1,0);ship.name='Second Player';
        test.assertNull(display.getMapMarker(ship));game.getCurrentHumanPlayer=()=>2;
        test.assertNotNull(display.getMapMarker(ship));test.assertTrue(display.getMapSelectionLabel(ship).includes('Second Player'));
    });
    test.it('supports paged numbered choices and consumes unrelated modal clicks Enter Tab and orders',()=>{
        const {game,display,home,ship}=fixture();for(let i=0;i<8;i++)game.factory.createShip(home.x,home.y,'scout',home,true);
        const point=display.getMapMarker(ship);game.handleMouseClick(point.x,point.y);const turn=game.turn;
        test.assertEqual(display.getMapSelectionActions().filter(r=>r.action.type==='chooseMapObject').length,6);
        game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'mapPick');
        game.handleUIClick(0,0);game.handleMouseRightClick(20,20);test.assertEqual(game.uiWindow,'mapPick');
        game.executeUIAction({type:'mapSelectionPage',page:1});const first=game.getMapSelectionRows()[6];game.handleKeyPress(49);
        test.assertTrue(game.selectedObject===first);test.assertEqual(game.mapSelectionPicker,null);
    });
    test.it('clears a chooser replaced by another window or a programmatic turn transition',()=>{
        const {game,display,ship}=fixture(),point=display.getMapMarker(ship);
        game.beginMapSelection(point.x,point.y,'select');game.openUIWindow('settings');
        test.assertEqual(game.mapSelectionPicker,null);test.assertEqual(game.uiWindow,'settings');
        game.beginMapSelection(point.x,point.y,'select');game.toggleUIWindow('settings');
        test.assertEqual(game.mapSelectionPicker,null);test.assertEqual(game.uiWindow,null);
        game.uiWindow='events';game.beginMapSelection(point.x,point.y,'select');
        test.assertTrue(game.closeEventWindowsForTurnAdvance());
        test.assertEqual(game.mapSelectionPicker,null);test.assertEqual(game.uiWindow,null);
    });
    test.it('localizes chooser heading and help and keeps paged controls inside the screen in all languages',()=>{
        const {game,display,ship}=fixture(),previous=pdg.res.getLanguage(),point=display.getMapMarker(ship);
        game.beginMapSelection(point.x,point.y,'select');
        try{for(const lang of ['en','de','es','fr','ja','ru']) {
            pdg.res.setLanguage(lang);test.assertTrue(pdg.res.getString(793).length>0);test.assertTrue(pdg.res.getString(794).length>0);
            const rect=display.getMapSelectionRect();test.assertTrue(rect.x>=10 && rect.x+rect.width<=790);
            for(const row of display.getMapSelectionActions())test.assertTrue(row.rect.y+row.rect.height<rect.y+rect.height);
        }}finally{pdg.res.setLanguage(previous);}
    });
});
