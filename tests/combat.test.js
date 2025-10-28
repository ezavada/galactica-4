// Combat system tests for Galactica-4
// Tests combat mechanics, damage calculations, and multi-target combat

const test = require('./test-framework.js');

function runCombatTests() {
    test.describe('Combat System', () => {
        
        // Set up deterministic random seed for tests
        pdg.srand(42); // Use seed 42 for reproducible tests
        
        test.it('should calculate ship attack strength correctly', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {},
                rules: {
                    getShipInitialSpeed: () => 10
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const mockStar = {
                techLevel: 3,
                owner: 1
            };
            
            const ship = new Ship(0, 0, 'battleship', mockStar, mockGame, 1);
            
            // Battleship with power 5 + techLevel/2 = 5 + 1 = 6
            // Attack strength = power * 50 = 6 * 50 = 300
            test.assertEqual(ship.getAttackStrength(), 300);
            
            // Add some damage
            ship.damage = 50;
            // Attack strength = (power * 50) - (damage/8) = 300 - 6 = 294
            test.assertEqual(ship.getAttackStrength(), 294);
        });
        
        test.it('should calculate ship defense strength correctly', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {},
                rules: {
                    getShipInitialSpeed: () => 10
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const mockStar = {
                techLevel: 3,
                owner: 1
            };
            
            const ship = new Ship(0, 0, 'battleship', mockStar, mockGame, 1);
            
            // Defense strength = (power * 100) - damage = (6 * 100) - 0 = 600
            test.assertEqual(ship.getDefenseStrength(), 600);
            
            // Add some damage
            ship.damage = 100;
            // Defense strength = (6 * 100) - 100 = 500
            test.assertEqual(ship.getDefenseStrength(), 500);
        });
        
        test.it('should calculate star attack and defense strength', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Star = require('../src/js/star.js');
            const star = new Star(0, 0, 'Test Star', mockGame);
            
            star.population = 100;
            
            // Attack strength = population * 10 = 100 * 10 = 1000
            test.assertEqual(star.getAttackStrength(), 1000);
            
            // Defense strength = population * 100 = 100 * 100 = 10000
            test.assertEqual(star.getDefenseStrength(), 10000);
        });
        
        test.it('should apply damage correctly to ships', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {},
                rules: {
                    getShipInitialSpeed: () => 10
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const mockStar = {
                techLevel: 3,
                owner: 1
            };
            
            const ship = new Ship(0, 0, 'battleship', mockStar, mockGame, 1);
            
            // Apply 200 damage
            const excessDamage = ship.takeDamage(200);
            
            test.assertEqual(ship.damage, 200);
            test.assertEqual(excessDamage, 0); // Ship not destroyed yet
            
            // Apply more damage to destroy ship
            const excessDamage2 = ship.takeDamage(500);
            
            // Defense strength = (6 * 100) - 700 = -100
            // Excess damage = 100
            test.assertEqual(excessDamage2, 100);
        });
        
        test.it('should apply damage correctly to stars', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Star = require('../src/js/star.js');
            const star = new Star(0, 0, 'Test Star', mockGame);
            
            star.population = 100;
            
            // Apply 500 damage (should kill 5 population)
            const excessDamage = star.takeDamage(500);
            
            test.assertEqual(star.population, 95); // 100 - 5
            test.assertEqual(excessDamage, 0); // Star not destroyed yet
            
            // Apply more damage to destroy population
            const excessDamage2 = star.takeDamage(10000);
            
            test.assertEqual(star.population, 0);
            test.assertEqual(excessDamage2, 500); // 10000 - (95 * 100) = 500 excess damage
            
            // Test with actual excess damage
            star.population = 10;
            const excessDamage3 = star.takeDamage(2000); // 2000 damage, kills 20 population, but only 10 exist
            test.assertEqual(star.population, 0);
            test.assertEqual(excessDamage3, 1000); // 2000 - (10 * 100) = 1000 excess damage
        });
        
        test.it('should use PDG random for damage variance', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {},
                rules: {
                    getShipInitialSpeed: () => 10
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const mockStar = {
                techLevel: 3,
                owner: 1
            };
            
            const ship = new Ship(0, 0, 'battleship', mockStar, mockGame, 1);
            const defender = new Ship(0, 0, 'scout', mockStar, mockGame, 2);
            
            // Reset random seed for deterministic test
            pdg.srand(42);
            
            // Get attack damage (should be deterministic with same seed)
            const damage1 = ship.getOneAttackAgainst(defender);
            
            // Reset seed and get damage again
            pdg.srand(42);
            const damage2 = ship.getOneAttackAgainst(defender);
            
            test.assertEqual(damage1, damage2); // Should be identical with same seed
            
            // Test that damage varies with different seeds
            pdg.srand(123);
            const damage3 = ship.getOneAttackAgainst(defender);
            
            // Damage should be different with different seed (very likely)
            test.assertNotEqual(damage1, damage3);
        });
        
        test.it('should handle ship death correctly', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {},
                rules: {
                    getShipInitialSpeed: () => 10
                }
            };
            
            const Ship = require('../src/js/ship.js');
            const mockStar = {
                techLevel: 3,
                owner: 1
            };
            
            const ship = new Ship(0, 0, 'battleship', mockStar, mockGame, 1);
            
            test.assertEqual(ship.isDead(), false);
            
            // Apply enough damage to destroy ship
            ship.takeDamage(1000);
            
            test.assertEqual(ship.isDead(), true);
        });
        
        test.it('should handle star death correctly', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Star = require('../src/js/star.js');
            const star = new Star(0, 0, 'Test Star', mockGame);
            
            star.population = 100;
            
            test.assertEqual(star.isDead(), false);
            
            // Wipe out population
            star.population = 0;
            
            test.assertEqual(star.isDead(), true);
        });
        
        test.it('should sort out reserves correctly', () => {
            const CombatSystem = require('../src/js/combat.js');
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const combatSystem = new CombatSystem(mockGame);
            
            // Create mock entities
            const battleship = { type: 'battleship', isFleet: () => false };
            const scout = { type: 'scout', isFleet: () => false };
            const colony = { type: 'colony', isFleet: () => false };
            const fleet = { type: 'fleet', isFleet: () => true, recordCombatInfo: () => {} };
            
            const forces = [battleship, scout, colony, fleet];
            const reserves = [];
            const fleets = [];
            
            combatSystem.sortOutReserves(forces, reserves, fleets);
            
            // Battleship should remain in forces
            test.assertEqual(forces.length, 1);
            test.assertEqual(forces[0], battleship);
            
            // Scout and colony should go to reserves
            test.assertEqual(reserves.length, 2);
            test.assertContains(reserves, scout);
            test.assertContains(reserves, colony);
            
            // Fleet should go to fleets
            test.assertEqual(fleets.length, 1);
            test.assertEqual(fleets[0], fleet);
        });
        
        test.it('should remove dead entities correctly', () => {
            const CombatSystem = require('../src/js/combat.js');
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const combatSystem = new CombatSystem(mockGame);
            
            const aliveEntity = { type: 'battleship', isDead: () => false };
            const deadEntity = { type: 'scout', isDead: () => true };
            
            const forces = [aliveEntity, deadEntity];
            
            combatSystem.removeDead(forces);
            
            test.assertEqual(forces.length, 1);
            test.assertEqual(forces[0], aliveEntity);
        });
        
        test.it('should remove allies correctly', () => {
            const CombatSystem = require('../src/js/combat.js');
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const combatSystem = new CombatSystem(mockGame);
            
            const allyEntity = { type: 'battleship', owner: 1, isAllyOf: (id) => id === 1 };
            const enemyEntity = { type: 'scout', owner: 2, isAllyOf: (id) => id === 2 };
            const neutralEntity = { type: 'colony', owner: 0, isAllyOf: () => false };
            
            const forces = [allyEntity, enemyEntity, neutralEntity];
            
            const defenderOwner = combatSystem.removeAllies(forces, 1);
            
            test.assertEqual(forces.length, 1);
            test.assertEqual(forces[0], enemyEntity);
            test.assertEqual(defenderOwner, 2);
        });
        
        test.it('should check ship class in forces', () => {
            const CombatSystem = require('../src/js/combat.js');
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const combatSystem = new CombatSystem(mockGame);
            
            const battleship = { type: 'battleship' };
            const scout = { type: 'scout' };
            
            const forces = [battleship, scout];
            
            test.assertEqual(combatSystem.hasShipClass(forces, 'battleship'), true);
            test.assertEqual(combatSystem.hasShipClass(forces, 'scout'), true);
            test.assertEqual(combatSystem.hasShipClass(forces, 'colony'), false);
        });
        
        test.it('should handle combat resolution', () => {
            const CombatSystem = require('../src/js/combat.js');
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const combatSystem = new CombatSystem(mockGame);
            
            // Create mock attacker
            const attacker = {
                type: 'battleship',
                owner: 1,
                getAttackStrength: () => 300,
                getDefenseStrength: () => 600,
                getOneAttackAgainst: () => 150,
                takeDamage: () => 0,
                isDead: () => false
            };
            
            // Create mock destination with defenders
            const defender = {
                type: 'scout',
                owner: 2,
                getAttackStrength: () => 50,
                getDefenseStrength: () => 100,
                getOneAttackAgainst: () => 25,
                takeDamage: () => 0,
                isDead: () => false
            };
            
            const destination = {
                name: 'Test Star',
                ships: [defender],
                isStar: () => true,
                isOwned: () => true,
                isAllyOf: () => false,
                supportsShips: () => true
            };
            
            // Mock the combat resolution
            const result = combatSystem.resolveCombat(attacker, destination);
            
            test.assertEqual(typeof result, 'object');
            test.assertEqual(typeof result.attackersWon, 'boolean');
            test.assertEqual(typeof result.defendersWon, 'boolean');
            test.assertEqual(typeof result.hasColony, 'boolean');
            test.assertEqual(typeof result.canColonize, 'boolean');
        });
    });
}

module.exports = runCombatTests;
