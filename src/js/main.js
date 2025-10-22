// Galactica-4 PDG Game - Main Entry Point
// Run with: ./pdg src/js/main.js

const pdg = require('pdg');

console.log("=== Galactica-4 PDG Game Starting ===");

// Initialize random seed
pdg.srand(Date.now());

// Load required modules
const Factory = require('./factory.js');
const Display = require('./display.js');
const Game = require('./game.js');
const Rules = require('./rules.js');
const GameConfig = require('./game-config.js');

const factory = new Factory();

// Create game configuration (can customize here)
const config = GameConfig.createSinglePlayer(1, 2); // 1 computer, Good difficulty

// Create rules with fastGame setting from config
const rules = new Rules(config.fastGame);

// Create game instance with config
let game = new Game(factory, rules, config);

// Create window port
game.port = pdg.gfx.createWindowPort(new pdg.Rect(0, 0, 800, 600), "Galactica-4");

// Create display system
const display = new Display(game);

console.log("Game created and window opened");

// Create event handlers using the correct PDG syntax
const drawHandler = new pdg.IEventHandler(function(event) {
    game.draw();
    return true;
});

const mouseHandler = new pdg.IEventHandler(function(event) {
    // Check if this is a mouse down event
    if (event && event.eventType === pdg.eventType_MouseDown) {
        // Check which button was pressed
        // PDG uses 'button' property: 0=left, 1=right, 2=middle
        if (event.buttonNumber === 0) {
            game.handleMouseClick(event.mousePos.x, event.mousePos.y);
        } else if (event.buttonNumber === 1) {
            game.handleMouseRightClick(event.mousePos.x, event.mousePos.y);
        }
    }
    return true;
});

const keyHandler = new pdg.IEventHandler(function(event) {
    // Check if this is a key press event
    if (event && event.eventType === pdg.eventType_KeyPress) {
        game.handleKeyPress(event.unicode);
    }
    return true;
});

// Register event handlers
pdg.evt.addHandler(drawHandler, pdg.eventType_PortDraw);
pdg.evt.addHandler(mouseHandler, pdg.eventType_MouseDown);
pdg.evt.addHandler(mouseHandler, pdg.eventType_MouseUp);
pdg.evt.addHandler(keyHandler, pdg.eventType_KeyPress);

console.log("Event handlers registered, starting PDG...");

// Start PDG
pdg.run();

