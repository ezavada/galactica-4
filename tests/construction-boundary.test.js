const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home');star.owner=1;star.population=1000;star.techLevel=1;
    game.rules.getShipBuildCost=()=>1;game.rules.getStarResearchAmount=()=>0;
    star.growth.value=0;star.growth.setDesired(0);star.startBuildingShip('scout');
    return {game,star};
}
module.exports=function() {
    test.describe('Fully funded construction completion',()=>{
        test.it('commissions a hull as soon as its exact cost is paid',()=>{
            const {game,star}=fixture();const pending=star.currentShip;
            game.rules.getStarShipBuildingAmount=()=>1;star.update();
            test.assertFalse(star.currentShip===pending);test.assertEqual(game.allShips[0].progress,100);
            test.assertFalse(game.allShips.includes(pending));test.assertEqual(star.paidTowardShipBuilding,0);
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,1);
        });
        test.it('applies subsequent payments to the next hull',()=>{
            const {game,star}=fixture();const pending=star.currentShip;
            game.rules.getStarShipBuildingAmount=()=>1;star.update();
            game.rules.getStarShipBuildingAmount=()=>.125;star.update();
            test.assertEqual(game.allShips[0].progress,100);test.assertFalse(star.currentShip===pending);
            test.assertApproximately(star.paidTowardShipBuilding,.125,.000001);
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,1);
        });
        test.it('completes every fully funded hull during multiple production',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>3;star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,3);
            test.assertFalse(game.allShips.includes(star.currentShip));test.assertEqual(star.currentShip.progress,0);
            test.assertEqual(star.paidTowardShipBuilding,0);
        });
        test.it('completes banked credit without another positive payment',()=>{
            const {game,star}=fixture();star.paidTowardShipBuilding=2;
            game.rules.getStarShipBuildingAmount=()=>0;const pending=star.currentShip;star.update();
            test.assertFalse(star.currentShip===pending);test.assertEqual(star.paidTowardShipBuilding,0);
            test.assertEqual(game.allShips.length,2);
            game.rules.getStarShipBuildingAmount=()=>.125;star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,2);
        });
        test.it('keeps only the next unfinished hull outside movement entities',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>1;star.update();
            test.assertEqual(game.allShips.length,1);test.assertEqual(star.ships.length,1);
            test.assertFalse(game.factory.isShip(star.currentShip));
        });
        test.it('allows explicit commissioning to create a completed ship at 100%',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>.5;star.update();
            const ship=star.completeShip();test.assertFalse(ship.underConstruction());
            test.assertTrue(game.allShips.includes(ship));test.assertNull(star.currentShip);
        });
        test.it('keeps the existing fully built fixture convention for standalone ships',()=>{
            const {game,star}=fixture();const ship=game.factory.createShip(0,0,'scout',star);
            ship.progress=100;test.assertFalse(ship.underConstruction());
        });
        test.it('matches the ETA at an exact remaining-effort boundary',()=>{
            const {game,star}=fixture();star.shipBuilding.value=10;star.shipBuilding.setDesired(10);
            star.shipBuilding.setPerUnitBenefit(166.5);test.assertEqual(star.getEstimatedTurnsToNextShip(),1);
            star.update();test.assertFalse(game.allShips.includes(star.currentShip));
            test.assertEqual(star.getEstimatedTurnsToNextShip(),1);star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,2);
        });
        test.it('commissions saved fully paid hulls immediately when selected',()=>{
            const {game,star}=fixture();star.pauseShipBuilding();star.buildCredits.scout=1;
            game.rules.getStarShipBuildingAmount=()=>0;star.startBuildingShip('scout');
            test.assertEqual(game.allShips.length,1);test.assertEqual(star.currentShip.progress,0);
            test.assertEqual(star.paidTowardShipBuilding,0);star.update();test.assertEqual(game.allShips.length,1);
        });
        test.it('keeps below-cost hulls unfinished and fully funded ETA at zero',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>.999;star.update();
            test.assertEqual(game.allShips.length,0);test.assertTrue(star.currentShip.progress<100);
            star.paidTowardShipBuilding=1;star.shipBuilding.setDesired(0);
            test.assertEqual(star.getEstimatedTurnsToNextShip(),0);
            game.rules.getStarShipBuildingAmount=()=>0;star.update();test.assertEqual(game.allShips.length,1);
        });
    });
};
