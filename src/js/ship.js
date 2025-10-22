// Ship class definition for Galactica-4
// Contains all ship-related data and logic

const Common = require('./common.js');

class Ship {
    constructor(x, y, type, star, game, owner) {
        this.id = Ship.nextId++; // Unique ID for this ship
        this.x = x;
        this.y = y;
        this.type = type;
        this.star = star;
        this.destination = null;
        this.progress = 0;
        this.owner = owner;
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
            if (this.star) {
                this.star.shipDeparted(this);
                this.star = null;
            }
            //const objectType = this.game.getObjectType(this.destination);
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5 || distance < (this.speed + 5)) {
                // Arrived at destination
                this.arriveAtDestination();
            } else {
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
            const arrivingObjectType = this.game.getObjectType(this.destination);
            const arrivingDestination = this.destination;
            this.destination = null;
            this.x = arrivingDestination.x;
            this.y = arrivingDestination.y;
            // handle arriving at star
            if (arrivingObjectType === Common.ObjectType.STAR) {
                let destinationStar = arrivingDestination;
                this.star = destinationStar;
                destinationStar.shipArrived(this);
                this.game.noteworthyEvent(this, Common.EventType.SHIP_ARRIVED, destinationStar);
                if (this.type === 'colony' && destinationStar.owner === 0) {
                    destinationStar.population = 1;
                    destinationStar.techLevel = this.techLevel;
                    destinationStar.owner = this.owner;
                    this.game.noteworthyEvent(this, Common.EventType.SHIP_ARRIVED, destinationStar);
                    this.game.entityRemoved(this);
                    destinationStar.game.entityRemoved(this); // it's been converted to a colony
                }
            } else if (arrivingObjectType === Common.ObjectType.SHIP) {
                this.game.noteworthyEvent(this, Common.EventType.SHIP_INTERCEPT, this.destination);
            } else {
                this.game.noteworthyEvent(this, Common.EventType.SHIP_STOPPED, this.destination);
            }
        }
    }
    
    setDestination(obj) {
        if (this.type !== 'defense') {
            this.destination = obj;
            this.game.noteworthyEvent(this, Common.EventType.SHIP_TASKED, obj, null, Common.EventWhy.NEW_DESTINATION);
        }
    }
}

// Static counter for generating unique IDs
Ship.nextId = 1;

// Export the class
module.exports = Ship;
