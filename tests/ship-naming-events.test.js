const test = require('./test-framework.js');

// Minimal mocks for pdg resource access
if (typeof global.pdg === 'undefined') {
    global.pdg = {
        res: {
            getString: (id) => {
                if (id === 800) {
                    return 'Traveller|Rama|Hawk|Falcon|Riviel|Valkyrie|Wolven|Banshee|Avenger|Raven|Talon|Tempest|Scorpion|Vindicator|Cobra|Viper|Warhawk|Barracuda|Wyvren|Hellion';
                }
                return '';
            },
            getImage: (_path) => ({ path: _path, getWidth: () => 512, getHeight: () => 512 })
        },
        tm: { getMilliseconds: () => Date.now() },
        Color: function(){},
        Attributes: function(){ this.fillColor=()=>this; this.textSize=()=>this; this.textStyle=()=>this; this.fillOpacity=()=>this; this.lineColor=()=>this; this.lineOpacity=()=>this; this.fillGradient=()=>this; this.fillRadialGradient=()=>this; this.lineStyle=()=>this; },
        Point: function(){},
        Rect: function(){},
        Polygon: function(){},
        textStyle_Plain: 0,
        textStyle_Centered: 16,
        textStyle_RightJustified: 32,
        lineStyle_Solid: 2,
        key_Tab: 9,
        key_Escape: 27,
        srand: ()=>{}, rand: ()=>0
    };
}

const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const Rules = require('../src/js/rules.js');
const GameConfig = require('../src/js/game-config.js');

function createGameForTests() {
    const factory = new Factory();
    const rules = new Rules(true);
    const config = GameConfig.createSinglePlayer(2, 2);
    config.skipMapGeneration = true;
    const game = new Game(factory, rules, config);
    // simple fake port for display constructor
    game.port = { getDrawingArea: ()=>({width:()=>800,height:()=>600}), drawRect:()=>{}, drawImage:()=>{}, drawLine:()=>{}, drawPolygon:()=>{}, drawCircle:()=>{}, drawText:()=>{} };
    const Display = require('../src/js/display.js');
    new Display(game);
    return game;
}

module.exports = function runShipNamingEventsTests() {
    test.describe('Ship Naming and Event Emission', () => {
        test.it('generates battleship names by tech class and serial', () => {
            const game = createGameForTests();
            // Create a star for player 1
            const star = game.getFactory().createStar(0, 0, 'Alpha', game);
            star.owner = 1;
            star.population = 100; // enable updates
            star.techLevel = 10; // classIndex = floor(10/5)+1 = 3 -> Falcon
            // Build a battleship to trigger name generation
            star.startBuildingShip('battleship');
            // Force completion
            star.currentShip.progress = 100;
            const ship = star.completeShip();
            test.assertDefined(ship.name, 'Ship should have a name');
            test.assert(ship.name.indexOf('Hawk') === 0, `Expected name to start with Hawk, got ${ship.name}`);
        });

        test.it('emits NEW_SHIP_CLASS overlay on first-of-class', () => {
            const game = createGameForTests();
            const star = game.getFactory().createStar(0, 0, 'Alpha', game);
            star.owner = 1; star.population = 100; star.techLevel = 5; // classIndex 2
            star.startBuildingShip('battleship');
            star.currentShip.progress = 100;
            const ship = star.completeShip();
            test.assertDefined(game.overlay, 'Overlay should be set');
            test.assertEqual(game.overlay.type, 'stardock');
            test.assertEqual(game.overlay.classIndex, ship.classIndex);
        });

        test.it('announces each noncombat hull once and preserves its origin after launch', () => {
            for(const type of ['defense','scout','colony']) {
                const game=createGameForTests(),star=game.factory.createStar(0,0,'Home 星');star.owner=1;
                star.setDefaultDestination({x:1000000,y:0});star.startBuildingShip(type);const ship=star.completeShip();
                test.assertEqual(game.overlay.type,'stardock');test.assertEqual(game.overlay.shipType,type);
                test.assertTrue(game.overlay.origin===star);test.assertTrue(game.overlay.ship===ship);
                const event=game.eventLog.find(e=>e.type===require('../src/js/common.js').EventType.NEW_SHIP_CLASS);
                test.assertTrue(event.subject===star);test.assertEqual(event.recipient,1);test.assertTrue(event.message.includes('Home 星'));
                game.overlay=null;game.overlayQueue=[];star.startBuildingShip(type);star.completeShip();test.assertEqual(game.overlay,null);
            }
        });
        test.it('keeps enemy first-built hull and class presentations private even without fog',()=>{
            const game=createGameForTests();game.config.omniscient=true;const star=game.factory.createStar(0,0,'Enemy');star.owner=2;
            for(const type of ['defense','scout','colony','battleship']){star.startBuildingShip(type);star.completeShip();}
            test.assertEqual(game.overlay,null);test.assertEqual(game.overlayQueue.length,0);
            game.turn++;test.assertFalse(game.getEventRows().some(e=>e.type===require('../src/js/common.js').EventType.NEW_SHIP_CLASS));
        });
        test.it('does not announce older battleship classes after commissioning a higher one',()=>{
            const game=createGameForTests(),star=game.factory.createStar(0,0,'Home');star.owner=1;star.techLevel=15;
            star.startBuildingShip('battleship');star.completeShip();test.assertEqual(game.overlay.classIndex,4);
            game.overlay=null;game.overlayQueue=[];star.techLevel=5;star.startBuildingShip('battleship');star.completeShip();test.assertEqual(game.overlay,null);
            star.techLevel=20;star.startBuildingShip('battleship');star.completeShip();test.assertEqual(game.overlay.classIndex,5);
        });
        test.it('retains first-hull flags, pending presentation and class milestones through saved games',()=>{
            const Save=require('../src/js/game-save.js'),game=createGameForTests();game.rules.isFast=game.config.fastGame;
            const star=game.factory.createStar(0,0,'Home');star.owner=1;
            for(const type of ['defense','scout','colony','battleship']){star.startBuildingShip(type);star.completeShip();}
            const loaded=Save.restore(Save.serialize(game)),home=loaded.stars[0];
            test.assertEqual(loaded.overlay.shipType,'defense');test.assertTrue(loaded.overlay.origin===home);
            test.assertEqual(loaded.overlayQueue.length,3);loaded.overlay=null;loaded.overlayQueue=[];
            for(const type of ['defense','scout','colony','battleship']){home.startBuildingShip(type);home.completeShip();}
            test.assertEqual(loaded.overlay,null);test.assertEqual(loaded.overlayQueue.length,0);
        });
        test.it('emits NEW_TECH_DISCOVERY overlay on crossing new drive class', () => {
            const game = createGameForTests();
            const star = game.getFactory().createStar(0, 0, 'Alpha', game);
            star.owner = 1; star.population = 1; star.techLevel = 4; star.paidTowardResearch = 990;
            // This update should increase tech to 5 (cross boundary)
            game.rules.getStarResearchAmount = () => 20;
            star.update();
            test.assertDefined(game.overlay, 'Overlay should be set');
            test.assertEqual(game.overlay.type, 'lab');
        });
    });
}

