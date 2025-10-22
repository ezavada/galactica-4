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
        const names = {
            1: "Expert",
            2: "Good",
            3: "Average",
            4: "Passable",
            5: "Novice"
        };
        return names[this.compSkill] || "Unknown";
    }
    
    // Get map size description
    getMapSizeDescription() {
        const sizes = {
            1: "Small",
            2: "Medium",
            3: "Large",
            4: "Huge",
            5: "Gigantic"
        };
        return sizes[this.sectorSize] || "Unknown";
    }
    
    // Get star density description
    getDensityDescription() {
        const densities = {
            1: "Sparse",
            2: "Normal",
            3: "Dense",
            4: "Very Dense",
            5: "Crowded"
        };
        return densities[this.density] || "Unknown";
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
        const parts = [];
        parts.push(`${this.totalPlayers} players (${this.numHumans} human, ${this.numComputers} AI)`);
        parts.push(`${this.getMapSizeDescription()} ${this.getDensityDescription()} map`);
        parts.push(`AI: ${this.getDifficultyName()}`);
        if (this.fastGame) parts.push("Fast Game");
        if (this.omniscient) parts.push("All Visible");
        return parts.join(", ");
    }
}

module.exports = GameConfig;

