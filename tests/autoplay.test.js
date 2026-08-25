// Deterministic AI-only autoplay tests

const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Autoplay = require('../src/js/autoplay.js');

function createGame(config, seed = 424242) {
    pdg.srand(seed);
    const factory = new Factory();
    const rules = new Rules(config.fastGame);
    return new Game(factory, rules, config);
}

function ownedHomeStarSnapshot(game) {
    return game.stars
        .filter(star => star.owner > 0)
        .map(star => ({
            owner: star.owner,
            name: star.name,
            x: star.x,
            y: star.y
        }));
}

function runAutoplayTests() {
    test.describe('AI Skill Autoplay Configuration', () => {
        test.it('creates a smallest-map no-human game with all five v3 AI skills', () => {
            const config = Autoplay.createAISkillAutoplayConfig({ seed: 98765, turnDelayMs: 123, maxTurns: 456 });

            test.assertEqual(config.numHumans, 0, 'Autoplay should have no human players');
            test.assertEqual(config.numComputers, 5, 'Autoplay should have five AI players');
            test.assertEqual(config.totalPlayers, 5, 'Autoplay should have five total players');
            test.assertEqual(config.sectorSize, 1, 'Autoplay should use the smallest sector size');
            test.assertEqual(config.density, 1, 'Autoplay should use the smallest density');
            test.assertTrue(config.omniscient, 'Autoplay observer should see the whole map');
            test.assertTrue(config.autoplay.enabled, 'Autoplay config should be marked enabled');
            test.assertEqual(config.autoplay.seed, 98765, 'Autoplay should store the requested seed');
            test.assertEqual(config.autoplay.turnDelayMs, 123, 'Autoplay should store the requested delay');
            test.assertEqual(config.autoplay.maxTurns, 456, 'Autoplay should store the requested max turns');
            test.assertContains(config.getDescription(), 'AI: all skills', 'Autoplay description should not collapse to one AI skill');
            test.assertDeepEqual(
                [1, 2, 3, 4, 5].map(playerNum => config.getAISkillForPlayer(playerNum)),
                [1, 2, 3, 4, 5],
                'Each AI player should represent a distinct v3 skill level'
            );
            test.assertEqual(config.validate().length, 0, 'Autoplay config should validate');
        });

        test.it('initializes all AI-only players and maps their current behavior buckets', () => {
            const config = Autoplay.createAISkillAutoplayConfig({ seed: 424242 });
            const game = createGame(config, config.autoplay.seed);

            test.assertNull(game.getCurrentHumanPlayer(), 'AI-only autoplay should not report a human player');
            test.assertDeepEqual(game.aiManager.getAIPlayerIds(), [1, 2, 3, 4, 5], 'Every player should be AI controlled');
            test.assertDeepEqual(
                [1, 2, 3, 4, 5].map(playerNum => game.players[playerNum].compSkill),
                [1, 2, 3, 4, 5],
                'PlayerInfo should preserve v3 skill levels'
            );
            test.assertDeepEqual(
                [1, 2, 3, 4, 5].map(playerNum => game.aiManager.getAIPlayer(playerNum).skillManager.getSkillLevel()),
                [2, 1, 0, 0, 0],
                'Current AI engine should map v3 Expert/Good/Average-or-lower into its three behavior buckets'
            );
            test.assertDeepEqual(
                [1, 2, 3, 4, 5].map(playerNum => game.getPlayerPieceCounts(playerNum).stars),
                [1, 1, 1, 1, 1],
                'Every autoplay AI skill player should receive a home star on the smallest map'
            );
        });

        test.it('reproduces the same initial map from the fixed PDG seed', () => {
            const firstConfig = Autoplay.createAISkillAutoplayConfig({ seed: 314159 });
            const firstGame = createGame(firstConfig, firstConfig.autoplay.seed);
            const firstSnapshot = ownedHomeStarSnapshot(firstGame);

            const secondConfig = Autoplay.createAISkillAutoplayConfig({ seed: 314159 });
            const secondGame = createGame(secondConfig, secondConfig.autoplay.seed);
            const secondSnapshot = ownedHomeStarSnapshot(secondGame);

            test.assertDeepEqual(firstSnapshot, secondSnapshot, 'Same seed should reproduce the same starting home-star layout');
        });
    });

    test.describe('Victory State and Autoplay Controller', () => {
        test.it('marks the game won when one active player remains', () => {
            const config = new GameConfig({
                numHumans: 0,
                numComputers: 2,
                skipMapGeneration: true,
                aiSkillByPlayer: { 1: 1, 2: 5 },
                omniscient: true
            });
            const game = createGame(config, 777);
            const star = game.factory.createStar(10, 20, 'Winner Home');
            star.owner = 1;
            star.population = 1000;
            game.players[1].setName('Winner AI');
            game.players[2].setName('Vanished AI');

            game.updatePlayerPieceCounts();

            test.assertTrue(game.isGameOver, 'Game should be marked complete');
            test.assertEqual(game.winningPlayerNum, 1, 'Only active player should win');
            test.assertEqual(game.victoryTurn, 1, 'Victory should record the current turn');
            test.assertContains(game.getRecentEvents(5).map(event => event.title), 'Victory', 'Victory should be recorded as an event');
        });

        test.it('does not advance additional turns after victory', () => {
            const config = new GameConfig({
                numHumans: 0,
                numComputers: 2,
                skipMapGeneration: true,
                aiSkillByPlayer: { 1: 1, 2: 2 },
                omniscient: true
            });
            const game = createGame(config, 888);
            const star = game.factory.createStar(30, 40, 'Final Star');
            star.owner = 1;
            star.population = 1000;
            game.updatePlayerPieceCounts();

            const turnAtVictory = game.turn;
            const result = game.endTurn();

            test.assertTrue(result.isGameOver, 'End turn after victory should return the existing game-over result');
            test.assertEqual(game.turn, turnAtVictory, 'Turn should not advance after victory');
        });

        test.it('advances turns until a fake game reports game over', () => {
            const fakeGame = {
                turn: 1,
                isGameOver: false,
                winningPlayerNum: null,
                victoryTurn: null,
                endTurn() {
                    this.turn++;
                    if (this.turn === 4) {
                        this.isGameOver = true;
                        this.winningPlayerNum = 2;
                        this.victoryTurn = this.turn;
                    }
                    return this.getGameResult();
                },
                getGameResult() {
                    return {
                        isGameOver: this.isGameOver,
                        winningPlayerNum: this.winningPlayerNum,
                        victoryTurn: this.victoryTurn
                    };
                }
            };
            const controller = new Autoplay.AutoplayController(fakeGame, { maxTurns: 10 });

            controller.step();
            controller.step();
            const status = controller.step();

            test.assertFalse(status.running, 'Controller should stop after game over');
            test.assertEqual(status.stopReason, 'gameOver', 'Controller should report game-over stop reason');
            test.assertEqual(status.turnsRun, 3, 'Controller should count turns it advanced');
            test.assertEqual(status.result.winningPlayerNum, 2, 'Controller status should include the game result');
        });

        test.it('stops at max turns when no winner exists', () => {
            const fakeGame = {
                isGameOver: false,
                recordEvent(title, message) {
                    this.lastEvent = { title, message };
                },
                endTurn() {
                    return this.getGameResult();
                },
                getGameResult() {
                    return { isGameOver: false, winningPlayerNum: null, victoryTurn: null };
                }
            };
            const controller = new Autoplay.AutoplayController(fakeGame, { maxTurns: 2 });

            controller.step();
            const status = controller.step();

            test.assertFalse(status.running, 'Controller should stop when max turns are reached');
            test.assertEqual(status.stopReason, 'maxTurns', 'Controller should report max-turn stop reason');
            test.assertEqual(status.turnsRun, 2, 'Controller should report exactly two advanced turns');
            test.assertDefined(fakeGame.lastEvent, 'Max-turn stop should be recorded as an event');
        });
    });
}

module.exports = runAutoplayTests;
