// Star AI Management for Galactica-4
// Implements AI decision making for star economic management and ship building

const { AIBase, AIDecision, AIActions } = require('./ai-base.js');
const { AISkillManager, AI_SKILL_LEVELS } = require('./ai-skill.js');
const AIUtils = require('./ai-utils.js');
const Common = require('./common.js');

class StarAI extends AIBase {
    constructor(star, game, rules, skillLevel = AI_SKILL_LEVELS.AVERAGE) {
        super(star, game, rules);
        this.star = star;
        this.skillManager = new AISkillManager(skillLevel);
        this.utils = new AIUtils(game, rules);
    }

    // Main AI decision making method for stars
    makeDecision() {
        this.debugLog(`Making AI decision for star ${this.star.name}`);

        // Don't make decisions for unowned stars
        if (this.star.owner === 0) {
            this.debugLog('Star is unowned, no AI decisions');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Star is unowned');
        }

        // Manage economy and resource allocation
        this.manageEconomy();

        // Decide on ship building
        const shipBuildingDecision = this.decideShipBuilding();
        
        // Decide on defensive actions
        const defenseDecision = this.decideDefensiveActions();

        // Return the most important decision (for now, ship building takes priority)
        return shipBuildingDecision;
    }

    // Manage economic allocation between growth, research, and shipbuilding
    manageEconomy() {
        this.debugLog(`Managing economy for star ${this.star.name}`);

        if (this.applyV3EconomicRole()) {
            return;
        }

        this.applyEconomicAllocation({ growth: 34, shipbuilding: 33, research: 33 });
    }

    getPlayerInfo() {
        return this.game && this.game.players ? this.game.players[this.star.owner] : null;
    }

    getV3SkillLevel() {
        const player = this.getPlayerInfo();
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

    isTechStar() {
        return this.star.research && this.star.research.desired > 40;
    }

    applyV3EconomicRole() {
        const v3Skill = this.getV3SkillLevel();
        const player = this.getPlayerInfo();

        if (v3Skill !== 1 || !player) {
            return false;
        }

        if (this.isTechStar()) {
            this.applyEconomicAllocation({ growth: 49.4, shipbuilding: 1.2, research: 49.4 });
            if (!player.hasTechStar) {
                player.setTechStar(this.star.id);
            }
            return true;
        }

        if ((this.game.turn > 100 || (this.game.turn % 6) === 0) && this.shouldBecomeTechStar(player)) {
            this.applyEconomicAllocation({ growth: 49.4, shipbuilding: 1.2, research: 49.4 });
            player.setTechStar(this.star.id);
            return true;
        }

        if (player.hasTechStar) {
            this.applyEconomicAllocation({ growth: 50, shipbuilding: 50, research: 0 });
            return true;
        }

        return false;
    }

    shouldBecomeTechStar(player) {
        const highestTech = player.hiStarTech || this.getHighestOwnedStarTech();
        if (this.star.techLevel < highestTech) {
            return false;
        }

        const nearby = this.utils.findClosestStars(this.star, 222222);
        if (nearby.nearestEnemyStar) {
            return false;
        }

        const nearestOwnedStar = this.findNearestOtherOwnedStar(222222);
        if (!nearestOwnedStar) {
            return false;
        }

        return !(nearestOwnedStar.research && nearestOwnedStar.research.desired > 40);
    }

    findNearestOtherOwnedStar(maxDistance) {
        let nearest = null;
        let nearestDistance = maxDistance;
        for (const star of this.utils.getPlayerStars(this.star.owner)) {
            if (star === this.star) {
                continue;
            }
            const distance = this.utils.calculateDistance(this.star, star);
            if (distance <= nearestDistance) {
                nearest = star;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    getHighestOwnedStarTech() {
        let highest = 0;
        for (const star of this.utils.getPlayerStars(this.star.owner)) {
            highest = Math.max(highest, star.techLevel || 0);
        }
        return highest;
    }

    // Assess the threat level to this star
    assessThreatLevel() {
        let threatLevel = 0;

        // Check for nearby enemy ships
        const nearbyEnemies = this.utils.getEntitiesInRange(this.star, this.utils.getEnemyEntities(this.star.owner), 100000);
        threatLevel += nearbyEnemies.length * 10;

        // Check for nearby enemy stars
        const nearbyEnemyStars = this.utils.getEntitiesInRange(this.star, 
            this.game.stars.filter(star => star.owner !== 0 && star.owner !== this.star.owner), 
            150000);
        threatLevel += nearbyEnemyStars.length * 5;

        // Check relative strength compared to nearby enemies
        const ourStrength = this.utils.getEntityStrength(this.star);
        for (const enemy of nearbyEnemies) {
            const enemyStrength = this.utils.getEntityStrength(enemy.entity);
            if (enemyStrength > ourStrength) {
                threatLevel += 20;
            }
        }

        return Math.min(threatLevel, 100); // Cap at 100
    }

    // Calculate economic priorities based on threat and development
    calculateEconomicPriorities(threatLevel) {
        const priorities = {
            growth: 40,      // Base growth allocation
            research: 30,    // Base research allocation  
            shipbuilding: 30 // Base shipbuilding allocation
        };

        const skillModifiers = this.skillManager.getSkillModifiers();

        // Adjust based on threat level
        if (threatLevel > 60) {
            // High threat: focus on defense and shipbuilding
            priorities.shipbuilding = Math.min(priorities.shipbuilding + 20, 60);
            priorities.growth = Math.max(priorities.growth - 10, 20);
            priorities.research = Math.max(priorities.research - 10, 10);
        } else if (threatLevel < 20) {
            // Low threat: focus on growth and research
            priorities.growth = Math.min(priorities.growth + 15, 60);
            priorities.research = Math.min(priorities.research + 10, 50);
            priorities.shipbuilding = Math.max(priorities.shipbuilding - 15, 10);
        }

        // Adjust based on current development level
        if (this.star.techLevel < 3) {
            // Early game: prioritize growth and research
            priorities.growth = Math.min(priorities.growth + 10, 60);
            priorities.research = Math.min(priorities.research + 10, 50);
            priorities.shipbuilding = Math.max(priorities.shipbuilding - 10, 15);
        } else if (this.star.techLevel > 8) {
            // Late game: can focus more on shipbuilding
            priorities.shipbuilding = Math.min(priorities.shipbuilding + 10, 50);
            priorities.growth = Math.max(priorities.growth - 5, 25);
        }

        // Apply skill modifiers
        priorities.growth *= skillModifiers.economy;
        priorities.research *= skillModifiers.economy;
        priorities.shipbuilding *= skillModifiers.coordination;

        // Normalize to ensure they add up to approximately 100
        const total = priorities.growth + priorities.research + priorities.shipbuilding;
        const factor = 100 / total;
        
        priorities.growth = Math.round(priorities.growth * factor);
        priorities.research = Math.round(priorities.research * factor);
        priorities.shipbuilding = Math.round(priorities.shipbuilding * factor);

        this.debugLog(`Economic priorities: Growth ${priorities.growth}%, Research ${priorities.research}%, Shipbuilding ${priorities.shipbuilding}%`);
        
        return priorities;
    }

    // Apply economic allocation to star settings
    applyEconomicAllocation(priorities) {
        const normalized = this.normalizeAllocation(priorities);
        this.debugLog(`Applying economic allocation: Growth ${normalized.growth}%, Research ${normalized.research}%, Shipbuilding ${normalized.shipbuilding}%`);

        if (this.star.growth && this.star.growth.setDesired) {
            this.star.growth.setDesired(normalized.growth);
        }
        if (this.star.shipBuilding && this.star.shipBuilding.setDesired) {
            this.star.shipBuilding.setDesired(normalized.shipbuilding);
        }
        if (this.star.research && this.star.research.setDesired) {
            this.star.research.setDesired(normalized.research);
        }

        return normalized;
    }

    normalizeAllocation(priorities) {
        const growth = Math.max(0, Number(priorities.growth) || 0);
        const shipbuilding = Math.max(0, Number(priorities.shipbuilding) || 0);
        const research = Math.max(0, Number(priorities.research) || 0);
        const total = growth + shipbuilding + research;

        if (total <= 0) {
            return { growth: 34, shipbuilding: 33, research: 33 };
        }

        const normalizedGrowth = Math.round((growth / total) * 1000) / 10;
        const normalizedShipbuilding = Math.round((shipbuilding / total) * 1000) / 10;
        const normalizedResearch = Math.round((100 - normalizedGrowth - normalizedShipbuilding) * 10) / 10;

        return {
            growth: normalizedGrowth,
            shipbuilding: normalizedShipbuilding,
            research: normalizedResearch
        };
    }

    // Decide what ships to build
    decideShipBuilding() {
        this.debugLog(`Deciding ship building for star ${this.star.name}`);

        if (this.star.currentShip) {
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Ship already under construction');
        }

        // Check if we can afford to build ships
        if (!this.canAffordShipBuilding()) {
            this.debugLog('Cannot afford ship building');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Cannot afford ships');
        }

        // v3 chooses the next computer hull from a weighted random table.
        // Expert tech stars are the one exception: they alternate satellites
        // and scouts.
        const shipToBuild = this.chooseShipToBuild();
        
        if (shipToBuild) {
            this.debugLog(`Decided to build ${shipToBuild.type} ship`);
            return new AIDecision(AIActions.BUILD_SHIP, shipToBuild, 50, `Build ${shipToBuild.type} ship`);
        }

        return new AIDecision(AIActions.DO_NOTHING, null, 0, 'No ships needed');
    }

    // Check if star can afford ship building
    canAffordShipBuilding() {
        // This would need to be implemented based on the economic system
        // For now, assume we can always afford ships
        return true;
    }

    // Assess what ships are needed
    assessShipNeeds() {
        const needs = {
            scouts: 0,
            colonies: 0,
            battleships: 0,
            defense: 0
        };

        // Count existing ships at this star
        const shipsAtStar = this.utils.getShipsAtStar(this.star);
        
        // Count existing ships of each type owned by this player
        const playerShips = this.utils.getPlayerShips(this.star.owner);
        const shipCounts = {
            scouts: 0,
            colonies: 0,
            battleships: 0,
            defense: 0
        };

        for (const ship of playerShips) {
            switch (ship.type) {
                case 'scout':
                    shipCounts.scouts++;
                    break;
                case 'colony':
                    shipCounts.colonies++;
                    break;
                case 'battleship':
                case 'defense':
                    shipCounts.battleships++;
                    break;
            }
        }

        // Assess needs based on strategic situation
        const threatLevel = this.assessThreatLevel();
        const unownedStars = this.utils.getUnownedEntities();
        const enemyShips = this.utils.getEnemyEntities().filter(e => this.utils.game.getObjectType(e) === Common.ObjectType.SHIP);

        // Scout needs: exploration and tech transfer
        if (shipCounts.scouts < 2 && unownedStars.length > 0) {
            needs.scouts = Math.max(1, Math.ceil(unownedStars.length / 3));
        }

        // Colony needs: expansion
        if (shipCounts.colonies < 1 && unownedStars.length > 0) {
            needs.colonies = Math.min(2, unownedStars.length);
        }

        // Battleship needs: defense and offense
        if (threatLevel > 30 || enemyShips.length > 0) {
            needs.battleships = Math.max(1, Math.ceil(enemyShips.length / 2));
        }

        // Defense needs: star protection
        if (threatLevel > 50) {
            needs.defense = Math.max(1, Math.ceil(threatLevel / 50));
        }

        // Adjust needs based on skill level
        const skillModifiers = this.skillManager.getSkillModifiers();
        needs.scouts = Math.round(needs.scouts * skillModifiers.exploration);
        needs.colonies = Math.round(needs.colonies * skillModifiers.economy);
        needs.battleships = Math.round(needs.battleships * skillModifiers.aggression);
        needs.defense = Math.round(needs.defense * skillModifiers.defense);

        this.debugLog(`Ship needs: Scouts ${needs.scouts}, Colonies ${needs.colonies}, Battleships ${needs.battleships}, Defense ${needs.defense}`);
        
        return needs;
    }

    // Choose which ship to build based on needs
    chooseShipToBuild() {
        if (this.isTechStar()) {
            return { type: this.chooseNextTechStarHull(), priority: 90 };
        }

        return { type: this.chooseV3ComputerHull(), priority: 70 };
    }

    chooseNextTechStarHull() {
        const nextType = this.star.aiNextTechStarBuildType || 'defense';
        this.star.aiNextTechStarBuildType = nextType === 'defense' ? 'scout' : 'defense';
        return nextType;
    }

    chooseV3ComputerHull() {
        let hullType;
        const roll = this.utils.randomInt(5);

        if (roll === 0) {
            hullType = 'defense';
        } else if (roll === 1) {
            hullType = this.utils.randomInt(20) <= 10 ? 'defense' : 'scout';
        } else if (roll === 2) {
            hullType = 'colony';
        } else {
            hullType = 'battleship';
        }

        if (this.game.turn > 50 && (hullType === 'scout' || hullType === 'colony')) {
            const threshold = Math.floor(this.game.turn / 25);
            if (this.utils.randomInt(20) <= threshold) {
                hullType = 'battleship';
            }
        }

        return hullType;
    }

    // Decide on defensive actions
    decideDefensiveActions() {
        const threatLevel = this.assessThreatLevel();
        
        if (threatLevel > 70) {
            this.debugLog(`High threat level (${threatLevel}), taking defensive actions`);
            // This could include building defensive ships, calling for reinforcements, etc.
            return new AIDecision(AIActions.DEFEND_STAR, this.star, threatLevel, 'High threat detected');
        }

        return new AIDecision(AIActions.DO_NOTHING, null, 0, 'No defensive actions needed');
    }

    // Execute the AI decision
    executeDecision(decision) {
        this.debugLog(`Executing star decision: ${decision.action}`);

        switch (decision.action) {
            case AIActions.BUILD_SHIP:
                if (decision.target) {
                    this.startBuildingShip(decision.target.type);
                }
                break;
            case AIActions.DEFEND_STAR:
                this.activateDefenses();
                break;
            case AIActions.DO_NOTHING:
            default:
                // Do nothing
                break;
        }
    }

    // Start building a ship
    startBuildingShip(shipType) {
        this.debugLog(`Starting to build ${shipType} ship`);
        
        // Call the star's ship building method
        if (this.star && this.star.startBuildingShip) {
            this.star.startBuildingShip(shipType);
            console.log(`      [AI] ${this.star.name} started building ${shipType}`);
        } else {
            console.log(`      [AI] WARNING: Cannot build ship - star.startBuildingShip not available`);
        }
    }

    // Activate defensive measures
    activateDefenses() {
        this.debugLog('Activating defensive measures');

        if (!this.star.currentShip) {
            this.startBuildingShip('defense');
        }

        for (const ship of this.utils.getShipsAtStarList(this.star)) {
            if (ship.owner === this.star.owner && ship.type !== 'scout' && !ship.destination && ship.setPatrol) {
                ship.setPatrol(ship.damage <= 0);
            }
        }
    }

    // Get the star's current economic status
    getEconomicStatus() {
        return {
            population: this.star.population,
            techLevel: this.star.techLevel,
            canBuild: this.canAffordShipBuilding(),
            threatLevel: this.assessThreatLevel()
        };
    }

    // Update AI behavior based on game state changes
    updateAI() {
        // This method could be called when the game state changes
        // to update AI priorities and decisions
        this.debugLog('Updating AI state');
    }
}

// AI Actions specific to stars
const StarAIActions = {
    ...AIActions,
    BUILD_SHIP: 'buildShip',
    DEFEND_STAR: 'defendStar',
    MANAGE_ECONOMY: 'manageEconomy'
};

module.exports = {
    StarAI,
    StarAIActions
};
