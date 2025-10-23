// Game Configuration for Galactica-4
// Defines game setup options matching original C++ NewGameInfoT structure

class GameConfig {
    constructor(options = {}) {
        // Game title
        this.gameTitle = options.gameTitle || "Galactica Game";
        
        // Player configuration
        this.numHumans = options.numHumans !== undefined ? options.numHumans : 1;
        this.numComputers = options.numComputers !== undefined ? options.numComputers : 1;
        this.totalPlayers = this.numHumans + this.numComputers;
        
        // Map configuration
        this.density = options.density || 1;        // 1-3 typical (star density multiplier)
        this.sectorSize = options.sectorSize || 1;  // 1-4 typical (map size multiplier)
        
        // AI configuration
        this.compSkill = options.compSkill || 2;         // 1=Expert, 2=Good, 3=Average, 4=Passable, 5=Novice
        this.compAdvantage = options.compAdvantage || 0; // 0=None, 1=Some, 2=More
        
        // Game speed and mechanics
        this.fastGame = options.fastGame !== undefined ? options.fastGame : false;  // Affects production/speed
        this.omniscient = options.omniscient !== undefined ? options.omniscient : false; // Full map visibility
        this.endEarly = options.endEarly !== undefined ? options.endEarly : true; // End turn when all posted
        
        // Time limits (0 = unlimited)
        this.maxTimePerTurn = options.maxTimePerTurn || 0; // seconds per turn (multiplayer)
        
        // Hosting (for multiplayer)
        this.hosting = options.hosting !== undefined ? options.hosting : false;
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
    
    // Validate configuration
    validate() {
        const errors = [];
        
        if (this.numHumans < 0 || this.numHumans > 99) {
            errors.push("numHumans must be between 0 and 99");
        }
        
        if (this.numComputers < 0 || this.numComputers > 99) {
            errors.push("numComputers must be between 0 and 99");
        }
        
        if (this.totalPlayers > 99) {
            errors.push("Cannot have more than 99 total players");
        }
        
        if (this.totalPlayers < 2) {
            errors.push("Must have at least 2 total players");
        }
        
        if (this.density < 1 || this.density > 5) {
            errors.push("density must be between 1 and 5");
        }
        
        if (this.sectorSize < 1 || this.sectorSize > 5) {
            errors.push("sectorSize must be between 1 and 5");
        }
        
        if (this.compSkill < 1 || this.compSkill > 5) {
            errors.push("compSkill must be between 1 (Expert) and 5 (Novice)");
        }
        
        return errors;
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
            return pdg.res.getString(stringId) || "Unknown";
        }
        return pdg.res.getString(306) || "Unknown";  // Unknown fallback
    }
    
    // Get map size description
    getMapSizeDescription() {
        // Load map size descriptions from resources (IDs 350-355)
        const sizeIds = {
            1: 350,  // Small
            2: 351,  // Medium
            3: 352,  // Large
            4: 353,  // Huge
            5: 354   // Gigantic
        };
        const stringId = sizeIds[this.sectorSize];
        if (stringId !== undefined) {
            return pdg.res.getString(stringId) || "Unknown";
        }
        return pdg.res.getString(355) || "Unknown";  // Unknown fallback
    }
    
    // Get star density description
    getDensityDescription() {
        // Load density descriptions from resources (IDs 400-405)
        const densityIds = {
            1: 400,  // Sparse
            2: 401,  // Normal
            3: 402,  // Dense
            4: 403,  // Very Dense
            5: 404   // Crowded
        };
        const stringId = densityIds[this.density];
        if (stringId !== undefined) {
            return pdg.res.getString(stringId) || "Unknown";
        }
        return pdg.res.getString(405) || "Unknown";  // Unknown fallback
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
        const playersStr = pdg.res.getString(501) || "players";
        const humanStr = pdg.res.getString(503) || "human";
        const aiStr = pdg.res.getString(504) || "AI";
        const mapStr = pdg.res.getString(507) || "map";
        const fastGameStr = pdg.res.getString(505) || "Fast Game";
        const allVisibleStr = pdg.res.getString(506) || "All Visible";
        
        const parts = [];
        parts.push(`${this.totalPlayers} ${playersStr} (${this.numHumans} ${humanStr}, ${this.numComputers} ${aiStr})`);
        parts.push(`${this.getMapSizeDescription()} ${this.getDensityDescription()} ${mapStr}`);
        parts.push(`${aiStr}: ${this.getDifficultyName()}`);
        if (this.fastGame) parts.push(fastGameStr);
        if (this.omniscient) parts.push(allVisibleStr);
        return parts.join(", ");
    }
}

module.exports = GameConfig;

