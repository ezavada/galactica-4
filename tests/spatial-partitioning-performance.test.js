// Performance Tests for Spatial Partitioning
// Tests to prove O(k) vs O(n²) performance characteristics

const test = require('./test-framework.js');
const VisibilityCalculator = require('../src/js/visibility-calculator.js');
const { SpatialPartition } = require('../src/js/spatial-partition.js');
const Common = require('../src/js/common.js');
const Star = require('../src/js/star.js');
const Ship = require('../src/js/ship.js');
const Rules = require('../src/js/rules.js');

// Mock game object for testing
function createMockGame() {
    const game = {
        stars: [],
        allShips: [],
        players: [
            null, // Index 0 unused
            { owner: 1, isComputer: false },
            { owner: 2, isComputer: true }
        ],
        config: { totalPlayers: 2 },
        turn: 1,
        rules: new Rules(false),
        spatialPartition: new SpatialPartition(),
        factory: {
            isStar: (entity) => entity instanceof Star,
            isShip: (entity) => entity instanceof Ship
        }
    };
    return game;
}

// Helper function to create entities in a grid pattern
function createEntityGrid(game, count, spacing, startX = 0, startY = 0) {
    const entities = [];
    const sideLength = Math.ceil(Math.sqrt(count));
    
    for (let i = 0; i < count; i++) {
        const x = startX + (i % sideLength) * spacing;
        const y = startY + Math.floor(i / sideLength) * spacing;
        
        const star = new Star(x, y, `Star ${i}`, game);
        star.owner = 2; // Enemy entities
        star.setScannerRange(0);
        star.setStealth(1);
        star.setApparentSize(100);
        
        game.spatialPartition.addEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
        game.stars.push(star);
        entities.push(star);
    }
    
    return entities;
}

// Helper function to create scanner entities
function createScannerEntities(game, count, x, y, scannerRange) {
    const scanners = [];
    
    for (let i = 0; i < count; i++) {
        const star = new Star(x + (i * 100), y, `Scanner ${i}`, game);
        star.owner = 1; // Player entities
        star.setScannerRange(scannerRange);
        star.setStealth(1);
        star.setApparentSize(100);
        
        game.spatialPartition.addEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
        game.stars.push(star);
        scanners.push(star);
    }
    
    return scanners;
}

test.describe('Spatial Partitioning Performance Tests', () => {
    test.describe('O(k) vs O(n²) Performance Validation', () => {
        test.it('proves O(k) performance with entities in distant cells', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create 100 entities in a grid, far apart (different sectors)
            const entities = createEntityGrid(game, 100, 2000000, 0, 0); // 2M pixel spacing = different sectors
            
            // Create 1 scanner entity
            const scanners = createScannerEntities(game, 1, 0, 0, 100000); // 100k scanner range
            
            calculator.resetPerformanceStats();
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getPerformanceStats();
            
            // With spatial partitioning, we should only check entities in range
            // Scanner range is 100k, entities are 2M apart, so only 1 entity should be in range
            test.assertLessThan(stats.entitiesChecked, 10, 'Should check very few entities (O(k))');
            test.assertLessThan(stats.distanceCalculations, 10, 'Should do very few distance calculations');
            test.assertEqual(stats.scannerEntitiesUsed, 1, 'Should use 1 scanner entity');
            
            console.log(`Distant entities test: ${stats.entitiesChecked} entities checked, ${stats.distanceCalculations} distance calculations`);
        });

        test.it('proves O(k) performance with entities in same cell', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create 50 entities clustered together (same cell) within scanner range
            const entities = createEntityGrid(game, 50, 1000, 0, 0); // 1k pixel spacing = same cell
            
            // Create 1 scanner entity with large range to cover all entities
            const scanners = createScannerEntities(game, 1, 0, 0, 100000); // 100k scanner range
            
            calculator.resetPerformanceStats();
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getPerformanceStats();
            
            // With spatial partitioning, we should check all entities in the same cell
            // All 50 entities are within scanner range, so we check all of them
            test.assertGreaterThan(stats.entitiesChecked, 40, 'Should check most entities in range');
            test.assertGreaterThan(stats.distanceCalculations, 40, 'Should do distance calculations for most entities');
            test.assertEqual(stats.scannerEntitiesUsed, 1, 'Should use 1 scanner entity');
            
            console.log(`Same cell test: ${stats.entitiesChecked} entities checked, ${stats.distanceCalculations} distance calculations`);
        });

        test.it('proves O(k) performance with multiple scanners and distant entities', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create 200 entities in distant sectors
            const entities = createEntityGrid(game, 200, 3000000, 0, 0); // 3M pixel spacing
            
            // Create 5 scanner entities
            const scanners = createScannerEntities(game, 5, 0, 0, 500000); // 500k scanner range
            
            calculator.resetPerformanceStats();
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getPerformanceStats();
            
            // Each scanner should only find entities in its range
            // With 3M spacing and 500k range, each scanner finds very few entities
            test.assertLessThan(stats.entitiesChecked, 50, 'Should check relatively few entities');
            test.assertLessThan(stats.distanceCalculations, 50, 'Should do relatively few distance calculations');
            test.assertEqual(stats.scannerEntitiesUsed, 5, 'Should use 5 scanner entities');
            
            console.log(`Multiple scanners test: ${stats.entitiesChecked} entities checked, ${stats.distanceCalculations} distance calculations`);
        });

        test.it('demonstrates scalability with large entity counts', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create 1000 entities spread across many sectors
            const entities = createEntityGrid(game, 1000, 5000000, 0, 0); // 5M pixel spacing
            
            // Create 1 scanner entity
            const scanners = createScannerEntities(game, 1, 0, 0, 1000000); // 1M scanner range
            
            calculator.resetPerformanceStats();
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getPerformanceStats();
            
            // Even with 1000 entities, we should only check a small subset due to spatial partitioning
            test.assertLessThan(stats.entitiesChecked, 100, 'Should check only a small subset of 1000 entities');
            test.assertLessThan(stats.distanceCalculations, 100, 'Should do only a small number of distance calculations');
            
            console.log(`Scalability test (1000 entities): ${stats.entitiesChecked} entities checked, ${stats.distanceCalculations} distance calculations`);
        });
    });

    test.describe('Performance Comparison Scenarios', () => {
        test.it('compares clustered vs distributed entity performance', () => {
            // Test 1: Clustered entities (same cell)
            const game1 = createMockGame();
            const calculator1 = new VisibilityCalculator(game1);
            const entities1 = createEntityGrid(game1, 50, 1000, 0, 0); // Clustered
            const scanners1 = createScannerEntities(game1, 1, 0, 0, 100000);
            
            calculator1.resetPerformanceStats();
            calculator1.updateVisibilityForPlayer(1);
            const stats1 = calculator1.getPerformanceStats();
            
            // Test 2: Distributed entities (different sectors)
            const game2 = createMockGame();
            const calculator2 = new VisibilityCalculator(game2);
            const entities2 = createEntityGrid(game2, 50, 2000000, 0, 0); // Distributed
            const scanners2 = createScannerEntities(game2, 1, 0, 0, 100000);
            
            calculator2.resetPerformanceStats();
            calculator2.updateVisibilityForPlayer(1);
            const stats2 = calculator2.getPerformanceStats();
            
            // Clustered should check more entities than distributed
            test.assertGreaterThan(stats1.entitiesChecked, stats2.entitiesChecked, 'Clustered entities should check more entities');
            test.assertGreaterThan(stats1.distanceCalculations, stats2.distanceCalculations, 'Clustered entities should do more distance calculations');
            
            console.log(`Clustered: ${stats1.entitiesChecked} entities, ${stats1.distanceCalculations} calculations`);
            console.log(`Distributed: ${stats2.entitiesChecked} entities, ${stats2.distanceCalculations} calculations`);
        });

        test.it('validates scanner range impact on performance', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create entities in a fixed pattern
            const entities = createEntityGrid(game, 100, 100000, 0, 0); // 100k spacing
            
            // Test with different scanner ranges
            const ranges = [50000, 100000, 200000, 500000]; // 50k, 100k, 200k, 500k
            const results = [];
            
            for (const range of ranges) {
                // Clear previous scanners
                game.stars = game.stars.filter(star => star.owner !== 1);
                game.spatialPartition = new SpatialPartition();
                entities.forEach(entity => game.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR));
                
                const scanners = createScannerEntities(game, 1, 0, 0, range);
                
                calculator.resetPerformanceStats();
                calculator.updateVisibilityForPlayer(1);
                const stats = calculator.getPerformanceStats();
                
                results.push({ range, entitiesChecked: stats.entitiesChecked, distanceCalculations: stats.distanceCalculations });
            }
            
            // Larger scanner ranges should find more entities
            for (let i = 1; i < results.length; i++) {
                test.assertGreaterThanOrEqual(results[i].entitiesChecked, results[i-1].entitiesChecked, 
                    `Range ${results[i].range} should check at least as many entities as range ${results[i-1].range}`);
            }
            
            console.log('Scanner range impact:');
            results.forEach(result => {
                console.log(`  Range ${result.range}: ${result.entitiesChecked} entities, ${result.distanceCalculations} calculations`);
            });
        });
    });

    test.describe('Performance Statistics Validation', () => {
        test.it('validates performance counter accuracy', () => {
            const game = createMockGame();
            const calculator = new VisibilityCalculator(game);
            
            // Create a controlled scenario
            const entities = createEntityGrid(game, 10, 1000, 0, 0);
            const scanners = createScannerEntities(game, 2, 0, 0, 100000);
            
            calculator.resetPerformanceStats();
            calculator.updateVisibilityForPlayer(1);
            
            const stats = calculator.getPerformanceStats();
            
            // Validate counter relationships
            test.assertEqual(stats.scannerEntitiesUsed, 2, 'Should use exactly 2 scanner entities');
            test.assertGreaterThan(stats.entitiesInRange, 0, 'Should find entities in range');
            test.assertGreaterThanOrEqual(stats.entitiesChecked, stats.entitiesInRange, 'Entities checked should be >= entities in range');
            test.assertGreaterThanOrEqual(stats.distanceCalculations, stats.visibilityCalculations, 'Distance calculations should be >= visibility calculations');
            
            console.log(`Performance validation: ${JSON.stringify(stats, null, 2)}`);
        });
    });
});

// Export function for test runner
function runSpatialPartitioningPerformanceTests() {
    // Tests run automatically when the file is loaded
}

module.exports = runSpatialPartitioningPerformanceTests;
