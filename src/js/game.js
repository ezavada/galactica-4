// Game class for Galactica-4
// Contains main game logic and state management

const Display = require('./display.js');

class Game {
    constructor(factory, rules) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        this.stars = [];
        this.allShips = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        this.factory = factory;
        this.rules = rules;
        this.initializeGame();
        console.log("Game constructor completed");
    }
    initializeGame() {
        // Create random stars
        const starCount = this.rules.getStarCount();
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * (this.gameWidth - 100) + 50;
            const y = Math.random() * (this.gameHeight - 100) + 50;
            const name = `Star ${i + 1}`;
            let star = this.factory.createStar(x, y, name);
            if (i === 0) {
                star.population = 1000000; // 1 billion initial population
                star.techLevel = 1;
            }
        }
        
        console.log(`Game initialized with ${this.stars.length} stars`);
    }
    
    entityAdded(entity) {
        if (this.factory.isStar(entity)) {
            this.stars.push(entity);
        } else if (this.factory.isShip(entity)) {
            this.allShips.push(entity);
        }
    }

    entityRemoved(entity) {
        if (this.selectedObject === entity) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        }
        if (this.factory.isStar(entity)) {
            this.stars.splice(this.stars.indexOf(entity), 1);
        } else if (this.factory.isShip(entity)) {
            this.allShips.splice(this.allShips.indexOf(entity), 1);
        }
    }

    setDisplay(display) {
        this.display = display;
    }
    setRules(rules) {
        this.rules = rules;
    }
    
    getFactory() {
        return this.factory;
    }
    getRules() {
        return this.rules;
    }


    draw() {
        if (this.display) {
            this.display.drawGame();
        }
    }
    
    handleMouseClick(x, y) {
        // Clear previous selection
        var clickedObject = null;
        
        // Check for ship clicks
        for (const ship of this.allShips) {
            const dx = x - ship.x;
            const dy = y - ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= Display.shipRadius) {
                clickedObject = ship;
                console.log(`Clicked on ship: ${ship.type}`);
             }
        }

         // Check for star clicks
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= Display.starRadius) {
                clickedObject = star;
                console.log(`Clicked on star: ${star.name}`);
            }
        }
        
        // if ship is selected and we click on an object, set the destination of the ship to the object
        if (clickedObject && this.factory.isShip(this.selectedObject)) {
            this.selectedObject.setDestination(clickedObject.x, clickedObject.y);
            console.log(`Set destination of ${this.selectedObject.type} to ${clickedObject.type}`);
            return;
        }
        
        // If clicking on empty space and have a ship selected, give it a destination
        if (this.selectedObject && this.factory.isShip(this.selectedObject)) {
            this.selectedObject.setDestination(x, y);
            return;
        }
        
        // If clicking on a star and have a ship selected, give it that destination
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= Display.starRadius && this.selectedObject && this.factory.isShip(this.selectedObject)) {
                this.selectedObject.setDestination(star.x, star.y);
                return;
            }
        }

        // set the selected object to the clicked object
        this.selectedObject = clickedObject;
        this.display.setSelectedObject(clickedObject);
    }
    
    handleKeyPress(key) {
        if (key === pdg.key_Tab) {
            this.endTurn();
        } else if (key === pdg.key_Escape) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        } else if (this.selectedObject && this.factory.isStar(this.selectedObject)) {
            // Handle ship building keys
            const star = this.selectedObject;
            switch (String.fromCharCode(key)) {
                case 's':
                    star.startBuildingShip('scout');
                    break;
                case 'd':
                    star.startBuildingShip('defense');
                    break;
                case 'b':
                    star.startBuildingShip('battleship');
                    break;
                case 'c':
                    star.startBuildingShip('colony');
                    break;
                default:
                    console.log(`Invalid key pressed: ${key}`);
                    break;
            }
        }
    }
    
    endTurn() {
        console.log(`=== End of Turn ${this.turn} ===`);
        
        // Update all ships
        for (const ship of this.allShips) {
            ship.move();
        }
        // Update all stars
        for (const star of this.stars) {
            star.update();
        }
        
        // resolve combat
        for (const ship of this.allShips) {
            ship.combat();
        }

        this.turn++;
        console.log(`=== Start of Turn ${this.turn} ===`);
    }
}

// Export the class
module.exports = Game;
