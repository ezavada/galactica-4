// Player Info and Game Config Tests
// Tests PlayerInfo tracking and GameConfig validation

const test = require('./test-framework.js');
const PlayerInfo = require('../src/js/player-info.js');
const GameConfig = require('../src/js/game-config.js');

function runPlayerConfigTests() {
    test.describe('PlayerInfo - Creation and Initialization', () => {
        test.it('creates human player correctly', () => {
            const player = new PlayerInfo(1, false);

            test.assertEqual(player.playerNum, 1, 'Player number should be 1');
            test.assertFalse(player.isComputer, 'Should not be computer');
            test.assertTrue(player.isHuman, 'Should be human');
            test.assertTrue(player.isAlive, 'Should start alive');
            test.assertEqual(player.compSkill, 0, 'Human should have skill 0');
        });

        test.it('creates computer player correctly', () => {
            const player = new PlayerInfo(2, true);

            test.assertEqual(player.playerNum, 2, 'Player number should be 2');
            test.assertTrue(player.isComputer, 'Should be computer');
            test.assertFalse(player.isHuman, 'Should not be human');
            test.assertTrue(player.isAlive, 'Should start alive');
        });

        test.it('initializes with correct default values', () => {
            const player = new PlayerInfo(1, false);

            test.assertEqual(player.hiStarTech, 0, 'Should start with 0 star tech');
            test.assertEqual(player.hiShipTech, -5, 'Should start with -5 ship tech');
            test.assertFalse(player.builtColony, 'Should not have built colony');
            test.assertFalse(player.builtScout, 'Should not have built scout');
            test.assertEqual(player.defaultGrowth, 334, 'Default growth should be 334');
            test.assertEqual(player.defaultTech, 333, 'Default tech should be 333');
            test.assertEqual(player.defaultShips, 333, 'Default ships should be 333');
        });
    });

    test.describe('PlayerInfo - Tech Tracking', () => {
        test.it('tracks star tech level increases', () => {
            const player = new PlayerInfo(1, false);

            const isNew1 = player.updateHighestStarTech(1);
            test.assertTrue(isNew1, 'First tech level should be new');
            test.assertEqual(player.hiStarTech, 1, 'Should update to tech 1');

            const isNew1Again = player.updateHighestStarTech(1);
            test.assertFalse(isNew1Again, 'Same tech level should not be new');

            const isNew2 = player.updateHighestStarTech(2);
            test.assertTrue(isNew2, 'Higher tech level should be new');
            test.assertEqual(player.hiStarTech, 2, 'Should update to tech 2');
        });

        test.it('tracks ship tech level increases', () => {
            const player = new PlayerInfo(1, false);

            const isNew1 = player.updateHighestShipTech(1);
            test.assertTrue(isNew1, 'First ship tech should be new');
            test.assertEqual(player.hiShipTech, 1, 'Should update to tech 1');

            const isNew5 = player.updateHighestShipTech(5);
            test.assertTrue(isNew5, 'Higher tech should be new');
            test.assertEqual(player.hiShipTech, 5, 'Should update to tech 5');

            const isNew3 = player.updateHighestShipTech(3);
            test.assertFalse(isNew3, 'Lower tech should not be new');
            test.assertEqual(player.hiShipTech, 5, 'Should stay at tech 5');
        });

        test.it('starts with -5 ship tech to show Traveler message', () => {
            const player = new PlayerInfo(1, false);

            test.assertEqual(player.hiShipTech, -5, 'Should start at -5 for first Traveler message');

            const isNew1 = player.updateHighestShipTech(1);
            test.assertTrue(isNew1, 'Tech 1 should be new from -5');
        });
    });

    test.describe('PlayerInfo - Ship Type Tracking', () => {
        test.it('tracks first colony ship built', () => {
            const player = new PlayerInfo(1, false);

            const isNew = player.markShipTypeBuilt('colony');
            test.assertTrue(isNew, 'First colony should be new');
            test.assertTrue(player.builtColony, 'Should mark colony as built');

            const isNewAgain = player.markShipTypeBuilt('colony');
            test.assertFalse(isNewAgain, 'Second colony should not be new');
        });

        test.it('tracks first scout ship built', () => {
            const player = new PlayerInfo(1, false);

            const isNew = player.markShipTypeBuilt('scout');
            test.assertTrue(isNew, 'First scout should be new');
            test.assertTrue(player.builtScout, 'Should mark scout as built');
        });

        test.it('tracks defense/satellite ships', () => {
            const player = new PlayerInfo(1, false);

            const isNew1 = player.markShipTypeBuilt('defense');
            test.assertTrue(isNew1, 'First defense should be new');
            test.assertTrue(player.builtSatellite, 'Should mark satellite as built');

            const isNew2 = player.markShipTypeBuilt('satellite');
            test.assertFalse(isNew2, 'Satellite after defense should not be new');
        });

        test.it('tracks multiple ship types independently', () => {
            const player = new PlayerInfo(1, false);

            player.markShipTypeBuilt('colony');
            player.markShipTypeBuilt('scout');
            player.markShipTypeBuilt('defense');

            test.assertTrue(player.builtColony, 'Colony should be marked');
            test.assertTrue(player.builtScout, 'Scout should be marked');
            test.assertTrue(player.builtSatellite, 'Defense should be marked');
        });
    });

    test.describe('PlayerInfo - Defeat Detection', () => {
        test.it('detects player death when pieces reach zero', () => {
            const player = new PlayerInfo(1, false);

            player.updatePieceCount(5, 10); // Has pieces
            test.assertTrue(player.isAlive, 'Should be alive with pieces');
            test.assertEqual(player.numPiecesRemaining, 15, 'Should have 15 pieces');

            const died = player.updatePieceCount(0, 0); // Lost everything
            test.assertTrue(died, 'Should return true when dying');
            test.assertFalse(player.isAlive, 'Should be dead with no pieces');
            test.assertEqual(player.numPiecesRemaining, 0, 'Should have 0 pieces');
        });

        test.it('does not report death if already dead', () => {
            const player = new PlayerInfo(1, false);

            player.updatePieceCount(0, 0); // First death
            const diedAgain = player.updatePieceCount(0, 0); // Still dead

            test.assertFalse(diedAgain, 'Should not report death again');
        });

        test.it('updates piece count correctly', () => {
            const player = new PlayerInfo(1, false);

            player.updatePieceCount(3, 7);
            test.assertEqual(player.numPiecesRemaining, 10, 'Should have 3+7=10 pieces');

            player.updatePieceCount(5, 2);
            test.assertEqual(player.numPiecesRemaining, 7, 'Should update to 5+2=7 pieces');
        });
    });

    test.describe('GameConfig - Validation', () => {
        test.it('validates valid configuration', () => {
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 2,
                density: 2,
                sectorSize: 2
            });

            const errors = config.validate();
            test.assertEqual(errors.length, 0, 'Valid config should have no errors');
        });

        test.it('rejects too many players', () => {
            const config = new GameConfig({
                numHumans: 50,
                numComputers: 51
            });

            const errors = config.validate();
            test.assertGreaterThan(errors.length, 0, 'Should have errors for 101 players');
            test.assertContains(errors[0], '99', 'Error should mention 99 player limit');
        });

        test.it('rejects too few players', () => {
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 0
            });

            const errors = config.validate();
            test.assertGreaterThan(errors.length, 0, 'Should have errors for 1 total player');
            // Find the error about minimum players (not assuming it's first)
            const minPlayerError = errors.find(e => e.includes('2'));
            test.assert(minPlayerError, 'Should have error mentioning 2 player minimum');
        });

        test.it('rejects invalid density', () => {
            const config = new GameConfig({
                density: 11
            });

            const errors = config.validate();
            const densityError = errors.find(e => e.includes('density'));
            test.assert(densityError, 'Should have density error');
        });

        test.it('rejects invalid sector size', () => {
            const config = new GameConfig({
                sectorSize: 10
            });

            const errors = config.validate();
            const sizeError = errors.find(e => e.includes('sectorSize'));
            test.assert(sizeError, 'Should have sector size error');
        });

        test.it('rejects invalid skill level', () => {
            const config = new GameConfig({
                compSkill: 10
            });

            const errors = config.validate();
            const skillError = errors.find(e => e.includes('compSkill'));
            test.assert(skillError, 'Should have skill level error');
        });
    });

    test.describe('GameConfig - Factory Methods', () => {
        test.it('createSinglePlayer creates correct config', () => {
            const config = GameConfig.createSinglePlayer(2, 1); // 2 AI, Expert

            test.assertEqual(config.numHumans, 1, 'Should have 1 human');
            test.assertEqual(config.numComputers, 2, 'Should have 2 computers');
            test.assertEqual(config.totalPlayers, 3, 'Should have 3 total');
            test.assertEqual(config.compSkill, 1, 'Should have Expert skill');
            test.assertFalse(config.fastGame, 'Should not be fast game');
        });

        test.it('createFastGame sets fastGame flag', () => {
            const config = GameConfig.createFastGame(1);

            test.assertTrue(config.fastGame, 'Should be fast game');
            test.assertEqual(config.numComputers, 1, 'Should have 1 computer');
        });

        test.it('createEpicGame creates large map', () => {
            const config = GameConfig.createEpicGame(4);

            test.assertEqual(config.totalPlayers, 4, 'Should have 4 players');
            test.assertEqual(config.density, 3, 'Should have high density');
            test.assertEqual(config.sectorSize, 3, 'Should have large sector');
        });

        test.it('createQuickGame creates small fast map', () => {
            const config = GameConfig.createQuickGame();

            test.assertEqual(config.density, 1, 'Should have low density');
            test.assertEqual(config.sectorSize, 1, 'Should have small sector');
            test.assertTrue(config.fastGame, 'Should be fast game');
        });
    });

    test.describe('GameConfig - Descriptions', () => {
        test.it('generates correct difficulty names', () => {
            const expert = new GameConfig({ compSkill: 1 });
            const average = new GameConfig({ compSkill: 3 });
            const novice = new GameConfig({ compSkill: 5 });

            test.assertEqual(expert.getDifficultyName(), 'Expert', 'Skill 1 should be Expert');
            test.assertEqual(average.getDifficultyName(), 'Average', 'Skill 3 should be Average');
            test.assertEqual(novice.getDifficultyName(), 'Novice', 'Skill 5 should be Novice');
        });

        test.it('generates correct map size descriptions', () => {
            const small = new GameConfig({ sectorSize: 1 });
            const large = new GameConfig({ sectorSize: 3 });

            test.assertEqual(small.getMapSizeDescription(), 'Tiny', 'Size 1 should be Tiny');
            test.assertEqual(large.getMapSizeDescription(), 'Average', 'Size 3 should be Average');
        });

        test.it('generates full description', () => {
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 2,
                density: 2,
                sectorSize: 2,
                fastGame: true
            });

            const desc = config.getDescription();

            test.assertContains(desc, '3 players', 'Should mention player count');
            test.assertContains(desc, 'Fast Game', 'Should mention fast game');
        });
    });

    test.describe('PlayerInfo - Serialization', () => {
        test.it('serializes to JSON correctly', () => {
            const player = new PlayerInfo(1, false);
            player.setName('Test Player');
            player.setHomeStar('star-123');
            player.updateHighestStarTech(3);

            const json = player.toJSON();

            test.assertEqual(json.playerNum, 1, 'Should serialize playerNum');
            test.assertEqual(json.name, 'Test Player', 'Should serialize name');
            test.assertEqual(json.homeStarId, 'star-123', 'Should serialize home star');
            test.assertEqual(json.hiStarTech, 3, 'Should serialize tech level');
        });

        test.it('deserializes from JSON correctly', () => {
            const json = {
                playerNum: 2,
                name: 'Alpha Pact',
                isComputer: true,
                isAlive: true,
                hiStarTech: 5,
                builtColony: true
            };

            const player = PlayerInfo.fromJSON(json);

            test.assertEqual(player.playerNum, 2, 'Should restore playerNum');
            test.assertEqual(player.name, 'Alpha Pact', 'Should restore name');
            test.assertTrue(player.isComputer, 'Should restore computer flag');
            test.assertEqual(player.hiStarTech, 5, 'Should restore tech level');
            test.assertTrue(player.builtColony, 'Should restore built flags');
            test.assertFalse(player.isHuman, 'Should set isHuman based on isComputer');
        });

        test.it('round-trips through JSON', () => {
            const player = new PlayerInfo(3, true);
            player.setName('Gamma Empire');
            player.setAISkill(1, 2);
            player.updateHighestStarTech(7);
            player.markShipTypeBuilt('colony');
            player.markShipTypeBuilt('scout');

            const json = player.toJSON();
            const restored = PlayerInfo.fromJSON(json);

            test.assertEqual(restored.playerNum, player.playerNum, 'PlayerNum should match');
            test.assertEqual(restored.name, player.name, 'Name should match');
            test.assertEqual(restored.compSkill, player.compSkill, 'Skill should match');
            test.assertEqual(restored.hiStarTech, player.hiStarTech, 'Tech should match');
            test.assertEqual(restored.builtColony, player.builtColony, 'Colony flag should match');
            test.assertEqual(restored.builtScout, player.builtScout, 'Scout flag should match');
        });
    });

    test.describe('PlayerInfo - AI Skill', () => {
        test.it('sets AI skill correctly', () => {
            const player = new PlayerInfo(2, true);
            player.setAISkill(2, 1); // Good skill, Some advantage

            test.assertEqual(player.compSkill, 2, 'Should set skill to Good');
            test.assertEqual(player.compAdvantage, 1, 'Should set advantage to Some');
            test.assertEqual(player.getSkillName(), 'Good', 'Should return skill name');
        });

        test.it('returns correct skill names', () => {
            const human = new PlayerInfo(1, false);
            const expert = new PlayerInfo(2, true);
            expert.setAISkill(1, 0);
            const average = new PlayerInfo(3, true);
            average.setAISkill(3, 0);

            test.assertEqual(human.getSkillName(), 'Human', 'Human should have skill Human');
            test.assertEqual(expert.getSkillName(), 'Expert', 'Should return Expert');
            test.assertEqual(average.getSkillName(), 'Average', 'Should return Average');
        });
    });

    test.describe('GameConfig - toMapGeneratorConfig', () => {
        test.it('converts to map generator config format', () => {
            const config = new GameConfig({
                numHumans: 1,
                numComputers: 3,
                density: 2,
                sectorSize: 3
            });

            const mapConfig = config.toMapGeneratorConfig();

            test.assertEqual(mapConfig.totalPlayers, 4, 'Should have 4 total players');
            test.assertEqual(mapConfig.numHumans, 1, 'Should have 1 human');
            test.assertEqual(mapConfig.density, 2, 'Should have density 2');
            test.assertEqual(mapConfig.sectorSize, 3, 'Should have sector size 3');
        });
    });
}

module.exports = runPlayerConfigTests;

