const test = require('./test-framework.js');

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

function createOwnedStar(game, owner, name = 'Alpha', x = 0, y = 0) {
    const star = game.getFactory().createStar(x, y, name);
    star.owner = owner;
    star.population = 2;
    star.techLevel = 3;
    return star;
}

function createCompletedShip(game, star, type = 'scout') {
    const ship = game.getFactory().createShip(star.x, star.y, type, star);
    ship.complete();
    ship.name = `${type} ${ship.id}`;
    star.shipArrived(ship);
    return ship;
}

module.exports = function runRendezvousTests() {
    test.describe('Rendezvous and Fleet UI', () => {
        test.it('registers rendezvous points as first-class owned entities', () => {
            const game = createGameForTests();
            const rendezvous = game.createRendezvousAt(2048, 4096, 1, 'Alpha Meet');

            test.assertEqual(game.getObjectType(rendezvous), Common.ObjectType.RENDEZVOUS);
            test.assertEqual(game.allRendezvous.length, 1);
            test.assertEqual(rendezvous.name, 'Alpha Meet');
            test.assertTrue(rendezvous.isVisibleTo(1), 'Owner should see their rendezvous point');
            test.assertFalse(rendezvous.isVisibleTo(2), 'Enemy players should not see private rendezvous points');
            test.assertEqual(game.getSpatialStats().totalRendezvous, 1);
        });

        test.it('creates and remembers an assembly fleet when a ship reaches a rendezvous', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1, 'Dock');
            const rendezvous = game.createRendezvousAt(100, 0, 1, 'Task Force One');
            const ship = createCompletedShip(game, star, 'battleship');

            ship.setDestination(rendezvous);
            ship.arriveAtDestination();

            const fleet = rendezvous.getFleet();
            test.assertNotNull(fleet, 'First ship to a rendezvous should create an assembly fleet');
            test.assertEqual(fleet.name, 'Task Force One');
            test.assertEqual(fleet.getSize(), 1);
            test.assertEqual(ship.fleet, fleet);
            test.assertEqual(ship.star, null);
            test.assertEqual(fleet.x, rendezvous.x);
            test.assertEqual(fleet.y, rendezvous.y);
        });

        test.it('adds later ships to the rendezvous assembly fleet', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1, 'Dock');
            const rendezvous = game.createRendezvousAt(100, 0, 1, 'Task Force Two');
            const firstShip = createCompletedShip(game, star, 'scout');
            const secondShip = createCompletedShip(game, star, 'colony');

            firstShip.setDestination(rendezvous);
            firstShip.arriveAtDestination();
            const fleet = rendezvous.getFleet();

            secondShip.setDestination(rendezvous);
            secondShip.arriveAtDestination();

            test.assertEqual(rendezvous.getFleet(), fleet);
            test.assertEqual(fleet.getSize(), 2);
            test.assertContains(fleet.ships, firstShip);
            test.assertContains(fleet.ships, secondShip);
        });

        test.it('uses an arriving fleet as the rendezvous assembly fleet', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1, 'Dock');
            const rendezvous = game.createRendezvousAt(100, 0, 1, 'Forward Group');
            const ship = createCompletedShip(game, star, 'battleship');
            const fleet = game.getFactory().createFleet(star.x, star.y, 1, 'Existing Fleet');
            fleet.addShip(ship);

            fleet.setDestination(rendezvous);
            fleet.arriveAtDestination();

            test.assertEqual(rendezvous.getFleet(), fleet);
            test.assertEqual(fleet.x, rendezvous.x);
            test.assertEqual(fleet.y, rendezvous.y);
            test.assertEqual(fleet.destination, null);
        });

        test.it('clears a rendezvous fleet reference after the fleet leaves', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1, 'Dock');
            const rendezvous = game.createRendezvousAt(100, 0, 1, 'Brief Stop');
            const ship = createCompletedShip(game, star, 'scout');

            ship.setDestination(rendezvous);
            ship.arriveAtDestination();
            const fleet = rendezvous.getFleet();

            fleet.x = 500;
            fleet.y = 0;
            fleet.syncShipPositions();
            game.refreshRendezvousFleetReferences();

            test.assertNull(rendezvous.getFleet(), 'Rendezvous should forget fleets that have moved away');
        });

        test.it('clears star and ship/fleet destinations when deleting a rendezvous', () => {
            const game = createGameForTests();
            const star = createOwnedStar(game, 1, 'Dock');
            const rendezvous = game.createRendezvousAt(100, 0, 1, 'Cleanup');
            const ship = createCompletedShip(game, star, 'scout');
            const fleet = game.getFactory().createFleet(star.x, star.y, 1, 'Cleanup Fleet');

            star.setDefaultDestination(rendezvous);
            ship.setDestination(rendezvous);
            fleet.setDestination(rendezvous);

            game.deleteRendezvous(rendezvous);

            test.assertEqual(game.allRendezvous.length, 0);
            test.assertNull(star.getDefaultDestination());
            test.assertNull(ship.destination);
            test.assertNull(fleet.destination);
        });

        test.it('uses the map rendezvous button to arm placement and create a point', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.toGalacticX = (x) => x * 10;
            display.toGalacticY = (y) => y * 10;

            const rendezvousButton = display.getMapButtonRegions().find(button => button.action.type === 'beginRendezvousPlacement');
            test.assertNotNull(rendezvousButton, 'Permanent rendezvous button should exist');

            game.handleUIClick(rendezvousButton.rect.x + 2, rendezvousButton.rect.y + 2);
            test.assertNotNull(game.pendingRendezvousPlacement, 'Rendezvous button should arm placement');

            game.handleMouseClick(30, 40);

            test.assertNull(game.pendingRendezvousPlacement);
            test.assertEqual(game.allRendezvous.length, 1);
            test.assertEqual(game.allRendezvous[0].x, 300);
            test.assertEqual(game.allRendezvous[0].y, 400);
            test.assertEqual(game.selectedObject, game.allRendezvous[0]);
        });

        test.it('routes empty-space clicks into rendezvous creation and movement rather than camera dragging',()=>{
            const game=createGameForTests();game.port=createFakePort();const display=new Display(game);
            display.camera.setZoom(2);display.camera.centerOn(400000,500000);
            const x=display.toGalacticX(240),y=display.toGalacticY(200);
            game.beginRendezvousPlacement();test.assertTrue(game.isAwaitingMapTarget());
            test.assertFalse(game.handleUIClick(240,200));game.handleMouseClick(240,200);
            const point=game.allRendezvous[0];test.assertApproximately(point.x,x,.00001);test.assertApproximately(point.y,y,.00001);test.assertNull(point.anchor);
            test.assertFalse(game.isAwaitingMapTarget());game.beginRendezvousPlacement(point);test.assertTrue(game.isAwaitingMapTarget());
            game.handleMouseClick(260,220);test.assertApproximately(point.x,display.toGalacticX(260),.00001);test.assertNull(point.anchor);
        });
        test.it('lets star and ship popup rendezvous actions choose a map location',()=>{
            const game=createGameForTests();game.port=createFakePort();const display=new Display(game);
            const star=createOwnedStar(game,1),ship=createCompletedShip(game,star);
            for(const object of [star,ship]){game.setSelectedObject(object);const row=display.getContextActions(object).find(row=>row.key==='U');
                test.assertEqual(row.action.type,'beginRendezvousPlacement');game.executeUIAction(row.action);test.assertTrue(game.isAwaitingMapTarget());
                test.assertEqual(game.allRendezvous.length,0);game.handleKeyPress(pdg.key_Escape);test.assertFalse(game.isAwaitingMapTarget());}
        });
        test.it('renders thicker private markers at wide zoom and cycles owner color to pale and back',()=>{
            const game=createGameForTests();game.port=createFakePort();const display=new Display(game),point=game.createRendezvousAt(200,200,1,'Meet');
            display.camera.zoom=.1;let polygons=0,color;game.port.drawPolygon=()=>polygons++;
            display.styles.rendezvousMarker.fillColor=c=>{color=c;return display.styles.rendezvousMarker;};
            display.visualTime=0;display.drawRendezvous(point);test.assertEqual(polygons,2);const base=color;
            display.visualTime=1100;display.drawRendezvous(point);test.assertTrue(color.red>base.red);test.assertTrue(color.green>base.green);test.assertTrue(color.alpha>=.85);
            display.visualTime=2200;display.drawRendezvous(point);test.assertApproximately(color.red,base.red,.000001);
            display.visualEffects.reducedMotion=true;display.visualTime=1100;display.drawRendezvous(point);test.assertApproximately(color.red,base.red,.000001);
            point.owner=2;const count=polygons;display.drawRendezvous(point);test.assertEqual(polygons,count);
        });
        test.it('renames, moves, and deletes rendezvous points from popup actions', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledShipRadius = 5;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;
            display.toGalacticX = (x) => x;
            display.toGalacticY = (y) => y;

            const rendezvous = game.createRendezvousAt(500, 300, 1, 'Old Name');
            game.setSelectedObject(rendezvous);

            const renameButton = display.getContextButtonRegions(rendezvous).find(button => button.action.type === 'beginRename');
            test.assertNotNull(renameButton, 'Rendezvous rename action should exist');
            game.handleUIClick(renameButton.centerX, renameButton.centerY);

            game.renameText = '';
            for (const char of 'New Name') {
                game.handleKeyPress(keyCode(char));
            }
            game.handleKeyPress(13);
            test.assertEqual(rendezvous.name, 'New Name');
            test.assertNull(game.uiWindow);

            const moveButton = display.getContextButtonRegions(rendezvous).find(button => button.action.type === 'beginRendezvousPlacement');
            game.handleUIClick(moveButton.centerX, moveButton.centerY);
            game.handleMouseClick(250, 260);
            test.assertEqual(rendezvous.x, 250);
            test.assertEqual(rendezvous.y, 260);

            const deleteButton = display.getContextButtonRegions(rendezvous).find(button => button.action.type === 'deleteRendezvous');
            game.handleUIClick(deleteButton.centerX, deleteButton.centerY);
            test.assertEqual(game.allRendezvous.length, 0);
        });

        test.it('exposes fleet member transfer and removal controls', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledShipRadius = 5;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const star = createOwnedStar(game, 1, 'Dock');
            const ship = createCompletedShip(game, star, 'scout');
            const targetShip = createCompletedShip(game, star, 'battleship');
            const sourceFleet = game.getFactory().createFleet(500, 300, 1, 'Source');
            const targetFleet = game.getFactory().createFleet(500, 300, 1, 'Target');
            sourceFleet.addShip(ship);
            targetFleet.addShip(targetShip);
            game.setSelectedObject(sourceFleet);

            const transferRegion = display.getFleetMemberActionRegions(sourceFleet)
                .find(region => region.action.type === 'transferFleetShip');
            test.assertNotNull(transferRegion, 'A same-location friendly fleet should create transfer controls');
            game.handleUIClick(transferRegion.rect.x + 2, transferRegion.rect.y + 2);

            test.assertEqual(ship.fleet, targetFleet);
            test.assertEqual(targetFleet.getSize(), 2);
            test.assertFalse(game.allFleets.includes(sourceFleet), 'Empty source fleet should be removed after transfer');

            game.setSelectedObject(targetFleet);
            const removeRegion = display.getFleetMemberActionRegions(targetFleet)
                .find(region => region.action.type === 'removeFleetShip' && region.action.ship === ship);
            test.assertNotNull(removeRegion, 'Fleet member remove controls should exist');
            game.handleUIClick(removeRegion.rect.x + 2, removeRegion.rect.y + 2);

            test.assertNull(ship.fleet);
            test.assertTrue(game.allFleets.includes(targetFleet), 'Target fleet should remain while it still has ships');
            test.assertEqual(targetFleet.getSize(), 1);
        });

        test.it('shows fleet and rendezvous rows in the fleet roster window', () => {
            const game = createGameForTests();
            game.port = createFakePort(800, 600);
            const display = new Display(game);
            display.scaledShipRadius = 5;
            display.toScreenX = (x) => x;
            display.toScreenY = (y) => y;

            const star = createOwnedStar(game, 1, 'Roster Dock');
            const ship = createCompletedShip(game, star, 'scout');
            const fleet = game.getFactory().createFleet(100, 100, 1, 'Roster Fleet');
            fleet.addShip(ship);
            const rendezvous = game.createRendezvousAt(200, 200, 1, 'Roster Point');

            game.uiWindow = 'fleets';
            const rows = game.getFleetListRows();
            test.assertEqual(rows.length, 2);
            test.assertContains(rows.map(row => row.object), fleet);
            test.assertContains(rows.map(row => row.object), rendezvous);

            const fleetRegion = display.getFleetListActionRegions()
                .find(region => region.action.object === fleet);
            test.assertNotNull(fleetRegion, 'Fleet roster row should be clickable');
            game.handleUIClick(fleetRegion.rect.x + 2, fleetRegion.rect.y + 2);
            test.assertEqual(game.selectedObject, fleet);
        });
    });
};
