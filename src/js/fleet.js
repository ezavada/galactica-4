// Fleet class for Galactica-4
// Contains fleet management and ship coordination logic
// Ported from original C++ CFleet class

const Common = require('./common.js');

class Fleet {
    constructor(x, y, game, owner) {
        this.id = Fleet.nextId++; // Unique ID for this fleet
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.game = game;
        
        // Fleet composition
        this.ships = [];
        
        // Fleet stats (calculated from ships)
        this.totalPower = 0;
        this.totalSpeed = 0;
        this.techLevel = 0;
        this.totalDamage = 0;
        
        // Fleet properties
        this.destination = null;
        this.progress = 0;
        
        // Fog of War properties
        this.scannerRange = 0;
        this.stealth = 1;
        this.apparentSize = 1000000; // 1 million meters (smaller than stars)
        this.visibilityTo = []; // Array indexed by player number
        this.lastSeen = []; // Array indexed by player number
        this.lastSeenBy = []; // Array indexed by player number
        this._spatialLocation = null; // Track current spatial location
        
        // Fleet movement
        this.moveDelta = { x: 0, y: 0 };
        this.remainingDistance = 0;
        
        // Calculate initial stats
        this.calculateFleetStats();
    }
    
    static nextId = 1;
    
    // Add a ship to this fleet
    addShip(ship) {
        if (!ship) return false;
        
        // Remove ship from its current location
        if (ship.star) {
            ship.star.removeShip(ship);
        }
        
        // Add to fleet
        this.ships.push(ship);
        ship.fleet = this;
        ship.star = null; // Ship is now in fleet, not at star
        
        // Recalculate fleet stats
        this.calculateFleetStats();
        
        return true;
    }
    
    // Remove a ship from this fleet
    removeShip(ship) {
        const index = this.ships.indexOf(ship);
        if (index === -1) return false;
        
        this.ships.splice(index, 1);
        ship.fleet = null;
        
        // Recalculate fleet stats
        this.calculateFleetStats();
        
        return true;
    }
    
    // Calculate fleet statistics from constituent ships
    calculateFleetStats() {
        this.totalPower = 0;
        this.totalSpeed = 0;
        this.totalDamage = 0;
        this.techLevel = 0;
        this.scannerRange = 0;
        
        if (this.ships.length === 0) {
            return;
        }
        
        let maxTechLevel = 0;
        let maxScannerRange = 0;
        
        for (const ship of this.ships) {
            this.totalPower += ship.power || 0;
            this.totalSpeed += ship.speed || 0;
            this.totalDamage += ship.damage || 0;
            
            if (ship.techLevel > maxTechLevel) {
                maxTechLevel = ship.techLevel;
            }
            
            if (ship.scannerRange > maxScannerRange) {
                maxScannerRange = ship.scannerRange;
            }
        }
        
        this.techLevel = maxTechLevel;
        this.scannerRange = maxScannerRange;
        
        // Fleet speed is the slowest ship's speed (fleet moves as fast as slowest ship)
        if (this.ships.length > 0) {
            this.totalSpeed = Math.min(...this.ships.map(ship => ship.speed || 0));
        }
    }
    
    // Get fleet attack strength (sum of ship attack strengths)
    getAttackStrength() {
        let totalAttack = 0;
        for (const ship of this.ships) {
            totalAttack += ship.getAttackStrength ? ship.getAttackStrength() : 0;
        }
        return totalAttack;
    }
    
    // Get fleet defense strength (sum of ship defense strengths)
    getDefenseStrength() {
        let totalDefense = 0;
        for (const ship of this.ships) {
            totalDefense += ship.getDefenseStrength ? ship.getDefenseStrength() : 0;
        }
        return totalDefense;
    }
    
    // Check if fleet is empty
    isEmpty() {
        return this.ships.length === 0;
    }
    
    // Check if fleet is dead (all ships destroyed)
    isDead() {
        return this.ships.length === 0;
    }
    
    // Get fleet size
    getSize() {
        return this.ships.length;
    }
    
    // Check if fleet contains a specific ship type
    hasShipType(shipType) {
        return this.ships.some(ship => ship.type === shipType);
    }
    
    // Get ships of a specific type
    getShipsOfType(shipType) {
        return this.ships.filter(ship => ship.type === shipType);
    }
    
    // Check if fleet is owned by a specific player
    isOwnedBy(playerId) {
        return this.owner === playerId;
    }
    
    // Check if fleet is allied with a specific player
    isAllyOf(playerId) {
        return this.game.players[this.owner] && 
               this.game.players[this.owner].isAllyOf(playerId);
    }
    
    // Move fleet to a destination
    setDestination(destination) {
        this.destination = destination;
        this.progress = 0;
        this.calculateMovement();
    }
    
    // Calculate movement delta for fleet
    calculateMovement() {
        if (!this.destination) {
            this.moveDelta = { x: 0, y: 0 };
            this.remainingDistance = 0;
            return;
        }
        
        const dx = this.destination.x - this.x;
        const dy = this.destination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            this.moveDelta = { x: 0, y: 0 };
            this.remainingDistance = 0;
            return;
        }
        
        // Fleet moves at the speed of its slowest ship
        const speed = this.totalSpeed;
        const moveRatio = speed / distance;
        
        this.moveDelta = {
            x: dx * moveRatio,
            y: dy * moveRatio
        };
        
        this.remainingDistance = distance;
    }
    
    // Move the fleet one turn
    move() {
        if (!this.destination || this.remainingDistance <= 0) {
            return false;
        }
        
        const moveDistance = this.totalSpeed;
        
        if (this.remainingDistance <= moveDistance) {
            // Arrive at destination
            this.x = this.destination.x;
            this.y = this.destination.y;
            this.remainingDistance = 0;
            this.arriveAtDestination();
            return true;
        } else {
            // Continue moving
            this.x += this.moveDelta.x;
            this.y += this.moveDelta.y;
            this.remainingDistance -= moveDistance;
            return false;
        }
    }
    
    // Handle fleet arrival at destination
    arriveAtDestination() {
        if (!this.destination) return;
        
        const arrivingObjectType = this.game.getObjectType(this.destination);
        const arrivingDestination = this.destination;
        
        if (arrivingObjectType === Common.ObjectType.SHIP) {
            // Fleet arrived at a ship - check if they can form a fleet
            if (this.owner === arrivingDestination.owner && arrivingDestination.canFormFleet()) {
                this.game.handleFleetFormation(this, arrivingDestination);
            }
        } else if (arrivingObjectType === Common.ObjectType.FLEET) {
            // Fleet arrived at another fleet - merge them if same owner
            if (this.owner === arrivingDestination.owner) {
                this.game.mergeFleets(this, arrivingDestination);
            } else {
                console.log(`Fleet ${this.id} arrived at enemy fleet`);
            }
        } else if (arrivingObjectType === Common.ObjectType.STAR) {
            console.log(`Fleet ${this.id} arrived at star ${arrivingDestination.name}`);
        } else {
            console.log(`Fleet ${this.id} arrived at destination`);
        }
        
        this.destination = null;
        this.progress = 0;
    }
    
    // Remove dead ships from fleet
    removeDeadShips() {
        const aliveShips = this.ships.filter(ship => !ship.isDead || !ship.isDead());
        const removedCount = this.ships.length - aliveShips.length;
        
        if (removedCount > 0) {
            this.ships = aliveShips;
            this.calculateFleetStats();
            console.log(`Removed ${removedCount} dead ships from fleet ${this.id}`);
        }
        
        return removedCount;
    }
    
    // Get fleet information for display
    getInfo() {
        return {
            id: this.id,
            owner: this.owner,
            shipCount: this.ships.length,
            totalPower: this.totalPower,
            totalSpeed: this.totalSpeed,
            techLevel: this.techLevel,
            scannerRange: this.scannerRange,
            position: { x: this.x, y: this.y },
            destination: this.destination,
            remainingDistance: this.remainingDistance
        };
    }
    
    // Display and interaction methods
    getSize() {
        return this.ships.length;
    }
    
    isEmpty() {
        return this.ships.length === 0;
    }
    
    isDead() {
        return this.isEmpty();
    }
    
    isVisibleTo(playerId) {
        // For now, fleets are always visible to their owner
        // TODO: Implement proper fog of war for fleets
        return this.owner === playerId;
    }
    
    isFleet() {
        return true;
    }
    
    isStar() {
        return false;
    }
    
    isShip() {
        return false;
    }
    
    // Fleet movement methods
    setDestination(destination) {
        this.destination = destination;
        if (destination) {
            const dx = destination.x - this.x;
            const dy = destination.y - this.y;
            this.remainingDistance = Math.sqrt(dx * dx + dy * dy);
        } else {
            this.remainingDistance = 0;
        }
    }
    
    move() {
        if (!this.destination || this.totalSpeed <= 0) {
            return true; // Arrived or can't move
        }
        
        const dx = this.destination.x - this.x;
        const dy = this.destination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.totalSpeed) {
            // Arrived at destination
            this.x = this.destination.x;
            this.y = this.destination.y;
            this.destination = null;
            this.remainingDistance = 0;
            return true;
        } else {
            // Move towards destination
            const moveDistance = this.totalSpeed;
            const moveX = (dx / distance) * moveDistance;
            const moveY = (dy / distance) * moveDistance;
            
            this.x += moveX;
            this.y += moveY;
            this.remainingDistance = distance - moveDistance;
            return false;
        }
    }
}

module.exports = Fleet;
