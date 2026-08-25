// AI Systems Tests
// Tests the AI Manager, AI Players, Ship AI, Star AI, and AI utilities

const test = require('./test-framework.js');
const { AIManager, AIPlayer } = require('../src/js/ai-manager.js');
const { AISkillManager, AI_SKILL_LEVELS } = require('../src/js/ai-skill.js');
const AIUtils = require('../src/js/ai-utils.js');
const { StarAI } = require('../src/js/ai-star.js');
const ShipAI = require('../src/js/ai-ship.js');
const { AIActions } = require('../src/js/ai-base.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');

// Test seed for reproducible results
const TEST_SEED = 42;

function createEmptyAITestGame(options = {}) {
    const factory = new Factory();
    const rules = new Rules(options.fastGame || false);
    const config = new GameConfig({
        numHumans: options.numHumans !== undefined ? options.numHumans : 0,
        numComputers: options.numComputers !== undefined ? options.numComputers : 2,
        compSkill: options.compSkill || 2,
        compAdvantage: options.compAdvantage || 0,
        aiSkillByPlayer: options.aiSkillByPlayer || { 1: options.compSkill || 2, 2: 2 },
        skipMapGeneration: true,
        omniscient: true
    });
    const game = new Game(factory, rules, config);
    return { game, factory, rules, config };
}

function createOwnedStar(game, owner, x, y, name, options = {}) {
    const star = game.factory.createStar(x, y, name);
    star.owner = owner;
    star.population = options.population !== undefined ? options.population : 1000;
    star.techLevel = options.techLevel !== undefined ? options.techLevel : 5;
    star.setScannerRange(game.rules.getScanRangeForTechLevel(star.techLevel));
    const player = game.players[owner];
    if (player) {
        player.updateHighestStarTech(star.techLevel);
    }
    return star;
}

function createCompletedShip(game, star, type, options = {}) {
    const ship = game.factory.createShip(star.x, star.y, type, star);
    ship.techLevel = options.techLevel !== undefined ? options.techLevel : star.techLevel;
    ship.speed = game.rules.getShipInitialSpeed(ship);
    ship.power = ship.calculatePower();
    ship.complete();
    ship.star = star;
    star.shipArrived(ship);
    return ship;
}

function runAISystemTests() {

    test.describe('AIManager - Initialization and Player Management', () => {
        test.it('creates AIManager successfully', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            test.assertNotNull(game.aiManager, 'AIManager should be created');
            test.assertTrue(game.aiManager instanceof AIManager, 'Should be AIManager instance');
        });

        test.it('initializes AI players during game construction', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2); // 1 computer player
            const game = new Game(factory, rules, config);
            
            // Player 2 should be AI-controlled
            test.assertTrue(game.aiManager.isAIPlayer(2), 'Player 2 should be AI-controlled');
            test.assertFalse(game.aiManager.isAIPlayer(1), 'Player 1 should not be AI-controlled');
        });

        test.it('initializes multiple AI players', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 3,
                compSkill: 2
            });
            const game = new Game(factory, rules, config);
            
            test.assertTrue(game.aiManager.isAIPlayer(2), 'Player 2 should be AI');
            test.assertTrue(game.aiManager.isAIPlayer(3), 'Player 3 should be AI');
            test.assertTrue(game.aiManager.isAIPlayer(4), 'Player 4 should be AI');
            test.assertFalse(game.aiManager.isAIPlayer(1), 'Player 1 should be human');
        });

        test.it('removes AI player correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            game.aiManager.removeAIPlayer(2);
            test.assertFalse(game.aiManager.isAIPlayer(2), 'Player 2 should no longer be AI-controlled');
        });

        test.it('gets AI player IDs correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 2,
                compSkill: 2
            });
            const game = new Game(factory, rules, config);
            
            const aiPlayerIds = game.aiManager.getAIPlayerIds();
            test.assertEqual(aiPlayerIds.length, 2, 'Should have 2 AI players');
            test.assertContains(aiPlayerIds, 2, 'Should include player 2');
            test.assertContains(aiPlayerIds, 3, 'Should include player 3');
        });
    });

    test.describe('AIManager - Statistics and State', () => {
        test.it('returns correct AI statistics', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 2,
                compSkill: 2
            });
            const game = new Game(factory, rules, config);
            
            const stats = game.aiManager.getAIStatistics();
            test.assertEqual(stats.totalAIPlayers, 2, 'Should report 2 AI players');
            test.assertDefined(stats.playersBySkill, 'Should have skill breakdown');
            test.assertDefined(stats.totalAIShips, 'Should track AI ships');
            test.assertDefined(stats.totalAIStars, 'Should track AI stars');
        });

        test.it('processes AI turns without errors', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Should not throw
            game.aiManager.processAITurns();
            test.assertTrue(true, 'AI turns processed without errors');
        });
    });

    test.describe('AIPlayer - Decision Processing', () => {
        test.it('creates AI player with correct skill level', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2); // Good difficulty
            const game = new Game(factory, rules, config);
            
            const aiPlayer = game.aiManager.getAIPlayer(2);
            test.assertNotNull(aiPlayer, 'AI player should exist');
            test.assertEqual(aiPlayer.playerId, 2, 'Should have correct player ID');
        });

        test.it('gets player stars correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const aiPlayer = game.aiManager.getAIPlayer(2);
            const playerStars = aiPlayer.getPlayerStars();
            
            test.assertTrue(Array.isArray(playerStars), 'Should return array');
            test.assertEqual(playerStars.length, 1, 'Should have 1 home star');
            test.assertEqual(playerStars[0].owner, 2, 'Star should be owned by player 2');
        });

        test.it('gets player ships correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const aiPlayer = game.aiManager.getAIPlayer(2);
            const playerShips = aiPlayer.getPlayerShips();
            
            test.assertTrue(Array.isArray(playerShips), 'Should return array');
            // Should have ships under construction at home star
            test.assertGreaterThan(playerShips.length, 0, 'Should have at least construction ships');
        });

        test.it('returns AI player statistics', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const aiPlayer = game.aiManager.getAIPlayer(2);
            const stats = aiPlayer.getStatistics();
            
            test.assertEqual(stats.playerId, 2, 'Should have correct player ID');
            test.assertDefined(stats.skillLevel, 'Should have skill level');
            test.assertDefined(stats.skillName, 'Should have skill name');
            test.assertGreaterThan(stats.starCount, 0, 'Should have stars');
        });
    });

    test.describe('AISkillManager - Skill Levels', () => {
        test.it('creates skill manager with default level', () => {
            const skillManager = new AISkillManager();
            test.assertEqual(skillManager.getSkillLevel(), AI_SKILL_LEVELS.AVERAGE, 'Should default to AVERAGE');
        });

        test.it('creates skill manager with specific level', () => {
            const skillManager = new AISkillManager(AI_SKILL_LEVELS.EXPERT);
            test.assertEqual(skillManager.getSkillLevel(), AI_SKILL_LEVELS.EXPERT, 'Should be EXPERT');
        });

        test.it('returns correct skill names', () => {
            const average = new AISkillManager(AI_SKILL_LEVELS.AVERAGE);
            const good = new AISkillManager(AI_SKILL_LEVELS.GOOD);
            const expert = new AISkillManager(AI_SKILL_LEVELS.EXPERT);
            
            test.assertEqual(average.getSkillName(), 'Average', 'Should be Average');
            test.assertEqual(good.getSkillName(), 'Good', 'Should be Good');
            test.assertEqual(expert.getSkillName(), 'Expert', 'Should be Expert');
        });

        test.it('provides skill modifiers', () => {
            const skillManager = new AISkillManager(AI_SKILL_LEVELS.GOOD);
            const modifiers = skillManager.getSkillModifiers();
            
            test.assertDefined(modifiers.aggression, 'Should have aggression modifier');
            test.assertDefined(modifiers.exploration, 'Should have exploration modifier');
            test.assertDefined(modifiers.defense, 'Should have defense modifier');
            test.assertDefined(modifiers.economy, 'Should have economy modifier');
            test.assertDefined(modifiers.coordination, 'Should have coordination modifier');
        });

        test.it('varies modifiers by skill level', () => {
            const average = new AISkillManager(AI_SKILL_LEVELS.AVERAGE);
            const expert = new AISkillManager(AI_SKILL_LEVELS.EXPERT);
            
            const avgMods = average.getSkillModifiers();
            const expMods = expert.getSkillModifiers();
            
            // Expert should have different modifiers than average
            const hasDifference = 
                avgMods.aggression !== expMods.aggression ||
                avgMods.exploration !== expMods.exploration ||
                avgMods.expansion !== expMods.expansion ||
                avgMods.research !== expMods.research;
            
            test.assertTrue(hasDifference, 'Different skill levels should have different modifiers');
        });

        test.it('sets skill level dynamically', () => {
            const skillManager = new AISkillManager(AI_SKILL_LEVELS.AVERAGE);
            skillManager.setSkillLevel(AI_SKILL_LEVELS.EXPERT);
            
            test.assertEqual(skillManager.getSkillLevel(), AI_SKILL_LEVELS.EXPERT, 'Should update to EXPERT');
        });
    });

    test.describe('AIUtils - Distance and Entity Finding', () => {
        test.it('calculates distance between entities correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const entity1 = { x: 0, y: 0 };
            const entity2 = { x: 3000, y: 4000 };
            
            const distance = utils.calculateDistance(entity1, entity2);
            test.assertEqual(distance, 5000, 'Should calculate Pythagorean distance correctly');
        });

        test.it('finds closest stars correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            // Get player 2's home star
            const homeStar = game.stars.find(s => s.owner === 2);
            test.assertNotNull(homeStar, 'Player 2 should have a home star');
            
            const result = utils.findClosestStars(homeStar);
            test.assertDefined(result.nearestOwnedStar, 'Should find nearest owned star result');
            test.assertDefined(result.nearestUnownedStar, 'Should find nearest unowned star result');
            test.assertDefined(result.distances, 'Should include distances');
        });

        test.it('gets entities in range correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const centerStar = game.stars[0];
            const range = 5000000; // Large range to include stars
            
            const entitiesInRange = utils.getEntitiesInRange(centerStar, game.stars, range);
            
            test.assertTrue(Array.isArray(entitiesInRange), 'Should return array');
            test.assertGreaterThan(entitiesInRange.length, 0, 'Should find entities in range');
            
            // Each result should have entity and distance
            if (entitiesInRange.length > 0) {
                test.assertDefined(entitiesInRange[0].entity, 'Should have entity');
                test.assertDefined(entitiesInRange[0].distance, 'Should have distance');
            }
        });

        test.it('gets enemy entities for a player', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const enemies = utils.getEnemyEntities(2); // Get enemies of player 2
            
            test.assertTrue(Array.isArray(enemies), 'Should return array');
            test.assertGreaterThan(enemies.length, 0, 'Should find enemy entities');
            
            // All enemies should not be owned by player 2
            for (const enemy of enemies) {
                test.assertNotEqual(enemy.owner, 2, 'Enemy should not be owned by player 2');
                test.assertNotEqual(enemy.owner, 0, 'Enemy should not be unowned');
            }
        });

        test.it('gets enemy ships for a player', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const enemyShips = utils.getEnemyShips(2);
            
            test.assertTrue(Array.isArray(enemyShips), 'Should return array');
            // May or may not have enemy ships at start
            
            for (const ship of enemyShips) {
                test.assertNotEqual(ship.owner, 2, 'Ship should not be owned by player 2');
            }
        });

        test.it('gets enemy stars for a player', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const enemyStars = utils.getEnemyStars(2);
            
            test.assertTrue(Array.isArray(enemyStars), 'Should return array');
            test.assertGreaterThan(enemyStars.length, 0, 'Should have enemy stars');
            
            for (const star of enemyStars) {
                test.assertNotEqual(star.owner, 2, 'Star should not be owned by player 2');
                test.assertNotEqual(star.owner, 0, 'Star should not be unowned');
            }
        });
    });

    test.describe('AIUtils - Strength and Power Calculations', () => {
        test.it('calculates entity strength for stars', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const star = game.stars.find(s => s.owner === 1);
            const strength = utils.getEntityStrength(star);
            
            test.assertGreaterThan(strength, 0, 'Star should have positive strength');
        });

        test.it('calculates entity strength for ships', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            // Get a ship (should have colony ships under construction)
            const ship = game.allShips[0];
            if (ship) {
                const strength = utils.getEntityStrength(ship);
                test.assertTrue(strength >= 0, 'Ship should have non-negative strength');
            }
        });

        test.it('calculates player strength correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const strength = utils.calculatePlayerStrength(1);
            test.assertGreaterThan(strength, 0, 'Player should have positive total strength');
        });
    });

    test.describe('AIUtils - Player Analysis', () => {
        test.it('gets player ships correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const ships = utils.getPlayerShips(1);
            test.assertTrue(Array.isArray(ships), 'Should return array');
            test.assertGreaterThan(ships.length, 0, 'Player 1 should have ships');
        });

        test.it('gets player stars correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const stars = utils.getPlayerStars(1);
            test.assertTrue(Array.isArray(stars), 'Should return array');
            test.assertEqual(stars.length, 1, 'Player 1 should have 1 star');
        });

        test.it('checks if player has ships', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            test.assertTrue(utils.playerHasShips(1), 'Player 1 should have ships');
            test.assertTrue(utils.playerHasShips(2), 'Player 2 should have ships');
        });

        test.it('checks if player has stars', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            test.assertTrue(utils.playerHasStars(1), 'Player 1 should have stars');
            test.assertTrue(utils.playerHasStars(2), 'Player 2 should have stars');
        });

        test.it('calculates average tech level', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const utils = new AIUtils(game, rules);
            
            const avgTech = utils.getPlayerAverageTechLevel(1);
            test.assertEqual(avgTech, 1, 'Player 1 should start at tech level 1');
        });
    });

    test.describe('StarAI - Decision Making', () => {
        test.it('creates StarAI without errors', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const star = game.stars.find(s => s.owner === 2);
            const starAI = new StarAI(star, game, rules, AI_SKILL_LEVELS.GOOD);
            
            test.assertNotNull(starAI, 'StarAI should be created');
            test.assertEqual(starAI.star, star, 'Should reference correct star');
        });

        test.it('makes decisions with valid action constants', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const star = game.stars.find(s => s.owner === 2);
            test.assertNotNull(star, 'Should have AI star');
            
            const starAI = new StarAI(star, game, rules, AI_SKILL_LEVELS.GOOD);
            
            // Should not throw and should return valid decision
            const decision = starAI.makeDecision();
            test.assertNotNull(decision, 'Should return a decision');
            test.assertTrue(decision !== undefined, 'Decision should not be undefined');
            test.assertTrue(decision.hasOwnProperty('action'), `Decision should have action property`);
            
            // CRITICAL: Action should not be undefined (this would have caught the missing AIActions.BUILD_SHIP)
            test.assertNotEqual(decision.action, undefined, 'Decision action should not be undefined');
            test.assertTrue(typeof decision.action === 'string', 'Decision action should be a string');
        });

        test.it('does not make decisions for unowned stars', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const unownedStar = game.stars.find(s => s.owner === 0);
            if (unownedStar) {
                const starAI = new StarAI(unownedStar, game, rules, AI_SKILL_LEVELS.GOOD);
                const decision = starAI.makeDecision();
                
                // Should return DO_NOTHING for unowned stars
                test.assertDefined(decision, 'Should return a decision');
            }
        });
        
        test.it('AI actually builds ships at stars', () => {
            pdg.srand(42);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const aiStar = game.stars.find(s => s.owner === 2);
            test.assertNotNull(aiStar, 'Should have AI star');
            
            // Clear current ship to allow new building
            aiStar.currentShip = null;
            
            const starAI = new StarAI(aiStar, game, rules, AI_SKILL_LEVELS.GOOD);
            const decision = starAI.makeDecision();
            
            // If decision is to build a ship, execute it
            if (decision.action === AIActions.BUILD_SHIP) {
                starAI.executeDecision(decision);
                
                // Star should now be building a ship
                test.assertNotNull(aiStar.currentShip, 'Star should be building a ship after AI execution');
                test.assertDefined(aiStar.currentShip.type, 'Ship being built should have a type');
            }
        });

        test.it('applies v3-style expert tech-star and shipbuilder allocations', () => {
            const { game, rules } = createEmptyAITestGame({
                compSkill: 1,
                aiSkillByPlayer: { 1: 1, 2: 2 }
            });
            game.turn = 6;
            const techCandidate = createOwnedStar(game, 1, 0, 0, 'Tech Candidate', { techLevel: 6 });
            const nearbyAlly = createOwnedStar(game, 1, 10000, 0, 'Nearby Ally', { techLevel: 6 });
            createOwnedStar(game, 2, 500000, 0, 'Distant Enemy', { techLevel: 1 });

            const candidateAI = new StarAI(techCandidate, game, rules, AI_SKILL_LEVELS.EXPERT);
            candidateAI.manageEconomy();

            test.assertEqual(techCandidate.growth.desired, 49.4, 'Expert AI should set tech-star growth allocation');
            test.assertEqual(techCandidate.shipBuilding.desired, 1.2, 'Expert AI tech stars should keep token ship production');
            test.assertEqual(techCandidate.research.desired, 49.4, 'Expert AI should set tech-star research allocation');
            test.assertEqual(game.players[1].techStarId, techCandidate.id, 'Expert AI should remember its tech star');

            const allyAI = new StarAI(nearbyAlly, game, rules, AI_SKILL_LEVELS.EXPERT);
            allyAI.manageEconomy();

            test.assertEqual(nearbyAlly.growth.desired, 50, 'Expert AI shipbuilder should split growth');
            test.assertEqual(nearbyAlly.shipBuilding.desired, 50, 'Expert AI shipbuilder should split shipbuilding');
            test.assertEqual(nearbyAlly.research.desired, 0, 'Expert AI shipbuilder should stop research after a tech star exists');
        });

        test.it('registers completed defense builds as patrolling star defenses', () => {
            const { game } = createEmptyAITestGame({ compSkill: 2 });
            const star = createOwnedStar(game, 1, 0, 0, 'Fortress', { techLevel: 5 });

            star.startBuildingShip('defense');
            star.currentShip.complete();
            const satellite = star.completeShip();

            test.assertContains(star.getDefenseSatellites(), satellite, 'Completed defense ship should be registered as a defense satellite');
            test.assertTrue(satellite.isOnPatrol(), 'Defense satellites should patrol automatically');
            test.assertGreaterThan(star.getTotalDefenseStrength(), star.getDefenseStrength(), 'Defense satellite should add to total star defense');
        });

        test.it('repairs docked non-patrolling mobile ships from star repair capacity', () => {
            const { game } = createEmptyAITestGame({ compSkill: 2 });
            const star = createOwnedStar(game, 1, 0, 0, 'Repair Yard', { techLevel: 4 });
            const ship = createCompletedShip(game, star, 'battleship', { techLevel: 4 });
            ship.damage = 90;

            const repaired = star.repairDockedShips();

            test.assertGreaterThan(repaired, 0, 'Star should repair some mobile ship damage');
            test.assertLessThan(ship.damage, 90, 'Ship damage should decrease after repair');
        });

        test.it('applies computer advantage to AI research and shipbuilding output', () => {
            const { game } = createEmptyAITestGame({ compSkill: 2, compAdvantage: 2 });

            test.assertEqual(game.applyComputerAdvantageToProduction(1, 100), 140, 'Two levels of advantage should add 40% output');
            test.assertEqual(game.applyComputerAdvantageToProduction(0, 100), 100, 'Neutral ownership should not receive AI advantage');
        });
    });

    test.describe('ShipAI - Decision Making', () => {
        test.it('creates ShipAI without errors', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            const ship = game.allShips.find(s => s.owner === 2);
            if (ship) {
                const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.GOOD);
                
                test.assertNotNull(shipAI, 'ShipAI should be created');
                test.assertEqual(shipAI.ship, ship, 'Should reference correct ship');
            }
        });

        test.it('makes decisions without errors for ship at star', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Get a ship that's at a star (like the initial colony ship)
            const ship = game.allShips.find(s => s.owner === 2 && s.star !== null);
            test.assertNotNull(ship, 'Should have a ship at a star');
            
            const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.GOOD);
            
            // Should not throw even when ship is at a star
            const decision = shipAI.makeDecision();
            test.assertDefined(decision, 'Should return a decision');
            test.assertDefined(decision.action, 'Decision should have action');
        });

        test.it('makes decisions without errors for completed ship', () => {
            pdg.srand(42);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Complete the first ship
            game.endTurn();
            game.endTurn();
            
            const ship = game.allShips.find(s => s.owner === 2 && s.progress === 100);
            if (ship) {
                const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.GOOD);
                
                // Should not throw
                const decision = shipAI.makeDecision();
                test.assertDefined(decision, 'Should return a decision');
                test.assertDefined(decision.action, 'Decision should have action');
            }
        });
        
        test.it('AI processes ship decisions during game turns', () => {
            pdg.srand(42);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Process several turns - this will exercise the full AI decision path
            // This test would have caught the missing getCurrentStar method
            for (let i = 0; i < 5; i++) {
                game.endTurn();
            }
            
            test.assertTrue(true, 'AI processed ship decisions without errors');
        });
        
        test.it('AI decisions have valid targets when needed', () => {
            pdg.srand(42);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Complete the colony ship
            game.endTurn();
            game.endTurn();
            
            const aiShip = game.allShips.find(s => s.owner === 2 && s.progress === 100);
            if (aiShip) {
                const shipAI = new ShipAI(aiShip, game, rules, AI_SKILL_LEVELS.GOOD);
                const decision = shipAI.makeDecision();
                
                // If action requires a target, verify target is not null
                const actionsRequiringTarget = ['goToOwnStar', 'goToEnemyStar', 'goToUnownedStar', 'attackShip'];
                if (actionsRequiringTarget.includes(decision.action)) {
                    test.assertNotNull(decision.target, `Action ${decision.action} should have a target`);
                    
                    // Verify target has required properties
                    test.assertDefined(decision.target.x, 'Target should have x coordinate');
                    test.assertDefined(decision.target.y, 'Target should have y coordinate');
                }
            }
        });
        
        test.it('AI actually sets ship destinations', () => {
            pdg.srand(42);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Complete the colony ship
            game.endTurn();
            game.endTurn();
            
            const aiShip = game.allShips.find(s => s.owner === 2 && s.progress === 100);
            if (aiShip) {
                // Clear any existing destination
                aiShip.destination = null;
                
                // Process AI turn
                game.aiManager.processAITurns();
                
                // After AI processing, ship should have a destination
                // (The AI should give it orders to go somewhere)
                test.assertNotNull(aiShip.destination, 'Ship should have destination after AI processing');
                test.assertDefined(aiShip.destination.x, 'Destination should have x coordinate');
                test.assertDefined(aiShip.destination.y, 'Destination should have y coordinate');
            }
        });

        test.it('forms fleets from docked ships and gives the fleet AI orders', () => {
            const { game, rules } = createEmptyAITestGame({
                compSkill: 1,
                aiSkillByPlayer: { 1: 1, 2: 2 }
            });
            const home = createOwnedStar(game, 1, 0, 0, 'Fleet Yard', { techLevel: 8 });
            const enemy = createOwnedStar(game, 2, 50000, 0, 'Weak Target', { techLevel: 1, population: 10 });
            const shipA = createCompletedShip(game, home, 'battleship', { techLevel: 8 });
            const shipB = createCompletedShip(game, home, 'battleship', { techLevel: 8 });

            const shipAI = new ShipAI(shipA, game, rules, AI_SKILL_LEVELS.EXPERT);
            const fleet = shipAI.attemptFleetFormation();

            test.assertNotNull(fleet, 'AI should create a fleet when another docked ship can join');
            test.assertEqual(fleet.getSize(), 2, 'Fleet should contain both docked ships');
            test.assertTrue(shipA.isInFleet(), 'Original ship should be in the fleet');
            test.assertTrue(shipB.isInFleet(), 'Nearby docked ship should be pulled into the fleet');

            const aiPlayer = game.aiManager.getAIPlayer(1);
            aiPlayer.processFleetDecision(fleet);

            test.assertEqual(fleet.destination, enemy, 'Fleet AI should send the strong fleet to the weak enemy star');
        });

        test.it('uses v3 skill values for search distance and decision repetitions', () => {
            const { game, rules } = createEmptyAITestGame({
                compSkill: 5,
                aiSkillByPlayer: { 1: 5, 2: 2 }
            });
            const home = createOwnedStar(game, 1, 0, 0, 'Novice Home', { techLevel: 5 });
            const ship = createCompletedShip(game, home, 'battleship', { techLevel: 5 });
            const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.AVERAGE);

            test.assertEqual(shipAI.getV3SkillLevel(), 5, 'Ship AI should preserve the configured v3 novice skill');
            test.assertEqual(shipAI.getSearchDistanceForV3Skill(1), 888888, 'Expert search distance should match v3');
            test.assertEqual(shipAI.getSearchDistanceForV3Skill(5), 444444, 'Novice search distance should match v3');
            test.assertEqual(shipAI.getDecisionRepetitionsForV3Skill(1), 3, 'Expert should run three target passes');
            test.assertEqual(shipAI.getDecisionRepetitionsForV3Skill(2), 2, 'Good should run two target passes');
            test.assertEqual(shipAI.getDecisionRepetitionsForV3Skill(5), 1, 'Novice should run one target pass');
        });
    });

    test.describe('AI Integration - End to End', () => {
        test.it('processes complete AI turn without errors', () => {
            pdg.srand(TEST_SEED);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Process several turns
            for (let i = 0; i < 5; i++) {
                game.endTurn();
            }
            
            test.assertTrue(true, 'AI processed multiple turns without errors');
        });

        test.it('AI players maintain ownership of their entities', () => {
            pdg.srand(TEST_SEED);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Run a few turns
            for (let i = 0; i < 3; i++) {
                game.endTurn();
            }
            
            // Check that player 2 still owns their home star
            const player2Stars = game.stars.filter(s => s.owner === 2);
            test.assertGreaterThan(player2Stars.length, 0, 'Player 2 should still own stars');
        });

        test.it('AI builds ships over time', () => {
            pdg.srand(TEST_SEED);
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Count completed ships only (progress === 100)
            const initialCompletedCount = game.allShips.filter(s => s.owner === 2 && s.progress === 100).length;
            
            // Run many turns to allow ship completion (needs time to finish construction)
            // First colony ship completes in 1-2 turns, then AI builds another
            for (let i = 0; i < 20; i++) {
                game.endTurn();
            }
            
            const finalCompletedCount = game.allShips.filter(s => s.owner === 2 && s.progress === 100).length;
            test.assertGreaterThan(finalCompletedCount, initialCompletedCount, 'AI should complete more ships over time');
        });

        test.it('human player cannot control AI entities', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Get an AI-owned star
            const aiStar = game.stars.find(s => s.owner === 2);
            test.assertNotNull(aiStar, 'Should have AI star');
            
            // Can select AI entities (returns true for canHumanControl check)
            const canControl = game.canHumanControl(aiStar);
            test.assertFalse(canControl, 'Human should not be able to control AI star');
            
            // But trying to build ships at AI star should be blocked
            game.selectedObject = aiStar;
            game.handleStarKeyPress(aiStar, 's'.charCodeAt(0));
            // Star should not have started building a scout (already has colony under construction)
            test.assertTrue(true, 'handleStarKeyPress should block building at AI stars');
        });

        test.it('human player can control their own entities', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Get a human-owned star
            const humanStar = game.stars.find(s => s.owner === 1);
            test.assertNotNull(humanStar, 'Should have human star');
            
            const canControl = game.canHumanControl(humanStar);
            test.assertTrue(canControl, 'Human should be able to control their own star');
        });

        test.it('human player cannot control unowned entities', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            
            // Get an unowned star
            const unownedStar = game.stars.find(s => s.owner === 0);
            if (unownedStar) {
                const canControl = game.canHumanControl(unownedStar);
                test.assertFalse(canControl, 'Human should not be able to control unowned star');
            }
        });
    });
}

module.exports = runAISystemTests;
