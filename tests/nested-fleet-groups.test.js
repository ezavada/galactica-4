const test=require('./test-framework.js'),Common=require('../src/js/common.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;
    const star=game.factory.createStar(200000,200000,'Home');star.owner=1;star.techLevel=8;
    const root=game.factory.createFleet(star.x,star.y,1,'Root');
    const ships=['battleship','scout','colony'].map(type=>game.factory.createShip(star.x,star.y,type,star,true));
    ships.forEach(ship=>root.addShip(ship));game.setSelectedObject(root);
    display.camera.centerOn(star.x,star.y);display.updateMapRenderingCalculations();
    return {game,display,star,root,ships};
}
function click(game,rect) {return game.handleUIClick(rect.x+rect.width/2,rect.y+rect.height/2);}
module.exports=()=>test.describe('Nested fleet groups',()=>{
    test.it('creates an actual nested group through the row button and navigates back to its parent',()=>{
        const {game,display,root,ships}=fixture();const action=display.getFleetMemberActionRegions(root).find(r=>r.action.type==='createFleetGroup'&&r.action.member===ships[0]);
        test.assertTrue(click(game,action.rect));const group=game.selectedObject;
        test.assertTrue(group.fleet===root);test.assertTrue(ships[0].fleet===group);test.assertTrue(root.ships.includes(group));test.assertFalse(root.ships.includes(ships[0]));
        const back=display.getContextButtonRegions(group).find(r=>r.action.type==='selectFleetParent');test.assertTrue(click(game,back.rect));test.assertTrue(game.selectedObject===root);
        const row=display.getFleetMemberActionRegions(root).find(r=>r.action.type==='selectFleetMember'&&r.action.ship===group);test.assertTrue(click(game,row.rect));test.assertTrue(game.selectedObject===group);
    });
    test.it('preserves group identity and rejects self and ancestor containment before mutation',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);
        const nested=game.createFleetGroup(group,ships[0]);
        test.assertFalse(root.addShip(root));test.assertFalse(group.addShip(root));test.assertFalse(nested.addShip(root));
        test.assertTrue(group.fleet===root&&nested.fleet===group&&ships[0].fleet===nested);
        test.assertEqual(root.getLeafShips().length,3);test.assertEqual(new Set(root.getLeafShips()).size,3);
    });
    test.it('recurses through power damage slowest speed technology scanner and ship types without double counting',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);group.addShip(ships[1]);
        ships[0].damage=ships[0].power*35;root.calculateFleetStats();
        test.assertEqual(root.totalPower,ships.reduce((sum,s)=>sum+s.power,0));test.assertEqual(root.totalDamage,ships[0].damage);
        test.assertEqual(root.totalSpeed,Math.min(...ships.map(s=>s.speed)));test.assertEqual(root.techLevel,8);
        test.assertEqual(root.scannerRange,Math.max(...ships.map(s=>s.scannerRange)));
        test.assertTrue(root.hasShipType('scout'));test.assertTrue(root.getShipsOfType('scout')[0]===ships[1]);
        test.assertEqual(root.getSize(),2);test.assertEqual(group.getSize(),2);test.assertEqual(group.getDamagePercent(),35);
    });
    test.it('moves only the top container once and synchronizes every descendant and spatial position',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);group.addShip(ships[1]);
        const initial=root.x,speed=root.totalSpeed;root.setDestination({x:initial+1000000,y:root.y});game.moveAllShips();
        test.assertApproximately(root.x,initial+speed,.001);test.assertEqual(group.x,root.x);
        for(const ship of ships)test.assertEqual(ship.x,root.x);
        test.assertFalse(group.move());test.assertEqual(group.x,root.x);
        test.assertTrue(game.spatialPartition.getEntitiesInRange(root.x,root.y,1000).includes(group));
    });
    test.it('lets an ordered group depart its parent once with its own slowest speed',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]),initial=root.x;
        test.assertTrue(game.issuePlayerWaypoint(group,{x:initial+1000000,y:root.y}));game.moveAllShips();
        test.assertEqual(group.fleet,null);test.assertApproximately(group.x,initial+group.totalSpeed,.001);
        test.assertEqual(ships[0].x,group.x);test.assertEqual(root.x,initial);test.assertEqual(root.getLeafShips().length,2);
    });
    test.it('repairs nested ships at their docked system and counts only outer fleets in system defense',()=>{
        const {game,root,ships,star}=fixture();const group=game.createFleetGroup(root,ships[0]);
        ships[0].damage=50;root.calculateFleetStats();test.assertTrue(group.getDockedStar()===star);
        test.assertEqual(star.getDockedRepairables().length,1);test.assertTrue(star.getDockedRepairables()[0]===root);
        test.assertEqual(root.repairDamage(25),25);test.assertEqual(ships[0].damage,25);test.assertEqual(root.totalDamage,25);
        const defense=star.getDefenseBreakdown();test.assertEqual(defense.shipDefense,Math.max(1,root.totalPower)*100-25);
    });
    test.it('does not repair a group departing a docked parent or a child traveling with a departing root',()=>{
        const {game,root,ships,star}=fixture();const group=game.createFleetGroup(root,ships[0]);ships[0].damage=50;
        group.destination={x:root.x+1000000,y:root.y};test.assertEqual(root.repairDamage(25),0);test.assertEqual(ships[0].damage,50);
        group.destination=null;root.setDestination({x:root.x+1000000,y:root.y});
        test.assertEqual(star.getDockedRepairables().length,0);
    });
    test.it('traverses root leaf combatants even when a nested group or member is targeted and cleans empty ancestors',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);group.addShip(ships[1]);
        test.assertEqual(game.combatSystem.getCombatants(root).length,3);test.assertEqual(game.combatSystem.getCombatants(group).length,3);
        test.assertEqual(game.combatSystem.getCombatants(ships[0]).length,3);
        for(const ship of [...root.getLeafShips()])game.removeDestroyedShip(ship,2,false);
        game.combatSystem.cleanupEmptyFleets(2);test.assertFalse(game.allFleets.includes(group));test.assertFalse(game.allFleets.includes(root));
    });
    test.it('transfers and removes complete groups without flattening contents and rejects cycle destinations',()=>{
        const {game,root,ships,star}=fixture();const group=game.createFleetGroup(root,ships[0]);group.addShip(ships[1]);
        const other=game.factory.createFleet(root.x,root.y,1,'Other');other.addShip(game.factory.createShip(root.x,root.y,'scout',star,true));
        test.assertFalse(game.canTransferShipToFleet(root,root));test.assertFalse(game.canTransferShipToFleet(root,group));test.assertTrue(game.transferShipToFleet(group,other));
        test.assertTrue(group.fleet===other&&ships[0].fleet===group&&ships[1].fleet===group);test.assertEqual(group.getSize(),2);
        test.assertTrue(game.separateShipFromFleet(other,group));test.assertEqual(group.fleet,null);test.assertTrue(group.star===star);
        test.assertTrue(ships[0].fleet===group);test.assertTrue(game.allFleets.includes(group));
    });
    test.it('hides contained group map markers and respects per-group enemy name and health knowledge',()=>{
        const {game,display,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);
        test.assertNull(display.getMapMarker(group));test.assertNotNull(display.getMapMarker(root));
        group.owner=2;group.name='Private Group';group.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
        test.assertEqual(display.getShipDiagnostics(group).title,display.STR.ship);test.assertNull(display.getShipDiagnostics(group).healthRatio);
        group.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertEqual(display.getShipDiagnostics(group).title,'Private Group');
        test.assertTrue(display.getShipDiagnostics(group).healthRatio!==null);
    });
    test.it('cleans nested containers immediately when the last colony member is consumed',()=>{
        const {game,root,ships}=fixture();game.removeDestroyedShip(ships[0],1,false);game.removeDestroyedShip(ships[1],1,false);
        const group=game.createFleetGroup(root,ships[2]),planet=game.factory.createStar(root.x+100000,root.y,'Colony');
        test.assertTrue(game.colonizeStar(planet,ships[2]));test.assertEqual(planet.owner,1);
        test.assertFalse(game.allFleets.includes(group));test.assertFalse(game.allFleets.includes(root));
        test.assertFalse(game.allShips.includes(ships[2]));
    });
    test.it('finds a nested target group or member’s docked system for technology delivery',()=>{
        const {game,root,ships,star}=fixture();const group=game.createFleetGroup(root,ships[0]);
        test.assertTrue(game.getTechnologyTransferStar(group)===star);test.assertTrue(game.getTechnologyTransferStar(ships[0])===star);
        root.setDestination({x:root.x+1000000,y:root.y});test.assertEqual(game.getTechnologyTransferStar(group),null);
    });
    test.it('lets the containing fleet make AI decisions for nested groups as in v3',()=>{
        const {game,root,ships}=fixture();const group=game.createFleetGroup(root,ships[0]);
        const ShipAI=require('../src/js/ai-ship.js'),{AIActions}=require('../src/js/ai-base.js');
        const decision=new ShipAI(group,game,game.rules,1).makeDecision();test.assertEqual(decision.action,AIActions.DO_NOTHING);
        test.assertEqual(group.destination,null);test.assertTrue(group.fleet===root);
    });
    test.it('localizes group creation labels default names and parent navigation in every language',()=>{
        const {game,display,root,ships}=fixture(),language=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(lang);display.reloadUIStrings();game.setSelectedObject(root);
            const group=game.createFleetGroup(root,ships[0]);test.assertTrue(group.name.startsWith(pdg.res.getString(797).split('{0}')[0]));
            test.assertTrue(display.getContextActions(group).some(r=>r.label===pdg.res.getString(798)));
            const rect=display.getFleetDetailsLayout(group).rect;for(const row of display.getFleetMemberActionRegions(group))test.assertTrue(row.rect.x+row.rect.width<=rect.x+rect.width);
            group.removeShip(ships[0]);root.addShip(ships[0]);game.entityRemoved(group);
        }}finally{pdg.res.setLanguage(language);}
    });
});
