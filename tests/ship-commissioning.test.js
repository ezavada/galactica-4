const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Ship=require('../src/js/ship.js');
const Common=require('../src/js/common.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home');star.owner=1;star.population=1000;star.techLevel=4;
    star.growth.value=0;star.growth.setDesired(0);game.rules.getStarResearchAmount=()=>0;
    return {game,star};
}
module.exports=function() {
    test.describe('V3 system construction and ship commissioning',()=>{
        test.it('starts homeworlds with 99% system construction and no ships or ship IDs',()=>{
            const nextId=Ship.nextId;
            const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1}));
            test.assertEqual(game.allShips.length,0);test.assertEqual(Ship.nextId,nextId);
            game.stars.filter(s=>s.owner>0).forEach(star=>{
                test.assertEqual(star.currentShip.progress,99);test.assertEqual(star.currentShip.type,'colony');
                test.assertEqual(star.ships.length,0);test.assertFalse(game.factory.isShip(star.currentShip));
            });
        });
        test.it('suppresses repeated satellite order requests while retaining first-class commissioning reports',()=>{
            const {game,star}=fixture();star.startBuildingShip('defense');star.paidTowardShipBuilding=star.currentShip.cost;star.commissionPaidHulls();
            while(game.overlay)game.handleKeyPress(13);
            star.paidTowardShipBuilding=star.currentShip.cost;star.commissionPaidHulls();
            test.assertEqual(star.defenseSatellites.length,2);test.assertEqual(game.attention.pending().length,0);
            test.assertEqual(game.eventLog.filter(e=>e.commissioning && e.recipient===1).length,1);
            test.assertFalse(game.eventLog.some(e=>e.type===Common.EventType.SHIP_BUILT));
        });
        test.it('does not request orders for automatic deliveries even when their first movement reaches the destination',()=>{
            for(const distance of [1,1000000]) {
                const {game,star}=fixture();const destination={x:distance,y:0};star.setDefaultDestination(destination);star.startBuildingShip('scout');
                star.paidTowardShipBuilding=star.currentShip.cost;star.commissionPaidHulls();
                test.assertEqual(game.allShips.length,1);test.assertTrue(game.eventLog.some(e=>e.commissioning));
                test.assertFalse(game.eventLog.some(e=>e.type===Common.EventType.SHIP_BUILT));
                while(game.overlay)game.handleKeyPress(13);test.assertEqual(game.attention.pending().length,0);
                if(distance===1000000)test.assertNotNull(game.allShips[0].destination);
            }
        });
        test.it('still requests orders for a completed mobile ship without an automatic destination',()=>{
            const {game,star}=fixture();star.startBuildingShip('scout');star.paidTowardShipBuilding=star.currentShip.cost;star.commissionPaidHulls();
            const ship=game.allShips[0];test.assertTrue(game.eventLog.some(e=>e.type===Common.EventType.SHIP_BUILT && e.subject===ship));
            while(game.overlay)game.handleKeyPress(13);test.assertEqual(game.attention.pending().length,1);
            test.assertTrue(game.attention.next());test.assertTrue(game.selectedObject===ship);
        });
        test.it('keeps construction out of ship counts, ship identity and docked fleets',()=>{
            const {game,star}=fixture();const nextId=Ship.nextId;star.startBuildingShip('battleship');
            test.assertEqual(game.allShips.length,0);test.assertEqual(star.ships.length,0);
            test.assertFalse(game.factory.isShip(star.currentShip));test.assertEqual(Ship.nextId,nextId);
            game.updatePlayerPieceCounts();test.assertEqual(game.players[1].numPiecesRemaining,1);
        });
        test.it('does not change defense strength when queuing a satellite',()=>{
            const {star}=fixture();const before=star.getTotalDefenseStrength();star.startBuildingShip('defense');
            test.assertEqual(star.getTotalDefenseStrength(),before);test.assertEqual(star.defenseSatellites.length,0);
        });
        test.it('keeps the selected hull price when system technology increases',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');test.assertEqual(star.currentShip.cost,3);
            star.techLevel=8;game.rules.getStarShipBuildingAmount=()=>3.125;star.update();
            test.assertEqual(game.allShips.length,1);test.assertEqual(game.allShips[0].techLevel,8);
            test.assertEqual(star.currentShip.cost,5);test.assertApproximately(star.paidTowardShipBuilding,.125,.000001);
        });
        test.it('commissions with technology gained from research earlier in the same turn',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.paidTowardResearch=990;
            game.rules.getStarResearchAmount=()=>20;game.rules.getStarShipBuildingAmount=()=>3.125;star.update();
            const ship=game.allShips[0];test.assertEqual(star.techLevel,5);test.assertEqual(ship.techLevel,5);
            test.assertEqual(ship.speed,20000);test.assertEqual(ship.power,ship.calculatePower());
            test.assertEqual(ship.scannerRange,game.rules.getShipScanRange(ship));
            test.assertEqual(ship.classIndex,2);test.assertFalse(ship.underConstruction());
        });
        test.it('reprices through technology transfer and uses received tech at commissioning',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');
            test.assertTrue(game.applyTechnologyTransferToStar({owner:1,techLevel:8,type:'battleship'},star));
            test.assertEqual(star.currentShip.cost,5);const ship=star.completeShip();
            test.assertEqual(ship.techLevel,8);test.assertEqual(ship.speed,23000);
        });
        test.it('reprices every hull while retaining fractional paid and banked credits without commissioning',()=>{
            for(const type of ['scout','colony','defense','battleship']) {
                const {game,star}=fixture();star.startBuildingShip(type);star.paidTowardShipBuilding=.125;star.buildCredits[type]=.125;star.buildCredits.colony=1.75;
                const pending=star.currentShip,events=game.eventLog.length;
                game.applyTechnologyTransferToStar({owner:1,type:'scout',techLevel:8},star);
                test.assertTrue(star.currentShip===pending);test.assertEqual(pending.type,type);test.assertEqual(pending.techLevel,8);test.assertEqual(pending.cost,game.rules.getShipBuildCost(pending,star));test.assertApproximately(pending.progress,.125/pending.cost*100,.000001);test.assertEqual(star.paidTowardShipBuilding,.125);test.assertEqual(star.buildCredits.colony,1.75);test.assertEqual(game.allShips.length,0);test.assertEqual(game.eventLog.length,events);
            }
        });
        test.it('refreshes research-stale prices on allied arrival even if no technology changes',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.techLevel=8;star.paidTowardShipBuilding=1;
            test.assertFalse(game.applyTechnologyTransferToStar({owner:1,type:'battleship',techLevel:8},star));
            test.assertEqual(star.currentShip.cost,5);test.assertEqual(star.currentShip.progress,20);
        });
        test.it('does not touch enemy production or restart a paused hull',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.paidTowardShipBuilding=1;
            test.assertFalse(game.applyTechnologyTransferToStar({owner:2,type:'scout',techLevel:8},star));test.assertEqual(star.currentShip.cost,3);
            star.pauseShipBuilding();game.applyTechnologyTransferToStar({owner:1,type:'scout',techLevel:8},star);test.assertNull(star.currentShip);test.assertEqual(star.buildCredits.battleship,1);
        });
        test.it('refreshes price and inspector progress through an actual standalone arrival',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.paidTowardShipBuilding=1;
            const origin=game.factory.createStar(-100,0,'Origin');origin.owner=1;origin.techLevel=8;
            const scout=game.factory.createShip(origin.x,origin.y,'scout',origin,true);origin.shipArrived(scout);scout.setDestination(star);scout.move();
            test.assertEqual(star.techLevel,8);test.assertEqual(star.currentShip.cost,5);test.assertEqual(star.currentShip.progress,20);test.assertTrue(scout.star===star);test.assertEqual(star.paidTowardShipBuilding,1);
        });
        test.it('retains refreshed hull price, progress and banked credit through a local save',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.paidTowardShipBuilding=1.25;
            game.applyTechnologyTransferToStar({owner:1,type:'scout',techLevel:8},star);
            delete game.rules.getStarResearchAmount;
            const loaded=require('../src/js/game-save.js').restore(require('../src/js/game-save.js').serialize(game));
            test.assertEqual(loaded.stars[0].currentShip.cost,5);test.assertEqual(loaded.stars[0].currentShip.progress,25);test.assertEqual(loaded.stars[0].paidTowardShipBuilding,1.25);
        });
        test.it('commissions for the current owner after system ownership changes',()=>{
            const {game,star}=fixture();star.startBuildingShip('scout');star.owner=2;
            const ship=star.completeShip();test.assertEqual(ship.owner,2);test.assertTrue(game.allShips.includes(ship));
            test.assertTrue(star.ships.includes(ship));test.assertFalse(ship.underConstruction());
        });
        test.it('preserves banked effort and reprices a resumed hull at current technology',()=>{
            const {star}=fixture();star.startBuildingShip('battleship');star.paidTowardShipBuilding=2;
            star.pauseShipBuilding();star.techLevel=8;star.startBuildingShip('battleship');
            test.assertEqual(star.currentShip.cost,5);test.assertEqual(star.currentShip.progress,40);
            test.assertEqual(star.paidTowardShipBuilding,2);
        });
        test.it('uses the refreshed price for ETA after technology transfer',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');
            game.applyTechnologyTransferToStar({owner:1,type:'scout',techLevel:8},star);
            star.shipBuilding.setDesired(10);star.shipBuilding.setPerUnitBenefit(166.5);
            star.paidTowardShipBuilding=1;test.assertEqual(star.getEstimatedTurnsToNextShip(),4);
        });
    });
};
