// Star class definition for Galactica-4
// Contains all star-related data and logic

class Star {
    constructor(x, y, name, factory) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.population = Math.floor(Math.random() * 1000) + 100;
        this.techLevel = Math.floor(Math.random() * 5) + 1;
        this.factory = factory;

        // Resource allocation (0.0 to 1.0 for each)
        this.shipbuilding = 0.3;
        this.growth = 0.4;
        this.research = 0.3;
        
        // Current production
        this.currentShip = null; // null, 'scout', 'defense', 'battleship', 'colony'
        this.shipProgress = 0;
        
        // Ships at this star
        this.ships = [];
        
        this.radius = 8;
        this.color = 'yellow';
        this.selected = false;
    }
    
    getEffectiveStats() {
        return {
            shipbuilding: this.shipbuilding * this.population,
            growth: this.growth * this.population,
            research: this.research * this.population
        };
    }
    
    update() {
        // Process shipbuilding
        if (this.currentShip) {
            const stats = this.getEffectiveStats();
            const buildCost = this.getShipBuildCost(this.currentShip);
            this.shipProgress += stats.shipbuilding / buildCost;
            
            if (this.shipProgress >= 1.0) {
                this.completeShip();
                this.shipProgress = 0;
                this.currentShip = null;
            }
        }
        
        // Process growth
        const stats = this.getEffectiveStats();
        this.population += stats.growth * 0.01;
        
        // Process research
        this.techLevel += stats.research * 0.001;
    }
    
    getShipBuildCost(shipType) {
        const baseCosts = {
            scout: 100,
            defense: 200,
            battleship: 400,
            colony: 1000
        };
        return baseCosts[shipType] || 100;
    }
    
    completeShip() {
        // Note: This will need to be set up properly when called
        // The game instance needs to be accessible
        if (typeof game !== 'undefined' && game.allShips) {
            const ship = new this.factory.createShip(this.x, this.y, this.currentShip, this);
            this.ships.push(ship);
            game.allShips.push(ship);
            console.log(`Built ${this.currentShip} at ${this.name}`);
        }
    }
    
    startBuildingShip(shipType) {
        if (!this.currentShip) {
            this.currentShip = shipType;
            this.shipProgress = 0;
            console.log(`Started building ${shipType} at ${this.name}`);
        }
    }
}

// Export the class
module.exports = Star;
