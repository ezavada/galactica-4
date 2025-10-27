// Spatial Partition Tests for Galactica-4
// Tests the spatial partitioning system for efficient entity lookup

const test = require('./test-framework.js');
const { SpatialPartition, SpatialSector, SpatialCell } = require('../src/js/spatial-partition.js');
const Common = require('../src/js/common.js');
const SpatialUtils = require('../src/js/spatial-utils.js');

test.describe('SpatialCell', () => {
    test.describe('Entity Management', () => {
        test.it('adds and removes entities by type', () => {
            const cell = new SpatialCell(0, 0, 5, 5);
            const star = { id: 1, type: 'star' };
            const ship = { id: 2, type: 'ship' };
            const defense = { id: 3, type: 'defense' };
            
            cell.addEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
            cell.addEntity(ship, Common.SpatialConstants.ENTITY_TYPE_SHIP);
            cell.addEntity(defense, Common.SpatialConstants.ENTITY_TYPE_DEFENSE);
            
            test.assertEqual(cell.stars.length, 1, 'Should have one star');
            test.assertEqual(cell.ships.length, 1, 'Should have one ship');
            test.assertEqual(cell.defense.length, 1, 'Should have one defense');
            
            cell.removeEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
            test.assertEqual(cell.stars.length, 0, 'Should have no stars after removal');
        });

        test.it('prevents duplicate entities', () => {
            const cell = new SpatialCell(0, 0, 5, 5);
            const entity = { id: 1 };
            cell.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            cell.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            
            test.assertEqual(cell.stars.length, 1, 'Should not add duplicate entities');
        });

        test.it('gets entities by type', () => {
            const cell = new SpatialCell(0, 0, 5, 5);
            const star1 = { id: 1 };
            const star2 = { id: 2 };
            const ship = { id: 3 };
            
            cell.addEntity(star1, Common.SpatialConstants.ENTITY_TYPE_STAR);
            cell.addEntity(star2, Common.SpatialConstants.ENTITY_TYPE_STAR);
            cell.addEntity(ship, Common.SpatialConstants.ENTITY_TYPE_SHIP);
            
            const stars = cell.getEntitiesByType(Common.SpatialConstants.ENTITY_TYPE_STAR);
            test.assertEqual(stars.length, 2, 'Should return correct number of stars');
            test.assertTrue(stars.includes(star1), 'Should include first star');
            test.assertTrue(stars.includes(star2), 'Should include second star');
        });
    });
});

test.describe('SpatialSector', () => {
    test.describe('Cell Management', () => {
        test.it('creates 10x10 grid of cells', () => {
            const sector = new SpatialSector(1, 2);
            let totalCells = 0;
            for (let x = 0; x < Common.SpatialConstants.CELLS_PER_SECTOR; x++) {
                for (let y = 0; y < Common.SpatialConstants.CELLS_PER_SECTOR; y++) {
                    const cell = sector.getCell(x, y);
                    if (cell) totalCells++;
                }
            }
            test.assertEqual(totalCells, 100, 'Should have 100 cells (10x10)');
        });

        test.it('returns null for invalid cell coordinates', () => {
            const sector = new SpatialSector(1, 2);
            test.assertNull(sector.getCell(-1, 0), 'Should return null for negative x');
            test.assertNull(sector.getCell(0, -1), 'Should return null for negative y');
            test.assertNull(sector.getCell(10, 0), 'Should return null for x >= 10');
            test.assertNull(sector.getCell(0, 10), 'Should return null for y >= 10');
        });
    });
});

test.describe('SpatialPartition', () => {
    test.describe('Entity Management', () => {
        test.it('adds entities to correct cells', () => {
            const partition = new SpatialPartition();
            const entity = { x: 1000, y: 2000, id: 1 };
            partition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            
            test.assertDefined(entity._spatialLocation, 'Should set spatial location on entity');
            test.assertEqual(entity._spatialLocation.sectorX, 0, 'Should be in sector 0,0');
            test.assertEqual(entity._spatialLocation.sectorY, 0, 'Should be in sector 0,0');
        });

        test.it('removes entities correctly', () => {
            const partition = new SpatialPartition();
            const entity = { x: 1000, y: 2000, id: 1 };
            partition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            partition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            
            test.assertUndefined(entity._spatialLocation, 'Should clear spatial location');
        });

        test.it('updates entity positions', () => {
            const partition = new SpatialPartition();
            const entity = { x: 1000, y: 2000, id: 1 };
            partition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
            
            const oldLocation = { ...entity._spatialLocation };
            // Move to a different sector to ensure sector change
            partition.updateEntityPosition(entity, Common.SpatialConstants.ENTITY_TYPE_STAR, 2000000, 3000000);
            
            test.assertNotEqual(entity._spatialLocation.sectorX, oldLocation.sectorX, 'Should update sector');
            test.assertEqual(entity.x, 2000000, 'Should update entity x coordinate');
            test.assertEqual(entity.y, 3000000, 'Should update entity y coordinate');
        });
    });

    test.describe('Range Queries', () => {
        test.it('finds entities in range', () => {
            const partition = new SpatialPartition();
            const entity1 = { x: 1000, y: 1000, id: 1 };
            const entity2 = { x: 2000, y: 2000, id: 2 };
            const entity3 = { x: 10000, y: 10000, id: 3 };
            
            partition.addEntity(entity1, Common.SpatialConstants.ENTITY_TYPE_STAR);
            partition.addEntity(entity2, Common.SpatialConstants.ENTITY_TYPE_STAR);
            partition.addEntity(entity3, Common.SpatialConstants.ENTITY_TYPE_STAR);
            
            const entitiesInRange = partition.getEntitiesInRange(1500, 1500, 2000);
            
            test.assertGreaterThan(entitiesInRange.length, 0, 'Should find entities in range');
            test.assertTrue(entitiesInRange.includes(entity1), 'Should include entity1');
            test.assertTrue(entitiesInRange.includes(entity2), 'Should include entity2');
            test.assertFalse(entitiesInRange.includes(entity3), 'Should not include entity3');
        });

        test.it('finds entities by type in range', () => {
            const partition = new SpatialPartition();
            const star = { x: 1000, y: 1000, id: 1 };
            const ship = { x: 1500, y: 1500, id: 2 };
            
            partition.addEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
            partition.addEntity(ship, Common.SpatialConstants.ENTITY_TYPE_SHIP);
            
            const starsInRange = partition.getEntitiesInRangeByType(1200, 1200, 1000, Common.SpatialConstants.ENTITY_TYPE_STAR);
            const shipsInRange = partition.getEntitiesInRangeByType(1200, 1200, 1000, Common.SpatialConstants.ENTITY_TYPE_SHIP);
            
            test.assertEqual(starsInRange.length, 1, 'Should find one star in range');
            test.assertEqual(shipsInRange.length, 1, 'Should find one ship in range');
            test.assertTrue(starsInRange.includes(star), 'Should include the star');
            test.assertTrue(shipsInRange.includes(ship), 'Should include the ship');
        });
    });

    test.describe('Statistics', () => {
        test.it('provides accurate statistics', () => {
            const partition = new SpatialPartition();
            const star = { x: 1000, y: 1000, id: 1 };
            const ship = { x: 2000, y: 2000, id: 2 };
            
            partition.addEntity(star, Common.SpatialConstants.ENTITY_TYPE_STAR);
            partition.addEntity(ship, Common.SpatialConstants.ENTITY_TYPE_SHIP);
            
            const stats = partition.getStats();
            
            test.assertEqual(stats.totalEntities, 2, 'Should count total entities');
            test.assertEqual(stats.totalStars, 1, 'Should count stars');
            test.assertEqual(stats.totalShips, 1, 'Should count ships');
            test.assertGreaterThan(stats.totalSectors, 0, 'Should have at least one sector');
        });
    });
});

// Export function for test runner
function runSpatialPartitionTests() {
    // Tests run automatically when the file is loaded
}

module.exports = runSpatialPartitionTests;
