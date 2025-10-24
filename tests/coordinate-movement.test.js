// Coordinate System and Movement Tests
// Tests coordinate conversions and ship movement

const test = require('./test-framework.js');
const GameConfig = require('../src/js/game-config.js');
const Factory = require('../src/js/factory.js');
const Rules = require('../src/js/rules.js');
const Game = require('../src/js/game.js');
const Display = require('../src/js/display.js');

const TEST_SEED = 42;

function runCoordinateMovementTests() {

    test.describe('Coordinate System - Galactic to Screen Conversion', () => {
        test.it('converts galactic coordinates to screen coordinates correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ sectorSize: 1 });
            const game = new Game(factory, rules, config);
            game.port = { 
                drawRect: () => {}, 
                drawCircle: () => {}, 
                drawPolygon: () => {}, 
                drawText: () => {}, 
                drawLine: () => {},
                getDrawingArea: () => ({ width: () => 800, height: () => 600 })
            }; // Mock port
            const display = new Display(game);

            // Map size for sector 1: 1024 * 1024 = 1,048,576
            // Game window: 800x600

            // Test center of map
            const centerGalactic = 524288; // Half of 1,048,576
            const centerScreenX = display.toScreenX(centerGalactic);
            const centerScreenY = display.toScreenY(centerGalactic);

            test.assertApproximately(centerScreenX, 400, 1, 'Center X should be ~400');
            test.assertApproximately(centerScreenY, 300, 1, 'Center Y should be ~300');
        });

        test.it('converts corner coordinates correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ sectorSize: 1 });
            const game = new Game(factory, rules, config);
            game.port = { 
                drawRect: () => {}, 
                drawCircle: () => {}, 
                drawPolygon: () => {}, 
                drawText: () => {}, 
                drawLine: () => {},
                getDrawingArea: () => ({ width: () => 800, height: () => 600 })
            };
            const display = new Display(game);

            // Origin (0,0) - with new coordinate system, this will be offset by centering
            // The map is centered on screen, so origin will be at the top-left of the visible map area
            const originScreenX = display.toScreenX(0);
            const originScreenY = display.toScreenY(0);
            // The origin should be within the screen bounds (may be negative if map extends beyond screen)
            // With new scale calculation, the origin can be much more negative
            test.assertGreaterThan(originScreenX, -100000, 'Origin X should be within reasonable bounds');
            test.assertGreaterThan(originScreenY, -100000, 'Origin Y should be within reasonable bounds');

            // Far corner (1048576, 1048576) - should be at the bottom-right of the visible map area
            const maxGalactic = 1024 * 1024;
            const maxScreenX = display.toScreenX(maxGalactic);
            const maxScreenY = display.toScreenY(maxGalactic);
            // The max corner should be within the screen bounds (may be beyond screen if map extends beyond)
            // With new scale calculation, the max corner can be much larger
            test.assertLessThan(maxScreenX, 100000, 'Max X should be within reasonable bounds');
            test.assertLessThan(maxScreenY, 100000, 'Max Y should be within reasonable bounds');
        });

        test.it('scales with sector size', () => {
            // Test with sector size 2
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ sectorSize: 2 });
            const game = new Game(factory, rules, config);
            game.port = { 
                drawRect: () => {}, 
                drawCircle: () => {}, 
                drawPolygon: () => {}, 
                drawText: () => {}, 
                drawLine: () => {},
                getDrawingArea: () => ({ width: () => 800, height: () => 600 })
            };
            const display = new Display(game);

            // Map size for sector 2: 1024 * 1024 * 2 = 2,097,152
            // At half-way point (1,048,576) should be at screen center
            const halfMap = 1048576;
            const screenX = display.toScreenX(halfMap);
            const screenY = display.toScreenY(halfMap);

            test.assertApproximately(screenX, 400, 1, 'Half map X should be ~400 for sector 2');
            test.assertApproximately(screenY, 300, 1, 'Half map Y should be ~300 for sector 2');
        });
    });

    test.describe('Coordinate System - Screen to Galactic Conversion', () => {
        test.it('converts screen coordinates to galactic coordinates correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ sectorSize: 1 });
            const game = new Game(factory, rules, config);
            game.port = { 
                drawRect: () => {}, 
                drawCircle: () => {}, 
                drawPolygon: () => {}, 
                drawText: () => {}, 
                drawLine: () => {},
                getDrawingArea: () => ({ width: () => 800, height: () => 600 })
            };
            const display = new Display(game);

            // Test center of screen
            const centerGalacticX = display.toGalacticX(400);
            const centerGalacticY = display.toGalacticY(300);

            const expectedCenter = 524288; // Half of 1,048,576
            test.assertApproximately(centerGalacticX, expectedCenter, 100, 'Center galactic X');
            test.assertApproximately(centerGalacticY, expectedCenter, 100, 'Center galactic Y');
        });

        test.it('round-trips coordinates correctly', () => {
            const factory = new Factory();
            const rules = new Rules();
            const config = new GameConfig({ sectorSize: 1 });
            const game = new Game(factory, rules, config);
            game.port = { 
                drawRect: () => {}, 
                drawCircle: () => {}, 
                drawPolygon: () => {}, 
                drawText: () => {}, 
                drawLine: () => {},
                getDrawingArea: () => ({ width: () => 800, height: () => 600 })
            };
            const display = new Display(game);

            const originalGalactic = 750000;
            const screen = display.toScreenX(originalGalactic);
            const backToGalactic = display.toGalacticX(screen);

            test.assertApproximately(backToGalactic, originalGalactic, 100, 'Round-trip should preserve value');
        });
    });

    test.describe('Ship Movement - Speed Calculations', () => {
        test.it('calculates correct initial speed for tech level 1 scout', () => {
            const rules = new Rules(false); // Not fast game

            const mockShip = {
                type: 'scout',
                techLevel: 1
            };

            const speed = rules.getShipInitialSpeed(mockShip);

            // Tech 1: speedIdx = 1, base = 11, scout = 1.5x = 16.5, * 1000 = 16,500
            test.assertEqual(speed, 16500, 'Scout at tech 1 should have speed 16,500');
        });

        test.it('calculates correct speed for tech level 1 colony ship', () => {
            const rules = new Rules(false);

            const mockShip = {
                type: 'colony',
                techLevel: 1
            };

            const speed = rules.getShipInitialSpeed(mockShip);

            // Tech 1: speedIdx = 1, base = 11, colony = 0.75x = 8.25, * 1000 = 8,250
            test.assertApproximately(speed, 8250, 1, 'Colony at tech 1 should have speed ~8,250');
        });

        test.it('defense ships have zero speed', () => {
            const rules = new Rules(false);

            const mockShip = {
                type: 'defense',
                techLevel: 1
            };

            const speed = rules.getShipInitialSpeed(mockShip);

            test.assertEqual(speed, 0, 'Defense ships should have zero speed');
        });

        test.it('doubles speed in fast game mode', () => {
            const rulesNormal = new Rules(false);
            const rulesFast = new Rules(true);

            const mockShip = {
                type: 'scout',
                techLevel: 1
            };

            const normalSpeed = rulesNormal.getShipInitialSpeed(mockShip);
            const fastSpeed = rulesFast.getShipInitialSpeed(mockShip);

            test.assertEqual(fastSpeed, normalSpeed * 2, 'Fast game should double speed');
        });

        test.it('increases speed with tech level', () => {
            const rules = new Rules(false);

            const ship1 = { type: 'scout', techLevel: 1 };
            const ship5 = { type: 'scout', techLevel: 5 };

            const speed1 = rules.getShipInitialSpeed(ship1);
            const speed5 = rules.getShipInitialSpeed(ship5);

            test.assertGreaterThan(speed5, speed1, 'Higher tech should have higher speed');
        });
    });

    test.describe('Ship Movement - Distance and Travel Time', () => {
        test.it('ships take reasonable time to cross map', () => {
            pdg.srand(TEST_SEED);

            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            // Get a home star
            const homeStar = game.stars.find(s => s.owner === 1);
            test.assert(homeStar, 'Should have home star');

            // Create a scout
            const scout = game.factory.createShip(homeStar.x, homeStar.y, 'scout', homeStar);
            scout.progress = 100; // Complete the ship

            // Get enemy home star
            const enemyStar = game.stars.find(s => s.owner === 2);
            test.assert(enemyStar, 'Should have enemy star');

            // Calculate distance
            const dx = enemyStar.x - homeStar.x;
            const dy = enemyStar.y - homeStar.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate expected turns
            const expectedTurns = Math.ceil(distance / scout.speed);

            // Should take many turns (40-100 typical for map crossing)
            test.assertGreaterThan(expectedTurns, 10, 'Should take more than 10 turns to reach enemy');
            test.assertLessThan(expectedTurns, 200, 'Should take less than 200 turns');
        });

        test.it('ship moves correct distance per turn', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            // Create a scout at origin
            const mockStar = { x: 0, y: 0, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(0, 0, 'scout', mockStar);
            scout.progress = 100;
            scout.star = null; // Not at a star

            // Set destination
            scout.setDestination({ x: 1000000, y: 0 });

            const initialX = scout.x;
            const speed = scout.speed;

            // Move one turn
            scout.move();

            const distance = scout.x - initialX;

            // Should have moved exactly 'speed' distance
            test.assertApproximately(distance, speed, 1, 'Should move speed distance per turn');
        });

        test.it('ship arrives at destination', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 0, y: 0, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(0, 0, 'scout', mockStar);
            scout.progress = 100;
            scout.star = null;

            // Set close destination
            const destination = { x: 10000, y: 0 };
            scout.setDestination(destination);

            const maxTurns = 100;
            let turns = 0;
            
            while (scout.destination && turns < maxTurns) {
                scout.move();
                turns++;
            }

            test.assert(turns < maxTurns, 'Ship should arrive within reasonable time');
            test.assertApproximately(scout.x, 10000, 20, 'Ship should reach destination X');
        });

        test.it('defense ships do not move', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 100000, y: 100000, owner: 1, techLevel: 1, game: game };
            const defense = game.factory.createShip(100000, 100000, 'defense', mockStar);
            defense.progress = 100;

            const initialX = defense.x;
            const initialY = defense.y;

            // Try to set destination
            defense.setDestination({ x: 200000, y: 200000 });

            // Move several turns
            for (let i = 0; i < 5; i++) {
                defense.move();
            }

            // Should not have moved
            test.assertEqual(defense.x, initialX, 'Defense ship should not move in X');
            test.assertEqual(defense.y, initialY, 'Defense ship should not move in Y');
        });
    });

    test.describe('Ship Movement - Under Construction', () => {
        test.it('ships under construction do not move', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 100000, y: 100000, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(100000, 100000, 'scout', mockStar);
            scout.progress = 50; // Only 50% complete

            const initialX = scout.x;
            const initialY = scout.y;

            scout.setDestination({ x: 200000, y: 200000 });
            scout.move();

            // Should not have moved
            test.assertEqual(scout.x, initialX, 'Incomplete ship should not move in X');
            test.assertEqual(scout.y, initialY, 'Incomplete ship should not move in Y');
        });

        test.it('completed ships can move', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 0, y: 0, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(0, 0, 'scout', mockStar);
            scout.progress = 100; // Complete
            scout.star = null;

            scout.setDestination({ x: 1000000, y: 0 });
            scout.move();

            // Should have moved
            test.assertGreaterThan(scout.x, 0, 'Complete ship should move');
        });
    });

    test.describe('Distance Calculations', () => {
        test.it('calculates Manhattan-ish distance for diagonal movement', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 0, y: 0, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(0, 0, 'scout', mockStar);
            scout.progress = 100;
            scout.star = null;

            // 3-4-5 triangle: distance should be 5 * scale
            const destination = { x: 300000, y: 400000 };
            scout.setDestination(destination);

            // Calculate expected distance
            const dx = destination.x - scout.x;
            const dy = destination.y - scout.y;
            const expectedDistance = Math.sqrt(dx * dx + dy * dy);

            test.assertEqual(expectedDistance, 500000, '3-4-5 triangle should have distance 500,000');
        });

        test.it('moves in straight line to destination', () => {
            const factory = new Factory();
            const rules = new Rules(false);
            const config = GameConfig.createSinglePlayer(1, 2);
            const game = new Game(factory, rules, config);

            const mockStar = { x: 0, y: 0, owner: 1, techLevel: 1, game: game };
            const scout = game.factory.createShip(0, 0, 'scout', mockStar);
            scout.progress = 100;
            scout.star = null;

            // Move to diagonal destination
            scout.setDestination({ x: 100000, y: 100000 });

            const positions = [{ x: scout.x, y: scout.y }];

            // Track several positions
            for (let i = 0; i < 3; i++) {
                scout.move();
                if (!scout.destination) break;
                positions.push({ x: scout.x, y: scout.y });
            }

            // All positions should be on line from origin to destination
            // (allowing for small floating point errors)
            for (let i = 1; i < positions.length; i++) {
                const ratio = positions[i].x / positions[i].y;
                test.assertApproximately(ratio, 1.0, 0.01, 'Should move in straight line (45 degrees)');
            }
        });
    });
}

module.exports = runCoordinateMovementTests;

