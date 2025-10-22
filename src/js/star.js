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
        }

        // apply shipbuilding effort
        if (this.currentShip) {
            amount = this.game.rules.getStarShipBuildingAmount(this);
            //console.log(`Paid ${amount} toward shipbuilding at ${this.name}`);
            this.paidTowardShipBuilding += amount;
            const cost = this.game.rules.getShipBuildCost(this.currentShip, this);
            if (this.paidTowardShipBuilding >= cost) {
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
        
        return ship;
    }
    
    startBuildingShip(shipType) {
        if (!this.currentShip) {
            this.currentShip = this.game.factory.createShip(this.x, this.y, shipType, this);
            this.ships.push(this.currentShip);
        }
    }

    shipDeparted(ship) {
        this.ships.splice(this.ships.indexOf(ship), 1);
    }

    shipArrived(ship) {
        this.ships.push(ship);
    }
}

// Static counter for generating unique IDs
Star.nextId = 1;

// Export the class
module.exports = Star;
