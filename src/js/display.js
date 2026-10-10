// Display functions for Galactica-4
// Contains all rendering and UI display logic

const Common = require('./common.js');
const Camera = require('./camera.js');
const RetainedPanel = require('./retained-panel.js');
const SelectionPulse = require('./selection-pulse.js');
const I18n = require('./i18n.js');
const VisualEffects = require('./visual-effects.js');
const LanguageSettings = require('./language-settings.js');

const debugSelectedObject = true;

class Display {
    constructor(game) {
        this.port = game.port;
        this.game = game;
        this.factory = game.getFactory();
        this.selectedObject = null;
        this.hoverPoint = null;
        game.setDisplay(this);
        const ownerColorNames = ['green', 'blue', 'red', 'yellow', 'purple', 'aqua', 'olive', 'lime'];
        this.ownerColors = ownerColorNames.map(name => new pdg.Color(name));
        this.ownerColors.forEach(color => color.alpha = 0.5);
        this.uiColors = this.createUIColorPalette();
        this.textAttributes = {};
        this.shipPanels = new Map();
        this.selectionPulse = new SelectionPulse();
        this.fillAttributes = {};
        this.lineAttributes = {};
        this.styles = this.createDrawingStyles();
        const reduced=!!game.config.reducedMotion || typeof window!=='undefined' && typeof window.matchMedia==='function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.visualEffects=new VisualEffects(reduced);
        this.uiSurfaces=new Map();
        this.ownerPanelStyles=new Map();
        this.panelStyleColors=new WeakMap();
        this.iconAttributes=this.createAttributes({lineColor:this.getUIColor('textLight'),lineStyle:pdg.lineStyle_Solid,fillOpacity:0});
        
        // Overlay images (loaded lazily)
        this.images = {
            labback: null,
            labtop: null,
            stardock: null,
            stardockfront: null
        };
        
        // Coordinate system setup - maps use galactic coordinates, display uses screen coordinates
        this.sectorSize = game.config ? game.config.sectorSize : 1;
        this.mapWidth = 1024 * 1024 * this.sectorSize;  // Galactic coordinate space
        this.mapHeight = 1024 * 1024 * this.sectorSize; // Galactic coordinate space
        
        // Load background image once in constructor
        this.backgroundImage = null;
        try {
            this.backgroundImage = pdg.res.getImage('background.png');
        } catch (error) {
            console.log('Failed to load background image:', error);
        }
        
        // Create camera system for zoom and pan
        this.camera = new Camera(
            this.port,
            this.mapWidth, 
            this.mapHeight
        );
        
        this.reloadUIStrings();
    }

    reloadUIStrings() {
        this.STR = {
            turn: I18n.getString(1, "Turn"),
            stars: I18n.getString(2, "Stars:"),
            ships: I18n.getString(3, "Ships:"),
            pop: I18n.getString(4, "Pop:"),
            tech: I18n.getString(5, "Tech:"),
            building: I18n.getString(6, "Building:"),
            none: I18n.getString(7, "None"),
            clickStars: I18n.getString(8, "Click stars to manage them"),
            clickShips: I18n.getString(9, "Click ships to give orders"),
            tabEndTurn: I18n.getString(10, "TAB to end turn"),
            shipHull: I18n.getString(11, "Ship Hull"),
            ship: I18n.getString(12, "Ship"),
            techLevel: I18n.getString(13, "Tech Level:"),
            underConstruction: I18n.getString(14, "Under Construction:"),
            speed: I18n.getString(15, "Speed:"),
            power: I18n.getString(16, "Power:"),
            // Ship types
            scout: I18n.getString(20, "scout"),
            defense: I18n.getString(21, "defense"),
            battleship: I18n.getString(22, "battleship"),
            colony: I18n.getString(23, "colony"),
            scoutName: I18n.getString(450, "Scout"),
            defenseName: I18n.getString(451, "Defense"),
            battleshipName: I18n.getString(452, "Battleship"),
            colonyName: I18n.getString(453, "Colony"),
            // Build menu items
            buildScout: I18n.getString(30, "[s] scout"),
            buildDefense: I18n.getString(31, "[d] defense"),
            buildBattleship: I18n.getString(32, "[b] battleship"),
            buildColony: I18n.getString(33, "[c] colony"),
            zoom: I18n.getString(546, "Zoom"),
            zoomResetCenterHelp: I18n.getString(547, "<+/-> Zoom   <0> Reset   <Shift+C> Center"),
            dragZoomHelp: I18n.getString(548, "<Left Drag> Pan   <Middle Drag> Pan   <Mouse Wheel> Zoom"),
            production: I18n.getString(549, "Production"),
            menu: I18n.getString(550, "Menu"),
            events: I18n.getString(551, "Events"),
            compare: I18n.getString(552, "Compare"),
            home: I18n.getString(553, "Home"),
            fit: I18n.getString(554, "Fit"),
            orders: I18n.getString(555, "Orders"),
            center: I18n.getString(556, "Center"),
            owner: I18n.getString(557, "Owner:"),
            unclaimed: I18n.getString(558, "Unclaimed"),
            damage: I18n.getString(559, "Damage:"),
            totalPower: I18n.getString(561, "Total Power:"),
            movingTo: I18n.getString(562, "Moving to:"),
            endTurn: I18n.getString(563, "End Turn"),
            growth: I18n.getString(564, "Growth"),
            research: I18n.getString(565, "Research"),
            fleets: I18n.getString(566, "Fleets"),
            rendezvous: I18n.getString(567, "Rendezvous"),
            winner: I18n.getString(646, "Winner:"),
            commandMenu: I18n.getString(529, "Command Menu"),
            keyboardShortcutsActive: I18n.getString(530, "Keyboard shortcuts remain active."),
            escClose: I18n.getString(531, "<Esc> Close"),
            productionSliders: I18n.getString(532, "Production Sliders"),
            selectStarForProduction: I18n.getString(533, "Select one of your stars to tune production."),
            eventList: I18n.getString(534, "Event List"),
            noEventsYet: I18n.getString(535, "No events yet."),
            empireComparison: I18n.getString(536, "Empire Comparison"),
            player: I18n.getString(537, "Player"),
            type: I18n.getString(538, "Type"),
            avgTech: I18n.getString(539, "Avg Tech"),
            max: I18n.getString(540, "Max"),
            closeComparison: I18n.getString(545, "<V>/<Esc> Close comparison"),
            newDriveTechnology: I18n.getString(570, "New Drive Technology"),
            pressAnyKey: I18n.getString(572, "Space or Esc to continue"),
            rename: I18n.getString(573, "Rename"),
            delete: I18n.getString(574, "Delete"),
            move: I18n.getString(575, "Move"),
            clear: I18n.getString(576, "Clear"),
            patrol: I18n.getString(577, "Patrol"),
            contents: I18n.getString(578, "Contents"),
            location: I18n.getString(579, "Location:"),
            assembling: I18n.getString(580, "Assembling:"),
            noFleet: I18n.getString(581, "No fleet"),
            fleetRoster: I18n.getString(582, "Fleet Roster"),
            noFleets: I18n.getString(583, "No fleets or rendezvous points yet."),
            select: I18n.getString(584, "Select"),
            remove: I18n.getString(585, "Remove"),
            transfer: I18n.getString(586, "Transfer"),
            name: I18n.getString(587, "Name:"),
            renameHelp: I18n.getString(588, "<Enter> Save   <Esc> Cancel"),
            placeRendezvous: I18n.getString(589, "Place Rendezvous"),
            moveRendezvous: I18n.getString(590, "Move Rendezvous"),
            fleet: I18n.getString(591, "Fleet"),
            point: I18n.getString(592, "Point"),
            placeRendezvousHelp: I18n.getString(593, "Click the map or an object to place it."),
            moveRendezvousHelp: I18n.getString(594, "Click the map or an object to move it."),
            destination: I18n.getString(595, "Destination:")
        };
    }

    createUIColorPalette() {
        const colors = {
            panelFill: [0.105, 0.135, 0.17, 0.92],
            windowFill: [0.105, 0.135, 0.17, 0.96],
            panelBorder: [0.38, 0.50, 0.61, 0.55],
            buttonFill: [0.16, 0.21, 0.27, 0.98],
            buttonFillHover: [0.23, 0.31, 0.39, 1.0],
            buttonFillActive: [0.18, 0.29, 0.35, 1.0],
            buttonFillActiveHover: [0.24, 0.35, 0.42, 1.0],
            buttonBorder: [0.45, 0.58, 0.68, 0.65],
            divider: [0.34, 0.34, 0.36, 0.85],
            connector: [0.56, 0.56, 0.58, 0.50],
            barTrack: [0.22, 0.22, 0.23, 0.95],
            topInfoFill: [0.11, 0.11, 0.12, 0.86],
            textLight: [0.86, 0.89, 0.92, 1.0],
            textLabel: [0.64, 0.64, 0.66, 1.0],
            textHover: [0.96, 0.96, 0.98, 1.0],
            textMuted: [0.56, 0.56, 0.58, 1.0],
            gridLine: [0.25, 0.25, 0.5, 0.5],
            overlayDim: [0, 0, 0, 0.65],
            selectionFrame: [1, 1, 1, 0.75],
            defaultDestination: [0, 1, 0, 0.8],
            rendezvousLine: [0.80, 0.80, 0.84, 0.75]
        };

        const palette = {};
        for (const [name, rgba] of Object.entries(colors)) {
            palette[name] = new pdg.Color(rgba[0], rgba[1], rgba[2], rgba[3]);
        }
        return palette;
    }

    createAttributes(definition = {}) {
        const attrs = new pdg.Attributes();
        if (definition.fillColor) {
            attrs.fillColor(definition.fillColor);
        }
        if (definition.fillOpacity !== undefined) {
            attrs.fillOpacity(definition.fillOpacity);
        }
        if (definition.lineColor) {
            attrs.lineColor(definition.lineColor);
        }
        if (definition.lineOpacity !== undefined) {
            attrs.lineOpacity(definition.lineOpacity);
        }
        if (definition.lineStyle !== undefined) {
            attrs.lineStyle(definition.lineStyle);
        }
        if (definition.fillGradient) {
            const gradient = definition.fillGradient;
            attrs.fillGradient(gradient.start, gradient.startColor, gradient.end, gradient.endColor);
        }
        if (definition.fillRadialGradient) {
            const gradient = definition.fillRadialGradient;
            attrs.fillRadialGradient(gradient.center, gradient.centerColor, gradient.radius, gradient.endColor);
        }
        if (definition.textSize !== undefined) {
            attrs.textSize(definition.textSize);
        }
        if (definition.textStyle !== undefined) {
            attrs.textStyle(definition.textStyle);
        }
        if (definition.fitType !== undefined) {
            attrs.fitType(definition.fitType);
        }
        return attrs;
    }

    createDrawingStyles() {
        // Treat these Attributes objects like CSS classes: define once, reuse at draw sites,
        // and allow later UI passes to tune a style in one place.
        return {
            clear: this.createAttributes({ fillColor: new pdg.Color('black') }),
            image: this.createAttributes(),
            panel: this.createAttributes({
                fillColor: this.getUIColor('panelFill'),
                lineColor: this.getUIColor('panelBorder')
            }),
            windowPanel: this.createAttributes({ fillColor: this.getUIColor('windowFill'),
                lineColor: this.getUIColor('panelBorder') }),
            topInfoPanel: this.createAttributes({
                fillColor: this.getUIColor('topInfoFill'),
                lineColor: this.getUIColor('panelBorder')
            }),
            panelPointer: this.createAttributes({
                fillColor: this.getUIColor('panelFill'),
                lineColor: this.getUIColor('panelBorder')
            }),
            divider: this.createAttributes({ lineColor: this.getUIColor('divider') }),
            connector: this.createAttributes({ lineColor: this.getUIColor('connector') }),
            barTrack: this.createAttributes({ fillColor: this.getUIColor('barTrack') }),
            barFrame: this.createAttributes({ lineColor: this.getUIColor('divider') }),
            buttonFill: this.createAttributes({
                fillColor: this.getUIColor('buttonFill'),
                lineColor: this.getUIColor('buttonBorder')
            }),
            buttonFillHover: this.createAttributes({
                fillColor: this.getUIColor('buttonFillHover'),
                lineColor: this.getUIColor('buttonBorder')
            }),
            buttonFillActive: this.createAttributes({
                fillColor: this.getUIColor('buttonFillActive'),
                lineColor: this.getUIColor('buttonBorder')
            }),
            buttonFillActiveHover: this.createAttributes({
                fillColor: this.getUIColor('buttonFillActiveHover'),
                lineColor: this.getUIColor('buttonBorder')
            }),
            gridLine: this.createAttributes({ lineColor: this.getUIColor('gridLine') }),
            overlayDim: this.createAttributes({ fillColor: this.getUIColor('overlayDim') }),
            selectionFrame: this.createAttributes({ lineColor: this.getUIColor('selectionFrame') }),
            defaultDestinationLine: this.createAttributes({ lineColor: this.getUIColor('defaultDestination') }),
            shipDestinationLine: this.createAttributes({
                lineColor: new pdg.Color('cyan'),
                lineOpacity: 0.75
            }),
            fleetDestinationLine: this.createAttributes({
                lineColor: new pdg.Color('orange'),
                lineOpacity: 0.75
            }),
            rendezvousLine: this.createAttributes({
                lineColor: this.getUIColor('rendezvousLine')
            })
        };
    }
    
    // Convert galactic coordinates to screen coordinates (now using camera)
    toScreenX(galacticX) {
        return this.camera.toScreenX(galacticX);
    }
    
    toScreenY(galacticY) {
        return this.camera.toScreenY(galacticY);
    }
    
    // Convert screen coordinates to galactic coordinates (for mouse input, now using camera)
    toGalacticX(screenX) {
        return this.camera.toGalacticX(screenX);
    }
    
    toGalacticY(screenY) {
        return this.camera.toGalacticY(screenY);
    }
    
    // Camera control methods
    zoomIn(factor = 1.2, mouseX = undefined, mouseY = undefined) {
        this.camera.zoomIn(factor, this.selectedObject, mouseX, mouseY);
    }
    
    zoomOut(factor = 1.2, mouseX = undefined, mouseY = undefined) {
        this.camera.zoomOut(factor, this.selectedObject, mouseX, mouseY);
    }
    
    setZoom(zoom) {
        this.camera.setZoom(zoom);
    }
    
    pan(deltaX, deltaY) {
        this.camera.pan(deltaX, deltaY);
    }
    
    centerOn(galacticX, galacticY) {
        if (!this.camera) {
            // console.log('Camera not available yet, skipping centerOn');
            return;
        }
        this.camera.centerOn(galacticX, galacticY);
    }
    
    resetView() {
        this.camera.resetView();
    }
    
    // Handle screen size changes
    onScreenSizeChanged() {
        this.camera.onScreenSizeChanged();
    }
    
    zoomToFit() {
        // Calculate the actual bounds of all game content
        const bounds = this.calculateContentBounds();
        if (bounds) {
            this.camera.zoomToFitBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
        } else {
            // Fallback to default zoom to fit
            this.camera.zoomToFit();
        }
    }
    
    // Calculate the bounds of all visible game content
    calculateContentBounds() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasContent = false;
        
        // Check all stars
        if (this.game && this.game.stars) {
            for (const star of this.game.stars) {
                minX = Math.min(minX, star.x);
                minY = Math.min(minY, star.y);
                maxX = Math.max(maxX, star.x);
                maxY = Math.max(maxY, star.y);
                hasContent = true;
            }
        }
        
        // Check all ships
        if (this.game && this.game.allShips) {
            for (const ship of this.game.allShips) {
                minX = Math.min(minX, ship.x);
                minY = Math.min(minY, ship.y);
                maxX = Math.max(maxX, ship.x);
                maxY = Math.max(maxY, ship.y);
                hasContent = true;
            }
        }

        if (this.game && this.game.allFleets) {
            for (const fleet of this.game.allFleets) {
                minX = Math.min(minX, fleet.x);
                minY = Math.min(minY, fleet.y);
                maxX = Math.max(maxX, fleet.x);
                maxY = Math.max(maxY, fleet.y);
                hasContent = true;
            }
        }

        if (this.game && this.game.allRendezvous) {
            for (const rendezvous of this.game.allRendezvous) {
                minX = Math.min(minX, rendezvous.x);
                minY = Math.min(minY, rendezvous.y);
                maxX = Math.max(maxX, rendezvous.x);
                maxY = Math.max(maxY, rendezvous.y);
                hasContent = true;
            }
        }
        
        // If no content found, return null
        if (!hasContent) {
            return null;
        }
        
        
        
        // Add some margin around the content
        const margin = 100;
        return {
            minX: minX - margin,
            minY: minY - margin,
            maxX: maxX + margin,
            maxY: maxY + margin
        };
    }
    
    getZoomLevel() {
        return this.camera.zoom;
    }
    
    getZoomPercentage() {
        return this.camera.getZoomPercentage();
    }
    
    // Clear the screen
    clear() {
        const drawingArea = this.port.getDrawingArea();
        this.port.drawRect(new pdg.Rect(0, 0, drawingArea.width(), drawingArea.height()), this.styles.clear);
    }
    
    // Cover the viewport with a little overscan for subtle parallax.
    drawBackground() {
        const drawingArea = this.port.getDrawingArea();
        const screenWidth = drawingArea.width();
        const screenHeight = drawingArea.height();
        
        if (this.backgroundImage) {
            // Get the original image dimensions
            const imageWidth = this.backgroundImage.getWidth();
            const imageHeight = this.backgroundImage.getHeight();
            
            // Calculate scaling to maintain aspect ratio while covering the screen
            const scaleX = (screenWidth+24) / imageWidth;
            const scaleY = (screenHeight+24) / imageHeight;
            const scale = Math.max(scaleX, scaleY); // Use max to ensure image covers entire screen
            
            // Calculate the scaled dimensions
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeight * scale;
            
            // Center the image on the screen
            const drift=this.visualEffects.parallax(this.camera);
            const offsetX = (screenWidth - scaledWidth) / 2+drift.x;
            const offsetY = (screenHeight - scaledHeight) / 2+drift.y;
            
            // Create rectangle for the background image (may extend beyond screen bounds)
            const backgroundRect = this.toPDGRect({ x: offsetX, y: offsetY, width: scaledWidth, height: scaledHeight });
            
            this.port.drawImage(this.backgroundImage, backgroundRect, this.styles.image);
        } else {
            // Fallback to a gradient background if image not loaded
            const backgroundRect = new pdg.Rect(0, 0, screenWidth, screenHeight);
            const startColor = new pdg.Color(0.1, 0.1, 0.3); // Dark blue
            const endColor = new pdg.Color(0.0, 0.0, 0.1);   // Very dark blue
            const attrs = this.createAttributes({
                fillGradient: {
                    start: new pdg.Point(0, 0),
                    startColor,
                    end: new pdg.Point(0, screenHeight),
                    endColor
                }
            });
            this.port.drawRect(backgroundRect, attrs);
        }
    }
    
    setSelectedObject(object) {
        const objectType = this.game.getObjectType(object);
        if (object) {
            if (objectType === Common.ObjectType.SHIP) {
                console.log(`Display: selected ${object.type} (ID: ${object.id})`);
            } else if (objectType === Common.ObjectType.STAR) {
                console.log(`Display: selected ${object.name}`);
            }
        } else {
            console.log(`Display: selected nothing`);
        }
        this.selectedObject = object;
        if (debugSelectedObject) {
            // Log a concise summary to avoid dumping large/circular structures
            const t = object ? this.game.getObjectType(object) : Common.ObjectType.UNKNOWN;
            let summary = 'none';
            if (object) {
                if (t === Common.ObjectType.SHIP) {
                    summary = `ship ${object.type} id=${object.id} owner=${object.owner} @(${Math.round(object.x/1024)},${Math.round(object.y/1024)})`;
                } else if (t === Common.ObjectType.STAR) {
                    summary = `star ${object.name} id=${object.id} owner=${object.owner} @(${Math.round(object.x/1024)},${Math.round(object.y/1024)})`;
                } else if (t === Common.ObjectType.FLEET) {
                    const size = object.getSize ? object.getSize() : (object.ships ? object.ships.length : 0);
                    summary = `fleet id=${object.id} owner=${object.owner} size=${size} @(${Math.round(object.x/1024)},${Math.round(object.y/1024)})`;
                } else if (t === Common.ObjectType.RENDEZVOUS) {
                    summary = `rendezvous ${object.name} id=${object.id} owner=${object.owner} @(${Math.round(object.x/1024)},${Math.round(object.y/1024)})`;
                } else {
                    summary = 'unknown';
                }
            }
            console.log(`Display selectedObject set to: ${summary}`);
        }
    }

    getShipColor(ship) {
        const colors = {
            scout: 'cyan',
            defense: 'green',
            battleship: 'red',
            colony: 'purple'
        };
        return colors[ship.type] || 'white';
    }
    
    // Get localized ship type name
    getShipTypeName(shipType, options = {}) {
        const typeMap = options.capitalized ? {
            scout: this.STR.scoutName,
            defense: this.STR.defenseName,
            battleship: this.STR.battleshipName,
            colony: this.STR.colonyName
        } : {
            scout: this.STR.scout,
            defense: this.STR.defense,
            battleship: this.STR.battleship,
            colony: this.STR.colony
        };
        return typeMap[shipType] || shipType;
    }
    
    // Calculate and cache star rendering parameters once per frame
    updateMapRenderingCalculations() {
        const zoom = this.camera.zoom;
        
        // Calculate scaled star and ship radius values based on zoom level
        if (zoom >= 0.5) {
            this.scaledStarRadius = Common.StarRadius; // Full size
            this.scaledShipRadius = Common.ShipRadius; // Full size
        } else if (zoom <= 0.1) {
            this.scaledStarRadius = Common.StarRadius * 0.25; // 1/4 size
            this.scaledShipRadius = Common.ShipRadius * 0.25; // 1/4 size
        } else {
            // Linear interpolation between 0.5 and 0.1
            const t = (0.5 - zoom) / (0.5 - 0.1); // t goes from 0 to 1
            const scale = 1.0 - (t * 0.75); // Scale goes from 1.0 to 0.25
            this.scaledStarRadius = Common.StarRadius * scale;
            this.scaledShipRadius = Common.ShipRadius * scale;
        }
        
        // Calculate default star name opacity based on star size
        const sizeRatio = this.scaledStarRadius / Common.StarRadius;
        if (sizeRatio >= 0.5) {
            this.mapEntityNameOpacity = 1.0; // Fully visible
        } else if (sizeRatio <= 0.25) {
            this.mapEntityNameOpacity = 0.0; // Completely invisible
        } else {
            // Linear interpolation between 50% and 25% size
            const t = (0.5 - sizeRatio) / (0.5 - 0.25); // t goes from 0 to 1
            this.mapEntityNameOpacity = 1.0 - t; // Opacity goes from 1.0 to 0.0
        }
    }

    // Check if a star is a home system for any player
    isHomeSystem(star) {
        if (!this.game || !star) {
            return false;
        }
        
        // Check if this star is a home system for any player
        for (let playerNum = 1; playerNum <= this.game.config.totalPlayers; playerNum++) {
            const homeStarId = this.game.getPlayerHomeSystem(playerNum);
            if (homeStarId && star.id === homeStarId) {
                return true;
            }
        }
        return false;
    }

    isOmniscientMode() {
        return !!(this.game && this.game.config && this.game.config.omniscient);
    }

    getVisibilityLevelForPlayer(entity, playerNum) {
        if (!entity || !playerNum) {
            return Common.VisibilityLevel.NONE;
        }
        if (this.isOmniscientMode() || entity.owner === playerNum) {
            return Common.VisibilityLevel.DETAILS;
        }
        if (typeof entity.getVisibilityTo === 'function') {
            const visibility = entity.getVisibilityTo(playerNum);
            if (typeof visibility === 'number') {
                return visibility;
            }
            if (visibility && typeof visibility.level === 'number') {
                return visibility.level;
            }
        }
        return (typeof entity.isVisibleTo === 'function' && entity.isVisibleTo(playerNum)) ?
            Common.VisibilityLevel.DETAILS :
            Common.VisibilityLevel.NONE;
    }

    isEntityVisibleToPlayer(entity, playerNum) {
        return this.getVisibilityLevelForPlayer(entity, playerNum) > Common.VisibilityLevel.NONE;
    }

    // Draw a single star
    drawStar(star) {
        const humanPlayer = 1; // Player 1 is the human player
        
        // Convert galactic coordinates to screen coordinates
        const screenX = this.toScreenX(star.x);
        const screenY = this.toScreenY(star.y);
        
        // Use cached scaled star radius (calculated once per frame)
        const scaledRadius = this.scaledStarRadius;
        
        const visibilityLevel = this.getVisibilityLevelForPlayer(star, humanPlayer);
        
        let color = 'white';
        if (star.namedStar) {
            color = 'yellow';
        }
        
        // Only show ownership color if we can see ownership details
        if (star.owner && visibilityLevel >= Common.VisibilityLevel.CLASS) {
            const ownerColor = this.ownerColors[star.owner];
            const attrs = this.createAttributes({
                fillColor: ownerColor,
                fillOpacity: 0.25
            });
            this.port.drawCircle(new pdg.Point(screenX, screenY), scaledRadius * 5.0, attrs);
        }
        
        // Create 4-pointed polygon (diamond shape)
        const r = scaledRadius;
        const diamond = new pdg.Polygon(
            new pdg.Point(screenX, screenY - r * 1.25),      // Top
            new pdg.Point(screenX + r, screenY),      // Right
            new pdg.Point(screenX, screenY + r * 1.25),      // Bottom
            new pdg.Point(screenX - r, screenY)       // Left
        );
        
        // Use radial gradient from center (bright) to edges (darker)
        const centerColor = new pdg.Color(color);
        const edgeColor = new pdg.Color(color);
        edgeColor.alpha = 0.1;  // Make edges more transparent/darker
        const attrs = this.createAttributes({
            fillRadialGradient: {
                center: new pdg.Point(screenX, screenY),
                centerColor,
                radius: r,
                endColor: edgeColor
            }
        });
        this.port.drawPolygon(diamond, attrs);
        
        const twinkle=this.visualEffects.twinkle(star.id,this.getVisualTime());
        if(twinkle>0) {
            const glow=this.styles.selectionFrame;
            glow.lineOpacity(0.18*twinkle);
            const reach=scaledRadius+3;
            this.port.drawLine(new pdg.Point(screenX-reach,screenY),new pdg.Point(screenX+reach,screenY),glow);
            this.port.drawLine(new pdg.Point(screenX,screenY-reach),new pdg.Point(screenX,screenY+reach),glow);
            glow.lineOpacity(1);
        }
        const isHomeSystem = this.isHomeSystem(star);

        // Draw star name with fading based on star size, but never dim home system names
        const nameOpacity = isHomeSystem || star.namedStar ? 1.0 : this.mapEntityNameOpacity;
        if (nameOpacity > 0) {
            color = 'gray';
            if (star.population > 0 && visibilityLevel > Common.VisibilityLevel.NONE) {
                color = 'white';
            }
            const textColor = new pdg.Color(color);
            textColor.alpha = nameOpacity; // Apply fading
            const textAttrs = this.createAttributes({
                fillColor: textColor,
                textSize: star.namedStar ? 11 : 10,
                textStyle: pdg.textStyle_Centered
            });
            let nameWidth = 160;
            if (star === this.game.selectedObject) {
                const panel = this.getStarDetailsLayout(star).rect;
                const gap = panel.x > screenX ? panel.x-screenX : screenX-panel.x-panel.width;
                nameWidth = Math.min(nameWidth,Math.max(24,gap*2-8));
            }
            this.port.drawText(this.fitShipDiagnosticText(this.getStarDisplayName(star),nameWidth,star.namedStar?11:10),
                new pdg.Point(screenX, screenY + scaledRadius + 12), textAttrs);
        }

        // Draw selection indicator
        if (star === this.selectedObject) {
            const pulse = this.selectionPulse.sample(pdg.tm.getMilliseconds());
            this.port.drawCircle(new pdg.Point(screenX, screenY), scaledRadius + 4 + pulse, this.styles.selectionFrame);
        }
        
        // Draw default destination indicator (only for owned stars)
        const defaultDestination = star.getDefaultDestination();
        if (star.owner === humanPlayer && defaultDestination) {
            const destX = this.toScreenX(defaultDestination.x);
            const destY = this.toScreenY(defaultDestination.y);
            this.port.drawLine(new pdg.Point(screenX, screenY), new pdg.Point(destX, destY), this.styles.defaultDestinationLine);
        }
    }
    
    // Draw all stars
    drawStars(stars) {
        const humanPlayer = 1; // Player 1 is the human player
        
        for (const star of stars) {
            // Always show all stars, but with different visibility levels
            this.drawStar(star);
        }
    }
    
    isPatrolHiddenOnMap(object) {
        return object!==this.selectedObject && !!object.star && object.isOnPatrol &&
            object.isOnPatrol() && !object.destination;
    }

    // Draw a single ship
    drawShip(ship) {
        if(this.isPatrolHiddenOnMap(ship))return;
        // Convert galactic coordinates to screen coordinates
        let x = this.toScreenX(ship.x);
        let y = this.toScreenY(ship.y);

        const zoom = this.camera.zoom;
        const selected = (ship === this.selectedObject);
        if (zoom < 0.20 && !selected) {
            // too small to draw, skip
            return;
        }
        const shipOpacity = selected ? 1.0 : this.mapEntityNameOpacity;
        
        // Offset for ships parked at stars
        if (ship.star) {
            x += this.scaledStarRadius * 1.25;
            y -= this.scaledStarRadius * 0.75;
        }
        
        const frameRadius = this.scaledShipRadius + 1;
        var triangle = new pdg.Polygon(
            new pdg.Point(x-frameRadius, y-frameRadius),
            new pdg.Point(x+frameRadius, y),
            new pdg.Point(x-frameRadius, y+frameRadius)
        );
        const shipAttrs = this.createAttributes({
            fillColor: this.ownerColors[ship.owner],
            fillOpacity: shipOpacity,
            lineStyle: pdg.lineStyle_Solid,
            lineColor: new pdg.Color(1, 1, 1, shipOpacity)
        });
        this.port.drawPolygon(triangle, shipAttrs);
        
        if (ship.underConstruction()) {
            const progLen = Math.floor(ship.progress / 5);
            const statusRect = new pdg.Rect(new pdg.Point(x - 10, y - (this.scaledShipRadius + 2)), 20, 2);
            const grayAttrs = this.createAttributes({
                fillColor: new pdg.Color('gray'),
                fillOpacity: shipOpacity
            });
            this.port.drawRect(statusRect, grayAttrs);
            if (progLen > 0) {
                statusRect.right = statusRect.left + progLen;
                const aquaAttrs = this.createAttributes({
                    fillColor: new pdg.Color('aqua'),
                    fillOpacity: shipOpacity
                });
                this.port.drawRect(statusRect, aquaAttrs);
            }
        }

        if (selected && zoom >= 1 && !ship.underConstruction()) {
            const viewer = this.game.getCurrentHumanPlayer() || 1;
            if (this.game.config.omniscient || this.game.isOwnerAlliedWith(viewer, ship.owner)
                    || ship.getVisibilityTo(viewer) >= Common.VisibilityLevel.CLASS) {
                const health = Math.max(0, Math.min(100, 100 - ship.getDamagePercent()));
                this.drawBar(x - 20, y - 14, 40, 4, health / 100, 'green');
            }
        }

        // Draw destination line (convert destination to screen coordinates)
        this.drawCourseLines(ship,x,y,this.styles.shipDestinationLine);

        // Draw selection indicator
        if (ship === this.selectedObject) {
            //console.log(`🎯 DRAWING SELECTION CIRCLE for ship ${ship.type} (ID: ${ship.id}) at (${x}, ${y})`);
            const pulse = this.selectionPulse.sample(pdg.tm.getMilliseconds());
            this.port.drawCircle(new pdg.Point(x - 1.5, y), Common.ShipRadius + 4 + pulse, this.styles.selectionFrame);
        }
    }
    
    // Draw all ships
    drawShips(ships) {
        const humanPlayer = 1; // Player 1 is the human player
        let shipsUnderConstructionDrawn = 0;
        let shipsUnderConstructionSkipped = 0;
        
        //console.log(`🎨 DRAWING SHIPS: ${ships.length} total, selectedObject:`, this.selectedObject);
        
        for (const ship of ships) {
            // Skip ships that are in fleets - they will be drawn as part of the fleet
            if (ship.isInFleet()) {
                continue;
            }
            
            // Debug logging for ships under construction
            if (ship.underConstruction()) {
                const willDraw = this.isEntityVisibleToPlayer(ship, humanPlayer);
                //console.log(`🎨 DRAWING SHIP UNDER CONSTRUCTION: ${ship.type} (ID: ${ship.id}) - Owner: ${ship.owner}, Visible: ${ship.isVisibleTo(humanPlayer)}, Will Draw: ${willDraw}`);
                if (willDraw) {
                    shipsUnderConstructionDrawn++;
                } else {
                    shipsUnderConstructionSkipped++;
                }
            }
            
            // Always show own ships, only show enemy ships if visible
            if (this.isEntityVisibleToPlayer(ship, humanPlayer)) {
                this.drawShip(ship);
            }
        }
        
        if (shipsUnderConstructionDrawn > 0 || shipsUnderConstructionSkipped > 0) {
            //console.log(`🎨 DRAWING SUMMARY: ${shipsUnderConstructionDrawn} ships under construction drawn, ${shipsUnderConstructionSkipped} skipped`);
        }
    }
    
    // Draw a single fleet
    drawFleet(fleet) {
        if(this.isPatrolHiddenOnMap(fleet))return;
        // Convert galactic coordinates to screen coordinates
        let x = this.toScreenX(fleet.x);
        let y = this.toScreenY(fleet.y);

        const zoom = this.camera.zoom;
        const selected = (fleet === this.selectedObject);
        if (zoom < 0.15 && !selected) {
            // too small to draw, skip
            return;
        }
        
        const fleetOpacity = selected ? 1.0 : this.mapEntityNameOpacity;
        
        // Offset for fleets parked at stars (same as ships)
        // Check if fleet is at a star by comparing positions
        const fleetAtStar = this.game.stars.find(star => 
            Math.abs(star.x - fleet.x) < 5 && Math.abs(star.y - fleet.y) < 5
        );
        if (fleetAtStar) {
            x += this.scaledStarRadius * 1.25;
            y -= this.scaledStarRadius * 0.75;
        }
        
        // Fleet size determines hexagon size
        const fleetSize = fleet.getSize();
        const baseRadius = this.scaledShipRadius * 1.5; // Larger than ships
        const hexRadius = baseRadius + (fleetSize * 0.5); // Scale with ship count
        
        // Create hexagon points
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3; // 60 degrees per point
            const hexX = x + hexRadius * Math.cos(angle);
            const hexY = y + hexRadius * Math.sin(angle);
            hexPoints.push(new pdg.Point(hexX, hexY));
        }
        
        const hexagon = new pdg.Polygon(...hexPoints);
        
        // Fleet appearance
        const fleetAttrs = this.createAttributes({
            fillColor: this.ownerColors[fleet.owner],
            fillOpacity: fleetOpacity * 0.7,
            lineStyle: pdg.lineStyle_Solid,
            lineColor: new pdg.Color(1, 1, 1, fleetOpacity)
        });
        this.port.drawPolygon(hexagon, fleetAttrs);
        
        // Draw ship count in center
        if (fleetSize > 0) {
            const textAttrs = this.createAttributes({
                fillColor: new pdg.Color(1, 1, 1, fleetOpacity),
                textSize: Math.max(8, hexRadius * 0.8),
                textStyle: pdg.textStyle_Centered
            });
            this.port.drawText(fleetSize.toString(), new pdg.Point(x, y + 2), textAttrs);
        }
        
        // Draw destination line (convert destination to screen coordinates)
        this.drawCourseLines(fleet,x,y,this.styles.fleetDestinationLine);

        // Draw selection indicator
        if (fleet === this.selectedObject) {
            const pulse = this.selectionPulse.sample(pdg.tm.getMilliseconds());
            this.port.drawCircle(new pdg.Point(x, y), hexRadius + 6 + pulse, this.styles.selectionFrame);
        }
    }
    
    // Draw all fleets
    drawFleets(fleets) {
        const humanPlayer = 1; // Player 1 is the human player
        
        for (const fleet of fleets) {
            // Always show own fleets, only show enemy fleets if visible
            if (this.isEntityVisibleToPlayer(fleet, humanPlayer)) {
                this.drawFleet(fleet);
            }
        }
    }

    drawRendezvous(rendezvous) {
        const humanPlayer = this.game.getCurrentHumanPlayer ? (this.game.getCurrentHumanPlayer() || 1) : 1;
        if (rendezvous.owner !== humanPlayer && !this.isOmniscientMode()) {
            return;
        }

        let x = this.toScreenX(rendezvous.x);
        let y = this.toScreenY(rendezvous.y);
        const selected = rendezvous === this.selectedObject;
        if (this.camera.zoom < 0.25 && !selected) {
            return;
        }

        const opacity = selected ? 1.0 : Math.max(0.45, this.mapEntityNameOpacity);
        const lineColor = this.ownerColors[rendezvous.owner] || new pdg.Color('white');
        const attrs = this.createAttributes({
            lineColor,
            lineOpacity: opacity,
            lineStyle: pdg.lineStyle_Solid
        });
        const radius = Math.max(5, (this.scaledShipRadius || Common.ShipRadius) + 2);

        this.port.drawLine(new pdg.Point(x - radius, y - radius), new pdg.Point(x + radius, y + radius), attrs);
        this.port.drawLine(new pdg.Point(x + radius, y - radius), new pdg.Point(x - radius, y + radius), attrs);

        if (selected) {
            const pulse = this.selectionPulse.sample(pdg.tm.getMilliseconds());
            this.port.drawCircle(new pdg.Point(x, y), radius + 6 + pulse, this.styles.selectionFrame);
        }

        if (opacity > 0.3) {
            const textColor = new pdg.Color('white');
            textColor.alpha = opacity;
            this.port.drawText(
                rendezvous.name,
                new pdg.Point(x, y + radius + 12),
                this.createAttributes({
                    fillColor: textColor,
                    textSize: 10,
                    textStyle: pdg.textStyle_Centered
                })
            );
        }
    }

    drawRendezvousPoints(rendezvousPoints) {
        for (const rendezvous of rendezvousPoints || []) {
            this.drawRendezvous(rendezvous);
        }
    }
    
    getScreenSize() {
        const drawingArea = this.port.getDrawingArea();
        return {
            width: drawingArea.width(),
            height: drawingArea.height()
        };
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    getUIColor(name) {
        return this.uiColors[name] || new pdg.Color(name);
    }

    resolveColor(color) {
        if (typeof color !== 'string') {
            return color;
        }
        if (color === 'lightgray' || color === 'lightgrey') {
            return this.getUIColor('textLight');
        }
        if (color === 'mediumgray' || color === 'mediumgrey') {
            return this.getUIColor('divider');
        }
        if (color === 'mutedgray' || color === 'mutedgrey') {
            return this.getUIColor('textMuted');
        }
        if (color === 'labelgray' || color === 'labelgrey') {
            return this.getUIColor('textLabel');
        }
        if (color === 'hovergray' || color === 'hovergrey') {
            return this.getUIColor('textHover');
        }
        return new pdg.Color(color);
    }

    setHoverPoint(x, y) {
        this.hoverPoint = (x === null || y === null) ? null : { x, y };
    }

    isHovered(rect) {
        return !!this.hoverPoint && this.containsPoint(rect, this.hoverPoint.x, this.hoverPoint.y);
    }

    getTextAttributes(color = 'lightgray', size = 12, style = pdg.textStyle_Plain) {
        if (typeof color !== 'string') {
            return this.createAttributes({
                fillColor: color,
                textSize: size,
                textStyle: style
            });
        }

        const key = `${color}:${size}:${style}`;
        if (!this.textAttributes[key]) {
            this.textAttributes[key] = this.createAttributes({
                fillColor: this.resolveColor(color),
                textSize: size,
                textStyle: style
            });
        }
        return this.textAttributes[key];
    }

    getFillAttributes(color) {
        if (typeof color !== 'string') {
            return this.createAttributes({ fillColor: color });
        }

        if (!this.fillAttributes[color]) {
            this.fillAttributes[color] = this.createAttributes({ fillColor: this.resolveColor(color) });
        }
        return this.fillAttributes[color];
    }

    getLineAttributes(color) {
        if (typeof color !== 'string') {
            return this.createAttributes({ lineColor: color });
        }

        if (!this.lineAttributes[color]) {
            this.lineAttributes[color] = this.createAttributes({ lineColor: this.resolveColor(color) });
        }
        return this.lineAttributes[color];
    }

    getPanelContentStartY(rect) {
        return rect.y + 47;
    }

    drawTextLine(text, x, y, color = 'lightgray', size = 12, style = pdg.textStyle_Plain) {
        this.port.drawText(text, new pdg.Point(x, y), this.getTextAttributes(color, size, style));
    }

    drawRightTextLine(text, rightX, y, color = 'lightgray', size = 12) {
        this.drawTextLine(text, rightX, y, color, size, pdg.textStyle_RightJustified);
    }

    drawLabelValue(label, value, x, y, options = {}) {
        const labelWidth = options.labelWidth || 72;
        const size = options.size || 12;
        const labelColor = options.labelColor || 'labelgray';
        const valueColor = options.valueColor || 'lightgray';
        const labelStyle = options.labelStyle || pdg.textStyle_RightJustified;
        this.drawTextLine(label, x + labelWidth - 5, y, labelColor, size, labelStyle);
        this.drawTextLine(value, x + labelWidth, y, valueColor, size);
    }

    toPDGRect(rect) {
        if (rect && rect.x !== undefined && rect.y !== undefined && rect.width !== undefined && rect.height !== undefined) {
            return new pdg.Rect(new pdg.Point(rect.x, rect.y), rect.width, rect.height);
        }
        return rect;
    }

    drawRoundedRect(rect, radius = 12, attrs = this.styles.panel) {
        if (attrs && typeof attrs.roundedCorners === 'function') {
            attrs.roundedCorners(radius);
        }
        this.port.drawRect(this.toPDGRect(rect), attrs);
    }

    drawPanelSurface(rect,attrs=this.styles.panel) {
        const base=attrs===this.styles.windowPanel?this.getUIColor('windowFill'):this.getUIColor('panelFill');
        const color=this.panelStyleColors.get(attrs) || base;
        attrs.fillGradient(new pdg.Point(rect.x,rect.y),new pdg.Color(color.red+0.022,color.green+0.022,color.blue+0.022,color.alpha),
            new pdg.Point(rect.x,rect.y+rect.height),color);
        attrs.lineStyle(pdg.lineStyle_Solid).lineThickness(0.7);
        this.drawRoundedRect(rect,14,attrs);
    }

    drawDivider(x, y, width) {
        this.port.drawLine(new pdg.Point(x, y), new pdg.Point(x + width, y), this.styles.divider);
    }

    drawPanel(rect, title = null, borderColor = null, appearance = null) {
        const attrs = appearance || (borderColor
            ? this.createAttributes({ fillColor: this.getUIColor('panelFill'), lineColor: new pdg.Color(borderColor) })
            : this.styles.panel);
        this.drawPanelSurface(rect,attrs);

        if (title) {
            this.drawTextLine(title, rect.x + 16, rect.y + 22, 'lightgray', 14);
            this.drawDivider(rect.x + 14, rect.y + 28, rect.width - 28);
        }
    }

    drawWindowPanel(rect, title) {
        this.drawPanel(rect, title, null, this.styles.windowPanel);
    }

    getPanelPointer(object, rect) {
        if (!object || !rect) {
            return null;
        }

        const position = this.getObjectScreenPosition(object);
        const pointerSize = 20;
        const halfBase = pointerSize / 2;
        const depth = Math.sqrt((pointerSize * pointerSize) - (halfBase * halfBase));
        const side = position.x < (rect.x + rect.width / 2) ? 'left' : 'right';
        const sideX = side === 'left' ? rect.x : rect.x + rect.width;
        const apexX = side === 'left' ? sideX - depth : sideX + depth;
        const centerY = this.clamp(position.y, rect.y + 24, rect.y + rect.height - 24);

        return {
            side,
            centerY,
            points: [
                new pdg.Point(sideX, centerY - halfBase),
                new pdg.Point(apexX, centerY),
                new pdg.Point(sideX, centerY + halfBase)
            ]
        };
    }

    drawPanelPointer(object, rect, borderColor = null) {
        const pointer = this.getPanelPointer(object, rect);
        if (!pointer || typeof this.port.drawPolygon !== 'function') {
            return;
        }

        const attrs = borderColor
            ? this.createAttributes({ fillColor: this.getUIColor('panelFill'), lineColor: new pdg.Color(borderColor) })
            : this.styles.panelPointer;
        this.port.drawPolygon(new pdg.Polygon(...pointer.points), attrs);
    }

    drawAnchoredPanel(object, rect, title = null, borderColor = null) {
        this.drawPanelPointer(object, rect, borderColor);
        let style=null;
        if(this.game.factory.isStar(object) && object.owner>0 && this.isStarOwnerKnown(object)) {
            if(!this.ownerPanelStyles.has(object.owner))this.ownerPanelStyles.set(object.owner,this.createAttributes({lineColor:this.getUIColor('panelBorder')}));
            style=this.ownerPanelStyles.get(object.owner);
            const base=this.getUIColor('panelFill'),owner=this.ownerColors[object.owner] || this.getUIColor('panelBorder');
            const tint=new pdg.Color(base.red*0.94+owner.red*0.06,base.green*0.94+owner.green*0.06,base.blue*0.94+owner.blue*0.06,base.alpha);
            style.fillColor(tint);
            this.panelStyleColors.set(style,tint);
        }
        this.drawPanel(rect, title, borderColor,style);
    }

    fitPanelToScreen(rect) {
        const screen = this.getScreenSize();
        const maxX = Math.max(10, screen.width - rect.width - 10);
        const maxY = Math.max(10, screen.height - rect.height - 10);
        return {
            x: this.clamp(rect.x, 10, maxX),
            y: this.clamp(rect.y, 10, maxY),
            width: rect.width,
            height: rect.height
        };
    }

    getObjectScreenPosition(object) {
        let x = this.toScreenX(object.x);
        let y = this.toScreenY(object.y);
        const objectType = this.game.getObjectType(object);

        if (objectType === Common.ObjectType.SHIP && object.star) {
            x += this.scaledStarRadius * 1.25;
            y -= this.scaledStarRadius * 0.75;
        } else if (objectType === Common.ObjectType.FLEET) {
            const fleetAtStar = this.game.stars.find(star =>
                Math.abs(star.x - object.x) < 5 && Math.abs(star.y - object.y) < 5
            );
            if (fleetAtStar) {
                x += this.scaledStarRadius * 1.25;
                y -= this.scaledStarRadius * 0.75;
            }
        }

        return { x, y };
    }

    getAnchoredPanelRect(object, width, height) {
        const position = this.getObjectScreenPosition(object);
        const preferredGap = 44;
        let x = position.x - width - preferredGap;

        if (x < 10) {
            x = position.x + preferredGap;
        }

        const y = position.y - (height / 2);
        return this.fitPanelToScreen({ x, y, width, height });
    }

    formatPopulation(star) {
        return Math.floor((star.population || 0) * 1000.0).toString();
    }

    trimText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return `${text.substring(0, maxLength - 1)}…`;
    }

    drawBar(x, y, width, height, ratio, color) {
        this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), width, height), this.styles.barTrack);

        const fillWidth = Math.max(0, Math.min(width, Math.round(width * ratio)));
        if (fillWidth > 0) {
            this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), fillWidth, height), this.getFillAttributes(color));
        }

        this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), width, height), this.styles.barFrame);
    }

    snapRectToPixels(rect) {
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    }

    drawUIIcon(name,x,y,size=14) {
        const paths={menu:[[-6,-4,6,-4],[-6,0,6,0],[-6,4,6,4]],
            home:[[-7,0,0,-6],[0,-6,7,0],[-5,-1,-5,6],[-5,6,5,6],[5,6,5,-1],[-1,6,-1,2],[-1,2,2,2],[2,2,2,6]],
            fit:[[-6,-2,-6,-6],[-6,-6,-2,-6],[2,-6,6,-6],[6,-6,6,-2],[-6,2,-6,6],[-6,6,-2,6],[2,6,6,6],[6,6,6,2]]};
        const attrs=this.iconAttributes;attrs.lineThickness(1.2);
        if(name==='lock' || name==='unlock') {
            const scale=size/14,line=(a,b,c,d)=>this.port.drawLine(new pdg.Point(x+a*scale,y+b*scale),new pdg.Point(x+c*scale,y+d*scale),attrs);
            for(const points of [[-4,-1,4,-1],[4,-1,4,6],[4,6,-4,6],[-4,6,-4,-1],[0,1,0,3]])line(...points);
            // A closed/open shackle shows the current allocation state.
            const shift=name==='unlock'?3:0;
            for(const points of [[-3+shift,-1,-3+shift,-4],[-3+shift,-4,-1+shift,-6],[-1+shift,-6,1+shift,-6],[1+shift,-6,3+shift,-4]])line(...points);
            if(name==='lock')line(3,-4,3,-1);
        } else if(name==='gear') {
            this.port.drawCircle(new pdg.Point(x,y),size*0.25,attrs);
            for(let i=0;i<8;i++){const a=i*Math.PI/4;this.port.drawLine(new pdg.Point(x+Math.cos(a)*size*.33,y+Math.sin(a)*size*.33),new pdg.Point(x+Math.cos(a)*size*.46,y+Math.sin(a)*size*.46),attrs);}
        } else for(const [a,b,c,d] of paths[name] || [])this.port.drawLine(new pdg.Point(x+a*size/14,y+b*size/14),new pdg.Point(x+c*size/14,y+d*size/14),attrs);
    }

    drawUIButton(rect, label, hotkey = null, options = {}) {
        const drawRect = this.snapRectToPixels(rect);
        const active = !!options.active;
        const hovered = this.isHovered(drawRect);
        let fillColorName = active ? 'buttonFillActive' : 'buttonFill';
        if (hovered) {
            fillColorName = active ? 'buttonFillActiveHover' : 'buttonFillHover';
        }
        const style=this.styles[fillColorName],color=this.getUIColor(fillColorName);
        style.fillGradient(new pdg.Point(drawRect.x,drawRect.y),new pdg.Color(color.red+0.016,color.green+0.016,color.blue+0.016,color.alpha),new pdg.Point(drawRect.x,drawRect.y+drawRect.height),color);
        style.lineStyle(pdg.lineStyle_Solid).lineThickness(0.6);
        this.drawRoundedRect(drawRect, options.radius || 10, style);
        if(options.icon) {
            this.drawUIIcon(options.icon,drawRect.x+(options.iconOnly?drawRect.width/2:18),drawRect.y+drawRect.height/2);
            if(options.iconOnly) {
                if(hotkey)this.drawTextLine(hotkey,drawRect.x+drawRect.width-12,drawRect.y+drawRect.height/2+3,'labelgray',9,pdg.textStyle_RightJustified);
                if(hovered)this.iconHint={rect:drawRect,inWindow:!!this.drawingActiveWindow,label:hotkey?`${label} <${hotkey}>`:label};
                return;
            }
        }

        const buttonText = hotkey ? `${label} <${hotkey}>` : label;
        const size = options.size || 11;
        this.drawTextLine(
            buttonText,
            Math.round(drawRect.x + drawRect.width / 2),
            Math.round(drawRect.y + drawRect.height / 2 + 4),
            hovered ? 'hovergray' : 'lightgray',
            size,
            pdg.textStyle_Centered
        );
    }

    containsPoint(rect, x, y) {
        return rect &&
            x >= rect.x &&
            y >= rect.y &&
            x <= rect.x + rect.width &&
            y <= rect.y + rect.height;
    }

    getMapButtonDefinitions() {
        return [
            { key: 'M', icon:'menu', label: this.STR.menu, window: 'menu', action: { type: 'toggleWindow', window: 'menu' } },
            { key: 'E', label: this.STR.events, window: 'events', action: { type: 'toggleWindow', window: 'events' } },
            { key: 'V', label: this.STR.compare, window: 'comparison', action: { type: 'toggleWindow', window: 'comparison' } },
            { key: 'L', label: this.STR.fleets, window: 'fleets', action: { type: 'toggleWindow', window: 'fleets' } },
            { key: 'U', label: this.STR.rendezvous, action: { type: 'beginRendezvousPlacement' } },
            { key: 'Tab', label: I18n.getString(743,'Next item')+` (${this.game.attention.pending().length})`, action: { type: 'nextAttention' } },
            { key: 'Enter', label: this.STR.endTurn, action: { type: 'endTurn' } },
            { key: 'H', icon:'home', label: this.STR.home, action: { type: 'selectHomeStar' } },
            { key: 'F', icon:'fit', label: this.STR.fit, action: { type: 'zoomToFit' } }
        ];
    }

    getMapButtonRegions() {
        const screen = this.getScreenSize();
        const buttons = this.getMapButtonDefinitions();

        const cols = 2;
        const buttonWidth = 98;
        const buttonHeight = 30;
        const gap = 8;
        const rows = Math.ceil(buttons.length / cols);
        const startX = Math.round(screen.width - (cols * buttonWidth) - ((cols - 1) * gap) - 16);
        const startY = Math.round(screen.height - (rows * buttonHeight) - ((rows - 1) * gap) - 16);

        return buttons.map((button, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const rect = {
                x: startX + col * (buttonWidth + gap),
                y: startY + row * (buttonHeight + gap),
                width: i===buttons.length-1 && buttons.length%cols===1 ? buttonWidth*cols+gap : buttonWidth,
                height: buttonHeight
            };
            return { ...button, rect };
        });
    }

    drawMapButtons() {
        const buttons = this.getMapButtonRegions();
        for (const button of buttons) {
            this.drawUIButton(button.rect, button.label, button.key, {icon:button.icon,iconOnly:!!button.icon, active: button.action.type==='nextAttention' ? this.game.attention.pending().length>0 : button.window && this.game.uiWindow === button.window });
        }
    }

    getContextActions(object) {
        const objectType = this.game.getObjectType(object);
        const actions = [];

        if (objectType === Common.ObjectType.STAR && this.game.canHumanControl(object)) {
            actions.push({ key: 'N', label: this.STR.rename, action: { type: 'beginRename' } });
            if (object.currentShip) actions.push({ key: 'X', label: I18n.getString(678, 'Pause build'), action: { type: 'pauseBuild' } });
            actions.push(
                { key: 'S', label: this.STR.scoutName, action: { type: 'buildShip', shipType: 'scout' } },
                { key: 'D', label: this.STR.defenseName, action: { type: 'buildShip', shipType: 'defense' } },
                { key: 'B', label: this.STR.battleshipName, action: { type: 'buildShip', shipType: 'battleship' } },
                { key: 'c', label: this.STR.colonyName, action: { type: 'buildShip', shipType: 'colony' } },
                { key: 'U', label: this.STR.rendezvous, action: { type: 'createRendezvous' } }
            );
        } else if (objectType === Common.ObjectType.SHIP || objectType === Common.ObjectType.FLEET) {
            if (this.game.canHumanControl(object)) {
                actions.push({ key: 'O', label: this.STR.orders, action: { type: 'beginOrders' } });
                if (object.destination) {
                    actions.push({ key: 'X', label: this.STR.clear, action: { type: 'clearOrders' } });
                }
                if(this.game.canToggleScrap(object))actions.push({key:null,label:I18n.getString(object.isToBeScrapped()?755:754,object.isToBeScrapped()?'Cancel scrap':'Scrap'),action:{type:'toggleScrap'}});
                if(this.game.canTogglePatrol(object))actions.push({ key: 'P', label: this.STR.patrol, action: { type: 'togglePatrol' } });
                if (objectType === Common.ObjectType.FLEET) {
                    actions.push(
                        { key: 'N', label: this.STR.rename, action: { type: 'beginRename' } },
                        { key: 'L', label: this.STR.fleets, action: { type: 'toggleFleetWindow' } }
                    );
                } else {
                    actions.push({ key: 'N', label: this.STR.rename, action: { type: 'beginRename' } },
                        { key: 'U', label: this.STR.rendezvous, action: { type: 'createRendezvous' } });
                }
            }
            if (this.game.canViewCourse(object)) actions.push({key:'G',label:I18n.getString(726,'Course'),action:{type:'showCourse'}});
            actions.push(
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } },
                { key: 'V', label: this.STR.compare, action: { type: 'toggleWindow', window: 'comparison' } }
            );
        } else if (objectType === Common.ObjectType.RENDEZVOUS) {
            if (this.game.canHumanControl(object)) {
                actions.push(
                    { key: 'N', label: this.STR.rename, action: { type: 'beginRename' } },
                    { key: 'M', label: this.STR.move, action: { type: 'beginRendezvousPlacement', rendezvous: object } },
                    { key: 'X', label: this.STR.delete, action: { type: 'deleteRendezvous', rendezvous: object } },
                    { key: 'L', label: this.STR.fleets, action: { type: 'toggleFleetWindow' } }
                );
            }
            actions.push(
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } },
                { key: 'V', label: this.STR.compare, action: { type: 'toggleWindow', window: 'comparison' } }
            );
        } else {
            actions.push(
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } },
                { key: 'V', label: this.STR.compare, action: { type: 'toggleWindow', window: 'comparison' } }
            );
        }

        return actions;
    }

    getContextButtonArc(object, panelRect) {
        const actions = this.getContextActions(object);
        const position = this.getObjectScreenPosition(object);
        const panelIsLeftOfObject = (panelRect.x + panelRect.width / 2) < position.x;
        const direction = panelIsLeftOfObject ? 1 : -1;
        const baseDistance = 116;
        const buttonWidth = 96;
        const buttonHeight = 28;
        const verticalSpacing = 36;
        const curveDepth = 3;
        const middle = (actions.length - 1) / 2;

        return actions.map((action, index) => {
            const offsetIndex = index - middle;
            const centerX = Math.round(position.x + direction * (baseDistance - Math.abs(offsetIndex) * curveDepth));
            const centerY = Math.round(position.y + offsetIndex * verticalSpacing);
            const rect = this.snapRectToPixels({
                x: centerX - buttonWidth / 2,
                y: centerY - buttonHeight / 2,
                width: buttonWidth,
                height: buttonHeight
            });
            return {
                ...action,
                action: { ...action.action, object },
                side: direction > 0 ? 'right' : 'left',
                centerX,
                centerY,
                rect
            };
        });
    }

    getObjectSelectionRadius(object) {
        const objectType = this.game.getObjectType(object);
        if (objectType === Common.ObjectType.STAR) {
            return (this.scaledStarRadius || Common.StarRadius) + 6;
        }
        if (objectType === Common.ObjectType.SHIP) {
            return Common.ShipRadius + 6;
        }
        if (objectType === Common.ObjectType.FLEET) {
            const fleetSize = object.getSize ? object.getSize() : 1;
            return ((this.scaledShipRadius || Common.ShipRadius) * 1.5) + (fleetSize * 0.5) + 8;
        }
        if (objectType === Common.ObjectType.RENDEZVOUS) {
            return Math.max(9, (this.scaledShipRadius || Common.ShipRadius) + 6);
        }
        return 12;
    }

    getConnectorStartPoint(object, targetX, targetY) {
        const position = this.getObjectScreenPosition(object);
        const dx = targetX - position.x;
        const dy = targetY - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const stopRadius = this.getObjectSelectionRadius(object) + 5;
        return {
            x: position.x + (dx / distance) * stopRadius,
            y: position.y + (dy / distance) * stopRadius
        };
    }

    getButtonConnectorPoint(object, button) {
        const position = this.getObjectScreenPosition(object);
        const buttonIsRightOfObject = button.centerX >= position.x;
        return {
            x: buttonIsRightOfObject ? button.rect.x : button.rect.x + button.rect.width,
            y: button.rect.y + button.rect.height / 2
        };
    }

    drawContextButtonArc(object, panelRect) {
        const buttons = this.getContextButtonArc(object, panelRect);
        for (const button of buttons) {
            const end = this.getButtonConnectorPoint(object, button);
            const start = this.getConnectorStartPoint(object, end.x, end.y);
            this.port.drawLine(new pdg.Point(start.x, start.y), new pdg.Point(end.x, end.y), this.styles.connector);
        }
        for (const button of buttons) {
            this.drawUIButton(button.rect, button.label, button.key, { size: 10, radius: 14,
                active: button.action.type==='toggleScrap'?object.isToBeScrapped():
                    button.action.type==='togglePatrol'?object.isOnPatrol():
                    button.action.type === 'buildShip' && !!object.currentShip &&
                    object.currentShip.type === button.action.shipType });
        }
    }

    getFleetDetailsLayout(fleet) {
        const visibleShips = (fleet.ships || []).slice(0, 6);
        const transferTargets = this.game.getFleetTransferTargets ? this.game.getFleetTransferTargets(fleet) : [];
        const shipTypes = {};
        for (const ship of fleet.ships || []) {
            shipTypes[ship.type] = (shipTypes[ship.type] || 0) + 1;
        }
        const compositionRows = Object.entries(shipTypes);
        const memberRowHeight = 22;
        const extraMemberHeight = visibleShips.length > 0 ? 16 + (visibleShips.length * memberRowHeight) : 0;
        const transferHeight = transferTargets.length > 0 ? 8 : 0;
        const destinationHeight = fleet.destination ? 18 : 0;
        const patrolHeight=(fleet.isOnPatrol() || fleet.isToBeScrapped()) && this.game.canViewCourse(fleet)?18:0;
        const height = 170 + (compositionRows.length * 16) + extraMemberHeight + transferHeight + destinationHeight + patrolHeight;
        return {
            rect: this.getAnchoredPanelRect(fleet, 310, height),
            visibleShips,
            transferTargets,
            compositionRows,
            memberRowHeight,patrolHeight,
            memberStartOffset: 18 + 18 + 18 + 22 + (compositionRows.length * 16) + destinationHeight + patrolHeight + 30
        };
    }

    getRendezvousDetailsLayout(rendezvous) {
        const fleet = rendezvous.getFleet ? rendezvous.getFleet() : rendezvous.fleet;
        return {
            rect: this.getAnchoredPanelRect(rendezvous, 280, fleet ? 150 : 132),
            fleet
        };
    }

    getSelectedObjectPanelRect(object) {
        if(this.game.pendingCourseEdit)return null;
        const objectType = this.game.getObjectType(object);
        if (objectType === Common.ObjectType.STAR) {
            return this.getStarDetailsLayout(object).rect;
        }
        if (objectType === Common.ObjectType.SHIP) {
            return this.getShipDetailsRect(object);
        }
        if (objectType === Common.ObjectType.FLEET) {
            return this.getFleetDetailsLayout(object).rect;
        }
        if (objectType === Common.ObjectType.RENDEZVOUS) {
            return this.getRendezvousDetailsLayout(object).rect;
        }
        return null;
    }

    getContextButtonRegions(object = this.game.selectedObject) {
        if (!object) {
            return [];
        }
        const panelRect = this.getSelectedObjectPanelRect(object);
        return panelRect ? this.getContextButtonArc(object, panelRect) : [];
    }

    getEndTurnConfirmRect() {
        const screen=this.getScreenSize();
        return this.fitPanelToScreen({x:(screen.width-440)/2,y:120,width:440,height:160});
    }
    getEndTurnConfirmActions() {
        const r=this.getEndTurnConfirmRect();
        return [{rect:{x:r.x+14,y:r.y+88,width:r.width/2-20,height:30},label:I18n.getString(748,'Review'),action:{type:'reviewAttention'}},
            {rect:{x:r.x+r.width/2+6,y:r.y+88,width:r.width/2-20,height:30},label:I18n.getString(747,'End anyway'),key:'Enter',action:{type:'confirmEndTurn'}}];
    }
    drawEndTurnConfirm() {
        const r=this.getEndTurnConfirmRect();this.drawWindowPanel(r,this.STR.endTurn);
        this.drawTextLine(I18n.formatPluralString(746,'{0} item still needs attention.|{0} items still need attention.',this.game.attention.pending().length+(this.game.overlay?1:0)+(this.game.overlayQueue||[]).length),r.x+14,r.y+62,'lightgray',12);
        for(const button of this.getEndTurnConfirmActions())this.drawUIButton(button.rect,button.label,button.key,{size:11});
        this.drawTextLine(this.STR.escClose,r.x+14,r.y+142,'gray',10);
    }

    getCommandWindowRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({ x: screen.width - 320, y: 54, width: 300, height: 260 });
    }

    getProductionWindowRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({ x: screen.width - 440, y: 84, width: 420, height: 184 });
    }

    getEventWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(480,screen.width-40);
        return this.fitPanelToScreen({x:screen.width-width-20,y:64,width,height:Math.min(500,screen.height-80)});
    }

    wrapEventMessage(message,width,size=11) {
        const lines=[];
        for(const paragraph of String(message).split('\n')) {
            let chars=Array.from(paragraph);
            if(!chars.length){lines.push('');continue;}
            while(chars.length) {
                let end=0;
                while(end<chars.length && this.port.getTextWidth(chars.slice(0,end+1).join(''),size)<=width)end++;
                end=Math.max(1,end);
                if(end<chars.length) {
                    const space=chars.slice(0,end).lastIndexOf(' ');
                    if(space>0)end=space;
                }
                lines.push(chars.slice(0,end).join(''));
                chars=chars.slice(end);while(chars[0]===' ')chars.shift();
            }
        }
        return lines;
    }

    getEventWindowLayout() {
        const rect=this.getEventWindowRect(),rows=this.game.getEventRows();
        const pageSize=Math.max(1,Math.min(6,Math.floor((rect.height-260)/32)));
        const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.min(this.game.eventPage,pages-1);
        const selected=rows.find(event=>event.id===this.game.eventSelection);
        const detailLines=selected?this.wrapEventMessage(selected.message,rect.width-28):[];
        const detailStart=48+pageSize*32+12;
        const detailSize=Math.max(1,Math.floor((rect.height-82-detailStart-44)/15)+1);
        const detailPages=Math.max(1,Math.ceil(detailLines.length/detailSize));
        const detailPage=Math.min(this.game.eventDetailPage,detailPages-1);
        return {rect,rows,pages,page,pageSize,visibleRows:rows.slice(page*pageSize,(page+1)*pageSize),selected,
            detailStart,detailLines,detailPages,detailPage,visibleLines:detailLines.slice(detailPage*detailSize,(detailPage+1)*detailSize)};
    }

    getEventActionRegions() {
        if(this.game.uiWindow!=='events')return [];
        const l=this.getEventWindowLayout(),r=l.rect;
        const controls=l.visibleRows.map((event,index)=>({rect:{x:r.x+14,y:r.y+48+index*32,width:r.width-28,height:30},
            action:{type:'selectEvent',event}}));
        if(l.page>0)controls.push({rect:{x:r.x+14,y:r.y+r.height-36,width:90,height:24},label:I18n.getString(690,'Previous'),action:{type:'eventPage',page:l.page-1}});
        if(l.page<l.pages-1)controls.push({rect:{x:r.x+110,y:r.y+r.height-36,width:90,height:24},label:I18n.getString(691,'Next'),action:{type:'eventPage',page:l.page+1}});
        if(l.selected && this.game.getEventFocus(l.selected))controls.push({rect:{x:r.x+r.width-174,y:r.y+r.height-36,width:160,height:24},
            label:I18n.getString(749,'Go to'),key:'Enter',action:{type:'goToEvent',event:l.selected}});
        if(l.detailPage>0)controls.push({rect:{x:r.x+14,y:r.y+r.height-70,width:90,height:24},label:I18n.getString(690,'Previous'),action:{type:'eventDetailPage',page:l.detailPage-1}});
        if(l.detailPage<l.detailPages-1)controls.push({rect:{x:r.x+110,y:r.y+r.height-70,width:90,height:24},label:I18n.getString(691,'Next'),action:{type:'eventDetailPage',page:l.detailPage+1}});
        return controls;
    }

    getComparisonWindowRect() {
        const rows = this.game.getPlayerComparisonRows();
        const screen = this.getScreenSize();
        const width = Math.min(650, screen.width - 40);
        return this.fitPanelToScreen({
            x: (screen.width - width) / 2,
            y: 82,
            width,
            height: 120 + rows.length * 22 + (this.game.selectedObject ? 44 : 0)
        });
    }

    getFleetWindowRect() {
        const rows = this.game.getFleetListRows ? this.game.getFleetListRows() : [];
        const screen = this.getScreenSize();
        const width = Math.min(640, screen.width - 40);
        return this.fitPanelToScreen({
            x: (screen.width - width) / 2,
            y: 84,
            width,
            height: Math.max(150, 78 + Math.max(rows.length, 1) * 26)
        });
    }

    getCommandActionRegions() {
        if (this.game.uiWindow!=='menu') return [];
        const rect = this.getCommandWindowRect();
        const settings={rect:{x:rect.x+14,y:rect.y+182,width:rect.width-28,height:28},
            icon:'gear',label:I18n.getString(759,'Settings'),action:{type:'toggleWindow',window:'settings'}};
        if(!this.game.getCurrentHumanPlayer())return [settings];
        return [{rect:{x:rect.x+14,y:rect.y+80,width:rect.width-28,height:28},
            icon:'gear',label:I18n.getString(693,'New colony defaults'),action:{type:'beginColonyDefaults'}},
            {rect:{x:rect.x+14,y:rect.y+114,width:rect.width-28,height:28},
            label:I18n.getString(708,'Your Star Systems'),action:{type:'showSystemComparison'}},
            {rect:{x:rect.x+14,y:rect.y+148,width:rect.width-28,height:28},
            label:I18n.getString(743,'Next item')+` (${this.game.attention.pending().length})`,key:'Tab',active:this.game.attention.pending().length>0,action:{type:'nextAttention'}},
            settings];
    }

    getSettingsWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(320,screen.width-40);
        return this.fitPanelToScreen({x:(screen.width-width)/2,y:84,width,height:322});
    }

    getSettingsActionRegions() {
        if(this.game.uiWindow!=='settings')return [];
        const rect=this.getSettingsWindowRect();
        return LanguageSettings.languages.map((language,index)=>({
            rect:{x:rect.x+14,y:rect.y+76+index*32,width:rect.width-28,height:28},
            label:language.name,active:LanguageSettings.current()===language.code,
            action:{type:'setLanguage',language:language.code}
        }));
    }

    drawSettingsWindow() {
        const rect=this.getSettingsWindowRect();
        this.drawWindowPanel(rect,I18n.getString(759,'Settings'));
        this.drawTextLine(I18n.getString(760,'Language'),rect.x+14,rect.y+57,'lightgray',12);
        for(const region of this.getSettingsActionRegions())this.drawUIButton(region.rect,region.label,null,{active:region.active});
        this.drawTextLine(this.STR.escClose,rect.x+14,rect.y+rect.height-16,'gray',10);
    }

    getColonyDefaultsWindowRect() {
        const screen = this.getScreenSize();
        const width = Math.min(520,screen.width-40);
        return this.fitPanelToScreen({x:(screen.width-width)/2,y:84,width,height:310});
    }

    getColonyDefaultSliderRegions() {
        const rect = this.getColonyDefaultsWindowRect();
        return ['defaultGrowth','defaultShips','defaultTech'].map((key,index) => ({key,
            label:[this.STR.growth,this.STR.ships.replace(/:$/, ''),this.STR.research][index],
            color:['green','aqua','purple'][index],
            rect:{x:rect.x+130,y:rect.y+66+index*28,width:rect.width-290,height:24}}));
    }

    getColonyDefaultActionRegions() {
        if (this.game.uiWindow!=='colonyDefaults' || !this.game.colonyDefaultsDraft) return [];
        const rect = this.getColonyDefaultsWindowRect(), draft = this.game.colonyDefaultsDraft;
        const regions = [];
        this.getColonyDefaultSliderRegions().forEach(slider => {
            [-10,10].forEach((delta,index) => regions.push({
                rect:{x:rect.x+rect.width-90+index*38,y:slider.rect.y,width:32,height:24},label:delta>0?'+':'−',
                action:{type:'setColonyDefaultAllocation',key:slider.key,value:draft[slider.key]+delta}}));
        });
        ['defense','scout','colony','battleship'].forEach((type,index) => regions.push({
            rect:{x:rect.x+14+(index%2)*(rect.width/2-7),y:rect.y+168+Math.floor(index/2)*32,width:rect.width/2-21,height:26},
            label:this.getShipTypeName(type),active:draft.defaultBuildType===index+1,
            action:{type:'setColonyDefaultHull',hull:index+1}}));
        regions.push({rect:{x:rect.x+14,y:rect.y+266,width:rect.width/2-21,height:28},
            label:I18n.getString(682,'Save'),action:{type:'saveColonyDefaults'}},
            {rect:{x:rect.x+rect.width/2+7,y:rect.y+266,width:rect.width/2-21,height:28},
            label:I18n.getString(683,'Cancel'),action:{type:'cancelColonyDefaults'}});
        return regions;
    }

    getCourseWindowLayout() {
        const screen=this.getScreenSize(),width=Math.min(620,screen.width-40);
        const rows=this.game.getCourseRows(),pageSize=Math.max(1,Math.min(9,Math.floor((screen.height-270)/26)));
        const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.min(this.game.coursePage,pages-1);
        const visibleRows=rows.slice(page*pageSize,(page+1)*pageSize);
        const rect=this.fitPanelToScreen({x:(screen.width-width)/2,y:84,width,height:194+Math.max(1,visibleRows.length)*26});
        return {rect,rows,page,pages,visibleRows,pageSize};
    }

    getCourseActionRegions() {
        if(this.game.uiWindow!=='course')return [];
        const layout=this.getCourseWindowLayout(),r=layout.rect,object=this.game.courseWindowObject;
        const regions=layout.visibleRows.map((row,index)=>({rect:{x:r.x+14,y:r.y+66+index*26,width:r.width-28,height:24},
            action:{type:'selectWaypoint',index:row.index}}));
        const selection=this.game.courseSelection;
        if(this.game.canEditCourse(object)) {
            const definitions=[['addWaypoint',729,'Add','A'],['editWaypoint',730,'Edit','E'],
                ['deleteWaypoint',731,'Delete','D'],['clearOrders',732,'Clear course','X'],
                ['togglePatrol',577,'Patrol','P']];
            definitions.forEach(([type,id,fallback,key],index)=> {
                if(['editWaypoint','deleteWaypoint'].includes(type) && !object.course.waypoints[selection])return;
                if(type==='clearOrders' && !object.course.waypoints.length)return;
                if(type==='togglePatrol' && !this.game.canTogglePatrol(object))return;
                const width=(r.width-28)/5;
                regions.push({rect:{x:r.x+14+index*width,y:r.y+r.height-96,width:width-5,height:26},
                    label:I18n.getString(id,fallback),key,active:type==='togglePatrol' && object.isOnPatrol(),action:{type,object}});
            });
            const modeWidth=(r.width-150)/4,modeRect=index=>({
                x:r.x+14+index*(modeWidth+8),y:r.y+r.height-64,width:modeWidth,height:24});
            regions.push({rect:modeRect(0),label:I18n.getString(733,'Loop'),
                key:'L',active:object.course.loop,action:{type:'toggleCourseLoop'}});
            if(object.course.waypoints.length || object.course.hasMemory)regions.push({
                rect:modeRect(1),label:I18n.getString(740,'Memory'),
                key:'M',active:object.course.hasMemory,action:{type:'swapCourseMemory'}});
            if(this.game.canToggleCourseHunt(object))regions.push({
                rect:modeRect(2),label:I18n.getString(741,'Hunt'),
                key:'H',active:object.course.hunt,action:{type:'toggleCourseHunt'}});
            if(this.game.canToggleCallIn(object))regions.push({rect:modeRect(3),label:I18n.getString(742,'Call in'),
                key:'C',active:!!object.userCallIn,action:{type:'toggleCallIn',object}});
        }
        if(layout.page>0)regions.push({rect:{x:r.x+14,y:r.y+r.height-32,width:130,height:22},
            label:I18n.getString(690,'Previous'),action:{type:'coursePage',page:layout.page-1}});
        if(layout.page<layout.pages-1)regions.push({rect:{x:r.x+r.width-144,y:r.y+r.height-32,width:130,height:22},
            label:I18n.getString(691,'Next'),action:{type:'coursePage',page:layout.page+1}});
        return regions;
    }

    getSystemComparisonLayout() {
        const screen = this.getScreenSize(), width = Math.min(760, screen.width - 40);
        const pageSize = Math.max(1, Math.min(12, Math.floor((screen.height - 240) / 26)));
        const rows = this.game.getSystemComparisonRows(), pages = Math.max(1, Math.ceil(rows.length / pageSize));
        const page = Math.min(this.game.systemComparisonPage, pages - 1);
        const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);
        const rect = this.fitPanelToScreen({x:(screen.width-width)/2,y:84,width,
            height:150 + Math.max(1,visibleRows.length) * 26});
        let offset = 14;
        const columns = [
            ['name',709,'Name',.21], ['tech',710,'Tech',.07], ['population',711,'Population|×1000',.12],
            ['production',712,'Production',.10], ['buildName',713,'Building',.16], ['completion',714,'Complete|%',.07],
            ['totalDefense',715,'Defense|Total',.10], ['satelliteDefense',716,'Defense|Satellites',.085],
            ['shipDefense',717,'Defense|Ships',.085]
        ].map(([key,id,fallback,weight]) => {
            const column = {key,label:I18n.getString(id,fallback),offset,width:(width-28)*weight};
            offset += column.width;
            return column;
        });
        return {rect,page,pages,pageSize,visibleRows,columns};
    }

    getSystemComparisonActionRegions() {
        if (this.game.uiWindow !== 'systemComparison') return [];
        const layout = this.getSystemComparisonLayout(), rect = layout.rect;
        const regions = layout.columns.map(column => ({
            rect:{x:rect.x+column.offset,y:rect.y+38,width:column.width,height:32},
            action:{type:'sortSystemComparison',key:column.key}}));
        layout.visibleRows.forEach((row,index) => regions.push({
            rect:{x:rect.x+14,y:rect.y+76+index*26,width:rect.width-28,height:24},
            action:{type:'systemComparisonRow',star:row.star}}));
        if (layout.page > 0) regions.push({rect:{x:rect.x+14,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(690,'Previous'),action:{type:'systemComparisonPage',page:layout.page-1}});
        if (layout.page < layout.pages-1) regions.push({rect:{x:rect.x+rect.width-164,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(691,'Next'),action:{type:'systemComparisonPage',page:layout.page+1}});
        return regions;
    }

    getSystemShipWindowLayout() {
        const screen = this.getScreenSize();
        const width = Math.min(720, screen.width - 40);
        const pageSize = Math.max(1, Math.min(12, Math.floor((screen.height - 230) / 26)));
        const rows = this.game.getSystemShipRows();
        const pages = Math.max(1, Math.ceil(rows.length / pageSize));
        const page = Math.min(this.game.systemShipPage, pages - 1);
        const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);
        const rect = this.fitPanelToScreen({x: (screen.width - width)/2, y: 84, width,
            height: 142 + Math.max(1,visibleRows.length) * 26});
        const tableWidth=width-112;
        const columns = [
            { key: 'name', label: this.STR.name.replace(/:$/, ''), offset: 14, width: tableWidth*.40-14 },
            { key: 'tech', label: this.STR.tech.replace(/:$/, ''), offset: tableWidth*.40, width: tableWidth*.14 },
            { key: 'power', label: this.STR.power.replace(/:$/, ''), offset: tableWidth*.54, width: tableWidth*.14 },
            { key: 'damage', label: this.STR.damage.replace(/:$/, ''), offset: tableWidth*.68, width: tableWidth*.16 },
            { key: 'speed', label: this.STR.speed.replace(/:$/, ''), offset: tableWidth*.84, width: tableWidth*.16-14 }
        ];
        return { rect, page, pages, pageSize, visibleRows, columns };
    }

    getSystemShipActionRegions() {
        if (this.game.uiWindow !== 'systemShips') return [];
        const layout = this.getSystemShipWindowLayout(), rect = layout.rect;
        const regions = layout.columns.map(column => ({
            rect: { x: rect.x+column.offset, y: rect.y+38, width: column.width, height: 24 },
            action: { type: 'sortSystemShips', key: column.key } }));
        layout.visibleRows.forEach((row,index) => {
            if(this.game.canToggleScrap(row.object))regions.push({
                rect:{x:rect.x+rect.width-112,y:rect.y+68+index*26,width:98,height:24},
                label:I18n.getString(row.object.isToBeScrapped()?755:754,row.object.isToBeScrapped()?'Cancel scrap':'Scrap'),
                active:row.object.isToBeScrapped(),action:{type:'toggleScrap',object:row.object}});
            regions.push({rect:{x:rect.x+14,y:rect.y+68+index*26,width:rect.width-128,height:24},
                action:{type:'selectObject',object:row.object,center:true,closeWindow:true}});
        });
        if (layout.page > 0) regions.push({rect:{x:rect.x+14,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(690,'Previous'), action:{type:'systemShipPage',page:layout.page-1}});
        if (layout.page < layout.pages-1) regions.push({rect:{x:rect.x+rect.width-164,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(691,'Next'), action:{type:'systemShipPage',page:layout.page+1}});
        return regions;
    }

    getSystemShipButtonRegion() {
        const star = this.game.getSelectedStar();
        if (!this.game.canViewSystemShips(star)) return null;
        const panel = this.getStarDetailsLayout(star).rect;
        return {rect:{x:panel.x+184,y:panel.y+panel.height-(this.game.canHumanControl(star)?88:30),width:164,height:22},
            label:I18n.getString(688,'Ships in system'),action:{type:'showSystemShips',star}};
    }

    getRenameWindowRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({
            x: (screen.width - 340) / 2,
            y: 96,
            width: 340,
            height: 160
        });
    }

    getRendezvousPlacementPromptRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({
            x: (screen.width - 340) / 2,
            y: 76,
            width: 340,
            height: 88
        });
    }

    getActiveWindowRect() {
        switch (this.game.uiWindow) {
            case 'endTurnConfirm':
                return this.getEndTurnConfirmRect();
            case 'menu':
                return this.getCommandWindowRect();
            case 'production':
                return this.getProductionWindowRect();
            case 'events':
                return this.getEventWindowRect();
            case 'comparison':
                return this.getComparisonWindowRect();
            case 'fleets':
                return this.getFleetWindowRect();
            case 'settings':
                return this.getSettingsWindowRect();
            case 'colonyDefaults':
                return this.getColonyDefaultsWindowRect();
            case 'systemShips':
                return this.getSystemShipWindowLayout().rect;
            case 'systemComparison':
                return this.getSystemComparisonLayout().rect;
            case 'course': return this.getCourseWindowLayout().rect;
            case 'rename':
                return this.getRenameWindowRect();
            default:
                return null;
        }
    }

    getProductionWindowSliderRegions() {
        if (this.game.uiWindow !== 'production') {
            return [];
        }

        const star = this.game.getSelectedStar();
        if (!star || !this.game.canHumanControl(star)) {
            return [];
        }

        const rect = this.getProductionWindowRect();
        const x = rect.x + 14;
        const y = rect.y + 74;
        const width = 185;
        return this.game.getStarAllocationEntries(star).map((entry, index) => {
            const sliderY = y + index * 18;
            const rects = this.getAllocationSliderRects(x, sliderY, width);
            return {
                ...entry,
                star,
                rect: rects.control,
                trackRect: rects.track,
                actionType: 'setAllocation'
            };
        });
    }

    getAllocationSliderRegions() {
        const regions = [];
        const selectedStar = this.game.getSelectedStar();
        if (selectedStar) {
            regions.push(...this.getStarAllocationSliderRegions(selectedStar));
        }
        regions.push(...this.getProductionWindowSliderRegions());
        return regions;
    }

    getAllocationEqualizeRegions() {
        const star = this.game.getSelectedStar();
        if (!star || !this.game.canHumanControl(star)) return [];
        const panel = this.getStarDetailsLayout(star).rect;
        const regions = [{ rect: { x: panel.x + 12, y: panel.y + panel.height - 88, width: 170, height: 22 },
            action: { type: 'equalizeAllocations', star } }];
        if (this.game.uiWindow === 'production') {
            const window = this.getProductionWindowRect();
            regions.unshift({ rect: { x: window.x + 14, y: window.y + 128, width: 170, height: 22 },
                action: { type: 'equalizeAllocations', star }, key: 'R' });
        }
        return regions;
    }

    getDefaultDestinationRegions() {
        const star = this.game.getSelectedStar();
        if (!star || !this.game.canHumanControl(star)) return [];
        const panel = this.getStarDetailsLayout(star).rect;
        const regions = [{ rect: { x: panel.x + 12, y: panel.y + panel.height - 30, width: 164, height: 22 },
            label: I18n.getString(685, 'Set destination'), action: { type: 'beginOrders', object: star } }];
        if (star.getDefaultDestination()) regions.push({
            rect: { x: panel.x + 184, y: panel.y + panel.height - 30, width: 164, height: 22 },
            label: I18n.getString(686, 'Clear destination'), action: { type: 'clearDefaultDestination', object: star } });
        return regions;
    }

    getAllocationLockRegions(sliders = this.getAllocationSliderRegions()) {
        return sliders.map(slider => ({
            rect: { x: slider.trackRect.x + slider.trackRect.width + 48, y: slider.rect.y + 1, width: 68, height: 18 },
            action: { type: 'toggleAllocationLock', star: slider.star, allocationKey: slider.key }
        }));
    }

    getDraggableSliderAt(x,y) {
        const action = this.getUIActionAt(x,y);
        if (!action) return null;
        if (action.type==='setColonyDefaultAllocation' && this.game.uiWindow==='colonyDefaults') {
            const slider = this.getColonyDefaultSliderRegions().find(region=>this.containsPoint(region.rect,x,y));
            return slider ? {key:slider.key,trackRect:{...slider.rect},window:this.game.uiWindow,
                draft:this.game.colonyDefaultsDraft} : null;
        }
        if (action.type!=='setAllocation') return null;
        const window = this.getActiveWindowRect();
        const regions = window && this.containsPoint(window,x,y) ? this.getProductionWindowSliderRegions() :
            this.getStarAllocationSliderRegions(action.star);
        const slider = regions.find(region=>this.containsPoint(region.rect,x,y));
        if (!slider || slider.allocation.locked || !this.game.canHumanControl(slider.star)) return null;
        return {star:slider.star,key:slider.key,trackRect:{...slider.trackRect},window:this.game.uiWindow};
    }

    getSliderActionAt(x, y) {
        const slider = this.getAllocationSliderRegions().find(region => this.containsPoint(region.rect, x, y));
        if (!slider) {
            return null;
        }

        const desired = this.clamp(Math.round(((x - slider.trackRect.x) / slider.trackRect.width) * 1000)/10, 0, 100);
        return {
            type: 'setAllocation',
            star: slider.star,
            allocationKey: slider.key,
            desired
        };
    }

    getFleetMemberActionRegions(fleet = this.game.getSelectedFleet ? this.game.getSelectedFleet() : null) {
        if (!fleet || !this.game.canHumanControl(fleet)) {
            return [];
        }

        const layout = this.getFleetDetailsLayout(fleet);
        const rect = layout.rect;
        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect) + layout.memberStartOffset;
        const transferTargets = layout.transferTargets;
        const primaryTransferTarget = transferTargets.length > 0 ? transferTargets[0] : null;
        const regions = [];

        for (const ship of layout.visibleShips) {
            const rowRect = { x, y: y - 14, width: rect.width - 24, height: 20 };
            if (primaryTransferTarget) {
                regions.push({
                    rect: { x: rect.x + rect.width - 136, y: y - 16, width: 58, height: 20 },
                    action: { type: 'transferFleetShip', ship, targetFleet: primaryTransferTarget }
                });
            }
            regions.push({
                rect: { x: rect.x + rect.width - 72, y: y - 16, width: 58, height: 20 },
                action: { type: 'removeFleetShip', fleet, ship }
            });
            regions.push({
                rect: rowRect,
                action: { type: 'selectObject', object: ship }
            });
            y += layout.memberRowHeight;
        }

        return regions;
    }

    getFleetListActionRegions() {
        if (this.game.uiWindow !== 'fleets') {
            return [];
        }

        const rect = this.getFleetWindowRect();
        const rows = this.game.getFleetListRows ? this.game.getFleetListRows() : [];
        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect) + 24;
        return rows.map(row => {
            const region = {
                rect: { x, y: y - 16, width: rect.width - 28, height: 22 },
                action: { type: 'selectObject', object: row.object, center: true }
            };
            y += 26;
            return region;
        });
    }

    getUIPanelRegions() {
        const regions = [];
        if (this.game.selectedObject) {
            const selectedPanel = this.getSelectedObjectPanelRect(this.game.selectedObject);
            if (selectedPanel) {
                regions.push(selectedPanel);
            }
        }

        const activeWindowRect = this.getActiveWindowRect();
        if (activeWindowRect) {
            regions.push(activeWindowRect);
        }

        if (this.game.pendingRendezvousPlacement) {
            regions.push(this.getRendezvousPlacementPromptRect());
        }

        return regions;
    }

    getActiveWindowActionAt(x, y) {
        const window = this.getActiveWindowRect();
        if (!window || !this.containsPoint(window, x, y)) return null;
        let controls = [];
        if (this.game.uiWindow==='endTurnConfirm') controls=this.getEndTurnConfirmActions();
        if (this.game.uiWindow==='events') controls=this.getEventActionRegions();
        if (this.game.uiWindow==='menu') controls=this.getCommandActionRegions();
        if (this.game.uiWindow==='settings') controls=this.getSettingsActionRegions();
        if (this.game.uiWindow==='colonyDefaults') {
            controls=this.getColonyDefaultActionRegions();
            const slider=this.getColonyDefaultSliderRegions().find(region=>this.containsPoint(region.rect,x,y));
            if(slider) return {type:'setColonyDefaultAllocation',key:slider.key,
                value:Math.round(this.clamp((x-slider.rect.x)/slider.rect.width,0,1)*1000)};
        }
        if (this.game.uiWindow === 'course') controls = this.getCourseActionRegions();
        if (this.game.uiWindow === 'systemComparison') controls = this.getSystemComparisonActionRegions();
        if (this.game.uiWindow === 'systemShips') controls = this.getSystemShipActionRegions();
        if (this.game.uiWindow === 'rename') controls = this.getRenameActionRegions();
        if (this.game.uiWindow === 'fleets') controls = this.getFleetListActionRegions();
        if (this.game.uiWindow === 'production') {
            const sliders = this.getProductionWindowSliderRegions();
            controls = this.getAllocationLockRegions(sliders)
                .concat(this.getAllocationEqualizeRegions().filter(region => region.key));
            const slider = sliders.find(region => this.containsPoint(region.rect, x, y));
            if (slider) return { type: 'setAllocation', star: slider.star, allocationKey: slider.key,
                desired: this.clamp(Math.round((x - slider.trackRect.x) / slider.trackRect.width * 1000)/10, 0, 100) };
        }
        const control = controls.find(region => this.containsPoint(region.rect, x, y));
        return control ? control.action : { type: 'consume' };
    }

    getUIActionAt(x, y) {
        if(this.game.pendingCourseEdit) {
            const screen=this.getScreenSize(),hint={x:20,y:78,width:screen.width-40,height:40};
            if(this.containsPoint(hint,x,y) || this.getMapButtonRegions().some(button=>this.containsPoint(button.rect,x,y)))return {type:'consume'};
            return null;
        }
        const windowAction = this.getActiveWindowActionAt(x, y);
        if (windowAction) return windowAction;
        // Rename is modal: map controls cannot change its target mid-edit.
        if (['rename','colonyDefaults','settings','endTurnConfirm'].includes(this.game.uiWindow)) return { type: 'consume' };
        const contextButton = this.getContextButtonRegions().find(button => this.containsPoint(button.rect, x, y));
        if (contextButton) {
            return contextButton.action;
        }

        const systemShips = this.getSystemShipButtonRegion();
        if (systemShips && this.containsPoint(systemShips.rect,x,y)) return systemShips.action;
        const destination = this.getDefaultDestinationRegions().find(region => this.containsPoint(region.rect, x, y));
        if (destination) return destination.action;
        const equalize = this.getAllocationEqualizeRegions().find(region => this.containsPoint(region.rect, x, y));
        if (equalize) return equalize.action;
        const lock = this.getAllocationLockRegions().find(region => this.containsPoint(region.rect, x, y));
        if (lock) return lock.action;

        const sliderAction = this.getSliderActionAt(x, y);
        if (sliderAction) {
            return sliderAction;
        }

        const fleetMemberAction = this.getFleetMemberActionRegions().find(region => this.containsPoint(region.rect, x, y));
        if (fleetMemberAction) {
            return fleetMemberAction.action;
        }

        const fleetListAction = this.getFleetListActionRegions().find(region => this.containsPoint(region.rect, x, y));
        if (fleetListAction) {
            return fleetListAction.action;
        }

        const mapButton = this.getMapButtonRegions().find(button => this.containsPoint(button.rect, x, y));
        if (mapButton) {
            return mapButton.action;
        }

        const panel = this.getUIPanelRegions().find(rect => this.containsPoint(rect, x, y));
        return panel ? { type: 'consume' } : null;
    }

    getAllocationSliderRects(x, y, width) {
        const labelWidth = 64;
        const gap = 8;
        const percentWidth = 36;
        const trackX = x + labelWidth + gap;
        return {
            control: { x, y: y - 14, width: labelWidth + gap + width + gap + percentWidth, height: 22 },
            label: { x, y: y - 14, width: labelWidth, height: 22 },
            track: { x: trackX, y: y - 8, width, height: 8 },
            percent: { x: trackX + width + gap, y: y - 14, width: percentWidth, height: 22 }
        };
    }

    drawAllocationSlider(label, allocation, x, y, width, color, options = {}) {
        const desired = this.game.getAllocationDesired(allocation);
        const current = allocation && allocation.value !== undefined ? allocation.value : desired;
        const rects = this.getAllocationSliderRects(x, y, width);
        const hovered = options.interactive !== false && this.isHovered(rects.control);
        const labelColor = hovered ? 'hovergray' : 'labelgray';
        const valueColor = hovered ? 'hovergray' : 'lightgray';
        this.drawRightTextLine(`${label}:`, rects.track.x - 8, y, labelColor, 11);
        this.drawBar(rects.track.x, rects.track.y, rects.track.width, rects.track.height, desired / 100.0, color);
        this.drawTextLine(options.unknown ? '?' : `${I18n.formatPercentage(desired)}%`, rects.percent.x, y, valueColor, 11);

        if (options.interactive !== false) this.drawUIButton({ x: rects.track.x + width + 48, y: y - 13, width: 68, height: 18 },
            allocation.locked ? I18n.getString(675, 'Unlock') : I18n.getString(674, 'Lock'), null,
            { size: 9, radius: 6, icon: allocation.locked ? 'lock' : 'unlock', iconOnly: true, active: allocation.locked });

        const currentMarkerX = rects.track.x + this.clamp(Math.round(width * current / 100.0), 0, width);
        this.port.drawLine(new pdg.Point(currentMarkerX, y - 11), new pdg.Point(currentMarkerX, y + 1), this.getLineAttributes(valueColor));
    }

    drawStarAllocationSummary(star, x, y, width = 150) {
        this.drawAllocationSlider(this.STR.growth, star.growth, x, y, width, 'green');
        this.drawAllocationSlider(this.STR.ships.replace(/:$/, ''), star.shipBuilding, x, y + 18, width, 'cyan');
        this.drawAllocationSlider(this.STR.research, star.research, x, y + 36, width, 'purple');
        return y + 54;
    }

    formatSpaceCoordinates(point) {
        return I18n.formatString(656,'({0}, {1})',I18n.formatDecimal(point.x/65536,2),I18n.formatDecimal(point.y/65536,2));
    }

    getSpacePointDescription(point) {
        const type = this.game.getObjectType(point);
        if (type === Common.ObjectType.STAR) return this.getStarDisplayName(point);
        return type ? this.game.getObjectDisplayName(point) : this.formatSpaceCoordinates(point);
    }

    getStarDisplayName(star) {
        const player = this.game.getCurrentHumanPlayer();
        const visible = this.game.config.omniscient || star.isAllyOf(player) ||
            star.getVisibilityTo(player) >= Common.VisibilityLevel.CLASS;
        return visible ? star.name : I18n.formatString(725,'S-{0}',star.id);
    }

    isStarOwnerKnown(star) {
        const player=this.game.getCurrentHumanPlayer();
        return this.game.config.omniscient || this.game.canHumanControl(star) ||
            star.isAllyOf(player) || star.getVisibilityTo(player)>Common.VisibilityLevel.NONE;
    }

    getStarDiagnostics(star) {
        const player = this.game.getCurrentHumanPlayer();
        const allied = this.game.config.omniscient || star.isAllyOf(player);
        const visibility = star.getVisibilityTo(player);
        const techVisible = allied || visibility >= Common.VisibilityLevel.TECH;
        const classVisible = allied || visibility >= Common.VisibilityLevel.CLASS;
        const detailsVisible = allied || visibility >= Common.VisibilityLevel.DETAILS;
        const defense = detailsVisible ? star.getDefenseBreakdown() : null;
        const build = star.currentShip;
        const names = I18n.getString(800, 'Traveller').split('|');
        const building = !build ? this.STR.none : build.type === 'battleship'
            ? names[Math.min(names.length-1, Math.max(0,Math.floor(star.techLevel/5)))]
            : I18n.getShipTypeName(build.type, {capitalized:true});
        const destination = allied ? star.getDefaultDestination() : null;
        return {
            title: this.getStarDisplayName(star),
            owner: this.isStarOwnerKnown(star) ? String(star.owner || this.STR.unclaimed) : '?',
            population: classVisible ? I18n.formatInteger((star.population || 0)*1000) : '?',
            tech: techVisible ? String(Math.trunc(star.techLevel)) : '?',
            position: this.formatSpaceCoordinates(star),
            building: detailsVisible ? building : '?',
            completion: allied && build ? Math.trunc(build.progress) : null,
            eta: allied ? this.formatConstructionETA(star) : null,
            totalDefense: defense ? I18n.formatInteger(Math.trunc(defense.totalDefense/100)) : '?',
            satelliteDefense: defense ? I18n.formatInteger(Math.trunc(defense.satelliteDefense/100)) : '?',
            shipDefense: defense ? I18n.formatInteger(Math.trunc(defense.shipDefense/100)) : '?',
            production: allied ? I18n.formatInteger(Math.trunc(star.getProduction()/100)) : '?',
            showProduction: detailsVisible, showDestination: allied, allied,
            destination: destination ? this.getSpacePointDescription(destination) : this.STR.none
        };
    }

    getStarDetailsPanelHeight(star) {
        const data = this.getStarDiagnostics(star);
        if (this.game.canHumanControl(star)) return 394;
        if (data.allied) return 364;
        if (data.showProduction) return 325;
        return this.game.canViewSystemShips(star) ? 254 : 224;
    }

    getStarDetailsLayout(star) {
        const data = this.getStarDiagnostics(star);
        const rect = this.getAnchoredPanelRect(star, 360, this.getStarDetailsPanelHeight(star));
        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect) + 8*18;
        if (data.eta !== null) y += 18;
        const dividerY = y - 1;
        const productionTitleY = dividerY + 19;
        const sliderStartY = productionTitleY + 18;
        return {rect,x,basicStartY:this.getPanelContentStartY(rect),dividerY,productionTitleY,sliderStartY,sliderWidth:150};
    }

    getStarAllocationSliderRegions(star) {
        if (!star || !this.game.canHumanControl(star)) {
            return [];
        }
        const layout = this.getStarDetailsLayout(star);
        const entries = this.game.getStarAllocationEntries(star);
        return entries.map((entry, index) => {
            const y = layout.sliderStartY + index * 18;
            const rects = this.getAllocationSliderRects(layout.x, y, layout.sliderWidth);
            return {
                ...entry,
                star,
                rect: rects.control,
                trackRect: rects.track,
                actionType: 'setAllocation'
            };
        });
    }

    // Draw main UI elements
    drawMainUI(turn, starCount, shipCount) {
        const screen = this.getScreenSize();
        const player = this.game.players ? this.game.players[this.game.getCurrentHumanPlayer()] : null;
        const gameName = (this.game.config && this.game.config.gameTitle) ? this.game.config.gameTitle : (player && player.name) || I18n.getString(568, 'Galactica-4');
        const headerWidth = Math.min(420, screen.width - 40);
        const rect = {
            x: (screen.width - headerWidth) / 2,
            y: 12,
            width: headerWidth,
            height: 56
        };

        let headline = `${gameName}  •  ${this.STR.turn} ${turn}`;
        if (this.game.isGameOver) {
            const winner = this.game.winningPlayerNum ? this.game.players[this.game.winningPlayerNum] : null;
            headline = winner ?
                `${gameName}  •  ${this.STR.winner} ${winner.name || `${I18n.getString(18, 'Player')} ${winner.playerNum}`}` :
                `${gameName}  •  ${I18n.getString(653, 'No winner')}`;
        }

        this.drawRoundedRect(rect, 16, this.styles.topInfoPanel);
        this.drawTextLine(headline, screen.width / 2, rect.y + 24, 'lightgray', 15, pdg.textStyle_Centered);
        this.drawTextLine(`${this.STR.stars} ${starCount}   ${this.STR.ships} ${shipCount}   ${this.STR.zoom} ${this.getZoomPercentage()}%`, screen.width / 2, rect.y + 44, 'gray', 11, pdg.textStyle_Centered);
        this.drawMapButtons();
    }

    drawMenuBar() {
        this.drawMapButtons();
    }
    
    formatConstructionETA(star) {
        const turns = star ? star.getEstimatedTurnsToNextShip() : null;
        if (turns === null) return this.STR.none;
        if (turns < 0) return I18n.getString(681, 'Paused');
        return I18n.formatPluralString(680, '{0} turn|{0} turns', turns);
    }

    // Draw star details UI
    drawStarDetails(star) {
        const owned = this.game.canHumanControl(star), data = this.getStarDiagnostics(star);
        const layout = this.getStarDetailsLayout(star), rect = layout.rect, x = layout.x;
        this.drawAnchoredPanel(star, rect, this.fitShipDiagnosticText(data.title,rect.width-32,14));
        let y = layout.basicStartY;
        const labels = [this.STR.owner,this.STR.pop,this.STR.tech,this.STR.building,
            I18n.getString(721,'Position:'),I18n.getString(722,'Total defense:'),
            I18n.getString(723,'Satellites:'),I18n.getString(724,'Ship defense:')];
        const values = [data.owner,data.population,data.tech,data.building,data.position,
            data.totalDefense,data.satelliteDefense,data.shipDefense];
        const labelWidth = Math.max(70,...labels.map(label=>this.port.getTextWidth(label,11)+8));
        labels.forEach((label,index) => {
            let valueWidth = rect.width-labelWidth-24;
            if (index===3 && data.completion!==null) valueWidth -= 105;
            this.drawLabelValue(label,this.fitShipDiagnosticText(values[index],valueWidth,11),x,y,{labelWidth,size:11});
            if (index===3 && data.completion!==null) {
                const right = rect.x+rect.width-25;
                this.drawBar(right-101,y-8,72,8,star.currentShip.progress/100,'lightgray');
                this.drawRightTextLine(`${data.completion}%`,right,y,'lightgray',11);
            }
            y += 18;
        });
        if (data.eta!==null) this.drawLabelValue(I18n.getString(679,'ETA:'),data.eta,x,y,{labelWidth,size:11});
        if (data.showProduction) {
            this.drawDivider(x,layout.dividerY,rect.width-24);
            this.drawTextLine(this.STR.production,x,layout.productionTitleY,'lightgray',12);
            this.drawRightTextLine(data.production,rect.x+rect.width-16,layout.productionTitleY,'lightgray',11);
            if (data.completion!==null) this.drawTextLine(I18n.getString(677,'Continuous'),x+120,layout.productionTitleY,'gray',10);
            if (owned) this.drawStarAllocationSummary(star,x,layout.sliderStartY,layout.sliderWidth);
            else {
                const entries = [this.STR.growth,this.STR.ships.replace(/:$/,''),this.STR.research];
                ['growth','shipBuilding','research'].forEach((key,index)=>this.drawAllocationSlider(entries[index],
                    data.allied?star[key]:{value:0,desired:0,locked:false},x,layout.sliderStartY+index*18,layout.sliderWidth,
                    ['green','cyan','purple'][index],{interactive:false,unknown:!data.allied}));
            }
        }
        const shipButton = this.getSystemShipButtonRegion();
        if (shipButton) this.drawUIButton(shipButton.rect,shipButton.label,null,{size:10});
        const equalize = this.getAllocationEqualizeRegions().find(region=>!region.key);
        if (owned && equalize) this.drawUIButton(equalize.rect,I18n.getString(676,'Equalize'),null,{size:10});
        if (data.showDestination) {
            const label = I18n.getString(684,'Send to:');
            const width = Math.max(86,this.port.getTextWidth(label,11)+8);
            this.drawLabelValue(label,this.fitShipDiagnosticText(data.destination,rect.width-width-24),x,rect.y+rect.height-45,
                {labelWidth:width,size:11});
        }
        this.getDefaultDestinationRegions().forEach(region=>this.drawUIButton(region.rect,region.label,null,
            {size:10,active:region.action.type==='beginOrders' && this.game.pendingMapOrderObject===star}));
        this.drawContextButtonArc(star,rect);
    }

    getShipDetailsRect(ship) {
        return ship.underConstruction() ? this.getAnchoredPanelRect(ship, 240, 138)
            : this.getAnchoredPanelRect(ship, 350, 292);
    }

    getShipDiagnostics(ship) {
        const viewer = this.game.getCurrentHumanPlayer() || 1;
        const full = !!this.game.config.omniscient || this.game.isOwnerAlliedWith(viewer, ship.owner);
        const visibility = full ? Common.VisibilityLevel.DETAILS : ship.getVisibilityTo(viewer);
        const techVisible = visibility >= Common.VisibilityLevel.TECH;
        const classVisible = visibility >= Common.VisibilityLevel.CLASS;
        const detailsVisible = visibility >= Common.VisibilityLevel.DETAILS;
        const names = I18n.getString(800, '').split('|');
        const classIndex = ship.classIndex || Math.floor(ship.techLevel / 5) + 1;
        const damagePercent = Math.max(0, Math.min(100, ship.getDamagePercent()));
        let status = I18n.getString(705, 'Idle');
        if (ship.fleet) status = I18n.getString(707, 'In fleet');
        else if (ship.isOnPatrol()) status = I18n.getString(703, 'Patrolling');
        else if (ship.destination) status = I18n.getString(704, 'Travelling');
        else if (ship.star || ship.fleet) status = I18n.getString(702, 'Docked');
        if(ship.isToBeScrapped() && this.game.isOwnerAlliedWith(viewer,ship.owner))status=I18n.getString(756,'Marked for scrap');
        const position = ship.fleet || ship;
        const coordinates = this.formatSpaceCoordinates(position);
        return {
            title: classVisible ? this.game.getObjectDisplayName(ship).replace(/\t/g, ' · ') : this.STR.ship,
            hull: classVisible ? this.getShipTypeName(ship.type, { capitalized: true }) : '?',
            driveClass: classVisible ? (ship.type === 'battleship' ? names[classIndex - 1] || '-' : '-') : '?',
            owner: techVisible ? String(ship.owner) : '?',
            tech: techVisible ? String(Math.trunc(ship.techLevel)) : '?',
            speed: visibility >= Common.VisibilityLevel.SPEED ? (ship.speed ? I18n.formatDecimal(ship.speed / 16380) : '-') : '?',
            power: classVisible ? String(Math.trunc(ship.power)) : '?',
            damage: classVisible ? damagePercent + '%' : '?',
            health: classVisible ? (100 - damagePercent) + '%' : '?',
            healthRatio: classVisible ? (100 - damagePercent) / 100 : null,
            scanner: detailsVisible ? I18n.formatString(706, '{0} light-years', I18n.formatDecimal(ship.getScannerRange() / 65536, 2)) : '?',
            status: detailsVisible ? status : '?',
            location: detailsVisible && (ship.star || ship.fleet) ? this.getSpacePointDescription(ship.fleet || ship.star)
                : visibility >= Common.VisibilityLevel.SPEED ? coordinates : '?',
            destination: full ? (position.destination ? this.getSpacePointDescription(position.destination) : this.STR.none) : '?'
        };
    }

    fitShipDiagnosticText(text, width, size = 11) {
        const chars = Array.from(String(text));
        if (this.port.getTextWidth(chars.join(''), size) <= width) return chars.join('');
        while (chars.length && this.port.getTextWidth(chars.join('') + '…', size) > width) chars.pop();
        return chars.join('') + '…';
    }

    // Text retains its native ElementRefs while the selected ship changes.
    drawShipDetails(ship) {
        const construction = ship.underConstruction();
        const rect = this.getShipDetailsRect(ship);
        let panel = this.shipPanels.get(construction);
        if (!panel) {
            panel = new RetainedPanel(this, rect.width);
            this.shipPanels.set(construction, panel);
        }
        if (construction) {
            panel.text('title', `${this.getShipTypeName(ship.type)} ${this.STR.shipHull}`, 16, 22, 'lightgray', 14);
            panel.labelValue('owner', this.STR.owner, ship.owner, 47, { size: 11 });
            panel.labelValue('tech', this.STR.techLevel, I18n.formatDecimal(ship.techLevel), 65);
            panel.text('construction', this.STR.underConstruction, 12, 83, 'labelgray');
            panel.text('progress', `${Math.floor(ship.progress)}%`, rect.width - 14, 83, 'lightgray', 11, pdg.textStyle_RightJustified);
            panel.labelValue('eta', I18n.getString(679, 'ETA:'), this.formatConstructionETA(ship.star), 101, { size: 11 });
        } else {
            const data = this.getShipDiagnostics(ship);
            const rows = [
                ['hull', I18n.getString(701, 'Hull:'), 47],
                ['driveClass', I18n.getString(697, 'Class:'), 65],
                ['owner', this.STR.owner, 83], ['tech', this.STR.techLevel, 101],
                ['speed', this.STR.speed, 119], ['power', this.STR.power, 137],
                ['damage', this.STR.damage, 155], ['health', I18n.getString(698, 'Health:'), 173],
                ['scanner', I18n.getString(696, 'Scanner range:'), 209],
                ['status', I18n.getString(699, 'Status:'), 227],
                ['location', I18n.getString(700, 'Location:'), 245],
                ['destination', I18n.getString(595, 'Destination:'), 263]
            ];
            const labelWidth = Math.max(117, ...rows.map(row => Math.ceil(this.port.getTextWidth(row[1], 11)) + 12));
            const width = rect.width - labelWidth - 21;
            panel.text('title', this.fitShipDiagnosticText(data.title, rect.width - 32, 14), 16, 22, 'lightgray', 14);
            rows.forEach(([id, label, y]) => panel.labelValue(id, label, this.fitShipDiagnosticText(data[id], width), y, { size: 11, labelWidth }));
            this.drawPanelPointer(ship, rect);
            panel.draw(rect);
            if (data.healthRatio !== null) this.drawBar(rect.x + labelWidth + 5, rect.y + 181, width, 8, data.healthRatio, 'green');
            this.drawContextButtonArc(ship, rect);
            return;
        }
        this.drawPanelPointer(ship, rect);
        panel.draw(rect);
        this.drawBar(rect.x + rect.width - 130, rect.y + 75, 70, 8, ship.progress / 100, 'lightgray');
        this.drawContextButtonArc(ship, rect);
    }

    // Draw fleet details UI
    drawFleetDetails(fleet) {
        const layout = this.getFleetDetailsLayout(fleet);
        const compositionRows = layout.compositionRows;
        const rect = layout.rect;
        this.drawAnchoredPanel(fleet, rect, this.game.getObjectDisplayName ? this.game.getObjectDisplayName(fleet) : I18n.formatString(560, 'Fleet {0}', fleet.id));

        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);
        this.drawLabelValue(this.STR.ships, fleet.getSize().toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue(this.STR.totalPower, fleet.totalPower.toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue(this.STR.speed, fleet.totalSpeed.toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue(this.STR.techLevel, fleet.techLevel.toString(), x, y, { labelWidth: 92 });
        y += 22;

        if(layout.patrolHeight) {
            this.drawLabelValue(I18n.getString(699,'Status:'),fleet.isToBeScrapped()?I18n.getString(756,'Marked for scrap'):I18n.getString(703,'Patrolling'),x,y,{labelWidth:92,size:11});
            y+=18;
        }

        for (const [shipType, count] of compositionRows) {
            this.drawLabelValue(`${this.getShipTypeName(shipType, { capitalized: true })}:`, count.toString(), x, y, { labelWidth: 92, size: 11, valueColor: 'gray' });
            y += 16;
        }

        if (fleet.destination) {
            const destinationName = this.getSpacePointDescription(fleet.destination);
            this.drawLabelValue(this.STR.movingTo, destinationName, x, y, { labelWidth: 92, size: 11, valueColor: 'gray' });
            y += 18;
        }

        if (layout.visibleShips.length > 0) {
            y += 2;
            this.drawDivider(x, y - 8, rect.width - 24);
            this.drawTextLine(this.STR.contents, x, y + 7, 'lightgray', 12);
            y += 28;

            const transferTargets = layout.transferTargets;
            const memberRegions = this.getFleetMemberActionRegions(fleet);
            for (const ship of layout.visibleShips) {
                const shipName = ship.name || `${this.getShipTypeName(ship.type, { capitalized: true })} ${ship.id}`;
                this.drawTextLine(this.trimText(shipName, 24), x, y, 'lightgray', 10);
                const removeRegion = memberRegions.find(region =>
                    region.action.type === 'removeFleetShip' &&
                    region.action.ship === ship
                );
                const transferRegion = memberRegions.find(region =>
                    region.action.type === 'transferFleetShip' &&
                    region.action.ship === ship
                );
                if (transferTargets.length > 0 && transferRegion) {
                    this.drawUIButton(transferRegion.rect, this.STR.transfer, null, { size: 9, radius: 7 });
                }
                if (removeRegion) {
                    this.drawUIButton(removeRegion.rect, this.STR.remove, null, { size: 9, radius: 7 });
                }
                y += layout.memberRowHeight;
            }

            if ((fleet.ships || []).length > layout.visibleShips.length) {
                this.drawTextLine(I18n.formatString(657, '+{0} more', (fleet.ships || []).length - layout.visibleShips.length), x, y, 'gray', 10);
            }
        }
        this.drawContextButtonArc(fleet, rect);
    }

    drawRendezvousDetails(rendezvous) {
        const layout = this.getRendezvousDetailsLayout(rendezvous);
        const rect = layout.rect;
        const fleet = layout.fleet;
        this.drawAnchoredPanel(rendezvous, rect, rendezvous.name || this.STR.rendezvous);

        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);
        this.drawLabelValue(this.STR.owner, `${rendezvous.owner}`, x, y, { labelWidth: 100, size: 11 });
        y += 18;
        this.drawLabelValue(this.STR.location, this.formatSpaceCoordinates(rendezvous), x, y, { labelWidth: 100, size: 11 });
        y += 18;
        this.drawLabelValue(this.STR.assembling, fleet ? this.game.getObjectDisplayName(fleet) : this.STR.noFleet, x, y, { labelWidth: 100, size: 11, valueColor: fleet ? 'lightgray' : 'gray' });
        y += 18;
        if (fleet) {
            this.drawLabelValue(this.STR.ships, fleet.getSize().toString(), x, y, { labelWidth: 100, size: 11 });
            y += 18;
            this.drawLabelValue(this.STR.totalPower, (fleet.totalPower || 0).toString(), x, y, { labelWidth: 100, size: 11 });
        }
        this.drawContextButtonArc(rendezvous, rect);
    }

    drawCommandWindow() {
        const rect = this.getCommandWindowRect();
        this.drawWindowPanel(rect, this.STR.commandMenu);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine(this.STR.keyboardShortcutsActive, x, y, 'gray', 11);
        this.getCommandActionRegions().forEach(region=>this.drawUIButton(region.rect,region.label,region.key,{icon:region.icon,active:!!region.active}));
        this.drawTextLine(this.STR.escClose,x,rect.y+rect.height-16,'gray',10);
    }

    drawProductionWindow() {
        const rect = this.getProductionWindowRect();
        this.drawWindowPanel(rect, this.STR.productionSliders);

        const star = this.game.getSelectedStar();
        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);

        if (!star || !this.game.canHumanControl(star)) {
            this.drawTextLine(this.STR.selectStarForProduction, x, y, 'lightgray', 12);
            y += 24;
            this.drawTextLine(this.STR.escClose, x, y, 'gray', 10);
            return;
        }

        this.drawTextLine(star.name, x, y, 'lightgray', 13);
        y += 28;
        this.drawStarAllocationSummary(star, x, y, 185);
        const equalize = this.getAllocationEqualizeRegions().find(region => region.key);
        if (equalize) this.drawUIButton(equalize.rect, I18n.getString(676, 'Equalize'), 'R', { size: 10 });
        y += 98;
        this.drawTextLine(this.STR.escClose, x, y, 'gray', 10);
    }

    drawEventWindow() {
        const l=this.getEventWindowLayout(),r=l.rect;
        this.drawWindowPanel(r,`${this.STR.eventList} · ${this.STR.turn} ${Math.max(1,this.game.turn-1)}`);
        if(!l.rows.length) {this.drawTextLine(this.STR.noEventsYet,r.x+14,r.y+62,'gray',12);return;}
        l.visibleRows.forEach((event,index)=>{
            const row={x:r.x+14,y:r.y+48+index*32,width:r.width-28,height:30},selected=event===l.selected;
            if(selected || this.isHovered(row))this.drawRoundedRect(row,4,this.styles[selected?'buttonFillActive':'buttonFillHover']);
            const color=selected || !event.handled?'lightgray':'gray';
            this.drawTextLine(this.fitShipDiagnosticText(event.title,row.width-12,11),row.x+6,row.y+12,color,11);
            this.drawTextLine(this.fitShipDiagnosticText(event.message,row.width-12,10),row.x+6,row.y+27,color,10);
        });
        this.drawDivider(r.x+14,r.y+l.detailStart,r.width-28);
        const status=l.selected && l.selected.handled?' · '+I18n.getString(751,'Reviewed'):'';
        this.drawTextLine(I18n.getString(753,'Details')+status,r.x+14,r.y+l.detailStart+22,'lightgray',12);
        if(l.selected) {
            l.visibleLines.forEach((line,index)=>this.drawTextLine(line,r.x+14,r.y+l.detailStart+44+index*15,'lightgray',11));
            if(!this.game.getEventFocus(l.selected))this.drawTextLine(I18n.getString(750,'No location'),r.x+r.width-14,r.y+r.height-20,'gray',10,pdg.textStyle_RightJustified);
        } else this.drawTextLine(I18n.getString(752,'Select an event'),r.x+14,r.y+l.detailStart+44,'gray',11);
        this.getEventActionRegions().filter(region=>region.label).forEach(region=>this.drawUIButton(region.rect,region.label,region.key,{size:10}));
        if(l.detailPages>1)this.drawTextLine(`${I18n.getString(753,'Details')} ${l.detailPage+1}/${l.detailPages}`,r.x+r.width-14,r.y+r.height-54,'gray',10,pdg.textStyle_RightJustified);
        this.drawTextLine(`${l.page+1}/${l.pages}`,r.x+r.width/2,r.y+r.height-10,'gray',10,pdg.textStyle_Centered);
    }

    drawComparisonWindow() {
        const rows = this.game.getPlayerComparisonRows();
        const rect = this.getComparisonWindowRect();
        this.drawWindowPanel(rect, this.STR.empireComparison);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine(this.STR.player, x, y, 'lightgray', 11);
        this.drawTextLine(this.STR.type, x + 170, y, 'lightgray', 11);
        this.drawTextLine(this.STR.stars.replace(/:$/, ''), x + 245, y, 'lightgray', 11);
        this.drawTextLine(this.STR.ships.replace(/:$/, ''), x + 300, y, 'lightgray', 11);
        this.drawTextLine(this.STR.pop.replace(/:$/, ''), x + 355, y, 'lightgray', 11);
        this.drawTextLine(this.STR.avgTech, x + 445, y, 'lightgray', 11);
        this.drawTextLine(this.STR.max, x + 535, y, 'lightgray', 11);
        this.drawDivider(x, y + 8, rect.width - 28);
        y += 22;

        for (const row of rows) {
            const color = row.playerNum === this.game.getCurrentHumanPlayer() ? 'lightgray' : 'gray';
            this.drawTextLine(this.trimText(row.name, 22), x, y, color, 11);
            this.drawTextLine(row.type, x + 170, y, color, 11);
            this.drawTextLine(row.stars.toString(), x + 245, y, color, 11);
            const shipText = row.shipsBuilding > 0 ? `${row.ships}+${row.shipsBuilding}` : row.ships.toString();
            this.drawTextLine(shipText, x + 300, y, color, 11);
            this.drawTextLine(row.population.toString(), x + 355, y, color, 11);
            this.drawTextLine(row.averageTech.toFixed(1), x + 445, y, color, 11);
            this.drawTextLine(row.maxTech.toFixed(1), x + 535, y, color, 11);
            y += 22;
        }

        if (this.game.selectedObject) {
            y += 12;
            const selectedType = this.game.getObjectType(this.game.selectedObject);
            let label = I18n.getString(541, 'Selected object');
            if (selectedType === Common.ObjectType.STAR) {
                label = I18n.formatString(542, 'Selected star: {0}', this.game.selectedObject.name);
            } else if (selectedType === Common.ObjectType.SHIP) {
                label = I18n.formatString(543, 'Selected ship: {0}', this.getShipTypeName(this.game.selectedObject.type));
            } else if (selectedType === Common.ObjectType.FLEET) {
                label = I18n.formatString(544, 'Selected fleet: {0} ships', this.game.selectedObject.getSize());
            }
            this.drawTextLine(label, x, y, 'lightgray', 11);
            y += 18;
            this.drawTextLine(this.STR.closeComparison, x, y, 'gray', 10);
        }
    }

    drawFleetWindow() {
        const rows = this.game.getFleetListRows ? this.game.getFleetListRows() : [];
        const rect = this.getFleetWindowRect();
        this.drawWindowPanel(rect, this.STR.fleetRoster);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);

        if (rows.length === 0) {
            this.drawTextLine(this.STR.noFleets, x, y, 'gray', 12);
            return;
        }

        this.drawTextLine(this.STR.name.replace(/:$/, ''), x, y, 'lightgray', 11);
        this.drawTextLine(this.STR.type, x + 170, y, 'lightgray', 11);
        this.drawTextLine(this.STR.ships.replace(/:$/, ''), x + 250, y, 'lightgray', 11);
        this.drawTextLine(this.STR.power.replace(/:$/, ''), x + 305, y, 'lightgray', 11);
        this.drawTextLine(this.STR.destination, x + 380, y, 'lightgray', 11);
        this.drawDivider(x, y + 8, rect.width - 28);
        y += 24;

        for (const row of rows) {
            const selected = this.game.selectedObject === row.object;
            const color = selected ? 'hovergray' : 'lightgray';
            this.drawTextLine(this.trimText(row.name, 22), x, y, color, 11);
            this.drawTextLine(row.kind === 'fleet' ? this.STR.fleet : this.STR.point, x + 170, y, color, 11);
            this.drawTextLine(row.ships.toString(), x + 250, y, color, 11);
            this.drawTextLine(row.power.toString(), x + 305, y, color, 11);
            this.drawTextLine(this.trimText(row.destination, 28), x + 380, y, 'gray', 10);
            y += 26;
        }
    }

    getRenameActionRegions() {
        const rect = this.getRenameWindowRect();
        return [
            { rect: { x: rect.x + 14, y: rect.y + 112, width: 144, height: 26 }, action: { type: 'commitRename' }, label: I18n.getString(682, 'Save') },
            { rect: { x: rect.x + 182, y: rect.y + 112, width: 144, height: 26 }, action: { type: 'cancelRename' }, label: I18n.getString(683, 'Cancel') }
        ];
    }

    drawColonyDefaultsWindow() {
        const rect = this.getColonyDefaultsWindowRect(), draft = this.game.colonyDefaultsDraft;
        this.drawWindowPanel(rect,I18n.getString(693,'New colony defaults'));
        if (!draft) return;
        this.drawTextLine(I18n.getString(694,'Applies to future colonies'),rect.x+14,rect.y+47,'gray',11);
        this.getColonyDefaultSliderRegions().forEach(slider=>{
            const y = slider.rect.y+17;
            this.drawRightTextLine(slider.label,slider.rect.x-8,y,'labelgray',11);
            this.drawBar(slider.rect.x,slider.rect.y+8,slider.rect.width,8,draft[slider.key]/1000,slider.color);
            this.drawTextLine(`${I18n.formatDecimal(draft[slider.key]/10)}%`,slider.rect.x+slider.rect.width+8,y,'lightgray',11);
        });
        this.drawTextLine(this.STR.building.replace(/:$/, ''),rect.x+14,rect.y+153,'labelgray',11);
        this.getColonyDefaultActionRegions().forEach(region=>this.drawUIButton(region.rect,region.label,null,{active:region.active}));
    }

    getCourseWaypointDescription(target) {
        const type=this.game.getObjectType(target),player=this.game.getCurrentHumanPlayer();
        if(type===Common.ObjectType.SHIP || type===Common.ObjectType.FLEET) {
            const named=this.game.config.omniscient || target.isAllyOf(player) ||
                target.getVisibilityTo(player)>=Common.VisibilityLevel.CLASS;
            if(type===Common.ObjectType.FLEET) {
                const name=named?this.game.getObjectDisplayName(target):String(target.id);
                const prefix=I18n.formatString(560,'Fleet {0}','').trim();
                return name.startsWith(prefix+' ')?name:I18n.formatString(560,'Fleet {0}',name);
            }
            const name=named?this.game.getObjectDisplayName(target):String(target.id);
            return name.startsWith(this.STR.ship+' ')?name:`${this.STR.ship} ${name}`;
        }
        return this.getSpacePointDescription(target);
    }

    drawCourseWindow() {
        const layout=this.getCourseWindowLayout(),r=layout.rect,object=this.game.courseWindowObject;
        const title=I18n.formatString(727,'Course: {0}',object?this.game.getObjectDisplayName(object):this.STR.none);
        this.drawWindowPanel(r,this.fitShipDiagnosticText(title,r.width-32,14));
        const nameWidth=r.width-210;
        this.drawTextLine(I18n.getString(736,'Waypoint'),r.x+42,r.y+49,'gray',11);
        this.drawTextLine(this.fitShipDiagnosticText(I18n.getString(737,'Leg'),76,10),r.x+r.width-176,r.y+43,'gray',10);
        this.drawTextLine(this.fitShipDiagnosticText(I18n.getString(738,'Remaining'),81,10),r.x+r.width-95,r.y+43,'gray',10);
        [r.width-176,r.width-95].forEach(offset=>this.drawTextLine(I18n.getString(735,'Turns'),r.x+offset,r.y+57,'gray',9));
        if(!layout.visibleRows.length)this.drawTextLine(I18n.getString(728,'No waypoints'),r.x+14,r.y+85,'gray',12);
        layout.visibleRows.forEach((row,index)=>{
            const rect={x:r.x+14,y:r.y+66+index*26,width:r.width-28,height:24},y=rect.y+17;
            const selected=this.game.courseSelection===row.index;
            if(selected || this.isHovered(rect))this.drawRoundedRect(rect,4,this.styles[selected?'buttonFillActive':'buttonFillHover']);
            this.drawTextLine(String(row.index+1),r.x+18,y,'gray',10);
            const name=this.getCourseWaypointDescription(row.target);
            this.drawTextLine(this.fitShipDiagnosticText(name,nameWidth,11),r.x+42,y,'lightgray',11,
                row.current?pdg.textStyle_Bold:pdg.textStyle_Plain);
            this.drawTextLine(row.turns===null?'-':String(row.turns),r.x+r.width-176,y,'gray',11);
            this.drawTextLine(row.remaining===null?'-':String(row.remaining),r.x+r.width-95,y,'lightgray',11);
            this.drawDivider(r.x+14,rect.y+24,r.width-28);
        });
        this.getCourseActionRegions().filter(region=>region.label).forEach(region=>this.drawUIButton(region.rect,region.label,region.key,
            {size:10,active:region.active}));
        this.drawTextLine(this.STR.escClose,r.x+r.width-16,r.y+r.height-47,'gray',10,pdg.textStyle_RightJustified);
        this.drawTextLine(`${layout.page+1} / ${layout.pages}`,r.x+r.width/2,r.y+r.height-16,'gray',11,pdg.textStyle_Centered);
    }

    drawCourseLines(object,startX,startY,attributes) {
        if(!object.destination || !this.game.canViewCourse(object))return;
        const points=object.course?object.course.waypoints.map(point=>object.course.resolve(point)):[object.destination];
        const current=object.course?object.course.current:0;
        let from={x:startX,y:startY};
        const route=points.slice(current);
        if(object.course && object.course.loop && points.length>1)route.push(...points.slice(0,current+1));
        route.forEach(point=>{
            const to={x:this.toScreenX(point.x),y:this.toScreenY(point.y)};
            this.port.drawLine(new pdg.Point(from.x,from.y),new pdg.Point(to.x,to.y),attributes);from=to;
        });
    }

    drawSystemComparisonWindow() {
        const layout = this.getSystemComparisonLayout(), rect = layout.rect, sort = this.game.systemComparisonSort;
        this.drawWindowPanel(rect,I18n.getString(708,'Your Star Systems'));
        layout.columns.forEach(column => {
            const button = {x:rect.x+column.offset,y:rect.y+38,width:column.width-3,height:32};
            this.drawRoundedRect(button,5,this.styles[this.isHovered(button)?'buttonFillHover':'buttonFill']);
            const lines = column.label.split('|');
            if (sort.key === column.key) lines[0] += sort.ascending ? ' ↑' : ' ↓';
            lines.forEach((text,index) => {
                // Two-line translated headers keep the nine v3 columns legible.
                let size = 10;
                while (size > 8 && this.port.getTextWidth(text,size) > button.width-6) size--;
                this.drawTextLine(this.fitShipDiagnosticText(text,button.width-6,size),button.x+button.width/2,
                    button.y+(lines.length>1?12+index*13:21),'lightgray',size,pdg.textStyle_Centered);
            });
        });
        if (!layout.visibleRows.length) this.drawTextLine(I18n.getString(719,'No owned systems'),rect.x+14,rect.y+94,'gray',12);
        layout.visibleRows.forEach((row,index) => {
            const rowRect = {x:rect.x+14,y:rect.y+76+index*26,width:rect.width-28,height:24};
            if (row.star === this.game.systemComparisonSelection || this.isHovered(rowRect)) {
                this.drawRoundedRect(rowRect,4,this.styles[row.star===this.game.systemComparisonSelection?'buttonFillActive':'buttonFillHover']);
            }
            layout.columns.forEach(column => this.drawTextLine(
                this.fitShipDiagnosticText(row[column.key],column.width-8,11),rect.x+column.offset+3,
                rowRect.y+17,'lightgray',11));
            this.drawDivider(rect.x+14,rowRect.y+24,rect.width-28);
        });
        this.drawTextLine(I18n.getString(718,'Double-click a system, or select it and press Enter'),rect.x+rect.width/2,
            rect.y+rect.height-48,'gray',10,pdg.textStyle_Centered);
        this.getSystemComparisonActionRegions().filter(region=>region.label).forEach(region=>this.drawUIButton(region.rect,region.label));
        this.drawTextLine(`${layout.page+1} / ${layout.pages}`,rect.x+rect.width/2,rect.y+rect.height-19,'gray',11,pdg.textStyle_Centered);
    }

    drawSystemShipWindow() {
        const layout = this.getSystemShipWindowLayout(), rect = layout.rect;
        const star = this.game.systemShipWindowStar;
        this.drawWindowPanel(rect,I18n.formatString(687,'Ships at {0}',star ? this.getStarDiagnostics(star).title : this.STR.none));
        const sort = this.game.systemShipSort;
        layout.columns.forEach(column => this.drawUIButton({x:rect.x+column.offset,y:rect.y+38,
            width:column.width-4,height:24}, column.label+(sort.key===column.key?(sort.ascending?' ↑':' ↓'):''),null,{size:10}));
        if (!layout.visibleRows.length) this.drawTextLine(I18n.getString(689,'No docked ships'),rect.x+14,rect.y+88,'gray',12);
        layout.visibleRows.forEach((row,index) => {
            const rowRect = {x:rect.x+14,y:rect.y+68+index*26,width:rect.width-28,height:24};
            if (this.isHovered(rowRect)) this.drawRoundedRect(rowRect,4,this.styles.buttonFillHover);
            const y = rect.y+85+index*26;
            layout.columns.forEach(column => {
                let text = column.key==='name' ? (row.member?'  ↳ ':'')+row.name :
                    (column.key==='damage' ? `${row.damage}` : I18n.formatDecimal(row[column.key]));
                while (Array.from(text).length>1 && (this.port.getTextWidth ? this.port.getTextWidth(text,11) : text.length*7)>column.width-8)
                    text=Array.from(text).slice(0,-2).join('')+'…';
                this.drawTextLine(text,rect.x+column.offset,y,(row.member || row.object.isToBeScrapped() && this.game.isOwnerAlliedWith(this.game.getCurrentHumanPlayer(),row.object.owner))?'gray':'lightgray',11);
            });
            this.drawDivider(rect.x+14,y+7,rect.width-28);
        });
        this.drawTextLine(I18n.getString(692,'Click a ship or fleet to inspect it'),rect.x+rect.width/2,
            rect.y+rect.height-51,'gray',10,pdg.textStyle_Centered);
        this.getSystemShipActionRegions().filter(region=>region.label).forEach(region=>this.drawUIButton(region.rect,region.label,null,{size:10,active:!!region.active}));
        this.drawTextLine(`${layout.page+1} / ${layout.pages}`,rect.x+rect.width/2,rect.y+rect.height-19,'gray',11,pdg.textStyle_Centered);
    }

    drawRenameWindow() {
        const rect = this.getRenameWindowRect();
        const target = this.game.renameTarget;
        const title = target ? I18n.formatString(673, 'Rename {0}', this.game.getObjectDisplayName(target)) : this.STR.rename;
        this.drawWindowPanel(rect, title);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine(this.STR.name, x, y, 'labelgray', 12);
        let text = this.game.renameText || '';
        if (this.port.getTextWidth) {
            // Keep the insertion end visible even for a long Japanese name.
            while (text && this.port.getTextWidth(text, 12) > rect.width - 96) text = Array.from(text).slice(1).join('');
        }
        this.drawTextLine(text, x + 68, y, 'lightgray', 12);
        this.drawDivider(x, y + 10, rect.width - 28);
        y += 34;
        this.drawTextLine(this.STR.renameHelp, x, y, 'gray', 10);
        this.getRenameActionRegions().forEach(button => this.drawUIButton(button.rect, button.label));
    }

    drawRendezvousPlacementPrompt() {
        if (!this.game.pendingRendezvousPlacement) {
            return;
        }
        const placement = this.game.pendingRendezvousPlacement;
        const rect = this.getRendezvousPlacementPromptRect();
        const title = placement.mode === 'move' ? this.STR.moveRendezvous : this.STR.placeRendezvous;
        const help = placement.mode === 'move' ? this.STR.moveRendezvousHelp : this.STR.placeRendezvousHelp;
        this.drawWindowPanel(rect, title);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine(help, x, y, 'lightgray', 12);
        y += 22;
        this.drawTextLine(this.STR.escClose, x, y, 'gray', 10);
    }

    drawActiveWindow() {
        switch (this.game.uiWindow) {
            case 'endTurnConfirm':
                this.drawEndTurnConfirm();break;
            case 'menu':
                this.drawCommandWindow();
                break;
            case 'production':
                this.drawProductionWindow();
                break;
            case 'events':
                this.drawEventWindow();
                break;
            case 'comparison':
                this.drawComparisonWindow();
                break;
            case 'fleets':
                this.drawFleetWindow();
                break;
            case 'settings':
                this.drawSettingsWindow();
                break;
            case 'colonyDefaults':
                this.drawColonyDefaultsWindow();
                break;
            case 'course':
                this.drawCourseWindow();
                break;
            case 'systemComparison':
                this.drawSystemComparisonWindow();
                break;
            case 'systemShips':
                this.drawSystemShipWindow();
                break;
            case 'rename':
                this.drawRenameWindow();
                break;
            default:
                break;
        }
    }
    
    // Draw instructions
    drawInstructions() {
        const drawingArea = this.port.getDrawingArea();
        this.drawTextLine(`${this.STR.clickStars}   ${this.STR.clickShips}`, 10, drawingArea.height() - 60, 'gray', 12);
        this.drawTextLine(`${this.STR.tabEndTurn}   ${this.STR.zoomResetCenterHelp}`, 10, drawingArea.height() - 38, 'lightgray', 11);
        this.drawTextLine(this.STR.dragZoomHelp, 10, drawingArea.height() - 18, 'gray', 11);
    }
    
    // Draw grid lines based on sector boundaries
    drawGrid() {
        const drawingArea = this.port.getDrawingArea();
        // Use original C++ grid spacing - full sectors only (no subgrid)
        const sectorSize = 1024 * 1024; // PIXELS_PER_SECTOR * COORDINATE_SCALE
        const gridSpacing = sectorSize; // Full sector spacing (matches original C++)
        
        // Get visible bounds in galactic coordinates
        const visibleBounds = this.camera.getVisibleBounds();
        
        // Calculate grid spacing - only draw grid lines that are visible
        const minX = Math.floor(visibleBounds.left / gridSpacing) * gridSpacing;
        const maxX = Math.ceil(visibleBounds.right / gridSpacing) * gridSpacing;
        const minY = Math.floor(visibleBounds.top / gridSpacing) * gridSpacing;
        const maxY = Math.ceil(visibleBounds.bottom / gridSpacing) * gridSpacing;
        
        // Draw vertical grid lines
        for (let x = minX; x <= maxX; x += gridSpacing) {
            const screenX = this.toScreenX(x);
            if (screenX >= 0 && screenX <= drawingArea.width()) {
                this.port.drawLine(
                    new pdg.Point(screenX, 0),
                    new pdg.Point(screenX, drawingArea.height()),
                    this.styles.gridLine
                );
            }
        }
        
        // Draw horizontal grid lines
        for (let y = minY; y <= maxY; y += gridSpacing) {
            const screenY = this.toScreenY(y);
            if (screenY >= 0 && screenY <= drawingArea.height()) {
                this.port.drawLine(
                    new pdg.Point(0, screenY),
                    new pdg.Point(drawingArea.width(), screenY),
                    this.styles.gridLine
                );
            }
        }
    }

    getVisualTime() {return this.visualTime===undefined?pdg.tm.getMilliseconds():this.visualTime;}

    releaseUISurface(layer) {
        pdg.gfx.closeGraphicsPort(layer.port);
        if(typeof layer.image.delete==='function')layer.image.delete();
        if(typeof layer.attrs.delete==='function')layer.attrs.delete();
    }

    dispose() {
        for(const layer of this.uiSurfaces.values())this.releaseUISurface(layer);
        this.uiSurfaces.clear();
    }

    drawTransitionLayer(channel,key,draw) {
        const real=this.port,screen=this.getScreenSize(),now=this.getVisualTime();
        const motion=this.visualEffects.transition(channel,key,now);
        let layer=this.uiSurfaces.get(channel);
        if(layer && (layer.width!==screen.width || layer.height!==screen.height)) {
            this.releaseUISurface(layer);this.uiSurfaces.delete(channel);layer=null;
        }
        if(!layer && key && typeof pdg.gfx.createOffscreenPort==='function') {
            const surface=pdg.gfx.createOffscreenPort(new pdg.Rect(screen.width,screen.height));
            if(surface) {layer={port:surface,image:new pdg.Image(surface,pdg.SharedSurface),width:screen.width,height:screen.height,attrs:new pdg.Attributes()};this.uiSurfaces.set(channel,layer);}
        }
        if(!layer){if(key)draw();return;}
        if(key) {
            layer.port.clear();
            layer.port.setFont(real.getCurrentFont());
            this.port=layer.port;
            try{draw();}finally{this.port=real;}
            layer.hasContent=true;
        }
        if(layer.hasContent && motion.opacity>0) {
            layer.attrs.fillOpacity(motion.opacity);
            real.drawImage(layer.image,new pdg.Rect(new pdg.Point(0,motion.offset),screen.width,screen.height),layer.attrs);
        }
    }

    drawIconHint() {
        if(!this.iconHint || this.game.uiWindow && !this.iconHint.inWindow)return;
        const {rect,label}=this.iconHint,screen=this.getScreenSize();
        const width=Math.min(screen.width-20,this.port.getTextWidth(label,11)+24);
        const box=this.fitPanelToScreen({x:rect.x+rect.width-width,y:rect.y-32,width,height:26});
        this.drawPanelSurface(box,this.styles.windowPanel);
        this.drawTextLine(label,box.x+12,box.y+17,'lightgray',11);
    }

    // Main draw function that orchestrates all drawing
    drawGame() {
        this.visualTime=pdg.tm.getMilliseconds();
        this.iconHint=null;
        // Update star rendering cache once per frame
        this.updateMapRenderingCalculations();
        
        // Draw the distant background first.
        this.drawBackground();
        
        const game = this.game;
        const factory = this.factory;

        // Draw grid (behind game objects but above background)
        this.drawGrid();

        // Draw game objects
        this.drawStars(game.stars);
        this.drawShips(game.allShips);
        this.drawRendezvousPoints(game.allRendezvous);
        this.drawFleets(game.allFleets);
        
        // Draw UI
        this.drawMainUI(game.turn, game.stars.length, game.allShips.length);
        
        // Draw selected object details
        this.drawTransitionLayer('inspector',game.selectedObject && !game.pendingCourseEdit?game.selectedObject:null,()=>{
        if (game.selectedObject && !game.pendingCourseEdit) {
            const objectType = game.getObjectType(game.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                this.drawStarDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.drawShipDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.FLEET) {
                this.drawFleetDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.RENDEZVOUS) {
                this.drawRendezvousDetails(game.selectedObject);
            }
        }
        
        });
        // Draw instructions
        this.drawInstructions();

        // Draw command UI windows above the map/help layer
        if(this.game.pendingCourseEdit) {
            const screen=this.getScreenSize(),r={x:20,y:78,width:screen.width-40,height:40};
            this.drawWindowPanel(r,this.fitShipDiagnosticText(I18n.getString(734,'Click a destination; Esc cancels'),r.width-32,14));
        }
        this.drawTransitionLayer('window',game.uiWindow,()=>{
            this.drawingActiveWindow=true;
            try{this.drawActiveWindow();}finally{this.drawingActiveWindow=false;}
        });
        this.drawIconHint();
        this.drawRendezvousPlacementPrompt();
        
        // Draw event overlay last
        if (game.overlay && game.uiWindow!=='endTurnConfirm') {
            this.drawOverlay(game.overlay);
        }
    }

    // Helper to load an image once
    getImageCached(key, filename) {
        if (!this.images[key]) {
            try {
                this.images[key] = pdg.res.getImage(filename);
            } catch (e) {
                console.log(`Failed to load image ${filename}:`, e);
            }
        }
        return this.images[key];
    }

    // Map class index to ship art filename base
    getShipArtNameForClass(classIndex) {
        try {
            const namesStr = I18n.getString(800, 'Traveller');
            const list = namesStr.split('|');
            const name = list[Math.max(0, Math.min(list.length - 1, classIndex - 1))];
            return name.toLowerCase();
        } catch (e) {
            return 'unknown';
        }
    }

    drawOverlay(overlay) {
        const drawingArea = this.port.getDrawingArea();
        // Dim the scene
        this.port.drawRect(new pdg.Rect(0, 0, drawingArea.width(), drawingArea.height()), this.styles.overlayDim);
        
        if (overlay.type === 'lab') {
            const back = this.getImageCached('labback', 'events/labback.png');
            const top = this.getImageCached('labtop', 'events/labtop.png');
            const blueprintIdx = Math.max(1, Math.min(12, overlay.classIndex + 1));
            const blueprintName = `tech/blue-0${blueprintIdx}.png`;
            let blueprint = null;
            try { blueprint = pdg.res.getImage(blueprintName); } catch (e) { }
            const centerRect = this.toPDGRect({
                x: drawingArea.width() * 0.1,
                y: drawingArea.height() * 0.05,
                width: drawingArea.width() * 0.8,
                height: drawingArea.height() * 0.9
            });
            if (back) this.port.drawImage(back, centerRect, this.styles.image);
            if (blueprint) this.port.drawImage(blueprint, centerRect, this.styles.image);
            if (top) this.port.drawImage(top, centerRect, this.styles.image);
            this.port.drawText(this.STR.newDriveTechnology, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.1), this.getTextAttributes('yellow', 16, pdg.textStyle_Centered));
        } else if (overlay.type === 'stardock') {
            const back = this.getImageCached('stardock', 'events/newstardock.png');
            const front = this.getImageCached('stardockfront', 'events/newstardockfront.png');
            const base = this.getShipArtNameForClass(overlay.classIndex);
            let shipImg = null;
            try { shipImg = pdg.res.getImage(`ships/${base}.png`); } catch (e) {}
            const centerRect = this.toPDGRect({
                x: drawingArea.width() * 0.05,
                y: drawingArea.height() * 0.15,
                width: drawingArea.width() * 0.9,
                height: drawingArea.height() * 0.75
            });
            if (back) this.port.drawImage(back, centerRect, this.styles.image);
            if (shipImg) this.port.drawImage(shipImg, centerRect, this.styles.image);
            if (front) this.port.drawImage(front, centerRect, this.styles.image);
            const name = overlay.ship && overlay.ship.name ? overlay.ship.name.split('\t')[0] : this.getShipArtNameForClass(overlay.classIndex);
            this.port.drawText(I18n.formatString(571, 'New {0} Class Commissioned', name), new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.2), this.getTextAttributes('cyan', 16, pdg.textStyle_Centered));
        }
        // Footer hint
        this.port.drawText(this.STR.pressAnyKey, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.95), this.getTextAttributes('white', 12, pdg.textStyle_Centered));
    }
}

// Export the class
module.exports = Display;
