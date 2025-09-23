// Ship class definition for Galactica-4
// Contains all ship-related data and logic

class Ship {
    constructor(x, y, type, star,game) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.star = star;
        this.destination = null;
        this.progress = 0;
        this.game = game;
        // Ship stats
        this.stats = this.getShipStats();
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
    
    move() {
        if (this.destination && this.type !== 'defense') {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
                // Arrived at destination
                this.arriveAtDestination();
            } else {
                if (this.star) {
                    this.star.shipDeparted(this);
                    this.star = null;
                }
                // Move towards destination
                const moveDistance = this.stats.speed * 2; // pixels per turn
                const moveX = (dx / distance) * moveDistance;
                const moveY = (dy / distance) * moveDistance;
                
                this.x += moveX;
                this.y += moveY;
            }
        }
    }


    combat() {
        // TODO: implement combat
    }
    
    arriveAtDestination() {
        if (this.destination) {
            // handle arriving at star
            if (this.type === 'colony') {
                // find the star at the destination
                const dstStar = this.game.stars.find(star => star.x === this.destination.x && star.y === this.destination.y);
                if (newStar) {
                    dstStar.population = 1;
                    dstStar.techLevel = this.techLevel;
                    console.log(`Colony established at ${dstStar.name}`);
                    this.game.allShips.remove(this);
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
