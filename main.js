// Galactica-4 PDG Game - Main Entry Point
// Run with: ./pdg src/js/main.js
// Optional: ./pdg src/js/main.js --lang=es (for Spanish)

const pdg = require('pdg');

console.log("=== Galactica-4 PDG Game Starting ===");

// Open the data directory as a resource path (for strings.txt and strings-*.txt files)
// This tells the ResourceManager where to look for localized string files
const path = require('path');
const dataPath = path.join(__dirname, 'data');
pdg.res.openResourceFile(dataPath);
console.log(`Resource path set to: ${dataPath}`);

// Parse command-line arguments for language setting
// Format: --lang=xx (e.g., --lang=es for Spanish, --lang=fr for French)
const args = process.argv.slice(2); // Skip 'node' and script path
for (const arg of args) {
    if (arg.startsWith('--lang=')) {
        const langCode = arg.substring(7); // Extract language code after '--lang='
        if (langCode.length >= 2) {
            pdg.res.setLanguage(langCode);
            console.log(`Language set to: ${langCode}`);
            
            // Verify string loading with a test string
            const testStr = pdg.res.getString(1); // Should be "Turn" in English, "Turno" in Spanish
            console.log(`Test string (ID 1): "${testStr}"`);
        } else {
            console.warn(`Invalid language code: ${langCode} (must be at least 2 characters)`);
        }
    }
}

// If no language set, verify default English strings are loading
if (args.every(arg => !arg.startsWith('--lang='))) {
    const testStr = pdg.res.getString(1);
    console.log(`Using default language. Test string (ID 1): "${testStr}"`);
}

// Initialize random seed
pdg.srand(Date.now());

// Load required modules
const Factory = require('./src/js/factory.js');
const Display = require('./src/js/display.js');
const Game = require('./src/js/game.js');
const Rules = require('./src/js/rules.js');
const GameConfig = require('./src/js/game-config.js');

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

// Global variables for drag scrolling
let isDragging = false;
let isLeftClickDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let leftClickStartX = 0;
let leftClickStartY = 0;
let hasDragged = false; // Track if user has dragged during left click

const mouseHandler = new pdg.IEventHandler(function(event) {
    // Check if this is a mouse down event
    if (event && event.eventType === pdg.eventType_MouseDown) {
        // Check which button was pressed
        // PDG uses 'button' property: 0=left, 1=right, 2=middle
        if (event.buttonNumber === 0) {
            // Left click - check if it's on an entity or empty space
            const clickedObject = game.findObjectAtPosition(event.mousePos.x, event.mousePos.y);
            if (clickedObject) {
                // Clicked on an entity - handle normally
                game.handleMouseClick(event.mousePos.x, event.mousePos.y);
            } else {
                // Clicked on empty space - start drag scrolling
                isLeftClickDragging = true;
                lastMouseX = event.mousePos.x;
                lastMouseY = event.mousePos.y;
                leftClickStartX = event.mousePos.x;
                leftClickStartY = event.mousePos.y;
                hasDragged = false; // Reset drag tracking
            }
        } else if (event.buttonNumber === 1) {
            game.handleMouseRightClick(event.mousePos.x, event.mousePos.y);
        } else if (event.buttonNumber === 2) {
            // Middle mouse button - start drag scrolling
            isDragging = true;
            lastMouseX = event.mousePos.x;
            lastMouseY = event.mousePos.y;
        }
    } else if (event && event.eventType === pdg.eventType_MouseUp) {
        if (event.buttonNumber === 0) {
            // Left mouse button released - stop left click drag scrolling
            if (isLeftClickDragging && !hasDragged) {
                // Clicked and released without dragging - clear selection
                game.selectedObject = null;
                game.display.setSelectedObject(null);
            }
            isLeftClickDragging = false;
        } else if (event.buttonNumber === 2) {
            // Middle mouse button released - stop drag scrolling
            isDragging = false;
        }
    }
    return true;
});

// Mouse wheel handler for zooming
const mouseWheelHandler = new pdg.IEventHandler(function(event) {
    if (event && event.eventType === pdg.eventType_ScrollWheel) {
        const delta = event.vertDelta || 0;
        if (delta > 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomIn(1.2, mousePos.x, mousePos.y);
        } else if (delta < 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomOut(1.2, mousePos.x, mousePos.y);
        }
    }
    return true;
});

// Mouse move handler for drag scrolling
const mouseMoveHandler = new pdg.IEventHandler(function(event) {
    if (event && event.eventType === pdg.eventType_MouseMove) {
        if (isDragging || isLeftClickDragging) {
            const deltaX = event.mousePos.x - lastMouseX;
            const deltaY = event.mousePos.y - lastMouseY;
            
            // Check if we've moved enough to consider it a drag (threshold of 3 pixels)
            const dragThreshold = 3;
            if (isLeftClickDragging && !hasDragged) {
                const totalDeltaX = event.mousePos.x - leftClickStartX;
                const totalDeltaY = event.mousePos.y - leftClickStartY;
                const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
                if (totalDistance > dragThreshold) {
                    hasDragged = true;
                }
            }
            
            // Only pan if we've actually dragged
            if (hasDragged || isDragging) {
                // Convert screen delta to galactic delta
                const drawingArea = game.port.getDrawingArea();
                const galacticDeltaX = (deltaX / drawingArea.width()) * (game.display.mapWidth / game.display.camera.zoom);
                const galacticDeltaY = (deltaY / drawingArea.height()) * (game.display.mapHeight / game.display.camera.zoom);
                
                game.display.pan(-galacticDeltaX, -galacticDeltaY);
            }
        }
        
        lastMouseX = event.mousePos.x;
        lastMouseY = event.mousePos.y;
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
pdg.evt.addHandler(mouseWheelHandler, pdg.eventType_ScrollWheel);
pdg.evt.addHandler(mouseMoveHandler, pdg.eventType_MouseMove);
pdg.evt.addHandler(keyHandler, pdg.eventType_KeyPress);

console.log("Event handlers registered, starting PDG...");

// Start PDG
pdg.run();

