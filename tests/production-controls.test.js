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
    test.describe('Continuous ship production', () => {
        test.it('builds every affordable hull in a turn and carries the remaining effort forward', () => {
            const {game, star} = fixture(); star.population = 1000; star.techLevel = 1;
            game.rules.getStarShipBuildingAmount = () => 3.5;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('scout'); star.update();
            test.assertEqual(game.allShips.filter(ship => !ship.underConstruction()).length, 3);
            test.assertEqual(star.currentShip.type, 'scout');
            test.assertApproximately(star.currentShip.progress, 50, .001);
            test.assertApproximately(star.paidTowardShipBuilding, .5, .001);
        });
        test.it('continues satellite production and registers every completed defense', () => {
            const {game, star} = fixture(); star.population = 1000; star.techLevel = 1;
            game.rules.getStarShipBuildingAmount = () => 2;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('defense'); star.update();
            test.assertEqual(star.defenseSatellites.length, 2);
            test.assertTrue(star.defenseSatellites.every(ship => ship.isOnPatrol()));
            test.assertEqual(star.currentShip.progress, 0);
        });
        test.it('chooses a fresh v3 AI hull after each completed computer build', () => {
            const {game, star} = fixture(); star.owner = 2; star.population = 1000; star.techLevel = 1;
            let choices = 0;
            game.aiManager.getAIPlayer(2).starAIs.set(star.id, { chooseShipToBuild: () => {
                choices++; return {type: 'defense'};
            }});
            game.rules.getStarShipBuildingAmount = () => 2.5;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('scout'); star.update();
            test.assertEqual(choices, 1);
            test.assertEqual(star.currentShip.type, 'defense');
            test.assertEqual(star.currentShip.progress, 0);
            test.assertApproximately(star.buildCredits.scout, 1.5, .001);
        });
    });
    test.describe('Hull switching and construction credit', () => {
        test.it('preserves per-hull effort while removing superseded unfinished hulls', () => {
            const {game, star} = fixture(); star.techLevel = 1;
            game.rules.getShipBuildCost = () => 10;
            star.startBuildingShip('scout'); const old = star.currentShip;
            star.paidTowardShipBuilding = 8;
            star.startBuildingShip('battleship');
            test.assertFalse(game.allShips.includes(old));
            test.assertFalse(star.ships.includes(old));
            test.assertEqual(star.paidTowardShipBuilding, 0);
            star.paidTowardShipBuilding = 3;
            star.startBuildingShip('scout');
            test.assertEqual(star.paidTowardShipBuilding, 8);
            test.assertEqual(star.currentShip.progress, 80);
            test.assertEqual(star.buildCredits.battleship, 3);
            test.assertEqual(game.allShips.length, 1);
        });
        test.it('pauses and resumes construction without losing paid effort', () => {
            const {game, star} = fixture(); star.startBuildingShip('colony');
            star.paidTowardShipBuilding = 2;
            test.assertTrue(game.executeUIAction({type:'pauseBuild',object:star}));
            test.assertNull(star.currentShip);
            star.startBuildingShip('colony');
            test.assertEqual(star.paidTowardShipBuilding, 2);
        });
        test.it('does not restart the selected hull or accept an unknown hull', () => {
            const {star} = fixture(); star.startBuildingShip('colony');
            const hull = star.currentShip;
            test.assertFalse(star.startBuildingShip('colony'));
            test.assertFalse(star.startBuildingShip('invalid'));
            test.assertTrue(star.currentShip === hull);
        });
    });
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
