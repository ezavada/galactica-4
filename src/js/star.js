// Star class definition for Galactica-4
// Contains all star-related data and logic

class Setting {
    constructor(value, rate, benefit, locked) {
        this.value = value;   // current effective value
        this.desired = value; // desired effective value
        this.rate = rate;    // rate of change of towards desired value per turn
        this.benefit = benefit; // benefit derived from on unit of value
        this.locked = locked; // if true, the setting is locked and cannot be changed
    }
    setDesired(desired) {
        this.desired = desired;
    }
    setRate(rate) {
        this.rate = rate;
    }
    setBenefit(benefit) {
        this.benefit = benefit;
    }
    setLocked(locked) {
        this.locked = locked;
    }
    getBenefit() {
        return this.value * this.benefit;
    }
    getProjectedBenefit() {
        return this.desired * this.benefit;
    }
    adjustValue() {
        let changed = false;
        if (this.value < this.desired) {
            this.value += this.rate;
            if (this.value > this.desired) {
                this.value = this.desired;
            }
            changed = true;
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
        this.x = x;
        this.y = y;
        this.name = name;
        this.population = 0;
        this.techLevel = 0;
        this.game = game;

        // Resource allocation (0.0 to 1.0 for each)
        this.growth = new Setting(334.0, 60.0, 6.0, false);
        this.shipBuilding = new Setting(333.0, 60.0, 6.0, false);
        this.research = new Setting(333.0, 60.0, 6.0, false);
        
        // Current production
        this.buildingShip = null; // null, or the ship object
        this.paidTowardShipBuilding = 0;
        this.paidTowardResearch = 0;
        
        // Ships at this star
        this.ships = [];
    }
    
    update() {
        if (this.population <= 0) {
            return; // do nothing with unpopulated stars
        }

        // Adjust all the settings
        this.shipBuilding.adjustValue();
        this.growth.adjustValue();
        this.research.adjustValue();

        // Adjust shipbuilding and research benefits based on the benefit of growth
        const benefitAdjustment = this.growth.getBenefit() / 1665.0;
        if (benefitAdjustment > 0) {
            this.shipBuilding.setBenefit(this.shipBuilding.getBenefit() + benefitAdjustment);
            this.research.setBenefit(this.research.getBenefit() + benefitAdjustment);
        }

        // apply research
        let amount = this.game.rules.getStarResearchAmount(this);
        console.log(`Paid ${amount} toward research at ${this.name}`);
        this.paidTowardResearch += amount;
        if (this.paidTowardResearch >= 1000) {
            this.paidTowardResearch -= 1000;
            this.techLevel++;
            console.log(`Tech level increased to ${this.techLevel} at ${this.name}`);
        }

        // apply shipbuilding effort
        if (this.currentShip) {
            amount = this.game.rules.getStarShipBuildingAmount(this);
            console.log(`Paid ${amount} toward shipbuilding at ${this.name}`);
            this.paidTowardShipBuilding += amount;
            const cost = this.game.rules.getShipBuildCost(this.currentShip, this);
            if (this.paidTowardShipBuilding >= cost) {
                this.completeShip(); // unlike Galactica-3, we only allow one ship per start built each turn
                this.paidTowardShipBuilding -= cost;
                console.log(`Ship built at ${this.name}`);
            }
        }
        
        // apply growth
        this.population += this.game.rules.getStarPopulationGrowth(this);
        if (this.population > 99900) {
            this.population = 99900;
        }
    }
    
    completeShip() {
        this.currentShip.complete();
        this.currentShip = null;
        console.log(`Built ${this.currentShip} at ${this.name}`);
    }
    
    startBuildingShip(shipType) {
        if (!this.currentShip) {
            this.currentShip = this.game.factory.createShip(this.x + 4, this.y - 4, shipType, this);
            this.ships.push(this.currentShip);
            console.log(`Started building ${shipType} at ${this.name}`);
        }
    }

    shipDeparted(ship) {
        this.ships.splice(this.ships.indexOf(ship), 1);
    }

    shipArrived(ship) {
        this.ships.push(ship);
    }
}

// Export the class
module.exports = Star;
