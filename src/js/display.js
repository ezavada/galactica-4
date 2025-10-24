// Display functions for Galactica-4
// Contains all rendering and UI display logic

const Common = require('./common.js');
const Camera = require('./camera.js');

class Display {
    constructor(game) {
        this.port = game.port;
        this.game = game;
        this.factory = game.getFactory();
        this.selectedObject = null;
        game.setDisplay(this);
        const ownerColorNames = ['green', 'blue', 'red', 'yellow', 'purple', 'aqua', 'olive', 'lime'];
        this.ownerColors = ownerColorNames.map(name => new pdg.Color(name));
        this.ownerColors.forEach(color => color.alpha = 0.5);
        
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
                console.log(`Display: selected ${object.type}`);
            } else if (objectType === Common.ObjectType.STAR) {
                console.log(`Display: selected ${object.name}`);
            }
        } else {
            console.log(`Display: selected nothing`);
        }
        this.selectedObject = object;
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
        
        // Calculate scaled star radius based on zoom level
        if (zoom >= 0.5) {
            this.cachedScaledRadius = Common.StarRadius; // Full size
        } else if (zoom <= 0.1) {
            this.cachedScaledRadius = Common.StarRadius * 0.25; // 1/4 size
        } else {
            // Linear interpolation between 0.5 and 0.1
            const t = (0.5 - zoom) / (0.5 - 0.1); // t goes from 0 to 1
            const scale = 1.0 - (t * 0.75); // Scale goes from 1.0 to 0.25
            this.cachedScaledRadius = Common.StarRadius * scale;
        }
        
        // Calculate default star name opacity based on star size
        const sizeRatio = this.cachedScaledRadius / Common.StarRadius;
        if (sizeRatio >= 0.5) {
            this.cachedDefaultNameOpacity = 1.0; // Fully visible
        } else if (sizeRatio <= 0.25) {
            this.cachedDefaultNameOpacity = 0.0; // Completely invisible
        } else {
            // Linear interpolation between 50% and 25% size
            const t = (0.5 - sizeRatio) / (0.5 - 0.25); // t goes from 0 to 1
            this.cachedDefaultNameOpacity = 1.0 - t; // Opacity goes from 1.0 to 0.0
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
        // Convert galactic coordinates to screen coordinates
        const screenX = this.toScreenX(star.x);
        const screenY = this.toScreenY(star.y);
        
        // Use cached scaled star radius (calculated once per frame)
        const scaledRadius = this.cachedScaledRadius;
        
        let color = 'white';
        if (star.population > 0) {
            color = 'yellow';
        }
        if (star.owner) {
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
        const nameOpacity = isHomeSystem ? 1.0 : this.cachedDefaultNameOpacity;
        if (nameOpacity > 0) {
            color = 'gray';
            if (star.population > 0) {
                color = 'white';
            }
            const textAttrs = new pdg.Attributes();
            const textColor = new pdg.Color(color);
            textColor.alpha = nameOpacity; // Apply fading
            textAttrs.fillColor(textColor);
            textAttrs.textSize(isHomeSystem ? 11 : 10);
            textAttrs.textStyle(pdg.textStyle_Centered);
            this.port.drawText(`${star.name}`, new pdg.Point(screenX, screenY + scaledRadius + 12), textAttrs);
        }

        // Draw selection indicator
        if (star === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            const frameAttrs = new pdg.Attributes();
            frameAttrs.lineColor(new pdg.Color('white'));
            this.port.drawCircle(new pdg.Point(screenX, screenY), scaledRadius + 4 + pulse, frameAttrs);
        }
    }
    
    // Draw all stars
    drawStars(stars) {
        for (const star of stars) {
            this.drawStar(star);
        }
    }
    
    // Draw a single ship
    drawShip(ship) {
        // Convert galactic coordinates to screen coordinates
        let x = this.toScreenX(ship.x);
        let y = this.toScreenY(ship.y);
        
        // Offset for ships parked at stars
        if (ship.star) {
            x += 10;
            y -= 6;
        }
        
        var triangle = new pdg.Polygon(
            new pdg.Point(x-6, y-6),
            new pdg.Point(x+6, y),
            new pdg.Point(x-6, y+6)
        );
        const fillAttrs = new pdg.Attributes();
        fillAttrs.fillColor(this.ownerColors[ship.owner]);
        this.port.drawPolygon(triangle, fillAttrs);
        
        const frameAttrs = new pdg.Attributes();
        frameAttrs.lineColor(new pdg.Color('white'));
        this.port.drawPolygon(triangle, frameAttrs);
        
        if (ship.underConstruction()) {
            const progLen = Math.floor(ship.progress / 5);
            const statusRect = new pdg.Rect(new pdg.Point(x - 10, y - (Common.ShipRadius + 2)), 20, 2);
            const grayAttrs = new pdg.Attributes();
            grayAttrs.fillColor(new pdg.Color('gray'));
            this.port.drawRect(statusRect, grayAttrs);
            if (progLen > 0) {
                statusRect.right = statusRect.left + progLen;
                const aquaAttrs = new pdg.Attributes();
                aquaAttrs.fillColor(new pdg.Color('aqua'));
                this.port.drawRect(statusRect, aquaAttrs);
            }
        }

        // Draw destination line (convert destination to screen coordinates)
        if (ship.destination) {
            const lineAttrs = new pdg.Attributes();
            lineAttrs.lineColor(new pdg.Color('gray'));
            const destX = this.toScreenX(ship.destination.x);
            const destY = this.toScreenY(ship.destination.y);
            this.port.drawLine(new pdg.Point(x, y), new pdg.Point(destX, destY), lineAttrs);
        }

        // Draw selection indicator
        if (ship === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            const selAttrs = new pdg.Attributes();
            selAttrs.lineColor(new pdg.Color('white'));
            this.port.drawCircle(new pdg.Point(x - 1.5, y), Common.ShipRadius + 4 + pulse, selAttrs);
        }
    }
    
    // Draw all ships
    drawShips(ships) {
        for (const ship of ships) {
            this.drawShip(ship);
        }
    }
    
    // Draw main UI elements
    drawMainUI(turn, starCount, shipCount) {
        const attrs1 = new pdg.Attributes();
        attrs1.fillColor(new pdg.Color('white'));
        attrs1.textSize(16);
        attrs1.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`${this.STR.turn} ${turn}`, new pdg.Point(10, 20), attrs1);
        
        const attrs2 = new pdg.Attributes();
        attrs2.fillColor(new pdg.Color('grey'));
        attrs2.textSize(14);
        attrs2.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`${this.STR.stars} ${starCount} ${this.STR.ships} ${shipCount}`, new pdg.Point(10, 40), attrs2);
        
        // Add zoom information
        const zoomAttrs = new pdg.Attributes();
        zoomAttrs.fillColor(new pdg.Color('cyan'));
        zoomAttrs.textSize(12);
        zoomAttrs.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`Zoom: ${this.getZoomPercentage()}%`, new pdg.Point(10, 60), zoomAttrs);
    }
    
    // Draw star details UI
    drawStarDetails(star) {
        const yellowAttrs = new pdg.Attributes();
        yellowAttrs.fillColor(new pdg.Color('yellow'));
        yellowAttrs.textSize(14);
        yellowAttrs.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`${star.name}`, new pdg.Point(10, 80), yellowAttrs);
        
        const whiteAttrs = new pdg.Attributes();
        whiteAttrs.fillColor(new pdg.Color('white'));
        whiteAttrs.textSize(12);
        whiteAttrs.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`${this.STR.pop} ${Math.floor(star.population * 1000.0)}`, new pdg.Point(10, 100), whiteAttrs);
        this.port.drawText(`${this.STR.tech} ${star.techLevel.toFixed(1)}`, new pdg.Point(10, 120), whiteAttrs);
        const buildingType = star.currentShip ? this.getShipTypeName(star.currentShip.type) : this.STR.none;
        this.port.drawText(`${this.STR.building} ${buildingType}`, new pdg.Point(10, 140), whiteAttrs);
        
        // Draw ship building buttons
        const shipTypes = [this.STR.buildScout, this.STR.buildDefense, this.STR.buildBattleship, this.STR.buildColony];
        const frameAttrs = new pdg.Attributes();
        frameAttrs.lineColor(new pdg.Color('cyan'));
        this.port.drawRect(new pdg.Rect(new pdg.Point(10, 145), 100, 5 + shipTypes.length * 20), frameAttrs);
        
        const cyanAttrs = new pdg.Attributes();
        cyanAttrs.fillColor(new pdg.Color('cyan'));
        cyanAttrs.textSize(12);
        cyanAttrs.textStyle(pdg.textStyle_Plain);
        for (let i = 0; i < shipTypes.length; i++) {
            const shipType = shipTypes[i];
            const y = 160 + i * 20;
            this.port.drawText(`${shipType}`, new pdg.Point(20, y), cyanAttrs);
        }
    }
    
    // Draw ship details UI
    drawShipDetails(ship) {
        const cyanAttrs = new pdg.Attributes();
        cyanAttrs.fillColor(new pdg.Color('cyan'));
        cyanAttrs.textSize(14);
        cyanAttrs.textStyle(pdg.textStyle_Plain);
        
        const whiteAttrs = new pdg.Attributes();
        whiteAttrs.fillColor(new pdg.Color('white'));
        whiteAttrs.textSize(12);
        whiteAttrs.textStyle(pdg.textStyle_Plain);
        
        const yellowAttrs = new pdg.Attributes();
        yellowAttrs.fillColor(new pdg.Color('yellow'));
        yellowAttrs.textSize(12);
        yellowAttrs.textStyle(pdg.textStyle_Plain);
        
        const shipTypeName = this.getShipTypeName(ship.type);
        
        if (ship.underConstruction()) {
            this.port.drawText(`${shipTypeName} ${this.STR.shipHull}`, new pdg.Point(10, 80), cyanAttrs);
            this.port.drawText(`${this.STR.techLevel} ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), whiteAttrs);
            this.port.drawText(`${this.STR.underConstruction} ${ship.progress}%`, new pdg.Point(10, 120), yellowAttrs);
        } else {
            const speed = ship.speed / 16380.0;
            this.port.drawText(`${shipTypeName} ${this.STR.ship}`, new pdg.Point(10, 80), cyanAttrs);
            this.port.drawText(`${this.STR.techLevel} ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), whiteAttrs);
            this.port.drawText(`${this.STR.speed} ${speed.toFixed(1)}`, new pdg.Point(10, 120), whiteAttrs);
            this.port.drawText(`${this.STR.power} ${this.game.rules.getShipPower(ship).toFixed(1)}`, new pdg.Point(10, 140), whiteAttrs);
            // this.port.drawText(`Defense: ${ship.stats.defense.toFixed(1)}`, new pdg.Point(10, 160), 12, pdg.textStyle_Plain, 'white');
        }
    }
    
    // Draw instructions
    drawInstructions() {
        const drawingArea = this.port.getDrawingArea();
        const grayAttrs = new pdg.Attributes();
        grayAttrs.fillColor(new pdg.Color('gray'));
        grayAttrs.textSize(12);
        grayAttrs.textStyle(pdg.textStyle_Plain);
        
        this.port.drawText(this.STR.clickStars, new pdg.Point(10, drawingArea.height() - 100), grayAttrs);
        this.port.drawText(this.STR.clickShips, new pdg.Point(10, drawingArea.height() - 80), grayAttrs);
        this.port.drawText(this.STR.tabEndTurn, new pdg.Point(10, drawingArea.height() - 60), grayAttrs);
        
        // Add zoom and pan controls
        const controlAttrs = new pdg.Attributes();
        controlAttrs.fillColor(new pdg.Color('yellow'));
        controlAttrs.textSize(11);
        controlAttrs.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`[+/-] Zoom  [0] Reset  [C] Center  [F] Fit`, new pdg.Point(10, drawingArea.height() - 40), controlAttrs);
        this.port.drawText(`[Left Drag] Pan  [Middle Drag] Pan  [Mouse Wheel] Zoom`, new pdg.Point(10, drawingArea.height() - 20), controlAttrs);
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
        
        // Draw UI
        this.drawMainUI(game.turn, game.stars.length, game.allShips.length);
        
        // Draw selected object details
        if (game.selectedObject) {
            const objectType = game.getObjectType(game.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                this.drawStarDetails(game.selectedObject);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.drawShipDetails(game.selectedObject);
            }
        }
        
        // Draw instructions
        this.drawInstructions();
    }
}

// Export the class
module.exports = Display;
