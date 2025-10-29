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
        Attributes: function(){ this.fillColor=()=>this; this.textSize=()=>this; this.textStyle=()=>this; this.fillOpacity=()=>this; this.lineColor=()=>this; this.lineOpacity=()=>this; this.fillLinearGradient=()=>this; this.fillRadialGradient=()=>this; this.lineStyle=()=>this; },
        Point: function(){},
        Rect: function(){},
        Polygon: function(){},
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


