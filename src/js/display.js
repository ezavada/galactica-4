// Display functions for Galactica-4
// Contains all rendering and UI display logic

class Display {
    constructor(port, gameWidth, gameHeight, factory) {
        this.port = port;
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.factory = factory;
    }
    
    // Clear the screen
    clear() {
        this.port.fillRect(new pdg.Rect(0, 0, this.gameWidth, this.gameHeight), 'black');
    }
    
    // Draw a single star
    drawStar(star) {
        this.port.fillCircle(new pdg.Point(star.x, star.y), star.radius, star.color);
        
        // Draw selection indicator
        if (star.selected) {
            this.port.fillCircle(new pdg.Point(star.x, star.y), star.radius + 3, 'white');
            this.port.fillCircle(new pdg.Point(star.x, star.y), star.radius, star.color);
        }
        
        // Draw shipbuilding progress
        if (star.currentShip) {
            const progress = Math.floor(star.shipProgress * 10);
            this.port.drawText(`${progress}/10`, new pdg.Point(star.x - 10, star.y - 20), 10, pdg.textStyle_Plain, 'yellow');
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
        this.port.fillCircle(new pdg.Point(ship.x, ship.y), ship.radius, ship.color);
        
        // Draw selection indicator
        if (ship.selected) {
            this.port.fillCircle(new pdg.Point(ship.x, ship.y), ship.radius + 2, 'white');
            this.port.fillCircle(new pdg.Point(ship.x, ship.y), ship.radius, ship.color);
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
        this.port.drawText(`Turn ${turn}`, new pdg.Point(10, 10), 16, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Stars: ${starCount}`, new pdg.Point(10, 30), 14, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Ships: ${shipCount}`, new pdg.Point(10, 50), 14, pdg.textStyle_Plain, 'white');
    }
    
    // Draw star details UI
    drawStarDetails(star) {
        this.port.drawText(`${star.name}`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'yellow');
        this.port.drawText(`Pop: ${Math.floor(star.population)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Tech: ${star.techLevel.toFixed(1)}`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Building: ${star.currentShip || 'None'}`, new pdg.Point(10, 140), 12, pdg.textStyle_Plain, 'white');
        
        // Draw ship building buttons
        const shipTypes = ['scout', 'defense', 'battleship', 'colony'];
        for (let i = 0; i < shipTypes.length; i++) {
            const shipType = shipTypes[i];
            const y = 160 + i * 20;
            this.port.drawText(`${shipType}`, new pdg.Point(10, y), 10, pdg.textStyle_Plain, 'cyan');
        }
    }
    
    // Draw ship details UI
    drawShipDetails(ship) {
        this.port.drawText(`${ship.type} Ship`, new pdg.Point(10, 80), 14, pdg.textStyle_Plain, 'cyan');
        this.port.drawText(`Speed: ${ship.stats.speed.toFixed(1)}`, new pdg.Point(10, 100), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Attack: ${ship.stats.attack.toFixed(1)}`, new pdg.Point(10, 120), 12, pdg.textStyle_Plain, 'white');
        this.port.drawText(`Defense: ${ship.stats.defense.toFixed(1)}`, new pdg.Point(10, 140), 12, pdg.textStyle_Plain, 'white');
    }
    
    // Draw instructions
    drawInstructions() {
        this.port.drawText(`Click stars to manage them`, new pdg.Point(10, this.gameHeight - 60), 12, pdg.textStyle_Plain, 'gray');
        this.port.drawText(`Press ESC to end turn`, new pdg.Point(10, this.gameHeight - 40), 12, pdg.textStyle_Plain, 'gray');
        this.port.drawText(`Click ships to give orders`, new pdg.Point(10, this.gameHeight - 20), 12, pdg.textStyle_Plain, 'gray');
    }
    
    // Main draw function that orchestrates all drawing
    drawGame(game) {
        this.clear();
        
        // Draw game objects
        this.drawStars(game.stars);
        this.drawShips(game.allShips);
        
        // Draw UI
        this.drawMainUI(game.turn, game.stars.length, game.allShips.length);
        
        // Draw selected object details
        if (game.selectedObject) {
            if (this.factory.isStar(game.selectedObject)) {
                this.drawStarDetails(game.selectedObject);
            } else if (this.factory.isShip(game.selectedObject)) {
                this.drawShipDetails(game.selectedObject);
            }
        }
        
        // Draw instructions
        this.drawInstructions();
    }
}

// Export the class
module.exports = Display;
