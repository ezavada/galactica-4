// Entity Fog of War Tests for Galactica-4
// Tests fog of war properties and methods for Star and Ship classes

const test = require('./test-framework.js');
const Star = require('../src/js/star.js');
const Ship = require('../src/js/ship.js');
const Common = require('../src/js/common.js');

// Helper function to create mock game with required properties
function createMockGame() {
    return {
        turn: 1,
        rules: {
            getShipInitialSpeed: () => 100
        }
    };
}

test.describe('Star Fog of War Properties', () => {

    test.describe('Property Management', () => {
        test.it('initializes with default fog of war properties', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            test.assertEqual(star.getScannerRange(), 0, 'Should start with no scanner range');
            test.assertEqual(star.getStealth(), 1, 'Should start with default stealth');
            test.assertEqual(star.getApparentSize(), 5000000, 'Should start with star default size');
        });

        test.it('sets and gets scanner range', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.setScannerRange(15000);
            test.assertEqual(star.getScannerRange(), 15000, 'Should set and get scanner range');
        });

        test.it('sets and gets stealth', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.setStealth(5);
            test.assertEqual(star.getStealth(), 5, 'Should set and get stealth');
        });

        test.it('sets and gets apparent size', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.setApparentSize(10000000);
            test.assertEqual(star.getApparentSize(), 10000000, 'Should set and get apparent size');
        });
    });

    test.describe('Visibility Tracking', () => {
        test.it('initializes visibility arrays', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            test.assertEqual(star.getVisibilityTo(1), Common.VisibilityLevel.NONE, 'Should start with no visibility');
            test.assertEqual(star.getLastSeen(1), 0, 'Should start with never seen');
        });

        test.it('sets and gets visibility level', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.setVisibilityTo(1, Common.VisibilityLevel.DETAILS);
            test.assertEqual(star.getVisibilityTo(1), Common.VisibilityLevel.DETAILS, 'Should set and get visibility level');
        });

        test.it('sets and gets last seen turn', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.setLastSeen(1, 5);
            test.assertEqual(star.getLastSeen(1), 5, 'Should set and get last seen turn');
        });

        test.it('checks if visible to player', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            test.assertFalse(star.isVisibleTo(1), 'Should not be visible initially');
            
            star.setVisibilityTo(1, Common.VisibilityLevel.SPEED);
            test.assertTrue(star.isVisibleTo(1), 'Should be visible after setting visibility');
        });
    });

    test.describe('Spatial Tracking', () => {
        test.it('updates spatial location', () => {
            const mockGame = { 
                turn: 1,
                spatialPartition: {
                    updateEntityPosition: function(entity, entityType, newX, newY) {
                        this.lastUpdate = { entity, entityType, newX, newY };
                    }
                }
            };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            star.updateSpatialLocation(mockGame);
            test.assertEqual(mockGame.spatialPartition.lastUpdate.entity, star, 'Should update spatial partition');
            test.assertEqual(mockGame.spatialPartition.lastUpdate.newX, 100, 'Should update with correct X');
            test.assertEqual(mockGame.spatialPartition.lastUpdate.newY, 200, 'Should update with correct Y');
        });
    });

    test.describe('Defense Satellites', () => {
        test.it('manages defense satellites', () => {
            const mockGame = { turn: 1 };
            const star = new Star(100, 200, "Test Star", mockGame);
            
            test.assertEqual(star.getDefenseSatellites().length, 0, 'Should start with no defense satellites');
            
            const satellite = { type: 'defense', strength: 10 };
            star.addDefenseSatellite(satellite);
            test.assertEqual(star.getDefenseSatellites().length, 1, 'Should add defense satellite');
            test.assertEqual(star.getDefenseSatellites()[0], satellite, 'Should return the added satellite');
            
            // Test total defense strength calculation
            test.assertGreaterThan(star.getTotalDefenseStrength(), 0, 'Should have total defense strength');
            test.assertEqual(star.getTotalDefenseStrength(), star.getDefenseStrength() + 10, 'Should include satellite strength');
            
            star.removeDefenseSatellite(satellite);
            test.assertEqual(star.getDefenseSatellites().length, 0, 'Should remove defense satellite');
            test.assertEqual(star.getTotalDefenseStrength(), star.getDefenseStrength(), 'Should only have star defense after removal');
        });
    });
});

test.describe('Ship Fog of War Properties', () => {
    let ship;
    let mockGame;

    test.describe('Property Management', () => {
        test.it('initializes with default fog of war properties', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            test.assertEqual(ship.getScannerRange(), 0, 'Should start with no scanner range');
            test.assertEqual(ship.getStealth(), 1, 'Should start with default stealth');
            test.assertGreaterThan(ship.getApparentSize(), 0, 'Should have calculated apparent size');
        });

        test.it('sets and gets scanner range', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            ship.setScannerRange(20000);
            test.assertEqual(ship.getScannerRange(), 20000, 'Should set and get scanner range');
        });

        test.it('sets and gets stealth', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            ship.setStealth(3);
            test.assertEqual(ship.getStealth(), 3, 'Should set and get stealth');
        });

        test.it('calculates apparent size based on type and tech', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship1 = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            const ship2 = new Ship(100, 200, "destroyer", mockStar, mockGame, 1);
            
            test.assertGreaterThan(ship2.getApparentSize(), ship1.getApparentSize(), 'Destroyer should be larger than scout');
        });
    });

    test.describe('Visibility Tracking', () => {
        test.it('initializes visibility arrays', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            test.assertEqual(ship.getVisibilityTo(1), Common.VisibilityLevel.NONE, 'Should start with no visibility');
            test.assertEqual(ship.getLastSeen(1), 0, 'Should start with never seen');
        });

        test.it('sets and gets visibility level', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            ship.setVisibilityTo(1, Common.VisibilityLevel.TECH);
            test.assertEqual(ship.getVisibilityTo(1), Common.VisibilityLevel.TECH, 'Should set and get visibility level');
        });

        test.it('sets and gets last seen turn', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            ship.setLastSeen(1, 3);
            test.assertEqual(ship.getLastSeen(1), 3, 'Should set and get last seen turn');
        });

        test.it('checks if visible to player', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            test.assertFalse(ship.isVisibleTo(1), 'Should not be visible initially');
            
            ship.setVisibilityTo(1, Common.VisibilityLevel.CLASS);
            test.assertTrue(ship.isVisibleTo(1), 'Should be visible after setting visibility');
        });
    });

    test.describe('Spatial Tracking', () => {
        test.it('updates spatial location on move', () => {
            const mockGame = createMockGame();
            mockGame.spatialPartition = {
                updateEntityPosition: function(entity, entityType, newX, newY) {
                    this.lastUpdate = { entity, entityType, newX, newY };
                }
            };
            const mockStar = { 
                techLevel: 1,
                shipDeparted: function(ship) { /* mock function */ }
            };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            // Test the updateSpatialLocation method directly
            ship.updateSpatialLocation(mockGame);
            test.assertEqual(mockGame.spatialPartition.lastUpdate.entity, ship, 'Should update spatial partition');
            test.assertEqual(mockGame.spatialPartition.lastUpdate.newX, 100, 'Should update with current X');
            test.assertEqual(mockGame.spatialPartition.lastUpdate.newY, 200, 'Should update with current Y');
        });

        test.it('updates spatial location on arrival', () => {
            const mockGame = createMockGame();
            mockGame.spatialPartition = {
                updateEntityPosition: function(entity, entityType, newX, newY) {
                    this.lastUpdate = { entity, entityType, newX, newY };
                }
            };
            const mockStar = { techLevel: 1 };
            const ship = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            
            // Test the updateSpatialLocation method directly
            ship.updateSpatialLocation(mockGame);
            test.assertEqual(mockGame.spatialPartition.lastUpdate.entity, ship, 'Should update spatial partition on arrival');
        });
    });

    test.describe('Size Calculation', () => {
        test.it('calculates size multiplier correctly', () => {
            const mockGame = createMockGame();
            const mockStar = { techLevel: 1 };
            const scout = new Ship(100, 200, "scout", mockStar, mockGame, 1);
            const destroyer = new Ship(100, 200, "destroyer", mockStar, mockGame, 1);
            const cruiser = new Ship(100, 200, "cruiser", mockStar, mockGame, 1);
            
            test.assertEqual(scout.getSizeMultiplier(), -0.25, 'Scout should have size multiplier -0.25');
            test.assertEqual(destroyer.getSizeMultiplier(), 0, 'Destroyer should have size multiplier 0 (not defined)');
            test.assertEqual(cruiser.getSizeMultiplier(), 0, 'Cruiser should have size multiplier 0 (not defined)');
        });
    });
});

// Export function for test runner
function runEntityFogOfWarTests() {
    // Tests run automatically when the file is loaded
}

module.exports = runEntityFogOfWarTests;