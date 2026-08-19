// Galactica-4 PDG Game - Main Entry Point
// Run with: ./pdg src/js/main.js
// Optional: ./gad4 -- --lang=es (for Spanish)

const pdg = require('pdg');
globalThis.pdg = pdg;

console.log("=== Galactica-4 PDG Game Starting ===");

// Open the data directory as a resource path (for strings.txt and strings-*.txt files)
// This tells the ResourceManager where to look for localized string files
const path = require('path');
const dataPath = path.join(__dirname, 'data');
const resourceRef = pdg.res.openResourceFile(dataPath);
if (resourceRef) {
    console.log(`Resource path set to: ${dataPath}`);
} else {
    console.warn(`Failed to open resource path: ${dataPath}`);
}

// Parse command-line arguments for language setting.
// With the gad4 launcher, pass app arguments after `--`, e.g. `./gad4 -- --lang=es`.
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
pdg.srand(Date.now() >>> 0);

// Load required modules
const Factory = require('./src/js/factory.js');
const Display = require('./src/js/display.js');
const Game = require('./src/js/game.js');
const Rules = require('./src/js/rules.js');
const GameConfig = require('./src/js/game-config.js');
const I18n = require('./src/js/i18n.js');

// Create window port
const port = pdg.gfx.createWindowPort(new pdg.Rect(0, 0, 800, 600), I18n.getString(568, 'Galactica-4'));

function createDefaultConfig() {
    const config = GameConfig.createSinglePlayer(2, 2); // 2 computers, Good difficulty
    config.sectorSize = 5;
    return config;
}

function refreshTotalPlayers(config) {
    config.totalPlayers = config.numHumans + config.numComputers;
}

let pendingConfig = createDefaultConfig();
let game = null;
let display = null;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function startupUIColor(name) {
    const colors = {
        panelFill: [0.13, 0.13, 0.14, 0.92],
        panelBorder: [0.42, 0.42, 0.44, 0.95],
        divider: [0.34, 0.34, 0.36, 0.85],
        textLight: [0.78, 0.78, 0.80, 1.0],
        textMuted: [0.56, 0.56, 0.58, 1.0],
        background: [0.02, 0.02, 0.08, 1.0]
    };
    const color = colors[name];
    return color ? new pdg.Color(color[0], color[1], color[2], color[3]) : new pdg.Color(name);
}

function createStartupAttributes(definition = {}) {
    const attrs = new pdg.Attributes();
    if (definition.fillColor) {
        attrs.fillColor(definition.fillColor);
    }
    if (definition.lineColor) {
        attrs.lineColor(definition.lineColor);
    }
    if (definition.textSize !== undefined) {
        attrs.textSize(definition.textSize);
    }
    if (definition.textStyle !== undefined) {
        attrs.textStyle(definition.textStyle);
    }
    return attrs;
}

// Startup dialog drawing uses Attributes like CSS classes: define once, reuse at draw sites.
const startupStyles = {
    background: createStartupAttributes({ fillColor: startupUIColor('background') }),
    panel: createStartupAttributes({
        fillColor: startupUIColor('panelFill'),
        lineColor: startupUIColor('panelBorder')
    }),
    divider: createStartupAttributes({ lineColor: startupUIColor('divider') }),
    titleText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 24,
        textStyle: pdg.textStyle_Centered
    }),
    subtitleText: createStartupAttributes({
        fillColor: startupUIColor('textMuted'),
        textSize: 13,
        textStyle: pdg.textStyle_Centered
    }),
    lineText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 13,
        textStyle: pdg.textStyle_Plain
    }),
    hintText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 12,
        textStyle: pdg.textStyle_Plain
    }),
    startText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 14,
        textStyle: pdg.textStyle_Centered
    })
};

function toStartupPDGRect(rect) {
    if (rect && rect.x !== undefined && rect.y !== undefined && rect.width !== undefined && rect.height !== undefined) {
        return new pdg.Rect(new pdg.Point(rect.x, rect.y), rect.width, rect.height);
    }
    return rect;
}

function drawStartupRoundedRect(rect, radius = 14, attrs = startupStyles.panel) {
    port.drawRoundedRect(toStartupPDGRect(rect), radius, attrs);
}

function drawStartupDivider(x, y, width) {
    port.drawLine(new pdg.Point(x, y), new pdg.Point(x + width, y), startupStyles.divider);
}

function drawStartupDialog() {
    const drawingArea = port.getDrawingArea();
    const screenWidth = drawingArea.width();
    const screenHeight = drawingArea.height();

    port.drawRect(new pdg.Rect(0, 0, screenWidth, screenHeight), startupStyles.background);

    const panelWidth = Math.min(560, screenWidth - 40);
    const panelHeight = 390;
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = Math.max(30, (screenHeight - panelHeight) / 2);
    const panelRect = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
    drawStartupRoundedRect(panelRect, 16, startupStyles.panel);

    port.drawText(I18n.getString(568, 'Galactica-4'), new pdg.Point(screenWidth / 2, panelY + 44), startupStyles.titleText);
    port.drawText(I18n.getString(520, 'New Game Setup'), new pdg.Point(screenWidth / 2, panelY + 72), startupStyles.subtitleText);
    drawStartupDivider(panelX + 28, panelY + 88, panelWidth - 56);

    const x = panelX + 34;
    let y = panelY + 112;
    port.drawText(I18n.formatString(
        521,
        'Players: {0} {1}, {2} {3}',
        pendingConfig.numHumans,
        I18n.getString(503, 'human'),
        pendingConfig.numComputers,
        I18n.getString(504, 'AI')
    ), new pdg.Point(x, y), startupStyles.lineText);
    y += 24;
    port.drawText(I18n.formatString(522, 'AI skill: {0} ({1})', pendingConfig.getDifficultyName(), pendingConfig.compSkill), new pdg.Point(x, y), startupStyles.lineText);
    y += 24;
    port.drawText(I18n.formatString(523, 'Map: {0} / {1}', pendingConfig.getMapSizeDescription(), pendingConfig.getDensityDescription()), new pdg.Point(x, y), startupStyles.lineText);
    y += 24;
    port.drawText(I18n.formatString(
        524,
        'Options: {0}, {1}',
        pendingConfig.fastGame ? I18n.getString(505, 'Fast Game') : I18n.getString(509, 'Normal speed'),
        pendingConfig.getFogOfWarDescription()
    ), new pdg.Point(x, y), startupStyles.lineText);
    y += 36;
    port.drawText(I18n.getString(525, '<C> cycle AI players   <1-5> AI skill'), new pdg.Point(x, y), startupStyles.hintText);
    y += 22;
    port.drawText(I18n.getString(526, '<S> map size   <D> star density'), new pdg.Point(x, y), startupStyles.hintText);
    y += 22;
    port.drawText(I18n.getString(527, '<F> fast game   <O> fog/all visible   <R> defaults'), new pdg.Point(x, y), startupStyles.hintText);
    y += 42;

    port.drawText(I18n.getString(528, '<Enter> Start'), new pdg.Point(screenWidth / 2, y), startupStyles.startText);
}

function handleStartupKey(key) {
    const char = typeof key === 'number' ? String.fromCharCode(key) : '';
    const lower = char.toLowerCase();

    if (key === 13 || key === 10 || key === pdg.key_Tab) {
        startGame();
        return true;
    }

    if (char >= '1' && char <= '5') {
        pendingConfig.compSkill = Number(char);
        return true;
    }

    switch (lower) {
        case 'c':
            pendingConfig.numComputers = (pendingConfig.numComputers % 5) + 1;
            refreshTotalPlayers(pendingConfig);
            return true;
        case 's':
            pendingConfig.sectorSize = (pendingConfig.sectorSize % 5) + 1;
            return true;
        case 'd':
            pendingConfig.density = (pendingConfig.density % 5) + 1;
            return true;
        case 'f':
            pendingConfig.fastGame = !pendingConfig.fastGame;
            return true;
        case 'o':
            pendingConfig.omniscient = !pendingConfig.omniscient;
            return true;
        case 'r':
            pendingConfig = createDefaultConfig();
            return true;
        case '+':
        case '=':
            pendingConfig.numComputers = clamp(pendingConfig.numComputers + 1, 1, 5);
            refreshTotalPlayers(pendingConfig);
            return true;
        case '-':
            pendingConfig.numComputers = clamp(pendingConfig.numComputers - 1, 1, 5);
            refreshTotalPlayers(pendingConfig);
            return true;
        default:
            return true;
    }
}

function startGame() {
    if (game) {
        return;
    }
    refreshTotalPlayers(pendingConfig);

    const errors = pendingConfig.validate();
    if (errors.length > 0) {
        console.error("Invalid startup configuration:", errors);
        pendingConfig = createDefaultConfig();
        return;
    }

    const factory = new Factory();
    const rules = new Rules(pendingConfig.fastGame);
    game = new Game(factory, rules, pendingConfig);
    game.port = port;
    display = new Display(game);
    game.recordEvent(
        I18n.getString(601, 'Startup'),
        I18n.formatString(511, 'Game started: {0}', pendingConfig.getDescription()),
        { type: 'system' }
    );
    console.log("Game created and window opened");
}

console.log("Window opened; showing startup dialog");

// Create event handlers using the correct PDG syntax
const drawHandler = new pdg.IEventHandler(function(event) {
    if (game) {
        game.draw();
    } else {
        drawStartupDialog();
    }
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
    if (!game) {
        return true;
    }
    // Check if this is a mouse down event
    if (event && event.eventType === pdg.eventType_MouseDown) {
        // Check which button was pressed
        // PDG uses buttonNumber: 0=left, 1=right, 2=middle
        if (event.buttonNumber === 0) {
            game.display.setHoverPoint(event.mousePos.x, event.mousePos.y);
            if (game.handleUIClick(event.mousePos.x, event.mousePos.y)) {
                return true;
            }

            if (game.isAwaitingMapTarget && game.isAwaitingMapTarget()) {
                game.handleMouseClick(event.mousePos.x, event.mousePos.y);
                return true;
            }

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
    if (!game) {
        return true;
    }
    if (event && event.eventType === pdg.eventType_ScrollWheel) {
        const delta = event.vertDelta || 0;
        if (delta < 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomIn(1.2, mousePos.x, mousePos.y);
        } else if (delta > 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomOut(1.2, mousePos.x, mousePos.y);
        }
    }
    return true;
});

// Mouse move handler for drag scrolling
const mouseMoveHandler = new pdg.IEventHandler(function(event) {
    if (!game) {
        return true;
    }
    if (event && event.eventType === pdg.eventType_MouseMove) {
        game.display.setHoverPoint(event.mousePos.x, event.mousePos.y);
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
                // Pass screen coordinate deltas directly to the camera
                // The camera will handle the conversion to galactic coordinates
                game.display.pan(-deltaX, -deltaY);
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
        if (game) {
            game.handleKeyPress(event.unicode);
        } else {
            handleStartupKey(event.unicode);
        }
    }
    return true;
});

// Port resize handler to update camera scale and offsets immediately
const portResizeHandler = new pdg.IEventHandler(function(event) {
    if (event && event.eventType === pdg.eventType_PortResized) {
        // Update camera scale and offsets immediately when port is resized
        if (game && game.display) {
            game.display.onScreenSizeChanged();
        }
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
pdg.evt.addHandler(portResizeHandler, pdg.eventType_PortResized);

console.log("Event handlers registered, starting PDG...");

// Start PDG
pdg.run();
