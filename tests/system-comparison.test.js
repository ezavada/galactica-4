const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
const I18n = require('../src/js/i18n.js');
function fixture() {
    const game = new Game(new Factory(), new Rules(false), new GameConfig({numHumans:1,numComputers:2,skipMapGeneration:true}));
    const star = game.factory.createStar(1024,2048,'Alpha'); star.owner=1; star.techLevel=5;
    game.port={getDrawingArea:()=>new pdg.Rect(800,600)};
    const display=new Display(game); game.display=display;
    return {game,star,display};
}
function shipAt(game,star,type='battleship',owner=1) {
    const ship=game.factory.createShip(star.x,star.y,type,star,true);ship.owner=owner;
    if(type==='defense')star.addDefenseSatellite(ship);
    return ship;
}
module.exports = function() {
    test.describe('Your Star Systems comparison',()=>{
        test.it('lists only the current human player systems, including in omniscient mode',()=>{
            const {game,star}=fixture();const enemy=game.factory.createStar(0,0,'Enemy');enemy.owner=2;
            game.factory.createStar(0,0,'Neutral');game.config.omniscient=true;
            test.assertEqual(game.getSystemComparisonRows().length,1);test.assertTrue(game.getSystemComparisonRows()[0].star===star);
        });
        test.it('hides the command for AI-only games',()=>{
            const {game,display}=fixture();game.config.numHumans=0;game.uiWindow='menu';
            test.assertEqual(game.getSystemComparisonRows().length,0);test.assertEqual(display.getCommandActionRegions().length,0);
            test.assertFalse(game.executeUIAction({type:'showSystemComparison'}));
        });
        test.it('reports v3 integer population, combined production, and current build progress',()=>{
            const {game,star}=fixture();star.population=1234567;star.shipBuilding.benefit=10.8;star.research.benefit=5.9;
            star.startBuildingShip('colony');star.currentShip.progress=99.99;
            const row=game.getSystemComparisonRows()[0];test.assertEqual(row.population,1234567);
            test.assertEqual(row.production,16);test.assertEqual(row.completion,99);test.assertEqual(row.buildName,I18n.getShipTypeName('colony',{capitalized:true}));
        });
        test.it('uses current system technology for the selected battleship drive class',()=>{
            const {game,star}=fixture();star.startBuildingShip('battleship');star.techLevel=10;
            test.assertEqual(game.getSystemComparisonRows()[0].buildName,I18n.getString(800).split('|')[2]);
        });
        test.it('shows localized no-build state and zero completion after pausing',()=>{
            const {game,star}=fixture();star.startBuildingShip('colony');star.pauseShipBuilding();
            const row=game.getSystemComparisonRows()[0];test.assertEqual(row.completion,0);test.assertEqual(row.buildName,I18n.getString(7));
        });
        test.it('applies positive and negative computer multipliers to combined integer benefits',()=>{
            const {game,star}=fixture();star.owner=2;star.shipBuilding.benefit=10.8;star.research.benefit=5.9;
            game.players[2].compAdvantage=1;test.assertEqual(star.getProduction(),1920);
            game.players[2].compAdvantage=-1;test.assertEqual(star.getProduction(),1280);
            star.owner=1;test.assertEqual(star.getProduction(),1600);
        });
        test.it('separates damaged satellites and mobile ships without counting satellites twice',()=>{
            const {game,star}=fixture();const sat=shipAt(game,star,'defense');sat.damage=149;
            const ship=shipAt(game,star);ship.damage=151;star.ships.push(sat,ship);
            const defense=star.getDefenseBreakdown();test.assertEqual(defense.satelliteDefense,351);test.assertEqual(defense.shipDefense,349);
            test.assertEqual(defense.totalDefense,star.getDefenseStrength()+700);
            const row=game.getSystemComparisonRows()[0];test.assertEqual(row.satelliteDefense,3);test.assertEqual(row.shipDefense,3);
            test.assertEqual(row.totalDefense,Math.trunc(defense.totalDefense/100));
        });
        test.it('counts docked fleets once and excludes departing and unfinished ships',()=>{
            const {game,star}=fixture();const ship=shipAt(game,star);const fleet=game.factory.createFleet(star.x,star.y,1,'Fleet');fleet.addShip(ship);
            game.factory.createShip(star.x,star.y,'battleship',star);
            const departing=shipAt(game,star);departing.destination={x:99999,y:0};
            test.assertEqual(star.getDefenseBreakdown().shipDefense,ship.getDefenseStrength());
            fleet.destination={x:99999,y:0};test.assertEqual(star.getDefenseBreakdown().shipDefense,0);
        });
        test.it('applies v3 minimum defense once to a fleet of zero-power couriers',()=>{
            const {game,star}=fixture();const first=shipAt(game,star,'scout');const second=shipAt(game,star,'scout');
            const fleet=game.factory.createFleet(star.x,star.y,1,'Couriers');fleet.addShip(first);fleet.addShip(second);
            first.damage=10;second.damage=20;
            test.assertEqual(star.getDefenseBreakdown().shipDefense,70);
            test.assertEqual(game.getSystemComparisonRows()[0].shipDefense,0);
        });
        test.it('keeps the satellite column raw while applying the satellite fleet defense minimum once',()=>{
            const {game,star}=fixture();star.techLevel=0;shipAt(game,star,'defense');shipAt(game,star,'defense');
            const defense=star.getDefenseBreakdown();test.assertEqual(defense.satelliteDefense,0);
            test.assertEqual(defense.totalDefense,star.getDefenseStrength()+100);
            test.assertEqual(game.getSystemComparisonRows()[0].totalDefense,1);
        });
        test.it('excludes enemies, includes allies, and includes all owners at a neutral star',()=>{
            const {game,star}=fixture();const enemy=shipAt(game,star,'battleship',2);
            test.assertEqual(star.getDefenseBreakdown().shipDefense,0);
            const original=game.players[2].isAllyOf;game.players[2].isAllyOf=owner=>owner===1;
            test.assertEqual(star.getDefenseBreakdown().shipDefense,enemy.getDefenseStrength());
            game.players[2].isAllyOf=original;star.owner=0;
            test.assertEqual(star.getDefenseBreakdown().shipDefense,enemy.getDefenseStrength());
        });
        test.it('sorts every column in both directions with stable IDs on ties',()=>{
            const {game,star}=fixture();star.startBuildingShip('colony');
            const other=game.factory.createStar(0,0,'Zulu');other.owner=1;other.techLevel=10;other.population=10000;
            other.shipBuilding.benefit=30;other.research.benefit=30;other.startBuildingShip('scout');other.currentShip.progress=70;
            shipAt(game,other,'defense');shipAt(game,other);
            for(const key of ['name','tech','population','production','buildName','completion','totalDefense','satelliteDefense','shipDefense']) {
                game.systemComparisonSort={key,ascending:true};const rows=game.getSystemComparisonRows();
                const order=typeof rows[0][key]==='string'?rows[0][key].localeCompare(rows[1][key]):rows[0][key]-rows[1][key];
                test.assertTrue(order<=0,key);game.executeUIAction({type:'sortSystemComparison',key});
                test.assertTrue(game.getSystemComparisonRows()[0].star===rows[1].star,key);
            }
            other.name=star.name;game.systemComparisonSort={key:'name',ascending:false};
            test.assertTrue(game.getSystemComparisonRows()[0].star===star);
            test.assertFalse(game.executeUIAction({type:'sortSystemComparison',key:'invalid'}));
        });
        test.it('paginates inside the viewport and clamps the last page after system loss',()=>{
            const {game,display}=fixture();for(let i=0;i<30;i++)game.factory.createStar(0,0,'System '+i).owner=1;
            game.systemComparisonPage=99;const layout=display.getSystemComparisonLayout();
            test.assertEqual(layout.page,layout.pages-1);test.assertTrue(layout.rect.y+layout.rect.height<=600);
            game.stars.slice(1).forEach(star=>star.owner=2);test.assertEqual(display.getSystemComparisonLayout().page,0);
        });
        test.it('opens from the menu and routes table controls ahead of background map controls',()=>{
            const {game,display}=fixture();game.uiWindow='menu';game.systemComparisonPage=3;
            const region=display.getCommandActionRegions().find(r=>r.action.type==='showSystemComparison');
            game.executeUIAction(display.getUIActionAt(region.rect.x+5,region.rect.y+5));
            test.assertEqual(game.uiWindow,'systemComparison');test.assertEqual(game.systemComparisonPage,0);
            const r=display.getSystemComparisonActionRegions()[0].rect;
            test.assertEqual(display.getUIActionAt(r.x+5,r.y+5).type,'sortSystemComparison');
            const w=display.getActiveWindowRect();test.assertEqual(display.getUIActionAt(w.x+5,w.y+5).type,'consume');
        });
        test.it('single-click highlights and double-click selects, centers and closes the window',()=>{
            const {game,star,display}=fixture();let time=1000,centered=null;game.getCurrentMilliseconds=()=>time;
            display.centerOn=(x,y)=>centered={x,y};game.executeUIAction({type:'showSystemComparison'});
            game.executeUIAction({type:'systemComparisonRow',star});test.assertEqual(game.uiWindow,'systemComparison');
            time+=100;game.executeUIAction({type:'systemComparisonRow',star});
            test.assertTrue(game.selectedObject===star);test.assertEqual(game.uiWindow,null);
            test.assertEqual(centered.x,star.x);test.assertEqual(centered.y,star.y);
        });
        test.it('rejects stale rows and resets double-click tracking after sort and paging',()=>{
            const {game,star}=fixture();game.getCurrentMilliseconds=()=>1000;
            game.executeUIAction({type:'showSystemComparison'});game.executeUIAction({type:'systemComparisonRow',star});
            game.executeUIAction({type:'sortSystemComparison',key:'name'});game.executeUIAction({type:'systemComparisonRow',star});
            test.assertEqual(game.uiWindow,'systemComparison');game.executeUIAction({type:'systemComparisonPage',page:1});
            test.assertEqual(game.systemComparisonLastClick,null);star.owner=2;
            test.assertFalse(game.executeUIAction({type:'systemComparisonRow',star}));test.assertFalse(game.openSystemComparisonSelection());
            test.assertFalse(game.executeUIAction({type:'systemComparisonPage',page:-1}));
        });
        test.it('Enter opens the highlighted row, Escape closes and Tab does not end the turn',()=>{
            const {game,star}=fixture();game.executeUIAction({type:'showSystemComparison'});const turn=game.turn;
            test.assertTrue(game.handleCommandWindowKey(9,'\t'));test.assertEqual(game.turn,turn);
            game.systemComparisonSelection=star;game.handleCommandWindowKey(13,'\r');test.assertEqual(game.uiWindow,null);
            game.executeUIAction({type:'showSystemComparison'});game.handleCommandWindowKey(pdg.key_Escape,'');test.assertEqual(game.uiWindow,null);
        });
        test.it('updates live table data after repairs, growth, rename and ownership changes',()=>{
            const {game,star}=fixture();const ship=shipAt(game,star);ship.damage=149;
            const before=game.getSystemComparisonRows()[0];ship.damage=0;star.population=5000;star.name='京都 α';
            const after=game.getSystemComparisonRows()[0];test.assertGreaterThan(after.shipDefense,before.shipDefense);
            test.assertEqual(after.name,'京都 α');test.assertEqual(after.population,5000);
            star.owner=2;test.assertEqual(game.getSystemComparisonRows().length,0);
        });
        test.it('loads table headers and hull names in all six supported languages',()=>{
            const {game,star,display}=fixture();star.startBuildingShip('colony');const previous=pdg.res.getLanguage();
            try {for(const lang of ['en','de','es','fr','ja','ru']) {
                pdg.res.setLanguage(lang);const layout=display.getSystemComparisonLayout();
                test.assertEqual(layout.columns.length,9);test.assertEqual(layout.columns[0].label,I18n.getString(709));
                test.assertEqual(game.getSystemComparisonRows()[0].buildName,I18n.getShipTypeName('colony',{capitalized:true}));
                test.assertTrue(I18n.getString(708).length>0);test.assertTrue(I18n.getString(718).length>0);
            }}finally{pdg.res.setLanguage(previous);}
        });
    });
};
