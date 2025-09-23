// Game class for Galactica-4
// Contains main game logic and state management

class Game {
    constructor(factory) {
        console.log("Game constructor starting...");
        this.stars = [];
        this.allShips = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        this.factory = factory;
        this.initializeGame();
        console.log("Game constructor completed");
    }
    
    initializeGame() {
        // Create random stars
        const starCount = 12;
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * (this.gameWidth - 100) + 50;
            const y = Math.random() * (this.gameHeight - 100) + 50;
            const name = `Star ${i + 1}`;
            this.stars.push(this.factory.createStar(x, y, name));
        }
        
        console.log(`Game initialized with ${this.stars.length} stars`);
    }
    
    setDisplay(display) {
        this.display = display;
    }
    
    draw() {
        if (this.display) {
            this.display.drawGame(this);
        }
    }
    
    handleMouseClick(x, y) {
        // Clear previous selection
        if (this.selectedObject) {
            this.selectedObject.selected = false;
        }
        this.selectedObject = null;
        
        // Check for star clicks
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= star.radius) {
                star.selected = true;
                this.selectedObject = star;
                console.log(`Selected star: ${star.name}`);
                return;
            }
        }
        
        // Check for ship clicks
        for (const ship of this.allShips) {
            const dx = x - ship.x;
            const dy = y - ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= ship.radius) {
                ship.selected = true;
                this.selectedObject = ship;
                console.log(`Selected ship: ${ship.type}`);
                return;
            }
        }
        
        // If clicking on empty space and have a ship selected, give it a destination
        if (this.selectedObject && this.factory.isShip(this.selectedObject)) {
            this.selectedObject.setDestination(x, y);
        }
        
        // If clicking on a star and have a ship selected, give it that destination
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= star.radius && this.selectedObject && this.factory.isShip(this.selectedObject)) {
                this.selectedObject.setDestination(star.x, star.y);
                return;
            }
        }
    }
    
    handleKeyPress(key) {
        if (key === pdg.key_Escape) {
            this.endTurn();
        } else if (this.selectedObject && this.factory.isStar(this.selectedObject)) {
            // Handle ship building keys
            const star = this.selectedObject;
            switch (String.fromCharCode(key)) {
                case '1':
                    star.startBuildingShip('scout');
                    break;
                case '2':
                    star.startBuildingShip('defense');
                    break;
                case '3':
                    star.startBuildingShip('battleship');
                    break;
                case '4':
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
        
        // Update all stars
        for (const star of this.stars) {
            star.update();
        }
        
        // Update all ships
        for (const ship of this.allShips) {
            ship.update();
        }
        
        this.turn++;
        console.log(`=== Start of Turn ${this.turn} ===`);
    }
}

// Export the class
module.exports = Game;
