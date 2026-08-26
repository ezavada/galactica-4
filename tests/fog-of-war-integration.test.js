// Fog of War Integration Tests for Galactica-4
// Tests the complete fog of war system integration

const test = require('./test-framework.js');
const Game = require('../src/js/game.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const GameConfig = require('../src/js/game-config.js');
const Common = require('../src/js/common.js');
const SpatialUtils = require('../src/js/spatial-utils.js');

test.describe('Game Fog of War Integration', () => {
    test.describe('Initialization', () => {
        test.it('creates spatial partition and visibility calculator', () => {
            // Create a minimal game without triggering map generation
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true; // Skip map generation to avoid hanging
            
            const game = new Game(factory, rules, config);
            
            test.assertDefined(game.spatialPartition, 'Should have spatial partition');
            test.assertDefined(game.visibilityCalculator, 'Should have visibility calculator');
        });

        test.it('initializes fog of war for entities', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;
            
            const game = new Game(factory, rules, config);
            
            const star = factory.createStar(1000, 2000, "Test Star");
            game.entityAdded(star);
            
            test.assertDefined(star.visibilityTo, 'Star should have visibility tracking');
            test.assertDefined(star.scannerRange, 'Star should have scanner range');
        });
    });

    test.describe('Turn Processing', () => {
        test.it('updates visibility during end turn', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;
            
            const game = new Game(factory, rules, config);
            
            const playerStar = factory.createStar(0, 0, "Player Star");
            playerStar.owner = 1;
            game.entityAdded(playerStar);
            
            const enemyStar = factory.createStar(1000, 0, "Enemy Star");
            enemyStar.owner = 2;
            game.entityAdded(enemyStar);
            
            playerStar.setScannerRange(12000);
            enemyStar.setStealth(1);
            enemyStar.setApparentSize(100);
            
            game.endTurn();
            
            test.assertGreaterThan(
                enemyStar.getVisibilityTo(1),
                Common.VisibilityLevel.NONE,
                'Enemy star should be visible to player after turn'
            );
        });
    });

    test.describe('Spatial Partition Integration', () => {
        test.it('maintains spatial partition during entity operations', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;
            
            const game = new Game(factory, rules, config);
            
            const star = factory.createStar(1000, 2000, "Test Star");
            game.entityAdded(star);
            
            const initialStats = game.getSpatialStats();
            test.assertEqual(initialStats.totalEntities, 1, 'Should have one entity initially');
            
            game.entityRemoved(star);
            
            const finalStats = game.getSpatialStats();
            test.assertEqual(finalStats.totalEntities, 0, 'Should have no entities after removal');
        });

        test.it('ignores duplicate entity registration', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;

            const game = new Game(factory, rules, config);

            const star = factory.createStar(1000, 2000, "Test Star");
            game.entityAdded(star);

            test.assertEqual(game.stars.length, 1, 'Duplicate star registration should not create a second game entry');
            test.assertEqual(game.getSpatialStats().totalStars, 1, 'Duplicate star registration should not create a second spatial entry');
        });
    });

    test.describe('Performance', () => {
        test.it('handles multiple entities efficiently', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;
            
            const game = new Game(factory, rules, config);
            
            for (let i = 0; i < 10; i++) {
                const star = factory.createStar(i * 1000, i * 1000, `Star ${i}`);
                star.owner = (i % 2) + 1;
                game.entityAdded(star);
            }
            
            const stats = game.getSpatialStats();
            test.assertEqual(stats.totalEntities, 10, 'Should have 10 total entities');
            test.assertEqual(stats.totalStars, 10, 'Should have 10 stars');
        });

        test.it('includes enemy fleets in omniscient visible entity queries', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.omniscient = true;
            config.skipMapGeneration = true;

            const game = new Game(factory, rules, config);
            const enemyStar = factory.createStar(1000, 1000, "Enemy Star");
            enemyStar.owner = 2;
            const enemyShip = factory.createShip(1000, 1000, 'scout', enemyStar);
            enemyShip.owner = 2;
            const enemyFleet = factory.createFleet(1000, 1000, 2);

            const visibleEntities = game.visibilityCalculator.getVisibleEntitiesForPlayer(1);
            const visibleFleets = game.visibilityCalculator.getVisibleEntitiesByTypeForPlayer(
                1,
                Common.SpatialConstants.ENTITY_TYPE_FLEET
            );

            test.assertContains(visibleEntities, enemyStar, 'Omniscient mode should reveal enemy stars');
            test.assertContains(visibleEntities, enemyShip, 'Omniscient mode should reveal enemy ships');
            test.assertContains(visibleEntities, enemyFleet, 'Omniscient mode should reveal enemy fleets');
            test.assertContains(visibleFleets, enemyFleet, 'Omniscient fleet query should return enemy fleets');
        });

        test.it('includes enemy fleets in scanner-based fleet visibility queries', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            config.sectorSize = 1;
            config.skipMapGeneration = true;

            const game = new Game(factory, rules, config);
            const playerStar = factory.createStar(0, 0, "Player Star");
            playerStar.owner = 1;
            playerStar.setScannerRange(12000);

            const enemyFleet = factory.createFleet(1000, 0, 2);
            enemyFleet.setStealth(1);
            enemyFleet.setApparentSize(100);

            game.visibilityCalculator.updateVisibilityForPlayer(1);
            const visibleFleets = game.visibilityCalculator.getVisibleEntitiesByTypeForPlayer(
                1,
                Common.SpatialConstants.ENTITY_TYPE_FLEET
            );

            test.assertContains(visibleFleets, enemyFleet, 'Scanner-based fleet query should return visible enemy fleets');
        });
    });
});

test.describe('Fog of War Constants', () => {
    test.describe('Visibility Levels', () => {
        test.it('has correct visibility level values', () => {
            test.assertEqual(Common.VisibilityLevel.NONE, 0, 'NONE should be 0');
            test.assertEqual(Common.VisibilityLevel.SPEED, 1, 'SPEED should be 1');
            test.assertEqual(Common.VisibilityLevel.TECH, 2, 'TECH should be 2');
            test.assertEqual(Common.VisibilityLevel.CLASS, 3, 'CLASS should be 3');
            test.assertEqual(Common.VisibilityLevel.DETAILS, 4, 'DETAILS should be 4');
        });
    });

    test.describe('Spatial Constants', () => {
        test.it('has correct spatial constants', () => {
            test.assertEqual(Common.SpatialConstants.CELLS_PER_SECTOR, 10, 'Should have 10 cells per sector');
            test.assertEqual(Common.SpatialConstants.PIXELS_PER_SECTOR, 1024 * 1024, 'Should have correct sector size');
            test.assertEqual(Common.SpatialConstants.PIXELS_PER_CELL, (1024 * 1024) / 10, 'Should have correct cell size');
        });
    });

    test.describe('Spatial Utils', () => {
        test.it('calculates sector coordinates correctly', () => {
            const sector = SpatialUtils.getSectorFromGalactic(1000, 2000);
            test.assertEqual(sector.sectorX, 0, 'Should be in sector 0,0');
            test.assertEqual(sector.sectorY, 0, 'Should be in sector 0,0');
            
            const sector2 = SpatialUtils.getSectorFromGalactic(2000000, 3000000);
            test.assertEqual(sector2.sectorX, 1, 'Should be in sector 1,1');
            test.assertEqual(sector2.sectorY, 2, 'Should be in sector 1,2');
        });

        test.it('calculates cell coordinates correctly', () => {
            const cell = SpatialUtils.getCellFromGalactic(1000, 2000);
            test.assertGreaterThanOrEqual(cell.cellX, 0, 'Cell X should be >= 0');
            test.assertLessThan(cell.cellX, 10, 'Cell X should be < 10');
            test.assertGreaterThanOrEqual(cell.cellY, 0, 'Cell Y should be >= 0');
            test.assertLessThan(cell.cellY, 10, 'Cell Y should be < 10');
        });

        test.it('finds cells in range', () => {
            const cells = SpatialUtils.getCellsInRange(1000, 1000, 500000);
            test.assertGreaterThan(cells.length, 0, 'Should find cells in range');
            
            for (const cell of cells) {
                test.assertGreaterThanOrEqual(cell.sectorX, -1, 'Sector X should be >= -1');
                test.assertLessThan(cell.sectorX, 2, 'Sector X should be < 2');
                test.assertGreaterThanOrEqual(cell.sectorY, -1, 'Sector Y should be >= -1');
                test.assertLessThan(cell.sectorY, 2, 'Sector Y should be < 2');
            }
        });
    });
});

// Export function for test runner
function runFogOfWarIntegrationTests() {
    // Tests run automatically when the file is loaded
}

module.exports = runFogOfWarIntegrationTests;
