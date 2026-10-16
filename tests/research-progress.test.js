const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Common = require('../src/js/common.js');
function fixture(fast = false) {
    const game = new Game(new Factory(), new Rules(fast), new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star = game.factory.createStar(0,0,'Home');
    star.owner=1; star.population=1000; star.techLevel=1;
    star.growth.value=0; star.growth.setDesired(0);
    const events=[]; game.noteworthyEvent=(who,type)=>events.push(type);
    return {game,star,events};
}
module.exports = function() {
    test.describe('V3 research payments and advancement',()=>{
        test.it('pays exactly 222 credits for the initial 333-unit research allocation',()=>{
            const {game,star}=fixture(); test.assertEqual(game.rules.getStarResearchAmount(star),222);
            star.update(); test.assertEqual(star.paidTowardResearch,222);
        });
        test.it('discards fractional credit each turn instead of carrying it forward',()=>{
            const {star}=fixture(); star.techLevel=4; star.research.value=10; star.research.setDesired(10);
            star.update(); star.update(); test.assertEqual(star.paidTowardResearch,32);
        });
        test.it('uses the same integer payment in normal and fast games',()=>{
            const normal=fixture(),fast=fixture(true);
            test.assertEqual(normal.game.rules.getStarResearchAmount(normal.star),fast.game.rules.getStarResearchAmount(fast.star));
        });
        [false,true].forEach(fast=>{
            const threshold=fast?750:1000;
            test.it('requires credit strictly above '+threshold+' in '+(fast?'fast':'normal')+' games',()=>{
                const {game,star}=fixture(fast); game.rules.getStarResearchAmount=()=>20;
                star.paidTowardResearch=threshold-20; star.update();
                test.assertEqual(star.techLevel,1); test.assertEqual(star.paidTowardResearch,threshold);
                game.rules.getStarResearchAmount=()=>1; star.update();
                test.assertEqual(star.techLevel,2); test.assertEqual(star.paidTowardResearch,1);
            });
        });
        test.it('advances only one level per turn and retains all excess credit',()=>{
            const {game,star}=fixture(); game.rules.getStarResearchAmount=()=>3200;
            star.update(); test.assertEqual(star.techLevel,2); test.assertEqual(star.paidTowardResearch,2200);
        });
        [1,-1].forEach(advantage=>{
            test.it('truncates the '+advantage+' computer bonus separately from the base payment',()=>{
                const {game,star}=fixture(); star.owner=2; game.players[2].compAdvantage=advantage;
                game.rules.getStarResearchAmount=()=>222.9; star.update();
                test.assertEqual(star.paidTowardResearch,advantage>0?266:178);
            });
        });
        test.it('announces a newly reached drive class once for the player',()=>{
            const {game,star,events}=fixture(); star.techLevel=4; game.rules.getStarResearchAmount=()=>20;
            star.paidTowardResearch=990; star.update();
            test.assertEqual(game.players[1].hiStarTech,5);
            test.assertEqual(events.filter(e=>e===Common.EventType.NEW_TECH_DISCOVERY).length,1);
            star.techLevel=4; star.paidTowardResearch=990; star.update();
            test.assertEqual(events.filter(e=>e===Common.EventType.NEW_TECH_DISCOVERY).length,1);
        });
        test.it('announces ordinary tech advancement without a drive-class discovery',()=>{
            const {game,star,events}=fixture(); game.rules.getStarResearchAmount=()=>20; star.paidTowardResearch=990;
            star.update(); test.assertEqual(events.filter(e=>e===Common.EventType.TECH_LEVEL_UP).length,1);
            test.assertEqual(events.filter(e=>e===Common.EventType.NEW_TECH_DISCOVERY).length,0);
        });
    });
};
