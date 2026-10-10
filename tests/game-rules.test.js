// Game rule parity tests for Galactica-4
// Focuses on v3 gameplay rules used by both humans and AI players.

const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');

function createRuleGame(options = {}) {
    const factory = new Factory();
    const rules = new Rules(false);
    const config = new GameConfig({
        numHumans: options.numHumans !== undefined ? options.numHumans : 1,
        numComputers: options.numComputers !== undefined ? options.numComputers : 1,
        skipMapGeneration: true,
        omniscient: true,
        aiSkillByPlayer: options.aiSkillByPlayer || {}
    });
    return new Game(factory, rules, config);
}

function createOwnedStar(game, x, y, name, owner, techLevel = 1, population = 1000) {
    const star = game.factory.createStar(x, y, name);
    star.owner = owner;
    star.techLevel = techLevel;
    star.population = population;
    star.setScannerRange(game.rules.getScanRangeForTechLevel(star.techLevel));
    return star;
}

function createCompletedShip(game, star, type, techLevel = star.techLevel) {
    const originalTech = star.techLevel;
    star.techLevel = techLevel;
    const ship = game.factory.createShip(star.x, star.y, type, star);
    star.techLevel = originalTech;
    ship.techLevel = techLevel;
    ship.power = ship.calculatePower();
    ship.speed = game.rules.getShipInitialSpeed(ship);
    ship.scannerRange = game.rules.getShipScanRange(ship);
    ship.complete();
    ship.star = star;
    if (!star.ships.includes(ship)) {
        star.ships.push(ship);
    }
    return ship;
}

function runGameRuleTests() {
    test.describe('V3 game rule parity', () => {
        test.it('lets a standalone scout pick up higher technology when leaving a star', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 7);
            const scout = createCompletedShip(game, origin, 'scout', 2);

            scout.setDestination({ x: 100000, y: 0, name: 'Deep Space' });
            scout.move();

            test.assertEqual(scout.techLevel, 7, 'Scout should carry the origin star technology after departing');
            test.assertNull(scout.star, 'Scout should be in flight after departing');
            test.assertFalse(origin.ships.includes(scout), 'Departing scout should be removed from the origin star');
        });

        test.it('lets a scout upgrade a lower-tech allied star on arrival', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 6);
            const target = createOwnedStar(game, 100, 0, 'Target', 1, 2);
            const scout = createCompletedShip(game, origin, 'scout', 6);

            scout.setDestination(target);
            scout.move();

            test.assertEqual(target.techLevel, 6, 'Allied star should receive the scout technology library');
            test.assertEqual(target.scannerRange, game.rules.getScanRangeForTechLevel(6), 'Star scanner range should follow the transferred tech level');
        });

        test.it('lets a scout pick up higher technology from an allied star on arrival', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 2);
            const target = createOwnedStar(game, 100, 0, 'Target', 1, 8);
            const scout = createCompletedShip(game, origin, 'scout', 2);

            scout.setDestination(target);
            scout.move();

            test.assertEqual(scout.techLevel, 8, 'Scout should pick up the destination star technology');
            test.assertEqual(target.techLevel, 8, 'Destination star technology should not be lowered');
        });

        test.it('lets battleships transfer technology to allied stars without picking higher tech back up', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 7);
            const lowTechTarget = createOwnedStar(game, 100, 0, 'Low Tech Target', 1, 3);
            const highTechTarget = createOwnedStar(game, 200, 0, 'High Tech Target', 1, 9);
            const highTechBattleship = createCompletedShip(game, origin, 'battleship', 7);
            const lowTechBattleship = createCompletedShip(game, origin, 'battleship', 4);

            highTechBattleship.setDestination(lowTechTarget);
            highTechBattleship.move();
            lowTechBattleship.setDestination(highTechTarget);
            lowTechBattleship.move();

            test.assertEqual(lowTechTarget.techLevel, 7, 'Battleship should raise lower allied star tech');
            test.assertEqual(lowTechBattleship.techLevel, 4, 'Battleship should not pick up higher star tech');
            test.assertEqual(highTechTarget.techLevel, 9, 'Higher allied star tech should remain unchanged');
        });

        test.it('does not transfer technology to non-allied stars', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 7);
            const enemy = createOwnedStar(game, 100, 0, 'Enemy', 2, 2);
            const battleship = createCompletedShip(game, origin, 'battleship', 7);
            const scout = createCompletedShip(game, origin, 'scout', 1);

            const battleshipChanged = game.applyTechnologyTransferToStar(battleship, enemy);
            const scoutChanged = game.applyTechnologyTransferToStar(scout, enemy);

            test.assertFalse(battleshipChanged, 'Battleship should not transfer tech to an enemy star');
            test.assertFalse(scoutChanged, 'Scout should not pick up tech from an enemy star');
            test.assertEqual(enemy.techLevel, 2, 'Enemy star tech should remain unchanged');
            test.assertEqual(scout.techLevel, 1, 'Scout tech should remain unchanged');
        });

        test.it('does not apply new-neutral-colony defaults to captured former enemy colonies', () => {
            const game = createRuleGame();
            game.players[1].setDefaultEconomics(500, 200, 300);
            game.players[1].setDefaultBuildType(4);

            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 4);
            const captured = createOwnedStar(game, 100, 0, 'Captured', 0, 2, 1);
            const colony = createCompletedShip(game, origin, 'colony', 4);

            const colonized = game.colonizeStar(captured, colony, 2);

            test.assertTrue(colonized, 'Former enemy star should be claimed once combat leaves it neutral');
            test.assertEqual(captured.owner, 1, 'Captured star should be owned by the colony ship owner');
            test.assertNull(captured.currentShip, 'Captured former enemy colony should not receive new-neutral build defaults');
            test.assertNotEqual(captured.growth.desired, 50, 'Captured former enemy colony should not receive human default economics');
        });

        test.it('refreshes idle docked scout technology during star updates', () => {
            const game = createRuleGame();
            const star = createOwnedStar(game, 0, 0, 'Tech Hub', 1, 5);
            const scout = createCompletedShip(game, star, 'scout', 2);

            star.update();

            test.assertEqual(scout.techLevel, 5, 'Idle docked scout should refresh from its allied star');
        });

        test.it('uses human default new-colony economics and hull choice for neutral colonization', () => {
            const game = createRuleGame();
            game.players[1].setDefaultEconomics(500, 200, 300);
            game.players[1].setDefaultBuildType(3); // v3 1-based hull index: Colony

            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 4);
            const target = createOwnedStar(game, 100, 0, 'Neutral', 0, 0, 0);
            const colony = createCompletedShip(game, origin, 'colony', 4);

            colony.setDestination(target);
            colony.move();

            test.assertEqual(target.owner, 1, 'Neutral star should become owned by the colony ship owner');
            test.assertEqual(target.techLevel, 4, 'New colony should inherit the colony ship technology');
            test.assertEqual(target.growth.desired, 50, 'Human default growth allocation should be applied');
            test.assertEqual(target.research.desired, 20, 'Human default research allocation should be applied');
            test.assertEqual(target.shipBuilding.desired, 30, 'Human default shipbuilding allocation should be applied');
            test.assertNotNull(target.currentShip, 'Human default hull should start building');
            test.assertEqual(target.currentShip.type, 'colony', 'Default build type 3 should map to a colony ship');
        });

        test.it('starts computer-owned neutral colonies building defense satellites', () => {
            const game = createRuleGame({ numHumans: 0, numComputers: 2 });
            const origin = createOwnedStar(game, 0, 0, 'AI Origin', 1, 4);
            const target = createOwnedStar(game, 100, 0, 'AI Neutral', 0, 0, 0);
            const colony = createCompletedShip(game, origin, 'colony', 4);

            colony.setDestination(target);
            colony.move();

            test.assertEqual(target.owner, 1, 'AI colony should claim the neutral star');
            test.assertNotNull(target.currentShip, 'AI new colony should immediately select a build hull');
            test.assertEqual(target.currentShip.type, 'defense', 'AI new colony should start with a defense satellite like v3');
            test.assertFalse(target.ships.includes(target.currentShip), 'Pending satellite construction should remain system data');
        });

        test.it('applies fleet technology to allied stars but does not refresh scouts inside fleets', () => {
            const game = createRuleGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 7);
            const lowTechTarget = createOwnedStar(game, 100, 0, 'Low Tech Target', 1, 3);
            const highTechTarget = createOwnedStar(game, 200, 0, 'High Tech Target', 1, 9);
            lowTechTarget.startBuildingShip('battleship');lowTechTarget.paidTowardShipBuilding=.5;
            const battleship = createCompletedShip(game, origin, 'battleship', 7);
            const scout = createCompletedShip(game, origin, 'scout', 2);

            const fleet = game.factory.createFleet(origin.x, origin.y, 1);
            fleet.addShip(battleship);
            fleet.setDestination(lowTechTarget);
            fleet.move();

            const scoutFleet = game.factory.createFleet(origin.x, origin.y, 1);
            scoutFleet.addShip(scout);
            scoutFleet.setDestination(highTechTarget);
            scoutFleet.move();

            test.assertEqual(lowTechTarget.techLevel, 7, 'Fleet should transfer its highest ship technology to an allied star');
            test.assertEqual(lowTechTarget.currentShip.cost,4.5);test.assertApproximately(lowTechTarget.currentShip.progress,.5/4.5*100,.000001);test.assertEqual(lowTechTarget.paidTowardShipBuilding,.5);
            test.assertEqual(scout.techLevel, 2, 'Scout inside a fleet should not refresh from the destination star');
            test.assertEqual(highTechTarget.techLevel, 9, 'Destination star should keep its higher technology');
        });
    });
}

module.exports = runGameRuleTests;
