// Display functions for Galactica-4
// Contains all rendering and UI display logic

const Common = require('./common.js');

class Display {
    constructor(game) {
        this.port = game.port;
        this.gameWidth = game.gameWidth;
        this.gameHeight = game.gameHeight;
        this.game = game;
        this.factory = game.getFactory();
        this.selectedObject = null;
        game.setDisplay(this);
        const ownerColorNames = ['green', 'blue', 'red', 'yellow', 'purple', 'aqua', 'olive', 'lime'];
        this.ownerColors = ownerColorNames.map(name => new pdg.Color(name));
        this.ownerColors.forEach(color => color.alpha = 0.5);
    }
    
    // Clear the screen
    clear() {
        const attrs = new pdg.Attributes();
        attrs.fillColor(new pdg.Color('black'));
        this.port.drawRect(new pdg.Rect(0, 0, this.gameWidth, this.gameHeight), attrs);
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
    
    // Draw a single star
    drawStar(star) {
        let color = 'white';
        if (star.population > 0) {
            color = 'yellow';
        }
        if (star.owner) {
            const ownerColor = this.ownerColors[star.owner];
            const attrs = new pdg.Attributes();
            attrs.fillColor(ownerColor);
            this.port.drawCircle(new pdg.Point(star.x, star.y), Common.StarRadius * 5.0, attrs);
        }
        const attrs = new pdg.Attributes();
        attrs.fillColor(new pdg.Color(color));
        this.port.drawCircle(new pdg.Point(star.x, star.y), Common.StarRadius, attrs);
        
        color = 'gray';
        if (star.population > 0) {
            color = 'white';
        }
        const textAttrs = new pdg.Attributes();
        textAttrs.fillColor(new pdg.Color(color));
        textAttrs.textSize(10);
        textAttrs.textStyle(pdg.textStyle_Centered);
        this.port.drawText(`${star.name}`, new pdg.Point(star.x, star.y + Common.StarRadius + 12), textAttrs);

        // Draw selection indicator
        if (star === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            const frameAttrs = new pdg.Attributes();
            frameAttrs.lineColor(new pdg.Color('white'));
            this.port.drawCircle(new pdg.Point(star.x, star.y), Common.StarRadius + 4 + pulse, frameAttrs);
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
            // Triangle (filled)
        let x = ship.x;
        let y = ship.y;
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

        // Draw destination line
        if (ship.destination) {
            const lineAttrs = new pdg.Attributes();
            lineAttrs.lineColor(new pdg.Color('gray'));
            this.port.drawLine(new pdg.Point(x, y), new pdg.Point(ship.destination.x, ship.destination.y), lineAttrs);
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
        this.port.drawText(`Turn ${turn}`, new pdg.Point(10, 20), attrs1);
        
        const attrs2 = new pdg.Attributes();
        attrs2.fillColor(new pdg.Color('grey'));
        attrs2.textSize(14);
        attrs2.textStyle(pdg.textStyle_Plain);
        this.port.drawText(`Stars: ${starCount} Ships: ${shipCount}`, new pdg.Point(10, 40), attrs2);
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
        this.port.drawText(`Pop: ${Math.floor(star.population * 1000.0)}`, new pdg.Point(10, 100), whiteAttrs);
        this.port.drawText(`Tech: ${star.techLevel.toFixed(1)}`, new pdg.Point(10, 120), whiteAttrs);
        this.port.drawText(`Building: ${star.currentShip ? star.currentShip.type : 'None'}`, new pdg.Point(10, 140), whiteAttrs);
        
        // Draw ship building buttons
        const shipTypes = ['[s] scout', '[d] defense', '[b] battleship', '[c] colony'];
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
        
        if (ship.underConstruction()) {
            this.port.drawText(`${ship.type} Ship Hull`, new pdg.Point(10, 80), cyanAttrs);
            this.port.drawText(`Tech Level: ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), whiteAttrs);
            this.port.drawText(`Under Construction: ${ship.progress}%`, new pdg.Point(10, 120), yellowAttrs);
        } else {
            const speed = ship.speed / 16380.0;
            this.port.drawText(`${ship.type} Ship`, new pdg.Point(10, 80), cyanAttrs);
            this.port.drawText(`Tech Level: ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), whiteAttrs);
            this.port.drawText(`Speed: ${speed.toFixed(1)}`, new pdg.Point(10, 120), whiteAttrs);
            this.port.drawText(`Power: ${this.game.rules.getShipPower(ship).toFixed(1)}`, new pdg.Point(10, 140), whiteAttrs);
            // this.port.drawText(`Defense: ${ship.stats.defense.toFixed(1)}`, new pdg.Point(10, 160), 12, pdg.textStyle_Plain, 'white');
        }
    }
    
    // Draw instructions
    drawInstructions() {
        const grayAttrs = new pdg.Attributes();
        grayAttrs.fillColor(new pdg.Color('gray'));
        grayAttrs.textSize(12);
        grayAttrs.textStyle(pdg.textStyle_Plain);
        
        this.port.drawText(`Click stars to manage them`, new pdg.Point(10, this.gameHeight - 60), grayAttrs);
        this.port.drawText(`Click ships to give orders`, new pdg.Point(10, this.gameHeight - 40), grayAttrs);
        this.port.drawText(`TAB to end turn`, new pdg.Point(10, this.gameHeight - 20), grayAttrs);
    }
    
    // Main draw function that orchestrates all drawing
    drawGame() {
        this.clear();
        
        const game = this.game;
        const factory = this.factory;

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
