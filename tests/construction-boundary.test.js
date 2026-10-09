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
    test.describe('V3 construction completion boundary',()=>{
        test.it('retains a 100% hull at exactly its cost',()=>{
            const {game,star}=fixture();const pending=star.currentShip;
            game.rules.getStarShipBuildingAmount=()=>1;star.update();
            test.assertTrue(star.currentShip===pending);test.assertEqual(pending.progress,100);
            test.assertTrue(pending.underConstruction());test.assertEqual(star.paidTowardShipBuilding,1);
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,0);
        });
        test.it('completes only after the next positive payment and carries its excess',()=>{
            const {game,star}=fixture();const pending=star.currentShip;
            game.rules.getStarShipBuildingAmount=()=>1;star.update();
            game.rules.getStarShipBuildingAmount=()=>.125;star.update();
            test.assertFalse(pending.underConstruction());test.assertFalse(star.currentShip===pending);
            test.assertApproximately(star.paidTowardShipBuilding,.125,.000001);
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,1);
        });
        test.it('leaves the last exact-cost hull unfinished during multiple production',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>3;star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,2);
            test.assertTrue(star.currentShip.underConstruction());test.assertEqual(star.currentShip.progress,100);
            test.assertEqual(star.paidTowardShipBuilding,1);
        });
        test.it('does not complete banked over-cost credit while output is zero',()=>{
            const {game,star}=fixture();star.paidTowardShipBuilding=2;
            game.rules.getStarShipBuildingAmount=()=>0;const pending=star.currentShip;star.update();
            test.assertTrue(star.currentShip===pending);test.assertEqual(star.paidTowardShipBuilding,2);
            game.rules.getStarShipBuildingAmount=()=>.125;star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,2);
        });
        test.it('prevents movement of an exact-cost unfinished hull',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>1;star.update();
            const pending=star.currentShip;pending.destination={x:100,y:0};pending.move();
            test.assertEqual(pending.x,0);test.assertTrue(pending.star===star);
        });
        test.it('allows explicit commissioning to complete a hull at 100%',()=>{
            const {game,star}=fixture();game.rules.getStarShipBuildingAmount=()=>1;star.update();
            const pending=star.currentShip;pending.complete();test.assertFalse(pending.underConstruction());
        });
        test.it('keeps the existing fully built fixture convention for standalone ships',()=>{
            const {game,star}=fixture();const ship=game.factory.createShip(0,0,'scout',star);
            ship.progress=100;test.assertFalse(ship.underConstruction());
        });
        test.it('matches the ETA at an exact remaining-effort boundary',()=>{
            const {game,star}=fixture();star.shipBuilding.value=10;star.shipBuilding.setDesired(10);
            star.shipBuilding.setPerUnitBenefit(166.5);test.assertEqual(star.getEstimatedTurnsToNextShip(),2);
            star.update();test.assertTrue(star.currentShip.underConstruction());
            test.assertEqual(star.getEstimatedTurnsToNextShip(),1);star.update();
            test.assertEqual(game.allShips.filter(s=>!s.underConstruction()).length,1);
        });
    });
};
