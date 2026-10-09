const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
function fixture(population=1000000,growth=33.4) {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home');star.owner=1;star.population=population;star.techLevel=1;
    star.growth.value=growth;star.growth.setDesired(growth);
    game.rules.getStarResearchAmount=()=>0;
    return {game,star};
}
module.exports=function() {
    test.describe('V3 population growth',()=>{
        test.it('uses the damped low-population curve with the v3 allocation scale',()=>{
            const {game,star}=fixture(1000);
            test.assertApproximately(game.rules.getStarPopulationGrowth(star),1000*(10/(5.005*5.005+20))*.668,.000001);
            star.update();test.assertEqual(star.population,1148);
        });
        test.it('grows a one-billion-person system without the slider-only population cap',()=>{
            const {star}=fixture();star.update();test.assertEqual(star.population,1055666);
        });
        test.it('uses the upper curve above one billion people',()=>{
            const {game,star}=fixture(2000000);
            test.assertApproximately(game.rules.getStarPopulationGrowth(star),82195.3125,.000001);
            star.update();test.assertEqual(star.population,2082195);
        });
        test.it('uses the lower curve at exactly one billion people',()=>{
            const {game,star}=fixture();
            test.assertApproximately(game.rules.getStarPopulationGrowth(star),1000000*(10/120)*.668,.000001);
        });
        test.it('retains the v3 minimum increment at the upper growth equilibrium',()=>{
            const {game,star}=fixture(16000000);
            test.assertEqual(game.rules.getStarPopulationGrowth(star),1.5);
            star.update();test.assertEqual(star.population,16000001);
        });
        test.it('allows the original curve to reduce overpopulated systems',()=>{
            const {game,star}=fixture(17000000);
            const delta=17000000*(1/16-Math.pow(17/64,2))*.668+1.5;
            test.assertApproximately(game.rules.getStarPopulationGrowth(star),delta,.000001);
            star.update();test.assertEqual(star.population,Math.trunc(17000000+delta));
        });
        test.it('truncates the final population after negative growth',()=>{
            const {game,star}=fixture(1000);game.rules.getStarPopulationGrowth=()=>-1.5;
            star.update();test.assertEqual(star.population,998);
        });
        test.it('discards sub-unit growth each turn rather than accumulating fractions',()=>{
            const {game,star}=fixture(1000);game.rules.getStarPopulationGrowth=()=>2.75;
            star.update();star.update();test.assertEqual(star.population,1004);
        });
        test.it('does not apply the minimum increment when growth allocation is zero',()=>{
            const {star}=fixture(1000000,0);star.update();test.assertEqual(star.population,1000000);
        });
        test.it('can recover an owned empty system with a positive growth allocation',()=>{
            const {star}=fixture(0);star.update();test.assertEqual(star.population,1);
        });
    });
};
