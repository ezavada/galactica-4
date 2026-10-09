const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
function fixture() {
    const game = new Game(new Factory(), new Rules(false), new GameConfig({ numHumans: 1, numComputers: 1, skipMapGeneration: true }));
    const star = game.factory.createStar(0, 0, 'Test'); star.owner = 1;
    game.setSelectedObject(star);
    return { game, star };
}
module.exports = function() {
    test.describe('Production locks', () => {
        test.it('preserves locked allocations while maintaining a total of 100', () => {
            const {game, star} = fixture(); game.toggleStarAllocationLock(star, 'growth');
            game.setStarAllocation(star, 'research', 60);
            test.assertEqual(star.growth.desired, 34);
            test.assertEqual(star.research.desired, 60);
            test.assertEqual(star.shipBuilding.desired, 6);
        });
        test.it('rejects a locked target and adjustments when no other allocation is unlocked', () => {
            const {game, star} = fixture();
            game.toggleStarAllocationLock(star, 'growth'); game.toggleStarAllocationLock(star, 'research');
            test.assertFalse(game.adjustStarAllocation(star, 'growth', 10));
            test.assertFalse(game.adjustStarAllocation(star, 'shipBuilding', 10));
            test.assertEqual(star.shipBuilding.desired, 33);
        });
        test.it('does not allow an enemy star lock to be changed', () => {
            const {game, star} = fixture(); star.owner = 2;
            test.assertFalse(game.toggleStarAllocationLock(star, 'growth'));
            test.assertFalse(star.growth.locked);
        });
        test.it('equalizes only unlocked allocations and leaves the remainder on the first unlocked slider', () => {
            const {game, star} = fixture();
            star.growth.desired = 45; star.growth.locked = true;
            game.resetSelectedStarAllocations();
            test.assertEqual(star.growth.desired, 45);
            test.assertEqual(star.shipBuilding.desired, 28);
            test.assertEqual(star.research.desired, 27);
        });
        test.it('does not equalize an entirely locked economy', () => {
            const {game, star} = fixture();
            game.getStarAllocationEntries(star).forEach(entry => entry.allocation.setLocked(true));
            test.assertFalse(game.resetSelectedStarAllocations());
            test.assertEqual(star.growth.desired, 34);
        });
        test.it('routes lock button clicks to the matching allocation', () => {
            const {game, star} = fixture();
            game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game);
            const region = display.getAllocationLockRegions()[0];
            const action = display.getUIActionAt(region.rect.x + 10, region.rect.y + 8);
            test.assertEqual(action.type, 'toggleAllocationLock'); game.executeUIAction(action);
            test.assertTrue(star.growth.locked);
        });
    });
};
