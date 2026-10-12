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
        test.it('keeps all compact localized controls/content accessible with fixed complete footers',()=>{
            const prior=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru'])for(const [width,height] of [[320,240],[800,240],[320,600]]){
                pdg.res.setLanguage(language);const {game,star}=fixture();star.name='Long system name for layout';for(let i=0;i<6;i++){const ship=shipAt(game,star,'scout','Long ship name '+i+' 星');ship.power=123456789;}
                game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size=11)=>Array.from(text).length*size/2};const display=new Display(game);game.uiWindow='systemShips';let layout=display.getSystemShipWindowLayout();
                test.assertTrue(layout.compact);test.assertTrue(layout.rect.x>=10 && layout.rect.y>=10 && layout.rect.x+layout.rect.width<=width-10 && layout.rect.y+layout.rect.height<=height-10);test.assertTrue(layout.pages>1);test.assertTrue(layout.bodyClip.y+layout.bodyClip.height<layout.footerTop);
                for(const button of layout.footer){test.assertTrue(button.rect.x>=layout.rect.x && button.rect.x+button.rect.width<=layout.rect.x+layout.rect.width);test.assertTrue(button.rect.y>=layout.footerTop && button.rect.y+button.rect.height<=layout.rect.y+layout.rect.height);test.assertTrue(button.rect.width>=display.getButtonWidth(button.label,button.key,{size:10}));}
                test.assertEqual(layout.sorts.length,5);test.assertEqual(layout.records[0].lines.length,4);test.assertTrue(layout.records[0].nameLines.join(' ').includes('Long ship name'));test.assertNotNull(layout.records[0].scrap);
                game.scrollSystemShips(10000);layout=display.getSystemShipWindowLayout();test.assertEqual(layout.bodyScroll,layout.scrollLimit);const scrap=display.getSystemShipActionRegions().find(r=>r.action.type==='toggleScrap');test.assertNotNull(scrap);test.assertEqual(display.getUIActionAt(scrap.rect.x+scrap.rect.width/2,scrap.rect.y+scrap.rect.height/2).type,'toggleScrap');game.executeUIAction(scrap.action);test.assertTrue(scrap.action.object.isToBeScrapped());
                game.executeUIAction({type:'systemShipPage',page:1});layout=display.getSystemShipWindowLayout();test.assertEqual(layout.page,1);test.assertEqual(layout.bodyScroll,0);game.handleKeyPress(pdg.key_PageDown);test.assertEqual(game.systemShipBodyScroll,Math.min(80,layout.scrollLimit));game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.systemShipPage,0);
                const close=display.getSystemShipActionRegions().find(r=>r.action.type==='closeWindow');test.assertTrue(game.executeUIAction(close.action));test.assertNull(game.uiWindow);
            }}finally{pdg.res.setLanguage(prior);}
        });
        test.it('retains compact grouped fleet/member identities and inspection/visibility rules',()=>{
            const {game,star}=fixture(),member=shipAt(game,star),fleet=game.factory.createFleet(star.x,star.y,1,'Group');fleet.star=star;fleet.addShip(member);game.port={getDrawingArea:()=>new pdg.Rect(320,240),getTextWidth:(text,size=11)=>Array.from(text).length*size/2};const display=new Display(game);game.uiWindow='systemShips';const layout=display.getSystemShipWindowLayout();test.assertTrue(layout.records[0].row.object===fleet);test.assertTrue(layout.records[1].row.member);test.assertTrue(layout.records[1].row.object===member);
            const name=layout.records[0].name;game.executeUIAction(name.action);test.assertTrue(game.selectedObject===fleet);test.assertNull(game.uiWindow);star.owner=2;member.owner=2;fleet.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);game.uiWindow='systemShips';test.assertEqual(display.getSystemShipWindowLayout().records.length,0);
        });

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
        test.it('keeps private names out of Details-visible local system tables while exposing member statistics',()=>{
            const {game,star}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            star.techLevel=8;const ship=shipAt(game,star,'battleship','Private ship');ship.owner=2;ship.setVisibilityTo(1,0);ship.damage=ship.power*25;
            game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);game.display=display;
            const row=game.getSystemShipRows(star)[0];test.assertFalse(row.name.includes('Private ship'));
            test.assertEqual(display.getFleetMemberDiagnostics(star,ship).health,'75%');test.assertEqual(display.getShipDiagnostics(ship).health,'?');
            const fleet=game.factory.createFleet(star.x,star.y,2,'Private fleet');fleet.addShip(ship);fleet.star=null;fleet.setVisibilityTo(1,0);
            test.assertTrue(game.showFleetExchange(star));test.assertTrue(game.selectFleetExchangeMember('main',fleet));test.assertTrue(game.fleetExchange.active===fleet);
            test.assertEqual(display.getFleetMemberDiagnostics(fleet,ship).health,'75%');
            star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertEqual(game.getSystemShipRows(star).length,0);test.assertEqual(display.getFleetMemberDiagnostics(star,ship).health,'?');
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
