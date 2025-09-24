// Ship AI Decision Making for Galactica-4
// Implements the exact ship AI algorithms from CShipCompMove.cpp

const { AIBase, AIDecision, AIActions } = require('./ai-base.js');
const { DecisionMatrix, AI_FACTORS } = require('./ai-decision-matrices.js');
const { AISkillManager, AI_SKILL_LEVELS } = require('./ai-skill.js');
const AIUtils = require('./ai-utils.js');
const Common = require('./common.js');

class ShipAI extends AIBase {
    constructor(ship, game, rules, skillLevel = AI_SKILL_LEVELS.AVERAGE) {
        super(ship, game, rules);
        this.ship = ship;
        this.skillManager = new AISkillManager(skillLevel);
        this.utils = new AIUtils(game, rules);
        this.decisionMatrix = new DecisionMatrix(this.getShipType());
    }

    // Get ship type for decision matrix lookup
    getShipType() {
        return this.ship.type;
    }

    // Main AI decision making method
    makeDecision() {
        this.debugLog(`Making AI decision for ${this.ship.type} ship`);

        // Don't make decisions if ship is marked for deletion or is a satellite
        if (this.ship.needsDeletion || this.ship.type === 'satellite') {
            this.debugLog('Ship marked for deletion or is satellite, no decision');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Ship not eligible for decisions');
        }

        // Check if ship is in a fleet (fleets make decisions for their ships)
        if (this.ship.isInFleet) {
            this.debugLog('Ship is in fleet, fleet will make decision');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Ship in fleet');
        }

        // Get maximum search distance based on skill level
        const maxDistance = this.skillManager.getMaxSearchDistance(999999 - (111111 * this.skillManager.getSkillLevel()));

        // Perform multiple iterations for higher skill levels
        const repetitions = this.skillManager.getDecisionRepetitions();
        let bestDecision = null;
        let bestScore = -Infinity;

        for (let iteration = 0; iteration < repetitions; iteration++) {
            this.debugLog(`AI iteration ${iteration + 1} of ${repetitions}`);
            
            const decision = this.performDecisionIteration(iteration, maxDistance);
            if (decision.score > bestScore) {
                bestDecision = decision;
                bestScore = decision.score;
            }
        }

        return bestDecision || new AIDecision(AIActions.DO_NOTHING, null, 0, 'No valid decision found');
    }

    // Perform a single decision iteration
    performDecisionIteration(iteration, maxDistance) {
        this.decisionMatrix.reset();

        // Find nearby entities
        const closestStars = this.utils.findClosestStars(this.ship, maxDistance);
        const closestEnemyShip = this.utils.findClosestEnemyShip(this.ship, maxDistance >> 2);
        
        let nearestEnemyStar = closestStars.nearestEnemyStar;

        // For higher skill levels, consider alternative targets
        if (iteration === 1 && this.skillManager.getSkillLevel() >= AI_SKILL_LEVELS.GOOD) {
            // Second iteration: look for weakest enemy star
            const weakestEnemy = this.utils.findWeakestEnemyStar(this.ship, this.ship.speed * 4);
            if (weakestEnemy) {
                this.debugLog(`Found weakest enemy star: ${weakestEnemy.name}`);
                nearestEnemyStar = weakestEnemy;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, weakestEnemy);
            }
        } else if (iteration === 2 && this.skillManager.getSkillLevel() >= AI_SKILL_LEVELS.EXPERT) {
            // Third iteration: look for enemy tech production star
            const techStar = this.utils.findNearestEnemyTechProductionStar(this.ship, this.ship.speed * 8);
            if (techStar) {
                this.debugLog(`Found enemy tech star: ${techStar.name}`);
                nearestEnemyStar = techStar;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, techStar);
            }
        }

        // Set targets in decision matrix
        this.decisionMatrix.targets.ourStar = closestStars.nearestOwnedStar;
        this.decisionMatrix.targets.enemyStar = nearestEnemyStar;
        this.decisionMatrix.targets.otherStar = closestStars.nearestUnownedStar;
        this.decisionMatrix.targets.ship = closestEnemyShip.ship;

        // Special handling for scout ships at lower skill levels
        if (this.skillManager.getSkillLevel() <= AI_SKILL_LEVELS.GOOD && this.ship.type === 'scout') {
            return this.handleScoutSpecialBehavior(closestStars);
        }

        // Evaluate all decision factors
        this.evaluateDecisionFactors(closestStars, closestEnemyShip);

        // Apply skill-based modifications
        const scores = this.decisionMatrix.scores;
        const modifiedScores = this.skillManager.addRandomness(scores);
        this.decisionMatrix.scores = modifiedScores;

        // Get the best action
        const result = this.decisionMatrix.getBestAction();
        return new AIDecision(
            this.mapActionToAIAction(result.action),
            result.target,
            result.score,
            `AI decision: ${result.action} with score ${result.score}`
        );
    }

    // Handle special scout behavior for lower skill levels
    handleScoutSpecialBehavior(closestStars) {
        if (this.hasDestination(this.ship)) {
            // Check if current destination is still valid
            const dest = this.ship.destination;
            if (dest && dest.owner === this.ship.owner) {
                this.debugLog('Scout already has valid destination');
                return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Scout has valid destination');
            }
        }

        if (!closestStars.nearestOwnedStar && !this.utils.hasFogOfWar()) {
            this.debugLog('No nearby allied star and no fog of war');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'No nearby allies');
        }

        // Look for tech level differences with allied stars
        if (closestStars.nearestOwnedStar && 
            closestStars.nearestOwnedStar.techLevel === this.ship.techLevel) {
            // Same tech level, look for lower tech allied star
            const lowerTechStar = this.utils.findNearestLowerTechAlliedStar(this.ship, 999999);
            if (lowerTechStar) {
                this.debugLog(`Found lower tech allied star: ${lowerTechStar.name}`);
                return new AIDecision(AIActions.GO_TO_OWN_STAR, lowerTechStar, 50, 'Tech transfer to lower tech star');
            } else if (this.utils.hasFogOfWar() && closestStars.nearestUnownedStar) {
                return new AIDecision(AIActions.GO_TO_UNOWNED_STAR, closestStars.nearestUnownedStar, 30, 'Scouting unowned star');
            }
        }

        if (closestStars.nearestOwnedStar) {
            return new AIDecision(AIActions.GO_TO_OWN_STAR, closestStars.nearestOwnedStar, 40, 'Tech transfer');
        }

        return new AIDecision(AIActions.DO_NOTHING, null, 0, 'No scout action found');
    }

    // Evaluate all decision factors
    evaluateDecisionFactors(closestStars, closestEnemyShip) {
        const factors = AI_FACTORS;

        // Factor 0: Already moving
        if (this.hasDestination(this.ship)) {
            this.decisionMatrix.considerFactor(factors.ALREADY_MOVING);
        }

        // Factor 10/11: At star or not at star
        if (this.utils.isAtStar(this.ship)) {
            this.decisionMatrix.considerFactor(factors.AT_STAR);
            this.evaluateAtStarFactors();
        } else {
            this.decisionMatrix.considerFactor(factors.NOT_AT_STAR);
        }

        // Factor 1: No nearby owned star
        if (!closestStars.nearestOwnedStar) {
            this.decisionMatrix.considerFactor(factors.NO_NEARBY_OWNED_STAR);
        } else {
            this.evaluateOwnedStarFactors(closestStars.nearestOwnedStar);
        }

        // Factor 2: No nearby enemy star
        if (!closestStars.nearestEnemyStar) {
            this.decisionMatrix.considerFactor(factors.NO_NEARBY_ENEMY_STAR);
        } else {
            this.evaluateEnemyStarFactors(closestStars.nearestEnemyStar, closestStars.distances[2]);
        }

        // Factor 3: No nearby unowned star
        if (!closestStars.nearestUnownedStar) {
            this.decisionMatrix.considerFactor(factors.NO_NEARBY_UNOWNED_STAR);
        } else {
            this.evaluateUnownedStarFactors(closestStars.nearestUnownedStar, closestStars.distances[0]);
        }

        // Factor 4: No nearby enemy ship
        if (!closestEnemyShip.ship) {
            this.decisionMatrix.considerFactor(factors.NO_NEARBY_ENEMY_SHIP);
        } else {
            this.evaluateEnemyShipFactors(closestEnemyShip.ship, closestEnemyShip.distance);
        }

        // Factor 29/30: Damage factors
        if (this.utils.isEntityDamaged(this.ship)) {
            this.decisionMatrix.considerFactor(factors.WE_ARE_DAMAGED);
            if (this.utils.getDamagePercentage(this.ship) > 50) {
                this.decisionMatrix.considerFactor(factors.WE_ARE_HEAVILY_DAMAGED);
            }
        }

        // Additional relative factors
        this.evaluateRelativeFactors(closestStars, closestEnemyShip);
    }

    // Evaluate factors when ship is at a star
    evaluateAtStarFactors() {
        const currentStar = this.utils.getCurrentStar(this.ship);
        if (!currentStar) return;

        // Factor 31: Star has other ships of same class
        if (this.utils.starHasShipClass(currentStar, this.ship.type)) {
            this.decisionMatrix.considerFactor(AI_FACTORS.STAR_HAS_OTHER_SHIPS_OF_CLASS);
        }

        // Factor 32: At unowned star
        if (currentStar.owner === 0) {
            this.decisionMatrix.considerFactor(AI_FACTORS.AT_UNOWNED_STAR);
        }

        // Factor 33: No fleet at star
        if (!this.hasFleetAtStar(currentStar)) {
            this.decisionMatrix.considerFactor(AI_FACTORS.NO_FLEET_AT_STAR);
        }
    }

    // Evaluate factors related to owned stars
    evaluateOwnedStarFactors(ownedStar) {
        const factors = AI_FACTORS;

        // Factor 16: Our star has lower tech level
        if (this.ship.techLevel > ownedStar.techLevel) {
            this.decisionMatrix.considerFactor(factors.OUR_STAR_LOWER_TECH);
        }

        // Factor 8/26: Star has/d doesn't have ship of this class
        if (this.utils.starHasShipClass(ownedStar, this.ship.type)) {
            this.decisionMatrix.considerFactor(factors.OUR_STAR_HAS_SAME_CLASS_SHIP);
        } else {
            this.decisionMatrix.considerFactor(factors.OUR_STAR_NO_SAME_CLASS_SHIP);
        }
    }

    // Evaluate factors related to enemy stars
    evaluateEnemyStarFactors(enemyStar, distance) {
        const factors = AI_FACTORS;

        // Factor 12: Enemy star more powerful
        const strengthDiff = this.utils.calculateRelativeStrength(this.ship, enemyStar);
        if (strengthDiff < 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_STAR_MORE_POWERFUL);
        }

        // Factor 13: Enemy star has ship
        if (this.utils.getShipsAtStar(enemyStar) > 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_STAR_HAS_SHIP);
        } else {
            this.decisionMatrix.considerFactor(factors.ENEMY_STAR_UNPROTECTED);
        }

        // Factor 19: Enemy star has low population
        if (enemyStar.population < 1000) {
            this.decisionMatrix.considerFactor(factors.ENEMY_STAR_LOW_POPULATION);
        }

        // Factor 24: Relative strength multiplier
        if (strengthDiff !== 0) {
            this.decisionMatrix.considerMultiplierFactor(factors.RELATIVE_SHIP_STAR_POWER_MULTIPLIER, Math.floor(strengthDiff / 100));
        }
    }

    // Evaluate factors related to unowned stars
    evaluateUnownedStarFactors(unownedStar, distance) {
        const factors = AI_FACTORS;

        // Factor 14: Unowned star exists
        this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_EXISTS);

        // Factor 15: Unowned star closer than enemy star
        // This would need to be calculated based on enemy star distance
        // For now, we'll assume it's closer if distance is reasonable
        if (distance < 50000) { // Arbitrary threshold
            this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_CLOSER_THAN_ENEMY);
        }

        // Factor 18: Unowned star already has ship
        if (this.utils.getShipsAtStar(unownedStar) > 0) {
            this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_HAS_SHIP);
        }

        // Special handling for colony ships attacking heavily defended unowned planets
        if (this.skillManager.getSkillLevel() <= AI_SKILL_LEVELS.AVERAGE && this.ship.type === 'colony') {
            const strengthDiff = this.utils.calculateRelativeStrength(this.ship, unownedStar);
            if (strengthDiff <= 0) {
                this.debugLog('Disallowing travel to heavily defended unowned star');
                // This would need to be handled in the decision matrix
            }
        }
    }

    // Evaluate factors related to enemy ships
    evaluateEnemyShipFactors(enemyShip, distance) {
        const factors = AI_FACTORS;

        // Factor 5: Nearby enemy ship exists
        this.decisionMatrix.considerFactor(factors.NEARBY_ENEMY_SHIP_EXISTS);

        // Factor 6: Enemy ship is faster
        const speedDiff = this.utils.calculateRelativeSpeed(this.ship, enemyShip);
        if (speedDiff < 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_SHIP_IS_FASTER);
        }

        // Factor 7: Closer to ship than any planet
        // This would need to be calculated based on planet distances
        // For now, assume it's closer if distance is small
        if (distance < 25000) { // Arbitrary threshold
            this.decisionMatrix.considerFactor(factors.CLOSER_TO_SHIP_THAN_PLANET);
        }

        // Factor 9: Enemy ship more powerful
        const powerDiff = this.utils.calculateRelativeStrength(this.ship, enemyShip);
        if (powerDiff < 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_SHIP_MORE_POWERFUL);
        }

        // Factor 21: Relative speed multiplier
        const adjustedSpeedDiff = this.utils.isFastGame() ? 
            Math.floor(speedDiff / 20000) : Math.floor(speedDiff / 10000);
        this.decisionMatrix.considerMultiplierFactor(factors.RELATIVE_SPEED_MULTIPLIER, adjustedSpeedDiff);

        // Factor 23: Relative power multiplier
        this.decisionMatrix.considerMultiplierFactor(factors.RELATIVE_SHIP_POWER_MULTIPLIER, powerDiff);

        // Factor 28: Enemy ship is scout
        if (enemyShip.type === 'scout') {
            this.decisionMatrix.considerFactor(factors.ENEMY_SHIP_IS_SCOUT);
        }
    }

    // Evaluate relative factors between different targets
    evaluateRelativeFactors(closestStars, closestEnemyShip) {
        // Factor 27: Owned star closer to enemy star than we are
        if (closestStars.nearestOwnedStar && closestStars.nearestEnemyStar) {
            const ourStarToEnemyDist = this.utils.calculateDistance(closestStars.nearestOwnedStar, closestStars.nearestEnemyStar);
            if (ourStarToEnemyDist < closestStars.distances[2]) {
                this.decisionMatrix.considerFactor(AI_FACTORS.OWNED_STAR_CLOSER_TO_ENEMY);
            }
        }
    }

    // Check if there's a fleet at a star
    hasFleetAtStar(star) {
        // This would need to be implemented based on how fleets are stored
        // For now, return false as a placeholder
        return false;
    }

    // Map decision matrix action to AI action
    mapActionToAIAction(action) {
        switch (action) {
            case 'toOurStar':
                return AIActions.GO_TO_OWN_STAR;
            case 'toEnemyStar':
                return AIActions.GO_TO_ENEMY_STAR;
            case 'toOtherStar':
                return AIActions.GO_TO_UNOWNED_STAR;
            case 'toShip':
                return AIActions.ATTACK_SHIP;
            case 'toFormFleet':
                return AIActions.FORM_FLEET;
            default:
                return AIActions.DO_NOTHING;
        }
    }

    // Execute the AI decision
    executeDecision(decision) {
        this.debugLog(`Executing decision: ${decision.action} targeting ${decision.target ? decision.target.name || decision.target.type : 'none'}`);

        switch (decision.action) {
            case AIActions.GO_TO_OWN_STAR:
            case AIActions.GO_TO_ENEMY_STAR:
            case AIActions.GO_TO_UNOWNED_STAR:
            case AIActions.ATTACK_SHIP:
                if (decision.target) {
                    this.ship.setDestination(decision.target);
                }
                break;
            case AIActions.FORM_FLEET:
                this.attemptFleetFormation();
                break;
            case AIActions.DO_NOTHING:
            default:
                // Do nothing
                break;
        }
    }

    // Attempt to form or join a fleet
    attemptFleetFormation() {
        this.debugLog('Attempting fleet formation');
        // This would need to be implemented based on fleet mechanics
        // For now, just log the attempt
    }

    // Check if ship has a destination
    hasDestination(entity) {
        return entity.destination !== null;
    }
}

module.exports = ShipAI;
