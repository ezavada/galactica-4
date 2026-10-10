const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Ship=require('../src/js/ship.js');
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
        test.it('keeps the price through technology transfer and uses received tech at commissioning',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');
            test.assertTrue(game.applyTechnologyTransferToStar({owner:1,techLevel:8,type:'battleship'},star));
            test.assertEqual(star.currentShip.cost,3);const ship=star.completeShip();
            test.assertEqual(ship.techLevel,8);test.assertEqual(ship.speed,23000);
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
        test.it('uses the cached price for ETA even after technology transfer',()=>{
            const {star}=fixture();star.startBuildingShip('battleship');star.techLevel=8;
            star.shipBuilding.setDesired(10);star.shipBuilding.setPerUnitBenefit(166.5);
            star.paidTowardShipBuilding=1;test.assertEqual(star.getEstimatedTurnsToNextShip(),2);
        });
    });
};
