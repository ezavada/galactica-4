// Ship AI Decision Making for Galactica-4
// Implements the exact ship AI algorithms from CShipCompMove.cpp

const { AIBase, AIDecision, AIActions } = require('./ai-base.js');
const { DecisionMatrix, AI_FACTORS } = require('./ai-decision-matrices.js');
const { AISkillManager, AI_SKILL_LEVELS } = require('./ai-skill.js');
const AIUtils = require('./ai-utils.js');
const Common = require('./common.js');

const EXPERT_CAMPAIGN_TURNS = {
    attackStar: 16,
    attackShip: 6,
    colonize: 14,
    frontierScout: 12,
    defendStar: 8
};
const EXPERT_FRONTIER_SCOUT_SEARCH_DISTANCE = 999999;
const EXPERT_DEFENSE_REDEPLOY_SEARCH_DISTANCE = 999999;
const EXPERT_DEFENSE_THREAT_RADIUS = 180000;
const EXPERT_DEFENSE_ENEMY_STAR_RADIUS = 240000;
const EXPERT_DEFENSE_REDEPLOY_THRESHOLD = 120;
const EXPERT_DEFENSE_SAFE_SOURCE_THRESHOLD = 80;
const EXPERT_SCOUT_STANDOFF_SCAN_MARGIN = 0.92;
const EXPERT_SCOUT_STANDOFF_MIN_DISTANCE = 5000;
const EXPERT_SCOUT_STANDOFF_DEFENDER_SPEED_FACTOR = 0.35;
const EXPERT_SCOUT_STANDOFF_DANGER_MARGIN = 2500;

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

    getCapabilitySkillLevel(v3Skill = this.getV3SkillLevel()) {
        const normalizedSkill = Math.min(5, Math.max(1, Number(v3Skill) || 3));
        return Math.max(1, normalizedSkill - 1);
    }

    isExpertLevel(v3Skill = this.getV3SkillLevel()) {
        return Number(v3Skill) === 1;
    }

    getDecisionRepetitionsForV3Skill(v3Skill) {
        if (this.isExpertLevel(v3Skill)) {
            return 4;
        }

        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);
        if (capabilitySkill === 1) {
            return 3;
        }
        if (capabilitySkill === 2) {
            return 2;
        }
        return 1;
    }

    getSearchDistanceForV3Skill(v3Skill) {
        if (this.isExpertLevel(v3Skill)) {
            return 999999;
        }
        return Math.max(1, 999999 - (111111 * this.getCapabilitySkillLevel(v3Skill)));
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
        if (!this.isFleetEntity() && this.ship.isInFleet && this.ship.isInFleet()) {
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

        const campaignDecision = this.getRetainedExpertCampaignObjectiveDecision(v3Skill);
        if (campaignDecision) {
            this.applyV3PatrolRule(v3Skill, campaignDecision);
            return campaignDecision;
        }

        const redeploymentDecision = this.getExpertDefensiveRedeploymentDecision(v3Skill, maxDistance);
        if (redeploymentDecision) {
            this.rememberExpertCampaignObjective(redeploymentDecision, v3Skill);
            this.applyV3PatrolRule(v3Skill, redeploymentDecision);
            return redeploymentDecision;
        }

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
                this.rememberExpertCampaignObjective(passState.directDecision, v3Skill);
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
            this.rememberExpertCampaignObjective(finalDecision, v3Skill);
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
        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);
        const movementActions = [
            AIActions.GO_TO_OWN_STAR,
            AIActions.GO_TO_ENEMY_STAR,
            AIActions.GO_TO_UNOWNED_STAR,
            AIActions.ATTACK_SHIP
        ];
        if (decision && movementActions.includes(decision.action) && decision.target) {
            return false;
        }

        if (capabilitySkill > 2 || !this.utils.isAtStar(this.ship) || this.hasDestination(this.ship) ||
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

    getMovementActions() {
        return [
            AIActions.GO_TO_OWN_STAR,
            AIActions.GO_TO_ENEMY_STAR,
            AIActions.GO_TO_UNOWNED_STAR,
            AIActions.ATTACK_SHIP
        ];
    }

    isMovementDecision(decision) {
        return !!(decision && decision.target && this.getMovementActions().includes(decision.action));
    }

    canUseExpertCampaignObjectives(v3Skill = this.getV3SkillLevel()) {
        if (!this.isExpertLevel(v3Skill) || !this.ship || this.ship.needsDeletion) {
            return false;
        }
        if ((this.ship.underConstruction && this.ship.underConstruction()) ||
                this.ship.type === 'defense' ||
                (!this.isFleetEntity() && this.ship.isInFleet && this.ship.isInFleet())) {
            return false;
        }
        return !this.isDockedSmallFleet();
    }

    getCampaignObjectiveKind(decision) {
        if (!decision || !decision.target) {
            return null;
        }
        if (decision.objectiveKind) {
            return decision.objectiveKind;
        }
        switch (decision.action) {
            case AIActions.GO_TO_ENEMY_STAR:
                return 'attackStar';
            case AIActions.ATTACK_SHIP:
                return 'attackShip';
            case AIActions.GO_TO_UNOWNED_STAR:
                if (this.getShipType() === 'scout') {
                    return 'frontierScout';
                }
                if (this.canColonize()) {
                    return 'colonize';
                }
                return null;
            default:
                return null;
        }
    }

    canColonize() {
        return this.ship.type === 'colony' ||
            (this.isFleetEntity() && this.ship.hasShipType && this.ship.hasShipType('colony'));
    }

    rememberExpertCampaignObjective(decision, v3Skill = this.getV3SkillLevel()) {
        if (!this.canUseExpertCampaignObjectives(v3Skill) || !this.isMovementDecision(decision)) {
            return false;
        }

        const kind = this.getCampaignObjectiveKind(decision);
        if (!kind) {
            return false;
        }

        const ttl = EXPERT_CAMPAIGN_TURNS[kind] || 10;
        this.ship.aiCampaignObjective = {
            kind,
            action: decision.action,
            target: decision.target,
            createdTurn: this.game ? this.game.turn : 0,
            expiresTurn: (this.game ? this.game.turn : 0) + ttl,
            score: Number.isFinite(decision.score) ? decision.score : 80
        };
        return true;
    }

    clearExpertCampaignObjective() {
        if (this.ship && this.ship.aiCampaignObjective) {
            this.ship.aiCampaignObjective = null;
            return true;
        }
        return false;
    }

    getRetainedExpertCampaignObjectiveDecision(v3Skill = this.getV3SkillLevel()) {
        const objective = this.ship ? this.ship.aiCampaignObjective : null;
        if (!objective) {
            return null;
        }

        if (!this.isExpertCampaignObjectiveValid(objective, v3Skill)) {
            this.clearExpertCampaignObjective();
            return null;
        }

        const decision = new AIDecision(
            objective.action,
            objective.target,
            objective.score || 80,
            `Expert campaign objective: ${objective.kind}`
        );
        decision.objectiveKind = objective.kind;
        decision.fromCampaignObjective = true;
        return decision;
    }

    isExpertCampaignObjectiveValid(objective, v3Skill = this.getV3SkillLevel()) {
        if (!this.canUseExpertCampaignObjectives(v3Skill) || !objective || !objective.target) {
            return false;
        }

        const turn = this.game ? this.game.turn : 0;
        if (Number.isFinite(objective.expiresTurn) && turn > objective.expiresTurn) {
            return false;
        }

        if (this.utils.isEntityDamaged(this.ship) && this.utils.getDamagePercentage(this.ship) > 50) {
            return false;
        }

        if (!this.isCampaignTargetStillPresent(objective.target)) {
            return false;
        }

        if (this.hasReachedCampaignTarget(objective.target)) {
            return false;
        }

        const owner = this.ship.owner;
        switch (objective.kind) {
            case 'attackStar':
                return objective.target.owner > 0 && objective.target.owner !== owner;
            case 'attackShip':
                return objective.target.owner > 0 && objective.target.owner !== owner;
            case 'colonize':
                return objective.target.owner === 0;
            case 'frontierScout':
                if (objective.target.aiStandoffScoutPoint) {
                    return !!(objective.target.aiScoutTarget &&
                        objective.target.aiScoutTarget.owner > 0 &&
                        objective.target.aiScoutTarget.owner !== owner);
                }
                return objective.target.owner === 0;
            case 'defendStar':
                return objective.target.owner === owner &&
                    this.getExpertStarThreatScore(objective.target, owner, this.ship).threat >= EXPERT_DEFENSE_REDEPLOY_THRESHOLD;
            default:
                return false;
        }
    }

    isCampaignTargetStillPresent(target) {
        if (!target || !this.game || !this.game.getObjectType) {
            return !!target;
        }

        const objectType = this.game.getObjectType(target);
        if (objectType === Common.ObjectType.STAR) {
            return this.game.stars && this.game.stars.includes(target);
        }
        if (objectType === Common.ObjectType.SHIP) {
            return this.game.allShips && this.game.allShips.includes(target) &&
                (!target.isDead || !target.isDead()) &&
                (!target.underConstruction || !target.underConstruction());
        }
        if (objectType === Common.ObjectType.FLEET) {
            return this.game.allFleets && this.game.allFleets.includes(target) &&
                (!target.isDead || !target.isDead()) &&
                (!target.isEmpty || !target.isEmpty());
        }
        return Number.isFinite(target.x) && Number.isFinite(target.y);
    }

    hasReachedCampaignTarget(target) {
        if (!target || this.hasDestination(this.ship)) {
            return false;
        }

        const currentStar = this.utils.getCurrentStar(this.ship);
        if (currentStar && currentStar === target) {
            return true;
        }

        return Number.isFinite(target.x) && Number.isFinite(target.y) &&
            Math.abs(this.ship.x - target.x) < 5 &&
            Math.abs(this.ship.y - target.y) < 5;
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
        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);

        // Find nearby entities
        const closestStars = this.utils.findClosestStars(this.ship, maxDistance);
        const closestEnemyShip = this.utils.findClosestEnemyShip(this.ship, maxDistance >> 2);
        
        let nearestEnemyStar = closestStars.nearestEnemyStar;

        // For higher skill levels, consider alternative targets
        if (iteration === 1 && capabilitySkill <= 2) {
            // Second iteration: look for weakest enemy star
            const weakestEnemy = this.utils.findWeakestEnemyStar(this.ship, this.getEntitySpeed(this.ship) * 4);
            if (weakestEnemy) {
                this.debugLog(`Found weakest enemy star: ${weakestEnemy.name}`);
                nearestEnemyStar = weakestEnemy;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, weakestEnemy);
            }
        } else if (iteration === 2 && capabilitySkill === 1) {
            // Third iteration: look for enemy tech production star
            const techStar = this.utils.findNearestEnemyTechProductionStar(this.ship, this.getEntitySpeed(this.ship) * 8);
            if (techStar) {
                this.debugLog(`Found enemy tech star: ${techStar.name}`);
                nearestEnemyStar = techStar;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, techStar);
            }
        } else if (iteration === 3 && this.isExpertLevel(v3Skill)) {
            // Expert-only v4 pass: look for the best vulnerable enemy star
            // across the wider search radius, favoring weak defenses, low
            // population, high tech value, and shorter travel time.
            const strategicEnemy = this.findExpertStrategicEnemyStar(maxDistance);
            if (strategicEnemy) {
                this.debugLog(`Found expert strategic enemy star: ${strategicEnemy.name}`);
                nearestEnemyStar = strategicEnemy;
                closestStars.distances[2] = this.utils.calculateDistance(this.ship, strategicEnemy);
            }
        }
        closestStars.nearestEnemyStar = nearestEnemyStar;

        // Set targets in decision matrix
        this.decisionMatrix.targets.ourStar = closestStars.nearestOwnedStar;
        this.decisionMatrix.targets.enemyStar = nearestEnemyStar;
        this.decisionMatrix.targets.otherStar = closestStars.nearestUnownedStar;
        this.decisionMatrix.targets.ship = closestEnemyShip.ship;

        // Special handling for scout ships at lower skill levels
        if (capabilitySkill <= 2 && this.ship.type === 'scout') {
            return { directDecision: this.handleScoutSpecialBehavior(closestStars, maxDistance, v3Skill) };
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
        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);
        if (capabilitySkill <= 3) {
            return scores;
        }

        const skillMultiplier = capabilitySkill - 3;
        const modified = { ...scores };
        modified.toOurStar += this.utils.signRandom(12 * skillMultiplier);
        modified.toEnemyStar += this.utils.signRandom(12 * skillMultiplier);
        modified.toOtherStar += this.utils.signRandom(6 * skillMultiplier);
        modified.toShip += this.utils.signRandom(14 * skillMultiplier);
        if (capabilitySkill >= 5) {
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
    handleScoutSpecialBehavior(closestStars, maxDistance = EXPERT_FRONTIER_SCOUT_SEARCH_DISTANCE, v3Skill = this.getV3SkillLevel()) {
        if (this.hasDestination(this.ship)) {
            // Check if current destination is still valid
            const dest = this.ship.destination;
            if (dest && dest.owner === this.ship.owner) {
                this.debugLog('Scout already has valid destination');
                return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Scout has valid destination');
            }
        }

        if (this.isExpertLevel(v3Skill)) {
            const scoutTarget = this.findExpertScoutTarget(maxDistance);
            if (scoutTarget) {
                const score = Number.isFinite(scoutTarget.aiScoutScore) ? scoutTarget.aiScoutScore : 70;
                const decision = new AIDecision(AIActions.GO_TO_UNOWNED_STAR, scoutTarget, score, 'Expert frontier scouting');
                decision.objectiveKind = 'frontierScout';
                return decision;
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

    findExpertScoutTarget(maxDistance = EXPERT_FRONTIER_SCOUT_SEARCH_DISTANCE) {
        const frontierTarget = this.findExpertFrontierScoutTarget(maxDistance);
        const enemyScoutTarget = this.findExpertEnemyStarScoutTarget(maxDistance);

        if (!frontierTarget) {
            return enemyScoutTarget;
        }
        if (!enemyScoutTarget) {
            return frontierTarget;
        }

        const frontierScore = Number.isFinite(frontierTarget.aiScoutScore) ? frontierTarget.aiScoutScore : 0;
        const enemyScore = Number.isFinite(enemyScoutTarget.aiScoutScore) ? enemyScoutTarget.aiScoutScore : 0;
        return enemyScore > frontierScore ? enemyScoutTarget : frontierTarget;
    }

    findExpertFrontierScoutTarget(maxDistance = EXPERT_FRONTIER_SCOUT_SEARCH_DISTANCE) {
        if (!this.isExpertLevel() || this.getShipType() !== 'scout' || !this.game || !this.game.stars) {
            return null;
        }

        const owner = this.ship.owner;
        const speed = Math.max(1, this.getEntitySpeed(this.ship));
        let bestStar = null;
        let bestScore = -Infinity;

        for (const star of this.game.stars) {
            if (!star || star.owner !== 0 || star === this.utils.getCurrentStar(this.ship)) {
                continue;
            }

            const distance = this.utils.calculateDistance(this.ship, star);
            if (distance > maxDistance) {
                continue;
            }

            if (this.isFriendlyUnitAssignedToTarget(star, this.ship)) {
                continue;
            }

            const nearestEnemyDistance = this.getNearestStarDistance(star, this.utils.getEnemyStars(owner));
            const nearestOwnedDistance = this.getNearestStarDistance(star, this.utils.getPlayerStars(owner));
            const lastSeenTurn = star.getLastSeen ? star.getLastSeen(owner) : (star.lastSeen ? (star.lastSeen[owner] || 0) : 0);
            const unseenBonus = lastSeenTurn <= 0 ? 260 : Math.min(180, Math.max(0, (this.game.turn - lastSeenTurn) * 8));
            const enemyApproachBonus = Number.isFinite(nearestEnemyDistance) ? Math.max(0, 240 - (nearestEnemyDistance / 900)) : 0;
            const frontierBonus = Number.isFinite(nearestEnemyDistance) && nearestEnemyDistance < nearestOwnedDistance ? 180 : 0;
            const ownedDistanceBonus = Number.isFinite(nearestOwnedDistance) ? Math.min(140, nearestOwnedDistance / 1000) : 0;
            const travelPenalty = (distance / speed) * 8;
            const localDefensePenalty = this.getNeutralStarDefensePenalty(star);
            const score = unseenBonus + enemyApproachBonus + frontierBonus + ownedDistanceBonus - travelPenalty - localDefensePenalty;

            if (score > bestScore) {
                bestScore = score;
                bestStar = star;
            }
        }

        if (bestStar) {
            bestStar.aiScoutScore = bestScore;
        }
        return bestScore > 0 ? bestStar : null;
    }

    findExpertEnemyStarScoutTarget(maxDistance = EXPERT_FRONTIER_SCOUT_SEARCH_DISTANCE) {
        if (!this.isExpertLevel() || this.getShipType() !== 'scout' || !this.game || !this.game.stars) {
            return null;
        }

        const owner = this.ship.owner;
        const speed = Math.max(1, this.getEntitySpeed(this.ship));
        const scoutRange = this.getScoutScanRange();
        if (scoutRange <= EXPERT_SCOUT_STANDOFF_MIN_DISTANCE) {
            return null;
        }

        let bestPoint = null;
        let bestScore = -Infinity;

        for (const star of this.utils.getEnemyStars(owner)) {
            if (!star || star === this.utils.getCurrentStar(this.ship)) {
                continue;
            }

            if (this.isFriendlyUnitAssignedToTarget(star, this.ship)) {
                continue;
            }

            const dangerRange = this.getEstimatedEnemyStarAttackRange(star);
            const currentRangeToStar = this.utils.calculateDistance(this.ship, star);
            const safeScanRange = Math.min(scoutRange * EXPERT_SCOUT_STANDOFF_SCAN_MARGIN, dangerRange);
            if (!this.hasDestination(this.ship) &&
                    currentRangeToStar <= scoutRange &&
                    currentRangeToStar >= safeScanRange) {
                continue;
            }

            const point = this.createExpertEnemyStarScoutPoint(star, scoutRange);
            if (!point) {
                continue;
            }

            const distance = this.utils.calculateDistance(this.ship, point);
            if (distance > maxDistance) {
                continue;
            }

            const starDistance = this.utils.calculateDistance(point, star);
            if (starDistance > scoutRange) {
                continue;
            }

            const lastSeenTurn = star.getLastSeen ? star.getLastSeen(owner) : (star.lastSeen ? (star.lastSeen[owner] || 0) : 0);
            const unseenBonus = lastSeenTurn <= 0 ? 320 : Math.min(220, Math.max(0, (this.game.turn - lastSeenTurn) * 10));
            const valueBonus = Math.min(220, ((star.techLevel || 0) * 18) + Math.min(100, (star.population || 0) / 500));
            const safetyBonus = Math.min(140, Math.max(0, starDistance - dangerRange) / 120);
            const travelPenalty = (distance / speed) * 7;
            const score = unseenBonus + valueBonus + safetyBonus - travelPenalty;

            point.aiScoutScore = score;
            if (score > bestScore) {
                bestScore = score;
                bestPoint = point;
            }
        }

        return bestScore > 0 ? bestPoint : null;
    }

    createExpertEnemyStarScoutPoint(enemyStar, scoutRange = this.getScoutScanRange()) {
        if (!enemyStar || !Number.isFinite(enemyStar.x) || !Number.isFinite(enemyStar.y)) {
            return null;
        }

        const dangerRange = this.getEstimatedEnemyStarAttackRange(enemyStar);
        const maxScanDistance = Math.max(
            EXPERT_SCOUT_STANDOFF_MIN_DISTANCE,
            scoutRange * EXPERT_SCOUT_STANDOFF_SCAN_MARGIN
        );
        const desiredDistance = Math.min(
            maxScanDistance,
            Math.max(EXPERT_SCOUT_STANDOFF_MIN_DISTANCE, dangerRange + EXPERT_SCOUT_STANDOFF_DANGER_MARGIN)
        );
        const direction = this.getScoutStandoffDirection(enemyStar);

        return {
            x: enemyStar.x + (direction.x * desiredDistance),
            y: enemyStar.y + (direction.y * desiredDistance),
            owner: 0,
            name: enemyStar.name,
            aiScoutTarget: enemyStar,
            aiStandoffScoutPoint: true,
            aiScoutDistanceFromTarget: desiredDistance,
            aiEstimatedEnemyAttackRange: dangerRange,
            aiScoutRange: scoutRange
        };
    }

    getScoutStandoffDirection(enemyStar) {
        let anchor = null;
        let nearestAnchorDistance = Infinity;
        for (const ownedStar of this.utils.getPlayerStars(this.ship.owner)) {
            if (!ownedStar || ownedStar === enemyStar) {
                continue;
            }
            const distance = this.utils.calculateDistance(enemyStar, ownedStar);
            if (distance < nearestAnchorDistance) {
                nearestAnchorDistance = distance;
                anchor = ownedStar;
            }
        }

        if (!anchor) {
            anchor = this.ship;
        }

        let dx = anchor.x - enemyStar.x;
        let dy = anchor.y - enemyStar.y;
        let length = Math.sqrt((dx * dx) + (dy * dy));

        if (length < 1) {
            dx = this.ship.x - enemyStar.x;
            dy = this.ship.y - enemyStar.y;
            length = Math.sqrt((dx * dx) + (dy * dy));
        }

        if (length < 1) {
            return { x: 1, y: 0 };
        }

        return {
            x: dx / length,
            y: dy / length
        };
    }

    getScoutScanRange() {
        const directRange = this.ship ? Number(this.ship.scannerRange) : 0;
        if (directRange > 0) {
            return directRange;
        }
        if (this.rules && typeof this.rules.getShipScanRange === 'function') {
            return this.rules.getShipScanRange(this.ship);
        }
        return 0;
    }

    getEstimatedEnemyStarAttackRange(enemyStar) {
        let maxDefenderSpeed = 0;
        for (const ship of enemyStar && enemyStar.ships ? enemyStar.ships : []) {
            if (!ship || ship.owner === this.ship.owner ||
                    ship.type === 'scout' ||
                    (ship.underConstruction && ship.underConstruction())) {
                continue;
            }
            if (this.getShipPower(ship) <= 0) {
                continue;
            }
            maxDefenderSpeed = Math.max(maxDefenderSpeed, this.getEntitySpeed(ship));
        }

        for (const fleet of this.game && this.game.allFleets ? this.game.allFleets : []) {
            if (!fleet || fleet.owner === this.ship.owner || (fleet.isEmpty && fleet.isEmpty())) {
                continue;
            }
            if (fleet.star !== enemyStar &&
                    (Math.round(fleet.x) !== Math.round(enemyStar.x) || Math.round(fleet.y) !== Math.round(enemyStar.y))) {
                continue;
            }
            if (fleet.calculateFleetStats) {
                fleet.calculateFleetStats();
            }
            if (this.getEntityDefenseStrength(fleet) <= 0) {
                continue;
            }
            maxDefenderSpeed = Math.max(maxDefenderSpeed, this.getEntitySpeed(fleet));
        }

        return EXPERT_SCOUT_STANDOFF_MIN_DISTANCE + (maxDefenderSpeed * EXPERT_SCOUT_STANDOFF_DEFENDER_SPEED_FACTOR);
    }

    getNearestStarDistance(fromStar, stars) {
        let nearestDistance = Infinity;
        for (const star of stars || []) {
            if (!star || star === fromStar) {
                continue;
            }
            nearestDistance = Math.min(nearestDistance, this.utils.calculateDistance(fromStar, star));
        }
        return nearestDistance;
    }

    getNeutralStarDefensePenalty(star) {
        if (!star || star.owner !== 0) {
            return 0;
        }
        const defense = this.rules && this.rules.getStarDefenseStrength ? this.rules.getStarDefenseStrength(star) : 0;
        return defense > 0 ? Math.min(260, defense / 8) : 0;
    }

    isFriendlyUnitAssignedToTarget(target, exclude = null) {
        if (!target || !this.game) {
            return false;
        }

        for (const ship of this.game.allShips || []) {
            if (!ship || ship === exclude || ship.owner !== this.ship.owner) {
                continue;
            }
            if (this.isSameScoutAssignmentTarget(ship.destination, target) ||
                    (ship.aiCampaignObjective && this.isSameScoutAssignmentTarget(ship.aiCampaignObjective.target, target))) {
                return true;
            }
        }

        for (const fleet of this.game.allFleets || []) {
            if (!fleet || fleet === exclude || fleet.owner !== this.ship.owner) {
                continue;
            }
            if (this.isSameScoutAssignmentTarget(fleet.destination, target) ||
                    (fleet.aiCampaignObjective && this.isSameScoutAssignmentTarget(fleet.aiCampaignObjective.target, target))) {
                return true;
            }
        }

        return false;
    }

    isSameScoutAssignmentTarget(left, right) {
        if (!left || !right) {
            return false;
        }
        if (left === right) {
            return true;
        }
        const leftScoutTarget = left.aiScoutTarget || left;
        const rightScoutTarget = right.aiScoutTarget || right;
        return !!(leftScoutTarget && rightScoutTarget && leftScoutTarget === rightScoutTarget);
    }

    findExpertStrategicEnemyStar(maxDistance = Infinity) {
        if (!this.game || !this.game.stars) {
            return null;
        }

        const attackerPower = this.getEntityDefenseStrength(this.ship);
        const speed = Math.max(1, this.getEntitySpeed(this.ship));
        let bestStar = null;
        let bestScore = -Infinity;

        for (const star of this.game.stars) {
            if (!star || star.owner === 0 || star.owner === this.ship.owner) {
                continue;
            }

            const distance = this.utils.calculateDistance(this.ship, star);
            if (distance > maxDistance) {
                continue;
            }

            const defenderPower = this.getEntityDefenseStrength(star);
            const powerEdge = attackerPower - defenderPower;
            const unprotectedBonus = this.utils.getShipsAtStar(star) === 0 ? 200 : 0;
            const lowPopulationBonus = Math.max(0, 1000 - (star.population || 0)) / 5;
            const techValue = (star.techLevel || 0) * 20;
            const travelPenalty = (distance / speed) * 12;
            const score = powerEdge + unprotectedBonus + lowPopulationBonus + techValue - travelPenalty;

            // Do not let this new expert pass pick obviously hopeless targets.
            if (powerEdge < -Math.max(100, attackerPower * 0.5) && unprotectedBonus <= 0) {
                continue;
            }

            if (score > bestScore) {
                bestScore = score;
                bestStar = star;
            }
        }

        return bestStar;
    }

    getExpertDefensiveRedeploymentDecision(v3Skill = this.getV3SkillLevel(), maxDistance = EXPERT_DEFENSE_REDEPLOY_SEARCH_DISTANCE) {
        if (!this.isExpertLevel(v3Skill)) {
            return null;
        }

        const target = this.findExpertDefensiveRedeploymentTarget(maxDistance);
        if (!target) {
            return null;
        }

        const decision = new AIDecision(AIActions.GO_TO_OWN_STAR, target, 95, 'Expert defensive redeployment');
        decision.objectiveKind = 'defendStar';
        return decision;
    }

    findExpertDefensiveRedeploymentTarget(maxDistance = EXPERT_DEFENSE_REDEPLOY_SEARCH_DISTANCE) {
        if (!this.isExpertLevel() || !this.canExpertRedeployForDefense() || !this.game || !this.game.stars) {
            return null;
        }

        const owner = this.ship.owner;
        const sourceStar = this.utils.getCurrentStar(this.ship);
        if (!sourceStar || sourceStar.owner !== owner) {
            return null;
        }

        const sourceAfterRedeploy = this.getExpertStarThreatScore(sourceStar, owner, this.ship);
        if (sourceAfterRedeploy.threat >= EXPERT_DEFENSE_SAFE_SOURCE_THRESHOLD) {
            return null;
        }

        const speed = Math.max(1, this.getEntitySpeed(this.ship));
        const redeployStrength = this.getEntityDefenseStrength(this.ship);
        let bestTarget = null;
        let bestScore = -Infinity;

        for (const star of this.utils.getPlayerStars(owner)) {
            if (!star || star === sourceStar) {
                continue;
            }

            const distance = this.utils.calculateDistance(this.ship, star);
            if (distance > maxDistance) {
                continue;
            }

            const threatInfo = this.getExpertStarThreatScore(star, owner, this.ship);
            if (threatInfo.threat < EXPERT_DEFENSE_REDEPLOY_THRESHOLD) {
                continue;
            }

            if (this.isFriendlyUnitAssignedToTarget(star, this.ship)) {
                continue;
            }

            const underDefendedBonus = Math.max(0, threatInfo.rawThreat - threatInfo.localDefense - threatInfo.inboundDefense);
            const valueBonus = Math.min(160, ((star.techLevel || 0) * 18) + Math.min(80, (star.population || 0) / 30));
            const travelPenalty = (distance / speed) * 10;
            const score = threatInfo.threat + underDefendedBonus + (redeployStrength * 0.25) + valueBonus - travelPenalty;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = star;
            }
        }

        return bestTarget;
    }

    canExpertRedeployForDefense() {
        if (this.hasDestination(this.ship) || this.utils.isEntityDamaged(this.ship)) {
            return false;
        }

        if (!this.utils.isAtStar(this.ship)) {
            return false;
        }

        if (this.getShipType() !== 'battleship') {
            return false;
        }

        return this.getEntityDefenseStrength(this.ship) > 0;
    }

    getExpertStarThreatScore(star, owner = this.ship.owner, excludeFriendly = null) {
        const enemyMobileThreat = this.getEnemyMobileThreatNearStar(star, owner);
        const enemyStarThreat = this.getEnemyStarThreatNearStar(star, owner);
        const rawThreat = enemyMobileThreat + enemyStarThreat;
        const localDefense = this.getFriendlyDefenseStrengthAtStar(star, owner, excludeFriendly);
        const inboundDefense = this.getInboundFriendlyDefenseStrength(star, owner, excludeFriendly);
        const threat = Math.max(0, rawThreat - (localDefense * 0.45) - (inboundDefense * 0.80));

        return {
            threat,
            rawThreat,
            localDefense,
            inboundDefense
        };
    }

    getEnemyMobileThreatNearStar(star, owner) {
        let threat = 0;
        for (const enemy of this.getEnemyMobileCombatants(owner)) {
            const distance = this.utils.calculateDistance(star, enemy);
            if (distance > EXPERT_DEFENSE_THREAT_RADIUS) {
                continue;
            }

            const closeness = 1 + ((EXPERT_DEFENSE_THREAT_RADIUS - distance) / EXPERT_DEFENSE_THREAT_RADIUS);
            threat += (this.getEntityDefenseStrength(enemy) * closeness) + 35;
        }
        return threat;
    }

    getEnemyMobileCombatants(owner) {
        const enemies = [];
        for (const ship of this.game.allShips || []) {
            if (!ship || ship.owner === 0 || ship.owner === owner ||
                    (ship.underConstruction && ship.underConstruction()) ||
                    ship.type === 'scout' ||
                    (ship.isInFleet && ship.isInFleet())) {
                continue;
            }
            enemies.push(ship);
        }

        for (const fleet of this.game.allFleets || []) {
            if (!fleet || fleet.owner === 0 || fleet.owner === owner ||
                    (fleet.isEmpty && fleet.isEmpty())) {
                continue;
            }
            if (fleet.calculateFleetStats) {
                fleet.calculateFleetStats();
            }
            if (this.getEntityDefenseStrength(fleet) > 0) {
                enemies.push(fleet);
            }
        }

        return enemies;
    }

    getEnemyStarThreatNearStar(star, owner) {
        let threat = 0;
        for (const enemyStar of this.utils.getEnemyStars(owner)) {
            const distance = this.utils.calculateDistance(star, enemyStar);
            if (distance > EXPERT_DEFENSE_ENEMY_STAR_RADIUS) {
                continue;
            }

            const closeness = 1 + ((EXPERT_DEFENSE_ENEMY_STAR_RADIUS - distance) / EXPERT_DEFENSE_ENEMY_STAR_RADIUS);
            const starPower = this.rules && this.rules.getStarDefenseStrength ?
                this.rules.getStarDefenseStrength(enemyStar) :
                this.getEntityDefenseStrength(enemyStar);
            threat += ((starPower * 0.25) + ((enemyStar.techLevel || 0) * 20)) * closeness;
        }
        return threat;
    }

    getFriendlyDefenseStrengthAtStar(star, owner, excludeFriendly = null) {
        let strength = this.rules && this.rules.getStarDefenseStrength ?
            this.rules.getStarDefenseStrength(star) :
            this.getEntityDefenseStrength(star);

        for (const satellite of star.defenseSatellites || []) {
            if (satellite && satellite !== excludeFriendly && satellite.owner === owner) {
                strength += this.getEntityDefenseStrength(satellite);
            }
        }

        for (const ship of star.ships || []) {
            if (!ship || ship === excludeFriendly || ship.owner !== owner ||
                    (ship.underConstruction && ship.underConstruction()) ||
                    (ship.isInFleet && ship.isInFleet()) ||
                    ship.destination) {
                continue;
            }
            strength += this.getEntityDefenseStrength(ship);
        }

        for (const fleet of this.game.allFleets || []) {
            if (!fleet || fleet === excludeFriendly || fleet.owner !== owner ||
                    fleet.destination ||
                    (fleet.isEmpty && fleet.isEmpty())) {
                continue;
            }
            if (fleet.star === star ||
                    (Math.round(fleet.x) === Math.round(star.x) && Math.round(fleet.y) === Math.round(star.y))) {
                if (fleet.calculateFleetStats) {
                    fleet.calculateFleetStats();
                }
                strength += this.getEntityDefenseStrength(fleet);
            }
        }

        return strength;
    }

    getInboundFriendlyDefenseStrength(star, owner, excludeFriendly = null) {
        let strength = 0;

        for (const ship of this.game.allShips || []) {
            if (!ship || ship === excludeFriendly || ship.owner !== owner ||
                    ship.destination !== star ||
                    (ship.underConstruction && ship.underConstruction()) ||
                    (ship.isInFleet && ship.isInFleet())) {
                continue;
            }
            strength += this.getEntityDefenseStrength(ship);
        }

        for (const fleet of this.game.allFleets || []) {
            if (!fleet || fleet === excludeFriendly || fleet.owner !== owner ||
                    fleet.destination !== star ||
                    (fleet.isEmpty && fleet.isEmpty())) {
                continue;
            }
            if (fleet.calculateFleetStats) {
                fleet.calculateFleetStats();
            }
            strength += this.getEntityDefenseStrength(fleet);
        }

        return strength;
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
        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);
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
        if (capabilitySkill <= 3 && this.ship.type === 'colony') {
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
        const capabilitySkill = this.getCapabilitySkillLevel(v3Skill);

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

        if (this.isFleetEntity() && capabilitySkill <= 2 && this.getShipPower(this.ship) > this.getShipPower(enemyShip) * 2) {
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
