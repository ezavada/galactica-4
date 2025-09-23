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
        this.techLevel = star.techLevel;
        this.speed = this.game.rules.getShipInitialSpeed(this);
    }

    complete() {
        this.progress = 100;
    }

    underConstruction() {
        return this.progress < 100;
    }

    move() {
        if (this.underConstruction()) {
            return; // still under construction
        }
        if (this.destination && this.type !== 'defense') {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5 || distance < (this.speed + 5)) {
                // Arrived at destination
                this.arriveAtDestination();
            } else {
                if (this.star) {
                    this.star.shipDeparted(this);
                    this.star = null;
                }
                // Move towards destination
                const moveDistance = this.speed; // pixels per turn
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
            const arrivingDestination = this.destination;
            this.destination = null;
            // handle arriving at star
            if (this.type === 'colony') {
                // find the star at the destination
                const destinationStar = this.game.stars.find(star => star.x === arrivingDestination.x && star.y === arrivingDestination.y);
                if (destinationStar) {
                    destinationStar.population = 1;
                    destinationStar.techLevel = this.techLevel;
                    console.log(`Colony established at ${destinationStar.name}`);
                    this.game.entityRemoved(this);
                }
            }            
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
