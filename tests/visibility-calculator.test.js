// Visibility Calculator Tests for Galactica-4
// Tests the visibility calculation system with spatial partitioning

const test = require('./test-framework.js');
const VisibilityCalculator = require('../src/js/visibility-calculator.js');
const Common = require('../src/js/common.js');
const Star = require('../src/js/star.js');
const Ship = require('../src/js/ship.js');
const Rules = require('../src/js/rules.js');

// Mock game object for testing
function createMockGame() {
    const game = {
        stars: [],
        allShips: [],
        allFleets: [],
        players: [
            null, // Index 0 unused
            { owner: 1, isComputer: false },
            { owner: 2, isComputer: true }
        ],
        config: { totalPlayers: 2 },
        turn: 1,
        rules: new Rules(false),
        spatialPartition: {
            getAllEntities: () => [...game.stars, ...game.allShips],
            getEntitiesInRange: (x, y, range) => {
                const entities = [...game.stars, ...game.allShips];
                return entities.filter(entity => {
                    const distance = Math.sqrt((entity.x - x) ** 2 + (entity.y - y) ** 2);
                    return distance <= range;
                });
            }
        },
        factory: {
            isStar: (entity) => entity instanceof Star,
            isShip: (entity) => entity instanceof Ship,
            isFleet: () => false
        }
    };
    return game;
}

test.describe('VisibilityCalculator', () => {
    test.describe('Distance Calculation', () => {
        test.it('calculates distance between entities correctly', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            const entity1 = { x: 0, y: 0 };
            const entity2 = { x: 3, y: 4 };
            
            const distance = calculator.calculateDistance(entity1, entity2);
            test.assertEqual(distance, 5, 'Should calculate 3-4-5 triangle distance');
        });

        test.it('returns 0 for entities at same location', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            const entity1 = { x: 100, y: 200 };
            const entity2 = { x: 100, y: 200 };
            
            const distance = calculator.calculateDistance(entity1, entity2);
            test.assertEqual(distance, 0, 'Should return 0 for same location');
        });
    });

    test.describe('Visibility Level Conversion', () => {
        test.it('converts base visibility to correct levels', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            test.assertEqual(
                calculator.visibilityLevelFromBase(10),
                Common.VisibilityLevel.NONE,
                'Low visibility should be NONE'
            );
            
            test.assertEqual(
                calculator.visibilityLevelFromBase(30),
                Common.VisibilityLevel.SPEED,
                'Medium visibility should be SPEED'
            );
            
            test.assertEqual(
                calculator.visibilityLevelFromBase(50),
                Common.VisibilityLevel.TECH,
                'Higher visibility should be TECH'
            );
            
            test.assertEqual(
                calculator.visibilityLevelFromBase(100),
                Common.VisibilityLevel.CLASS,
                'High visibility should be CLASS'
            );
            
            test.assertEqual(
                calculator.visibilityLevelFromBase(250),
                Common.VisibilityLevel.DETAILS,
                'Very high visibility should be DETAILS'
            );
        });
    });

    test.describe('Entity Visibility Calculation', () => {
        test.it('calculates visibility between entities correctly', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            const observer = {
                x: 0, y: 0,
                getScannerRange: () => 12000,
                getApparentSize: () => 100
            };
            
            const target = {
                x: 1000, y: 0,
                getStealth: () => 1,
                getApparentSize: () => 100
            };
            
            const visibility = calculator.calculateVisibilityToEntity(observer, target);
            test.assertGreaterThan(visibility, Common.VisibilityLevel.NONE, 'Should have some visibility');
        });

        test.it('returns DETAILS for entities at same location', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            const observer = { x: 100, y: 100, getScannerRange: () => 1000 };
            const target = { x: 100, y: 100, getStealth: () => 1, getApparentSize: () => 100 };
            
            const visibility = calculator.calculateVisibilityToEntity(observer, target);
            test.assertEqual(visibility, Common.VisibilityLevel.DETAILS, 'Same location should give full visibility');
        });

        test.it('handles null entities gracefully', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            const visibility = calculator.calculateVisibilityToEntity(null, null);
            test.assertEqual(visibility, Common.VisibilityLevel.NONE, 'Should handle null entities');
        });
    });

    test.describe('Player Visibility Calculation', () => {
        test.it('finds best visibility from player entities', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create a star owned by player 1 with scanner
            const playerStar = new Star(0, 0, "Player Star", game);
            playerStar.owner = 1;
            playerStar.setScannerRange(12000);
            game.stars.push(playerStar);
            
            // Create a target star
            const targetStar = new Star(1000, 0, "Target Star", game);
            targetStar.owner = 2;
            targetStar.setStealth(1);
            targetStar.setApparentSize(100);
            game.stars.push(targetStar);
            
            const visibility = calculator.calculateVisibilityToPlayer(targetStar, 1);
            test.assertGreaterThan(visibility, Common.VisibilityLevel.NONE, 'Should have visibility to target');
        });

        test.it('clears stale current visibility while preserving last-seen memory', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);

            const playerStar = new Star(0, 0, "Player Star", game);
            playerStar.owner = 1;
            playerStar.setScannerRange(12000);
            game.stars.push(playerStar);

            const targetStar = new Star(1000, 0, "Target Star", game);
            targetStar.owner = 2;
            targetStar.setStealth(1);
            targetStar.setApparentSize(100);
            game.stars.push(targetStar);

            calculator.updateVisibilityForPlayer(1);
            test.assertGreaterThan(targetStar.getVisibilityTo(1), Common.VisibilityLevel.NONE, 'Target should start visible');
            test.assertEqual(targetStar.getLastSeen(1), 1, 'Visible target should record the turn it was last seen');

            playerStar.setScannerRange(10);
            game.turn = 2;
            calculator.updateVisibilityForPlayer(1);

            test.assertEqual(targetStar.getVisibilityTo(1), Common.VisibilityLevel.NONE, 'Target should no longer be currently visible outside scanner range');
            test.assertEqual(targetStar.getLastSeen(1), 1, 'Last-seen memory should survive losing current visibility');
            test.assertEqual(playerStar.getVisibilityTo(1), Common.VisibilityLevel.DETAILS, 'Owned entities should remain fully visible');
        });

        test.it('returns NONE for invalid player', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            const target = { x: 0, y: 0 };
            const visibility = calculator.calculateVisibilityToPlayer(target, 99);
            test.assertEqual(visibility, Common.VisibilityLevel.NONE, 'Should return NONE for invalid player');
        });
    });

    test.describe('Visibility Statistics', () => {
        test.it('provides visibility statistics', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            const playerStar = new Star(0, 0, "Player Star", game);
            playerStar.owner = 1;
            playerStar.setScannerRange(12000);
            game.stars.push(playerStar);
            
            const targetStar = new Star(1000, 0, "Target Star", game);
            targetStar.owner = 2;
            game.stars.push(targetStar);
            
            // Update visibility to make entities visible
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getVisibilityStats();
            
            test.assertEqual(stats.totalPlayers, 2, 'Should have correct player count');
            test.assertDefined(stats.visibilityByPlayer[1], 'Should have stats for player 1');
            test.assertGreaterThan(stats.visibilityByPlayer[1].totalVisible, 0, 'Should have visible entities');
        });
    });
});

// Export function for test runner
function runVisibilityCalculatorTests() {
    // Tests run automatically when the file is loaded
}

module.exports = runVisibilityCalculatorTests;
