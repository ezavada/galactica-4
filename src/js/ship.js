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
        this.power = this.calculatePower();
        this.damage = 0;
        this.fleet = null; // Reference to fleet if ship is in one
        
        // Fog of War properties
        this.scannerRange = 0;
        this.stealth = 1;
        this.apparentSize = this.calculateApparentSize(); // Based on ship type
        this.visibilityTo = []; // Array indexed by player number
        this.lastSeen = []; // Array indexed by player number
        this.lastSeenBy = []; // Array indexed by player number
        this._spatialLocation = null; // Track current spatial location
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
        
        const oldX = this.x;
        const oldY = this.y;
        
        if (this.destination && this.type !== 'defense') {
            if (this.star) {
                this.star.shipDeparted(this);
                this.star = null;
            }
            
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
                
                // Update spatial location after movement
                this.updateSpatialLocation();
            }
        }
    }


    combat() {
        // TODO: implement combat
    }
    
    calculatePower() {
        // Calculate ship power based on type and tech level
        let basePower = 1;
        switch (this.type) {
            case 'scout':
                basePower = 1;
                break;
            case 'colony':
                basePower = 2;
                break;
            case 'battleship':
                basePower = 5;
                break;
            case 'defense':
                basePower = 3;
                break;
            default:
                basePower = 1;
        }
        return basePower + Math.floor(this.techLevel / 2);
    }
    
    // Combat methods - ported from CShip.cpp
    getAttackStrength() {
        return (this.power * 50) - Math.floor(this.damage / 8);
    }
    
    getDefenseStrength() {
        let power = this.power;
        if (power < 1) {
            power = 1;
        }
        return (power * 100) - this.damage;
    }
    
    getOneAttackAgainst(defender) {
        // Use PDG random function for damage variance
        const attackDamage = Math.floor((this.getAttackStrength() * (pdg.rand() + pdg.rand() + pdg.rand() + 3)) / 300);
        
        // Apply patrol bonus if docked and on patrol
        if (this.isDocked() && this.isOnPatrol()) {
            return Math.floor((attackDamage * 125) / 100); // 25% bonus for patrolling ships
        }
        
        return Math.max(0, attackDamage);
    }
    
    takeDamage(amount) {
        // Apply patrol bonus to damage reduction if docked and on patrol
        if (this.isDocked() && this.isOnPatrol()) {
            amount = Math.floor((amount * 75) / 100); // 25% damage reduction for patrolling ships
        }
        
        this.damage += amount;
        
        // Return excess damage if ship is destroyed
        const defenseStrength = this.getDefenseStrength();
        if (defenseStrength < 0) {
            return Math.abs(defenseStrength);
        }
        
        return 0;
    }
    
    repairDamage(amount) {
        if (amount < 0) {
            console.log(`Negative damage (${amount}) being repaired for ship ${this.id}`);
            amount = 0;
        }
        
        if (this.damage > 0) {
            console.log(`Repairing ship ${this.id}, which has ${this.damage} damage`);
            if (amount < this.damage) {
                this.damage -= amount;
            } else {
                amount = this.damage;
                this.damage = 0;
            }
            console.log(`Repaired ${amount} damage to ship ${this.id}; now has ${this.damage} damage`);
        } else {
            amount = 0; // No damage repaired
        }
        
        return amount; // Return amount repaired
    }
    
    isDead() {
        return this.getDefenseStrength() < 0;
    }
    
    isDocked() {
        return this.star !== null;
    }
    
    isOnPatrol() {
        // TODO: Implement patrol logic
        return false;
    }
    
    destroyedInCombat(attackerOwner) {
        console.log(`Ship ${this.id} destroyed in combat by player ${attackerOwner}`);
        // TODO: Handle ship destruction
    }
    
    // Fleet formation methods
    canFormFleet() {
        return this.type !== 'defense' && !this.underConstruction();
    }
    
    isInFleet() {
        return this.fleet !== null;
    }
    
    joinFleet(fleet) {
        if (this.canFormFleet() && fleet) {
            return fleet.addShip(this);
        }
        return false;
    }
    
    leaveFleet() {
        if (this.fleet) {
            this.fleet.removeShip(this);
            return true;
        }
        return false;
    }
    
    arriveAtDestination() {
        if (this.destination) {
            const arrivingObjectType = this.game.getObjectType(this.destination);
            const arrivingDestination = this.destination;
            this.destination = null;
            this.x = arrivingDestination.x;
            this.y = arrivingDestination.y;
            
            // Update spatial location
            this.updateSpatialLocation();
            
            // handle arriving at star
            if (arrivingObjectType === Common.ObjectType.STAR) {
                let destinationStar = arrivingDestination;
                this.star = destinationStar;
                destinationStar.shipArrived(this);
                
                // If this is a defense satellite, add it to the star's defense
                if (this.type === 'defense') {
                    destinationStar.addDefenseSatellite(this);
                    // Remove from spatial partition as it's now part of star system
                    this.game.spatialPartition.removeEntity(this, Common.SpatialConstants.ENTITY_TYPE_SHIP);
                }
                
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
                this.game.noteworthyEvent(this, Common.EventType.SHIP_INTERCEPT, arrivingDestination);
            } else if (arrivingObjectType === Common.ObjectType.FLEET) {
                // Ship arrived at a fleet - check if they can form a fleet
                if (this.owner === arrivingDestination.owner && this.canFormFleet()) {
                    this.game.handleFleetFormation(this, arrivingDestination);
                } else {
                    this.game.noteworthyEvent(this, Common.EventType.SHIP_STOPPED, arrivingDestination);
                }
            } else {
                this.game.noteworthyEvent(this, Common.EventType.SHIP_STOPPED, arrivingDestination);
            }
        }
    }
    
    setDestination(obj) {
        if (this.type !== 'defense') {
            this.destination = obj;
            this.game.noteworthyEvent(this, Common.EventType.SHIP_TASKED, obj, null, Common.EventWhy.NEW_DESTINATION);
        }
    }
    
    // Fog of War Methods
    
    /**
     * Calculate apparent size based on ship type and tech level
     */
    calculateApparentSize() {
        const baseSizes = {
            scout: 50,
            defense: 200,
            battleship: 100,
            colony: 2000
        };
        const baseSize = baseSizes[this.type] || 100;
        return baseSize + (this.techLevel * this.getSizeMultiplier());
    }
    
    /**
     * Get size multiplier based on ship type
     */
    getSizeMultiplier() {
        const multipliers = {
            scout: -0.25,      // Scouts get smaller with tech
            defense: 5,        // Defense satellites grow with tech
            battleship: 100,   // Battleships grow significantly with tech
            colony: 20         // Colony ships grow moderately with tech
        };
        return multipliers[this.type] || 0;
    }
    
    /**
     * Get scanner range
     */
    getScannerRange() { 
        return this.scannerRange; 
    }
    
    /**
     * Set scanner range
     */
    setScannerRange(range) { 
        this.scannerRange = range; 
    }
    
    /**
     * Get stealth value
     */
    getStealth() { 
        return this.stealth; 
    }
    
    /**
     * Set stealth value
     */
    setStealth(stealth) { 
        this.stealth = stealth; 
    }
    
    /**
     * Get apparent size
     */
    getApparentSize() { 
        return this.apparentSize; 
    }
    
    /**
     * Set apparent size
     */
    setApparentSize(size) { 
        this.apparentSize = size; 
    }
    
    /**
     * Get visibility level to a specific player
     */
    getVisibilityTo(playerNum) { 
        return this.visibilityTo[playerNum] || Common.VisibilityLevel.NONE; 
    }
    
    /**
     * Set visibility level to a specific player
     */
    setVisibilityTo(playerNum, visibility) { 
        this.visibilityTo[playerNum] = visibility; 
    }
    
    /**
     * Get last turn this ship was seen by a player
     */
    getLastSeen(playerNum) { 
        return this.lastSeen[playerNum] || 0; 
    }
    
    /**
     * Set last turn this ship was seen by a player
     */
    setLastSeen(playerNum, turn) { 
        this.lastSeen[playerNum] = turn; 
    }
    
    /**
     * Check if this ship is visible to a player
     */
    isVisibleTo(playerNum) { 
        return this.getVisibilityTo(playerNum) > Common.VisibilityLevel.NONE; 
    }
    
    /**
     * Update spatial location in partition
     */
    updateSpatialLocation() {
        if (this.game && this.game.spatialPartition) {
            const entityType = (this.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
                
            this.game.spatialPartition.updateEntityPosition(
                this, 
                entityType, 
                this.x, 
                this.y
            );
        }
    }
}

// Static counter for generating unique IDs
Ship.nextId = 1;

// Export the class
module.exports = Ship;
