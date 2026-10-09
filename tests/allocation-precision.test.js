const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home');star.owner=1;game.setSelectedObject(star);return {game,star};
}
const total=star=>[star.growth,star.shipBuilding,star.research].reduce((sum,a)=>sum+Math.round(a.desired*10),0);
module.exports=function() {
    test.describe('V3 allocation precision',()=>{
        test.it('starts with the v3 334/333/333 split and 60-unit adjustment rates',()=>{
            const {star}=fixture();test.assertEqual(star.growth.value,33.4);
            test.assertEqual(star.shipBuilding.value,33.3);test.assertEqual(star.research.value,33.3);
            test.assertEqual(total(star),1000);test.assertEqual(star.growth.rate,6);
        });
        test.it('retains all three tenths when applying human colony defaults',()=>{
            const {game,star}=fixture();game.applyNewColonyDefaults(star,0);
            test.assertEqual(star.growth.desired,33.4);test.assertEqual(star.shipBuilding.desired,33.3);
            test.assertEqual(star.research.desired,33.3);test.assertEqual(total(star),1000);
        });
        test.it('shares changes across unlocked neighbors in integer v3 units',()=>{
            const {game,star}=fixture();game.setStarAllocation(star,'growth',65.5);
            test.assertEqual(star.growth.desired,65.5);test.assertEqual(star.shipBuilding.desired,17.2);
            test.assertEqual(star.research.desired,17.3);test.assertEqual(total(star),1000);
        });
        test.it('keeps the exact unit budget through repeated fractional and endpoint edits',()=>{
            const {game,star}=fixture();const keys=['growth','shipBuilding','research'];
            [0,100,99.9,.1,33.3,65.5,12.7,49.4,1.2].forEach((value,index)=>{
                game.setStarAllocation(star,keys[index%3],value);test.assertEqual(total(star),1000);
                keys.forEach(key=>test.assertInRange(star[key].desired,0,100));
            });
        });
        test.it('equalizes a fractional remaining budget with the remainder on the first unlocked allocation',()=>{
            const {game,star}=fixture();star.growth.desired=45.1;star.growth.locked=true;
            game.resetSelectedStarAllocations();test.assertEqual(star.growth.desired,45.1);
            test.assertEqual(star.shipBuilding.desired,27.5);test.assertEqual(star.research.desired,27.4);
            test.assertEqual(total(star),1000);
        });
        test.it('adjusts current output by six percentage points upward and twenty-four downward',()=>{
            const {star}=fixture();star.growth.setDesired(90);star.growth.adjustValue();
            test.assertEqual(star.growth.value,39.4);star.growth.adjustValue();test.assertEqual(star.growth.value,45.4);
            star.growth.setDesired(0);star.growth.adjustValue();test.assertEqual(star.growth.value,21.4);
            star.growth.adjustValue();test.assertEqual(star.growth.value,0);
        });
        test.it('clamps adjustment to a fractional target without overshooting',()=>{
            const {star}=fixture();star.growth.setDesired(34.1);star.growth.adjustValue();
            test.assertEqual(star.growth.value,34.1);test.assertFalse(star.growth.adjustValue());
            star.growth.setDesired(34);star.growth.adjustValue();test.assertEqual(star.growth.value,34);
        });
        test.it('rejects non-finite edits without corrupting the allocation budget',()=>{
            const {game,star}=fixture();test.assertFalse(game.adjustStarAllocation(star,'growth',NaN));
            game.setAllocationDesired(star.growth,NaN);star.growth.setDesired(Infinity);
            test.assertEqual(star.growth.desired,33.4);test.assertEqual(total(star),1000);
        });
        test.it('preserves fractional projected benefits and production effort',()=>{
            const {game,star}=fixture();star.shipBuilding.setDesired(49.4);
            test.assertApproximately(star.shipBuilding.getProjectedBenefit(),296.4,.000001);
            test.assertApproximately(game.rules.getStarShipBuildingAmount(star),199.8/1665,.000001);
        });
    });
};
