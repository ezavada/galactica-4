const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
const Common = require('../src/js/common.js');
function fixture() {
    const game = new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star = game.factory.createStar(0,0,'Home'); star.owner=1;
    game.setSelectedObject(star); game.systemShipWindowStar=star;
    return {game,star};
}
function shipAt(game,star,type='scout',name='Scout') {
    const ship=game.factory.createShip(star.x,star.y,type,star); ship.owner=1; ship.name=name; ship.complete();
    return ship;
}
module.exports = function() {
    test.describe('Ships in system', () => {
        test.it('lists completed docked ships and excludes unfinished and departing hulls', () => {
            const {game,star}=fixture(); const completed=shipAt(game,star);
            game.factory.createShip(star.x,star.y,'colony',star);
            const departed=shipAt(game,star); departed.star=null; departed.x=4096; departed.destination={x:8192,y:0};
            const rows=game.getSystemShipRows(); test.assertEqual(rows.length,1); test.assertTrue(rows[0].object===completed);
        });
        test.it('groups fleet members under their fleet without listing them twice', () => {
            const {game,star}=fixture(); const ship=shipAt(game,star);
            const fleet=game.factory.createFleet(0,0,1,'Fleet'); fleet.star=star; fleet.addShip(ship);
            const rows=game.getSystemShipRows(); test.assertEqual(rows.length,2);
            test.assertTrue(rows[0].object===fleet); test.assertTrue(rows[1].object===ship); test.assertTrue(rows[1].member);
        });
        test.it('hides enemy system contents until details are visible', () => {
            const {game,star}=fixture(); star.owner=2; const ship=shipAt(game,star); ship.owner=2;
            star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
            test.assertFalse(game.canViewSystemShips(star)); test.assertEqual(game.getSystemShipRows().length,0);
            star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            test.assertTrue(game.canViewSystemShips(star)); test.assertEqual(game.getSystemShipRows().length,1);
        });
        test.it('shows neutral system contents when a completed friendly ship is present', () => {
            const {game,star}=fixture(); star.owner=0;
            const ship=game.factory.createShip(star.x,star.y,'scout',star); ship.owner=1;
            test.assertFalse(game.canViewSystemShips(star)); ship.complete();
            test.assertTrue(game.canViewSystemShips(star));
        });
        test.it('supports an omniscient observer without a human player', () => {
            const {game,star}=fixture(); star.owner=2; shipAt(game,star);
            game.config.numHumans=0; game.config.omniscient=true;
            test.assertTrue(game.canViewSystemShips(star)); test.assertEqual(game.getSystemShipRows().length,1);
        });
        test.it('revokes an open enemy system list when details visibility is lost', () => {
            const {game,star}=fixture(); star.owner=2; shipAt(game,star);
            star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            game.executeUIAction({type:'showSystemShips',star});
            star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
            test.assertEqual(game.getSystemShipRows().length,0);
        });
        test.it('sorts ascending and descending while retaining fleet-member grouping', () => {
            const {game,star}=fixture(); const high=shipAt(game,star,'scout','Alpha'); high.damage=12;
            const low=shipAt(game,star,'colony','Zulu'); low.damage=2;
            game.executeUIAction({type:'sortSystemShips',key:'damage'});
            test.assertTrue(game.getSystemShipRows()[0].object===low);
            game.executeUIAction({type:'sortSystemShips',key:'damage'});
            test.assertTrue(game.getSystemShipRows()[0].object===high);
            test.assertFalse(game.executeUIAction({type:'sortSystemShips',key:'invalid'}));
        });
        test.it('opens the selected system and resets the page', () => {
            const {game,star}=fixture(); game.systemShipPage=4;
            test.assertTrue(game.executeUIAction({type:'showSystemShips',star}));
            test.assertEqual(game.uiWindow,'systemShips'); test.assertEqual(game.systemShipPage,0);
            star.owner=2; star.setVisibilityTo(1,Common.VisibilityLevel.NONE);
            test.assertFalse(game.executeUIAction({type:'showSystemShips',star}));
        });
        test.it('paginates large systems within the viewport and clamps pages after ships depart', () => {
            const {game,star}=fixture(); for(let i=0;i<30;i++)shipAt(game,star,'scout',`Scout ${i}`);
            game.port={getDrawingArea:()=>new pdg.Rect(800,600)}; const display=new Display(game);
            game.uiWindow='systemShips'; let layout=display.getSystemShipWindowLayout();
            test.assertTrue(layout.pages>1); test.assertTrue(layout.rect.y+layout.rect.height<=600);
            game.systemShipPage=99; layout=display.getSystemShipWindowLayout();
            test.assertEqual(layout.page,layout.pages-1); test.assertTrue(layout.visibleRows.length>0);
            game.allShips.length=1; layout=display.getSystemShipWindowLayout(); test.assertEqual(layout.page,0);
        });
        test.it('routes the system button, sorting, pagination and row selection ahead of hidden controls', () => {
            const {game,star}=fixture(); for(let i=0;i<20;i++)shipAt(game,star,'scout',`Ship ${i}`);
            game.port={getDrawingArea:()=>new pdg.Rect(800,600)}; const display=new Display(game);
            display.camera.centerOn(star.x,star.y);let r=display.getSystemShipButtonRegion().rect;
            game.executeUIAction(display.getUIActionAt(r.x+5,r.y+5)); test.assertEqual(game.uiWindow,'systemShips');
            const regions=display.getSystemShipActionRegions(); r=regions[0].rect;
            test.assertEqual(display.getUIActionAt(r.x+5,r.y+5).type,'sortSystemShips');
            const next=regions.find(region=>region.action.type==='systemShipPage');
            game.executeUIAction(next.action); test.assertEqual(game.systemShipPage,1);
            r=display.getSystemShipActionRegions().find(region=>region.action.type==='selectObject').rect;
            const action=display.getUIActionAt(r.x+5,r.y+5); game.executeUIAction(action);
            test.assertTrue(game.selectedObject===action.object); test.assertEqual(game.uiWindow,null);
        });
    });
};
