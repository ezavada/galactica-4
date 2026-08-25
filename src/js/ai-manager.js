// AI Manager for Galactica-4
// Central coordinator for all AI systems, manages AI players and their decisions

const ShipAI = require('./ai-ship.js');
const { StarAI } = require('./ai-star.js');
const { AISkillManager, AI_SKILL_LEVELS } = require('./ai-skill.js');
const { AIActions } = require('./ai-base.js');
const Common = require('./common.js');

function randomInt(max) {
    if (!max || max <= 0) {
        return 0;
    }
    if (typeof pdg !== 'undefined' && pdg && typeof pdg.rand === 'function') {
        return pdg.rand() % max;
    }
    return 0;
}

class AIManager {
    constructor(game, rules) {
        this.game = game;
        this.rules = rules;
        this.aiPlayers = new Map(); // Map of playerId -> AIPlayer
        this.debugAI = false;
    }

    // Initialize AI for a player
    initializeAIPlayer(playerId, skillLevel = AI_SKILL_LEVELS.AVERAGE) {
        this.debugLog(`Initializing AI for player ${playerId} with skill level ${skillLevel}`);
        
        const aiPlayer = new AIPlayer(playerId, this.game, this.rules, skillLevel);
        this.aiPlayers.set(playerId, aiPlayer);
        
        return aiPlayer;
    }

    // Remove AI for a player (when they disconnect or are eliminated)
    removeAIPlayer(playerId) {
        this.debugLog(`Removing AI for player ${playerId}`);
        this.aiPlayers.delete(playerId);
    }

    // Check if a player is AI-controlled
    isAIPlayer(playerId) {
        return this.aiPlayers.has(playerId);
    }

    // Get AI player object
    getAIPlayer(playerId) {
        return this.aiPlayers.get(playerId);
    }

    // Process AI turns for all AI players
    processAITurns() {
        this.debugLog('Processing AI turns for all AI players');
        
        for (const [playerId, aiPlayer] of this.aiPlayers) {
            try {
                this.processAITurn(aiPlayer);
            } catch (error) {
                console.error(`Error processing AI turn for player ${playerId}:`, error);
            }
        }
    }

    // Process AI turn for a specific player
    processAITurn(aiPlayer) {
        this.debugLog(`Processing AI turn for player ${aiPlayer.playerId}`);
        
        const playerName = this.game.players[aiPlayer.playerId]?.name || `Player ${aiPlayer.playerId}`;
        console.log(`\n=== AI Turn for ${playerName} ===`);
        
        // Process star AI decisions
        aiPlayer.processStarDecisions();
        
        // Process ship AI decisions
        aiPlayer.processShipDecisions();

        // Process fleet AI decisions after individual ships have had a chance to form fleets.
        aiPlayer.processFleetDecisions();
        
        console.log(`=== End AI Turn for ${playerName} ===\n`);
    }

    // Enable/disable AI debugging
    setDebugMode(enabled) {
        this.debugAI = enabled;
        this.debugLog('AI debug mode ' + (enabled ? 'enabled' : 'disabled'));
    }

    // Debug logging
    debugLog(message) {
        if (this.debugAI) {
            console.log(`[AI Manager] ${message}`);
        }
    }

    // Get statistics about AI players
    getAIStatistics() {
        const stats = {
            totalAIPlayers: this.aiPlayers.size,
            playersBySkill: {},
            totalAIShips: 0,
            totalAIStars: 0
        };

        for (const [playerId, aiPlayer] of this.aiPlayers) {
            const skillName = aiPlayer.skillManager.getSkillName();
            stats.playersBySkill[skillName] = (stats.playersBySkill[skillName] || 0) + 1;
            
            stats.totalAIShips += aiPlayer.getShipCount();
            stats.totalAIStars += aiPlayer.getStarCount();
        }

        return stats;
    }

    // Create a random AI player with random skill level
    createRandomAIPlayer(playerId) {
        const skillLevel = randomInt(3); // 0, 1, or 2
        return this.initializeAIPlayer(playerId, skillLevel);
    }

    // Set AI skill level for a player
    setAISkillLevel(playerId, skillLevel) {
        const aiPlayer = this.aiPlayers.get(playerId);
        if (aiPlayer) {
            aiPlayer.skillManager.setSkillLevel(skillLevel);
            this.debugLog(`Set AI skill level for player ${playerId} to ${skillLevel}`);
        }
    }

    // Get all AI player IDs
    getAIPlayerIds() {
        return Array.from(this.aiPlayers.keys());
    }
}

class AIPlayer {
    constructor(playerId, game, rules, skillLevel = AI_SKILL_LEVELS.AVERAGE) {
        this.playerId = playerId;
        this.game = game;
        this.rules = rules;
        this.skillManager = new AISkillManager(skillLevel);
        this.shipAIs = new Map(); // Map of shipId -> ShipAI
        this.starAIs = new Map(); // Map of starId -> StarAI
        this.debugAI = false;
    }

    // Process all star AI decisions
    processStarDecisions() {
        this.debugLog(`Processing star decisions for player ${this.playerId}`);
        
        const playerStars = this.getPlayerStars();
        
        for (const star of playerStars) {
            try {
                this.processStarDecision(star);
            } catch (error) {
                console.error(`Error processing AI decision for star ${star.name}:`, error);
            }
        }
    }

    // Process AI decision for a specific star
    processStarDecision(star) {
        let starAI = this.starAIs.get(star.id);
        if (!starAI) {
            starAI = new StarAI(star, this.game, this.rules, this.skillManager.getSkillLevel());
            this.starAIs.set(star.id, starAI);
        }

        const decision = starAI.makeDecision();
        console.log(`  Star ${star.name}: ${decision.action} - ${decision.reason}`);
        
        if (decision.action !== AIActions.DO_NOTHING) {
            starAI.executeDecision(decision);
            this.debugLog(`Star ${star.name} executed decision: ${decision.action}`);
        }
    }

    // Process all ship AI decisions
    processShipDecisions() {
        this.debugLog(`Processing ship decisions for player ${this.playerId}`);
        
        const playerShips = this.getPlayerShips();
        
        for (const ship of playerShips) {
            try {
                this.processShipDecision(ship);
            } catch (error) {
                console.error(`Error processing AI decision for ship ${ship.type}:`, error);
            }
        }
    }

    // Process AI decision for a specific ship
    processShipDecision(ship) {
        let shipAI = this.shipAIs.get(ship.id);
        if (!shipAI) {
            shipAI = new ShipAI(ship, this.game, this.rules, this.skillManager.getSkillLevel());
            this.shipAIs.set(ship.id, shipAI);
        }

        const decision = shipAI.makeDecision();
        
        // Log ship decision with location info
        const location = ship.star ? `at ${ship.star.name}` : `at (${Math.round(ship.x/1024)}, ${Math.round(ship.y/1024)})`;
        const status = ship.underConstruction() ? `[${ship.progress}% built]` : '';
        console.log(`  Ship ${ship.type} ${location} ${status}: ${decision.action} - ${decision.reason}`);
        
        if (decision.action !== AIActions.DO_NOTHING) {
            shipAI.executeDecision(decision);
            if (decision.target) {
                const targetName = decision.target.name || `(${Math.round(decision.target.x/1024)}, ${Math.round(decision.target.y/1024)})`;
                console.log(`    -> Going to ${targetName}`);
            }
            this.debugLog(`Ship ${ship.type} executed decision: ${decision.action}`);
        }
    }

    processFleetDecisions() {
        this.debugLog(`Processing fleet decisions for player ${this.playerId}`);

        for (const fleet of this.getPlayerFleets()) {
            try {
                this.processFleetDecision(fleet);
            } catch (error) {
                console.error(`Error processing AI decision for fleet ${fleet.id}:`, error);
            }
        }
    }

    processFleetDecision(fleet) {
        if (!fleet || (fleet.isEmpty && fleet.isEmpty())) {
            return;
        }

        const fleetAI = new ShipAI(fleet, this.game, this.rules, this.skillManager.getSkillLevel());
        const decision = fleetAI.makeDecision();
        const location = fleet.star ? `at ${fleet.star.name}` : `at (${Math.round(fleet.x/1024)}, ${Math.round(fleet.y/1024)})`;
        console.log(`  Fleet ${fleet.id} ${location} [${fleet.getSize()} ships]: ${decision.action} - ${decision.reason}`);

        if (decision.action !== AIActions.DO_NOTHING) {
            fleetAI.executeDecision(decision);
            if (decision.target) {
                const targetName = decision.target.name || `(${Math.round(decision.target.x/1024)}, ${Math.round(decision.target.y/1024)})`;
                console.log(`    -> Fleet going to ${targetName}`);
            }
        }
    }

    // Get all stars owned by this AI player
    getPlayerStars() {
        return this.game.stars.filter(star => star.owner === this.playerId);
    }

    // Get all ships owned by this AI player
    getPlayerShips() {
        return this.game.allShips.filter(ship => ship.owner === this.playerId);
    }

    getPlayerFleets() {
        return this.game.allFleets.filter(fleet => fleet.owner === this.playerId);
    }

    // Get count of ships owned by this AI player
    getShipCount() {
        return this.getPlayerShips().length;
    }

    // Get count of stars owned by this AI player
    getStarCount() {
        return this.getPlayerStars().length;
    }

    // Remove AI for a ship (when ship is destroyed)
    removeShipAI(shipId) {
        this.shipAIs.delete(shipId);
    }

    // Remove AI for a star (when star is lost)
    removeStarAI(starId) {
        this.starAIs.delete(starId);
    }

    // Update AI state when entities are added/removed
    updateAIState() {
        // Remove AI for entities that no longer exist
        const currentShipIds = new Set(this.getPlayerShips().map(ship => ship.id));
        const currentStarIds = new Set(this.getPlayerStars().map(star => star.id));

        // Remove ship AIs for ships that no longer exist
        for (const shipId of this.shipAIs.keys()) {
            if (!currentShipIds.has(shipId)) {
                this.removeShipAI(shipId);
            }
        }

        // Remove star AIs for stars that no longer exist
        for (const starId of this.starAIs.keys()) {
            if (!currentStarIds.has(starId)) {
                this.removeStarAI(starId);
            }
        }
    }

    // Debug logging
    debugLog(message) {
        if (this.debugAI) {
            console.log(`[AI Player ${this.playerId}] ${message}`);
        }
    }

    // Get AI player statistics
    getStatistics() {
        return {
            playerId: this.playerId,
            skillLevel: this.skillManager.getSkillLevel(),
            skillName: this.skillManager.getSkillName(),
            shipCount: this.getShipCount(),
            starCount: this.getStarCount(),
            activeShipAIs: this.shipAIs.size,
            activeStarAIs: this.starAIs.size,
            fleetCount: this.getPlayerFleets().length
        };
    }
}

// Factory functions for creating AI players with specific configurations
class AIFactory {
    static createEasyAIPlayer(playerId, game, rules) {
        return new AIPlayer(playerId, game, rules, AI_SKILL_LEVELS.AVERAGE);
    }

    static createNormalAIPlayer(playerId, game, rules) {
        return new AIPlayer(playerId, game, rules, AI_SKILL_LEVELS.GOOD);
    }

    static createHardAIPlayer(playerId, game, rules) {
        return new AIPlayer(playerId, game, rules, AI_SKILL_LEVELS.EXPERT);
    }

    static createRandomAIPlayer(playerId, game, rules) {
        const skillLevel = randomInt(3);
        return new AIPlayer(playerId, game, rules, skillLevel);
    }
}

module.exports = {
    AIManager,
    AIPlayer,
    AIFactory
};
