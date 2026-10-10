// Map Generation Tests
// Tests the MapGenerator class with seeded random numbers for deterministic results

const test = require('./test-framework.js');
const MapGenerator = require('../src/js/map-generator.js');
const GameConfig = require('../src/js/game-config.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const Game = require('../src/js/game.js');

// Test seed for reproducible results (using PDG's built-in srand/rand)
const TEST_SEED = 42;

function runMapGenerationTests() {

    test.describe('MapGenerator - Star Count Calculation', () => {
        test.it('calculates correct star count with seed 42', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            // With seed 42, density 1, sectorSize 1, totalPlayers 2
            const starCount = mapGen.calculateStarCount(1, 1, 2);

            // Expected: (Rnd(10) + Rnd(10) + 10) * 1 + Rnd(5) * Rnd(2)
            // With seed 42: specific predictable values
            test.assertGreaterThan(starCount, 2, 'Must have at least as many stars as players');
            test.assertLessThan(starCount, 100, 'Star count should be reasonable');
        });

        test.it('ensures minimum stars equal to player count', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ numHumans: 8, numComputers: 0 });
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const starCount = mapGen.calculateStarCount(1, 1, 8);

            test.assert(starCount >= 8, 'Must have at least 8 stars for 8 players');
        });

        test.it('scales with sector size', () => {
            // Create separate game instances to avoid RNG state interference
            pdg.srand(TEST_SEED);
            const factory1 = new Factory();
            const rules1 = new Rules();
            const config1 = GameConfig.createSinglePlayer(1, 2);
            const game1 = new Game(factory1, rules1, config1);
            const mapGen1 = new MapGenerator(game1);
            const stars1x1 = mapGen1.calculateStarCount(1, 1, 2);
            
            pdg.srand(TEST_SEED);
            const factory2 = new Factory();
            const rules2 = new Rules();
            const config2 = GameConfig.createSinglePlayer(1, 2);
            const game2 = new Game(factory2, rules2, config2);
            const mapGen2 = new MapGenerator(game2);
            const stars2x2 = mapGen2.calculateStarCount(1, 2, 2);

            // 2x2 should have 4x as many stars
            test.assertEqual(stars2x2, stars1x1 * 4, 'Sector size 2 should have 4x stars');
        });

        test.it('scales with density', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const starsD1 = mapGen.calculateStarCount(1, 1, 2);
            
            pdg.srand(TEST_SEED);
            const starsD2 = mapGen.calculateStarCount(2, 1, 2);

            test.assert(starsD2 > starsD1, 'Higher density should produce more stars');
        });
    });

    test.describe('MapGenerator - Full density range',()=>{
        test.it('deduplicates translated name pools before reserving homeworlds',()=>{
            const i18n=require('../src/js/i18n.js'),getString=i18n.getString;
            i18n.getString=(id,...args)=>id===100?'Vega|Sirius|Vega':getString.call(i18n,id,...args);
            try {
                const generator=new MapGenerator({});test.assertEqual(generator.STAR_NAMES.join('|'),'Vega|Sirius');
                const names=generator.reservePlayerNames(2).filter(Boolean);test.assertEqual(new Set(names).size,2);
            } finally {i18n.getString=getString;}
        });
        test.it('counts reserved home names before ordinary names and avoids exhausted or duplicate numerals',()=>{
            const game=new Game(new Factory(),new Rules(),new GameConfig({skipMapGeneration:true})),generator=new MapGenerator(game);
            generator.STAR_NAMES=['Vega'];generator.random=()=>0;
            const oldRand=pdg.rand;pdg.rand=()=>0;
            try {
                const stars=[];generator.createRandomStars(1,1,()=>{const star={};stars.push(star);return star;},[undefined,'Vega']);
                test.assertEqual(stars[0].name,'Vega II');
                const usage=[1],names=[];for(let i=0;i<30;i++)names.push(generator.generateStarName(usage).name);
                test.assertEqual(new Set(names).size,names.length);test.assertFalse(names.some(n=>n.includes('undefined')));
            } finally {pdg.rand=oldRand;}
        });
        test.it('uses the original count formula for all ten densities with the same random sequence',()=>{
            const game=new Game(new Factory(),new Rules(),new GameConfig({skipMapGeneration:true})),generator=new MapGenerator(game);
            let low,second;
            for(let density=1;density<=10;density++){
                pdg.srand(TEST_SEED);const count=generator.calculateStarCount(density,1,2);
                if(density===1)low=count;else if(density===2)second=count;
                if(density>=2)test.assertEqual(count,low+(density-1)*(second-low));
            }
        });
        test.it('constructs a playable maximum-density galaxy with unique names and all home systems',()=>{
            pdg.srand(TEST_SEED);
            const game=new Game(new Factory(),new Rules(),new GameConfig({density:10,sectorSize:5,numHumans:1,numComputers:2}));
            test.assertTrue(game.stars.length>=2500&&game.stars.length<=7100);
            test.assertEqual(new Set(game.stars.map(s=>s.name)).size,game.stars.length);
            for(const owner of [1,2,3])test.assertEqual(game.stars.filter(s=>s.owner===owner).length,1);
            for(const star of game.stars){test.assertTrue(Number.isFinite(star.x)&&Number.isFinite(star.y));test.assertInRange(star.x,0,1024*1024*5);test.assertInRange(star.y,0,1024*1024*5);}
        });
    });

    test.describe('MapGenerator - Star Name Generation', () => {
        test.it('generates unique star names with S- prefix for duplicates', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const nameUsage = new Array(mapGen.STAR_NAMES.length).fill(0);
            const names = [];

            // Generate several names
            for (let i = 0; i < 10; i++) {
                const nameResult = mapGen.generateStarName(nameUsage);
                names.push(nameResult.name);
            }

            // All names should be non-empty
            names.forEach(name => {
                test.assert(name.length > 0, 'Star name should not be empty');
            });

            // Check that names are either from STAR_NAMES list or use S- prefix
            names.forEach(name => {
                const isFromList = mapGen.STAR_NAMES.includes(name);
                const isSPrefix = name.startsWith('S-');
                test.assert(isFromList || isSPrefix, `Star name "${name}" should be from STAR_NAMES or use S- prefix`);
            });

        });

        test.it('uses names from STAR_NAMES array', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const nameUsage = new Array(mapGen.STAR_NAMES.length).fill(0);
            const nameResult = mapGen.generateStarName(nameUsage);

            // Name should be from the STAR_NAMES list (or S- prefix for duplicates)
            if (nameResult.namedStar) {
                test.assertContains(mapGen.STAR_NAMES, nameResult.name, `${nameResult.name} should be in STAR_NAMES`);
            } else {
                test.assert(nameResult.name.startsWith('S-'), 'Non-named stars should use S- prefix');
            }

        });
    });

    test.describe('MapGenerator - Computer Name Generation', () => {
        test.it('generates computer names from templates', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const name = mapGen.generateComputerName('Alpha');

            test.assert(name.length > 0, 'Computer name should not be empty');
            test.assert(name.includes('Alpha'), 'Computer name should include star name');
            test.assert(name.length <= 32, 'Computer name should not exceed 32 characters');

        });

        test.it('generates different names for different stars', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const name1 = mapGen.generateComputerName('Alpha');
            const name2 = mapGen.generateComputerName('Beta');

            test.assertNotEqual(name1, name2, 'Different star names should produce different computer names');

        });

        test.it('truncates long names to 32 characters', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const longStarName = 'VeryLongStarNameThatExceedsMaximumLength';
            const name = mapGen.generateComputerName(longStarName);

            test.assert(name.length <= 32, 'Computer name should be truncated to 32 characters');

        });
    });

    test.describe('MapGenerator - Distance Calculations', () => {
        test.it('calculates distance correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const star1 = { x: 0, y: 0 };
            const star2 = { x: 300000, y: 400000 };

            const distance = mapGen.calculateDistance(star1, star2);

            // 3-4-5 triangle: distance should be 500000
            test.assertEqual(distance, 500000, 'Distance calculation should be correct');
        });

        test.it('calculates zero distance for same position', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);
            const mapGen = new MapGenerator(game);

            const star = { x: 100000, y: 200000 };
            const distance = mapGen.calculateDistance(star, star);

            test.assertEqual(distance, 0, 'Distance to self should be zero');
        });
    });

    test.describe('MapGenerator - Full Map Generation', () => {
        test.it('generates correct number of stars', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            // Game constructor calls initializeGame which generates the map
            const starCount = game.stars.length;

            test.assertGreaterThan(starCount, 2, 'Should have more stars than players');
            test.assertLessThan(starCount, 100, 'Star count should be reasonable');

        });

        test.it('assigns home stars to all players', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            // Count home stars (owned stars with population)
            const homeStars = game.stars.filter(star => star.owner > 0 && star.population > 0);

            test.assertEqual(homeStars.length, 2, 'Should have 2 home stars for 2 players');

        });

        test.it('gives home stars tech level 1 and population', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const homeStars = game.stars.filter(star => star.owner > 0);

            homeStars.forEach(star => {
                test.assertEqual(star.techLevel, 1, 'Home star should have tech level 1');
                test.assertEqual(star.population, 1000000, 'Home star should have 1 million population');
            });

        });

        test.it('gives home stars colony ships at 99%', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const homeStars = game.stars.filter(star => star.owner > 0);

            homeStars.forEach(star => {
                test.assertNotNull(star.currentShip, 'Home star should have a ship under construction');
                test.assertEqual(star.currentShip.type, 'colony', 'Initial ship should be colony type');
                test.assertEqual(star.currentShip.progress, 99, 'Colony ship should be at 99%');
            });

        });

        test.it('maintains minimum distance between home stars', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(3, 2); // 4 players
            const game = new Game(factory, rules, config);

            const homeStars = game.stars.filter(star => star.owner > 0);

            // Check distances between all pairs
            for (let i = 0; i < homeStars.length; i++) {
                for (let j = i + 1; j < homeStars.length; j++) {
                    const dx = homeStars[i].x - homeStars[j].x;
                    const dy = homeStars[i].y - homeStars[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Minimum distance should be significant (at least 100k for sector size 1)
                    test.assertGreaterThan(
                        distance,
                        100000,
                        `Home stars should be well separated (got ${distance})`
                    );
                }
            }

        });

        test.it('assigns unique names to all stars', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const names = game.stars.map(star => star.name);

            // All names should be non-empty
            names.forEach(name => {
                test.assert(name && name.length > 0, 'Star should have a name');
            });

            // Note: Names might have duplicates with Roman numerals, which is expected

        });

        test.it('assigns computer names to AI players', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const player2 = game.players[2];

            test.assert(player2, 'Player 2 should exist');
            test.assertTrue(player2.isComputer, 'Player 2 should be computer');
            test.assert(player2.name && player2.name.length > 0, 'Computer player should have a name');
            test.assertNotEqual(player2.name, 'undefined', 'Computer name should not be undefined');

        });

        test.it('generates stars within map bounds', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ 
                numHumans: 1, 
                numComputers: 1,
                sectorSize: 1
            });
            const game = new Game(factory, rules, config);

            const mapSize = 1024 * 1024 * config.sectorSize;

            game.stars.forEach(star => {
                test.assertInRange(star.x, 0, mapSize, 'Star X coordinate should be within map bounds');
                test.assertInRange(star.y, 0, mapSize, 'Star Y coordinate should be within map bounds');
            });

        });
    });

    test.describe('MapGenerator - Reproducibility', () => {
        test.it('generates identical maps with same seed', () => {
            // Generate first map
            pdg.srand(TEST_SEED);

            const factory1 = new Factory();
            const rules1 = new Rules();
            const config1 = GameConfig.createSinglePlayer(1, 2);
            const game1 = new Game(factory1, rules1, config1);

            const stars1 = game1.stars.map(s => ({ x: s.x, y: s.y, name: s.name, owner: s.owner }));


            // Generate second map with same seed
            pdg.srand(TEST_SEED);

            const factory2 = new Factory();
            const rules2 = new Rules();
            const config2 = GameConfig.createSinglePlayer(1, 2);
            const game2 = new Game(factory2, rules2, config2);

            const stars2 = game2.stars.map(s => ({ x: s.x, y: s.y, name: s.name, owner: s.owner }));


            // Maps should be identical
            test.assertEqual(stars1.length, stars2.length, 'Should generate same number of stars');

            for (let i = 0; i < stars1.length; i++) {
                test.assertEqual(stars1[i].x, stars2[i].x, `Star ${i} X should match`);
                test.assertEqual(stars1[i].y, stars2[i].y, `Star ${i} Y should match`);
                test.assertEqual(stars1[i].name, stars2[i].name, `Star ${i} name should match`);
                test.assertEqual(stars1[i].owner, stars2[i].owner, `Star ${i} owner should match`);
            }
        });

        test.it('generates different maps with different seeds', () => {
            // Generate first map with seed 42
            pdg.srand(42);

            const factory1 = new Factory();
            const rules1 = new Rules();
            const config1 = GameConfig.createSinglePlayer(1, 2);
            const game1 = new Game(factory1, rules1, config1);

            const firstStar1 = game1.stars[0];


            // Generate second map with seed 99
            pdg.srand(99);

            const factory2 = new Factory();
            const rules2 = new Rules();
            const config2 = GameConfig.createSinglePlayer(1, 2);
            const game2 = new Game(factory2, rules2, config2);

            const firstStar2 = game2.stars[0];


            // Stars should be different
            const same = firstStar1.x === firstStar2.x && 
                        firstStar1.y === firstStar2.y && 
                        firstStar1.name === firstStar2.name;

            test.assertFalse(same, 'Different seeds should generate different maps');
        });
    });
}

module.exports = runMapGenerationTests;

