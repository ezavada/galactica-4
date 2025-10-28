// Fleet Formation Tests for Galactica-4
// Tests automatic fleet formation when friendly ships intercept

const test = require('./test-framework.js');
const Ship = require('../src/js/ship.js');
const Star = require('../src/js/star.js');
const Fleet = require('../src/js/fleet.js');
const Common = require('../src/js/common.js');

function runFleetFormationTests() {
    test.describe('Fleet Formation on Ship Interception', () => {
        
        test.it('should automatically form fleet when two friendly ships intercept', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    // Check if either ship is already in a fleet
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        // Both ships are in fleets - merge the fleets
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        // Ship1 is in a fleet, add ship2 to it
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        // Ship2 is in a fleet, add ship1 to it
                        ship2.fleet.addShip(ship1);
                    } else {
                        // Neither ship is in a fleet, create a new fleet
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    // Add all ships from fleet2 to fleet1
                    const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    
                    // Remove the empty fleet2
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            const Common = require('../src/js/common.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create two friendly ships at the same location
            const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
            const ship2 = new Ship(100, 100, 'battleship', star, mockGame, 1);
            
            // Add ships to game
            mockGame.entityAdded(ship1);
            mockGame.entityAdded(ship2);
            
            // Verify ships are not in fleets initially
            test.assertFalse(ship1.isInFleet(), 'Ship1 should not be in fleet initially');
            test.assertFalse(ship2.isInFleet(), 'Ship2 should not be in fleet initially');
            
            // Simulate ship interception by calling the fleet formation handler directly
            mockGame.handleFleetFormation(ship1, ship2);
            
            // Verify both ships are now in the same fleet
            test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet after interception');
            test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet after interception');
            test.assertEqual(ship1.fleet, ship2.fleet, 'Both ships should be in the same fleet');
                    test.assertEqual(ship1.fleet.getSize(), 2, 'Fleet should contain 2 ships');
                });
                
                test.it('should add ship to fleet when ship arrives at existing fleet', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a fleet first
                    const fleet = mockGame.factory.createFleet(100, 100, 1);
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    fleet.addShip(ship1);
                    
                    // Create a second ship that will arrive at the fleet
                    const ship2 = new Ship(200, 200, 'battleship', star, mockGame, 1);
                    ship2.progress = 100; // Set to completed construction
                    mockGame.entityAdded(ship2); // Add ship to game
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    test.assertFalse(ship2.isInFleet(), 'Ship2 should not be in fleet initially');
                    
                    // Simulate ship2 arriving at the fleet by calling ship arrival logic
                    ship2.destination = fleet;
                    ship2.x = fleet.x;
                    ship2.y = fleet.y;
                    ship2.arriveAtDestination();
                    
                    // Debug: Check what ship2 is after arrival
                    console.log('ship2 after arrival:', typeof ship2, ship2.constructor.name);
                    console.log('ship2.isInFleet:', typeof ship2.isInFleet);
                    
                    // Verify ship2 was added to the fleet
                    test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet after arrival');
                    test.assertEqual(ship2.fleet, fleet, 'Ship2 should be in the same fleet');
                    test.assertEqual(fleet.getSize(), 2, 'Fleet should contain 2 ships after ship arrival');
                });
                
                test.it('should add ship to fleet when fleet arrives at ship', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a ship first
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    
                    // Create a fleet that will arrive at the ship
                    const fleet = mockGame.factory.createFleet(200, 200, 1);
                    const ship2 = new Ship(200, 200, 'battleship', star, mockGame, 1);
                    ship2.progress = 100; // Set to completed construction
                    fleet.addShip(ship2);
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    test.assertFalse(ship1.isInFleet(), 'Ship1 should not be in fleet initially');
                    
                    // Simulate fleet arriving at ship1 by calling fleet arrival logic
                    fleet.destination = ship1;
                    fleet.x = ship1.x;
                    fleet.y = ship1.y;
                    fleet.arriveAtDestination();
                    
                    // Verify ship1 was added to the fleet
                    test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet after fleet arrival');
                    test.assertEqual(ship1.fleet, fleet, 'Ship1 should be in the same fleet');
                    test.assertEqual(fleet.getSize(), 2, 'Fleet should contain 2 ships after fleet arrival');
                });
                
                test.it('should merge fleets when fleet arrives at another fleet', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create two separate fleets
                    const fleet1 = mockGame.factory.createFleet(100, 100, 1);
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    fleet1.addShip(ship1);
                    
                    const fleet2 = mockGame.factory.createFleet(200, 200, 1);
                    const ship2 = new Ship(200, 200, 'battleship', star, mockGame, 1);
                    ship2.progress = 100; // Set to completed construction
                    fleet2.addShip(ship2);
                    
                    // Verify initial state
                    test.assertEqual(fleet1.getSize(), 1, 'Fleet1 should initially contain 1 ship');
                    test.assertEqual(fleet2.getSize(), 1, 'Fleet2 should initially contain 1 ship');
                    test.assertEqual(mockGame.allFleets.length, 2, 'Should have 2 fleets initially');
                    
                    // Simulate fleet1 arriving at fleet2 by calling fleet arrival logic
                    fleet1.destination = fleet2;
                    fleet1.x = fleet2.x;
                    fleet1.y = fleet2.y;
                    fleet1.arriveAtDestination();
                    
                    // Verify fleets were merged
                    test.assertEqual(fleet1.getSize(), 2, 'Fleet1 should contain 2 ships after merge');
                    test.assertEqual(mockGame.allFleets.length, 1, 'Should have 1 fleet after merge');
                    test.assertEqual(ship1.fleet, fleet1, 'Ship1 should be in fleet1');
                    test.assertEqual(ship2.fleet, fleet1, 'Ship2 should be in fleet1');
                });
                
                test.it('should not form fleet when enemy ship arrives at fleet', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a fleet owned by player 1
                    const fleet = mockGame.factory.createFleet(100, 100, 1);
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    fleet.addShip(ship1);
                    
                    // Create an enemy ship owned by player 2
                    const enemyShip = new Ship(200, 200, 'battleship', star, mockGame, 2);
                    enemyShip.progress = 100; // Set to completed construction
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    test.assertFalse(enemyShip.isInFleet(), 'Enemy ship should not be in fleet initially');
                    
                    // Simulate enemy ship arriving at fleet by calling ship arrival logic
                    enemyShip.destination = fleet;
                    enemyShip.x = fleet.x;
                    enemyShip.y = fleet.y;
                    enemyShip.arriveAtDestination();
                    
                    // Verify enemy ship was NOT added to the fleet
                    test.assertFalse(enemyShip.isInFleet(), 'Enemy ship should not be in fleet after arrival');
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should still contain 1 ship after enemy arrival');
                });
                
                test.it('should not form fleet when fleet arrives at enemy ship', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a fleet owned by player 1
                    const fleet = mockGame.factory.createFleet(200, 200, 1);
                    const ship1 = new Ship(200, 200, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    fleet.addShip(ship1);
                    
                    // Create an enemy ship owned by player 2
                    const enemyShip = new Ship(100, 100, 'battleship', star, mockGame, 2);
                    enemyShip.progress = 100; // Set to completed construction
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    test.assertFalse(enemyShip.isInFleet(), 'Enemy ship should not be in fleet initially');
                    
                    // Simulate fleet arriving at enemy ship by calling fleet arrival logic
                    fleet.destination = enemyShip;
                    fleet.x = enemyShip.x;
                    fleet.y = enemyShip.y;
                    fleet.arriveAtDestination();
                    
                    // Verify enemy ship was NOT added to the fleet
                    test.assertFalse(enemyShip.isInFleet(), 'Enemy ship should not be in fleet after fleet arrival');
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should still contain 1 ship after arriving at enemy');
                });
                
                test.it('should handle fleet arrival at star correctly', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a fleet
                    const fleet = mockGame.factory.createFleet(200, 200, 1);
                    const ship1 = new Ship(200, 200, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    fleet.addShip(ship1);
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    
                    // Simulate fleet arriving at star by calling fleet arrival logic
                    fleet.destination = star;
                    fleet.x = star.x;
                    fleet.y = star.y;
                    fleet.arriveAtDestination();
                    
                    // Verify fleet arrived at star (no fleet formation should occur)
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should still contain 1 ship after arriving at star');
                    test.assertEqual(fleet.destination, null, 'Fleet destination should be cleared after arrival');
                });
                
                test.it('should handle multiple ship arrivals at fleet in sequence', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a fleet first
                    const fleet = mockGame.factory.createFleet(100, 100, 1);
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    fleet.addShip(ship1);
                    
                    // Create multiple ships that will arrive at the fleet
                    const ship2 = new Ship(200, 200, 'battleship', star, mockGame, 1);
                    ship2.progress = 100; // Set to completed construction
                    const ship3 = new Ship(300, 300, 'colony', star, mockGame, 1);
                    ship3.progress = 100; // Set to completed construction
                    
                    // Verify initial state
                    test.assertEqual(fleet.getSize(), 1, 'Fleet should initially contain 1 ship');
                    
                    // Simulate ship2 arriving at the fleet
                    ship2.destination = fleet;
                    ship2.x = fleet.x;
                    ship2.y = fleet.y;
                    ship2.arriveAtDestination();
                    
                    // Verify ship2 was added
                    test.assertEqual(fleet.getSize(), 2, 'Fleet should contain 2 ships after first arrival');
                    test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet');
                    
                    // Simulate ship3 arriving at the fleet
                    ship3.destination = fleet;
                    ship3.x = fleet.x;
                    ship3.y = fleet.y;
                    ship3.arriveAtDestination();
                    
                    // Verify ship3 was added
                    test.assertEqual(fleet.getSize(), 3, 'Fleet should contain 3 ships after second arrival');
                    test.assertTrue(ship3.isInFleet(), 'Ship3 should be in fleet');
                });
                
                test.it('should handle multiple fleet arrivals at ship in sequence', () => {
                    // Mock game object with fleet formation handling
                    const mockGame = {
                        players: [],
                        entityAdded: () => {},
                        entityRemoved: () => {},
                        allFleets: [],
                        rules: {
                            getShipInitialSpeed: () => 10
                        },
                        factory: {
                            createFleet: (x, y, owner) => {
                                const fleet = new Fleet(x, y, mockGame, owner);
                                mockGame.allFleets.push(fleet);
                                return fleet;
                            },
                            isFleet: (object) => {
                                return object instanceof Fleet;
                            },
                            isShip: (object) => {
                                return object instanceof Ship;
                            },
                            isStar: (object) => {
                                return object instanceof Star;
                            }
                        },
                        handleFleetFormation: function(entity1, entity2) {
                            // Check if either entity is already a fleet
                            const entity1Type = this.getObjectType(entity1);
                            const entity2Type = this.getObjectType(entity2);
                            
                            if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
                                // Both entities are fleets - merge them
                                if (entity1 !== entity2) {
                                    this.mergeFleets(entity1, entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.SHIP) {
                                // Fleet arrived at a ship - check if ship is in a fleet
                                if (entity2.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1, entity2.fleet);
                                } else if (entity2.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity1.addShip(entity2);
                                }
                            } else if (entity1Type === Common.ObjectType.SHIP && entity2Type === Common.ObjectType.FLEET) {
                                // Ship arrived at a fleet - check if ship is in a fleet
                                if (entity1.isInFleet()) {
                                    // Ship is in a fleet, merge the fleets
                                    this.mergeFleets(entity1.fleet, entity2);
                                } else if (entity1.canFormFleet()) {
                                    // Ship is not in a fleet, add it to the fleet
                                    entity2.addShip(entity1);
                                }
                            } else if (entity1Type === Common.ObjectType.FLEET) {
                                // Entity1 is a fleet, add entity2 to it if it can form a fleet
                                if (entity2.canFormFleet()) {
                                    entity1.addShip(entity2);
                                }
                            } else if (entity2Type === Common.ObjectType.FLEET) {
                                // Entity2 is a fleet, add entity1 to it if it can form a fleet
                                if (entity1.canFormFleet()) {
                                    entity2.addShip(entity1);
                                }
                            } else {
                                // Both entities are ships - check if either ship is already in a fleet
                                if (entity1.isInFleet() && entity2.isInFleet()) {
                                    // Both ships are in fleets - merge the fleets
                                    if (entity1.fleet !== entity2.fleet) {
                                        this.mergeFleets(entity1.fleet, entity2.fleet);
                                    }
                                } else if (entity1.isInFleet()) {
                                    // Ship1 is in a fleet, add ship2 to it
                                    entity1.fleet.addShip(entity2);
                                } else if (entity2.isInFleet()) {
                                    // Ship2 is in a fleet, add ship1 to it
                                    entity2.fleet.addShip(entity1);
                                } else {
                                    // Neither ship is in a fleet, create a new fleet
                                    const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                                    fleet.addShip(entity1);
                                    fleet.addShip(entity2);
                                }
                            }
                        },
                        mergeFleets: function(fleet1, fleet2) {
                            // Add all ships from fleet2 to fleet1
                            const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
                            for (const ship of shipsToMove) {
                                fleet1.addShip(ship);
                            }
                            
                            // Remove the empty fleet2
                            const index = this.allFleets.indexOf(fleet2);
                            if (index > -1) {
                                this.allFleets.splice(index, 1);
                            }
                        },
                        getObjectType: function(object) {
                            if (this.factory.isFleet(object)) {
                                return Common.ObjectType.FLEET;
                            } else if (this.factory.isShip(object)) {
                                return Common.ObjectType.SHIP;
                            } else if (this.factory.isStar(object)) {
                                return Common.ObjectType.STAR;
                            }
                            return Common.ObjectType.UNKNOWN;
                        },
                        noteworthyEvent: function(who, what, where, how, why, other) {
                            // Mock implementation - just log for testing
                            console.log(`Noteworthy event: ${who.type} ${what} ${where.type}`);
                        }
                    };
                    
                    // Create real star for ships
                    const star = new Star(100, 100, 'Test Star', mockGame);
                    
                    // Create a ship first
                    const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
                    ship1.progress = 100; // Set to completed construction
                    
                    // Create multiple fleets that will arrive at the ship
                    const fleet1 = mockGame.factory.createFleet(200, 200, 1);
                    const ship2 = new Ship(200, 200, 'battleship', star, mockGame, 1);
                    ship2.progress = 100; // Set to completed construction
                    fleet1.addShip(ship2);
                    
                    const fleet2 = mockGame.factory.createFleet(300, 300, 1);
                    const ship3 = new Ship(300, 300, 'colony', star, mockGame, 1);
                    ship3.progress = 100; // Set to completed construction
                    fleet2.addShip(ship3);
                    
                    // Verify initial state
                    test.assertEqual(fleet1.getSize(), 1, 'Fleet1 should initially contain 1 ship');
                    test.assertEqual(fleet2.getSize(), 1, 'Fleet2 should initially contain 1 ship');
                    test.assertFalse(ship1.isInFleet(), 'Ship1 should not be in fleet initially');
                    
                    // Simulate fleet1 arriving at ship1
                    fleet1.destination = ship1;
                    fleet1.x = ship1.x;
                    fleet1.y = ship1.y;
                    fleet1.arriveAtDestination();
                    
                    // Verify ship1 was added to fleet1
                    test.assertEqual(fleet1.getSize(), 2, 'Fleet1 should contain 2 ships after first arrival');
                    test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet1');
                    test.assertEqual(ship1.fleet, fleet1, 'Ship1 should be in fleet1');
                    
                    // Simulate fleet2 arriving at ship1 (now in fleet1)
                    fleet2.destination = ship1;
                    fleet2.x = ship1.x;
                    fleet2.y = ship1.y;
                    fleet2.arriveAtDestination();
                    
                    // Verify fleet2 was merged with fleet1
                    // After merge, all ships should be in one fleet (fleet2)
                    test.assertEqual(fleet2.getSize(), 3, 'Fleet2 should contain 3 ships after merge');
                    test.assertEqual(mockGame.allFleets.length, 1, 'Should have 1 fleet after merge');
                    test.assertEqual(ship1.fleet, fleet2, 'Ship1 should be in fleet2');
                    test.assertEqual(ship2.fleet, fleet2, 'Ship2 should be in fleet2');
                    test.assertEqual(ship3.fleet, fleet2, 'Ship3 should be in fleet2');
                });
    
        test.it('should add ship to existing fleet when intercepting', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        ship2.fleet.addShip(ship1);
                    } else {
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    const shipsToMove = [...fleet2.ships];
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create a fleet with one ship
            const fleet = mockGame.factory.createFleet(100, 100, 1);
            const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
            fleet.addShip(ship1);
            
            // Create another ship at the same location
            const ship2 = new Ship(100, 100, 'battleship', star, mockGame, 1);
            mockGame.entityAdded(ship2);
            
            // Verify initial state
            test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet initially');
            test.assertFalse(ship2.isInFleet(), 'Ship2 should not be in fleet initially');
            test.assertEqual(fleet.getSize(), 1, 'Fleet should have 1 ship initially');
            
            // Simulate ship interception
            mockGame.handleFleetFormation(ship2, ship1);
            
            // Verify ship2 was added to the existing fleet
            test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet after interception');
            test.assertEqual(ship1.fleet, ship2.fleet, 'Both ships should be in the same fleet');
            test.assertEqual(fleet.getSize(), 2, 'Fleet should contain 2 ships');
        });
        
        test.it('should merge fleets when ships from different fleets intercept', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        ship2.fleet.addShip(ship1);
                    } else {
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    const shipsToMove = [...fleet2.ships];
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create two separate fleets
            const fleet1 = mockGame.factory.createFleet(100, 100, 1);
            const fleet2 = mockGame.factory.createFleet(100, 100, 1);
            
            const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
            const ship2 = new Ship(100, 100, 'battleship', star, mockGame, 1);
            
            fleet1.addShip(ship1);
            fleet2.addShip(ship2);
            
            // Verify initial state
            test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet1 initially');
            test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet2 initially');
            test.assertEqual(fleet1.getSize(), 1, 'Fleet1 should have 1 ship initially');
            test.assertEqual(fleet2.getSize(), 1, 'Fleet2 should have 1 ship initially');
            
            // Simulate ship interception
            mockGame.handleFleetFormation(ship1, ship2);
            
            // Verify fleets were merged
            test.assertTrue(ship1.isInFleet(), 'Ship1 should still be in fleet after merge');
            test.assertTrue(ship2.isInFleet(), 'Ship2 should still be in fleet after merge');
            test.assertEqual(ship1.fleet, ship2.fleet, 'Both ships should be in the same fleet after merge');
            test.assertEqual(ship1.fleet.getSize(), 2, 'Merged fleet should contain 2 ships');
            
            // Verify one fleet was removed
            const remainingFleets = mockGame.allFleets.filter(f => f.getSize() > 0);
            test.assertEqual(remainingFleets.length, 1, 'Only one fleet should remain after merge');
        });
        
        test.it('should not form fleet when enemy ships intercept', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    // Only form fleets for friendly ships
                    if (ship1.owner !== ship2.owner) {
                        return; // Don't form fleet for enemy ships
                    }
                    
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        ship2.fleet.addShip(ship1);
                    } else {
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    const shipsToMove = [...fleet2.ships];
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create two enemy ships at the same location
            const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
            const ship2 = new Ship(100, 100, 'battleship', star, mockGame, 2);
            
            mockGame.entityAdded(ship1);
            mockGame.entityAdded(ship2);
            
            // Verify ships are not in fleets initially
            test.assertFalse(ship1.isInFleet(), 'Ship1 should not be in fleet initially');
            test.assertFalse(ship2.isInFleet(), 'Ship2 should not be in fleet initially');
            
            // Simulate ship interception
            mockGame.handleFleetFormation(ship1, ship2);
            
            // Verify ships are still not in fleets (enemy ships don't form fleets)
            test.assertFalse(ship1.isInFleet(), 'Ship1 should not be in fleet after enemy interception');
            test.assertFalse(ship2.isInFleet(), 'Ship2 should not be in fleet after enemy interception');
            
            // Verify no fleets were created
            test.assertEqual(mockGame.allFleets.length, 0, 'No fleets should be created for enemy ships');
        });
        
        test.it('should not form fleet when ships cannot form fleets', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    // Only form fleets for ships that can form fleets
                    if (!ship1.canFormFleet() || !ship2.canFormFleet()) {
                        return; // Don't form fleet for ships that can't form fleets
                    }
                    
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        ship2.fleet.addShip(ship1);
                    } else {
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    const shipsToMove = [...fleet2.ships];
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create two friendly ships that cannot form fleets (defense satellites)
            const ship1 = new Ship(100, 100, 'defense', star, mockGame, 1);
            const ship2 = new Ship(100, 100, 'defense', star, mockGame, 1);
            
            mockGame.entityAdded(ship1);
            mockGame.entityAdded(ship2);
            
            // Verify ships cannot form fleets
            test.assertFalse(ship1.canFormFleet(), 'Defense ship should not be able to form fleet');
            test.assertFalse(ship2.canFormFleet(), 'Defense ship should not be able to form fleet');
            
            // Simulate ship interception
            mockGame.handleFleetFormation(ship1, ship2);
            
            // Verify ships are still not in fleets
            test.assertFalse(ship1.isInFleet(), 'Defense ship should not be in fleet after interception');
            test.assertFalse(ship2.isInFleet(), 'Defense ship should not be in fleet after interception');
            
            // Verify no fleets were created
            test.assertEqual(mockGame.allFleets.length, 0, 'No fleets should be created for defense ships');
        });
        
        test.it('should handle multiple ship interceptions in sequence', () => {
            // Mock game object with fleet formation handling
            const mockGame = {
                players: [],
                entityAdded: () => {},
                entityRemoved: () => {},
                allFleets: [],
                rules: {
                    getShipInitialSpeed: () => 10
                },
                factory: {
                    createFleet: (x, y, owner) => {
                        const Fleet = require('../src/js/fleet.js');
                        const fleet = new Fleet(x, y, mockGame, owner);
                        mockGame.allFleets.push(fleet);
                        return fleet;
                    }
                },
                handleFleetFormation: function(ship1, ship2) {
                    if (ship1.isInFleet() && ship2.isInFleet()) {
                        if (ship1.fleet !== ship2.fleet) {
                            this.mergeFleets(ship1.fleet, ship2.fleet);
                        }
                    } else if (ship1.isInFleet()) {
                        ship1.fleet.addShip(ship2);
                    } else if (ship2.isInFleet()) {
                        ship2.fleet.addShip(ship1);
                    } else {
                        const fleet = this.factory.createFleet(ship1.x, ship1.y, ship1.owner);
                        fleet.addShip(ship1);
                        fleet.addShip(ship2);
                    }
                },
                mergeFleets: function(fleet1, fleet2) {
                    const shipsToMove = [...fleet2.ships];
                    for (const ship of shipsToMove) {
                        fleet1.addShip(ship);
                    }
                    const index = this.allFleets.indexOf(fleet2);
                    if (index > -1) {
                        this.allFleets.splice(index, 1);
                    }
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const Star = require('../src/js/star.js');
            
            // Create real star for ships
            const star = new Star(100, 100, 'Test Star', mockGame);
            
            // Create three friendly ships
            const ship1 = new Ship(100, 100, 'scout', star, mockGame, 1);
            const ship2 = new Ship(100, 100, 'battleship', star, mockGame, 1);
            const ship3 = new Ship(100, 100, 'colony', star, mockGame, 1);
            
            mockGame.entityAdded(ship1);
            mockGame.entityAdded(ship2);
            mockGame.entityAdded(ship3);
            
            // First interception: ship1 and ship2
            mockGame.handleFleetFormation(ship1, ship2);
            
            // Verify fleet was created with 2 ships
            test.assertTrue(ship1.isInFleet(), 'Ship1 should be in fleet after first interception');
            test.assertTrue(ship2.isInFleet(), 'Ship2 should be in fleet after first interception');
            test.assertEqual(ship1.fleet.getSize(), 2, 'Fleet should have 2 ships after first interception');
            
            // Second interception: ship3 joins the fleet
            mockGame.handleFleetFormation(ship3, ship1);
            
            // Verify all ships are in the same fleet
            test.assertTrue(ship3.isInFleet(), 'Ship3 should be in fleet after second interception');
            test.assertEqual(ship1.fleet, ship2.fleet, 'Ship1 and ship2 should be in same fleet');
            test.assertEqual(ship1.fleet, ship3.fleet, 'Ship1 and ship3 should be in same fleet');
            test.assertEqual(ship1.fleet.getSize(), 3, 'Fleet should contain all 3 ships');
        });
    });
}

module.exports = runFleetFormationTests;
