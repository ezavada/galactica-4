// Display functions for Galactica-4
// Contains all rendering and UI display logic

const Common = require('./common.js');
const Camera = require('./camera.js');

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
        
        // Load UI strings from resources (cache for performance)
        this.STR = {
            turn: pdg.res.getString(1) || "Turn",
            stars: pdg.res.getString(2) || "Stars:",
            ships: pdg.res.getString(3) || "Ships:",
            pop: pdg.res.getString(4) || "Pop:",
            tech: pdg.res.getString(5) || "Tech:",
            building: pdg.res.getString(6) || "Building:",
            none: pdg.res.getString(7) || "None",
            clickStars: pdg.res.getString(8) || "Click stars to manage them",
            clickShips: pdg.res.getString(9) || "Click ships to give orders",
            tabEndTurn: pdg.res.getString(10) || "TAB to end turn",
            shipHull: pdg.res.getString(11) || "Ship Hull",
            ship: pdg.res.getString(12) || "Ship",
            techLevel: pdg.res.getString(13) || "Tech Level:",
            underConstruction: pdg.res.getString(14) || "Under Construction:",
            speed: pdg.res.getString(15) || "Speed:",
            power: pdg.res.getString(16) || "Power:",
            // Ship types
            scout: pdg.res.getString(20) || "scout",
            defense: pdg.res.getString(21) || "defense",
            battleship: pdg.res.getString(22) || "battleship",
            colony: pdg.res.getString(23) || "colony",
            // Build menu items
            buildScout: pdg.res.getString(30) || "[s] scout",
            buildDefense: pdg.res.getString(31) || "[d] defense",
            buildBattleship: pdg.res.getString(32) || "[b] battleship",
            buildColony: pdg.res.getString(33) || "[c] colony"
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
        const attrs = new pdg.Attributes();
        attrs.fillColor(new pdg.Color('black'));
        const drawingArea = this.port.getDrawingArea();
        this.port.drawRect(new pdg.Rect(0, 0, drawingArea.width(), drawingArea.height()), attrs);
    }
    
    // Draw fixed background image that maintains aspect ratio
    drawBackground() {
        const drawingArea = this.port.getDrawingArea();
        const screenWidth = drawingArea.width();
        const screenHeight = drawingArea.height();
        
        if (this.backgroundImage) {
            // Get the original image dimensions
            const imageWidth = this.backgroundImage.getWidth();
            const imageHeight = this.backgroundImage.getHeight();
            
            // Calculate scaling to maintain aspect ratio while covering the screen
            const scaleX = screenWidth / imageWidth;
            const scaleY = screenHeight / imageHeight;
            const scale = Math.max(scaleX, scaleY); // Use max to ensure image covers entire screen
            
            // Calculate the scaled dimensions
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeight * scale;
            
            // Center the image on the screen
            const offsetX = (screenWidth - scaledWidth) / 2;
            const offsetY = (screenHeight - scaledHeight) / 2;
            
            // Create rectangle for the background image (may extend beyond screen bounds)
            const backgroundRect = new pdg.Rect(offsetX, offsetY, scaledWidth, scaledHeight);
            
            const attrs = new pdg.Attributes();
            this.port.drawImage(this.backgroundImage, backgroundRect, attrs);
        } else {
            // Fallback to a gradient background if image not loaded
            const backgroundRect = new pdg.Rect(0, 0, screenWidth, screenHeight);
            const attrs = new pdg.Attributes();
            const startColor = new pdg.Color(0.1, 0.1, 0.3); // Dark blue
            const endColor = new pdg.Color(0.0, 0.0, 0.1);   // Very dark blue
            attrs.fillLinearGradient(new pdg.Point(0, 0), startColor, new pdg.Point(0, screenHeight), endColor);
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
    getShipTypeName(shipType) {
        const typeMap = {
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

    // Draw a single star
    drawStar(star) {
        const humanPlayer = 1; // Player 1 is the human player
        
        // Convert galactic coordinates to screen coordinates
        const screenX = this.toScreenX(star.x);
        const screenY = this.toScreenY(star.y);
        
        // Use cached scaled star radius (calculated once per frame)
        const scaledRadius = this.scaledStarRadius;
        
        // Determine visibility level for this star
        let visibilityLevel = Common.VisibilityLevel.NONE;
        if (star.owner === humanPlayer) {
            // Own stars are always fully visible
            visibilityLevel = Common.VisibilityLevel.DETAILS;
        } else if (star.isVisibleTo(humanPlayer)) {
            // Get the actual visibility level from the star
            const visibilityToPlayer = star.getVisibilityTo(humanPlayer);
            visibilityLevel = visibilityToPlayer ? visibilityToPlayer.level : Common.VisibilityLevel.NONE;
        }
        
        let color = 'white';
        if (star.namedStar) {
            color = 'yellow';
        }
        
        // Only show ownership color if we can see ownership details
        if (star.owner && visibilityLevel >= Common.VisibilityLevel.CLASS) {
            const ownerColor = this.ownerColors[star.owner];
            const attrs = new pdg.Attributes();
            attrs.fillColor(ownerColor);
            attrs.fillOpacity(0.25);
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
        
        const attrs = new pdg.Attributes();
        // Use radial gradient from center (bright) to edges (darker)
        const centerColor = new pdg.Color(color);
        const edgeColor = new pdg.Color(color);
        edgeColor.alpha = 0.1;  // Make edges more transparent/darker
        attrs.fillRadialGradient(new pdg.Point(screenX, screenY), centerColor, r, edgeColor);
        this.port.drawPolygon(diamond, attrs);
        
        const isHomeSystem = this.isHomeSystem(star);

        // Draw star name with fading based on star size, but never dim home system names
        const nameOpacity = isHomeSystem || star.namedStar ? 1.0 : this.mapEntityNameOpacity;
        if (nameOpacity > 0) {
            color = 'gray';
            if (star.population > 0 && visibilityLevel > Common.VisibilityLevel.NONE) {
                color = 'white';
            }
            const textAttrs = new pdg.Attributes();
            const textColor = new pdg.Color(color);
            textColor.alpha = nameOpacity; // Apply fading
            textAttrs.fillColor(textColor);
            textAttrs.textSize(star.namedStar ? 11 : 10);
            textAttrs.textStyle(pdg.textStyle_Centered);
            this.port.drawText(`${star.name}`, new pdg.Point(screenX, screenY + scaledRadius + 12), textAttrs);
        }

        // Draw selection indicator
        if (star === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            const frameAttrs = new pdg.Attributes();
            frameAttrs.lineColor(new pdg.Color(1,1,1,0.75));
            this.port.drawCircle(new pdg.Point(screenX, screenY), scaledRadius + 4 + pulse, frameAttrs);
        }
        
        // Draw default destination indicator (only for owned stars)
        const defaultDestination = star.getDefaultDestination();
        if (star.owner === humanPlayer && defaultDestination) {
            const destAttrs = new pdg.Attributes();
            destAttrs.lineColor(new pdg.Color(0, 1, 0, 0.8)); // Green color
            // Draw a small circle to indicate default destination is set
            this.port.drawLine(new pdg.Point(screenX, screenY), new pdg.Point(defaultDestination.x, defaultDestination.y), destAttrs);
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
    
    // Draw a single ship
    drawShip(ship) {
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
        const shipAttrs = new pdg.Attributes();
        shipAttrs.fillColor(this.ownerColors[ship.owner]).fillOpacity(shipOpacity);
        shipAttrs.lineStyle(pdg.lineStyle_Solid).lineColor(new pdg.Color(1,1,1,shipOpacity));
        this.port.drawPolygon(triangle, shipAttrs);
        
        if (ship.underConstruction()) {
            const progLen = Math.floor(ship.progress / 5);
            const statusRect = new pdg.Rect(new pdg.Point(x - 10, y - (this.scaledShipRadius + 2)), 20, 2);
            const grayAttrs = new pdg.Attributes();
            grayAttrs.fillOpacity(shipOpacity).fillColor(new pdg.Color('gray'));
            this.port.drawRect(statusRect, grayAttrs);
            if (progLen > 0) {
                statusRect.right = statusRect.left + progLen;
                const aquaAttrs = new pdg.Attributes();
                aquaAttrs.fillOpacity(shipOpacity).fillColor(new pdg.Color('aqua'));
                this.port.drawRect(statusRect, aquaAttrs);
            }
        }

        // Draw destination line (convert destination to screen coordinates)
        if (ship.destination) {
            const lineAttrs = new pdg.Attributes();
            lineAttrs.lineColor(new pdg.Color('cyan'));
            lineAttrs.lineOpacity(0.75);
            const destX = this.toScreenX(ship.destination.x);
            const destY = this.toScreenY(ship.destination.y);
            this.port.drawLine(new pdg.Point(x, y), new pdg.Point(destX, destY), lineAttrs);
        }

        // Draw selection indicator
        if (ship === this.selectedObject) {
            //console.log(`🎯 DRAWING SELECTION CIRCLE for ship ${ship.type} (ID: ${ship.id}) at (${x}, ${y})`);
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            const selAttrs = new pdg.Attributes();
            selAttrs.lineColor(new pdg.Color(1,1,1,0.75));
            this.port.drawCircle(new pdg.Point(x - 1.5, y), Common.ShipRadius + 4 + pulse, selAttrs);
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
                const willDraw = (ship.owner === humanPlayer || ship.isVisibleTo(humanPlayer));
                //console.log(`🎨 DRAWING SHIP UNDER CONSTRUCTION: ${ship.type} (ID: ${ship.id}) - Owner: ${ship.owner}, Visible: ${ship.isVisibleTo(humanPlayer)}, Will Draw: ${willDraw}`);
                if (willDraw) {
                    shipsUnderConstructionDrawn++;
                } else {
                    shipsUnderConstructionSkipped++;
                }
            }
            
            // Always show own ships, only show enemy ships if visible
            if (ship.owner === humanPlayer || ship.isVisibleTo(humanPlayer)) {
                this.drawShip(ship);
            }
        }
        
        if (shipsUnderConstructionDrawn > 0 || shipsUnderConstructionSkipped > 0) {
            //console.log(`🎨 DRAWING SUMMARY: ${shipsUnderConstructionDrawn} ships under construction drawn, ${shipsUnderConstructionSkipped} skipped`);
        }
    }
    
    // Draw a single fleet
    drawFleet(fleet) {
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
        const fleetAttrs = new pdg.Attributes();
        fleetAttrs.fillColor(this.ownerColors[fleet.owner]).fillOpacity(fleetOpacity * 0.7); // Slightly transparent
        fleetAttrs.lineStyle(pdg.lineStyle_Solid).lineColor(new pdg.Color(1,1,1,fleetOpacity));
        this.port.drawPolygon(hexagon, fleetAttrs);
        
        // Draw ship count in center
        if (fleetSize > 0) {
            const textAttrs = new pdg.Attributes();
            textAttrs.fillColor(new pdg.Color(1,1,1,fleetOpacity));
            textAttrs.textSize(Math.max(8, hexRadius * 0.8));
            textAttrs.textStyle(pdg.textStyle_Centered);
            this.port.drawText(fleetSize.toString(), new pdg.Point(x, y + 2), textAttrs);
        }
        
        // Draw destination line (convert destination to screen coordinates)
        if (fleet.destination) {
            const lineAttrs = new pdg.Attributes();
            lineAttrs.lineColor(new pdg.Color('orange')); // Different color from ships
            lineAttrs.lineOpacity(0.75);
            const destX = this.toScreenX(fleet.destination.x);
            const destY = this.toScreenY(fleet.destination.y);
            this.port.drawLine(new pdg.Point(x, y), new pdg.Point(destX, destY), lineAttrs);
        }

        // Draw selection indicator
        if (fleet === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0;
            const selAttrs = new pdg.Attributes();
            selAttrs.lineColor(new pdg.Color(1,1,1,0.75));
            this.port.drawCircle(new pdg.Point(x, y), hexRadius + 6 + pulse, selAttrs);
        }
    }
    
    // Draw all fleets
    drawFleets(fleets) {
        const humanPlayer = 1; // Player 1 is the human player
        
        for (const fleet of fleets) {
            // Always show own fleets, only show enemy fleets if visible
            if (fleet.owner === humanPlayer || fleet.isVisibleTo(humanPlayer)) {
                this.drawFleet(fleet);
            }
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
        const colors = {
            panelFill: [0.13, 0.13, 0.14, 0.92],
            panelBorder: [0.42, 0.42, 0.44, 0.95],
            buttonFill: [0.18, 0.18, 0.19, 0.92],
            buttonFillHover: [0.14, 0.14, 0.15, 0.96],
            buttonFillActive: [0.24, 0.24, 0.25, 0.95],
            buttonFillActiveHover: [0.20, 0.20, 0.21, 0.98],
            buttonBorder: [0.50, 0.50, 0.52, 0.95],
            divider: [0.34, 0.34, 0.36, 0.85],
            connector: [0.56, 0.56, 0.58, 0.50],
            barTrack: [0.22, 0.22, 0.23, 0.95],
            topInfoFill: [0.11, 0.11, 0.12, 0.86],
            textLight: [0.78, 0.78, 0.80, 1.0],
            textLabel: [0.64, 0.64, 0.66, 1.0],
            textHover: [0.96, 0.96, 0.98, 1.0],
            textMuted: [0.56, 0.56, 0.58, 1.0]
        };

        const color = colors[name];
        if (color) {
            return new pdg.Color(color[0], color[1], color[2], color[3]);
        }
        return new pdg.Color(name);
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

    makeTextAttributes(color = 'lightgray', size = 12, style = pdg.textStyle_Plain) {
        const attrs = new pdg.Attributes();
        attrs.fillColor(this.resolveColor(color));
        attrs.textSize(size);
        attrs.textStyle(style);
        return attrs;
    }

    getPanelContentStartY(rect) {
        return rect.y + 47;
    }

    drawTextLine(text, x, y, color = 'lightgray', size = 12, style = pdg.textStyle_Plain) {
        this.port.drawText(text, new pdg.Point(x, y), this.makeTextAttributes(color, size, style));
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
            return {
                left: rect.x,
                top: rect.y,
                right: rect.x + rect.width,
                bottom: rect.y + rect.height
            };
        }
        return rect;
    }

    drawRoundedRect(rect, radius = 12, fillColor = null, lineColor = null) {
        const pdgRect = this.toPDGRect(rect);
        const attrs = new pdg.Attributes();
        if (fillColor) {
            attrs.fillColor(fillColor);
        }
        if (lineColor) {
            attrs.lineColor(lineColor);
        }

        if (typeof this.port.drawRoundedRect === 'function') {
            this.port.drawRoundedRect(pdgRect, radius, attrs);
        } else if (typeof attrs.roundedCorners === 'function') {
            attrs.roundedCorners(radius);
            this.port.drawRect(pdgRect, attrs);
        } else {
            this.port.drawRect(pdgRect, attrs);
        }
    }

    drawDivider(x, y, width) {
        const dividerAttrs = new pdg.Attributes();
        dividerAttrs.lineColor(this.getUIColor('divider'));
        this.port.drawLine(new pdg.Point(x, y), new pdg.Point(x + width, y), dividerAttrs);
    }

    drawPanel(rect, title = null, borderColor = null) {
        this.drawRoundedRect(rect, 14, this.getUIColor('panelFill'), borderColor ? new pdg.Color(borderColor) : this.getUIColor('panelBorder'));

        if (title) {
            this.drawTextLine(title, rect.x + 16, rect.y + 22, 'lightgray', 14);
            this.drawDivider(rect.x + 14, rect.y + 28, rect.width - 28);
        }
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

        const attrs = new pdg.Attributes();
        attrs.fillColor(this.getUIColor('panelFill'));
        attrs.lineColor(borderColor ? new pdg.Color(borderColor) : this.getUIColor('panelBorder'));
        this.port.drawPolygon(new pdg.Polygon(...pointer.points), attrs);
    }

    drawAnchoredPanel(object, rect, title = null, borderColor = null) {
        this.drawPanelPointer(object, rect, borderColor);
        this.drawPanel(rect, title, borderColor);
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
        const trackAttrs = new pdg.Attributes();
        trackAttrs.fillColor(this.getUIColor('barTrack'));
        this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), width, height), trackAttrs);

        const fillWidth = Math.max(0, Math.min(width, Math.round(width * ratio)));
        if (fillWidth > 0) {
            const fillAttrs = new pdg.Attributes();
            fillAttrs.fillColor(this.resolveColor(color));
            this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), fillWidth, height), fillAttrs);
        }

        const frameAttrs = new pdg.Attributes();
        frameAttrs.lineColor(this.getUIColor('divider'));
        this.port.drawRect(new pdg.Rect(new pdg.Point(x, y), width, height), frameAttrs);
    }

    snapRectToPixels(rect) {
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    }

    drawUIButton(rect, label, hotkey = null, options = {}) {
        const drawRect = this.snapRectToPixels(rect);
        const active = !!options.active;
        const hovered = this.isHovered(drawRect);
        let fillColorName = active ? 'buttonFillActive' : 'buttonFill';
        if (hovered) {
            fillColorName = active ? 'buttonFillActiveHover' : 'buttonFillHover';
        }
        this.drawRoundedRect(
            drawRect,
            options.radius || 10,
            this.getUIColor(fillColorName),
            this.getUIColor('buttonBorder')
        );

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
            { key: 'M', label: 'Menu', window: 'menu', action: { type: 'toggleWindow', window: 'menu' } },
            { key: 'E', label: 'Events', window: 'events', action: { type: 'toggleWindow', window: 'events' } },
            { key: 'V', label: 'Compare', window: 'comparison', action: { type: 'toggleWindow', window: 'comparison' } },
            { key: 'H', label: 'Home', action: { type: 'selectHomeStar' } },
            { key: 'F', label: 'Fit', action: { type: 'zoomToFit' } }
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
                width: buttonWidth,
                height: buttonHeight
            };
            return { ...button, rect };
        });
    }

    drawMapButtons() {
        const buttons = this.getMapButtonRegions();
        for (const button of buttons) {
            this.drawUIButton(button.rect, button.label, button.key, { active: button.window && this.game.uiWindow === button.window });
        }
    }

    getContextActions(object) {
        const objectType = this.game.getObjectType(object);
        const actions = [];

        if (objectType === Common.ObjectType.STAR && this.game.canHumanControl(object)) {
            actions.push(
                { key: 'S', label: 'Scout', action: { type: 'buildShip', shipType: 'scout' } },
                { key: 'D', label: 'Defense', action: { type: 'buildShip', shipType: 'defense' } },
                { key: 'B', label: 'Battleship', action: { type: 'buildShip', shipType: 'battleship' } },
                { key: 'c', label: 'Colony', action: { type: 'buildShip', shipType: 'colony' } }
            );
        } else if (objectType === Common.ObjectType.SHIP || objectType === Common.ObjectType.FLEET) {
            if (this.game.canHumanControl(object)) {
                actions.push({ key: 'RMB', label: 'Orders', action: { type: 'beginOrders' } });
            }
            actions.push(
                { key: 'C', label: 'Center', action: { type: 'centerObject' } },
                { key: 'V', label: 'Compare', action: { type: 'toggleWindow', window: 'comparison' } }
            );
        } else {
            actions.push(
                { key: 'C', label: 'Center', action: { type: 'centerObject' } },
                { key: 'V', label: 'Compare', action: { type: 'toggleWindow', window: 'comparison' } }
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
        const connectorAttrs = new pdg.Attributes();
        connectorAttrs.lineColor(this.getUIColor('connector'));

        const buttons = this.getContextButtonArc(object, panelRect);
        for (const button of buttons) {
            const end = this.getButtonConnectorPoint(object, button);
            const start = this.getConnectorStartPoint(object, end.x, end.y);
            this.port.drawLine(new pdg.Point(start.x, start.y), new pdg.Point(end.x, end.y), connectorAttrs);
        }
        for (const button of buttons) {
            this.drawUIButton(button.rect, button.label, button.key, { size: 10, radius: 14 });
        }
    }

    getSelectedObjectPanelRect(object) {
        const objectType = this.game.getObjectType(object);
        if (objectType === Common.ObjectType.STAR) {
            return this.getStarDetailsLayout(object).rect;
        }
        if (objectType === Common.ObjectType.SHIP) {
            return this.getAnchoredPanelRect(object, 240, object.underConstruction() ? 120 : 150);
        }
        if (objectType === Common.ObjectType.FLEET) {
            const shipTypes = {};
            for (const ship of object.ships) {
                shipTypes[ship.type] = (shipTypes[ship.type] || 0) + 1;
            }
            const compositionRows = Object.entries(shipTypes);
            return this.getAnchoredPanelRect(object, 260, 150 + compositionRows.length * 16 + (object.destination ? 18 : 0));
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

    getCommandWindowRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({ x: screen.width - 320, y: 54, width: 300, height: 120 });
    }

    getProductionWindowRect() {
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({ x: screen.width - 370, y: 84, width: 350, height: 155 });
    }

    getEventWindowRect() {
        const events = this.game.getRecentEvents(10);
        const screen = this.getScreenSize();
        return this.fitPanelToScreen({
            x: screen.width - 430,
            y: 84,
            width: 410,
            height: Math.max(150, 62 + Math.max(events.length, 1) * 36)
        });
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

    getActiveWindowRect() {
        switch (this.game.uiWindow) {
            case 'menu':
                return this.getCommandWindowRect();
            case 'production':
                return this.getProductionWindowRect();
            case 'events':
                return this.getEventWindowRect();
            case 'comparison':
                return this.getComparisonWindowRect();
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

    getSliderActionAt(x, y) {
        const slider = this.getAllocationSliderRegions().find(region => this.containsPoint(region.rect, x, y));
        if (!slider) {
            return null;
        }

        const desired = this.clamp(Math.round(((x - slider.trackRect.x) / slider.trackRect.width) * 100), 0, 100);
        return {
            type: 'setAllocation',
            star: slider.star,
            allocationKey: slider.key,
            desired
        };
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

        return regions;
    }

    getUIActionAt(x, y) {
        const contextButton = this.getContextButtonRegions().find(button => this.containsPoint(button.rect, x, y));
        if (contextButton) {
            return contextButton.action;
        }

        const sliderAction = this.getSliderActionAt(x, y);
        if (sliderAction) {
            return sliderAction;
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

    drawAllocationSlider(label, allocation, x, y, width, color) {
        const desired = this.game.getAllocationDesired(allocation);
        const current = allocation && allocation.value !== undefined ? allocation.value : desired;
        const rects = this.getAllocationSliderRects(x, y, width);
        const hovered = this.isHovered(rects.control);
        const labelColor = hovered ? 'hovergray' : 'labelgray';
        const valueColor = hovered ? 'hovergray' : 'lightgray';
        this.drawRightTextLine(`${label}:`, rects.track.x - 8, y, labelColor, 11);
        this.drawBar(rects.track.x, rects.track.y, rects.track.width, rects.track.height, desired / 100.0, color);
        this.drawTextLine(`${Math.round(desired)}%`, rects.percent.x, y, valueColor, 11);

        const currentMarkerX = rects.track.x + this.clamp(Math.round(width * current / 100.0), 0, width);
        const markerAttrs = new pdg.Attributes();
        markerAttrs.lineColor(this.resolveColor(valueColor));
        this.port.drawLine(new pdg.Point(currentMarkerX, y - 11), new pdg.Point(currentMarkerX, y + 1), markerAttrs);
    }

    drawStarAllocationSummary(star, x, y, width = 150) {
        this.drawAllocationSlider('Growth', star.growth, x, y, width, 'green');
        this.drawAllocationSlider('Ships', star.shipBuilding, x, y + 18, width, 'cyan');
        this.drawAllocationSlider('Research', star.research, x, y + 36, width, 'purple');
        return y + 54;
    }

    getStarDetailsPanelHeight(star) {
        if (!this.game.canHumanControl(star)) {
            return 130;
        }
        return 216;
    }

    getStarDetailsLayout(star) {
        const rect = this.getAnchoredPanelRect(star, 290, this.getStarDetailsPanelHeight(star));
        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);

        y += 18; // owner
        y += 18; // population
        y += 18; // tech
        y += 18; // current build

        const dividerY = y - 1;
        const productionTitleY = dividerY + 19;
        const sliderStartY = productionTitleY + 18;
        return {
            rect,
            x,
            basicStartY: this.getPanelContentStartY(rect),
            dividerY,
            productionTitleY,
            sliderStartY,
            sliderWidth: 150
        };
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
        const gameName = (this.game.config && this.game.config.gameTitle) ? this.game.config.gameTitle : (player && player.name) || 'Galactica-4';
        const headerWidth = Math.min(420, screen.width - 40);
        const rect = {
            x: (screen.width - headerWidth) / 2,
            y: 12,
            width: headerWidth,
            height: 56
        };

        this.drawRoundedRect(rect, 16, this.getUIColor('topInfoFill'), this.getUIColor('panelBorder'));
        this.drawTextLine(`${gameName}  •  ${this.STR.turn} ${turn}`, screen.width / 2, rect.y + 24, 'lightgray', 15, pdg.textStyle_Centered);
        this.drawTextLine(`${this.STR.stars} ${starCount}   ${this.STR.ships} ${shipCount}   Zoom ${this.getZoomPercentage()}%`, screen.width / 2, rect.y + 44, 'gray', 11, pdg.textStyle_Centered);
        this.drawMapButtons();
    }

    drawMenuBar() {
        this.drawMapButtons();
    }
    
    // Draw star details UI
    drawStarDetails(star) {
        const owned = this.game.canHumanControl(star);
        const layout = this.getStarDetailsLayout(star);
        const rect = layout.rect;
        this.drawAnchoredPanel(star, rect, star.name);

        let y = layout.basicStartY;
        const x = layout.x;
        this.drawLabelValue('Owner:', `${star.owner || 'Unclaimed'}`, x, y, { labelWidth: 70, valueColor: star.owner ? 'lightgray' : 'gray' });
        y += 18;
        this.drawLabelValue(this.STR.pop, this.formatPopulation(star), x, y, { labelWidth: 70 });
        y += 18;
        this.drawLabelValue(this.STR.tech, star.techLevel.toFixed(1), x, y, { labelWidth: 70 });
        y += 18;

        const buildingType = star.currentShip ? this.getShipTypeName(star.currentShip.type) : this.STR.none;
        this.drawLabelValue(this.STR.building, buildingType, x, y, { labelWidth: 70 });
        if (star.currentShip) {
            const progressTextRight = rect.x + rect.width - 25;
            const progressTextWidth = 40;
            const progressBarWidth = 72;
            const progressBarX = progressTextRight - progressTextWidth + 11 - progressBarWidth;
            this.drawBar(progressBarX, y - 8, progressBarWidth, 8, star.currentShip.progress / 100.0, 'lightgray');
            this.drawRightTextLine(`${Math.round(star.currentShip.progress)}%`, progressTextRight, y, 'lightgray', 11);
        }
        y += 18;

        if (!owned) {
            this.drawContextButtonArc(star, rect);
            return;
        }

        this.drawDivider(x, layout.dividerY, rect.width - 24);
        this.drawTextLine('Production', x, layout.productionTitleY, 'lightgray', 12);
        this.drawStarAllocationSummary(star, x, layout.sliderStartY, layout.sliderWidth);
        this.drawContextButtonArc(star, rect);
    }
    
    // Draw ship details UI
    drawShipDetails(ship) {
        const shipTypeName = this.getShipTypeName(ship.type);
        const rect = this.getAnchoredPanelRect(ship, 240, ship.underConstruction() ? 120 : 150);
        this.drawAnchoredPanel(ship, rect, `${shipTypeName} ${ship.underConstruction() ? this.STR.shipHull : this.STR.ship}`);

        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);
        this.drawLabelValue('Owner:', `${ship.owner}`, x, y, { labelWidth: 110, size: 11 });
        y += 18;
        this.drawLabelValue(this.STR.techLevel, ship.techLevel.toFixed(1), x, y, { labelWidth: 110 });
        y += 18;

        if (ship.underConstruction()) {
            const progressTextRight = rect.x + rect.width - 14;
            const progressTextWidth = 40;
            const progressBarWidth = 70;
            const progressBarX = progressTextRight - progressTextWidth - 6 - progressBarWidth;
            this.drawTextLine(this.STR.underConstruction, x, y, 'labelgray', 12);
            this.drawBar(progressBarX, y - 8, progressBarWidth, 8, ship.progress / 100.0, 'lightgray');
            this.drawRightTextLine(`${Math.round(ship.progress)}%`, progressTextRight, y, 'lightgray', 11);
        } else {
            const speed = ship.speed / 16380.0;
            this.drawLabelValue(this.STR.speed, speed.toFixed(1), x, y, { labelWidth: 110 });
            y += 18;
            this.drawLabelValue(this.STR.power, this.game.rules.getShipPower(ship).toFixed(1), x, y, { labelWidth: 110 });
            y += 18;
            this.drawLabelValue('Damage:', ship.damage ? ship.damage.toString() : 'none', x, y, { labelWidth: 110, size: 11, valueColor: 'gray' });
        }
        this.drawContextButtonArc(ship, rect);
    }
    
    // Draw fleet details UI
    drawFleetDetails(fleet) {
        const shipTypes = {};
        for (const ship of fleet.ships) {
            shipTypes[ship.type] = (shipTypes[ship.type] || 0) + 1;
        }
        const compositionRows = Object.entries(shipTypes);
        const rect = this.getAnchoredPanelRect(fleet, 260, 150 + compositionRows.length * 16 + (fleet.destination ? 18 : 0));
        this.drawAnchoredPanel(fleet, rect, `Fleet ${fleet.id}`);

        const x = rect.x + 12;
        let y = this.getPanelContentStartY(rect);
        this.drawLabelValue('Ships:', fleet.getSize().toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue('Total Power:', fleet.totalPower.toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue('Speed:', fleet.totalSpeed.toString(), x, y, { labelWidth: 92 });
        y += 18;
        this.drawLabelValue('Tech Level:', fleet.techLevel.toString(), x, y, { labelWidth: 92 });
        y += 22;

        for (const [shipType, count] of compositionRows) {
            this.drawLabelValue(`${shipType}:`, count.toString(), x, y, { labelWidth: 92, size: 11, valueColor: 'gray' });
            y += 16;
        }

        if (fleet.destination) {
            this.drawLabelValue('Moving to:', `(${Math.round(fleet.destination.x/1024)}, ${Math.round(fleet.destination.y/1024)})`, x, y, { labelWidth: 92, size: 11, valueColor: 'gray' });
        }
        this.drawContextButtonArc(fleet, rect);
    }

    drawCommandWindow() {
        const rect = this.getCommandWindowRect();
        this.drawPanel(rect, 'Command Menu');

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine('Keyboard shortcuts remain active.', x, y, 'gray', 11);
        y += 24;
        this.drawTextLine('<Esc> Close', x, y, 'gray', 10);
    }

    drawProductionWindow() {
        const rect = this.getProductionWindowRect();
        this.drawPanel(rect, 'Production Sliders');

        const star = this.game.getSelectedStar();
        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);

        if (!star || !this.game.canHumanControl(star)) {
            this.drawTextLine('Select one of your stars to tune production.', x, y, 'lightgray', 12);
            y += 24;
            this.drawTextLine('<Esc> Close', x, y, 'gray', 10);
            return;
        }

        this.drawTextLine(star.name, x, y, 'lightgray', 13);
        y += 28;
        this.drawStarAllocationSummary(star, x, y, 185);
        y += 68;
        this.drawTextLine('<Esc> Close', x, y, 'gray', 10);
    }

    drawEventWindow() {
        const events = this.game.getRecentEvents(10);
        const rect = this.getEventWindowRect();
        this.drawPanel(rect, 'Event List');

        let y = this.getPanelContentStartY(rect);
        const x = rect.x + 14;
        if (events.length === 0) {
            this.drawTextLine('No events yet.', x, y, 'gray', 12);
            return;
        }

        for (const event of events) {
            this.drawTextLine(`T${event.turn}  ${event.title}`, x, y, 'lightgray', 11);
            y += 15;
            this.drawTextLine(this.trimText(event.message, 56), x + 8, y, 'gray', 10);
            y += 21;
            this.drawDivider(x, y - 8, rect.width - 28);
        }
    }

    drawComparisonWindow() {
        const rows = this.game.getPlayerComparisonRows();
        const rect = this.getComparisonWindowRect();
        this.drawPanel(rect, 'Empire Comparison');

        const x = rect.x + 14;
        let y = this.getPanelContentStartY(rect);
        this.drawTextLine('Player', x, y, 'lightgray', 11);
        this.drawTextLine('Type', x + 170, y, 'lightgray', 11);
        this.drawTextLine('Stars', x + 245, y, 'lightgray', 11);
        this.drawTextLine('Ships', x + 300, y, 'lightgray', 11);
        this.drawTextLine('Pop', x + 355, y, 'lightgray', 11);
        this.drawTextLine('Avg Tech', x + 445, y, 'lightgray', 11);
        this.drawTextLine('Max', x + 535, y, 'lightgray', 11);
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
            let label = 'Selected object';
            if (selectedType === Common.ObjectType.STAR) {
                label = `Selected star: ${this.game.selectedObject.name}`;
            } else if (selectedType === Common.ObjectType.SHIP) {
                label = `Selected ship: ${this.getShipTypeName(this.game.selectedObject.type)}`;
            } else if (selectedType === Common.ObjectType.FLEET) {
                label = `Selected fleet: ${this.game.selectedObject.getSize()} ships`;
            }
            this.drawTextLine(label, x, y, 'lightgray', 11);
            y += 18;
            this.drawTextLine('<V>/<Esc> Close comparison', x, y, 'gray', 10);
        }
    }

    drawActiveWindow() {
        switch (this.game.uiWindow) {
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
            default:
                break;
        }
    }
    
    // Draw instructions
    drawInstructions() {
        const drawingArea = this.port.getDrawingArea();
        this.drawTextLine(`${this.STR.clickStars}   ${this.STR.clickShips}`, 10, drawingArea.height() - 60, 'gray', 12);
        this.drawTextLine(`${this.STR.tabEndTurn}   <+/-> Zoom   <0> Reset   <Shift+C> Center`, 10, drawingArea.height() - 38, 'lightgray', 11);
        this.drawTextLine(`<Left Drag> Pan   <Middle Drag> Pan   <Mouse Wheel> Zoom`, 10, drawingArea.height() - 18, 'gray', 11);
    }
    
    // Draw grid lines based on sector boundaries
    drawGrid() {
        const drawingArea = this.port.getDrawingArea();
        const gridAttrs = new pdg.Attributes();
        gridAttrs.lineColor(new pdg.Color(0.25, 0.25, 0.5, 0.5));
        
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
                    gridAttrs
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
                    gridAttrs
                );
            }
        }
    }

    // Main draw function that orchestrates all drawing
    drawGame() {
        // Update star rendering cache once per frame
        this.updateMapRenderingCalculations();
        
        // Draw fixed background first (behind everything else)
        this.drawBackground();
        
        const game = this.game;
        const factory = this.factory;

        // Draw grid (behind game objects but above background)
        this.drawGrid();

        // Draw game objects
        this.drawStars(game.stars);
        this.drawShips(game.allShips);
        this.drawFleets(game.allFleets);
        
        // Draw UI
        this.drawMainUI(game.turn, game.stars.length, game.allShips.length);
        
        // Draw selected object details
        if (game.selectedObject) {
            const objectType = game.getObjectType(game.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                this.drawStarDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.drawShipDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.FLEET) {
                this.drawFleetDetails(game.selectedObject);
            }
        }
        
        // Draw instructions
        this.drawInstructions();

        // Draw command UI windows above the map/help layer
        this.drawActiveWindow();
        
        // Draw event overlay last
        if (game.overlay) {
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
            const namesStr = pdg.res.getString(800) || 'Traveller';
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
        const dimAttrs = new pdg.Attributes();
        dimAttrs.fillColor(new pdg.Color(0, 0, 0, 0.65));
        this.port.drawRect(new pdg.Rect(0, 0, drawingArea.width(), drawingArea.height()), dimAttrs);
        
        if (overlay.type === 'lab') {
            const back = this.getImageCached('labback', 'events/labback.png');
            const top = this.getImageCached('labtop', 'events/labtop.png');
            const blueprintIdx = Math.max(1, Math.min(12, overlay.classIndex + 1));
            const blueprintName = `tech/blue-0${blueprintIdx}.png`;
            let blueprint = null;
            try { blueprint = pdg.res.getImage(blueprintName); } catch (e) { }
            const centerRect = new pdg.Rect(
                drawingArea.width()*0.1,
                drawingArea.height()*0.05,
                drawingArea.width()*0.8,
                drawingArea.height()*0.9
            );
            const attrs = new pdg.Attributes();
            if (back) this.port.drawImage(back, centerRect, attrs);
            if (blueprint) this.port.drawImage(blueprint, centerRect, attrs);
            if (top) this.port.drawImage(top, centerRect, attrs);
            const text = new pdg.Attributes();
            text.fillColor(new pdg.Color('yellow')).textSize(16).textStyle(pdg.textStyle_Centered);
            this.port.drawText(`New Drive Technology`, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.1), text);
        } else if (overlay.type === 'stardock') {
            const back = this.getImageCached('stardock', 'events/newstardock.png');
            const front = this.getImageCached('stardockfront', 'events/newstardockfront.png');
            const base = this.getShipArtNameForClass(overlay.classIndex);
            let shipImg = null;
            try { shipImg = pdg.res.getImage(`ships/${base}.png`); } catch (e) {}
            const centerRect = new pdg.Rect(
                drawingArea.width()*0.05,
                drawingArea.height()*0.15,
                drawingArea.width()*0.9,
                drawingArea.height()*0.75
            );
            const attrs = new pdg.Attributes();
            if (back) this.port.drawImage(back, centerRect, attrs);
            if (shipImg) this.port.drawImage(shipImg, centerRect, attrs);
            if (front) this.port.drawImage(front, centerRect, attrs);
            const text = new pdg.Attributes();
            text.fillColor(new pdg.Color('cyan')).textSize(16).textStyle(pdg.textStyle_Centered);
            const name = overlay.ship && overlay.ship.name ? overlay.ship.name.split('\t')[0] : this.getShipArtNameForClass(overlay.classIndex);
            this.port.drawText(`New ${name} Class Commissioned`, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.2), text);
        }
        // Footer hint
        const hint = new pdg.Attributes();
        hint.fillColor(new pdg.Color('white')).textSize(12).textStyle(pdg.textStyle_Centered);
        this.port.drawText(`Press any key to continue`, new pdg.Point(drawingArea.width()/2, drawingArea.height()*0.95), hint);
    }
}

// Export the class
module.exports = Display;
