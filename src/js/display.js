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
        this.port.fillRect(new pdg.Rect(0, 0, this.gameWidth, this.gameHeight), 'black');
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
            this.port.fillCircle(new pdg.Point(star.x, star.y), Common.StarRadius * 5.0, ownerColor);
        }
        this.port.fillCircle(new pdg.Point(star.x, star.y), Common.StarRadius, color);
        
        color = 'gray';
        if (star.population > 0) {
            color = 'white';
        }
        this.port.drawText(`${star.name}`, new pdg.Point(star.x, star.y + Common.StarRadius + 12), 10, pdg.textStyle_Centered, color);

        // Draw selection indicator
        if (star === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            this.port.frameCircle(new pdg.Point(star.x, star.y), Common.StarRadius + 4 + pulse, 'white');
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
        this.port.fillPolygon(triangle, this.ownerColors[ship.owner]);
        this.port.framePolygon(triangle, 'white');
        
        if (ship.underConstruction()) {
            const progLen = Math.floor(ship.progress / 5);
            const statusRect = new pdg.Rect(new pdg.Point(x - 10, y - (Common.ShipRadius + 2)), 20, 2);
            this.port.fillRect(statusRect, 'gray');
            if (progLen > 0) {
                statusRect.right = statusRect.left + progLen;
                this.port.fillRect(statusRect, 'aqua');
            }
        }

        // Draw destination line
        if (ship.destination) {
            this.port.drawLine(new pdg.Point(x, y), new pdg.Point(ship.destination.x, ship.destination.y), 'gray');
        }

        // Draw selection indicator
        if (ship === this.selectedObject) {
            const pulse = 2.0 * pdg.tm.getMilliseconds() % 1000 / 1000.0
            this.port.frameCircle(new pdg.Point(x - 1.5, y), Common.ShipRadius + 4 + pulse, 'white');
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
        this.port.drawText(`Turn ${turn}`, new pdg.Point(10, 20), 16, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Stars: ${starCount} Ships: ${shipCount}`, new pdg.Point(10, 40), 14, pdg.textStyle_Plain, 'grey');
    }
    
    // Draw star details UI
    drawStarDetails(star) {
        this.port.drawText(`${star.name}`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'yellow');
        this.port.drawText(`Pop: ${Math.floor(star.population * 1000.0)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Tech: ${star.techLevel.toFixed(1)}`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Building: ${star.currentShip ? star.currentShip.type : 'None'}`, new pdg.Point(10, 140), 12, pdg.textStyle_Plain, 'white');
        
        // Draw ship building buttons
        const shipTypes = ['[s] scout', '[d] defense', '[b] battleship', '[c] colony'];
        this.port.frameRect(new pdg.Rect(new pdg.Point(10, 145), 100, 5 + shipTypes.length * 20), 'cyan');
        for (let i = 0; i < shipTypes.length; i++) {
            const shipType = shipTypes[i];
            const y = 160 + i * 20;
            this.port.drawText(`${shipType}`, new pdg.Point(20, y), 12, pdg.textStyle_Plain, 'cyan');
        }
    }
    
    // Draw ship details UI
    drawShipDetails(ship) {
        if (ship.underConstruction()) {
            this.port.drawText(`${ship.type} Ship Hull`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'cyan');
            this.port.drawText(`Tech Level: ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
            this.port.drawText(`Under Construction: ${ship.progress}%`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'yellow');
        } else {
            const speed = ship.speed / 16380.0;
            this.port.drawText(`${ship.type} Ship`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'cyan');
            this.port.drawText(`Tech Level: ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
            this.port.drawText(`Speed: ${speed.toFixed(1)}`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'white');
            this.port.drawText(`Power: ${this.game.rules.getShipPower(ship).toFixed(1)}`, new pdg.Point(10, 140), 12, pdg.textStyle_Plain, 'white');
            // this.port.drawText(`Defense: ${ship.stats.defense.toFixed(1)}`, new pdg.Point(10, 160), 12, pdg.textStyle_Plain, 'white');
        }
    }
    
    // Draw instructions
    drawInstructions() {
        this.port.drawText(`Click stars to manage them`, new pdg.Point(10, this.gameHeight - 60), 12, pdg.textStyle_Plain, 'gray');
        this.port.drawText(`Click ships to give orders`, new pdg.Point(10, this.gameHeight - 40), 12, pdg.textStyle_Plain, 'gray');
        this.port.drawText(`TAB to end turn`, new pdg.Point(10, this.gameHeight - 20), 12, pdg.textStyle_Plain, 'gray');
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
