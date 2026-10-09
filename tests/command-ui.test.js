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
            this.fillGradient = () => this;
            this.fillRadialGradient = () => this;
            this.lineStyle = () => this;
        },
        Point: function(x = 0, y = 0){
            this.x = x;
            this.y = y;
        },
        Rect: function(arg1 = 0, arg2 = 0, arg3 = 0, arg4 = 0){
            if (arg1 && arg1.x !== undefined && arg1.y !== undefined) {
                this.x = arg1.x;
                this.y = arg1.y;
                this.width = arg2;
                this.height = arg3;
            } else {
                this.x = arg1;
                this.y = arg2;
                this.width = arg3;
                this.height = arg4;
            }
        },
        Polygon: function(){},
        textStyle_Plain: 0,
        textStyle_Centered: 16,
        textStyle_RightJustified: 32,
        lineStyle_Solid: 2,
        key_Tab: 9,
        key_Escape: 27,
        srand: () => {},
        rand: () => 0
    };
}
if (global.pdg.textStyle_RightJustified === undefined) {
    global.pdg.textStyle_RightJustified = 32;
}
if (global.pdg.textStyle_Centered === undefined) {
    global.pdg.textStyle_Centered = 16;
}
if (global.pdg.lineStyle_Solid === undefined) {
    global.pdg.lineStyle_Solid = 2;
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
        drawRoundedRect: () => {},
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
    return [star.growth,star.shipBuilding,star.research].reduce((sum,allocation)=>
        sum+Math.round(game.getAllocationDesired(allocation)*10),0)/10;
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
            test.assertEqual(game.getAllocationDesired(star.growth), 48.4);
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

        test.it('keeps lowercase c for colony builds while Shift+C centers the selected object', () => {
            const colonyGame = createGameForTests();
            const colonyStar = createOwnedStar(colonyGame, 1);
            colonyGame.selectedObject = colonyStar;
            colonyGame.display = { centerOn: () => {}, setSelectedObject: () => {} };

            colonyGame.handleKeyPress(keyCode('c'));

            test.assertNotNull(colonyStar.currentShip, 'Lowercase c should start a colony ship');
            test.assertEqual(colonyStar.currentShip.type, 'colony');

            const centerGame = createGameForTests();
            const centerStar = createOwnedStar(centerGame, 1);
            centerGame.selectedObject = centerStar;
            let centered = false;
            centerGame.display = {
                centerOn: () => { centered = true; },
                setSelectedObject: () => {}
            };

            centerGame.handleKeyPress(keyCode('C'));

            test.assertTrue(centered, 'Shift+C should center the selected object');
            test.assertNull(centerStar.currentShip, 'Shift+C should not start colony construction');
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

            test.assertEqual(centeredRect.x, 256);
            test.assertEqual(centeredRect.y, 240);
            test.assertEqual(display.getPanelContentStartY(centeredRect), centeredRect.y + 47);

            const centeredPointer = display.getPanelPointer(centeredStar, centeredRect);
            test.assertEqual(centeredPointer.side, 'right');
            test.assertApproximately(centeredPointer.points[1].x - (centeredRect.x + centeredRect.width), Math.sqrt(300), 0.001);
            test.assertEqual(centeredPointer.points[0].y, centeredStar.y - 10);
            test.assertEqual(centeredPointer.points[2].y, centeredStar.y + 10);

            const edgeStar = createOwnedStar(game, 1, 'Edge');
            edgeStar.x = 30;
            edgeStar.y = 20;
            const edgeRect = display.getAnchoredPanelRect(edgeStar, 200, 120);

            test.assertGreaterThanOrEqual(edgeRect.x, 10);
            test.assertGreaterThanOrEqual(edgeRect.y, 10);
            test.assert(edgeRect.x + edgeRect.width <= 790, 'Panel should stay within the right edge');
            test.assert(edgeRect.y + edgeRect.height <= 590, 'Panel should stay within the bottom edge');
        });

        test.it('uses Attributes rounded corners with positioned rects', () => {
            const game = createGameForTests();
            let drawCall = null;
            game.port = {
                ...createFakePort(800, 600),
                drawRect: (rect, attrs) => {
                    drawCall = { rect, attrs };
                }
            };
            const display = new Display(game);
            const attrs = new pdg.Attributes();

            display.drawRoundedRect({ x: 42, y: 73, width: 120, height: 44 }, 11, attrs);

            test.assertNotNull(drawCall, 'Display should draw rounded rectangles with port.drawRect');
            test.assertEqual(attrs.getRoundedCornerRadius(), 11);
            test.assertEqual(drawCall.rect.left !== undefined ? drawCall.rect.left : drawCall.rect.x, 42);
            test.assertEqual(drawCall.rect.top !== undefined ? drawCall.rect.top : drawCall.rect.y, 73);
            test.assertEqual(drawCall.rect.right !== undefined ? drawCall.rect.right : drawCall.rect.x + drawCall.rect.width, 162);
            test.assertEqual(drawCall.rect.bottom !== undefined ? drawCall.rect.bottom : drawCall.rect.y + drawCall.rect.height, 117);
            test.assertTrue(drawCall.attrs === attrs, 'Display should pass the supplied Attributes object through directly');
        });

        test.it('draws star default-destination lines in screen coordinates', () => {
            const game = createGameForTests();
            const lineCalls = [];
            game.port = {
                ...createFakePort(800, 600),
                drawLine: (from, to, attrs) => {
                    lineCalls.push({ from, to, attrs });
                }
            };
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.mapEntityNameOpacity = 1;
            display.toScreenX = (x) => (x / 10) + 3;
            display.toScreenY = (y) => (y / 10) + 5;

            const star = createOwnedStar(game, 1, 'Waypoint');
            star.x = 100;
            star.y = 200;
            star.setDefaultDestination({ x: 900, y: 500 });

            display.drawStar(star);

            const destinationLine = lineCalls.find(call => call.attrs === display.styles.defaultDestinationLine);
            test.assertNotNull(destinationLine, 'Owned stars with a default destination should draw a destination line');
            test.assertEqual(destinationLine.from.x, 13);
            test.assertEqual(destinationLine.from.y, 25);
            test.assertEqual(destinationLine.to.x, 93);
            test.assertEqual(destinationLine.to.y, 55);
        });

        test.it('draws panel title dividers near the title text', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            let dividerY = null;
            display.drawRoundedRect = () => {};
            display.drawTextLine = () => {};
            display.drawDivider = (_x, y) => {
                dividerY = y;
            };

            display.drawPanel({ x: 40, y: 70, width: 220, height: 120 }, 'Title');

            test.assertEqual(dividerY, 98);
        });

        test.it('handles clicks on permanent map buttons', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);

            const menuButton = display.getMapButtonRegions().find(button => button.label === 'Menu');
            test.assertNotNull(menuButton, 'Menu button should exist');
            test.assertEqual(menuButton.rect.width, 98);
            const productionButton = display.getMapButtonRegions().find(button => button.label === 'Production');
            test.assertUndefined(productionButton, 'Production should not be a permanent map button');

            const handled = game.handleUIClick(menuButton.rect.x + 5, menuButton.rect.y + 5);

            test.assertTrue(handled, 'Map button click should be consumed');
            test.assertEqual(game.uiWindow, 'menu');

            const endTurnButton = display.getMapButtonRegions().find(button => button.action.type === 'endTurn');
            test.assertNotNull(endTurnButton, 'End Turn button should exist');
            createOwnedStar(game, 1, 'Sol');
            createOwnedStar(game, 2, 'Rigel');
            const turnBefore = game.turn;
            const handledEndTurn = game.handleUIClick(endTurnButton.rect.x + 5, endTurnButton.rect.y + 5);

            test.assertTrue(handledEndTurn, 'End Turn button click should be consumed');
            test.assertEqual(game.turn, turnBefore + 1, 'End Turn button should advance the turn');
        });

        test.it('closes event windows before advancing the turn', () => {
            const game = createGameForTests();
            createOwnedStar(game, 1, 'Sol');
            createOwnedStar(game, 2, 'Rigel');
            game.overlay = { type: 'lab', classIndex: 2 };
            game.uiWindow = 'events';

            const turnBefore = game.turn;
            const result = game.endTurn();

            test.assertNull(game.overlay, 'Event presentation overlay should close');
            test.assertNull(game.uiWindow, 'Event list window should close');
            test.assertEqual(game.turn, turnBefore + 1, 'Turn should still advance after event windows close');
            test.assertFalse(result.isGameOver, 'Closing event windows should not force a game-over result');
        });

        test.it('lets the end-turn hotkey advance while an event overlay is open', () => {
            const game = createGameForTests();
            createOwnedStar(game, 1, 'Sol');
            createOwnedStar(game, 2, 'Rigel');
            game.overlay = { type: 'stardock', classIndex: 1 };
            game.uiWindow = 'events';

            const turnBefore = game.turn;
            game.handleKeyPress(pdg.key_Tab);

            test.assertNull(game.overlay, 'End-turn hotkey should close the overlay');
            test.assertNull(game.uiWindow, 'End-turn hotkey should close the event list');
            test.assertEqual(game.turn, turnBefore + 1, 'End-turn hotkey should advance instead of only dismissing the overlay');
        });

        test.it('queues event presentations and advances them on dismissal', () => {
            const game = createGameForTests();

            game.queueEventOverlay({ type: 'lab', classIndex: 1 });
            game.queueEventOverlay({ type: 'stardock', classIndex: 2 });

            test.assertEqual(game.overlay.type, 'lab');
            test.assertEqual(game.overlayQueue.length, 1);

            game.dismissEventPresentation();

            test.assertEqual(game.overlay.type, 'stardock');
            test.assertEqual(game.overlay.classIndex, 2);
            test.assertEqual(game.overlayQueue.length, 0);

            game.dismissEventPresentation();

            test.assertNull(game.overlay);
        });

        test.it('handles clicks on selected-star action buttons', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const star = createOwnedStar(game, 1, 'Button Star');
            star.x = 500;
            star.y = 300;
            game.setSelectedObject(star);

            const productionButton = display.getContextButtonRegions(star).find(button => button.label === 'Production');
            test.assertUndefined(productionButton, 'Selected-star popup should not have a separate production button');
            const scoutButton = display.getContextButtonRegions(star).find(button => button.action.shipType === 'scout');
            test.assertNotNull(scoutButton, 'Scout action button should exist');
            test.assertEqual(scoutButton.rect.width, 96);

            const handled = game.handleUIClick(scoutButton.centerX, scoutButton.centerY);

            test.assertTrue(handled, 'Context button click should be consumed');
            test.assertNotNull(star.currentShip, 'Scout button should start construction');
            test.assertEqual(star.currentShip.type, 'scout');
        });

        test.it('clicks star-window sliders directly and consumes plain panel clicks', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const star = createOwnedStar(game, 1, 'Slider Star');
            star.x = 500;
            star.y = 300;
            game.setSelectedObject(star);

            const growthSlider = display.getStarAllocationSliderRegions(star).find(region => region.key === 'growth');
            test.assertNotNull(growthSlider, 'Growth slider should be exposed as a clickable region');

            const handledSlider = game.handleUIClick(growthSlider.trackRect.x + growthSlider.trackRect.width / 2, growthSlider.trackRect.y + 2);

            test.assertTrue(handledSlider, 'Slider click should be consumed');
            test.assertEqual(game.getAllocationDesired(star.growth), 50);
            test.assertEqual(allocationTotal(game, star), 100);

            const panelRect = display.getSelectedObjectPanelRect(star);
            const handledPanel = game.handleUIClick(panelRect.x + 16, panelRect.y + 46);

            test.assertTrue(handledPanel, 'Plain panel click should be consumed');
            test.assertEqual(game.selectedObject, star, 'Plain panel click should not hide the selected-object window');
        });

        test.it('brightens button text and darkens button background when hovered', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            const button = display.getMapButtonRegions()[0];
            let drawnColor = null;
            let drawnText = null;
            let roundedAttrs = null;
            display.drawRoundedRect = (_rect, _radius, attrs) => {
                roundedAttrs = attrs;
            };
            display.drawTextLine = (text, _x, _y, color) => {
                drawnText = text;
                drawnColor = color;
            };

            display.setHoverPoint(button.rect.x + button.rect.width / 2, button.rect.y + button.rect.height / 2);
            display.drawUIButton(button.rect, button.label, button.key);

            test.assertEqual(drawnText, `${button.label} <${button.key}>`);
            test.assertEqual(drawnColor, 'hovergray');
            test.assertTrue(roundedAttrs === display.styles.buttonFillHover, 'Hovered buttons should use the hover Attributes class');
        });

        test.it('draws production sliders with right-justified labels and baseline bars', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            const star = createOwnedStar(game, 1, 'Slider Labels');
            const drawnText = [];
            let barCall = null;
            display.drawTextLine = (text, x, y, color, size, style) => {
                drawnText.push({ text, x, y, color, size, style });
            };
            display.drawBar = (x, y, width, height) => {
                barCall = { x, y, width, height };
            };

            display.drawAllocationSlider('Growth', star.growth, 40, 100, 150, 'green');

            const rects = display.getAllocationSliderRects(40, 100, 150);
            test.assertEqual(drawnText[0].text, 'Growth:');
            test.assertEqual(drawnText[0].x, rects.track.x - 8);
            test.assertEqual(drawnText[0].color, 'labelgray');
            test.assertEqual(drawnText[0].style, pdg.textStyle_RightJustified);
            test.assertEqual(drawnText[1].text, '33.4%');
            test.assertEqual(drawnText[1].x, rects.track.x + rects.track.width + 8);
            test.assertEqual(barCall.y + barCall.height, 100);
            test.assert(drawnText.every(entry => entry.text.indexOf('→') === -1), 'Slider text should not include current-to-desired arrows');
        });

        test.it('draws info labels dimmer than values', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;
            display.drawAnchoredPanel = () => {};
            display.drawContextButtonArc = () => {};
            display.drawDivider = () => {};
            display.drawStarAllocationSummary = () => {};

            const star = createOwnedStar(game, 1, 'Labels');
            star.x = 500;
            star.y = 300;
            const drawnText = [];
            display.drawTextLine = (text, x, y, color) => {
                drawnText.push({ text, x, y, color });
            };

            display.drawStarDetails(star);

            const popLabel = drawnText.find(entry => entry.text === 'Pop:');
            const popValue = drawnText.find(entry => entry.text === '2000');
            test.assertNotNull(popLabel, 'Pop label should be drawn separately');
            test.assertNotNull(popValue, 'Population value should be drawn separately');
            test.assertEqual(popLabel.color, 'labelgray');
            test.assertEqual(popValue.color, 'lightgray');
            test.assertEqual(popValue.x - popLabel.x, 5);
        });

        test.it('uses numeric visibility levels and omniscient mode for display visibility', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);

            const enemyStar = createOwnedStar(game, 2, 'Enemy Star');
            enemyStar.setVisibilityTo(1, Common.VisibilityLevel.CLASS);
            test.assertEqual(
                display.getVisibilityLevelForPlayer(enemyStar, 1),
                Common.VisibilityLevel.CLASS,
                'Display should use numeric visibility levels directly'
            );

            const hiddenShip = game.getFactory().createShip(0, 0, 'scout', enemyStar);
            hiddenShip.owner = 2;
            hiddenShip.progress = 100;
            test.assertFalse(display.isEntityVisibleToPlayer(hiddenShip, 1), 'Unseen enemy ship should be hidden');

            game.config.omniscient = true;
            test.assertEqual(
                display.getVisibilityLevelForPlayer(enemyStar, 1),
                Common.VisibilityLevel.DETAILS,
                'Omniscient mode should grant full display details'
            );
            test.assertTrue(display.isEntityVisibleToPlayer(hiddenShip, 1), 'Omniscient mode should show enemy ships');
        });

        test.it('draws star build progress on the Building line with a baseline-aligned bar', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;
            display.drawAnchoredPanel = () => {};
            display.drawContextButtonArc = () => {};
            display.drawDivider = () => {};
            display.drawStarAllocationSummary = () => {};

            const star = createOwnedStar(game, 1, 'Build Progress');
            star.x = 500;
            star.y = 300;
            star.startBuildingShip('scout');
            star.currentShip.progress = 37.9;
            const rect = display.getStarDetailsLayout(star).rect;
            const drawnText = [];
            let barCall = null;
            display.drawTextLine = (text, x, y, color, size, style) => {
                drawnText.push({ text, x, y, color, size, style });
            };
            display.drawBar = (x, y, width, height, ratio) => {
                barCall = { x, y, width, height, ratio };
            };

            display.drawStarDetails(star);

            const buildingLabel = drawnText.find(entry => entry.text === 'Building:');
            const progressText = drawnText.find(entry => entry.text === '37%');
            test.assertNotNull(buildingLabel, 'Building label should be drawn');
            test.assertNotNull(progressText, 'Build progress should be drawn');
            test.assertEqual(buildingLabel.color, 'labelgray');
            test.assertEqual(progressText.y, buildingLabel.y);
            test.assertEqual(progressText.x, rect.x + rect.width - 25);
            test.assertEqual(progressText.style, pdg.textStyle_RightJustified);
            test.assertEqual(barCall.y + barCall.height, buildingLabel.y);
            test.assertApproximately(barCall.ratio, 0.379, 0.001);
        });

        test.it('uses the ship Orders button to arm a left-click destination', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;
            display.toGalacticX = (x) => x;
            display.toGalacticY = (y) => y;

            const star = createOwnedStar(game, 1, 'Dock');
            const ship = game.getFactory().createShip(500, 300, 'scout', star);
            ship.complete();
            game.setSelectedObject(ship);

            const ordersButton = display.getContextButtonRegions(ship).find(button => button.action.type === 'beginOrders');
            test.assertNotNull(ordersButton, 'Orders action button should exist for controllable ships');

            const handled = game.handleUIClick(ordersButton.centerX, ordersButton.centerY);
            test.assertTrue(handled, 'Orders button click should be consumed');
            test.assertTrue(game.isAwaitingMapTarget(), 'Orders button should arm map targeting');

            game.handleMouseClick(250, 260);

            test.assertFalse(game.isAwaitingMapTarget(), 'Map targeting should clear after destination click');
            test.assertNotNull(ship.destination, 'Destination should be set by the next left click');
            test.assertEqual(ship.destination.x, 250);
            test.assertEqual(ship.destination.y, 260);
        });

        test.it('places popup action arcs opposite the info panel side', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const star = createOwnedStar(game, 1, 'Arc');
            star.x = 500;
            star.y = 300;

            const leftPanelButtons = display.getContextButtonArc(star, { x: 260, y: 240, width: 200, height: 120 });
            test.assert(leftPanelButtons.every(button => button.centerX > star.x), 'Buttons should arc right when panel is left of object');
            for (let i = 1; i < leftPanelButtons.length; i++) {
                test.assertEqual(leftPanelButtons[i].centerY - leftPanelButtons[i - 1].centerY, 36);
            }
            test.assertInRange(leftPanelButtons[0].rect.x - star.x, 50, 68, 'The arc should keep a usable gap as the action count grows');

            const rightPanelButtons = display.getContextButtonArc(star, { x: 540, y: 240, width: 200, height: 120 });
            test.assert(rightPanelButtons.every(button => button.centerX < star.x), 'Buttons should arc left when panel is right of object');

            const rightButtonConnector = display.getButtonConnectorPoint(star, leftPanelButtons[0]);
            test.assertEqual(rightButtonConnector.x, leftPanelButtons[0].rect.x, 'Connector should hit the left side of right-side buttons');
            test.assertEqual(rightButtonConnector.y, leftPanelButtons[0].rect.y + leftPanelButtons[0].rect.height / 2);

            const leftButtonConnector = display.getButtonConnectorPoint(star, rightPanelButtons[0]);
            test.assertEqual(leftButtonConnector.x, rightPanelButtons[0].rect.x + rightPanelButtons[0].rect.width, 'Connector should hit the right side of left-side buttons');

            const start = display.getConnectorStartPoint(star, rightButtonConnector.x, rightButtonConnector.y);
            const dx = start.x - star.x;
            const dy = start.y - star.y;
            test.assertApproximately(Math.sqrt(dx * dx + dy * dy), display.getObjectSelectionRadius(star) + 5, 0.001);
        });

        test.it('snaps popup button regions and button text to integer pixels', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledStarRadius = 8;
            display.toScreenX = (x) => x + 0.35;
            display.toScreenY = (y) => y + 0.65;

            const star = createOwnedStar(game, 1, 'Fractional Arc');
            star.x = 500;
            star.y = 300;

            const buttons = display.getContextButtonArc(star, { x: 260, y: 240, width: 200, height: 120 });
            for (const button of buttons) {
                test.assert(Number.isInteger(button.centerX), 'Button centerX should be an integer');
                test.assert(Number.isInteger(button.centerY), 'Button centerY should be an integer');
                test.assert(Number.isInteger(button.rect.x), 'Button rect.x should be an integer');
                test.assert(Number.isInteger(button.rect.y), 'Button rect.y should be an integer');
            }

            let textX = null;
            let textY = null;
            let drawnRect = null;
            display.drawRoundedRect = (rect) => {
                drawnRect = rect;
            };
            display.drawTextLine = (_text, x, y) => {
                textX = x;
                textY = y;
            };

            display.drawUIButton({ x: 12.4, y: 18.6, width: 95.8, height: 27.7 }, 'Pixel', 'P');

            test.assert(Number.isInteger(drawnRect.x), 'Drawn button x should be snapped');
            test.assert(Number.isInteger(drawnRect.y), 'Drawn button y should be snapped');
            test.assert(Number.isInteger(textX), 'Button text x should be snapped');
            test.assert(Number.isInteger(textY), 'Button text y should be snapped');
        });
    });
};
