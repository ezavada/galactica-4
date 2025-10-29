// Star class definition for Galactica-4
// Contains all star-related data and logic

const Common = require('./common.js');

// how much of the star's resources are allocated to a particular effort
class Allocation {
    constructor(value, rate, benefit, locked) {
        this.value = value;   // current effective value
        this.desired = value; // desired effective value
        this.rate = rate;    // rate of change of towards desired value per turn
        this.benefit = benefit; // benefit derived from on unit of value
        this.locked = locked; // if true, the allocation is locked and cannot be changed
    }
    setDesired(desired) {
        this.desired = desired;
    }
    setRate(rate) {
        this.rate = rate;
    }
    setPerUnitBenefit(benefit) {
        this.benefit = benefit;
    }
    getPerUnitBenefit() {
        return this.benefit;
    }
    setLocked(locked) {
        this.locked = locked;
    }
    getBenefits() {
        return this.value * this.benefit;
    }
    getProjectedBenefit() {
        return this.desired * this.benefit;
    }
    adjustValue() {
        let changed = false;
        if (this.value < this.desired) {
            this.value += this.rate;
            changed = true;
            if (this.value > this.desired) {
                this.value = this.desired;
            }
        } else if (this.value > this.desired) {
            this.value -= (this.rate * 4.0); // rate of decrease is 4x the rate of increase
            changed = true;
            if (this.value < this.desired) {
                this.value = this.desired;
            }
        }
        return changed;
    }
}

class Star {
    constructor(x, y, name, game) {
        this.id = Star.nextId++; // Unique ID for this star
        this.x = x;
        this.y = y;
        this.owner = 0;
        this.name = name;
        this.population = 0;
        this.techLevel = 0;
        this.game = game;

        // Resource allocation (0.0 to 100.0 for each)
        this.growth = new Allocation(34.0, 60.0, 6.0, false);
        this.shipBuilding = new Allocation(33.0, 60.0, 6.0, false);
        this.research = new Allocation(33.0, 60.0, 6.0, false);
        
        // Current production
        this.currentShip = null; // Ship currently being built
        this.paidTowardShipBuilding = 0;
        this.paidTowardResearch = 0;
        
        // Ships at this star
        this.ships = [];
        
        // Fog of War properties
        this.scannerRange = 0;
        this.stealth = 1;
        this.apparentSize = 5000000; // 5 million meters (matches C++)
        this.visibilityTo = []; // Array indexed by player number
        this.lastSeen = []; // Array indexed by player number
        this.lastSeenBy = []; // Array indexed by player number
        this._spatialLocation = null; // Track current spatial location
        
        // Defense satellites at this star (part of star system)
        this.defenseSatellites = [];
        
        // Combat properties
        this.damage = 0; // Population damage from combat
        
        // Default destination for ships built at this star
        this.defaultDestination = null;
    }

    update() {
        if (this.population <= 0) {
            return; // do nothing with unpopulated stars
        }

        // Adjust all the allocations
        this.shipBuilding.adjustValue();
        this.growth.adjustValue();
        this.research.adjustValue();

        // Adjust shipbuilding and research benefits based on the benefit of growth
        const benefitAdjustment = this.growth.getBenefits() / 166.5;
        if (benefitAdjustment > 0) {
            this.shipBuilding.setPerUnitBenefit(this.shipBuilding.getPerUnitBenefit() + benefitAdjustment);
            this.research.setPerUnitBenefit(this.research.getPerUnitBenefit() + benefitAdjustment);
        }

        // apply research
        let amount = this.game.rules.getStarResearchAmount(this);
        //console.log(`Paid ${amount} toward research at ${this.name}`);
        this.paidTowardResearch += amount;
            if (this.paidTowardResearch >= 1000) {
            this.paidTowardResearch -= 1000;
            const oldTechLevel = this.techLevel;
            this.techLevel++;
            
            // Update player's highest tech level
            const playerInfo = this.game.players ? this.game.players[this.owner] : null;
            if (playerInfo && playerInfo.updateHighestStarTech(this.techLevel)) {
                // This is a new tech milestone for this player
                console.log(`${playerInfo.name} reached star tech level ${this.techLevel}!`);
            }
            
                this.game.noteworthyEvent(this, Common.EventType.TECH_LEVEL_UP); // who = Star. new tech level taken from star
                // Lab event for new drive class (every 5 levels like original)
                const driveClassIndex = Math.floor(this.techLevel / 5);
                if (driveClassIndex !== Math.floor(oldTechLevel / 5)) {
                    this.game.noteworthyEvent(this, Common.EventType.NEW_TECH_DISCOVERY, driveClassIndex);
                }
        }

        // apply shipbuilding effort
        if (this.currentShip) {
            amount = this.game.rules.getStarShipBuildingAmount(this);
            //console.log(`Paid ${amount} toward shipbuilding at ${this.name}`);
            this.paidTowardShipBuilding += amount;
            const cost = this.game.rules.getShipBuildCost(this.currentShip, this);
            
            // Update ship construction progress
            const oldProgress = this.currentShip.progress;
            this.currentShip.progress = Math.min(100, (this.paidTowardShipBuilding / cost) * 100);
            
            console.log(`🔨 SHIP CONSTRUCTION UPDATE: ${this.currentShip.type} at ${this.name} - Progress: ${oldProgress.toFixed(1)}% → ${this.currentShip.progress.toFixed(1)}% (Paid: ${this.paidTowardShipBuilding.toFixed(0)}/${cost.toFixed(0)})`);
            
            if (this.paidTowardShipBuilding >= cost) {
                console.log(`✅ SHIP CONSTRUCTION COMPLETED: ${this.currentShip.type} at ${this.name} - Ship ID: ${this.currentShip.id}`);
                const newShip = this.completeShip(); // unlike Galactica-3, we only allow one ship per start built each turn
                this.paidTowardShipBuilding -= cost;
                this.game.noteworthyEvent(newShip, Common.EventType.SHIP_BUILT, this);
            }
        }
        
        // apply growth
        this.population += this.game.rules.getStarPopulationGrowth(this);
        if (this.population > 99900) {
            this.population = 99900;
        }
    }
    
    completeShip() {
        const ship = this.currentShip;
        this.currentShip.complete();
        this.currentShip = null;
        
        // Update player info for new ship type and tech level
        const playerInfo = this.game.players ? this.game.players[this.owner] : null;
        if (playerInfo) {
            // Track if this is a new ship type for this player
            if (playerInfo.markShipTypeBuilt(ship.type)) {
                console.log(`${playerInfo.name} built their first ${ship.type} ship!`);
            }
            
            // Track ship tech level milestone
            if (playerInfo.updateHighestShipTech(ship.techLevel)) {
                console.log(`${playerInfo.name} built a ship with tech level ${ship.techLevel}!`);
            }
        }

        // Assign ship name and battleship class index based on tech
        try {
            const shipNamesStr = pdg.res.getString(800) || '';
            const classNames = shipNamesStr ? shipNamesStr.split('|') : [];
            if (ship.type === 'battleship') {
                const classIndex = Math.max(1, Math.min(classNames.length || 1, Math.floor(ship.techLevel / 5) + 1));
                ship.classIndex = classIndex;
                const className = classNames[(classIndex - 1)] || 'Traveler';
                const serial = `S${this.id}T${this.game.turn}-${ship.id}`;
                ship.name = `${className}\t${serial}`;
                if (playerInfo && playerInfo.markFighterClassBuilt(classIndex)) {
                    // First-of-class stardock event
                    this.game.noteworthyEvent(ship, Common.EventType.NEW_SHIP_CLASS, classIndex);
                }
            } else {
                ship.name = `${ship.type} S${this.id}T${this.game.turn}-${ship.id}`;
            }
        } catch (err) {
            ship.name = `${ship.type} S${this.id}T${this.game.turn}-${ship.id}`;
        }
        
        // Set default destination if the star has one and ship doesn't already have a destination
        if (!ship.destination && this.getDefaultDestination() && ship.type !== 'defense') {
            ship.destination = this.getDefaultDestination();
        }
        
        // If ship has a destination, move it immediately
        if (ship.destination && ship.type !== 'defense') {
            ship.move();
        }
        
        return ship;
    }
    
    startBuildingShip(shipType) {
        if (!this.currentShip) {
            this.currentShip = this.game.factory.createShip(this.x, this.y, shipType, this);
            this.ships.push(this.currentShip);
            console.log(`🚀 SHIP CONSTRUCTION STARTED: ${shipType} at ${this.name} (owner: ${this.owner}) - Ship ID: ${this.currentShip.id}, Progress: ${this.currentShip.progress}%`);
        } else {
            console.log(`⚠️  SHIP CONSTRUCTION ALREADY IN PROGRESS: ${this.currentShip.type} at ${this.name} - Progress: ${this.currentShip.progress}%`);
        }
    }

    shipDeparted(ship) {
        this.ships.splice(this.ships.indexOf(ship), 1);
    }

    removeShip(ship) {
        this.shipDeparted(ship);
    }

    shipArrived(ship) {
        this.ships.push(ship);
    }
    
    // Fog of War Methods
    
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
     * Get last turn this star was seen by a player
     */
    getLastSeen(playerNum) { 
        return this.lastSeen[playerNum] || 0; 
    }
    
    /**
     * Set last turn this star was seen by a player
     */
    setLastSeen(playerNum, turn) { 
        this.lastSeen[playerNum] = turn; 
    }
    
    /**
     * Check if this star is visible to a player
     */
    isVisibleTo(playerNum) { 
        return this.getVisibilityTo(playerNum) > Common.VisibilityLevel.NONE; 
    }
    
    /**
     * Update spatial location when star moves (rare, but possible)
     */
    updateSpatialLocation(game) {
        if (game && game.spatialPartition) {
            game.spatialPartition.updateEntityPosition(
                this, 
                Common.SpatialConstants.ENTITY_TYPE_STAR, 
                this.x, 
                this.y
            );
        }
    }
    
    /**
     * Add defense satellite to this star system
     */
    addDefenseSatellite(satellite) {
        if (!this.defenseSatellites.includes(satellite)) {
            this.defenseSatellites.push(satellite);
            // Defense satellites are tracked as part of the star system
            // They don't need separate spatial tracking
        }
    }
    
    /**
     * Remove defense satellite from this star system
     */
    removeDefenseSatellite(satellite) {
        const index = this.defenseSatellites.indexOf(satellite);
        if (index !== -1) {
            this.defenseSatellites.splice(index, 1);
        }
    }
    
    /**
     * Get all defense satellites at this star
     */
    getDefenseSatellites() {
        return [...this.defenseSatellites];
    }
    
    /**
     * Get defense strength of the star itself
     */
    getDefenseStrength() {
        // Stars have base defense strength based on tech level and population
        return this.techLevel * 1000; // Base defense per tech level
    }
    
    /**
     * Get total defense strength including satellites
     */
    getTotalDefenseStrength() {
        let totalDefense = this.getDefenseStrength();
        for (const satellite of this.defenseSatellites) {
            // Defense satellites should have a getDefenseStrength method
            if (satellite.getDefenseStrength) {
                totalDefense += satellite.getDefenseStrength();
            } else {
                // Fallback: assume satellites have a strength property
                totalDefense += satellite.strength || 0;
            }
        }
        return totalDefense;
    }
    
    // Combat methods - ported from CStar.cpp
    getAttackStrength() {
        // Population provides attack strength
        return this.population * 10;
    }
    
    getDefenseStrength() {
        // Population provides defense strength
        return this.population * 100;
    }
    
    getOneAttackAgainst(defender) {
        // Use PDG random function for damage variance
        const attackDamage = Math.floor((this.getAttackStrength() * (pdg.rand() + pdg.rand() + pdg.rand() + 3)) / 300);
        return Math.max(0, attackDamage);
    }
    
    takeDamage(amount) {
        // Population takes damage
        const populationDamage = Math.floor(amount / 100); // 1 population per 100 damage
        const actualPopulationKilled = Math.min(populationDamage, this.population);
        this.population = Math.max(0, this.population - populationDamage);
        
        // Return excess damage if population is wiped out
        if (this.population <= 0) {
            return amount - (actualPopulationKilled * 100);
        }
        
        return 0;
    }
    
    isDead() {
        return this.population <= 0;
    }
    
    isOwned() {
        return this.owner !== 0;
    }
    
    isAllyOf(playerId) {
        return this.game.players[this.owner] && 
               this.game.players[this.owner].isAllyOf(playerId);
    }
    
    isStar() {
        return true;
    }
    
    destroyedInCombat(attackerOwner) {
        console.log(`Star ${this.name} population wiped out in combat by player ${attackerOwner}`);
        this.owner = 0; // Star becomes unowned
        this.population = 0;
    }
    
    // Fleet formation support
    supportsShips() {
        return true; // Stars can hold ships
    }
    
    isFleet() {
        return false; // Stars are not fleets
    }
    
    /**
     * Set the default destination for ships built at this star
     * @param {Object} destination - The destination object (star, fleet, or coordinates)
     */
    setDefaultDestination(destination) {
        this.defaultDestination = destination;
    }
    
    /**
     * Get the default destination for ships built at this star
     * @returns {Object|null} The default destination or null if not set
     */
    getDefaultDestination() {
        return this.defaultDestination;
    }
    
    /**
     * Clear the default destination for ships built at this star
     */
    clearDefaultDestination() {
        this.defaultDestination = null;
    }
}

// Static counter for generating unique IDs
Star.nextId = 1;

// Export the class
module.exports = Star;
