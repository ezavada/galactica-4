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
        if (this.isFleetEntity()) {
            if (this.ship.hasShipType && this.ship.hasShipType('battleship')) {
                return 'battleship';
            }
            if (this.ship.hasShipType && this.ship.hasShipType('colony')) {
                return 'colony';
            }
            return 'scout';
        }
        return this.ship.type;
    }

    isFleetEntity() {
        return this.game && this.game.getObjectType &&
            this.game.getObjectType(this.ship) === Common.ObjectType.FLEET;
    }

    getV3SkillLevel() {
        const player = this.game && this.game.players ? this.game.players[this.ship.owner] : null;
        if (player && player.compSkill) {
            return player.compSkill;
        }
        if (this.skillManager.getSkillLevel() >= AI_SKILL_LEVELS.EXPERT) {
            return 1;
        }
        if (this.skillManager.getSkillLevel() >= AI_SKILL_LEVELS.GOOD) {
            return 2;
        }
        return 3;
    }

    getDecisionRepetitionsForV3Skill(v3Skill) {
        if (v3Skill === 1) {
            return 3;
        }
        if (v3Skill === 2) {
            return 2;
        }
        return 1;
    }

    getSearchDistanceForV3Skill(v3Skill) {
        return Math.max(1, 999999 - (111111 * v3Skill));
    }

    getEntitySpeed(entity) {
        return this.utils.getEntitySpeed(entity);
    }

    getEntityDefenseStrength(entity) {
        if (!entity) {
            return 0;
        }
        if (entity.getDefenseStrength) {
            return entity.getDefenseStrength();
        }
        if (this.game.getObjectType(entity) === Common.ObjectType.STAR) {
            return this.rules.getStarDefenseStrength(entity);
        }
        return this.utils.getEntityStrength(entity);
    }

    getShipPower(entity) {
        if (!entity) {
            return 0;
        }
        if (this.game.getObjectType(entity) === Common.ObjectType.FLEET) {
            return entity.totalPower || 0;
        }
        return this.rules.getShipPower(entity);
    }

    // Main AI decision making method
    makeDecision() {
        this.debugLog(`Making AI decision for ${this.ship.type} ship`);

        if (this.isFleetEntity() && this.ship.calculateFleetStats) {
            this.ship.calculateFleetStats();
        }

        // v3 has no movable under-construction actor, and satellites do not make movement decisions.
        if (this.ship.needsDeletion ||
                (this.ship.underConstruction && this.ship.underConstruction()) ||
                this.ship.type === 'satellite' ||
                this.ship.type === 'defense') {
            this.debugLog('Ship marked for deletion, under construction, or stationary, no decision');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Ship not eligible for decisions');
        }

        // Check if ship is in a fleet (fleets make decisions for their ships)
        if (this.ship.isInFleet && this.ship.isInFleet()) {
            this.debugLog('Ship is in fleet, fleet will make decision');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Ship in fleet');
        }

        const v3Skill = this.getV3SkillLevel();
        if (this.isDockedSmallFleet()) {
            this.debugLog('Docked fleet has fewer than three ships, no movement allowed');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Docked fleet too small');
        }

        // Get maximum search distance based on skill level
        const maxDistance = this.getSearchDistanceForV3Skill(v3Skill);

        // Perform multiple iterations for higher skill levels. v3 keeps the
        // strongest score found for each destination class across passes, then
        // chooses the final action once after the loop.
        const repetitions = this.getDecisionRepetitionsForV3Skill(v3Skill);
        let finalState = null;
        const sharedState = { ignoreUnoccupiedStar: false };

        for (let iteration = 0; iteration < repetitions; iteration++) {
            this.debugLog(`AI iteration ${iteration + 1} of ${repetitions}`);

            const passState = this.evaluateDecisionIteration(iteration, maxDistance, v3Skill, sharedState);
            if (passState.directDecision) {
                this.applyV3PatrolRule(v3Skill, passState.directDecision);
                return passState.directDecision;
            }

            finalState = this.mergeV3DecisionPass(finalState, passState, iteration);
        }

        if (finalState) {
            this.decisionMatrix.scores = this.applyV3SkillRandomness(finalState.scores, v3Skill);
            this.decisionMatrix.targets = finalState.targets;
            const result = this.decisionMatrix.getBestAction();
            const finalDecision = this.buildDecisionFromResult(result);
            this.applyV3PatrolRule(v3Skill, finalDecision);
            return finalDecision;
        }

        const finalDecision = new AIDecision(AIActions.DO_NOTHING, null, 0, 'No valid decision found');
        this.applyV3PatrolRule(v3Skill, finalDecision);

        return finalDecision;
    }

    mergeV3DecisionPass(finalState, passState, iteration) {
        if (!finalState || iteration === 0) {
            return {
                scores: { ...passState.scores },
                targets: { ...passState.targets }
            };
        }

        const merged = {
            scores: { ...finalState.scores },
            targets: { ...finalState.targets }
        };
        const scoreTargets = [
            ['toOurStar', 'ourStar'],
            ['toEnemyStar', 'enemyStar'],
            ['toOtherStar', 'otherStar'],
            ['toShip', 'ship']
        ];

        for (const [scoreKey, targetKey] of scoreTargets) {
            if (passState.scores[scoreKey] > merged.scores[scoreKey]) {
                merged.scores[scoreKey] = passState.scores[scoreKey];
                merged.targets[targetKey] = passState.targets[targetKey];
            }
        }

        return merged;
    }

    isDockedSmallFleet() {
        return !!(this.isFleetEntity() &&
            this.ship.isDocked &&
            this.ship.isDocked() &&
            this.ship.getSize &&
            this.ship.getSize() < 3);
    }

    applyV3PatrolRule(v3Skill, decision = null) {
        const movementActions = [
            AIActions.GO_TO_OWN_STAR,
            AIActions.GO_TO_ENEMY_STAR,
            AIActions.GO_TO_UNOWNED_STAR,
            AIActions.ATTACK_SHIP
        ];
        if (decision && movementActions.includes(decision.action) && decision.target) {
            return false;
        }

        if (v3Skill > 2 || !this.utils.isAtStar(this.ship) || this.hasDestination(this.ship) ||
                this.getShipType() === 'scout' || !this.ship.setPatrol) {
            return false;
        }

        const damage = this.isFleetEntity() ? (this.ship.totalDamage || 0) : (this.ship.damage || 0);
        if (this.ship.isOnPatrol && this.ship.isOnPatrol() && damage > 0) {
            this.ship.setPatrol(false);
            return true;
        }

        if ((!this.ship.isOnPatrol || !this.ship.isOnPatrol()) && damage <= 0) {
            this.ship.setPatrol(true);
            return true;
        }

        return false;
    }

    // Perform a single decision iteration
    performDecisionIteration(iteration, maxDistance, v3Skill = this.getV3SkillLevel()) {
        const passState = this.evaluateDecisionIteration(iteration, maxDistance, v3Skill, { ignoreUnoccupiedStar: false });
        if (passState.directDecision) {
            return passState.directDecision;
        }
        this.decisionMatrix.scores = this.applyV3SkillRandomness(passState.scores, v3Skill);
        this.decisionMatrix.targets = passState.targets;
        const result = this.decisionMatrix.getBestAction();
        return this.buildDecisionFromResult(result);
    }

    evaluateDecisionIteration(iteration, maxDistance, v3Skill = this.getV3SkillLevel(), sharedState = { ignoreUnoccupiedStar: false }) {
        this.decisionMatrix.reset();

        // Find nearby entities
        const closestStars = this.utils.findClosestStars(this.ship, maxDistance);
        const closestEnemyShip = this.utils.findClosestEnemyShip(this.ship, maxDistance >> 2);
        
        let nearestEnemyStar = closestStars.nearestEnemyStar;

        // For higher skill levels, consider alternative targets
        if (iteration === 1 && v3Skill <= 2) {
            // Second iteration: look for weakest enemy star
            const weakestEnemy = this.utils.findWeakestEnemyStar(this.ship, this.getEntitySpeed(this.ship) * 4);
            if (weakestEnemy) {
                this.debugLog(`Found weakest enemy star: ${weakestEnemy.name}`);
                nearestEnemyStar = weakestEnemy;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, weakestEnemy);
            }
        } else if (iteration === 2 && v3Skill === 1) {
            // Third iteration: look for enemy tech production star
            const techStar = this.utils.findNearestEnemyTechProductionStar(this.ship, this.getEntitySpeed(this.ship) * 8);
            if (techStar) {
                this.debugLog(`Found enemy tech star: ${techStar.name}`);
                nearestEnemyStar = techStar;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, techStar);
            }
        }
        closestStars.nearestEnemyStar = nearestEnemyStar;

        // Set targets in decision matrix
        this.decisionMatrix.targets.ourStar = closestStars.nearestOwnedStar;
        this.decisionMatrix.targets.enemyStar = nearestEnemyStar;
        this.decisionMatrix.targets.otherStar = closestStars.nearestUnownedStar;
        this.decisionMatrix.targets.ship = closestEnemyShip.ship;

        // Special handling for scout ships at lower skill levels
        if (v3Skill <= 2 && this.ship.type === 'scout') {
            return { directDecision: this.handleScoutSpecialBehavior(closestStars) };
        }

        // Evaluate all decision factors
        this.evaluateDecisionFactors(closestStars, closestEnemyShip, v3Skill, sharedState);
        this.applyV3DecisionGuards(sharedState);

        return {
            scores: { ...this.decisionMatrix.scores },
            targets: { ...this.decisionMatrix.targets }
        };
    }

    buildDecisionFromResult(result) {
        return new AIDecision(
            this.mapActionToAIAction(result.action),
            result.target,
            result.score,
            `AI decision: ${result.action} with score ${result.score}`
        );
    }

    applyV3SkillRandomness(scores, v3Skill) {
        if (v3Skill <= 3) {
            return scores;
        }

        const skillMultiplier = v3Skill - 3;
        const modified = { ...scores };
        modified.toOurStar += this.utils.signRandom(12 * skillMultiplier);
        modified.toEnemyStar += this.utils.signRandom(12 * skillMultiplier);
        modified.toOtherStar += this.utils.signRandom(6 * skillMultiplier);
        modified.toShip += this.utils.signRandom(14 * skillMultiplier);
        if (v3Skill >= 5) {
            modified.toFormFleet = -1;
        }
        return modified;
    }

    applyV3DecisionGuards(sharedState = { ignoreUnoccupiedStar: false }) {
        if (!this.utils.isAtStar(this.ship) || this.isFleetEntity()) {
            this.decisionMatrix.scores.toFormFleet = -1;
        }
        if (sharedState.ignoreUnoccupiedStar) {
            this.decisionMatrix.scores.toOtherStar = -1;
        }
        if (!this.decisionMatrix.targets.ourStar) {
            this.decisionMatrix.scores.toOurStar = -1;
        }
        if (!this.decisionMatrix.targets.enemyStar) {
            this.decisionMatrix.scores.toEnemyStar = -1;
        }
        if (!this.decisionMatrix.targets.otherStar) {
            this.decisionMatrix.scores.toOtherStar = -1;
        }
        if (!this.decisionMatrix.targets.ship) {
            this.decisionMatrix.scores.toShip = -1;
        }
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
    evaluateDecisionFactors(closestStars, closestEnemyShip, v3Skill = this.getV3SkillLevel(), sharedState = { ignoreUnoccupiedStar: false }) {
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
            this.evaluateUnownedStarFactors(closestStars.nearestUnownedStar, closestStars, v3Skill, sharedState);
        }

        // Factor 4: No nearby enemy ship
        if (!closestEnemyShip.ship) {
            this.decisionMatrix.considerFactor(factors.NO_NEARBY_ENEMY_SHIP);
        } else {
            this.evaluateEnemyShipFactors(closestEnemyShip.ship, closestEnemyShip.distance, closestStars, v3Skill);
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
        const strengthDiff = this.getEntityDefenseStrength(this.ship) - this.getEntityDefenseStrength(enemyStar);
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
    evaluateUnownedStarFactors(unownedStar, closestStars, v3Skill = this.getV3SkillLevel(), sharedState = { ignoreUnoccupiedStar: false }) {
        const factors = AI_FACTORS;
        const distance = closestStars.distances[0];
        const enemyStarDistance = closestStars.nearestEnemyStar ? closestStars.distances[2] : Infinity;
        const ownedStarDistance = closestStars.nearestOwnedStar ? closestStars.distances[1] : Infinity;

        // Factor 14: Unowned star exists
        this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_EXISTS);

        if (distance < enemyStarDistance) {
            this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_CLOSER_THAN_ENEMY);
        } else if (enemyStarDistance < ownedStarDistance) {
            this.decisionMatrix.considerFactor(factors.ENEMY_STAR_CLOSEST);
        }

        // Factor 18: Unowned star already has ship
        if (this.utils.getShipsAtStar(unownedStar) > 0) {
            this.decisionMatrix.considerFactor(factors.UNOWNED_STAR_HAS_SHIP);
        }

        // Special handling for colony ships attacking heavily defended unowned planets
        if (v3Skill <= 3 && this.ship.type === 'colony') {
            const strengthDiff = this.getEntityDefenseStrength(this.ship) - this.getEntityDefenseStrength(unownedStar);
            if (strengthDiff <= 0) {
                this.debugLog('Disallowing travel to heavily defended unowned star');
                sharedState.ignoreUnoccupiedStar = true;
            }
        }
    }

    // Evaluate factors related to enemy ships
    evaluateEnemyShipFactors(enemyShip, distance, closestStars, v3Skill = this.getV3SkillLevel()) {
        const factors = AI_FACTORS;

        // Factor 5: Nearby enemy ship exists
        this.decisionMatrix.considerFactor(factors.NEARBY_ENEMY_SHIP_EXISTS);

        // Factor 6: Enemy ship is faster
        const speedDiff = this.utils.calculateRelativeSpeed(this.ship, enemyShip);
        if (speedDiff < 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_SHIP_IS_FASTER);
        }

        const freeStarDistance = closestStars.nearestUnownedStar ? closestStars.distances[0] : Infinity;
        const enemyStarDistance = closestStars.nearestEnemyStar ? closestStars.distances[2] : Infinity;
        const ownedStarDistance = closestStars.nearestOwnedStar ? closestStars.distances[1] : Infinity;
        if (distance < freeStarDistance && distance < enemyStarDistance && distance < ownedStarDistance) {
            this.decisionMatrix.considerFactor(factors.CLOSER_TO_SHIP_THAN_PLANET);
        }

        // Factor 9: Enemy ship more powerful
        const powerDiff = this.getShipPower(this.ship) - this.getShipPower(enemyShip);
        if (powerDiff < 0) {
            this.decisionMatrix.considerFactor(factors.ENEMY_SHIP_MORE_POWERFUL);
        }

        // Factor 21: Relative speed multiplier
        const adjustedSpeedDiff = this.utils.isFastGame() ? 
            Math.floor(speedDiff / 20000) : Math.floor(speedDiff / 10000);
        this.decisionMatrix.considerMultiplierFactor(factors.RELATIVE_SPEED_MULTIPLIER, adjustedSpeedDiff);

        // Factor 23: Relative power multiplier
        this.decisionMatrix.considerMultiplierFactor(factors.RELATIVE_SHIP_POWER_MULTIPLIER, powerDiff);

        if (closestStars.nearestOwnedStar) {
            const starStrengthDiff = this.getEntityDefenseStrength(closestStars.nearestOwnedStar) - this.getEntityDefenseStrength(enemyShip);
            this.decisionMatrix.considerMultiplierFactor(
                factors.RELATIVE_STAR_SHIP_POWER_MULTIPLIER,
                Math.floor(starStrengthDiff / 100)
            );
        }

        if (this.isFleetEntity() && v3Skill <= 2 && this.getShipPower(this.ship) > this.getShipPower(enemyShip) * 2) {
            this.decisionMatrix.scores.toShip = -1;
        }

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
        return !!this.findFleetAtStar(star);
    }

    findFleetAtStar(star) {
        if (!this.game || !this.game.allFleets) {
            return null;
        }

        for (const fleet of this.game.allFleets) {
            if (!fleet || fleet.owner !== this.ship.owner || (fleet.isEmpty && fleet.isEmpty())) {
                continue;
            }
            if (fleet.star === star) {
                return fleet;
            }
            if (!fleet.destination && Math.round(fleet.x) === Math.round(star.x) && Math.round(fleet.y) === Math.round(star.y)) {
                return fleet;
            }
        }

        return null;
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
        const currentStar = this.utils.getCurrentStar(this.ship);
        if (!currentStar || !this.ship.canFormFleet || !this.ship.canFormFleet()) {
            return null;
        }

        let fleet = this.findFleetAtStar(currentStar);
        if (fleet) {
            fleet.addShip(this.ship);
            return fleet;
        }

        const candidates = (currentStar.ships || []).filter(candidate =>
            candidate &&
            candidate !== this.ship &&
            candidate.owner === this.ship.owner &&
            candidate.canFormFleet &&
            candidate.canFormFleet() &&
            !candidate.destination &&
            !candidate.fleet
        );

        if (candidates.length === 0) {
            return null;
        }

        fleet = this.game.factory.createFleet(currentStar.x, currentStar.y, this.ship.owner);
        fleet.addShip(this.ship);
        for (const candidate of candidates) {
            fleet.addShip(candidate);
        }
        return fleet;
    }

    // Check if ship has a destination
    hasDestination(entity) {
        return !!(entity && entity.destination);
    }
}

module.exports = ShipAI;
