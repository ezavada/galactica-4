const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home');star.owner=1;star.population=1000;star.techLevel=1;
    game.rules.getShipBuildCost=()=>999;game.refreshDockedScoutTechnologyAtStar=()=>{};
    star.startBuildingShip('scout');return {game,star};
}
module.exports=function() {
    test.describe('V3 economy turn order',()=>{
        test.it('uses pre-adjustment output and benefits for research and construction',()=>{
            const {game,star}=fixture();star.growth.setDesired(20);star.shipBuilding.setDesired(70);star.research.setDesired(10);
            let growthValue;game.rules.getStarPopulationGrowth=s=>{growthValue=s.growth.value;return 1;};
            star.update();
            test.assertApproximately(star.paidTowardResearch,199.8/.9,.000001);
            test.assertApproximately(star.paidTowardShipBuilding,199.8/1665,.000001);
            test.assertEqual(star.shipBuilding.value,39.3);test.assertEqual(star.research.value,10);
            test.assertEqual(growthValue,20);test.assertEqual(star.population,1001);
            test.assertApproximately(star.shipBuilding.benefit,6+120/166.5,.000001);
        });
        test.it('makes this turn’s growth improvement available to next turn’s production',()=>{
            const {game,star}=fixture();star.growth.setDesired(20);star.shipBuilding.setDesired(70);star.research.setDesired(10);
            game.rules.getStarPopulationGrowth=()=>1;star.update();const firstPaid=star.paidTowardShipBuilding;
            const nextEffort=39.3*(6+120/166.5)/1665;
            star.update();test.assertApproximately(star.paidTowardShipBuilding-firstPaid,nextEffort,.000001);
        });
        test.it('repairs before production, then adjusts allocations and grows before improving benefits',()=>{
            const {game,star}=fixture();const order=[];
            star.repairDockedShips=()=>order.push('repair');game.rules.getStarResearchAmount=()=>{order.push('research');return 0;};
            game.rules.getStarShipBuildingAmount=()=>{order.push('construction');return 0;};
            [star.shipBuilding,star.growth,star.research].forEach(a=>{const adjust=a.adjustValue.bind(a);a.adjustValue=()=>{order.push('adjust');return adjust();};});
            game.rules.getStarPopulationGrowth=()=>{order.push('growth');return 0;};
            const improve=star.shipBuilding.setPerUnitBenefit.bind(star.shipBuilding);
            star.shipBuilding.setPerUnitBenefit=value=>{order.push('benefit');improve(value);};
            star.update();test.assertEqual(order.slice(0,8).join(','),'repair,research,construction,adjust,adjust,adjust,growth,benefit');
        });
        test.it('does not process the economy or repairs of an unowned populated system',()=>{
            const {game,star}=fixture();star.owner=0;let calls=0;
            star.repairDockedShips=()=>calls++;game.rules.getStarResearchAmount=()=>{calls++;return 100;};
            game.rules.getStarPopulationGrowth=()=>{calls++;return 100;};
            star.update();test.assertEqual(calls,0);test.assertEqual(star.population,1000);
            test.assertEqual(star.paidTowardResearch,0);test.assertEqual(star.paidTowardShipBuilding,0);
        });
        test.it('keeps zero-growth systems stationary without increasing next-turn benefits',()=>{
            const {game,star}=fixture();star.growth.value=0;star.growth.setDesired(0);
            game.rules.getStarPopulationGrowth=()=>{throw new Error('Zero-growth system must not grow');};
            star.update();test.assertEqual(star.population,1000);
            test.assertEqual(star.shipBuilding.benefit,6);test.assertEqual(star.research.benefit,6);
        });
        test.it('processes owned systems with zero population as v3 does',()=>{
            const {star}=fixture();star.population=0;star.update();
            test.assertGreaterThan(star.paidTowardResearch,0);test.assertGreaterThan(star.population,0);
        });
        test.it('restores irradiated production benefits after production has used the old values',()=>{
            const {star}=fixture();star.growth.value=0;star.growth.setDesired(0);
            star.shipBuilding.setPerUnitBenefit(4);star.research.setPerUnitBenefit(5);star.update();
            test.assertApproximately(star.paidTowardShipBuilding,33.3*4/1665,.000001);
            test.assertEqual(star.shipBuilding.benefit,6);test.assertEqual(star.research.benefit,6);
        });
    });
};
