const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js');
const GameConfig=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true,omniscient:false}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=4;home.population=1000;home.startBuildingShip('battleship');
    const enemy=game.factory.createStar(900000,0,'Enemy');enemy.owner=2;enemy.population=1000;
    const ship=game.factory.createShip(0,0,'battleship',home,true);home.shipArrived(ship);
    game.aiManager.processAITurns=()=>{};game.rules.getStarResearchAmount=()=>0;game.rules.getStarShipBuildingAmount=()=>0;game.rules.getStarPopulationGrowth=()=>0;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.overlay=null;game.overlayQueue=[];game.eventLog=[];
    return {game,home,enemy,ship,display};
}
function group(f) {const fleet=f.game.factory.createFleet(0,0,1,'Group');fleet.addShip(f.ship);const second=f.game.factory.createShip(0,0,'scout',f.home,true);f.home.shipArrived(second);fleet.addShip(second);return {fleet,second};}
module.exports=function(){test.describe('V3 ship and fleet scrapping',()=>{
    test.it('refunds a quarter of each actual hull cost using ship technology',()=>{
        const rules=new Rules(false);for(const type of ['scout','defense','colony','battleship'])for(const techLevel of [0,4,12]){
            const ship={type,techLevel};test.assertEqual(rules.getShipScrapValue(ship),rules.getShipBuildCost(ship)/4);
        }
    });
    test.it('marks and cancels without removing a ship or paying early',()=>{
        const {game,home,ship}=fixture();test.assertTrue(game.toggleScrap(ship));test.assertTrue(ship.isToBeScrapped());
        test.assertTrue(game.allShips.includes(ship));test.assertEqual(home.paidTowardShipBuilding,0);
        test.assertTrue(game.toggleScrap(ship));test.assertFalse(ship.isToBeScrapped());game.moveAllShips();test.assertTrue(game.allShips.includes(ship));
    });
    test.it('restricts independent ship and fleet scrap controls to the owner’s system',()=>{
        const f=fixture(),{game,ship,enemy}=f;test.assertTrue(game.canToggleScrap(ship));ship.star=null;test.assertFalse(game.canToggleScrap(ship));
        ship.star=enemy;test.assertFalse(game.canToggleScrap(ship));ship.owner=2;test.assertFalse(game.canToggleScrap(ship));
        test.assertFalse(game.canToggleScrap(f.home));test.assertFalse(game.canToggleScrap(null));
    });
    test.it('rejects untracked, dead and unfinished hulls',()=>{
        const {game,ship,home}=fixture();ship.progress=50;test.assertFalse(game.toggleScrap(ship));ship.progress=100;
        ship.damage=ship.getDefenseStrength()+1000;test.assertFalse(game.toggleScrap(ship));ship.damage=0;game.entityRemoved(ship);test.assertFalse(game.toggleScrap(ship));
        test.assertFalse(game.toggleScrap(home.currentShip));
    });
    test.it('handles attention when marking an independent ship',()=>{
        const {game,ship}=fixture();game.attention.request(ship);game.toggleScrap(ship);test.assertEqual(game.attention.pending().length,0);
        test.assertTrue(game.eventLog[0].handled);
    });
    test.it('scraps before movement without creating a combat destruction event',()=>{
        const {game,home,ship}=fixture();ship.destination={x:100000,y:0};const before=ship.x;game.toggleScrap(ship);game.moveAllShips();
        test.assertFalse(game.allShips.includes(ship));test.assertEqual(ship.x,before);test.assertEqual(home.paidTowardShipBuilding,0.75);
        test.assertFalse(home.ships.includes(ship));test.assertEqual(game.eventLog[0].type,'scrap');test.assertEqual(game.eventLog[0].recipient,1);
    });
    test.it('uses the ship’s technology rather than the receiving colony’s technology',()=>{
        const {game,home,ship}=fixture();ship.techLevel=6;home.techLevel=15;game.toggleScrap(ship);game.moveAllShips();test.assertEqual(home.paidTowardShipBuilding,1);
    });
    test.it('never refunds an already removed hull twice',()=>{
        const {game,home,ship}=fixture();game.toggleScrap(ship);game.moveAllShips();test.assertFalse(game.scrapShip(ship));game.moveAllShips();test.assertEqual(home.paidTowardShipBuilding,0.75);
    });
    test.it('propagates reversible fleet flags to every contained hull',()=>{
        const f=fixture(),{fleet,second}=group(f);test.assertTrue(f.game.toggleScrap(fleet));test.assertTrue(f.ship.isToBeScrapped());test.assertTrue(second.isToBeScrapped());
        f.game.toggleScrap(fleet);test.assertFalse(f.ship.isToBeScrapped());test.assertFalse(second.isToBeScrapped());
    });
    test.it('refunds each docked member once and removes an empty scrapped fleet',()=>{
        const f=fixture(),{fleet,second}=group(f);const amount=f.game.rules.getShipScrapValue(f.ship)+f.game.rules.getShipScrapValue(second);
        f.game.toggleScrap(fleet);f.game.moveAllShips();test.assertEqual(f.home.paidTowardShipBuilding,amount);
        test.assertEqual(f.game.allShips.length,0);test.assertFalse(f.game.allFleets.includes(fleet));test.assertEqual(fleet.ships.length,0);
    });
    test.it('clears selection, spatial entries and rendezvous links when a fleet is scrapped',()=>{
        const f=fixture(),{fleet}=group(f);const point=f.game.createRendezvousAt(0,0,1,'Meet');point.setFleet(fleet);f.game.setSelectedObject(fleet);
        f.game.toggleScrap(fleet);f.game.moveAllShips();test.assertNull(f.game.selectedObject);test.assertNull(point.getFleet());
        test.assertTrue(fleet._spatialLocation===undefined);test.assertTrue(f.ship._spatialLocation===undefined);
        const event=f.game.eventLog.find(e=>e.type==='scrap');test.assertNull(f.game.getEventFocus(event).object);test.assertEqual(f.game.getEventFocus(event).x,0);
    });
    test.it('processes scrap members before a pursued fleet departs its system',()=>{
        const f=fixture();const pursuer=f.game.factory.createShip(-1000000,0,'scout',f.home,true);f.game.allShips.splice(f.game.allShips.indexOf(pursuer),1);f.game.allShips.unshift(pursuer);
        const {fleet,second}=group(f);fleet.destination={x:2000000,y:0};pursuer.destination=fleet;f.game.toggleScrap(f.ship);const original=fleet.x;
        f.game.moveAllShips();test.assertFalse(f.game.allShips.includes(f.ship));test.assertEqual(f.home.paidTowardShipBuilding,0.75);
        test.assertTrue(f.game.allShips.includes(second));test.assertTrue(fleet.x>original);
    });
    test.it('allows a member of an owned fleet in space to scrap without a colony refund',()=>{
        const f=fixture(),{fleet}=group(f);fleet.star=null;test.assertTrue(f.game.canToggleScrap(f.ship));test.assertFalse(f.game.canToggleScrap(fleet));
        f.game.toggleScrap(f.ship);f.game.moveAllShips();test.assertEqual(f.home.paidTowardShipBuilding,0);test.assertFalse(f.game.allShips.includes(f.ship));
    });
    test.it('keeps a surviving fleet valid when one member cancels its scrap order',()=>{
        const f=fixture(),{fleet,second}=group(f);f.game.toggleScrap(fleet);f.game.toggleScrap(second);
        test.assertFalse(fleet.isToBeScrapped());test.assertTrue(f.ship.isToBeScrapped());f.game.moveAllShips();test.assertTrue(f.game.allFleets.includes(fleet));test.assertEqual(fleet.getSize(),1);
    });
    test.it('adding an unmarked ship cancels a fleet and its existing member orders',()=>{
        const f=fixture(),{fleet}=group(f);f.game.toggleScrap(fleet);const fresh=f.game.factory.createShip(0,0,'colony',f.home,true);f.home.shipArrived(fresh);fleet.addShip(fresh);
        test.assertFalse(fleet.isToBeScrapped());test.assertTrue(fleet.ships.every(s=>!s.isToBeScrapped()));
    });
    test.it('retains an incoming marked hull when inheriting an existing fleet Patrol',()=>{
        const f=fixture();const fleet=f.game.factory.createFleet(0,0,1,'Guard');fleet.setPatrol(true);f.game.toggleScrap(f.ship);fleet.addShip(f.ship);
        test.assertTrue(f.ship.isToBeScrapped());test.assertTrue(f.ship.isOnPatrol());
    });
    test.it('preserves a marked incoming ship when joining an unmarked fleet',()=>{
        const f=fixture();f.game.toggleScrap(f.ship);const fleet=f.game.factory.createFleet(0,0,1,'Group');fleet.addShip(f.ship);test.assertTrue(f.ship.isToBeScrapped());test.assertFalse(fleet.isToBeScrapped());
    });
    test.it('new waypoint orders cancel scrapping without losing course memory',()=>{
        const {game,ship}=fixture();ship.course.replace({x:100000,y:0});ship.course.swapMemory();game.toggleScrap(ship);
        game.issuePlayerWaypoint(ship,{x:200000,y:0});test.assertFalse(ship.isToBeScrapped());test.assertTrue(ship.course.hasMemory);
    });
    test.it('course memory cancels scrap and preserves the restored route',()=>{
        const {game,ship}=fixture();ship.course.replace({x:100000,y:0});ship.course.swapMemory();game.showCourse(ship);game.toggleScrap(ship);
        game.executeUIAction({type:'swapCourseMemory'});test.assertFalse(ship.isToBeScrapped());test.assertEqual(ship.destination.x,100000);
    });
    test.it('enabling Patrol cancels scrap on ships and all fleet members',()=>{
        const f=fixture();f.game.toggleScrap(f.ship);f.game.togglePatrol(f.ship);test.assertFalse(f.ship.isToBeScrapped());
        const {fleet}=group(f);f.game.toggleScrap(fleet);f.game.togglePatrol(fleet);test.assertTrue(fleet.ships.every(s=>!s.isToBeScrapped()));test.assertFalse(fleet.isToBeScrapped());
    });
    test.it('saved direct destination setters cancel scrap only for new orders',()=>{
        const {ship}=fixture();ship.setScrap(true);ship.setDestination(null);test.assertTrue(ship.isToBeScrapped());ship.setDestination({x:100000,y:0});test.assertFalse(ship.isToBeScrapped());
    });
    test.it('scraps satellites and removes their system defense references',()=>{
        const {game,home}=fixture();home.startBuildingShip('defense');const satellite=home.completeShip();test.assertTrue(home.defenseSatellites.includes(satellite));
        game.toggleScrap(satellite);game.moveAllShips();test.assertFalse(home.defenseSatellites.includes(satellite));test.assertFalse(game.allShips.includes(satellite));
    });
    test.it('retains scrap production while paused and applies it exactly once on resume',()=>{
        const {game,home,ship}=fixture();home.pauseShipBuilding();game.toggleScrap(ship);game.moveAllShips();test.assertEqual(home.unassignedShipCredit,0.75);
        home.startBuildingShip('colony');test.assertEqual(home.paidTowardShipBuilding,0.75);test.assertEqual(home.unassignedShipCredit,0);
        home.pauseShipBuilding();home.startBuildingShip('colony');test.assertEqual(home.paidTowardShipBuilding,0.75);
    });
    test.it('commissions at exactly 100% after applying the scrap refund during the turn',()=>{
        const {game,home,ship}=fixture();home.paidTowardShipBuilding=home.currentShip.cost-0.75;game.toggleScrap(ship);game.endTurn();
        test.assertFalse(game.allShips.includes(ship));test.assertEqual(game.allShips.length,1);test.assertFalse(game.allShips[0].underConstruction());test.assertEqual(home.paidTowardShipBuilding,0);
    });
    test.it('routes system-list scrap clicks ahead of row selection and leaves the list open',()=>{
        const {game,home,ship,display}=fixture();game.setSelectedObject(home);game.executeUIAction({type:'showSystemShips',star:home});const button=display.getSystemShipActionRegions().find(r=>r.action.type==='toggleScrap'&&r.action.object===ship);
        game.handleUIClick(button.rect.x+3,button.rect.y+3);test.assertTrue(ship.isToBeScrapped());test.assertEqual(game.uiWindow,'systemShips');test.assertTrue(game.selectedObject===home);
        game.handleUIClick(button.rect.x+3,button.rect.y+3);test.assertFalse(ship.isToBeScrapped());
    });
    test.it('uses localized marked status and scrap/cancel controls in all six languages',()=>{
        const {game,ship,display}=fixture();const original=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(language);ship.setScrap(false);let button=display.getContextActions(ship).find(a=>a.action.type==='toggleScrap');test.assertEqual(button.label,pdg.res.getString(754));
            ship.setScrap(true);button=display.getContextActions(ship).find(a=>a.action.type==='toggleScrap');test.assertEqual(button.label,pdg.res.getString(755));test.assertEqual(display.getShipDiagnostics(ship).status,pdg.res.getString(756));
        }}finally{pdg.res.setLanguage(original)}
    });
    test.it('keeps enemy scrap flags private even with detailed visibility',()=>{
        const {game,ship,display}=fixture();ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);ship.setScrap(true);
        test.assertTrue(display.getShipDiagnostics(ship).status!==pdg.res.getString(756));test.assertFalse(display.getContextActions(ship).some(a=>a.action.type==='toggleScrap'));
    });
});};
