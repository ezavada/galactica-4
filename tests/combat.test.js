// Combat system tests for Galactica-4
// Tests combat mechanics, damage calculations, and multi-target combat

const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Common = require('../src/js/common.js');

function createRuntimeCombatGame() {
    const factory = new Factory();
    const rules = new Rules(false);
    const config = GameConfig.createSinglePlayer(1, 2);
    config.skipMapGeneration = true;
    return new Game(factory, rules, config);
}

function createOwnedStar(game, x, y, name, owner, techLevel = 1, population = 0) {
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
    ship.complete();
    ship.star = star;
    if (!star.ships.includes(ship)) {
        star.ships.push(ship);
    }
    return ship;
}

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
            
            // v3 uses tech level as battleship power, so level 3 attacks at 3 * 50.
            test.assertEqual(ship.getAttackStrength(), 150);
            
            // Add some damage
            ship.damage = 50;
            // v3 ship damage affects defense, not attack strength.
            test.assertEqual(ship.getAttackStrength(), 150);
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
            
            // Defense strength = (power * 100) - damage = (3 * 100) - 0 = 300
            test.assertEqual(ship.getDefenseStrength(), 300);
            
            // Add some damage
            ship.damage = 100;
            test.assertEqual(ship.getDefenseStrength(), 200);
        });
        
        test.it('should calculate star attack and defense strength', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Star = require('../src/js/star.js');
            const star = new Star(0, 0, 'Test Star', mockGame);
            
            star.population = 100;
            star.techLevel = 1;
            
            // v3 log-scaled formula: log10(100k)^2 * 5 - 50 = 75 at tech 1.
            test.assertEqual(star.getAttackStrength(), 75);
            
            test.assertEqual(star.getDefenseStrength(), 75);

            star.population = 9;
            test.assertEqual(star.getDefenseStrength(), 0, 'Tiny populations should not provide defensive strength');
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
            
            // Defense strength = (3 * 100) - 700 = -400
            // Excess damage = 400
            test.assertEqual(excessDamage2, 400);
        });
        
        test.it('should apply damage correctly to stars', () => {
            const mockGame = {
                players: [],
                entityAdded: () => {}
            };
            
            const Star = require('../src/js/star.js');
            const star = new Star(0, 0, 'Test Star', mockGame);
            
            star.population = 1000000;
            star.techLevel = 10;
            star.shipBuilding.benefit = 12;
            star.research.benefit = 9;
            
            // v3 population damage scales with population concentration and does not roll over.
            const excessDamage = star.takeDamage(100);
            
            test.assertEqual(star.population, 934694);
            test.assertEqual(excessDamage, 0);
            test.assertApproximately(star.shipBuilding.benefit, 11.988, 0.0001);
            test.assertApproximately(star.research.benefit, 8.991, 0.0001);
            
            // Planets can be neutralized, but damage still does not roll over to other targets.
            const excessDamage2 = star.takeDamage(100000);
            
            test.assertEqual(star.population, 0);
            test.assertEqual(excessDamage2, 0);
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

        test.it('removes enemy docked ships when an arriving ship wins space combat', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const target = createOwnedStar(game, 1000, 0, 'Target', 2, 1, 100);
            const attacker = createCompletedShip(game, origin, 'battleship', 20);
            const defender = createCompletedShip(game, target, 'scout', 1);

            attacker.getOneAttackAgainst = () => 10000;
            defender.getOneAttackAgainst = () => 0;

            attacker.setDestination(target);
            attacker.move();

            test.assertContains(game.allShips, attacker, 'Attacker should still be tracked');
            test.assertFalse(game.allShips.includes(defender), 'Destroyed defender should be removed from game ships');
            test.assertFalse(target.ships.includes(defender), 'Destroyed defender should be removed from the star');
            test.assertContains(target.ships, attacker, 'Attacker should be docked at the target star');
        });

        test.it('records a player-facing combat summary after battle resolution', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const target = createOwnedStar(game, 1000, 0, 'Target', 2, 1, 5);
            const attacker = createCompletedShip(game, origin, 'battleship', 20);

            attacker.getOneAttackAgainst = () => 100000;
            target.getOneAttackAgainst = () => 0;

            attacker.setDestination(target);
            attacker.move();

            const event = game.eventLog.find(entry => entry.type === Common.EventType.BATTLE_RESOLVED);
            test.assertDefined(event, 'Combat should record a summary event');
            test.assertEqual(event.title, 'Combat');
            test.assertContains(event.message, 'Combat at Target');
            test.assertContains(event.message, 'attacker victory');
        });

        test.it('resolves enemy ship interception as combat instead of fleet formation', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const enemyBase = createOwnedStar(game, 1000, 0, 'Enemy Base', 2, 1, 100);
            const attacker = createCompletedShip(game, origin, 'battleship', 20);
            const defender = createCompletedShip(game, enemyBase, 'scout', 1);

            attacker.getOneAttackAgainst = () => 10000;
            defender.getOneAttackAgainst = () => 0;

            attacker.setDestination(defender);
            attacker.move();

            test.assertFalse(game.allShips.includes(defender), 'Intercepted enemy ship should be destroyed');
            test.assertEqual(game.allFleets.length, 0, 'Enemy interception should not create a fleet');
            test.assertFalse(attacker.isInFleet(), 'Attacker should remain an individual ship');
        });

        test.it('lets a surviving colony ship capture a defeated enemy star', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const target = createOwnedStar(game, 1000, 0, 'Enemy Colony', 2, 1, 5);
            const colony = createCompletedShip(game, origin, 'colony', 20);

            colony.getOneAttackAgainst = () => 100000;
            target.getOneAttackAgainst = () => 0;

            colony.setDestination(target);
            colony.move();

            test.assertEqual(target.owner, 1, 'Target star should be captured by the colony owner');
            test.assertGreaterThan(target.population, 0, 'Captured star should retain colonized population');
            test.assertFalse(game.allShips.includes(colony), 'Colony ship should be converted into the colony');
            test.assertFalse(target.ships.includes(colony), 'Converted colony ship should be removed from the star ship list');
        });

        test.it('updates defeat and victory immediately after a last-star capture', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = new GameConfig({
                numHumans: 0,
                numComputers: 2,
                skipMapGeneration: true,
                aiSkillByPlayer: { 1: 1, 2: 2 },
                omniscient: true
            });
            const game = new Game(factory, rules, config);
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const target = createOwnedStar(game, 1000, 0, 'Enemy Home', 2, 1, 5);
            const colony = createCompletedShip(game, origin, 'colony', 20);

            game.updatePlayerPieceCounts();
            colony.getOneAttackAgainst = () => 100000;
            target.getOneAttackAgainst = () => 0;

            colony.setDestination(target);
            colony.move();

            test.assertFalse(game.players[2].isAlive, 'Defeated player should be marked dead after losing the last star');
            test.assertTrue(game.isGameOver, 'Game should end as soon as one active player remains');
            test.assertEqual(game.winningPlayerNum, 1);
            test.assertContains(game.getRecentEvents(8).map(event => event.title), 'Victory');
        });

        test.it('keeps surviving non-colony attackers outside an enemy star that still holds', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 20, 100);
            const target = createOwnedStar(game, 1000, 0, 'Fortress', 2, 20, 1000000);
            const attacker = createCompletedShip(game, origin, 'battleship', 20);

            attacker.getOneAttackAgainst = () => 1;
            target.getOneAttackAgainst = () => 0;

            attacker.setDestination(target);
            attacker.move();

            test.assertContains(game.allShips, attacker, 'Attacker should survive the inconclusive attack');
            test.assertNull(attacker.star, 'Attacker should not remain docked inside a hostile star');
            test.assertFalse(target.ships.includes(attacker), 'Hostile star should not retain the attacker as a docked ship');
            test.assertEqual(target.owner, 2, 'Target should still belong to the defender');
        });

        test.it('removes an attacker that loses arrival combat and leaves defenders intact', () => {
            const game = createRuntimeCombatGame();
            const origin = createOwnedStar(game, 0, 0, 'Origin', 1, 1, 100);
            const target = createOwnedStar(game, 1000, 0, 'Defended Target', 2, 20, 100);
            const attacker = createCompletedShip(game, origin, 'scout', 1);
            const defender = createCompletedShip(game, target, 'battleship', 20);

            attacker.getOneAttackAgainst = () => 0;
            defender.getOneAttackAgainst = () => 10000;

            attacker.setDestination(target);
            attacker.move();

            test.assertFalse(game.allShips.includes(attacker), 'Destroyed attacker should be removed from game ships');
            test.assertContains(game.allShips, defender, 'Winning defender should remain in game ships');
            test.assertContains(target.ships, defender, 'Winning defender should remain docked at the target star');
            test.assertEqual(target.owner, 2, 'Defended target should keep its owner');
        });

        test.it('treats same-owner ships as allies even without entity-specific ally methods', () => {
            const CombatSystem = require('../src/js/combat.js');
            const combatSystem = new CombatSystem({ players: [] });
            const ownShip = { type: 'battleship', owner: 1 };
            const enemyShip = { type: 'scout', owner: 2 };
            const forces = [ownShip, enemyShip];

            const defenderOwner = combatSystem.removeAllies(forces, 1);

            test.assertEqual(forces.length, 1);
            test.assertEqual(forces[0], enemyShip);
            test.assertEqual(defenderOwner, 2);
        });
    });
}

module.exports = runCombatTests;
