const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
const I18n = require('../src/js/i18n.js');
function fixture() {
    const game = new Game(new Factory(), new Rules(false), new GameConfig({ numHumans: 1, numComputers: 1, skipMapGeneration: true }));
    const star = game.factory.createStar(0, 0, 'Test'); star.owner = 1;
    game.setSelectedObject(star);
    return { game, star };
}
module.exports = function() {
    test.describe('Default new-ship destinations', () => {
        test.it('arms an owned system and assigns its selected map target', () => {
            const {game, star} = fixture(); const target = game.factory.createStar(2048, 4096, 'Target');
            game.display = {toGalacticX: x => x, toGalacticY: y => y, setSelectedObject: () => {}};
            game.findObjectAtPosition = () => target;
            test.assertTrue(game.beginMapOrder(star)); game.handleMouseClick(2048,4096);
            test.assertTrue(star.getDefaultDestination() === target);
            test.assertFalse(game.isAwaitingMapTarget());
        });
        test.it('allows coordinate targets and cancels targeting with Escape without changing the old destination', () => {
            const {game, star} = fixture();
            game.display = {toGalacticX: x => x*1024, toGalacticY: y => y*1024, setSelectedObject: () => {}};
            game.findObjectAtPosition = () => null;
            game.beginMapOrder(star); game.handleMouseClick(10,20);
            test.assertEqual(star.getDefaultDestination().x,10240);
            game.beginMapOrder(star); game.handleKeyPress(pdg.key_Escape);
            test.assertFalse(game.isAwaitingMapTarget());
            test.assertEqual(star.getDefaultDestination().y,20480);
            test.assertTrue(game.selectedObject === star);
        });
        test.it('clears only an owned system default and stops pending targeting', () => {
            const {game, star} = fixture(); star.setDefaultDestination({x:1,y:2});
            game.beginMapOrder(star);
            test.assertTrue(game.executeUIAction({type:'clearDefaultDestination',object:star}));
            test.assertEqual(star.getDefaultDestination(),null); test.assertFalse(game.isAwaitingMapTarget());
            star.owner=2; star.setDefaultDestination({x:1,y:2});
            test.assertFalse(game.executeUIAction({type:'clearDefaultDestination',object:star}));
            test.assertEqual(star.getDefaultDestination().x,1);
            game.beginMapOrder(star); test.assertFalse(game.isAwaitingMapTarget());
        });
        test.it('dispatches a completed mobile hull to its system default', () => {
            const {game, star} = fixture(); const target = game.factory.createStar(2048,4096,'Target');
            star.setDefaultDestination(target); star.startBuildingShip('scout');
            const ship = star.currentShip; let moved = false; ship.move = () => moved=true;
            star.completeShip(); test.assertTrue(ship.destination === target); test.assertTrue(moved);
        });
        test.it('keeps defense satellites at their system despite an automatic destination', () => {
            const {star} = fixture(); star.setDefaultDestination({x:2048,y:4096}); star.startBuildingShip('defense');
            const ship = star.currentShip; let moved = false; ship.move = () => moved=true;
            star.completeShip(); test.assertFalse(!!ship.destination); test.assertFalse(moved);
        });
        test.it('routes visible destination buttons and hides clear when no default is set', () => {
            const {game, star} = fixture(); game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game); let regions = display.getDefaultDestinationRegions();
            test.assertEqual(regions.length,1);
            let r=regions[0].rect; test.assertEqual(display.getUIActionAt(r.x+5,r.y+5).type,'beginOrders');
            star.setDefaultDestination({x:1,y:2}); regions=display.getDefaultDestinationRegions();
            test.assertEqual(regions.length,2); r=regions[1].rect;
            test.assertEqual(display.getUIActionAt(r.x+5,r.y+5).type,'clearDefaultDestination');
        });
    });
    test.describe('Continuous ship production', () => {
        test.it('builds every affordable hull in a turn and carries the remaining effort forward', () => {
            const {game, star} = fixture(); star.population = 1000; star.techLevel = 1;
            game.rules.getStarShipBuildingAmount = () => 3.5;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('scout'); star.update();
            test.assertEqual(game.allShips.filter(ship => !ship.underConstruction()).length, 3);
            test.assertEqual(star.currentShip.type, 'scout');
            test.assertApproximately(star.currentShip.progress, 50, .001);
            test.assertApproximately(star.paidTowardShipBuilding, .5, .001);
        });
        test.it('continues satellite production and registers every completed defense', () => {
            const {game, star} = fixture(); star.population = 1000; star.techLevel = 1;
            game.rules.getStarShipBuildingAmount = () => 2;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('defense'); star.update();
            test.assertEqual(star.defenseSatellites.length, 2);
            test.assertTrue(star.defenseSatellites.every(ship => ship.isOnPatrol()));
            test.assertEqual(star.currentShip.progress, 0);
        });
        test.it('chooses a fresh v3 AI hull after each completed computer build', () => {
            const {game, star} = fixture(); star.owner = 2; star.population = 1000; star.techLevel = 1;
            let choices = 0;
            game.aiManager.getAIPlayer(2).starAIs.set(star.id, { chooseShipToBuild: () => {
                choices++; return {type: 'defense'};
            }});
            game.rules.getStarShipBuildingAmount = () => 2.5;
            game.rules.getShipBuildCost = () => 1;
            game.rules.getStarResearchAmount = () => 0;
            star.startBuildingShip('scout'); star.update();
            test.assertEqual(choices, 1);
            test.assertEqual(star.currentShip.type, 'defense');
            test.assertEqual(star.currentShip.progress, 0);
            test.assertApproximately(star.buildCredits.scout, 1.5, .001);
        });
    });
    test.describe('Hull switching and construction credit', () => {
        test.it('preserves per-hull effort while removing superseded unfinished hulls', () => {
            const {game, star} = fixture(); star.techLevel = 1;
            game.rules.getShipBuildCost = () => 10;
            star.startBuildingShip('scout'); const old = star.currentShip;
            star.paidTowardShipBuilding = 8;
            star.startBuildingShip('battleship');
            test.assertFalse(game.allShips.includes(old));
            test.assertFalse(star.ships.includes(old));
            test.assertEqual(star.paidTowardShipBuilding, 0);
            star.paidTowardShipBuilding = 3;
            star.startBuildingShip('scout');
            test.assertEqual(star.paidTowardShipBuilding, 8);
            test.assertEqual(star.currentShip.progress, 80);
            test.assertEqual(star.buildCredits.battleship, 3);
            test.assertEqual(game.allShips.length, 1);
        });
        test.it('pauses and resumes construction without losing paid effort', () => {
            const {game, star} = fixture(); star.startBuildingShip('colony');
            star.paidTowardShipBuilding = 2;
            test.assertTrue(game.executeUIAction({type:'pauseBuild',object:star}));
            test.assertNull(star.currentShip);
            star.startBuildingShip('colony');
            test.assertEqual(star.paidTowardShipBuilding, 2);
        });
        test.it('does not restart the selected hull or accept an unknown hull', () => {
            const {star} = fixture(); star.startBuildingShip('colony');
            const hull = star.currentShip;
            test.assertFalse(star.startBuildingShip('colony'));
            test.assertFalse(star.startBuildingShip('invalid'));
            test.assertTrue(star.currentShip === hull);
        });
    });
    test.describe('Localized turn counts', () => {
        test.it('supports singular/plural and Japanese single-form resources', () => {
            test.assertEqual(I18n.formatPluralString(0, '{0} turn|{0} turns', 1), '1 turn');
            test.assertEqual(I18n.formatPluralString(0, '{0} turn|{0} turns', 2), '2 turns');
            test.assertEqual(I18n.formatPluralString(0, '{0}ターン', 2), '2ターン');
        });
        test.it('selects Russian singular, few, and many endings', () => {
            const cases = [[1,'ход'],[2,'хода'],[5,'ходов'],[11,'ходов'],[21,'ход'],[22,'хода'],[25,'ходов']];
            cases.forEach(([count, word]) => test.assertEqual(
                I18n.formatPluralString(0, '{0} ход|{0} хода|{0} ходов', count), `${count} ${word}`));
        });
    });
    test.describe('Construction ETA', () => {
        test.it('uses projected production and v3 rounding at exact turn boundaries', () => {
            const {game, star} = fixture(); star.startBuildingShip('colony');
            star.shipBuilding.value = 1; star.shipBuilding.desired = 10;
            star.shipBuilding.setPerUnitBenefit(166.5);
            game.rules.getShipBuildCost = () => 4;
            star.paidTowardShipBuilding = 1;
            test.assertEqual(star.getEstimatedTurnsToNextShip(), 4);
        });
        test.it('applies fast-game and computer-advantage modifiers', () => {
            const {game, star} = fixture(); star.owner = 2; star.startBuildingShip('colony');
            star.shipBuilding.desired = 10; star.shipBuilding.setPerUnitBenefit(166.5);
            game.rules.getShipBuildCost = () => 6;
            game.rules.isFast = true; game.players[2].compAdvantage = 1;
            test.assertEqual(star.getEstimatedTurnsToNextShip(), 3);
        });
        test.it('distinguishes stopped production from zero projected effort', () => {
            const {star} = fixture();
            test.assertNull(star.getEstimatedTurnsToNextShip());
            star.startBuildingShip('colony'); star.shipBuilding.desired = 0;
            test.assertEqual(star.getEstimatedTurnsToNextShip(), -1);
        });
    });
    test.describe('System and ship renaming', () => {
        test.it('renames both owned systems and owned ships with Unicode keyboard input', () => {
            const {game, star} = fixture();
            const ship = game.factory.createShip(0,0,'scout',star); ship.complete();
            for (const object of [star, ship]) {
                test.assertTrue(game.beginRenameObject(object)); game.renameText = '';
                for (const char of '京都 α 🚀') game.handleRenameKey(char.codePointAt(0), char);
                game.handleRenameKey(8, '');
                test.assertEqual(game.renameText, '京都 α ');
                game.commitRename(); test.assertEqual(object.name, '京都 α');
            }
        });
        test.it('keeps names unchanged on cancel and disallows enemy renaming', () => {
            const {game, star} = fixture();
            game.beginRenameObject(star); game.renameText = 'Changed';
            game.executeUIAction({type:'cancelRename'}); test.assertEqual(star.name, 'Test');
            star.owner = 2; game.beginRenameObject(star); test.assertNull(game.renameTarget);
        });
        test.it('routes explicit Save and Cancel controls inside the rename window', () => {
            const {game, star} = fixture(); game.port = { getDrawingArea: () => new pdg.Rect(800,600) };
            const display = new Display(game); game.beginRenameObject(star); game.renameText = 'Changed';
            const region = display.getRenameActionRegions()[0];
            game.executeUIAction(display.getUIActionAt(region.rect.x+20,region.rect.y+10));
            test.assertEqual(star.name, 'Changed'); test.assertNull(game.uiWindow);
        });
    });
    test.describe('Window layering and interaction', () => {
        test.it('blocks hidden context buttons and routes production sliders to the visible window', () => {
            const {game, star} = fixture(); game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game); game.uiWindow = 'production';
            const rect = display.getProductionWindowRect();
            display.getContextButtonRegions = () => [{rect,action:{type:'buildShip',object:star,shipType:'scout'}}];
            test.assertEqual(display.getUIActionAt(rect.x+10,rect.y+10).type, 'consume');
            const slider = display.getProductionWindowSliderRegions()[0];
            const action = display.getUIActionAt(slider.trackRect.x+slider.trackRect.width*.8, slider.trackRect.y+4);
            test.assertEqual(action.type,'setAllocation'); test.assertEqual(action.desired,80);
        });
        test.it('makes rename modal and prevents Tab from advancing the turn during editing', () => {
            const {game, star} = fixture(); game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game); game.beginRenameObject(star);
            test.assertEqual(display.getUIActionAt(0,0).type,'consume');
            let turns = 0; game.endTurn = () => turns++;
            game.handleKeyPress(pdg.key_Tab); test.assertEqual(turns,0);
        });
        test.it('uses a separate shared appearance for opaque windows', () => {
            const {game} = fixture(); game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game); let appearance;
            display.drawRoundedRect = (_rect,_radius,attrs) => appearance=attrs;
            display.drawWindowPanel({x:0,y:0,width:300,height:120},null);
            test.assertTrue(appearance === display.styles.windowPanel);
            test.assertFalse(appearance === display.styles.panel);
        });
    });
    test.describe('Production locks', () => {
        test.it('preserves locked allocations while maintaining a total of 100', () => {
            const {game, star} = fixture(); game.toggleStarAllocationLock(star, 'growth');
            game.setStarAllocation(star, 'research', 60);
            test.assertEqual(star.growth.desired, 34);
            test.assertEqual(star.research.desired, 60);
            test.assertEqual(star.shipBuilding.desired, 6);
        });
        test.it('rejects a locked target and adjustments when no other allocation is unlocked', () => {
            const {game, star} = fixture();
            game.toggleStarAllocationLock(star, 'growth'); game.toggleStarAllocationLock(star, 'research');
            test.assertFalse(game.adjustStarAllocation(star, 'growth', 10));
            test.assertFalse(game.adjustStarAllocation(star, 'shipBuilding', 10));
            test.assertEqual(star.shipBuilding.desired, 33);
        });
        test.it('does not allow an enemy star lock to be changed', () => {
            const {game, star} = fixture(); star.owner = 2;
            test.assertFalse(game.toggleStarAllocationLock(star, 'growth'));
            test.assertFalse(star.growth.locked);
        });
        test.it('equalizes only unlocked allocations and leaves the remainder on the first unlocked slider', () => {
            const {game, star} = fixture();
            star.growth.desired = 45; star.growth.locked = true;
            game.resetSelectedStarAllocations();
            test.assertEqual(star.growth.desired, 45);
            test.assertEqual(star.shipBuilding.desired, 28);
            test.assertEqual(star.research.desired, 27);
        });
        test.it('does not equalize an entirely locked economy', () => {
            const {game, star} = fixture();
            game.getStarAllocationEntries(star).forEach(entry => entry.allocation.setLocked(true));
            test.assertFalse(game.resetSelectedStarAllocations());
            test.assertEqual(star.growth.desired, 34);
        });
        test.it('routes lock button clicks to the matching allocation', () => {
            const {game, star} = fixture();
            game.port = {getDrawingArea: () => new pdg.Rect(800,600)};
            const display = new Display(game);
            const region = display.getAllocationLockRegions()[0];
            const action = display.getUIActionAt(region.rect.x + 10, region.rect.y + 8);
            test.assertEqual(action.type, 'toggleAllocationLock'); game.executeUIAction(action);
            test.assertTrue(star.growth.locked);
        });
    });
};
