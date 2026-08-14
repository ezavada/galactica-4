const test = require('./test-framework.js');

if (typeof global.pdg === 'undefined') {
    global.pdg = {
        res: {
            getString: () => '',
            getImage: (_path) => ({ path: _path, getWidth: () => 512, getHeight: () => 512 })
        },
        tm: { getMilliseconds: () => Date.now() },
        Color: function(){},
        Attributes: function(){
            this.fillColor = () => this;
            this.textSize = () => this;
            this.textStyle = () => this;
            this.fillOpacity = () => this;
            this.lineColor = () => this;
            this.lineOpacity = () => this;
            this.fillLinearGradient = () => this;
            this.fillRadialGradient = () => this;
            this.lineStyle = () => this;
        },
        Point: function(){},
        Rect: function(){},
        Polygon: function(){},
        textStyle_Plain: 0,
        textStyle_Centered: 1,
        lineStyle_Solid: 0,
        key_Tab: 9,
        key_Escape: 27,
        srand: () => {},
        rand: () => 0
    };
}

const Common = require('../src/js/common.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const Rules = require('../src/js/rules.js');
const GameConfig = require('../src/js/game-config.js');
const Display = require('../src/js/display.js');

function keyCode(char) {
    return char.charCodeAt(0);
}

function createGameForTests() {
    const factory = new Factory();
    const rules = new Rules(true);
    const config = GameConfig.createSinglePlayer(1, 2);
    config.skipMapGeneration = true;
    return new Game(factory, rules, config);
}

function createFakePort(width = 800, height = 600) {
    return {
        getDrawingArea: () => ({ width: () => width, height: () => height }),
        drawRect: () => {},
        drawImage: () => {},
        drawLine: () => {},
        drawPolygon: () => {},
        drawCircle: () => {},
        drawText: () => {}
    };
}

function createOwnedStar(game, owner, name = 'Alpha') {
    const star = game.getFactory().createStar(0, 0, name);
    star.owner = owner;
    star.population = 2;
    star.techLevel = 3;
    return star;
}

function allocationTotal(game, star) {
    return game.getAllocationDesired(star.growth) +
        game.getAllocationDesired(star.shipBuilding) +
        game.getAllocationDesired(star.research);
}

module.exports = function runCommandUITests() {
    test.describe('Command UI State and Production Controls', () => {
        test.it('records noteworthy game events for the event list', () => {
            const game = createGameForTests();
            const ship = { type: 'scout', x: 10, y: 20 };

            game.noteworthyEvent(ship, Common.EventType.SHIP_STOPPED, { x: 10, y: 20 });

            const latest = game.getRecentEvents(1)[0];
            test.assertEqual(latest.title, 'Orders');
            test.assert(latest.message.indexOf('scout ship stopped') !== -1, `Unexpected event message: ${latest.message}`);
        });

        test.it('keeps star production desired allocations balanced to 100%', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1);

            const changed = game.adjustStarAllocation(star, 'growth', 15);

            test.assertTrue(changed, 'Human-owned star allocation should change');
            test.assertEqual(game.getAllocationDesired(star.growth), 49);
            test.assertEqual(allocationTotal(game, star), 100);

            game.adjustStarAllocation(star, 'research', -20);
            test.assertEqual(allocationTotal(game, star), 100);
            test.assertInRange(game.getAllocationDesired(star.research), 0, 100);
        });

        test.it('refuses production changes on non-human stars', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 2);

            const changed = game.adjustStarAllocation(star, 'growth', 10);

            test.assertFalse(changed, 'Enemy star allocation should not change');
            test.assertEqual(allocationTotal(game, star), 100);
        });

        test.it('routes production-window keys without triggering build shortcuts', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1);
            game.selectedObject = star;

            game.handleKeyPress(keyCode('p'));
            test.assertEqual(game.uiWindow, 'production');

            game.handleKeyPress(keyCode('s'));
            test.assertNull(star.currentShip, 'Production slider shortcut should not build a scout');

            game.handleKeyPress(pdg.key_Escape);
            test.assertNull(game.uiWindow);

            game.handleKeyPress(keyCode('s'));
            test.assertNotNull(star.currentShip, 'Build shortcut should work after production window closes');
            test.assertEqual(star.currentShip.type, 'scout');
        });

        test.it('builds comparison rows for the comparison window', () => {
            const game = createGameForTests();
            const playerStar = createOwnedStar(game, 1, 'Sol');
            playerStar.population = 2.5;
            playerStar.techLevel = 4;
            const aiStar = createOwnedStar(game, 2, 'Rigel');
            aiStar.population = 1.5;
            aiStar.techLevel = 2;

            const ship = game.getFactory().createShip(playerStar.x, playerStar.y, 'scout', playerStar);
            ship.complete();

            const rows = game.getPlayerComparisonRows();
            const playerRow = rows.find(row => row.playerNum === 1);
            const aiRow = rows.find(row => row.playerNum === 2);

            test.assertEqual(playerRow.stars, 1);
            test.assertEqual(playerRow.ships, 1);
            test.assertEqual(playerRow.population, 2500);
            test.assertEqual(playerRow.averageTech, 4);
            test.assertEqual(aiRow.stars, 1);
            test.assertEqual(aiRow.population, 1500);
        });

        test.it('anchors selected-object panels left of the object and clamps onscreen', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const centeredStar = createOwnedStar(game, 1, 'Centered');
            centeredStar.x = 500;
            centeredStar.y = 300;
            const centeredRect = display.getAnchoredPanelRect(centeredStar, 200, 120);

            test.assertEqual(centeredRect.x, 282);
            test.assertEqual(centeredRect.y, 240);

            const edgeStar = createOwnedStar(game, 1, 'Edge');
            edgeStar.x = 30;
            edgeStar.y = 20;
            const edgeRect = display.getAnchoredPanelRect(edgeStar, 200, 120);

            test.assertGreaterThanOrEqual(edgeRect.x, 10);
            test.assertGreaterThanOrEqual(edgeRect.y, 10);
            test.assert(edgeRect.x + edgeRect.width <= 790, 'Panel should stay within the right edge');
            test.assert(edgeRect.y + edgeRect.height <= 590, 'Panel should stay within the bottom edge');
        });
    });
};
