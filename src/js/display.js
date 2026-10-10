// Display functions for Galactica-4
// Contains all rendering and UI display logic

const Common = require('./common.js');
const Camera = require('./camera.js');
const MapScrollbars = require('./map-scrollbars.js');
const RetainedPanel = require('./retained-panel.js');
const SelectionPulse = require('./selection-pulse.js');
const I18n = require('./i18n.js');
const VisualEffects = require('./visual-effects.js');
const DestructionEffect = require('./destruction-effect.js');
const UIIcons = require('./ui-icons.js');
const ScannerLayer = require('./scanner-layer.js');
const PanelAppearance = require('./panel-appearance.js');
const WindowBehavior = require('./window-behavior.js');
const ButtonCaption=require('./button-caption.js');
const LanguageSettings = require('./language-settings.js');
const MapDisplayModes = require('./map-display-modes.js');
const ControlHelp = require('./hover-help.js');
const Tooltip = require('./tooltip.js');
const MapCursor=require('./map-cursor.js');

const debugSelectedObject = true;

class Display {
    constructor(game) {
        this.port = game.port;
        this.game = game;
        this.factory = game.getFactory();
        this.selectedObject = null;
        this.hoverPoint = null;
        this.mapCursor=new MapCursor(this.port);
        this.controlHelp = new ControlHelp.HoverHelp();
        this.hoverControl = null;
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
        this.uiIcons=new UIIcons();
        this.scannerLayer=new ScannerLayer();
        
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
        
        if(game.restoredFromSave){
            if(game.savedCamera){this.camera.setZoom(game.savedCamera.zoom);this.camera.panX=game.savedCamera.panX;this.camera.panY=game.savedCamera.panY;this.camera.updatePanLimits();}
            this.setSelectedObject(game.selectedObject);
        }
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
            dragZoomHelp: I18n.getString(548, "<Drag space / Alt+drag / Middle drag> Pan   <Wheel> Zoom"),
            production: I18n.getString(549, "Production"),
            menu: I18n.getString(550, "Menu"),
            events: I18n.getString(551, "Events"),
            compare: I18n.getString(552, "Compare Players"),
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
            pressAnyKey: I18n.getString(572, "Enter, Space or Esc to continue"),
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
            panelFill: PanelAppearance.colors.panelFill,
            windowFill: PanelAppearance.colors.windowFill,
            panelBorder: PanelAppearance.colors.panelBorder,
            buttonFill: [0.16, 0.21, 0.27, 0.98],
            buttonFillHover: [0.23, 0.31, 0.39, 1.0],
            buttonFillActive: [0.18, 0.29, 0.35, 1.0],
            buttonFillActiveHover: [0.24, 0.35, 0.42, 1.0],
            buttonBorder: [0.45, 0.58, 0.68, 0.65],
            divider: [0.34, 0.34, 0.36, 0.85],
            connector: [0.56, 0.56, 0.58, 0.50],
            barTrack: [0.22, 0.22, 0.23, 0.95],
            topInfoFill: [0.11, 0.11, 0.11, 0.86],
            textLight: [0.86, 0.89, 0.92, 1.0],
            textLabel: [0.64, 0.64, 0.66, 1.0],
            textHover: [0.96, 0.96, 0.98, 1.0],
            textMuted: [0.56, 0.56, 0.58, 1.0],
            gridLine: [0.25, 0.25, 0.5, 0.5],
            overlayDim: [0, 0, 0, 0.65],
            mapScaleLow: [.1,.1,.1,1],
            mapScaleHigh: [1,1,1,1],
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
            rendezvousMarker: this.createAttributes({lineStyle:pdg.lineStyle_None}),
            mapDisplayLegendScale: this.createAttributes(),
            starTwinkle: this.createAttributes({lineColor:new pdg.Color('white'),lineStyle:pdg.lineStyle_Solid}),
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
            comparisonStripe:this.createAttributes({fillColor:new pdg.Color(1,1,1,1),fillOpacity:.035,lineOpacity:0}),
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
        if(this.hasDrawn && !this.visualEffects.reducedMotion)this.camera.whipPanTo(galacticX,galacticY);
        else this.camera.centerOn(galacticX,galacticY);
    }
    
    resetView() {
        this.navigateCamera(()=>this.camera.resetView());
    }
    
    // Handle screen size changes
    onScreenSizeChanged() {
        this.camera.onScreenSizeChanged();
    }
    
    zoomToFit() {
        // Calculate the actual bounds of all game content
        const bounds = this.calculateContentBounds();
        if (bounds) {
            this.navigateCamera(()=>this.camera.zoomToFitBounds(bounds.minX,bounds.minY,bounds.maxX,bounds.maxY));
        } else {
            // Fallback to default zoom to fit
            this.navigateCamera(()=>this.camera.zoomToFit());
        }
    }
    
    navigateCamera(change) {
        const camera=this.camera;
        camera.stopWhipPan();
        const area=camera.getDrawingArea();
        const fromX=camera.toGalacticX(area.width()/2),fromY=camera.toGalacticY(area.height()/2);
        change();
        if(!this.hasDrawn || this.visualEffects.reducedMotion)return;
        const toX=camera.toGalacticX(area.width()/2),toY=camera.toGalacticY(area.height()/2);
        camera.centerOn(fromX,fromY);
        camera.whipPanTo(toX,toY);
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
        
        if(this.game && this.game.showNebula===false) {
            this.port.drawRect(drawingArea,this.styles.clear);
            return;
        }
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
            
            // Keep tile identities relative to the original image, including
            // negative offsets, so panning across a repeat never changes parity.
            const firstColumn=Math.floor(-offsetX/scaledWidth),firstRow=Math.floor(-offsetY/scaledHeight);
            for(let row=firstRow;;row++) {
                const y=offsetY+row*scaledHeight;
                if(y>=screenHeight)break;
                for(let column=firstColumn;;column++) {
                    const x=offsetX+column*scaledWidth;
                    if(x>=screenWidth)break;
                    if(x+scaledWidth<=0 || y+scaledHeight<=0)continue;
                    // Adjacent tiles meet at the same source edge (bookmatching).
                    const left=x+(column%2?scaledWidth:0),right=x+(column%2?0:scaledWidth);
                    const top=y+(row%2?scaledHeight:0),bottom=y+(row%2?0:scaledHeight);
                    this.port.drawImage(this.backgroundImage,new pdg.Quad(new pdg.Point(left,top),
                        new pdg.Point(right,top),new pdg.Point(right,bottom),new pdg.Point(left,bottom)),this.styles.image);
                }
            }

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
        const humanPlayer = this.game.getCurrentHumanPlayer() || 1;
        
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
        if (star.owner && this.isStarOwnerKnown(star)) {
            const ownerColor = this.ownerColors[star.owner];
            const attrs = this.createAttributes({
                fillColor: ownerColor,
                fillOpacity: 0.25*this.getMapDisplayBrightness(star,true)
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
        const brightness=this.visualEffects.starBrightness(star.id,this.getVisualTime())*this.getMapDisplayBrightness(star,true);
        for(const shade of [centerColor,edgeColor]) {
            shade.red*=brightness;shade.green*=brightness;shade.blue*=brightness;
        }
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
        
        const twinkle=this.starTwinkle && this.starTwinkle.id===star.id?this.starTwinkle.strength*this.getMapDisplayBrightness(star,true):0;
        if(twinkle>0) {
            const glow=this.styles.starTwinkle;
            const reach=scaledRadius+4;
            glow.fillRadialGradient(new pdg.Point(screenX,screenY),new pdg.Color(1,1,1,0.45*twinkle),
                reach,new pdg.Color(1,1,1,0));
            // A soft halo and short glint brighten the star without changing its hit area.
            glow.lineOpacity(0);
            this.port.drawCircle(new pdg.Point(screenX,screenY),reach,glow);
            glow.lineOpacity(0.75*twinkle);
            this.port.drawLine(new pdg.Point(screenX-reach,screenY),new pdg.Point(screenX+reach,screenY),glow);
            this.port.drawLine(new pdg.Point(screenX,screenY-reach),new pdg.Point(screenX,screenY+reach),glow);
        }
        const isHomeSystem = this.isHomeSystem(star);

        // Draw star name with fading based on star size, but never dim home system names
        const nameOpacity = isHomeSystem || star.namedStar ? 1.0 : this.mapEntityNameOpacity;
        if (star!==this.game.renameTarget && nameOpacity > 0 && this.game.showMapNames!==false) {
            color = 'gray';
            if (star.population > 0 && visibilityLevel > Common.VisibilityLevel.NONE) {
                color = 'white';
            }
            const textColor = new pdg.Color(color);
            textColor.alpha = nameOpacity*Math.max(.35,this.getMapDisplayBrightness(star,true)); // Apply fading
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
    
    drawDecorativeStars() {
        const screen=this.getScreenSize();
        const bounds={left:this.camera.toGalacticX(0),top:this.camera.toGalacticY(0),
            right:this.camera.toGalacticX(screen.width),bottom:this.camera.toGalacticY(screen.height)};
        if(!this.decorativeStarStyles)this.decorativeStarStyles=[.24,.29,.34,.39].map(tone=>
            this.createAttributes({fillColor:new pdg.Color(tone*.9,tone*.95,tone),lineStyle:pdg.lineStyle_None}));
        for(const star of this.visualEffects.decorativeStars(bounds,this.mapWidth,this.mapHeight)) {
            this.port.drawCircle(new pdg.Point(this.toScreenX(star.x),this.toScreenY(star.y)),
                Math.max(.65,Math.min(1.25,.8*Math.sqrt(this.camera.zoom))),this.decorativeStarStyles[star.tone]);
        }
    }

    // Draw all stars
    drawStars(stars) {
        const screen=this.getScreenSize();
        const visibleIds=stars.filter(star=>{
            const x=this.toScreenX(star.x),y=this.toScreenY(star.y);
            return x>=0 && x<=screen.width && y>=0 && y<=screen.height;
        }).map(star=>star.id);
        this.starTwinkle=this.visualEffects.twinkleFrame(visibleIds,this.getVisualTime());
        for (const star of stars) {
            // Always show all stars, but with different visibility levels
            this.drawStar(star);
        }
    }
    
    isPatrolHiddenOnMap(object) {
        return object!==this.selectedObject && !!object.star && object.isOnPatrol &&
            object.isOnPatrol() && !object.destination;
    }

    getScannerPresentation() {
        const viewer=this.game.getCurrentHumanPlayer() || 1,screen=this.getScreenSize(),groups=new Map(),rings=[];
        const objects=[...this.game.stars,...this.game.allShips.filter(ship=>!ship.fleet),...this.game.allFleets];
        for(const object of objects) {
            const isStar=this.game.getObjectType(object)===Common.ObjectType.STAR;
            if(!object.owner || !isStar && !this.isMobileVisibleOnMap(object))continue;
            const full=this.isOmniscientMode() || this.game.isOwnerAlliedWith(viewer,object.owner);
            const level=this.getVisibilityLevelForPlayer(object,viewer);
            if(!full && level<(isStar?Common.VisibilityLevel.TECH:Common.VisibilityLevel.SPEED))continue;
            const radius=object.getScannerRange()*this.camera.scale*this.camera.zoom;
            if(!Number.isFinite(radius) || radius<=0)continue;
            const x=this.toScreenX(object.x),y=this.toScreenY(object.y);
            if(x+radius*4<0 || x-radius*4>screen.width || y+radius*4<0 || y-radius*4>screen.height)continue;
            const selected=object===this.selectedObject,color=this.ownerColors[object.owner] || new pdg.Color('white');
            if(isStar && this.game.showScannerRanges!==false) {
                if(!groups.has(object.owner))groups.set(object.owner,{owner:object.owner,color,circles:[]});
                groups.get(object.owner).circles.push({x,y,radius});
            }
            const ordinary=!isStar && !(object.course && object.course.loop);
            if(selected || ordinary && this.game.showScannerRanges!==false) {
                for(let index=0;index<(selected?3:1);index++)rings.push({object,x,y,radius:radius*2**index,color,opacity:(selected?.4:.1)/2**index});
            }
        }
        return {groups:[...groups.values()],rings};
    }

    drawScannerRanges() {
        const {groups,rings}=this.getScannerPresentation(),screen=this.getScreenSize();
        this.scannerLayer.draw(this.port,groups,screen.width,screen.height,this.game.showNebula!==false);
        if(!this.scannerRingStyle)this.scannerRingStyle=this.createAttributes({lineStyle:pdg.lineStyle_Solid,lineThickness:1,fillOpacity:0});
        for(const ring of rings) {
            this.scannerRingStyle.lineColor(new pdg.Color(ring.color.red,ring.color.green,ring.color.blue,1)).lineOpacity(ring.opacity);
            this.port.drawCircle(new pdg.Point(ring.x,ring.y),ring.radius,this.scannerRingStyle);
        }
    }

    isMobileVisibleOnMap(object) {
        const ship=this.factory.isShip(object);
        if(ship && (object.fleet || object.isDead() || object.underConstruction() || object.type==='defense'))return false;
        if(!ship && this.factory.isFleet(object) && (object.fleet || object.isEmpty()))return false;
        const threshold=ship?.20:.15;
        if(this.camera.zoom<threshold && object!==this.selectedObject)return false;
        const viewer=this.game.getCurrentHumanPlayer() || 1;
        if(!this.isEntityVisibleToPlayer(object,viewer) && !this.game.isOwnerAlliedWith(viewer,object.owner))return false;
        if(this.game.showShips===false && object!==this.selectedObject)return false;
        return !this.isPatrolHiddenOnMap(object);
    }

    drawMobileMapName(object,x,y,radius,docked) {
        if(object===this.game.renameTarget || this.game.showMapNames===false || this.camera.zoom<.5 || docked && object!==this.selectedObject)return;
        const viewer=this.game.getCurrentHumanPlayer() || 1;
        if(!this.isOmniscientMode() && !this.game.isOwnerAlliedWith(viewer,object.owner)
            && this.getVisibilityLevelForPlayer(object,viewer)<Common.VisibilityLevel.CLASS)return;
        const opacity=(object===this.selectedObject?1:this.mapEntityNameOpacity)*this.getMapDisplayBrightness(object);
        if(opacity<=0)return;
        const color=new pdg.Color('white');color.alpha=opacity;
        this.port.drawText(this.fitShipDiagnosticText(this.game.getObjectDisplayName(object),160,10),
            new pdg.Point(x,y+radius+12),this.createAttributes({fillColor:color,textSize:10,textStyle:pdg.textStyle_Centered}));
    }

    // Draw a single ship
    drawShip(ship) {
        if(!this.isMobileVisibleOnMap(ship))return;
        const marker=this.getMapMarker(ship);
        const {x,y}=marker;
        const zoom=this.camera.zoom,selected=ship===this.selectedObject;
        const shipOpacity=(selected?1:this.mapEntityNameOpacity)*this.getMapDisplayBrightness(ship);
        const frameRadius = marker.radius;
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

        this.drawMobileMapName(ship,x,y,frameRadius,!!ship.star);
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
        const humanPlayer = this.game.getCurrentHumanPlayer() || 1;
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
            if (this.isMobileVisibleOnMap(ship)) {
                this.drawShip(ship);
            }
        }
        
        if (shipsUnderConstructionDrawn > 0 || shipsUnderConstructionSkipped > 0) {
            //console.log(`🎨 DRAWING SUMMARY: ${shipsUnderConstructionDrawn} ships under construction drawn, ${shipsUnderConstructionSkipped} skipped`);
        }
    }
    
    // Draw a single fleet
    drawFleet(fleet) {
        if(!this.isMobileVisibleOnMap(fleet))return;
        const marker=this.getMapMarker(fleet);
        const {x,y}=marker,selected=fleet===this.selectedObject;
        const fleetOpacity=(selected?1:this.mapEntityNameOpacity)*this.getMapDisplayBrightness(fleet);
        const fleetAtStar=!!fleet.star || this.game.stars.some(star=>Math.abs(star.x-fleet.x)<5 && Math.abs(star.y-fleet.y)<5);
        const knowledge=this.getFleetKnowledge(fleet);
        const fleetSize=knowledge.contents?fleet.getSize():0,hexRadius=marker.radius;
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
            fillColor: knowledge.tech ? this.ownerColors[fleet.owner] : this.getUIColor('gray'),
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
        
        this.drawMobileMapName(fleet,x,y,hexRadius,!!fleetAtStar);
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
        const humanPlayer = this.game.getCurrentHumanPlayer() || 1;
        
        for (const fleet of fleets) {
            // Always show own fleets, only show enemy fleets if visible
            if (this.isMobileVisibleOnMap(fleet)) {
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
        const opacity = selected ? 1.0 : Math.max(0.85, this.mapEntityNameOpacity || 0);
        const owner = this.ownerColors[rendezvous.owner] || new pdg.Color('white');
        const pulse=this.visualEffects.rendezvousPulse(this.getVisualTime());
        const blend=0.5*pulse;
        const color=new pdg.Color(owner.red*(1-blend)+blend,
            owner.green*(1-blend)+blend,owner.blue*(1-blend)+blend,opacity);
        const attrs=this.styles.rendezvousMarker.fillColor(color);
        const radius = Math.max(7, (this.scaledShipRadius || Common.ShipRadius) + 3);
        // Filled strokes stay three pixels thick even where WebGL ignores line width.
        for(const direction of [-1,1]) {
            const from=new pdg.Point(x-radius,y-direction*radius),to=new pdg.Point(x+radius,y+direction*radius);
            const length=Math.hypot(to.x-from.x,to.y-from.y),nx=-(to.y-from.y)/length*1.5,ny=(to.x-from.x)/length*1.5;
            const stroke=new pdg.Polygon(new pdg.Point(from.x+nx,from.y+ny),new pdg.Point(to.x+nx,to.y+ny),
                new pdg.Point(to.x-nx,to.y-ny),new pdg.Point(from.x-nx,from.y-ny));
            try{this.port.drawPolygon(stroke,attrs);}finally{if(typeof stroke.delete==='function')stroke.delete();}
            this.port.drawCircle(from,1.5,attrs);this.port.drawCircle(to,1.5,attrs);
        }

        if (selected) {
            const pulse = this.selectionPulse.sample(pdg.tm.getMilliseconds());
            this.port.drawCircle(new pdg.Point(x, y), radius + 6 + pulse, this.styles.selectionFrame);
        }

        if (rendezvous!==this.game.renameTarget && opacity > 0.3 && this.game.showMapNames!==false) {
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
        if(color==='comparisonBest')return new pdg.Color(.35,.65,1);
        if(color==='comparisonWorst')return new pdg.Color(1,.42,.42);
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
        this.port.drawText(text, new pdg.Point(x, y), this.getTextAttributes(this.isSystemWindowDrawing()?'black':color, size, style));
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
        const base=this.getUIColor(attrs===this.styles.windowPanel?'windowFill':attrs===this.styles.topInfoPanel?'topInfoFill':'panelFill');
        const color=this.panelStyleColors.get(attrs) || base;
        PanelAppearance.applySurface(attrs,rect,color,this.panelStyleColors.has(attrs)?base:color,
            this.panelStyleColors.has(attrs)?0.022:0.075);
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
        if(!this.isSystemWindowDrawing()){this.drawPanel(rect,title,null,this.styles.windowPanel);return;}
        const attrs=this.systemPanelStyle || (this.systemPanelStyle=this.createAttributes({lineColor:new pdg.Color(.75,.53,.12,1)}));
        PanelAppearance.applySystemSurface(attrs,rect);
        this.drawRoundedRect(rect,14,attrs);
        const highlight=this.systemGoldHighlight || (this.systemGoldHighlight=this.createAttributes({lineColor:new pdg.Color(1,.91,.58,.95)}).lineThickness(1));
        const shade=this.systemGoldShade || (this.systemGoldShade=this.createAttributes({lineColor:new pdg.Color(.52,.33,.06,.9)}).lineThickness(1));
        PanelAppearance.drawGoldEdges(this.port,rect,highlight,shade);
        if(title){this.drawTextLine(title,rect.x+16,rect.y+22,'black',14);this.drawDivider(rect.x+14,rect.y+28,rect.width-28);}

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

        const owner=this.getOwnerPanelStyle(object),base=this.getUIColor('panelFill');
        const top=owner && this.panelStyleColors.get(owner) || base;
        const lift=owner?0.022:0.075;
        const fill=this.inspectorPointerFill || (this.inspectorPointerFill=this.createAttributes());
        PanelAppearance.applySurface(fill,rect,top,base,lift);
        fill.lineStyle(pdg.lineStyle_None);
        const points=pointer.points.map((point,index)=>new pdg.Point(point.x+(index===1?0:pointer.side==='left'?1:-1),point.y));
        this.port.drawPolygon(new pdg.Polygon(...points),fill);
        // Cover the old straight edge, then outline only the two exposed sides.
        const amount=(pointer.centerY-rect.y)/rect.height;
        const seam=this.inspectorPointerSeam || (this.inspectorPointerSeam=this.createAttributes({lineStyle:pdg.lineStyle_None}));
        seam.fillColor(new pdg.Color((top.red+lift)*(1-amount)+base.red*amount,
            (top.green+lift)*(1-amount)+base.green*amount,(top.blue+lift)*(1-amount)+base.blue*amount,1));
        const sideX=pointer.points[0].x;
        this.port.drawRect(new pdg.Rect(new pdg.Point(sideX-.5,pointer.centerY-10),1,20),seam);
        const border=this.inspectorPointerBorder || (this.inspectorPointerBorder=this.createAttributes({lineStyle:pdg.lineStyle_Solid}).lineThickness(.7));
        border.lineColor(borderColor?new pdg.Color(borderColor):owner?PanelAppearance.ownerBorder(this.ownerColors[object.owner]):this.getUIColor('panelBorder'));
        this.port.drawLine(pointer.points[0],pointer.points[1],border);
        this.port.drawLine(pointer.points[1],pointer.points[2],border);
    }

    getOwnerPanelStyle(object) {
        if(!object || object.owner<=0)return null;
        const viewer=this.game.getCurrentHumanPlayer() || 1;
        const known=this.game.factory.isStar(object)?this.isStarOwnerKnown(object):
            (this.game.factory.isShip(object) || this.game.factory.isFleet(object)) && (this.game.config.omniscient ||
                this.game.isOwnerAlliedWith(viewer,object.owner) || object.getVisibilityTo(viewer)>=Common.VisibilityLevel.TECH);
        if(!known)return null;
        if(!this.ownerPanelStyles.has(object.owner))this.ownerPanelStyles.set(object.owner,this.createAttributes({lineColor:this.getUIColor('panelBorder')}));
        const style=this.ownerPanelStyles.get(object.owner);
        const base=this.getUIColor('panelFill'),owner=this.ownerColors[object.owner] || this.getUIColor('panelBorder');
        const tint=new pdg.Color(base.red*0.94+owner.red*0.06,base.green*0.94+owner.green*0.06,base.blue*0.94+owner.blue*0.06,base.alpha);
        style.fillColor(tint).lineColor(PanelAppearance.ownerBorder(owner));
        this.panelStyleColors.set(style,tint);
        return style;
    }

    drawAnchoredPanel(object, rect, title = null, borderColor = null) {
        this.drawPanel(rect,title,borderColor,this.getOwnerPanelStyle(object));
        this.drawPanelPointer(object, rect, borderColor);
    }

    fitWindowToScreen(name,rect) {
        const positions=this.game.windowPositions || (this.game.windowPositions={});
        if(!Object.prototype.hasOwnProperty.call(positions,name))positions[name]=WindowBehavior.isSystem(name) && this.game.drawingPreferences && this.game.drawingPreferences.readWindowPosition?
            this.game.drawingPreferences.readWindowPosition(name):null;
        const position=positions[name];
        if(position)rect={...rect,x:position.x,y:position.y};
        return WindowBehavior.constrain(rect,this.getScreenSize());
    }

    isSystemWindowDrawing(){return this.drawingActiveWindow && WindowBehavior.isSystem(this.game.uiWindow);}

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

    getMapMarker(object) {
        const type=this.game.getObjectType(object);
        if([Common.ObjectType.SHIP,Common.ObjectType.FLEET].includes(type) && !this.isMobileVisibleOnMap(object))return null;
        if(type===Common.ObjectType.RENDEZVOUS && object.owner!==(this.game.getCurrentHumanPlayer() || 1) && !this.isOmniscientMode())return null;
        const position=this.getObjectScreenPosition(object);
        const starRadius=this.scaledStarRadius || Common.StarRadius,shipRadius=this.scaledShipRadius || Common.ShipRadius;
        const radius=type===Common.ObjectType.STAR?starRadius:type===Common.ObjectType.SHIP?shipRadius+1:
            type===Common.ObjectType.FLEET?shipRadius*1.5+(this.getFleetKnowledge(object).contents?object.getSize()*.5:0):8;
        return {...position,radius,type,height:radius*(type===Common.ObjectType.STAR?1.25:1)};
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
        return this.fitWindowToScreen('inspector',{ x, y, width, height });
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
        this.uiIcons.draw(this.port,name,x,y,size,this.isSystemWindowDrawing()?new pdg.Color('black'):this.getUIColor('textLight'));
    }

    getButtonWidth(label,hotkey=null,options={}) {
        const measure=(text,size)=>typeof this.port.getTextWidth==='function'?this.port.getTextWidth(text,size):Array.from(text).length*size*.62;
        if(options.iconOnly){const hint=ButtonCaption.parts(label,hotkey).key;return Math.ceil(Math.max(options.minWidth || 44,14+(hint?measure(hint,9)+22:0)));}
        return Math.max(options.minWidth || 0,ButtonCaption.width(label,hotkey,measure,options));
    }

    layoutButtonRow(buttons,{x,y,width,height=26,size=11,gap=8,minWidth=50}) {
        let offset=0,row=0;
        const regions=buttons.map(button=>{
            const buttonWidth=this.getButtonWidth(button.label,button.key,{size,minWidth,icon:button.icon});
            if(offset && offset+buttonWidth>width){offset=0;row++;}
            const rect={x:x+offset,y:y+row*(height+gap),width:buttonWidth,height};
            offset+=buttonWidth+gap;
            return {...button,rect};
        });
        return {regions,rows:buttons.length?row+1:0};
    }

    drawUIButton(rect, label, hotkey = null, options = {}) {
        const drawRect = this.snapRectToPixels(rect);
        const active = !!options.active;
        const hovered = this.isHovered(drawRect);
        if (hovered) this.hoverControl={rect:drawRect,label:options.tooltipLabel || ButtonCaption.tooltip(label,hotkey)};
        let fillColorName = active ? 'buttonFillActive' : 'buttonFill';
        if (hovered) {
            fillColorName = active ? 'buttonFillActiveHover' : 'buttonFillHover';
        }
        const light=this.isSystemWindowDrawing();
        const style=light?(this.systemButtonStyle || (this.systemButtonStyle=this.createAttributes({lineColor:new pdg.Color(.32,.29,.20,.5)}))):this.styles[fillColorName];
        const color=light?new pdg.Color(active ? .70 : hovered ? .94 : .86,active ? .73 : hovered ? .94 : .86,active ? .75 : hovered ? .92 : .85,1):this.getUIColor(fillColorName);
        style.fillGradient(new pdg.Point(drawRect.x,drawRect.y),new pdg.Color(color.red+0.016,color.green+0.016,color.blue+0.016,color.alpha),new pdg.Point(drawRect.x,drawRect.y+drawRect.height),color);
        style.lineStyle(pdg.lineStyle_Solid).lineThickness(0.6);
        if(!options.bare)this.drawRoundedRect(drawRect, options.radius || 10, style);
        const caption=ButtonCaption.layout(drawRect,label,hotkey,(text,size)=>this.port.getTextWidth(text,size),options);
        if(caption.key)this.drawTextLine(caption.key,caption.keyX,Math.round(drawRect.y+drawRect.height/2+3),
            'labelgray',9,pdg.textStyle_RightJustified);
        if(options.icon){
            const iconX=options.iconOnly?Math.round(drawRect.x+(drawRect.width-caption.hintWidth)/2):drawRect.x+18;
            this.drawUIIcon(options.icon,iconX,drawRect.y+drawRect.height/2);
            if(options.iconOnly){
                if(hovered)this.iconHint={rect:drawRect,inWindow:!!this.drawingActiveWindow,label:ButtonCaption.tooltip(label,hotkey)};
                return;
            }
        }
        this.drawTextLine(caption.label,caption.labelX,Math.round(drawRect.y+drawRect.height/2+4),
            hovered?'hovergray':'lightgray',options.size || 11,
            pdg.textStyle_Centered | (options.bold?pdg.textStyle_Bold:0));
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
            { key: 'L', label: this.STR.fleets, window: 'fleets', action: { type: 'toggleWindow', window: 'fleets' } },
            { key: 'U', label: this.STR.rendezvous, action: { type: 'beginRendezvousPlacement' } },
            { key: 'Tab', label: I18n.getString(743,'Next item')+` (${this.game.attention.pending().length})`, action: { type: 'nextAttention' } },
            { key: 'Enter', label: this.STR.endTurn, action: { type: 'endTurn' } },
            { key: '-',icon:'zoom-out',label:I18n.getString(788,'Zoom out'),action:{type:'zoomOut'} },
            { key: '+',icon:'zoom-in',label:I18n.getString(787,'Zoom in'),action:{type:'zoomIn'} },
            { key: 'Home', icon:'home', label: this.STR.home, action: { type: 'selectHomeStar' } },
            { key: '0', icon:'fit', label: this.STR.fit, action: { type: 'zoomToFit' } }
        ];
    }

    getMapButtonRegions() {
        const screen = this.getScreenSize();
        const buttons = this.getMapButtonDefinitions();

        const gap=8,buttonHeight=30,iconWidth=44,iconGap=6;
        const textButtons=buttons.filter(button=>!button.icon);
        const iconButtons=buttons.filter(button=>button.icon);
        let widths=[0,0];
        textButtons.forEach((button,index)=>widths[index%2]=Math.max(widths[index%2],
            this.getButtonWidth(button.label,button.key,{minWidth:98})));
        const cols=widths[0]+widths[1]+gap>screen.width-32?1:2;
        if(cols===1)widths=[Math.max(...widths)];
        const rows=Math.ceil(textButtons.length/cols),totalWidth=widths.reduce((a,b)=>a+b,0)+(cols-1)*gap;
        const iconY=screen.height-buttonHeight-16;
        const startX=screen.width-totalWidth-16,startY=iconY-rows*(buttonHeight+gap);
        const rectangles=new Map();
        textButtons.forEach((button,index)=>rectangles.set(button,{
            x:Math.round(startX+(index%cols?widths[0]+gap:0)),
            y:Math.round(startY+Math.floor(index/cols)*(buttonHeight+gap)),
            width:index===textButtons.length-1 && index%cols===0?totalWidth:widths[index%cols],
            height:buttonHeight}));
        const iconWidths=iconButtons.map(button=>this.getButtonWidth(button.label,button.key,{iconOnly:true,minWidth:iconWidth}));
        let iconX=screen.width-iconWidths.reduce((sum,width)=>sum+width,0)-(iconButtons.length-1)*iconGap-16;
        iconButtons.forEach((button,index)=>{rectangles.set(button,{x:iconX,y:iconY,width:iconWidths[index],height:buttonHeight});iconX+=iconWidths[index]+iconGap;});
        return buttons.map(button=>({...button,rect:rectangles.get(button)}));
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
            actions.push(
                { key: 'S', label: this.STR.scoutName, action: { type: 'buildShip', shipType: 'scout' } },
                { key: 'D', label: this.STR.defenseName, action: { type: 'buildShip', shipType: 'defense' } },
                { key: 'B', label: this.STR.battleshipName, action: { type: 'buildShip', shipType: 'battleship' } },
                { key: 'C', label: this.STR.colonyName, action: { type: 'buildShip', shipType: 'colony' } }
            );
        } else if (objectType === Common.ObjectType.SHIP || objectType === Common.ObjectType.FLEET) {
            if (this.game.canHumanControl(object)) {
                if (this.game.canEditCourse(object)) actions.push({ key: 'O', label: this.STR.orders, action: { type: 'beginOrders' } });
                if (this.game.canEditCourse(object) && object.destination) {
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
                        { key: 'U', label: this.STR.rendezvous, action: { type: 'beginRendezvousPlacement' } });
                }
            }
            if (this.game.canViewCourse(object)) actions.push({key:'G',label:I18n.getString(726,'Course'),action:{type:'showCourse'}});
            actions.push(
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } }
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
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } }
            );
        } else {
            actions.push(
                { key: 'C', label: this.STR.center, action: { type: 'centerObject' } }
            );
        }

        if(this.factory.isFleet(object) && object.fleet && this.getFleetKnowledge(object.fleet).contents)
            actions.push({key:null,label:I18n.getString(798,'Parent fleet'),action:{type:'selectFleetParent'}});
        if(this.factory.isStar(object) && this.game.canViewSystemShips(object) && this.game.getSystemShipRows(object).length)
            actions.push({key:null,label:I18n.getString(688,'Ships in system'),action:{type:'showSystemShips',star:object}});
        if(this.game.canViewFleetExchange(object) && this.game.getFleetExchangeMembers(object).length)
            actions.push({key:null,label:I18n.getString(801,'Exchange ships'),action:{type:'showFleetExchange',container:object}});
        return actions;
    }

    getContextButtonArc(object, panelRect) {
        const actions = this.getContextActions(object);
        const position = this.getObjectScreenPosition(object);
        const screen=this.getScreenSize();
        if(position.x<0 || position.x>=screen.width || position.y<0 || position.y>=screen.height)return [];
        const panelIsLeftOfObject = (panelRect.x + panelRect.width / 2) < position.x;
        const direction = panelIsLeftOfObject ? 1 : -1;
        const widths=actions.map(action=>this.getButtonWidth(action.label,action.key,{size:10,minWidth:96}));
        const baseDistance=Math.max(116,Math.max(...widths)/2+50);
        const buttonHeight = 28;
        const verticalSpacing = 36;
        const curveDepth = 3;
        const middle = (actions.length - 1) / 2;

        return actions.map((action, index) => {
            const offsetIndex = index - middle;
            const buttonWidth=widths[index];
            const centerX = Math.round(this.clamp(position.x + direction * (baseDistance - Math.abs(offsetIndex) * curveDepth),
                10+buttonWidth/2,screen.width-10-buttonWidth/2));
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
            const fleetSize = this.getFleetKnowledge(object).contents && object.getSize ? object.getSize() : 0;
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
                tooltipLabel:button.action.type==='buildShip'?I18n.formatString(961,'Switch to building {0}',button.label):null,
                active: button.action.type==='toggleScrap'?object.isToBeScrapped():
                    button.action.type==='togglePatrol'?object.isOnPatrol():
                    button.action.type === 'buildShip' && !!object.currentShip &&
                    object.currentShip.type === button.action.shipType });
        }
    }

    getFleetKnowledge(fleet) {
        const viewer = this.game.getCurrentHumanPlayer() || 1;
        const full = this.isOmniscientMode() || this.game.isOwnerAlliedWith(viewer, fleet.owner);
        const level = full ? Common.VisibilityLevel.DETAILS : fleet.getVisibilityTo(viewer);
        return { full, level, tech: level >= Common.VisibilityLevel.TECH,
            contents: level >= Common.VisibilityLevel.CLASS };
    }

    getFleetDiagnostics(fleet) {
        fleet.calculateFleetStats();
        const knowledge = this.getFleetKnowledge(fleet);
        return {
            knowledge,
            title: knowledge.contents ? this.game.getObjectDisplayName(fleet) : I18n.getString(591, 'Fleet'),
            count: knowledge.contents ? String(fleet.getSize()) : '?',
            power: knowledge.contents ? I18n.formatInteger(fleet.totalPower) : '?',
            speed: knowledge.level >= Common.VisibilityLevel.SPEED ?
                (fleet.totalSpeed ? I18n.formatDecimal(fleet.totalSpeed / 16380) : '-') : '?',
            tech: knowledge.tech ? I18n.formatInteger(fleet.techLevel) : '?'
        };
    }

    getFleetDetailsLayout(fleet) {
        const knowledge = this.getFleetKnowledge(fleet);
        const members = knowledge.contents ? fleet.ships || [] : [];
        const transferTargets = this.game.getFleetTransferTargets ? this.game.getFleetTransferTargets(fleet) : [];
        const shipTypes = {};
        for (const ship of knowledge.contents ? fleet.getLeafShips() : []) shipTypes[ship.type] = (shipTypes[ship.type] || 0) + 1;
        const compositionRows = Object.entries(shipTypes);
        const memberRowHeight = 34;
        const destinationHeight = knowledge.full && fleet.destination ? 18 : 0;
        const patrolHeight=(fleet.isOnPatrol() || fleet.isToBeScrapped()) && this.game.canViewCourse(fleet)?18:0;
        const baseHeight = 170 + compositionRows.length*16 + destinationHeight + patrolHeight;
        const screen=this.getScreenSize();
        const pageSize=Math.max(1,Math.min(6,Math.floor((screen.height-90-baseHeight-32-36)/memberRowHeight)));
        const pages=Math.max(1,Math.ceil(members.length/pageSize));
        const page=Math.max(0,Math.min(Number.isInteger(this.game.fleetMemberPage)?this.game.fleetMemberPage:0,pages-1));
        const visibleShips=members.slice(page*pageSize,(page+1)*pageSize);
        const memberHeight=visibleShips.length ? 32+visibleShips.length*memberRowHeight : 0;
        const height=baseHeight+memberHeight+(pages>1?36:0);
        const rect=this.getAnchoredPanelRect(fleet,Math.min(350,screen.width-40),height);
        rect.y=this.clamp(rect.y,80,screen.height-height-10);
        return {
            rect,
            visibleShips,transferTargets,compositionRows,memberRowHeight,patrolHeight,knowledge,
            page,pageSize,pages,
            memberStartOffset:18+18+18+22+compositionRows.length*16+destinationHeight+patrolHeight+46
        };
    }

    getFleetMemberPageRegions(fleet,layout=this.getFleetDetailsLayout(fleet)) {
        if(layout.pages<2)return [];
        const rect=layout.rect,y=rect.y+rect.height-34;
        const regions=[];
        if(layout.page>0)regions.push({rect:{x:rect.x+12,y,width:this.getButtonWidth(I18n.getString(690,'Previous'),null,{size:10,minWidth:80}),height:24},
            label:I18n.getString(690,'Previous'),action:{type:'fleetMemberPage',fleet,page:layout.page-1}});
        if(layout.page<layout.pages-1){
            const label=I18n.getString(691,'Next'),width=this.getButtonWidth(label,null,{size:10,minWidth:80});
            regions.push({rect:{x:rect.x+rect.width-12-width,y,width,height:24},label,action:{type:'fleetMemberPage',fleet,page:layout.page+1}});
        }
        return regions;
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
        return this.fitWindowToScreen('endTurnConfirm',{x:(screen.width-440)/2,y:120,width:440,height:160});
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

    getCommandWindowHeight() {
        return (this.game.canStartTutorial()?34:0)+(this.game.manualCommands?34:0)+(this.game.sessionCommands?68:0)+(this.game.fileCommands?34:0)+(this.game.fullscreen && this.game.fullscreen.supported ? (this.game.fullscreen.error?438:396):362);
    }

    getCommandWindowRect() {
        const screen = this.getScreenSize();
        return this.fitWindowToScreen('menu',{ x: screen.width - 320, y: 54, width: Math.min(300,screen.width-20), height: Math.min(screen.height-20,this.getCommandWindowHeight()) });
    }

    getProductionWindowRect() {
        const screen = this.getScreenSize();
        return this.fitWindowToScreen('production',{ x: screen.width - 440, y: 84, width: 420, height: 184 });
    }

    getEventWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(480,screen.width-40);
        return this.fitWindowToScreen('events',{x:screen.width-width-20,y:64,width,height:Math.min(500,screen.height-80)});
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
        if(l.selected && l.selected.outcome)controls.push({rect:{x:r.x+r.width-174,y:r.y+r.height-36,width:160,height:24},
            label:I18n.getString(835,'View report'),key:'Enter',action:{type:'replayOutcome',event:l.selected}});
        else if(this.game.hasReplayableReport(l.selected))controls.push({rect:{x:r.x+r.width-174,y:r.y+r.height-36,width:160,height:24},
            label:I18n.getString(835,'View report'),key:'Enter',action:{type:'replayReport',event:l.selected}});
        else if(l.selected && this.game.getEventFocus(l.selected))controls.push({rect:{x:r.x+r.width-174,y:r.y+r.height-36,width:160,height:24},
            label:I18n.getString(749,'Go to'),key:'Enter',action:{type:'goToEvent',event:l.selected}});
        if(l.detailPage>0)controls.push({rect:{x:r.x+14,y:r.y+r.height-70,width:90,height:24},label:I18n.getString(690,'Previous'),action:{type:'eventDetailPage',page:l.detailPage-1}});
        if(l.detailPage<l.detailPages-1)controls.push({rect:{x:r.x+110,y:r.y+r.height-70,width:90,height:24},label:I18n.getString(691,'Next'),action:{type:'eventDetailPage',page:l.detailPage+1}});
        return controls;
    }

    getPlayerComparisonLayout() {
        const screen=this.getScreenSize(),width=Math.min(1000,screen.width-32),rows=this.game.getPlayerComparisonRows();
        const pageSize=Math.max(1,Math.floor((screen.height-210)/26)),pages=Math.max(1,Math.ceil(rows.length/pageSize));
        const page=this.clamp(this.game.playerComparisonPage,0,pages-1);this.game.playerComparisonPage=page;
        const visibleRows=rows.slice(page*pageSize,(page+1)*pageSize);
        const rect=this.fitWindowToScreen('comparison',{x:(screen.width-width)/2,y:82,width,height:156+Math.max(1,visibleRows.length)*26});
        let offset=14;
        const fields=[['name',537,'Player',160],['stars',null,this.STR.stars.replace(/:$/,''),45],
            ['population',711,'Population|×1000',100],['production',712,'Production',75],
            ['minimumTech',812,'System|Min',40],['maxTech',813,'System|Max',40],['averageTech',814,'System|Avg',40],
            ['ships',null,this.STR.ships.replace(/:$/,''),45],['power',16,'Power',65],
            ['minimumShipTech',815,'Ship|Min',40],['maximumShipTech',816,'Ship|Max',40],['averageShipTech',817,'Ship|Avg',40]];
        const total=fields.reduce((sum,field)=>sum+field[3],0);
        const columns=fields.map(([key,id,fallback,weight])=>{const column={key,label:id?I18n.getString(id,fallback).replace(/:$/,''):fallback,offset,width:(width-28)*weight/total};offset+=column.width;return column;});
        return {rect,page,pages,pageSize,rows,visibleRows,columns,extrema:this.game.getPlayerComparisonExtrema(rows)};
    }

    getComparisonWindowRect() {return this.getPlayerComparisonLayout().rect;}

    getPlayerComparisonActionRegions() {
        if(this.game.uiWindow!=='comparison')return [];
        const layout=this.getPlayerComparisonLayout(),rect=layout.rect,regions=[];
        if(layout.page>0)regions.push({rect:{x:rect.x+14,y:rect.y+rect.height-36,width:150,height:24},label:I18n.getString(690,'Previous'),action:{type:'playerComparisonPage',page:layout.page-1}});
        if(layout.page<layout.pages-1)regions.push({rect:{x:rect.x+rect.width-164,y:rect.y+rect.height-36,width:150,height:24},label:I18n.getString(691,'Next'),action:{type:'playerComparisonPage',page:layout.page+1}});
        regions.push({rect:{x:rect.x+rect.width/2-75,y:rect.y+rect.height-36,width:150,height:24},label:this.STR.escClose,action:{type:'closePlayerComparison'}});
        return regions;
    }

    getPlayerComparisonCellColor(row,key,extrema) {
        if(row.playerNum===0 || !row.isAlive || !extrema[key])return 'gray';
        const value=row[key==='production'?'productionRaw':key];
        if(value>=extrema[key].maximum)return 'comparisonBest';
        if(value===extrema[key].minimum)return 'comparisonWorst';
        return 'lightgray';
    }

    getFleetRosterLayout() {
        const rows=this.game.getFleetListRows(),screen=this.getScreenSize(),width=Math.min(840,screen.width-32);
        const preferred=this.game.fleetRosterGeometry;
        const defaultPageSize=Math.max(1,Math.min(14,Math.floor((screen.height-235)/28)));
        const height=this.clamp(preferred?preferred.height:130+Math.max(1,Math.min(rows.length,defaultPageSize))*28,
            158,Math.max(158,screen.height-20));
        const rect=this.fitPanelToScreen({x:preferred?preferred.x:(screen.width-width)/2,y:preferred?preferred.y:84,width,height});
        const pageSize=Math.max(1,Math.floor((height-130)/28));
        const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.min(this.game.fleetRosterPage,pages-1);
        this.game.fleetRosterPage=page;
        const visibleRows=rows.slice(page*pageSize,(page+1)*pageSize);
        const definitions=[['name',this.STR.name,.25],['tech',this.STR.tech,.03],['speed',this.STR.speed,.04],
            ['power',this.STR.power,.04],['ships',this.STR.ships,.04],['damage',this.STR.damage,.04],
            ['colony',I18n.getString(453,'Colony'),.04],['destination',this.STR.destination,.52]];
        let headerSize=9;
        const measure=(size,padding,nameWidth,destinationWidth)=>definitions.map(([key,label])=>Math.max(
            key==='name'?nameWidth:key==='destination'?destinationWidth:0,
            this.getButtonWidth(label.replace(/:$/,'')+(this.game.fleetRosterSort.key===key?' ↓':''),null,{size})-24+padding));
        let minimums=measure(headerSize,24,80,110);
        if(minimums.reduce((a,b)=>a+b,0)>width-28){headerSize=8;minimums=measure(headerSize,8,50,80);}
        const extra=Math.max(0,width-28-minimums.reduce((a,b)=>a+b,0));let offset=14;
        const columns=definitions.map(([key,label,weight],index)=>{
            const column={key,label:label.replace(/:$/,''),offset,width:minimums[index]+extra*weight};offset+=column.width;return column;
        });
        return {rect,page,pages,pageSize,visibleRows,columns,headerSize};
    }

    getTableWindowDragRegions() {
        const state=this.game.getTableWindowState();if(!state)return [];
        const rect=state.rect;
        return [{mode:'move',rect:{x:rect.x+10,y:rect.y+2,width:rect.width-20,height:28}},
            {mode:'resize',rect:{x:rect.x+rect.width-28,y:rect.y+rect.height-26,width:24,height:22}}];
    }

    getFleetRosterDragRegions() {return this.game.uiWindow==='fleets'?this.getTableWindowDragRegions():[];}

    drawTableWindowResizeGrip(rect) {
        const right=rect.x+rect.width-8,bottom=rect.y+rect.height-8;
        for(const length of [5,10,15])this.port.drawLine(new pdg.Point(right-length,bottom),new pdg.Point(right,bottom-length),this.styles.divider);
        const hovered=this.getTableWindowDragRegions().find(region=>this.isHovered(region.rect));
        if(hovered)this.iconHint={rect:hovered.rect,inWindow:true,label:I18n.getString(810,
            'Drag title to move; drag lower-right corner to resize.')};
    }

    getFleetWindowRect() {return this.getFleetRosterLayout().rect;}

    getCommandActionRegions() {
        if (this.game.uiWindow!=='menu') return [];
        const rect = this.getCommandWindowRect();
        const scale=Math.min(1,(rect.height-104)/(this.getCommandWindowHeight()-104));
        const fit=buttons=>buttons.map(button=>({...button,rect:{...button.rect,y:rect.y+66+(button.rect.y-rect.y-66)*scale,height:button.rect.height*scale}}));
        const settings={rect:{x:rect.x+14,y:rect.y+216,width:rect.width-28,height:28},
            icon:'gear',label:I18n.getString(759,'Settings'),action:{type:'toggleWindow',window:'settings'}};
        const comparison={rect:{x:rect.x+14,y:rect.y+148,width:rect.width-28,height:28},
            label:this.STR.compare,key:'V',action:{type:'toggleWindow',window:'comparison'}};
        const fullscreen=this.game.fullscreen && this.game.fullscreen.supported ? [{
            rect:{x:rect.x+14,y:rect.y+318+(this.game.sessionCommands?68:0)+(this.game.fileCommands?34:0),width:rect.width-28,height:28},
            label:I18n.getString(771,'Full screen'),active:this.game.fullscreen.active(),action:{type:'toggleFullscreen'}
        }] : [];
        const mapDisplay={rect:{x:rect.x+14,y:rect.y+250,width:rect.width-28,height:28},
            label:I18n.getString(773,'Map display'),action:{type:'toggleWindow',window:'mapDisplay'}};
        const view={rect:{x:rect.x+14,y:rect.y+284,width:rect.width-28,height:28},
            label:I18n.getString(786,'View'),action:{type:'toggleWindow',window:'view'}};
        const documents=this.game.sessionCommands?[
            {rect:{x:rect.x+14,y:rect.y+318,width:rect.width-28,height:28},label:I18n.getString(836,'New Game…'),key:'N',action:{type:'newGame'}},
            {rect:{x:rect.x+14,y:rect.y+352,width:rect.width-28,height:28},label:I18n.getString(837,'Open Games'),key:'G',action:{type:'showGames'}}]:[];
        const manual=this.game.manualCommands?[{rect:{x:rect.x+14,y:rect.y+318+(this.game.sessionCommands?68:0)+(this.game.fileCommands?34:0)+(this.game.fullscreen && this.game.fullscreen.supported?34:0),width:rect.width-28,height:28},label:I18n.getString(943,'User’s Manual'),key:'H',action:{type:'openManual'}}]:[];
        const tutorial=this.game.canStartTutorial()?[{rect:{x:rect.x+14,y:rect.y+318+(this.game.sessionCommands?68:0)+(this.game.fileCommands?34:0)+(this.game.fullscreen && this.game.fullscreen.supported?34:0)+(this.game.manualCommands?34:0),width:rect.width-28,height:28},label:I18n.getString(960,'Tutorial'),action:{type:'startTutorial'}}]:[];
        const file=this.game.fileCommands?[{rect:{x:rect.x+14,y:rect.y+318+(this.game.sessionCommands?68:0),width:rect.width-28,height:28},label:I18n.getString(838,'File'),action:{type:'fileMenu'}}]:[];
        if(!this.game.getCurrentHumanPlayer())return fit([comparison,settings,mapDisplay,view,...documents,...file,...fullscreen,...manual,...tutorial]);
        return fit([{rect:{x:rect.x+14,y:rect.y+80,width:rect.width-28,height:28},
            icon:'gear',label:I18n.getString(693,'New colony defaults'),action:{type:'beginColonyDefaults'}},
            {rect:{x:rect.x+14,y:rect.y+114,width:rect.width-28,height:28},
            label:I18n.getString(708,'Your Star Systems'),action:{type:'showSystemComparison'}},
            comparison,
            {rect:{x:rect.x+14,y:rect.y+182,width:rect.width-28,height:28},
            label:I18n.getString(743,'Next item')+` (${this.game.attention.pending().length})`,key:'Tab',active:this.game.attention.pending().length>0,action:{type:'nextAttention'}},
            settings,mapDisplay,view,...documents,...file,...fullscreen,...manual,...tutorial]);
    }

    getMapSelectionRect() {
        const screen=this.getScreenSize(),count=Math.min(6,this.game.getMapSelectionRows().length);
        const picker=this.game.mapSelectionPicker,width=Math.min(380,screen.width-40);
        return this.fitWindowToScreen('mapPick',{x:picker.x+16,y:picker.y+16,width,height:130+Math.max(1,count)*32});
    }

    getMapSelectionLabel(object) {
        const type=this.game.getObjectType(object),viewer=this.game.getCurrentHumanPlayer() || 1;
        const known=this.isOmniscientMode() || this.game.isOwnerAlliedWith(viewer,object.owner) ||
            this.getVisibilityLevelForPlayer(object,viewer)>=Common.VisibilityLevel.CLASS;
        const name=!known && type===Common.ObjectType.SHIP?I18n.getString(12,'Ship'):
            !known && type===Common.ObjectType.FLEET?I18n.getString(591,'Fleet'):this.game.getObjectDisplayName(object);
        const allied=this.game.isOwnerAlliedWith(viewer,object.owner);
        const scrap=allied && object.isToBeScrapped && object.isToBeScrapped();
        return scrap?`${name} · ${I18n.getString(756,'Marked for scrap')}`:name;
    }

    getMapSelectionActions() {
        const picker=this.game.mapSelectionPicker;
        if(!picker || this.game.uiWindow!=='mapPick')return [];
        const rect=this.getMapSelectionRect(),rows=this.game.getMapSelectionRows(),pages=Math.max(1,Math.ceil(rows.length/6));
        picker.page=this.clamp(picker.page,0,pages-1);
        const actions=rows.slice(picker.page*6,picker.page*6+6).map((object,index)=>({
            rect:{x:rect.x+14,y:rect.y+64+index*32,width:rect.width-28,height:28},key:String(index+1),
            label:this.fitShipDiagnosticText(this.getMapSelectionLabel(object),rect.width-64,11),
            fullLabel:this.getMapSelectionLabel(object),active:object===this.game.selectedObject,
            bold:this.game.isOwnerAlliedWith(this.game.getCurrentHumanPlayer() || 1,object.owner) && !!object.course && object.course.waypoints.length>1,
            icon:this.game.getObjectType(object)===Common.ObjectType.STAR?'star':this.game.getObjectType(object)===Common.ObjectType.SHIP?'ship':
                this.game.getObjectType(object)===Common.ObjectType.FLEET?'fleet':'rendezvous',
            action:{type:'chooseMapObject',object}}));
        if(picker.page>0)actions.push({rect:{x:rect.x+14,y:rect.y+rect.height-48,width:110,height:26},
            label:I18n.getString(690,'Previous'),action:{type:'mapSelectionPage',page:picker.page-1}});
        if(picker.page+1<pages)actions.push({rect:{x:rect.x+rect.width-124,y:rect.y+rect.height-48,width:110,height:26},
            label:I18n.getString(691,'Next'),action:{type:'mapSelectionPage',page:picker.page+1}});
        return actions;
    }

    drawMapSelectionWindow() {
        const rect=this.getMapSelectionRect();
        const title=this.game.mapSelectionPicker.mode==='transfer'?I18n.getString(795,'Choose destination fleet'):I18n.getString(793,'Choose an object');
        this.drawWindowPanel(rect,this.fitShipDiagnosticText(title,rect.width-32,14));
        this.getMapSelectionActions().forEach(row=>{
            this.drawUIButton(row.rect,row.label,row.key,{icon:row.icon,active:row.active,bold:row.bold});
            if(row.fullLabel && this.isHovered(row.rect))this.iconHint={rect:row.rect,inWindow:true,label:row.fullLabel};
        });
        this.drawTextLine(this.fitShipDiagnosticText(I18n.getString(794,'Select an item; Esc cancels'),rect.width-28,11),
            rect.x+14,rect.y+rect.height-14,'gray',11);
    }

    getViewWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(340,screen.width-40);
        return this.fitWindowToScreen('view',{x:(screen.width-width)/2,y:84,width,height:294});
    }

    getViewActionRegions() {
        if(this.game.uiWindow!=='view')return [];
        const rect=this.getViewWindowRect();
        return [
            {label:I18n.getString(787,'Zoom in'),key:'+',action:{type:'zoomIn'}},
            {label:I18n.getString(788,'Zoom out'),key:'-',action:{type:'zoomOut'}},
            {label:this.STR.fit,key:'0',action:{type:'zoomToFit'}},
            {label:this.STR.home,key:'Home',action:{type:'selectHomeStar'}},
            {label:I18n.getString(790,'Center selected item'),key:'Shift+C',action:{type:'centerSelected'}},
            {label:I18n.getString(789,'Reset view'),action:{type:'resetView'}}
        ].map((row,index)=>({...row,rect:{x:rect.x+14,y:rect.y+64+index*32,width:rect.width-28,height:28}}));
    }

    drawViewWindow() {
        const rect=this.getViewWindowRect();
        this.drawWindowPanel(rect,I18n.getString(786,'View'));
        this.getViewActionRegions().forEach(row=>this.drawUIButton(row.rect,row.label,row.key));
        this.drawTextLine(this.STR.escClose,rect.x+14,rect.y+rect.height-16,'gray',10);
    }

    getMapDisplayWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(340,screen.width-40);
        return this.fitWindowToScreen('mapDisplay',{x:(screen.width-width)/2,y:84,width,height:352});
    }

    getMapDisplayActionRegions() {
        if(this.game.uiWindow!=='mapDisplay')return [];
        const rect=this.getMapDisplayWindowRect();
        return MapDisplayModes.modes.map((mode,index)=>({
            rect:{x:rect.x+14,y:rect.y+64+index*32,width:rect.width-28,height:28},
            label:I18n.getString(mode.id,mode.label),active:this.game.mapDisplayMode===mode.key,
            action:{type:'setMapDisplayMode',mode:mode.key}
        }));
    }

    drawMapDisplayWindow() {
        const rect=this.getMapDisplayWindowRect();
        this.drawWindowPanel(rect,I18n.getString(773,'Map display'));
        this.getMapDisplayActionRegions().forEach(row=>this.drawUIButton(row.rect,row.label,null,{active:row.active}));
        this.wrapEventMessage(I18n.getString(781,'Higher levels appear brighter.'),rect.width-28,11).slice(0,2)
            .forEach((line,index)=>this.drawTextLine(line,rect.x+14,rect.y+309+index*14,'gray',11));
        this.drawTextLine(this.STR.escClose,rect.x+14,rect.y+rect.height-12,'gray',10);
    }

    getMapDisplayBrightness(object,star=false) {
        return MapDisplayModes.brightness(this.game,object,star,this.mapDisplayState);
    }

    drawMapDisplayLegend() {
        this.mapDisplayLegendRect=null;
        const state=this.mapDisplayState;
        if(!state || state.key==='ownership')return;
        const mode=MapDisplayModes.modes.find(mode=>mode.key===state.key);
        const label=I18n.getString(mode.id,mode.label);
        const range=state.low===null?I18n.getString(782,'No known values'):
            I18n.formatString(783,'Known systems: {0}–{1}',I18n.formatPercentage(state.low),I18n.formatPercentage(state.high));
        const screen=this.getScreenSize(),width=Math.min(screen.width-40,Math.max(260,this.port.getTextWidth(range,11)+28,this.port.getTextWidth(label,13)+28));
        const rect={x:14,y:84,width,height:82};
        this.mapDisplayLegendRect=rect;
        this.drawPanelSurface(rect,this.styles.windowPanel);
        this.drawTextLine(label,rect.x+14,rect.y+20,'lightgray',13);
        this.drawTextLine(range,rect.x+14,rect.y+40,'lightgray',11);
        const gradient=this.styles.mapDisplayLegendScale;
        gradient.fillGradient(new pdg.Point(rect.x+14,rect.y+54),this.getUIColor('mapScaleLow'),
            new pdg.Point(rect.x+rect.width-14,rect.y+54),this.getUIColor('mapScaleHigh'));
        this.port.drawRect(new pdg.Rect(rect.x+14,rect.y+50,rect.x+rect.width-14,rect.y+56),gradient);
        const hint=I18n.getString(mode.allocation?784:781,mode.allocation?'Target allocation (%)':'Higher levels appear brighter.');
        this.drawTextLine(this.fitShipDiagnosticText(hint,rect.width-28,10),rect.x+14,rect.y+73,'gray',10);
    }

    getSettingsWindowRect() {
        const screen=this.getScreenSize(),width=Math.min(320,screen.width-40);
        return this.fitWindowToScreen('settings',{x:(screen.width-width)/2,y:84,width,height:Math.min(540,screen.height-20)});
    }

    getSettingsActionRegions() {
        if(this.game.uiWindow!=='settings')return [];
        const rect=this.getSettingsWindowRect();
        const rows=LanguageSettings.languages.map((language,index)=>({
            rect:{x:rect.x+14,y:rect.y+76+index*32,width:rect.width-28,height:28},
            label:language.name,active:LanguageSettings.current()===language.code,
            action:{type:'setLanguage',language:language.code}
        })).concat([{rect:{x:rect.x+14,y:rect.y+284,width:rect.width-28,height:28},
            label:I18n.getString(765,'Show grid'),key:'F3',active:this.game.showGrid,action:{type:'toggleGrid'}},
            {rect:{x:rect.x+14,y:rect.y+316,width:rect.width-28,height:28},
            label:I18n.getString(766,'Show map names'),key:'F2',active:this.game.showMapNames,action:{type:'toggleMapNames'}},
            {rect:{x:rect.x+14,y:rect.y+348,width:rect.width-28,height:28},
            label:I18n.getString(767,'Show ships'),key:'F1',active:this.game.showShips,action:{type:'toggleShips'}},
            {rect:{x:rect.x+14,y:rect.y+380,width:rect.width-28,height:28},
            label:I18n.getString(768,'Show all courses'),key:'F4',active:this.game.showAllCourses,action:{type:'toggleAllCourses'}},
            {rect:{x:rect.x+14,y:rect.y+412,width:rect.width-28,height:28},
            label:I18n.getString(769,'Show courier courses'),key:'F5',active:this.game.showCourierCourses,action:{type:'toggleCourierCourses'}},
            {rect:{x:rect.x+14,y:rect.y+444,width:rect.width-28,height:28},
            label:I18n.getString(770,'Show scanner ranges'),key:'F6',active:this.game.showScannerRanges,action:{type:'toggleScannerRanges'}},
            {rect:{x:rect.x+14,y:rect.y+476,width:rect.width-28,height:28},
            label:I18n.getString(785,'Show nebula background'),active:this.game.showNebula,action:{type:'toggleNebula'}},
            {rect:{x:rect.x+14,y:rect.y+508,width:rect.width-28,height:28},
            label:I18n.getString(857,'Control help'),active:this.game.showControlHelp!==false,action:{type:'toggleControlHelp'}},
            {label:I18n.getString(938,'Show enemy events'),active:this.game.showEnemyEvents,action:{type:'toggleEnemyEvents'}},
            {label:I18n.getString(954,'Sound'),active:!!this.game.sound && this.game.sound.isEnabled(),action:{type:'toggleSound'}}]);
        const capacity=Math.max(1,Math.floor((rect.height-112)/28)),pages=Math.ceil(rows.length/capacity);
        const page=this.clamp(this.game.settingsPage||0,0,pages-1);this.game.settingsPage=page;
        const visible=rows.slice(page*capacity,(page+1)*capacity).map((row,index)=>({...row,
            rect:{x:rect.x+14,y:rect.y+76+index*28,width:rect.width-28,height:24}}));
        if(pages>1) {
            const width=(rect.width-36)/2;
            if(page>0)visible.push({rect:{x:rect.x+14,y:rect.y+rect.height-46,width,height:24},
                label:I18n.getString(690,'Previous'),action:{type:'settingsPage',delta:-1}});
            if(page<pages-1)visible.push({rect:{x:rect.x+22+width,y:rect.y+rect.height-46,width,height:24},
                label:I18n.getString(691,'Next'),action:{type:'settingsPage',delta:1}});
        }
        return visible;
    }

    drawSettingsWindow() {
        const rect=this.getSettingsWindowRect();
        this.drawWindowPanel(rect,I18n.getString(759,'Settings'));
        const regions=this.getSettingsActionRegions();
        if(regions.some(region=>region.action.type==='setLanguage'))
            this.drawTextLine(I18n.getString(760,'Language'),rect.x+14,rect.y+57,'lightgray',12);
        for(const region of regions)this.drawUIButton(region.rect,region.label,region.key || null,{active:region.active});
        this.drawTextLine(this.STR.escClose,rect.x+14,rect.y+rect.height-16,'gray',10);
    }

    getColonyDefaultsWindowRect() {
        const screen = this.getScreenSize();
        const width = Math.min(520,screen.width-40);
        return this.fitWindowToScreen('colonyDefaults',{x:(screen.width-width)/2,y:84,width,height:310});
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

    getCourseCommandButtons() {
        const object=this.game.courseWindowObject,selection=this.game.courseSelection;
        if(!this.game.canEditCourse(object))return [];
        return [['addWaypoint',729,'Add','A'],['editWaypoint',730,'Edit','E'],['deleteWaypoint',731,'Delete','D'],
            ['clearOrders',732,'Clear course','X'],['togglePatrol',577,'Patrol','P']]
            .filter(([type])=>!(['editWaypoint','deleteWaypoint'].includes(type)&&!object.course.waypoints[selection]) &&
                !(type==='clearOrders'&&!object.course.waypoints.length) && !(type==='togglePatrol'&&!this.game.canTogglePatrol(object)))
            .map(([type,id,fallback,key])=>({label:I18n.getString(id,fallback),key,
                active:type==='togglePatrol'&&object.isOnPatrol(),action:{type,object}}));
    }

    getCourseModeButtons() {
        const object=this.game.courseWindowObject;
        if(!this.game.canEditCourse(object))return [];
        const buttons=[{label:I18n.getString(733,'Loop'),key:'L',active:object.course.loop,action:{type:'toggleCourseLoop'}}];
        if(object.course.waypoints.length || object.course.hasMemory)buttons.push({label:I18n.getString(740,'Memory'),key:'M',active:object.course.hasMemory,action:{type:'swapCourseMemory'}});
        if(this.game.canToggleCourseHunt(object))buttons.push({label:I18n.getString(741,'Hunt'),key:'H',active:object.course.hunt,action:{type:'toggleCourseHunt'}});
        if(this.game.canToggleCallIn(object))buttons.push({label:I18n.getString(742,'Call in'),key:'C',active:!!object.userCallIn,action:{type:'toggleCallIn',object}});
        return buttons;
    }

    getCourseWindowLayout() {
        const screen=this.getScreenSize(),width=Math.min(620,screen.width-40);
        const commandRows=this.layoutButtonRow(this.getCourseCommandButtons(),{x:0,y:0,width:width-28,size:10}).rows;
        const modeRows=this.layoutButtonRow(this.getCourseModeButtons(),{x:0,y:0,width:width-150,size:10}).rows;
        const extraHeight=(Math.max(1,commandRows)-1+Math.max(1,modeRows)-1)*34;
        const rows=this.game.getCourseRows(),pageSize=Math.max(1,Math.min(9,Math.floor((screen.height-270-extraHeight)/26)));
        const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.min(this.game.coursePage,pages-1);
        const visibleRows=rows.slice(page*pageSize,(page+1)*pageSize);
        const rect=this.fitWindowToScreen('course',{x:(screen.width-width)/2,y:84,width,height:194+Math.max(1,visibleRows.length)*26+extraHeight});
        return {rect,rows,page,pages,visibleRows,pageSize,commandRows,modeRows};
    }

    getCourseActionRegions() {
        if(this.game.uiWindow!=='course')return [];
        const layout=this.getCourseWindowLayout(),r=layout.rect,object=this.game.courseWindowObject;
        const regions=layout.visibleRows.map((row,index)=>({rect:{x:r.x+14,y:r.y+66+index*26,width:r.width-28,height:24},
            action:{type:'selectWaypoint',index:row.index}}));
        const modeExtra=(Math.max(1,layout.modeRows)-1)*34;
        regions.push(...this.layoutButtonRow(this.getCourseCommandButtons(),{x:r.x+14,
            y:r.y+r.height-96-modeExtra-(Math.max(1,layout.commandRows)-1)*34,width:r.width-28,height:26,size:10}).regions);
        regions.push(...this.layoutButtonRow(this.getCourseModeButtons(),{x:r.x+14,
            y:r.y+r.height-64-modeExtra,width:r.width-150,height:24,size:10}).regions);
        if(layout.page>0)regions.push({rect:{x:r.x+14,y:r.y+r.height-32,width:130,height:22},
            label:I18n.getString(690,'Previous'),action:{type:'coursePage',page:layout.page-1}});
        if(layout.page<layout.pages-1)regions.push({rect:{x:r.x+r.width-144,y:r.y+r.height-32,width:130,height:22},
            label:I18n.getString(691,'Next'),action:{type:'coursePage',page:layout.page+1}});
        return regions;
    }

    getSystemComparisonLayout() {
        const screen = this.getScreenSize(), width = Math.min(760, screen.width - 40);
        const rows=this.game.getSystemComparisonRows(),preferred=this.game.systemComparisonGeometry;
        const defaultPageSize=Math.max(1,Math.min(12,Math.floor((screen.height-240)/26)));
        const height=this.clamp(preferred?preferred.height:150+Math.max(1,Math.min(rows.length,defaultPageSize))*26,
            176,Math.max(176,screen.height-20));
        const rect=this.fitWindowToScreen('systemComparison',{x:preferred?preferred.x:(screen.width-width)/2,
            y:preferred?preferred.y:84,width,height});
        const pageSize=Math.max(1,Math.floor((height-150)/26)),pages=Math.max(1,Math.ceil(rows.length/pageSize));
        const page=this.clamp(this.game.systemComparisonPage,0,pages-1);this.game.systemComparisonPage=page;
        const visibleRows=rows.slice(page*pageSize,(page+1)*pageSize);
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
        if (layout.page < layout.pages-1) regions.push({rect:{x:rect.x+rect.width-184,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(691,'Next'),action:{type:'systemComparisonPage',page:layout.page+1}});
        regions.push({rect:{x:rect.x+rect.width/2-75,y:rect.y+rect.height-36,width:150,height:24},
            label:this.STR.escClose,action:{type:'closeSystemComparison'}});
        return regions;
    }

    getFleetExchangeLayout() {
        const state=this.game.getFleetExchangeState(),screen=this.getScreenSize();
        const width=Math.min(760,screen.width-32),pageSize=Math.max(1,Math.min(9,Math.floor((screen.height-350)/38)));
        const rect=this.fitWindowToScreen('fleetExchange',{x:(screen.width-width)/2,y:80,width,height:234+pageSize*38});
        const half=(width-42)/2;
        const lists=['main','sub'].map((side,index)=>{
            const objects=state?state[side]:[];
            const rows=objects.map(object=>({object,data:this.getShipDiagnostics(object)}));
            if(state)rows.sort((a,b)=>{
                const key=state.sort.key,values=key==='name'?[a.data.title,b.data.title]:[a.data[key],b.data[key]];
                const order=String(values[0]).localeCompare(String(values[1]),undefined,{numeric:true});
                return (state.sort.ascending?order:-order)||a.object.id-b.object.id;
            });
            const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.min(state?state.pages[side]:0,pages-1);
            if(state)this.game.fleetExchange.pages[side]=page;
            return {side,x:rect.x+14+index*(half+14),width:half,page,pages,allRows:rows,rows:rows.slice(page*pageSize,(page+1)*pageSize)};
        });
        return {state,rect,lists,pageSize};
    }

    getFleetExchangeActions() {
        const {state,rect,lists,pageSize}=this.getFleetExchangeLayout();if(!state)return [];
        const regions=[];
        let headerX=rect.x+14;
        [['name',this.STR.name],['tech',this.STR.tech],['speed',this.STR.speed],['power',this.STR.power],['health',I18n.getString(698,'Health:')]].forEach(([key,label])=>{
            label=label.replace(/:$/,'')+(state.sort.key===key?(state.sort.ascending?' ↑':' ↓'):'');
            const width=this.getButtonWidth(label,null,{size:9});
            regions.push({rect:{x:headerX,y:rect.y+58,width,height:24},label,action:{type:'fleetExchangeSort',key}});headerX+=width+6;
        });
        lists.forEach(list=>{
            list.rows.forEach((row,index)=>regions.push({rect:{x:list.x,y:rect.y+114+index*38,width:list.width,height:36},
                action:{type:'fleetExchangeSelect',side:list.side,object:row.object}}));
            const y=rect.y+114+pageSize*38;
            if(list.page>0)regions.push({rect:{x:list.x,y,width:this.getButtonWidth(I18n.getString(690,'Previous'),null,{size:9}),height:24},
                label:I18n.getString(690,'Previous'),action:{type:'fleetExchangePage',side:list.side,page:list.page-1}});
            if(list.page<list.pages-1) {
                const width=this.getButtonWidth(I18n.getString(691,'Next'),null,{size:9});
                regions.push({rect:{x:list.x+list.width-width,y,width,height:24},label:I18n.getString(691,'Next'),action:{type:'fleetExchangePage',side:list.side,page:list.page+1}});
            }
        });
        let x=rect.x+14,y=rect.y+rect.height-66;
        const buttons=[];
        if(this.game.canExchangeFleetMember())buttons.push([801,'Exchange ships','exchangeFleetMember']);
        if(state.selection)buttons.push([805,'Inspect','fleetExchangeOpen']);
        if(this.game.canHumanControl(state.container) || this.game.factory.isStar(state.container))buttons.push([804,'New fleet','fleetExchangeNew']);
        if(state.selection && this.game.canToggleScrap(state.selection))buttons.push([state.selection.isToBeScrapped()?755:754,'Scrap','fleetExchangeScrap']);
        if(state.selection && this.game.canTogglePatrol(state.selection))buttons.push([577,'Patrol','fleetExchangePatrol']);
        buttons.push([531,'<Esc> Close','fleetExchangeClose']);
        const parent=state.container.fleet || state.container.getDockedStar && state.container.getDockedStar();
        if(parent && this.game.canViewFleetExchange(parent))buttons.push(this.game.factory.isStar(parent)
            ?[956,'Containing system','fleetExchangeParent']:[798,'Parent fleet','fleetExchangeParent']);
        buttons.forEach(([id,fallback,type])=>{
            const label=I18n.getString(id,fallback),key=type==='fleetExchangeParent'?'←':type==='fleetExchangeOpen'?'→':null,
                width=this.getButtonWidth(label,key,{size:10});
            if(x+width>rect.x+rect.width-14){x=rect.x+14;y+=30;}
            regions.push({rect:{x,y,width,height:24},label,key,action:{type}});x+=width+8;
        });
        return regions;
    }

    drawFleetExchangeWindow() {
        const layout=this.getFleetExchangeLayout(),{state,rect,lists}=layout;
        this.drawWindowPanel(rect,I18n.getString(801,'Exchange ships'));
        if(!state)return;
        this.drawTextLine(this.fitShipDiagnosticText(this.game.getObjectDisplayName(state.container),rect.width-28,11),rect.x+14,rect.y+49,'lightgray',11);
        lists.forEach(list=>{
            const title=list.side==='main'?I18n.getString(802,'Ships and fleets'):
                state.active?I18n.getString(803,'Fleet contents')+': '+this.game.getObjectDisplayName(state.active):I18n.getString(804,'New fleet');
            this.drawTextLine(this.fitShipDiagnosticText(title,list.width,11),list.x,rect.y+101,'lightgray',11);
            list.rows.forEach((row,index)=>{
                const y=rect.y+114+index*38,selected=state.selection===row.object;
                if(selected || this.isHovered({x:list.x,y,width:list.width,height:36}))
                    this.drawRoundedRect({x:list.x,y,width:list.width,height:36},5,selected?this.styles.buttonFillActive:this.styles.buttonFillHover);
                if(list.side==='main' && row.object===state.active)this.drawRoundedRect({x:list.x,y,width:3,height:36},1,this.styles.buttonFillActive);
                const data=row.data;
                this.drawTextLine(this.fitShipDiagnosticText(data.title,list.width-12,11),list.x+6,y+14,'lightgray',11);
                const metrics=`${data.tech} / ${data.speed} / ${data.power}   ${I18n.getString(698,'Health:')} ${data.health}`;
                this.drawTextLine(this.fitShipDiagnosticText(metrics,list.width-12,9),list.x+6,y+29,'gray',9);
            });
            this.drawTextLine(`${list.page+1} / ${list.pages}`,list.x+list.width/2,rect.y+128+layout.pageSize*38,'gray',10,pdg.textStyle_Centered);
        });
        this.getFleetExchangeActions().filter(row=>row.label).forEach(row=>this.drawUIButton(row.rect,row.label,row.key || null,{size:10}));
    }

    getSystemShipWindowLayout() {
        const screen = this.getScreenSize();
        const width = Math.min(720, screen.width - 40);
        const pageSize = Math.max(1, Math.min(12, Math.floor((screen.height - 230) / 26)));
        const rows = this.game.getSystemShipRows();
        const pages = Math.max(1, Math.ceil(rows.length / pageSize));
        const page = Math.min(this.game.systemShipPage, pages - 1);
        const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);
        const rect = this.fitWindowToScreen('systemShips',{x: (screen.width - width)/2, y: 84, width,
            height: 142 + Math.max(1,visibleRows.length) * 26});
        const scrapWidth=Math.max(98,...[754,755].map(id=>this.getButtonWidth(I18n.getString(id,id===754?'Scrap':'Cancel scrap'),null,{size:10})));
        const tableWidth=width-scrapWidth-14;
        const definitions=[['name',this.STR.name.replace(/:$/,''),.40],['tech',this.STR.tech.replace(/:$/,''),.14],
            ['power',this.STR.power.replace(/:$/,''),.14],['damage',this.STR.damage.replace(/:$/,''),.16],['speed',this.STR.speed.replace(/:$/,''),.16]];
        const minimums=definitions.map(([,label])=>this.getButtonWidth(label,null,{size:10}));
        const extra=Math.max(0,tableWidth-28-minimums.reduce((a,b)=>a+b,0));
        let offset=14;
        const columns=definitions.map(([key,label,weight],index)=>{
            const column={key,label,offset,width:minimums[index]+extra*weight};offset+=column.width;return column;
        });
        return { rect, page, pages, pageSize, visibleRows, columns, scrapWidth };
    }

    getSystemShipActionRegions() {
        if (this.game.uiWindow !== 'systemShips') return [];
        const layout = this.getSystemShipWindowLayout(), rect = layout.rect;
        const regions = layout.columns.map(column => ({
            rect: { x: rect.x+column.offset, y: rect.y+38, width: column.width, height: 24 },
            action: { type: 'sortSystemShips', key: column.key } }));
        layout.visibleRows.forEach((row,index) => {
            if(this.game.canToggleScrap(row.object))regions.push({
                rect:{x:rect.x+rect.width-layout.scrapWidth-14,y:rect.y+68+index*26,width:layout.scrapWidth,height:24},
                label:I18n.getString(row.object.isToBeScrapped()?755:754,row.object.isToBeScrapped()?'Cancel scrap':'Scrap'),
                active:row.object.isToBeScrapped(),action:{type:'toggleScrap',object:row.object}});
            regions.push({rect:{x:rect.x+14,y:rect.y+68+index*26,width:rect.width-layout.scrapWidth-30,height:24},
                action:{type:'selectObject',object:row.object,center:true,closeWindow:true}});
        });
        if (layout.page > 0) regions.push({rect:{x:rect.x+14,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(690,'Previous'), action:{type:'systemShipPage',page:layout.page-1}});
        if (layout.page < layout.pages-1) regions.push({rect:{x:rect.x+rect.width-164,y:rect.y+rect.height-36,width:150,height:24},
            label:I18n.getString(691,'Next'), action:{type:'systemShipPage',page:layout.page+1}});
        return regions;
    }

    getSystemShipButtonRegion() {
        const star=this.game.getSelectedStar();
        if(!star)return null;
        return this.getContextButtonArc(star,this.getStarDetailsLayout(star).rect).find(button=>button.action.type==='showSystemShips') || null;
    }

    getRenameWindowRect() {
        const target=this.game.renameTarget,screen=this.getScreenSize();
        if(!target)return {x:10,y:10,width:100,height:26};
        const marker=this.getMapMarker(target) || {...this.getObjectScreenPosition(target),radius:8};
        if(this.factory.isRendezvous(target))marker.radius=Math.max(7,(this.scaledShipRadius || Common.ShipRadius)+3);
        const size=this.factory.isStar(target) && target.namedStar?16.5:15;
        const text=this.game.renameText || '',width=Math.min(screen.width-20,Math.max(100,(this.port.getTextWidth?this.port.getTextWidth(text,size):Array.from(text).length*size/2)+14));
        const height=Math.ceil(size)+10;
        // Overlay the normal centered map label, independent of inspector geometry.
        return {x:this.clamp(marker.x-width/2,10,screen.width-width-10),
            y:this.clamp(marker.y+marker.radius+12-size-5,10,screen.height-height-10),width,height,size};
    }

    getRenameTextLayout() {
        const rect=this.getRenameWindowRect(),editor=this.game.renameEditor;
        const characters=Array.from(this.game.renameText || ''),caret=editor?Math.min(editor.caret,characters.length):characters.length;
        const measure=text=>this.port.getTextWidth(text,rect.size),available=rect.width-12;
        let start=0,end=characters.length;
        while(start<caret && measure(characters.slice(start,caret).join(''))>available)start++;
        while(end>caret && measure(characters.slice(start,end).join(''))>available)end--;
        return {rect,start,end,text:characters.slice(start,end).join(''),caret:measure(characters.slice(start,caret).join(''))};
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
            case 'games':return this.getGameSessionLayout().rect;
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
            case 'mapPick':return this.getMapSelectionRect();
            case 'view':
                return this.getViewWindowRect();
            case 'mapDisplay':
                return this.getMapDisplayWindowRect();
            case 'settings':
                return this.getSettingsWindowRect();
            case 'colonyDefaults':
                return this.getColonyDefaultsWindowRect();
            case 'fleetExchange':return this.getFleetExchangeLayout().rect;
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
        const layout=this.getStarDetailsLayout(star),sliders=this.getStarAllocationSliderRegions(star);
        const locks=this.getAllocationLockRegions(sliders),middle=sliders[1].rect;
        const regions=[{rect:{x:locks[1].rect.x+locks[1].rect.width+4,y:middle.y+middle.height/2-11,width:24,height:22},
            action:{type:'equalizeAllocations',star},key:'=',inWindow:false}];
        if(this.game.uiWindow==='production'){
            const windowSliders=this.getProductionWindowSliderRegions(),windowLocks=this.getAllocationLockRegions(windowSliders),row=windowSliders[1].rect;
            regions.unshift({rect:{x:windowLocks[1].rect.x+windowLocks[1].rect.width+4,y:row.y+row.height/2-11,width:24,height:22},
                action:{type:'equalizeAllocations',star},key:'=',inWindow:true});
        }
        return regions;
    }

    getStarDiagnosticLabelWidth(star) {
        const labels=[this.STR.owner,this.STR.pop,this.STR.tech,this.STR.building,
            I18n.getString(684,'Send to:'),I18n.getString(722,'Total defense:'),
            I18n.getString(723,'Satellites:'),I18n.getString(724,'Ship defense:')];
        return Math.max(70,...labels.map(label=>(this.port.getTextWidth?this.port.getTextWidth(label,11):Array.from(label).length*5.5)+8));
    }

    getDefaultDestinationLayout(star,layout=this.getStarDetailsLayout(star)) {
        const data=this.getStarDiagnostics(star),owned=this.game.canHumanControl(star),gap=4;
        const buttons=owned?[{label:I18n.getString(962,'Set'),action:{type:'beginOrders',object:star}}]:[];
        if(owned && star.getDefaultDestination())buttons.push({label:I18n.getString(963,'Clear'),action:{type:'clearDefaultDestination',object:star}});
        const widths=buttons.map(button=>this.getButtonWidth(button.label,null,{size:10,minWidth:36}));
        const buttonWidth=widths.reduce((sum,width)=>sum+width,0)+buttons.length*gap;
        const labelWidth=this.getStarDiagnosticLabelWidth(star),valueX=layout.x+labelWidth;
        const available=layout.rect.width-24-labelWidth-buttonWidth;
        const measure=text=>this.port.getTextWidth?this.port.getTextWidth(text,11):Array.from(text).length*5.5;
        let text=data.destination;
        while(Array.from(text).length>1 && measure(text)>available)text=Array.from(text).slice(0,-2).join('')+'…';
        let x=valueX+(this.port.getTextWidth?this.port.getTextWidth(text,11):Array.from(text).length*5.5)+gap;
        const y=layout.basicStartY+4*18;
        const regions=buttons.map((button,index)=>{const region={...button,rect:{x,y:y-12,width:widths[index],height:16}};x+=widths[index]+gap;return region;});
        return {text,label:I18n.getString(684,'Send to:'),labelWidth,x:layout.x,valueX,y,regions};
    }

    getDefaultDestinationRegions() {
        const star=this.game.getSelectedStar();
        return star && this.game.canHumanControl(star)?this.getDefaultDestinationLayout(star).regions:[];
    }

    getAllocationLockRegions(sliders = this.getAllocationSliderRegions()) {
        return sliders.map(slider => ({
            rect: { x: slider.trackRect.x + slider.trackRect.width + 48, y: slider.rect.y - 1, width: 26, height: 18 },
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
        if (!fleet) return [];

        const layout = this.getFleetDetailsLayout(fleet);
        const rect = layout.rect;
        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect) + layout.memberStartOffset;
        const transferTargets = layout.transferTargets;
        const regions = this.getFleetMemberPageRegions(fleet,layout);
        const owned=this.game.canHumanControl(fleet);

        const removeWidth=this.getButtonWidth(this.STR.remove,null,{size:9,minWidth:58});
        const transferWidth=this.getButtonWidth(this.STR.transfer,null,{size:9,minWidth:58});
        const groupWidth=this.getButtonWidth(I18n.getString(796,'Group'),null,{size:9,minWidth:48});
        for (const ship of layout.visibleShips) {
            const memberTargets=transferTargets.filter(target=>this.game.canTransferShipToFleet(ship,target));
            const primaryTransferTarget=memberTargets[0] || null;
            const groupX=rect.x+rect.width-14-removeWidth-6-(primaryTransferTarget?transferWidth+6:0)-groupWidth;
            const rowRect = { x, y: y - 14, width: owned?groupX-x-6:rect.width-24, height: layout.memberRowHeight-2 };
            if (owned && primaryTransferTarget) {
                regions.push({
                    rect: { x: rect.x + rect.width - 14 - removeWidth - 6 - transferWidth, y: y - 16, width: transferWidth, height: 20 },
                    action: memberTargets.length>1?{type:'beginFleetTransfer',ship}:{ type: 'transferFleetShip', ship, targetFleet: primaryTransferTarget }
                });
            }
            if(owned)regions.push({
                rect: { x: rect.x + rect.width - 14 - removeWidth, y: y - 14, width: removeWidth, height: 20 },
                action: { type: 'removeFleetShip', fleet, ship }
            });
            if(owned)regions.push({rect:{x:groupX,
                y:y-14,width:groupWidth,height:20},action:{type:'createFleetGroup',fleet,member:ship}});
            regions.push({
                rect: rowRect,
                action: { type: 'selectFleetMember', fleet, ship }
            });
            y += layout.memberRowHeight;
        }

        return regions;
    }

    getFleetListActionRegions() {
        if(this.game.uiWindow!=='fleets')return [];
        const {rect,columns,visibleRows,page,pages}=this.getFleetRosterLayout();
        const regions=columns.map(column=>({rect:{x:rect.x+column.offset,y:rect.y+38,width:column.width-4,height:24},
            action:{type:'sortFleetRoster',key:column.key}}));
        visibleRows.forEach((row,index)=>regions.push({rect:{x:rect.x+14,y:rect.y+68+index*28,width:rect.width-28,height:26},
            action:{type:'fleetRosterSelect',object:row.object}}));
        const footerY=rect.y+rect.height-32;
        if(page>0)regions.push({rect:{x:rect.x+14,y:footerY,width:130,height:24},label:I18n.getString(690,'Previous'),action:{type:'fleetRosterPage',page:page-1}});
        if(page<pages-1)regions.push({rect:{x:rect.x+rect.width-164,y:footerY,width:130,height:24},label:I18n.getString(691,'Next'),action:{type:'fleetRosterPage',page:page+1}});
        const label=I18n.getString(531,'<Esc> Close'),width=this.getButtonWidth(label,null,{size:10});
        regions.push({rect:{x:rect.x+(rect.width-width)/2,y:footerY,width,height:24},label,action:{type:'closeFleetRoster'}});
        return regions;
    }

    getUIPanelRegions() {
        const regions = [];
        if(this.mapDisplayLegendRect)regions.push(this.mapDisplayLegendRect);
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
        if (this.game.uiWindow==='games') controls=this.getGameSessionLayout().buttons;
        if (this.game.uiWindow==='menu') controls=this.getCommandActionRegions();
        if (this.game.uiWindow==='settings') controls=this.getSettingsActionRegions();
        if (this.game.uiWindow==='mapDisplay') controls=this.getMapDisplayActionRegions();
        if (this.game.uiWindow==='view') controls=this.getViewActionRegions();
        if (this.game.uiWindow==='mapPick') controls=this.getMapSelectionActions();
        if (this.game.uiWindow==='colonyDefaults') {
            controls=this.getColonyDefaultActionRegions();
            const slider=this.getColonyDefaultSliderRegions().find(region=>this.containsPoint(region.rect,x,y));
            if(slider) return {type:'setColonyDefaultAllocation',key:slider.key,
                value:Math.round(this.clamp((x-slider.rect.x)/slider.rect.width,0,1)*1000)};
        }
        if (this.game.uiWindow === 'course') controls = this.getCourseActionRegions();
        if (this.game.uiWindow === 'comparison') controls=this.getPlayerComparisonActionRegions();
        if (this.game.uiWindow === 'systemComparison') controls = this.getSystemComparisonActionRegions();
        if (this.game.uiWindow === 'fleetExchange') controls = this.getFleetExchangeActions();
        if (this.game.uiWindow === 'systemShips') controls = this.getSystemShipActionRegions();
        if(this.game.uiWindow==='rename')return {type:'placeRenameCaret',x};
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
        if(this.game.overlay && ['outcome','report'].includes(this.game.overlay.type)) {
            if(this.game.overlay.animationOnly || this.getDestructionEffect(this.game.overlay))return {type:'consume'};
            const layout=this.game.overlay.type==='report'?this.getReportLayout(this.game.overlay):this.getOutcomeLayout(this.game.overlay);
            const control=layout.buttons.find(button=>this.containsPoint(button.rect,x,y));
            return control?control.action:{type:'consume'};
        }

        if(WindowBehavior.isSystem(this.game.uiWindow))return this.getActiveWindowActionAt(x,y) || {type:'consume',blocked:true};
        if(this.game.uiWindow==='mapPick')return this.getActiveWindowActionAt(x,y) || {type:'consume'};
        if(this.game.pendingCourseEdit) {
            const screen=this.getScreenSize(),hint={x:20,y:78,width:screen.width-40,height:40};
            if(this.containsPoint(hint,x,y) || this.getMapButtonRegions().some(button=>this.containsPoint(button.rect,x,y)))return {type:'consume'};
            return null;
        }
        const windowAction = this.getActiveWindowActionAt(x, y);
        if (windowAction) return windowAction;
        // Rename is modal: map controls cannot change its target mid-edit.
        if (['rename','colonyDefaults','settings','mapDisplay','view','mapPick','endTurnConfirm','fleetExchange','fleets','systemComparison','comparison'].includes(this.game.uiWindow)) return { type: 'consume' };
        const scrollAction=this.getMapScrollActionAt(x,y);
        if(scrollAction)return scrollAction;
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

    getMapScrollbars() {
        const screen=this.getScreenSize();
        return MapScrollbars.layout(this.camera,screen.width,screen.height);
    }

    getMapScrollActionAt(x,y) {
        const bar=this.getMapScrollbars().find(bar=>this.containsPoint(bar.rect,x,y));
        if(!bar)return null;
        const part=this.containsPoint(bar.before,x,y)?'before':this.containsPoint(bar.after,x,y)?'after':
            this.containsPoint(bar.thumb,x,y)?'thumb':'track';
        return {type:'mapScroll',bar,part,x,y};
    }

    drawMapScrollbars() {
        for(const bar of this.getMapScrollbars()) {
            const box=r=>new pdg.Rect(new pdg.Point(r.x,r.y),r.width,r.height);
            this.port.drawRect(box(bar.rect),this.styles.barTrack);
            this.drawRoundedRect(bar.thumb,3,this.styles[bar.enabled?'buttonFill':'barFrame']);
            for(const [r,direction] of [[bar.before,-1],[bar.after,1]]) {
                const x=r.x+r.width/2,y=r.y+r.height/2,points=bar.axis==='x'?
                    [[x-direction*2,y-3],[x+direction*2,y],[x-direction*2,y+3]]:
                    [[x-3,y-direction*2],[x,y+direction*2],[x+3,y-direction*2]];
                for(let i=1;i<points.length;i++)this.port.drawLine(new pdg.Point(...points[i-1]),
                    new pdg.Point(...points[i]),this.getLineAttributes(bar.enabled?'lightgray':'gray'));
            }
            if(this.isHovered(bar.rect))this.iconHint={rect:bar.rect,label:I18n.getString(bar.axis==='x'?791:792,
                bar.axis==='x'?'Scroll horizontally':'Scroll vertically')};
        }
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
        this.drawBar(rects.track.x, rects.track.y, rects.track.width, rects.track.height, current / 100.0, color);
        this.drawTextLine(options.unknown ? '?' : `${I18n.formatPercentage(desired)}%`, rects.percent.x, y, valueColor, 11);

        if (options.interactive !== false) this.drawUIButton({ x: rects.track.x + width + 48, y: y - 15, width: 26, height: 18 },
            allocation.locked ? I18n.getString(675, 'Unlock') : I18n.getString(674, 'Lock'), null,
            { size: 9, bare:true, icon: allocation.locked ? 'lock' : 'unlock', iconOnly: true, active: allocation.locked });

        const targetMarkerX = rects.track.x + this.clamp(Math.round(width * desired / 100.0), 0, width);
        this.port.drawLine(new pdg.Point(targetMarkerX, y - 11), new pdg.Point(targetMarkerX, y + 1), this.getLineAttributes(valueColor));
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
        return this.game.getStarDisplayName(star);
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

    getColonySetupLines(star) {
        return this.game.getColonySetupReport(star)?this.wrapEventMessage(I18n.getString(856),332,11):[];
    }

    getStarDetailsPanelHeight(star) {
        const data = this.getStarDiagnostics(star);
        if (this.game.canHumanControl(star)) {const lines=this.getColonySetupLines(star);return 336+(lines.length?lines.length*15+8:0);}
        if (data.allied) return 336;
        if (data.showProduction) return 307;
        return this.game.canViewSystemShips(star) ? 236 : 206;
    }

    getStarDetailsLayout(star) {
        const data = this.getStarDiagnostics(star);
        const rect = this.getAnchoredPanelRect(star, 360, this.getStarDetailsPanelHeight(star));
        const x = rect.x + 12;
        const hintLines=this.getColonySetupLines(star),hintHeight=hintLines.length?hintLines.length*15+8:0;
        let y = this.getPanelContentStartY(rect) + hintHeight + (7+Number(data.showDestination))*18;
        if (data.eta !== null) y += 18;
        const dividerY = y - 1;
        const productionTitleY = dividerY + 19;
        const sliderStartY = productionTitleY + 18;
        return {rect,x,hintLines,basicStartY:this.getPanelContentStartY(rect)+hintHeight,dividerY,productionTitleY,sliderStartY,sliderWidth:150};
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

        this.drawPanelSurface(rect,this.styles.topInfoPanel);
        let headlineSize=15;
        while(headlineSize>11 && this.port.getTextWidth(headline,headlineSize)>headerWidth-28)headlineSize--;
        this.drawTextLine(this.fitShipDiagnosticText(headline,headerWidth-28,headlineSize),screen.width/2,rect.y+24,'lightgray',headlineSize,pdg.textStyle_Centered);
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
        layout.hintLines.forEach((line,index)=>this.drawTextLine(line,x,this.getPanelContentStartY(rect)+index*15,'lightgray',11));
        let y = layout.basicStartY;
        const labels = [this.STR.owner,this.STR.pop,this.STR.tech,this.STR.building,
            // I18n.getString(721,'Position:'), // Retained for possible future display.
            ...(data.showDestination?[null]:[]),I18n.getString(722,'Total defense:'),
            I18n.getString(723,'Satellites:'),I18n.getString(724,'Ship defense:')];
        const values = [data.owner,data.population,data.tech,data.building,
            // data.position,
            ...(data.showDestination?[null]:[]),
            data.totalDefense,data.satelliteDefense,data.shipDefense];
        const labelWidth = this.getStarDiagnosticLabelWidth(star);
        labels.forEach((label,index) => {
            let valueWidth = rect.width-labelWidth-24;
            if (index===3 && data.completion!==null) valueWidth -= 105;
            if(label)this.drawLabelValue(label,this.fitShipDiagnosticText(values[index],valueWidth,11),x,y,{labelWidth,size:11});
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
            if (owned) this.drawStarAllocationSummary(star,x,layout.sliderStartY,layout.sliderWidth);
            else {
                const entries = [this.STR.growth,this.STR.ships.replace(/:$/,''),this.STR.research];
                ['growth','shipBuilding','research'].forEach((key,index)=>this.drawAllocationSlider(entries[index],
                    data.allied?star[key]:{value:0,desired:0,locked:false},x,layout.sliderStartY+index*18,layout.sliderWidth,
                    ['green','cyan','purple'][index],{interactive:false,unknown:!data.allied}));
            }
        }
        const equalize = this.getAllocationEqualizeRegions().find(region=>!region.inWindow);
        if (owned && equalize) this.drawUIButton(equalize.rect,'=',null,{size:18,tooltipLabel:ButtonCaption.tooltip(I18n.getString(676,'Equalize'),'=')});
        if (data.showDestination) {
            const destination=this.getDefaultDestinationLayout(star,layout);
            this.drawLabelValue(destination.label,destination.text,destination.x,destination.y,{labelWidth:destination.labelWidth,size:11});
            destination.regions.forEach(region=>this.drawUIButton(region.rect,region.label,null,
                {size:10,active:region.action.type==='beginOrders' && this.game.pendingMapOrderObject===star}));
        }
        this.drawContextButtonArc(star,rect);
    }

    getShipDetailsRect(ship) {
        return ship.underConstruction() ? this.getAnchoredPanelRect(ship, 240, 138)
            : this.getAnchoredPanelRect(ship, 350, 274);
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
                // ['location', I18n.getString(700, 'Location:'), 245], // Retained for possible future display.
                ['destination', I18n.getString(595, 'Destination:'), 245]
            ];
            const labelWidth = Math.max(117, ...rows.map(row => Math.ceil(this.port.getTextWidth(row[1], 11)) + 12));
            const width = rect.width - labelWidth - 21;
            panel.text('title', this.fitShipDiagnosticText(data.title, rect.width - 32, 14), 16, 22, 'lightgray', 14);
            rows.forEach(([id, label, y]) => panel.labelValue(id, label, this.fitShipDiagnosticText(data[id], width), y, { size: 11, labelWidth }));
            panel.draw(rect,this.getOwnerPanelStyle(ship));
            this.drawPanelPointer(ship, rect);
            if (data.healthRatio !== null) this.drawBar(rect.x + labelWidth + 5, rect.y + 181, width, 8, data.healthRatio, 'green');
            this.drawContextButtonArc(ship, rect);
            return;
        }
        panel.draw(rect,this.getOwnerPanelStyle(ship));
        this.drawPanelPointer(ship, rect);
        this.drawBar(rect.x + rect.width - 130, rect.y + 75, 70, 8, ship.progress / 100, 'lightgray');
        this.drawContextButtonArc(ship, rect);
    }

    // Draw fleet details UI
    drawFleetDetails(fleet) {
        const layout = this.getFleetDetailsLayout(fleet);
        const compositionRows = layout.compositionRows;
        const rect = layout.rect;
        const data = this.getFleetDiagnostics(fleet);
        this.drawAnchoredPanel(fleet, rect, this.fitShipDiagnosticText(data.title, rect.width - 32, 14));
        const labelWidth = Math.max(92, ...[this.STR.ships, this.STR.totalPower, this.STR.speed, this.STR.techLevel,
            ...compositionRows.map(([type]) => this.getShipTypeName(type, {capitalized:true}) + ':')]
            .map(label => Math.ceil(this.port.getTextWidth(label, 11)) + 8));

        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);
        this.drawLabelValue(this.STR.ships, data.count, x, y, { labelWidth });
        y += 18;
        this.drawLabelValue(this.STR.totalPower, data.power, x, y, { labelWidth });
        y += 18;
        this.drawLabelValue(this.STR.speed, data.speed, x, y, { labelWidth });
        y += 18;
        this.drawLabelValue(this.STR.techLevel, data.tech, x, y, { labelWidth });
        y += 22;

        if(layout.patrolHeight) {
            this.drawLabelValue(I18n.getString(699,'Status:'),fleet.isToBeScrapped()?I18n.getString(756,'Marked for scrap'):I18n.getString(703,'Patrolling'),x,y,{labelWidth:92,size:11});
            y+=18;
        }

        for (const [shipType, count] of compositionRows) {
            this.drawLabelValue(`${this.getShipTypeName(shipType, { capitalized: true })}:`, I18n.formatInteger(count), x, y, { labelWidth, size: 11, valueColor: 'gray' });
            y += 16;
        }

        if (layout.knowledge.full && fleet.destination) {
            const destinationName = this.getSpacePointDescription(fleet.destination);
            this.drawLabelValue(this.STR.movingTo, destinationName, x, y, { labelWidth: 92, size: 11, valueColor: 'gray' });
            y += 18;
        }

        if (layout.visibleShips.length > 0) {
            y += 2;
            this.drawDivider(x, y - 8, rect.width - 24);
            this.drawTextLine(this.STR.contents, x, y + 7, 'lightgray', 12);
            this.drawTextLine(this.fitShipDiagnosticText(`${this.STR.techLevel} / ${this.STR.speed} / ${this.STR.power}`,rect.width-24,9),x,y+22,'gray',9);
            y += 44;

            const transferTargets = layout.transferTargets;
            const memberRegions = this.getFleetMemberActionRegions(fleet);
            for (const ship of layout.visibleShips) {
                const member = this.getShipDiagnostics(ship);
                const removeRegion = memberRegions.find(region =>
                    region.action.type === 'removeFleetShip' &&
                    region.action.ship === ship
                );
                const transferRegion = memberRegions.find(region =>
                    ['transferFleetShip','beginFleetTransfer'].includes(region.action.type) &&
                    region.action.ship === ship
                );
                const groupRegion=memberRegions.find(region=>region.action.type==='createFleetGroup' && region.action.member===ship);
                const nameRight=Math.min(rect.x+rect.width-12,removeRegion?removeRegion.rect.x-6:Infinity,transferRegion?transferRegion.rect.x-6:Infinity,groupRegion?groupRegion.rect.x-6:Infinity);
                if(groupRegion)this.drawUIButton(groupRegion.rect,I18n.getString(796,'Group'),null,{size:9,radius:7});
                this.drawTextLine(this.fitShipDiagnosticText(member.title,nameRight-x,10),x,y,'lightgray',10);
                this.drawTextLine(`${member.tech} / ${member.speed} / ${member.power}`,x,y+13,'gray',9);
                const healthText=I18n.getString(698,'Health:')+' '+member.health;
                const healthX=x+140;
                this.drawTextLine(healthText,healthX,y+13,'gray',9);
                if(member.healthRatio!==null)this.drawBar(healthX+this.port.getTextWidth(healthText,9)+8,y+8,40,4,member.healthRatio,'green');
                if (transferTargets.length > 0 && transferRegion) {
                    this.drawUIButton(transferRegion.rect, this.STR.transfer, null, { size: 9, radius: 7 });
                }
                if (removeRegion) {
                    this.drawUIButton(removeRegion.rect, this.STR.remove, null, { size: 9, radius: 7 });
                }
                y += layout.memberRowHeight;
            }

        }
        if(layout.pages>1) {
            for(const button of this.getFleetMemberPageRegions(fleet,layout))this.drawUIButton(button.rect,button.label,null,{size:10});
            this.drawTextLine(`${layout.page+1} / ${layout.pages}`,rect.x+rect.width/2-14,rect.y+rect.height-17,'gray',10);
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

    getGameSessionLayout() {
        const screen=this.getScreenSize(),width=Math.min(480,screen.width-40),height=Math.min(460,screen.height-60);
        const rect=this.fitWindowToScreen('games',{x:(screen.width-width)/2,y:(screen.height-height)/2,width,height});
        const rows=this.game.sessionCommands?this.game.sessionCommands.rows():[];
        const capacity=Math.max(1,Math.floor((height-140)/44)),pages=Math.max(1,Math.ceil(rows.length/capacity));
        const page=this.clamp(this.game.gameSessionPage || 0,0,pages-1);this.game.gameSessionPage=page;
        const visibleRows=rows.slice(page*capacity,(page+1)*capacity);
        const buttons=visibleRows.map((row,index)=>({rect:{x:rect.x+16,y:rect.y+52+index*44,width:width-32,height:38},
            label:`${row.title} · ${this.STR.turn} ${row.turn}`,active:row.active,action:{type:'selectGame',id:row.id}}));
        buttons.push({rect:{x:rect.x+width-116,y:rect.y+height-44,width:100,height:28},label:I18n.getString(683,'Cancel'),action:{type:'toggleWindow',window:'games'}});
        if(page>0)buttons.push({rect:{x:rect.x+16,y:rect.y+height-44,width:90,height:28},label:I18n.getString(690,'Previous'),action:{type:'gameSessionPage',page:page-1}});
        if(page+1<pages)buttons.push({rect:{x:rect.x+112,y:rect.y+height-44,width:90,height:28},label:I18n.getString(691,'Next'),action:{type:'gameSessionPage',page:page+1}});
        return {rect,rows,visibleRows,page,pages,buttons};
    }
    drawGameSessions() {
        const layout=this.getGameSessionLayout();this.drawWindowPanel(layout.rect,I18n.getString(837,'Open Games'));
        layout.buttons.forEach(button=>this.drawUIButton(button.rect,this.fitShipDiagnosticText(button.label,button.rect.width-20,12),null,{active:button.active,size:12}));
        this.drawTextLine(`${layout.page+1}/${layout.pages}`,layout.rect.x+16,layout.rect.y+layout.rect.height-60,'gray',11);
    }

    drawCommandWindow() {
        const rect = this.getCommandWindowRect();
        this.drawWindowPanel(rect, this.STR.commandMenu);

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine(this.STR.keyboardShortcutsActive, x, y, 'gray', 11);
        this.getCommandActionRegions().forEach(region=>this.drawUIButton(region.rect,region.label,region.key,{icon:region.icon,active:!!region.active,size:region.rect.height<24?10:11}));
        if(this.game.fullscreen && this.game.fullscreen.error)this.wrapEventMessage(I18n.getString(772,'Could not change full screen. Please try again.'),rect.width-28,11).slice(0,3).forEach((line,index)=>this.drawTextLine(line,x,rect.y+rect.height-71+index*15,'lightgray',11));
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
        const equalize = this.getAllocationEqualizeRegions().find(region => region.inWindow);
        if (equalize) this.drawUIButton(equalize.rect,'=',null,{size:18,tooltipLabel:ButtonCaption.tooltip(I18n.getString(676,'Equalize'),'=')});
        y += 98;
        this.drawTextLine(this.STR.escClose, x, y, 'gray', 10);
    }

    drawEventWindow() {
        const l=this.getEventWindowLayout(),r=l.rect;
        const turns=l.rows.map(event=>event.turn),first=turns.length?Math.min(...turns):Math.max(1,this.game.turn-1);
        const last=turns.length?Math.max(...turns):first;
        this.drawWindowPanel(r,`${this.STR.eventList} · ${this.STR.turn} ${first===last?first:`${first}–${last}`}`);
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
        const layout=this.getPlayerComparisonLayout(),{rect,columns,visibleRows,extrema}=layout;
        this.drawWindowPanel(rect,this.STR.empireComparison);
        const technologyKeys=['minimumTech','maxTech','averageTech','minimumShipTech','maximumShipTech','averageShipTech'];
        for(const [startKey,id,label] of [['minimumTech',820,'System technology'],['minimumShipTech',821,'Ship technology']]) {
            const start=columns.findIndex(column=>column.key===startKey),group=columns.slice(start,start+3);
            const width=group.reduce((sum,column)=>sum+column.width,0);
            const text=I18n.getString(id,label);let size=10;
            while(size>8 && this.port.getTextWidth(text,size)>width-6)size--;
            this.drawTextLine(this.fitShipDiagnosticText(text,width-6,size),rect.x+group[0].offset+width/2,rect.y+44,'lightgray',size,pdg.textStyle_Centered);
        }
        columns.forEach(column=>{
            const technology=technologyKeys.includes(column.key),lines=technology?[column.label.split('|').pop()]:column.label.split('|');
            lines.forEach((line,index)=>{
                let size=10;while(size>8 && this.port.getTextWidth(line,size)>column.width-6)size--;
                this.drawTextLine(this.fitShipDiagnosticText(line,column.width-6,size),rect.x+column.offset+column.width/2,
                    rect.y+(technology?61:lines.length>1?48+index*13:55),'lightgray',size,pdg.textStyle_Centered);
            });
        });
        this.drawDivider(rect.x+14,rect.y+69,rect.width-28);
        visibleRows.forEach((row,index)=>{
            const y=rect.y+91+index*26,rowRect={x:rect.x+14,y:y-17,width:rect.width-28,height:24};
            if(index%2)this.drawRoundedRect(rowRect,3,this.styles.comparisonStripe);
            const nameColumn=columns[0],nameWidth=nameColumn.width-22;
            if(row.playerNum>0) {
                if(!this.comparisonOwnerAttributes)this.comparisonOwnerAttributes=new Map();
                if(!this.comparisonOwnerAttributes.has(row.playerNum)) {
                    const color=this.ownerColors[row.playerNum] || this.getUIColor('textLight');
                    this.comparisonOwnerAttributes.set(row.playerNum,this.createAttributes({fillColor:new pdg.Color(color.red,color.green,color.blue,1),lineOpacity:0}));
                }
                this.port.drawCircle(new pdg.Point(rect.x+nameColumn.offset+7,y-4),3,this.comparisonOwnerAttributes.get(row.playerNum));
            }
            this.drawTextLine(this.fitShipDiagnosticText(row.name,nameWidth,11),rect.x+nameColumn.offset+17,y,
                row.isAlive?'lightgray':'gray',11,row.italicizeName?pdg.textStyle_Italic:pdg.textStyle_Plain);
            columns.slice(1).forEach(column=>{
                const hidden=!row.isAlive || row.playerNum===0 && ['ships','power','minimumShipTech','maximumShipTech','averageShipTech'].includes(column.key);
                const text=hidden?'—':I18n.formatInteger(row[column.key]);
                const cellColor=this.getPlayerComparisonCellColor(row,column.key,extrema);
                this.drawTextLine(this.fitShipDiagnosticText(text,column.width-6,10),rect.x+column.offset+column.width/2,y,
                    cellColor,10,pdg.textStyle_Centered);
                // Preserve the blue-best/red-worst legend while keeping system-window text black.
                if(this.isSystemWindowDrawing() && ['comparisonBest','comparisonWorst'].includes(cellColor)){
                    const center=rect.x+column.offset+column.width/2,width=Math.min(column.width-10,this.port.getTextWidth(text,10)+4);
                    this.port.drawLine(new pdg.Point(center-width/2,y+3),new pdg.Point(center+width/2,y+3),this.getLineAttributes(cellColor).lineThickness(1.5));
                }
            });
            if(this.isHovered(rowRect))this.iconHint={rect:rowRect,inWindow:true,label:row.name};
        });
        this.drawTextLine(this.fitShipDiagnosticText(I18n.getString(818,'Blue: best · Red: worst')+`   ${layout.page+1} / ${layout.pages}`,rect.width-28,10),
            rect.x+rect.width/2,rect.y+rect.height-48,'gray',10,pdg.textStyle_Centered);
        this.getPlayerComparisonActionRegions().forEach(region=>this.drawUIButton(region.rect,region.label,null,{size:10}));
    }

    drawFleetWindow() {
        const layout=this.getFleetRosterLayout(),{rect,columns,visibleRows}=layout;
        this.drawWindowPanel(rect,this.STR.fleetRoster);
        const sort=this.game.fleetRosterSort;
        columns.forEach(column=>this.drawUIButton({x:rect.x+column.offset,y:rect.y+38,width:column.width-4,height:24},
            column.label+(sort.key===column.key?(sort.ascending?' ↑':' ↓'):''),null,{size:layout.headerSize}));
        if(!visibleRows.length)this.drawTextLine(I18n.getString(806,'No ships, fleets or rendezvous points.'),rect.x+14,rect.y+86,'gray',11);
        visibleRows.forEach((row,index)=>{
            const y=rect.y+68+index*28,rowRect={x:rect.x+14,y,width:rect.width-28,height:26};
            if(this.game.selectedObject===row.object || this.isHovered(rowRect))this.drawRoundedRect(rowRect,4,this.styles.buttonFillHover);
            else if(index%2)this.drawRoundedRect(rowRect,4,this.styles.buttonFill);
            columns.forEach(column=>{
                const text=column.key==='speed'?I18n.formatDecimal(row.speed/16380):column.key==='damage'?row.damage+'%':
                    column.key==='colony'?I18n.getString(row.colony?807:808,row.colony?'Yes':'No'):
                    column.key==='ships'&&row.kind==='ship'?'—':String(row[column.key]);
                const inset=column.key==='name'?20:0;
                if(inset)this.drawUIIcon(row.kind,rect.x+column.offset+6,y+13,12);
                this.drawTextLine(this.fitShipDiagnosticText(text,column.width-8-inset,10),rect.x+column.offset+inset,y+17,'lightgray',10);
            });
            if(this.isHovered(rowRect))this.iconHint={rect:rowRect,inWindow:true,label:row.name+' · '+row.destination};
        });
        const hint=I18n.getString(809,'Double-click a row to inspect it.')+`   ${layout.page+1} / ${layout.pages}`;
        this.drawTextLine(this.fitShipDiagnosticText(hint,rect.width-28,10),rect.x+rect.width/2,rect.y+rect.height-43,'gray',10,pdg.textStyle_Centered);
        this.getFleetListActionRegions().filter(row=>row.label).forEach(row=>this.drawUIButton(row.rect,row.label,null,{size:10}));
        this.drawTableWindowResizeGrip(rect);
    }

    getRenameActionRegions() { return []; }

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
        const courier=object.type==='scout' && object.course && object.course.loop;
        const enabled=courier?this.game.showCourierCourses:this.game.showAllCourses;
        if(enabled===false && object!==this.selectedObject)return;
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
        this.drawTextLine(this.fitShipDiagnosticText(I18n.getString(718,'Double-click a system, or select it and press Enter')+`   ${layout.page+1} / ${layout.pages}`,rect.width-28,10),rect.x+rect.width/2,
            rect.y+rect.height-48,'gray',10,pdg.textStyle_Centered);
        this.getSystemComparisonActionRegions().filter(region=>region.label).forEach(region=>this.drawUIButton(region.rect,region.label));
        this.drawTableWindowResizeGrip(rect);
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
        const {rect,text,caret}=this.getRenameTextLayout(),editor=this.game.renameEditor;
        this.drawRoundedRect(rect,1,this.getFillAttributes('white'));
        if(editor && editor.selected && text)this.drawRoundedRect({x:rect.x+6,y:rect.y+4,
            width:Math.min(rect.width-12,this.port.getTextWidth(text,rect.size)),height:rect.height-8},0,this.renameSelectionStyle || (this.renameSelectionStyle=this.createAttributes({fillColor:new pdg.Color(.7,.82,1)})));
        this.drawTextLine(text,rect.x+6,rect.y+rect.height-5,'black',rect.size);
        if(!editor || !editor.selected){
            if(Math.floor(this.getVisualTime()/500)%2===0)this.port.drawLine(
                new pdg.Point(rect.x+6+caret,rect.y+4),new pdg.Point(rect.x+6+caret,rect.y+rect.height-4),this.getLineAttributes('black'));
        }
    }

    drawMapTargetPreview() {
        const object=this.game.pendingMapOrderObject,point=this.hoverPoint;
        if(!object || !point || this.game.mapSelectionPicker || this.game.hasEventPresentation() || WindowBehavior.isSystem(this.game.uiWindow))return;
        // Use the preceding waypoint as the origin when extending a plotted course.
        let origin=object;
        const edit=this.game.pendingCourseEdit,course=object.course;
        if(course && edit){const index=edit.replace?edit.index:edit.index===null?course.waypoints.length:edit.index+1;
            if(index>0)origin=course.resolve(course.waypoints[index-1]) || object;}
        const position=origin===object?this.getObjectScreenPosition(object):{x:this.toScreenX(origin.x),y:this.toScreenY(origin.y)};
        if(!this.targetPreviewStyle)this.targetPreviewStyle=this.createAttributes({lineColor:new pdg.Color(1,1,1,.5)});
        this.port.drawLine(new pdg.Point(position.x,position.y),new pdg.Point(point.x,point.y),this.targetPreviewStyle);
    }

    updateMapCursor() {
        if(!this.mapCursor)return;
        const game=this.game,blocked=game.hasEventPresentation() || game.mapSelectionPicker || WindowBehavior.isSystem(game.uiWindow);
        this.mapCursor.set(game.uiWindow==='rename'?'text':!blocked && game.isAwaitingMapTarget()?'crosshair':'default');
    }

    drawRendezvousPlacementPrompt() {
        if (!this.game.pendingRendezvousPlacement || this.game.mapSelectionPicker) {
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
            case 'games':this.drawGameSessions();break;
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
            case 'mapPick':this.drawMapSelectionWindow();break;
            case 'view':
                this.drawViewWindow();
                break;
            case 'mapDisplay':
                this.drawMapDisplayWindow();
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
            case 'fleetExchange':this.drawFleetExchangeWindow();break;
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
        if(this.game.showGrid===false)return;
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
        if(this.mapCursor)this.mapCursor.dispose();
        for(const attrs of [this.targetPreviewStyle,this.renameSelectionStyle])if(attrs && attrs.delete)attrs.delete();
        for(const effect of [this.destructionGlow,this.destructionStreak])if(effect && typeof effect.delete==='function')effect.delete();
        this.destructionGlow=null;this.destructionStreak=null;
        this.uiIcons.dispose();
        this.scannerLayer.dispose();
        if(this.scannerRingStyle && typeof this.scannerRingStyle.delete==='function')this.scannerRingStyle.delete();
        this.scannerRingStyle=null;
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
        if (this.controlHelp.visible) return;
        const {rect,label}=this.iconHint,screen=this.getScreenSize();
        const width=Math.min(screen.width-20,this.port.getTextWidth(label,11)+24);
        const box=Tooltip.place(rect,width,26,screen);
        Tooltip.draw(this.port,{rect:box,anchor:rect,lines:[label]});
    }

    // Main draw function that orchestrates all drawing
    drawGame() {
        this.visualTime=pdg.tm.getMilliseconds();
        this.camera.update(this.visualTime);
        this.hasDrawn=true;
        const scrollDrag=this.game.uiMapScrollDrag;
        if(scrollDrag && scrollDrag.part)this.game.updateMapScrollDrag(scrollDrag.x,scrollDrag.y);
        this.iconHint=null;
        this.hoverControl=null;
        // Update star rendering cache once per frame
        this.updateMapRenderingCalculations();
        this.mapDisplayState=MapDisplayModes.sample(this.game,this.game.mapDisplayMode || 'ownership');
        
        // Draw the distant background first.
        this.drawBackground();
        
        const game = this.game;
        const factory = this.factory;

        // Draw grid (behind game objects but above background)
        this.drawScannerRanges();
        this.drawGrid();
        this.drawDecorativeStars();

        // Draw game objects
        this.drawStars(game.stars);
        this.drawShips(game.allShips);
        this.drawRendezvousPoints(game.allRendezvous);
        this.drawFleets(game.allFleets);
        this.drawMapTargetPreview();
        
        // Draw UI
        this.drawMainUI(game.turn, game.stars.length, game.allShips.length);
        this.drawMapDisplayLegend();
        
        // Map help belongs behind inspectors so tall panels remain readable.
        this.drawInstructions();

        // Draw selected object details
        this.drawTransitionLayer('inspector',game.selectedObject && !game.pendingCourseEdit?game.selectedObject:null,()=>{
        if (game.selectedObject && !game.pendingCourseEdit && game.uiWindow!=='rename') {
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
        this.drawMapScrollbars();

        // Draw command UI windows above the map/help layer
        if(this.game.pendingCourseEdit && !this.game.mapSelectionPicker) {
            const screen=this.getScreenSize(),r={x:20,y:78,width:screen.width-40,height:40};
            this.drawWindowPanel(r,this.fitShipDiagnosticText(I18n.getString(734,'Click a destination; Esc cancels'),r.width-32,14));
        }
        this.drawTransitionLayer('window',game.uiWindow,()=>{
            this.drawingActiveWindow=true;
            try{this.drawActiveWindow();}finally{this.drawingActiveWindow=false;}
        });
        this.drawRendezvousPlacementPrompt();
        
        // Draw event overlay last
        if (game.overlay && game.uiWindow!=='endTurnConfirm') {
            this.drawOverlay(game.overlay);
        }
        this.drawControlHelp();
        this.drawIconHint();
        this.updateMapCursor();
    }

    clearControlHelp() { this.controlHelp.clear(); this.hoverPoint=null; }

    getControlHelpCandidate() {
        const game=this.game,point=this.hoverPoint;
        if (!point || game.showControlHelp===false || game.uiSliderDrag || game.uiWindowDrag || game.uiMapScrollDrag ||
                game.pendingCourseEdit || game.overlay && !['outcome','report'].includes(game.overlay.type)) return null;
        const action=this.getUIActionAt(point.x,point.y),text=ControlHelp.describe(action);
        if (!text) return null;
        const control=this.hoverControl || {rect:{x:point.x,y:point.y,width:1,height:1},label:''};
        return {rect:control.rect,text:control.label?control.label+'\n'+text:text,
            key:[game.uiWindow,action.type,action.allocationKey,action.key,action.object && action.object.id,
                action.language,control.label,control.rect.x,control.rect.y].join(':')};
    }

    drawControlHelp() {
        const hint=this.controlHelp.sample(this.getControlHelpCandidate(),this.visualTime,this.getScreenSize(),
            text=>this.port.getTextWidth(text,11));
        if (!hint) return;
        Tooltip.draw(this.port,hint);
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

    getOutcomeLayout(overlay) {
        const screen=this.getScreenSize(),width=Math.min(640,screen.width-40),height=Math.min(460,screen.height-40);
        const rect=this.fitWindowToScreen('outcome',{x:(screen.width-width)/2,y:(screen.height-height)/2,width,height});
        const viewer=this.game.getCurrentHumanPlayer(),local=viewer===overlay.playerNum;
        const title=I18n.getString(overlay.kind==='win'?614:overlay.kind==='defeat'?613:615);
        const summary=overlay.kind==='win'?I18n.formatString(644,'{0} wins on turn {1}',overlay.name,overlay.turn):
            overlay.kind==='defeat'?I18n.formatString(637,'{0} has been defeated',overlay.name):I18n.formatString(652,'No players remain on turn {0}',overlay.turn);
        const body=local && overlay.kind==='win'?I18n.getString(832).replace(/\|/g,'\n\n'):local && overlay.kind==='defeat'?I18n.getString(833).replace(/\|/g,'\n\n').replace(/\{0\}/g,()=>overlay.name):'';
        const summaryLines=this.wrapEventMessage(summary,width-40,14),bodyY=rect.y+58+summaryLines.length*20+18;
        const lines=body?this.wrapEventMessage(body,width-40,13):[];
        const capacity=Math.max(1,Math.floor((rect.y+height-100-bodyY)/18));
        const pages=Math.max(1,Math.ceil(lines.length/capacity)),page=this.clamp(overlay.page || 0,0,pages-1);
        const buttons=[{rect:{x:rect.x+width-174,y:rect.y+height-46,width:154,height:28},label:I18n.getString(834,'Continue'),action:{type:'dismissOutcome'}}];
        if(page>0)buttons.push({rect:{x:rect.x+20,y:rect.y+height-46,width:90,height:28},label:I18n.getString(690,'Previous'),action:{type:'outcomePage',page:page-1}});
        if(page<pages-1)buttons.push({rect:{x:rect.x+116,y:rect.y+height-46,width:90,height:28},label:I18n.getString(691,'Next'),action:{type:'outcomePage',page:page+1}});
        return {rect,title,summaryLines,lines,bodyY,capacity,pages,page,visibleLines:lines.slice(page*capacity,(page+1)*capacity),buttons};
    }

    drawOutcome(overlay) {
        const layout=this.getOutcomeLayout(overlay),r=layout.rect;
        this.drawWindowPanel(r,layout.title);
        layout.summaryLines.forEach((line,index)=>this.drawTextLine(line,r.x+20,r.y+58+index*20,'lightgray',14));
        layout.visibleLines.forEach((line,index)=>this.drawTextLine(line,r.x+20,layout.bodyY+index*18,'lightgray',13));
        this.drawTextLine(I18n.getString(572,'Enter, Space or Esc to continue'),r.x+20,r.y+r.height-70,'labelgray',11);
        layout.buttons.forEach(button=>this.drawUIButton(button.rect,button.label,null));
    }

    getReportLayout(overlay) {
        const screen=this.getScreenSize(),width=Math.min(600,screen.width-40);
        const event=this.game.eventLog.find(e=>e.id===overlay.eventId && this.game.isEventAccessible(e));
        const controls=[{label:I18n.getString(834,'Continue'),action:{type:'dismissReport'}}];
        if(event && this.game.getEventFocus(event))controls.push({label:I18n.getString(749,'Go to'),action:{type:'reportGoTo'}});
        const previous={label:I18n.getString(690,'Previous'),action:{type:'reportPage',page:0}};
        const next={label:I18n.getString(691,'Next'),action:{type:'reportPage',page:0}};
        const footer=this.layoutButtonRow([...controls,previous,next],{x:0,y:0,width:width-40,height:28,size:11,gap:8,minWidth:90});
        const lines=this.wrapEventMessage(event?event.message:'',width-40,13);
        const height=Math.min(400,screen.height-40,Math.max(180,58+lines.length*18+14+20+footer.rows*36-8));
        const rect=this.fitWindowToScreen('report',{x:(screen.width-width)/2,y:(screen.height-height)/2,width,height});
        const footerY=rect.y+height-20-(footer.rows*36-8),bodyY=rect.y+58;
        const capacity=Math.max(1,Math.floor((footerY-14-bodyY)/18)),pages=Math.max(1,Math.ceil(lines.length/capacity));
        const page=this.clamp(overlay.page || 0,0,pages-1);
        if(page>0)controls.push({...previous,action:{type:'reportPage',page:page-1}});
        if(page<pages-1)controls.push({...next,action:{type:'reportPage',page:page+1}});
        const buttons=this.layoutButtonRow(controls,{x:rect.x+20,y:footerY,width:width-40,height:28,size:11,gap:8,minWidth:90}).regions;
        return {rect,title:event?event.title:'',event,lines,bodyY,capacity,pages,page,visibleLines:lines.slice(page*capacity,(page+1)*capacity),buttons};
    }

    drawReport(overlay) {
        const layout=this.getReportLayout(overlay),r=layout.rect;
        this.drawWindowPanel(r,layout.title);
        layout.visibleLines.forEach((line,index)=>this.drawTextLine(line,r.x+20,layout.bodyY+index*18,'lightgray',13));
        layout.buttons.forEach(button=>this.drawUIButton(button.rect,button.label,null,{size:11}));
    }

    getDestructionEffect(overlay, start=false) {
        if(!overlay || overlay.type!=='report' || this.visualEffects.reducedMotion)return null;
        const event=this.game.eventLog.find(event=>event.id===overlay.eventId);
        const position=this.game.getReportDestructionPosition(event);
        if(!position)return null;
        if(!this.destructionStarts)this.destructionStarts=new WeakMap();
        let began=this.destructionStarts.get(overlay);
        if(began===undefined) {
            if(!start)return null;
            began=this.getVisualTime();this.destructionStarts.set(overlay,began);
        }
        const frame=DestructionEffect.sample(Math.max(0,this.getVisualTime()-began));
        return frame?{...frame,x:this.toScreenX(position.x),y:this.toScreenY(position.y)}:null;
    }

    drawDestructionEffect(overlay) {
        const effect=this.getDestructionEffect(overlay,true);
        if(!effect)return false;
        if(!this.destructionGlow)this.destructionGlow=this.createAttributes({lineStyle:pdg.lineStyle_None});
        if(!this.destructionStreak)this.destructionStreak=this.createAttributes({fillOpacity:0,lineThickness:2,lineColor:new pdg.Color(1,.65,.2)});
        const {x,y,radius,opacity}=effect,center=new pdg.Point(x,y);
        this.destructionGlow.fillRadialGradient(center,new pdg.Color(1,1,.8,opacity),radius,
            new pdg.Color(1,.12,0,0));
        this.port.drawCircle(center,radius,this.destructionGlow);
        this.destructionStreak.lineOpacity(opacity);
        for(let ray=0;ray<10;ray++) {
            const angle=ray*Math.PI/5+.13*effect.frame,reach=radius*(1.12+.13*Math.sin(ray*2.4));
            const point=distance=>new pdg.Point(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance);
            this.port.drawLine(point(radius*.5),point(reach),this.destructionStreak);
        }
        return true;
    }

    drawOverlay(overlay) {
        const exploding=this.drawDestructionEffect(overlay);
        if(this.game.sound)this.game.sound.present(this.game,overlay,exploding);
        if(exploding)return;
        if(overlay.animationOnly){
            if(this.game.sound && this.game.sound.isPending(overlay))return;
            this.game.dismissEventPresentation();return;
        }
        const drawingArea = this.port.getDrawingArea();
        // Dim the scene
        this.port.drawRect(new pdg.Rect(0, 0, drawingArea.width(), drawingArea.height()), this.styles.overlayDim);
        
        if(overlay.type==='outcome'){this.drawOutcome(overlay);return;}
        if(overlay.type==='report'){this.drawReport(overlay);return;}
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
            const hull=overlay.shipType || overlay.ship && overlay.ship.type;
            const base = hull && hull!=='battleship' ? {defense:'satellite',scout:'scout',colony:'colony'}[hull] : this.getShipArtNameForClass(overlay.classIndex);
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
            const name = hull && hull!=='battleship' ? I18n.getShipTypeName(hull,{capitalized:true}) :
                overlay.ship && overlay.ship.name ? overlay.ship.name.split('\t')[0] : this.getShipArtNameForClass(overlay.classIndex);
            this.port.drawText(I18n.formatString(571, 'New {0} Class Commissioned', name), new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.2), this.getTextAttributes('cyan', 16, pdg.textStyle_Centered));
        }
        // Footer hint
        this.port.drawText(this.STR.pressAnyKey, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.95), this.getTextAttributes('white', 12, pdg.textStyle_Centered));
    }
}

// Export the class
module.exports = Display;
