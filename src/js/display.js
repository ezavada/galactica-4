// Display functions for Galactica-4
// Contains all rendering and UI display logic

class Display {
    static starRadius = 8;
    static shipRadius = 5;
    
    constructor(game) {
        this.port = game.port;
        this.gameWidth = game.gameWidth;
        this.gameHeight = game.gameHeight;
        this.game = game;
        this.factory = game.getFactory();
        this.selectedObject = null;
        game.setDisplay(this);
    }
    
    // Clear the screen
    clear() {
        this.port.fillRect(new pdg.Rect(0, 0, this.gameWidth, this.gameHeight), 'black');
    }
    
    setSelectedObject(object) {
        if (object) {
            console.log(`Display: Setting selected object to ${object.type}`);
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
        this.port.fillCircle(new pdg.Point(star.x, star.y), Display.starRadius, color);
        
        // Draw selection indicator
        if (star === this.selectedObject) {
            this.port.frameCircle(new pdg.Point(star.x, star.y), Display.starRadius + 4, 'white');
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
        const shipColor = this.getShipColor(ship);
        this.port.fillCircle(new pdg.Point(ship.x, ship.y), Display.shipRadius, shipColor);
        
        // Draw selection indicator
        if (ship === this.selectedObject) {
            this.port.frameCircle(new pdg.Point(ship.x, ship.y), Display.shipRadius + 2, 'white');
        }
        
        if (ship.underConstruction()) {
            const progLen = Math.floor(ship.progress / 5);
            const statusRect = new pdg.Rect(new pdg.Point(ship.x - 10, ship.y - (Display.shipRadius + 2)), 20, 2);
            this.port.fillRect(statusRect, 'gray');
            if (progLen > 0) {
                statusRect.right = statusRect.left + progLen;
                this.port.fillRect(statusRect, 'cyan');
            }
        }

        // Draw destination line
        if (ship.destination) {
            this.port.drawLine(new pdg.Point(ship.x, ship.y), new pdg.Point(ship.destination.x, ship.destination.y), 'gray');
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
            this.port.drawText('Under Construction!', new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'yellow');
        } else {
            this.port.drawText(`${ship.type} Ship`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'cyan');
            this.port.drawText(`Tech Level: ${ship.techLevel.toFixed(1)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
            this.port.drawText(`Speed: ${ship.speed.toFixed(1)}`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'white');
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
            if (factory.isStar(game.selectedObject)) {
                this.drawStarDetails(game.selectedObject);
            } else if (factory.isShip(game.selectedObject)) {
                this.drawShipDetails(game.selectedObject);
            }
        }
        
        // Draw instructions
        this.drawInstructions();
    }
}

// Export the class
module.exports = Display;
