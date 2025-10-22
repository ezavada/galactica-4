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

        // Get current threat level
        const threatLevel = this.assessThreatLevel();
        
        // Get current economic priorities based on threat and development
        const priorities = this.calculateEconomicPriorities(threatLevel);

        // Apply economic allocation
        this.applyEconomicAllocation(priorities);
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
        // This would need to be implemented based on how star economic settings work
        // For now, just log the allocation
        this.debugLog(`Applying economic allocation: Growth ${priorities.growth}%, Research ${priorities.research}%, Shipbuilding ${priorities.shipbuilding}%`);
        
        // In the actual implementation, this would modify the star's economic settings
        // this.star.setEconomicAllocation(priorities);
    }

    // Decide what ships to build
    decideShipBuilding() {
        this.debugLog(`Deciding ship building for star ${this.star.name}`);

        // Check if we can afford to build ships
        if (!this.canAffordShipBuilding()) {
            this.debugLog('Cannot afford ship building');
            return new AIDecision(AIActions.DO_NOTHING, null, 0, 'Cannot afford ships');
        }

        // Assess what ships we need
        const shipNeeds = this.assessShipNeeds();
        
        // Choose the most important ship to build
        const shipToBuild = this.chooseShipToBuild(shipNeeds);
        
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
    chooseShipToBuild(needs) {
        // Priority order based on threat and strategic situation
        const priorities = [];

        // High threat: prioritize defense
        const threatLevel = this.assessThreatLevel();
        if (threatLevel > 60) {
            if (needs.defense > 0) priorities.push({ type: 'defense', priority: 100 });
            if (needs.battleships > 0) priorities.push({ type: 'battleship', priority: 80 });
        } else {
            // Low threat: prioritize expansion and exploration
            if (needs.colonies > 0) priorities.push({ type: 'colony', priority: 90 });
            if (needs.scouts > 0) priorities.push({ type: 'scout', priority: 70 });
            if (needs.battleships > 0) priorities.push({ type: 'battleship', priority: 60 });
        }

        // Sort by priority
        priorities.sort((a, b) => b.priority - a.priority);

        // Return the highest priority ship type
        return priorities.length > 0 ? priorities[0] : null;
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
        
        // This could include building defensive ships, setting up patrols, etc.
        // For now, just log the action
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
