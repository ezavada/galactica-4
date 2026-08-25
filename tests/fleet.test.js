// Fleet mechanics tests for Galactica-4
// Tests fleet formation, ship management, and combat integration

const test = require('./test-framework.js');

function runFleetTests() {
    test.describe('Fleet Mechanics', () => {
        
        test.it('should create fleet with correct initial properties', () => {
            // Mock game object
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(100, 200, mockGame, 1);
            
            test.assertEqual(fleet.x, 100);
            test.assertEqual(fleet.y, 200);
            test.assertEqual(fleet.owner, 1);
            test.assertEqual(fleet.ships.length, 0);
            test.assertEqual(fleet.totalPower, 0);
            test.assertEqual(fleet.totalSpeed, 0);
            test.assertEqual(fleet.techLevel, 0);
        });
        
        test.it('should add ships to fleet and recalculate stats', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            // Mock ship
            const mockShip = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: null,
                star: null
            };
            
            const result = fleet.addShip(mockShip);
            
            test.assertEqual(result, true);
            test.assertEqual(fleet.ships.length, 1);
            test.assertEqual(fleet.totalPower, 5);
            test.assertEqual(fleet.totalSpeed, 10);
            test.assertEqual(fleet.techLevel, 3);
            test.assertEqual(mockShip.fleet, fleet);
            test.assertEqual(mockShip.star, null);
        });

        test.it('should not duplicate ships when transferring between fleets', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };

            const Fleet = require('../src/js/fleet.js');
            const firstFleet = new Fleet(0, 0, mockGame, 1);
            const secondFleet = new Fleet(100, 0, mockGame, 1);

            const mockShip = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: null,
                star: null
            };

            test.assertTrue(firstFleet.addShip(mockShip), 'First fleet should accept the ship');
            test.assertFalse(firstFleet.addShip(mockShip), 'Adding the same ship twice should be ignored');
            test.assertEqual(firstFleet.getSize(), 1, 'First fleet should contain one copy of the ship');

            test.assertTrue(secondFleet.addShip(mockShip), 'Second fleet should be able to take the ship');
            test.assertEqual(firstFleet.getSize(), 0, 'Ship should be removed from its previous fleet');
            test.assertEqual(secondFleet.getSize(), 1, 'Ship should be present in the new fleet');
            test.assertEqual(mockShip.fleet, secondFleet, 'Ship should point at its current fleet');
        });
        
        test.it('should remove ships from fleet and recalculate stats', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockShip = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null
            };
            
            fleet.ships.push(mockShip);
            fleet.totalPower = 5;
            fleet.totalSpeed = 10;
            fleet.techLevel = 3;
            
            const result = fleet.removeShip(mockShip);
            
            test.assertEqual(result, true);
            test.assertEqual(fleet.ships.length, 0);
            test.assertEqual(fleet.totalPower, 0);
            test.assertEqual(fleet.totalSpeed, 0);
            test.assertEqual(fleet.techLevel, 0);
            test.assertEqual(mockShip.fleet, null);
        });
        
        test.it('should calculate fleet attack and defense strength', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            // Mock ships with combat methods
            const mockShip1 = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null,
                getAttackStrength: () => 250, // power * 50
                getDefenseStrength: () => 500  // power * 100
            };
            
            const mockShip2 = {
                power: 3,
                speed: 8,
                techLevel: 2,
                damage: 0,
                fleet: fleet,
                star: null,
                getAttackStrength: () => 150,
                getDefenseStrength: () => 300
            };
            
            fleet.addShip(mockShip1);
            fleet.addShip(mockShip2);
            
            test.assertEqual(fleet.getAttackStrength(), 400); // 250 + 150
            test.assertEqual(fleet.getDefenseStrength(), 800); // 500 + 300
        });
        
        test.it('should handle fleet speed as slowest ship', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockShip1 = {
                power: 5,
                speed: 15, // Faster ship
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null
            };
            
            const mockShip2 = {
                power: 3,
                speed: 8,  // Slower ship
                techLevel: 2,
                damage: 0,
                fleet: fleet,
                star: null
            };
            
            fleet.addShip(mockShip1);
            fleet.addShip(mockShip2);
            
            // Fleet speed should be the slowest ship's speed
            test.assertEqual(fleet.totalSpeed, 8);
        });
        
        test.it('should check ship types in fleet', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockScout = {
                power: 1,
                speed: 20,
                techLevel: 1,
                damage: 0,
                fleet: fleet,
                star: null,
                type: 'scout'
            };
            
            const mockBattleship = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null,
                type: 'battleship'
            };
            
            fleet.addShip(mockScout);
            fleet.addShip(mockBattleship);
            
            test.assertEqual(fleet.hasShipType('scout'), true);
            test.assertEqual(fleet.hasShipType('battleship'), true);
            test.assertEqual(fleet.hasShipType('colony'), false);
            
            const scoutShips = fleet.getShipsOfType('scout');
            test.assertEqual(scoutShips.length, 1);
            test.assertEqual(scoutShips[0], mockScout);
        });
        
        test.it('should handle empty fleet correctly', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            test.assertEqual(fleet.isEmpty(), true);
            test.assertEqual(fleet.isDead(), true);
            test.assertEqual(fleet.getSize(), 0);
            test.assertEqual(fleet.getAttackStrength(), 0);
            test.assertEqual(fleet.getDefenseStrength(), 0);
        });
        
        test.it('should remove dead ships from fleet', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockAliveShip = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null,
                isDead: () => false
            };
            
            const mockDeadShip = {
                power: 3,
                speed: 8,
                techLevel: 2,
                damage: 1000, // Heavily damaged
                fleet: fleet,
                star: null,
                isDead: () => true
            };
            
            fleet.addShip(mockAliveShip);
            fleet.addShip(mockDeadShip);
            
            test.assertEqual(fleet.ships.length, 2);
            
            const removedCount = fleet.removeDeadShips();
            
            test.assertEqual(removedCount, 1);
            test.assertEqual(fleet.ships.length, 1);
            test.assertEqual(fleet.ships[0], mockAliveShip);
        });
        
        test.it('should handle fleet movement', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockShip = {
                power: 5,
                speed: 10,
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null
            };
            
            fleet.addShip(mockShip);
            
            // Set destination
            fleet.setDestination({ x: 100, y: 0 });
            
            test.assertEqual(fleet.destination.x, 100);
            test.assertEqual(fleet.destination.y, 0);
            test.assertEqual(fleet.remainingDistance, 100);
            
            // Move one turn
            const arrived = fleet.move();
            
            test.assertEqual(arrived, false); // Should not arrive in one turn
            test.assertEqual(fleet.x, 10); // Moved 10 units (fleet speed)
            test.assertEqual(fleet.remainingDistance, 90);
        });
        
        test.it('should handle fleet arrival at destination', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Fleet = require('../src/js/fleet.js');
            const fleet = new Fleet(0, 0, mockGame, 1);
            
            const mockShip = {
                power: 5,
                speed: 100, // Fast enough to arrive in one turn
                techLevel: 3,
                damage: 0,
                fleet: fleet,
                star: null
            };
            
            fleet.addShip(mockShip);
            
            // Set destination close enough to arrive in one turn
            fleet.setDestination({ x: 50, y: 0 });
            
            const arrived = fleet.move();
            
            test.assertEqual(arrived, true);
            test.assertEqual(fleet.x, 50);
            test.assertEqual(fleet.y, 0);
            test.assertEqual(fleet.remainingDistance, 0);
            test.assertEqual(fleet.destination, null);
        });
    });
}

module.exports = runFleetTests;
