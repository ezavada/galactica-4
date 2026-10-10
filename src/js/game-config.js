// Game Configuration for Galactica-4
// Defines game setup options matching original C++ NewGameInfoT structure

const I18n = require('./i18n.js');
const PlayerName=require('./player-name.js');

class GameConfig {
    constructor(options = {}) {
        // Game title
        this.gameTitle = options.gameTitle || I18n.getString(500, "Galactica Game");
        
        this.humanPlayerNames = options.humanPlayerNames ? {...options.humanPlayerNames} : {};

        // Player configuration
        this.numHumans = options.numHumans !== undefined ? options.numHumans : 1;
        this.numComputers = options.numComputers !== undefined ? options.numComputers : 1;
        this.totalPlayers = this.numHumans + this.numComputers;
        
        // Map configuration
        this.density = options.density !== undefined ? options.density : 1; // v3 stellar density: integer 1–10
        this.sectorSize = options.sectorSize !== undefined ? options.sectorSize : 1; // v3 sector size: integer 1–5
        
        // AI configuration
        this.compSkill = options.compSkill !== undefined ? options.compSkill : 2;         // 1=Expert, 2=Good, 3=Average, 4=Passable, 5=Novice
        this.compAdvantage = options.compAdvantage !== undefined ? options.compAdvantage : 0; // v3 range: -3 through +3, 20% production modifier per level
        this.aiSkillByPlayer = options.aiSkillByPlayer ? { ...options.aiSkillByPlayer } : {};
        
        // Game speed and mechanics
        this.fastGame = options.fastGame !== undefined ? options.fastGame : false;  // Affects production/speed
        this.omniscient = options.omniscient !== undefined ? options.omniscient : false; // Full map visibility
        this.endEarly = options.endEarly !== undefined ? options.endEarly : true; // End turn when all posted
        
        // Time limits (0 = unlimited)
        this.maxTimePerTurn = options.maxTimePerTurn || 0; // seconds per turn (multiplayer)
        
        // Hosting (for multiplayer)
        this.hosting = options.hosting !== undefined ? options.hosting : false;

        // Test/harness option for constructing a Game without procedural map setup.
        this.skipMapGeneration = options.skipMapGeneration !== undefined ? options.skipMapGeneration : false;

        // Local autoplay/test harness settings
        this.autoplay = {
            enabled: false,
            seed: null,
            turnDelayMs: 250,
            maxTurns: 250,
            eventPresentationMs: 1000,
            showEventWindows: false,
            ...(options.autoplay || {})
        };
    }
    
    // Create default single-player game config
    static createSinglePlayer(numComputers = 1, difficulty = 2) {
        return new GameConfig({
            numHumans: 1,
            numComputers: numComputers,
            compSkill: difficulty,
            fastGame: false,
            omniscient: false
        });
    }
    
    // Create default multiplayer game config
    static createMultiplayer(numHumans, numComputers = 0) {
        return new GameConfig({
            numHumans: numHumans,
            numComputers: numComputers,
            hosting: true,
            maxTimePerTurn: 300 // 5 minutes default
        });
    }
    
    // Create fast game variant (2x production/speed)
    static createFastGame(numComputers = 1) {
        return new GameConfig({
            numHumans: 1,
            numComputers: numComputers,
            fastGame: true,
            compSkill: 2
        });
    }
    
    // Create small quick game
    static createQuickGame() {
        return new GameConfig({
            numHumans: 1,
            numComputers: 1,
            density: 1,
            sectorSize: 1,
            fastGame: true
        });
    }
    
    // Create large epic game
    static createEpicGame(numPlayers = 4) {
        const numComputers = numPlayers - 1;
        return new GameConfig({
            numHumans: 1,
            numComputers: numComputers,
            density: 3,
            sectorSize: 3,
            fastGame: false
        });
    }

    // Create game with fog of war disabled (omniscient mode)
    static createOmniscientGame(numComputers = 1) {
        return new GameConfig({
            numHumans: 1,
            numComputers: numComputers,
            omniscient: true,
            compSkill: 2
        });
    }

    // Create the deterministic AI-only parity harness:
    // five computer players, one for each v3 AI skill, on the smallest map.
    static createAISkillAutoplay(options = {}) {
        const seed = options.seed !== undefined ? options.seed : 424242;
        return new GameConfig({
            gameTitle: options.gameTitle || I18n.getString(642, 'AI Skill Autoplay'),
            numHumans: 0,
            numComputers: 5,
            density: 1,
            sectorSize: 1,
            compSkill: 3,
            compAdvantage: options.compAdvantage !== undefined ? options.compAdvantage : 0,
            fastGame: options.fastGame !== undefined ? options.fastGame : false,
            omniscient: options.omniscient !== undefined ? options.omniscient : true,
            aiSkillByPlayer: {
                1: 1,
                2: 2,
                3: 3,
                4: 4,
                5: 5
            },
            autoplay: {
                enabled: true,
                seed,
                turnDelayMs: options.turnDelayMs !== undefined ? options.turnDelayMs : 250,
                maxTurns: options.maxTurns !== undefined ? options.maxTurns : 250,
                eventPresentationMs: options.eventPresentationMs !== undefined ? options.eventPresentationMs : 1000,
                showEventWindows: options.showEventWindows !== undefined ? options.showEventWindows : false
            }
        });
    }

    // Create game with fog of war enabled (default behavior)
    static createFogOfWarGame(numComputers = 1) {
        return new GameConfig({
            numHumans: 1,
            numComputers: numComputers,
            omniscient: false,
            compSkill: 2
        });
    }
    
    // Validate configuration
    validate() {
        const errors = [];
        if(!PlayerName.validName(this.gameTitle,27))errors.push('gameTitle must contain 1–27 characters without control characters');
        for(const [key,name] of Object.entries(this.humanPlayerNames)) {
            const player=Number(key);
            if(!Number.isInteger(player) || player<1 || player>this.numHumans || !PlayerName.validName(name))
                errors.push('humanPlayerNames must contain valid names for human player slots');
        }

        if (!Number.isInteger(this.numHumans) || this.numHumans < 0 || this.numHumans > 99) {
            errors.push("numHumans must be between 0 and 99");
        }
        
        if (!Number.isInteger(this.numComputers) || this.numComputers < 0 || this.numComputers > 99) {
            errors.push("numComputers must be between 0 and 99");
        }
        
        if (this.totalPlayers > 99) {
            errors.push("Cannot have more than 99 total players");
        }
        
        if (this.totalPlayers < 1) {
            errors.push("Must have at least 1 total player");
        }
        
        if (!Number.isInteger(this.density) || this.density < 1 || this.density > 10) {
            errors.push("density must be an integer between 1 and 10");
        }
        
        if (!Number.isInteger(this.sectorSize) || this.sectorSize < 1 || this.sectorSize > 5) {
            errors.push("sectorSize must be an integer between 1 and 5");
        }
        
        if (!Number.isInteger(this.compSkill) || this.compSkill < 1 || this.compSkill > 5) {
            errors.push("compSkill must be between 1 (Expert) and 5 (Novice)");
        }

        if (!Number.isInteger(this.compAdvantage) || this.compAdvantage < -3 || this.compAdvantage > 3) {
            errors.push("compAdvantage must be an integer between -3 and 3");
        }

        for (const playerNum of Object.keys(this.aiSkillByPlayer)) {
            const skill = this.aiSkillByPlayer[playerNum];
            if (!Number.isInteger(skill) || skill < 1 || skill > 5) {
                errors.push(`aiSkillByPlayer[${playerNum}] must be between 1 (Expert) and 5 (Novice)`);
            }
        }
        
        return errors;
    }

    getAISkillForPlayer(playerNum) {
        const explicitSkill = this.aiSkillByPlayer[playerNum];
        return explicitSkill !== undefined ? explicitSkill : this.compSkill;
    }
    
    // Get human-readable difficulty name
    getDifficultyName() {
        // Load difficulty names from resources (IDs 301-306)
        const skillIds = {
            1: 301,  // Expert
            2: 302,  // Good
            3: 303,  // Average
            4: 304,  // Passable
            5: 305   // Novice
        };
        const stringId = skillIds[this.compSkill];
        if (stringId !== undefined) {
            return I18n.getString(stringId, "Unknown");
        }
        return I18n.getString(306, "Unknown");  // Unknown fallback
    }
    
    // Get map size description
    getMapSizeDescription() {
        // Load map size descriptions from resources (IDs 350-355)
        const sizeIds = {1:350,2:351,3:352,4:353,5:354}; // Tiny, Small, Average, Large, Huge

        const stringId = sizeIds[this.sectorSize];
        if (stringId !== undefined) {
            return I18n.getString(stringId, "Unknown");
        }
        return I18n.getString(355, "Unknown");  // Unknown fallback
    }
    
    // Get star density description
    getDensityDescription() {
        return I18n.formatString(764, 'Density {0}', this.density);
    }
    
    // Convert to simple object for MapGenerator
    toMapGeneratorConfig() {
        return {
            sectorSize: this.sectorSize,
            density: this.density,
            totalPlayers: this.totalPlayers,
            numHumans: this.numHumans
        };
    }
    
    // Get description of game setup
    getDescription() {
        // Load strings from resources
        const playersStr = I18n.getString(501, "players");
        const humanStr = I18n.getString(503, "human");
        const aiStr = I18n.getString(504, "AI");
        const mapStr = I18n.getString(507, "map");
        const fastGameStr = I18n.getString(505, "Fast Game");
        const allVisibleStr = I18n.getString(506, "All Visible");
        const aiSkillDescription = Object.keys(this.aiSkillByPlayer).length > 0 ?
            I18n.getString(647, 'all skills') :
            this.getDifficultyName();
        
        const parts = [];
        parts.push(`${this.totalPlayers} ${playersStr} (${this.numHumans} ${humanStr}, ${this.numComputers} ${aiStr})`);
        parts.push(`${this.getMapSizeDescription()} ${this.getDensityDescription()} ${mapStr}`);
        parts.push(`${aiStr}: ${aiSkillDescription}`);
        if (this.fastGame) parts.push(fastGameStr);
        if (this.omniscient) parts.push(allVisibleStr);
        return parts.join(", ");
    }

    // Check if fog of war is enabled
    isFogOfWarEnabled() {
        return !this.omniscient;
    }

    // Get fog of war status description
    getFogOfWarDescription() {
        return this.isFogOfWarEnabled() ? I18n.getString(508, "Fog of War") : I18n.getString(506, "All Visible");
    }
}

module.exports = GameConfig;
