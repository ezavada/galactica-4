// Rules class for Galactica-4
// Contains all game rules and logic

class Rules {
    constructor(isFast = false) {
        this.isFast = isFast;
        this.shipClasses = ['frigate', 'destroyer', 'cruiser', 'battleship', 'colossus']; // TODO: need actual ship classes
        this.maxPopP = 16.0
        this.growthLimit = 4.0
        this.growthLimitSquared = this.growthLimit * this.growthLimit
        this.inverseGrowthLimitSquared = 1.0 / this.growthLimitSquared
    }


    // --- general rules ---

    getScanRangeForTechLevel(techLevel) {
        let range = (techLevel + 7) * 1500.0;
        if (this.isFast) {
            range *= 2.0;
        }
        return range;
    }

    getStarCount() {
        return 12;
    }


    // --- star specific rules ---

    // star attack strength is a factor of tech level and of population, so planets with
    // larger populations are harder to take over. The function is (log x)^2, so the benefits
    // of larger population decrease as population increases.
    // Assuming a level 1 ship has an attack strength of 50, and a level 10 ship an attack strength
    // of 500, the population defense curve is as follows:

    // pop 10 thousand  = 30 -- a bit weaker than a single ship level one ship
    // pop 100 thousand = 75 -- 1 & 1/2 ship strength
    // pop 1 million   = 130 -- a bit weaker than 3 ships 
    // pop 10 million  = 195 -- on par with 4 ships
    // pop 100 million = 270 -- a bit stronger than 5 ships
    // pop 1 billion   = 355 -- on par with 7 ships
    // pop 10 billion  = 450 -- on par with 9 ships

    getStarAttackStrength(star) {
        let factor = 4.0
        if (star.population > 10) {
            factor = Math.log10(star.population * 1000.0);
        }
        let strength = (factor * factor * 5) - 50;
        return strength * star.techLevel;
    }

    getStarDefenseStrength(star) {
        if (star.population < 10) {
            return 0;
        }
        return this.getStarAttackStrength(star);
    }

    getStarScanRange(star) {
        return this.getScanRangeForTechLevel(star.techLevel);
    }

    getStarRepairAmount(star) {
        return 35.0 * star.techLevel;
    }

    getStarShipBuildingAmount(star) {
        let amount = star.shipBuilding.getBenefits() / 1665.0;
        if (this.isFast) {
            amount *= 2.0;
        }
        return amount;
    }

    getStarResearchAmount(star) {
        let amount = star.research.getBenefits() / (0.9 * star.techLevel);
        if (this.isFast) {
            amount *= 1.3333;  // 1.3333 ~= 4/3
        }
        return amount;
    }

    getStarPopulationGrowth(star) {
        let g = star.growth.value / 500.0;
        let p = star.population / 1000000.0;
        let x = 0.0;
        if (p > 1.0) {
            x = p / (this.maxPopP * this.growthLimit);
            x = -(x * x) + this.inverseGrowthLimitSquared;
        } else {
            x = p / 0.2 + 5.0;
        }
        p = star.population * x * g;
        if (p < 1.0) {
            p += 1.5;
        }
        return p;
    }


    // --- ship specific rules ---

    getShipScrapValue(ship) {
        return this.getShipBuildCost(ship.type, ship.techLevel) / 4.0;
    }
    
    getShipBuildCost(ship, star) {
        switch (ship.type) {
            case 'defense':
                return 0.4 + (ship.techLevel / 6.0);
            case 'scout':
                return 0.1 + (ship.techLevel / 8.0);
            case 'colony':
                return 4.0 + (ship.techLevel / 2.0);
            case 'battleship':
                return 1.0 + (ship.techLevel / 2.0);
            default:
                return Infinity;
        }
    }

    getShipInitialSpeed(ship) {
        const speedIdx = Math.floor(ship.techLevel/5.0) + 1;
        let speed = speedIdx * 10.0 + ship.techLevel % 5.0;
        switch (ship.type) {
            case 'colony':
                speed *= 0.75;
                break;
            case 'defense':
                speed = 0.0;
                break;
            case 'scout':
                speed *= 1.5;
                break;
            default:
                break;
        }
        if (this.isFast) {
            speed *= 2.0;
        }
        return speed * 1000.0;
    }

    getShipApparentSize(ship) {
        return 100.0;  // all ships currently have same apparent size
    }

    getShipStealth(ship) {
        switch (ship.type) {
            case 'scout':
                return 4.0;
            default:
                return 1.0;
        }
    }

    getShipScanRange(ship) {
        switch (ship.type) {
            case 'scout':
                return 0.8 * this.getScanRangeForTechLevel(ship.techLevel);
            default:
                return 0.0;
        }
    }

    getShipClass(ship) {
        switch (ship.type) {
            case 'battleship':
                return this.shipClasses[Math.floor(ship.techLevel/5)];
            default:
                return ship.type;
        }
    }

    getShipPower(ship) {
        switch (ship.type) {
            case 'scout':
                return 0;
            default:
                return ship.techLevel;
        }
    }
}

module.exports = Rules;