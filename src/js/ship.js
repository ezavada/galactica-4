// Ship class definition for Galactica-4
// Contains all ship-related data and logic

class Ship {
    constructor(x, y, type, factory) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.star = star;
        this.destination = null;
        this.progress = 0;
        this.selected = false;
        this.factory = factory;
        // Ship stats
        this.stats = this.getShipStats();
        this.radius = 5;
        this.color = this.getShipColor();
    }
    
    getShipStats() {
        const baseStats = {
            scout: { speed: 3.0, attack: 0.0, defense: 0.25, buildTime: 0.5 },
            defense: { speed: 0.0, attack: 1.0, defense: 1.0, buildTime: 1.0 },
            battleship: { speed: 1.0, attack: 1.0, defense: 1.0, buildTime: 2.0 },
            colony: { speed: 1.0, attack: 1.0, defense: 2.0, buildTime: 5.0 }
        };
        
        const base = baseStats[this.type];
        const techMultiplier = this.star ? this.star.techLevel : 1;
        
        return {
            speed: base.speed * techMultiplier,
            attack: base.attack * techMultiplier,
            defense: base.defense * techMultiplier,
            buildTime: base.buildTime
        };
    }
    
    getShipColor() {
        const colors = {
            scout: 'cyan',
            defense: 'green',
            battleship: 'red',
            colony: 'purple'
        };
        return colors[this.type] || 'white';
    }
    
    update() {
        if (this.destination && this.type !== 'defense') {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
                // Arrived at destination
                this.arriveAtDestination();
            } else {
                // Move towards destination
                const moveDistance = this.stats.speed * 2; // pixels per turn
                const moveX = (dx / distance) * moveDistance;
                const moveY = (dy / distance) * moveDistance;
                
                this.x += moveX;
                this.y += moveY;
            }
        }
    }
    
    arriveAtDestination() {
        if (this.destination) {
            if (this.type === 'colony') {
                // Create new colony
                // Note: This will need to be set up properly when called
                if (typeof game !== 'undefined' && game.stars) {
                    const newStar = new this.factory.createStar(this.destination.x, this.destination.y, `Colony ${Date.now()}`);
                    newStar.population = Math.floor(this.star.population * 0.1);
                    newStar.techLevel = Math.floor(this.star.techLevel * 0.8);
                    game.stars.push(newStar);
                    console.log(`Colony established at ${newStar.name}`);
                }
            }
            
            this.destination = null;
        }
    }
    
    setDestination(x, y) {
        if (this.type !== 'defense') {
            this.destination = { x, y };
            console.log(`${this.type} ship moving to (${x}, ${y})`);
        }
    }
}

// Export the class
module.exports = Ship;
