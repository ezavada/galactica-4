// AI genetic trainer tests
// Run with: ./gad4 tests/run-tests.js

const test = require('./test-framework.js');
const Trainer = require('../src/js/ai-genetic-trainer.js');
const {
    AI_FACTORS,
    GENETIC_AI_FACTORS,
    SHIP_DECISION_MATRICES,
    EXPERT_SHIP_DECISION_MATRICES,
    DecisionMatrix
} = require('../src/js/ai-decision-matrices.js');
const ShipAI = require('../src/js/ai-ship.js');
const { AI_SKILL_LEVELS } = require('../src/js/ai-skill.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Common = require('../src/js/common.js');

function createEmptyTrainingTestGame() {
    const factory = new Factory();
    const rules = new Rules(false);
    const config = new GameConfig({
        numHumans: 0,
        numComputers: 2,
        compSkill: 1,
        aiSkillByPlayer: { 1: 1, 2: 1 },
        skipMapGeneration: true,
        omniscient: true
    });
    const game = new Game(factory, rules, config);
    return { game, factory, rules };
}

function createOwnedStar(game, owner, x, y, name, options = {}) {
    const star = game.factory.createStar(x, y, name);
    star.owner = owner;
    star.population = options.population !== undefined ? options.population : 1000;
    star.techLevel = options.techLevel !== undefined ? options.techLevel : 5;
    star.setScannerRange(game.rules.getScanRangeForTechLevel(star.techLevel));
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

function runAIGeneticTrainerTests() {
    test.describe('AI Genetic Trainer - Decision Matrices', () => {
        test.it('adds experimental matrix rows without changing static base scores', () => {
            const baseMatrix = new DecisionMatrix('battleship');

            baseMatrix.considerFactor(AI_FACTORS.WE_WERE_RECENTLY_ATTACKED);
            baseMatrix.considerFactor(AI_FACTORS.UNOWNED_TARGET_ON_FRONTIER);

            test.assertEqual(baseMatrix.scores.toOurStar, 0, 'Base matrix should keep genetic rows at zero');
            test.assertEqual(baseMatrix.scores.toEnemyStar, 0, 'Base matrix should not score experimental rows');
            test.assertEqual(baseMatrix.scores.toOtherStar, 0, 'Base matrix should not score experimental rows');
            test.assertEqual(baseMatrix.scores.toShip, 0, 'Base matrix should not score experimental rows');
            test.assertEqual(baseMatrix.scores.toFormFleet, 0, 'Base matrix should not score experimental rows');
        });

        test.it('represents v4 Expert preferences as matrix overlay rows', () => {
            const expertMatrix = new DecisionMatrix('battleship', EXPERT_SHIP_DECISION_MATRICES.battleship);

            expertMatrix.considerFactor(AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US);
            expertMatrix.considerFactor(AI_FACTORS.OWNED_TARGET_THREATENED);

            test.assertGreaterThan(expertMatrix.scores.toOurStar, 0, 'Expert matrix should value defending threatened owned stars');
            test.assertGreaterThan(expertMatrix.scores.toEnemyStar, 0, 'Expert matrix should value retaliation targets');
            test.assertEqual(
                SHIP_DECISION_MATRICES.battleship[GENETIC_AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US][1],
                0,
                'Static v3 matrix row should remain zero'
            );
        });

        test.it('builds custom per-player matrices from genome overlays', () => {
            const genome = Trainer.createRandomGenome({
                id: 'unit',
                generation: 0,
                includeLegacyFactors: false
            }, new Trainer.GeneticRandom(12));
            genome.matrices.battleship[AI_FACTORS.WE_WERE_RECENTLY_ATTACKED] = [11, 22, 33, 44, 55];

            const matrices = Trainer.buildEffectiveMatrices(genome);
            const matrix = new DecisionMatrix('battleship', matrices.battleship);
            matrix.considerFactor(AI_FACTORS.WE_WERE_RECENTLY_ATTACKED);

            test.assertEqual(matrix.scores.toOurStar, 11, 'Custom matrix should score genetic to-own-star weight');
            test.assertEqual(matrix.scores.toEnemyStar, 22, 'Custom matrix should score genetic to-enemy-star weight');
            test.assertEqual(matrix.scores.toOtherStar, 33, 'Custom matrix should score genetic to-unowned-star weight');
            test.assertEqual(matrix.scores.toShip, 44, 'Custom matrix should score genetic to-ship weight');
            test.assertEqual(matrix.scores.toFormFleet, 55, 'Custom matrix should score genetic fleet weight');
        });

        test.it('uses a player-specific matrix when constructing ShipAI', () => {
            const { game, rules } = createEmptyTrainingTestGame();
            const home = createOwnedStar(game, 1, 0, 0, 'Matrix Home');
            const ship = createCompletedShip(game, home, 'battleship');
            const customMatrix = Trainer.createZeroOverlayMatrix();
            customMatrix[AI_FACTORS.EMPIRE_HAS_FEW_STARS] = [77, 0, 0, 0, 0];
            game.aiDecisionMatrices = {
                1: { battleship: customMatrix }
            };

            const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.EXPERT);
            shipAI.decisionMatrix.considerFactor(AI_FACTORS.EMPIRE_HAS_FEW_STARS);

            test.assertEqual(shipAI.decisionMatrix.matrix, customMatrix, 'ShipAI should retain the player-specific custom matrix');
            test.assertEqual(shipAI.decisionMatrix.scores.toOurStar, 77, 'Custom matrix row should drive decision scores');
        });
    });

    test.describe('AI Genetic Trainer - Evolution', () => {
        test.it('keeps the top two genomes and replaces the rest with mutated blends', () => {
            const rng = new Trainer.GeneticRandom(99);
            const population = Trainer.createInitialPopulation({
                seed: 99,
                populationSize: 5,
                includeLegacyFactors: false,
                mutationRate: 0
            }, rng);
            const standings = population.map((genome, index) => ({
                genome,
                playerNum: index + 1,
                score: (index + 1) * 100
            }));

            const evolution = Trainer.evolvePopulation(standings, {
                populationSize: 5,
                includeLegacyFactors: false,
                mutationRate: 0,
                mutationSize: 9,
                nextGeneration: 1
            }, rng);

            test.assertArrayLength(evolution.population, 5, 'Evolution should keep a five-player population');
            test.assertEqual(evolution.survivors[0].id, 'g0p5', 'Highest-scoring genome should survive');
            test.assertEqual(evolution.survivors[1].id, 'g0p4', 'Second-highest genome should survive');
            test.assertArrayLength(evolution.children, 3, 'Remaining three genomes should be children');
            for (const child of evolution.children) {
                test.assertDeepEqual(child.parents, ['g0p5', 'g0p4'], 'Child should blend the top two survivors');
                test.assertGreaterThanOrEqual(child.mutationCount, 1, 'Each child should receive at least one forced mutation');
            }
        });

        test.it('creates deterministic trainer populations for the same seed', () => {
            const first = Trainer.createInitialPopulation({
                seed: 1234,
                populationSize: 5,
                includeLegacyFactors: false
            }, new Trainer.GeneticRandom(1234));
            const second = Trainer.createInitialPopulation({
                seed: 1234,
                populationSize: 5,
                includeLegacyFactors: false
            }, new Trainer.GeneticRandom(1234));

            test.assertDeepEqual(first[0].matrices.scout, second[0].matrices.scout, 'Same seed should produce same first scout matrix');
            test.assertDeepEqual(first[4].matrices.battleship, second[4].matrices.battleship, 'Same seed should produce same fifth battleship matrix');
        });
    });

    test.describe('AI Genetic Trainer - Combat Memory Factors', () => {
        test.it('records recent attacker and defender context for AI decisions', () => {
            const { game } = createEmptyTrainingTestGame();
            const target = createOwnedStar(game, 1, 0, 0, 'Recently Attacked');

            const entry = game.recordAICombatMemory({
                attackerOwner: 2,
                defenderOwner: 1,
                target,
                targetType: Common.ObjectType.STAR,
                attackersWon: false,
                defendersWon: true,
                attackersLost: 1,
                defendersLost: 0
            });

            test.assertEqual(game.getRecentAttackOnOwner(1), entry, 'Defender should be able to find recent incoming attack');
            test.assertEqual(game.getRecentAttackByOwner(2), entry, 'Attacker should be able to find recent outgoing attack');
            game.turn += 20;
            test.assertNull(game.getRecentAttackOnOwner(1), 'Old combat memory should expire');
        });

        test.it('feeds recent combat context into matrix scoring rows', () => {
            const { game, rules } = createEmptyTrainingTestGame();
            const home = createOwnedStar(game, 1, 0, 0, 'Current Defense');
            const enemy = createOwnedStar(game, 2, 100000, 0, 'Recent Aggressor');
            const ship = createCompletedShip(game, home, 'battleship');
            const enemyShip = createCompletedShip(game, enemy, 'battleship');
            const customMatrix = Trainer.createZeroOverlayMatrix();
            customMatrix[AI_FACTORS.WE_WERE_RECENTLY_ATTACKED] = [10, 0, 0, 0, 0];
            customMatrix[AI_FACTORS.OWNED_TARGET_RECENTLY_ATTACKED] = [20, 0, 0, 0, 0];
            customMatrix[AI_FACTORS.CURRENT_STAR_RECENTLY_ATTACKED] = [0, 0, 0, 0, 30];
            customMatrix[AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US] = [0, 40, 0, 0, 0];
            customMatrix[AI_FACTORS.ENEMY_SHIP_OWNER_RECENTLY_ATTACKED_US] = [0, 0, 0, 50, 0];
            customMatrix[AI_FACTORS.RECENT_ATTACK_TARGET_WAS_STAR] = [0, 0, 0, 0, 60];
            game.aiDecisionMatrices = {
                1: { battleship: customMatrix }
            };
            game.recordAICombatMemory({
                attackerOwner: 2,
                defenderOwner: 1,
                target: home,
                targetType: Common.ObjectType.STAR
            });

            const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.EXPERT);
            shipAI.evaluateRecentCombatMemoryFactors({
                nearestOwnedStar: home,
                nearestEnemyStar: enemy,
                nearestUnownedStar: null
            }, {
                ship: enemyShip,
                distance: 100000
            });

            test.assertEqual(shipAI.decisionMatrix.scores.toOurStar, 30, 'Incoming attack and attacked target should add defensive own-star scores');
            test.assertEqual(shipAI.decisionMatrix.scores.toEnemyStar, 40, 'Recent attacker owner should add retaliation star score');
            test.assertEqual(shipAI.decisionMatrix.scores.toShip, 50, 'Recent attacker ship should add interception score');
            test.assertEqual(shipAI.decisionMatrix.scores.toFormFleet, 90, 'Current/star attack context should add fleet-forming scores');
        });

        test.it('feeds starless-enemy cleanup context into matrix scoring rows', () => {
            const { game, rules } = createEmptyTrainingTestGame();
            const home = createOwnedStar(game, 1, 0, 0, 'Cleanup Base');
            const formerEnemyStar = createOwnedStar(game, 2, 300000, 0, 'Former Enemy Base');
            const ship = createCompletedShip(game, home, 'battleship');
            const enemyShip = createCompletedShip(game, formerEnemyStar, 'battleship');
            formerEnemyStar.owner = 0;

            const customMatrix = Trainer.createZeroOverlayMatrix();
            customMatrix[AI_FACTORS.NO_ENEMY_STARS_REMAIN] = [0, 0, 0, 10, 0];
            customMatrix[AI_FACTORS.ONLY_US_HAS_STARS] = [0, 0, 0, 20, 0];
            customMatrix[AI_FACTORS.ENEMY_SHIP_OWNER_HAS_NO_STARS] = [0, 0, 0, 30, 0];
            game.aiDecisionMatrices = {
                1: { battleship: customMatrix }
            };

            const shipAI = new ShipAI(ship, game, rules, AI_SKILL_LEVELS.EXPERT);
            shipAI.evaluateEndgameCleanupFactors({
                nearestOwnedStar: home,
                nearestEnemyStar: null,
                nearestUnownedStar: formerEnemyStar
            }, {
                ship: enemyShip,
                distance: 300000
            });

            test.assertEqual(shipAI.decisionMatrix.scores.toShip, 60, 'Cleanup factors should strongly score hunting starless enemy ships');
            test.assertEqual(shipAI.getEnemyShipSearchDistance(999999, 1, { nearestEnemyStar: null }), 999999, 'Expert cleanup should search the full range for enemy ships');
            test.assertEqual(shipAI.getEnemyShipSearchDistance(999999, 2, { nearestEnemyStar: null }), 249999, 'Non-Expert search should keep the v3 quarter range');
        });
    });
}

module.exports = runAIGeneticTrainerTests;
