// PlayerInfo class for Galactica-4
// Tracks player state and statistics
// Based on PrivatePlayerInfoT and PublicPlayerInfoT from original C++

const I18n = require('./i18n.js');

class PlayerInfo {
    constructor(playerNum, isComputer = false) {
        // Player identification
        this.playerNum = playerNum;
        this.name = '';
        this.isComputer = isComputer;
        this.isHuman = !isComputer;
        this.isAlive = true;
        this.isLoggedIn = false;  // For multiplayer
        
        // Home world tracking
        this.homeStarId = null;   // Reference to home star
        this.techStarId = null;   // For AI - main tech-producing star
        this.hasTechStar = false; // For AI - whether tech star is assigned
        
        // Tech tracking (for "new discovery" messages)
        this.hiStarTech = 0;      // Highest star tech level achieved
        this.hiShipTech = -5;     // Highest ship tech level (start at -5 to show message for first Traveler)
        
        // Hull types built (for "new class of ship" messages)
        this.builtColony = false;
        this.builtScout = false;
        this.builtSatellite = false;
        // Track first-built battleship classes by class index (1-based like C++)
        this.builtFighterClasses = new Set();
        
        // Game state
        this.numPiecesRemaining = 0;  // Stars + ships owned
        this.lastTurnPosted = 0;      // For multiplayer turn tracking
        
        // AI configuration
        this.compSkill = 0;        // 1=Expert to 5=Novice (0 if human)
        this.compAdvantage = 0;    // 0=None, 1=Some, 2=More
        
        // Default economic settings (used when taking over new stars)
        this.defaultBuildType = 1;  // 1=Colony (matches original default)
        this.defaultGrowth = 334;   // ~33.4% to growth
        this.defaultTech = 333;     // ~33.3% to tech
        this.defaultShips = 333;    // ~33.3% to ships
        
        // Multiplayer password (not used in single player)
        this.password = '';
    }
    
    // Set player name
    setName(name) {
        this.name = name;
    }
    
    // Set home star reference
    setHomeStar(starId) {
        this.homeStarId = starId;
    }
    
    // Set tech star reference (for AI players)
    setTechStar(starId) {
        this.techStarId = starId;
        this.hasTechStar = true;
    }
    
    // Update highest tech levels
    updateHighestStarTech(techLevel) {
        if (techLevel > this.hiStarTech) {
            this.hiStarTech = techLevel;
            return true; // New tech level achieved
        }
        return false;
    }
    
    updateHighestShipTech(techLevel) {
        if (techLevel > this.hiShipTech) {
            this.hiShipTech = techLevel;
            return true; // New tech level achieved
        }
        return false;
    }
    
    // Mark ship types as built
    markShipTypeBuilt(shipType) {
        switch (shipType) {
            case 'colony':
                if (!this.builtColony) {
                    this.builtColony = true;
                    return true; // First time building this type
                }
                break;
            case 'scout':
                if (!this.builtScout) {
                    this.builtScout = true;
                    return true;
                }
                break;
            case 'satellite':
            case 'defense':
                if (!this.builtSatellite) {
                    this.builtSatellite = true;
                    return true;
                }
                break;
        }
        return false; // Already built this type before
    }

    // Mark first-built battleship class by index; returns true if first time
    markFighterClassBuilt(classIndex) {
        if (!classIndex || classIndex < 1) {
            return false;
        }
        if (!this.builtFighterClasses.has(classIndex)) {
            this.builtFighterClasses.add(classIndex);
            return true;
        }
        return false;
    }
    
    // Update piece count
    updatePieceCount(starCount, shipCount) {
        this.numPiecesRemaining = starCount + shipCount;
        if (this.numPiecesRemaining === 0 && this.isAlive) {
            this.isAlive = false;
            return true; // Player just died
        }
        return false;
    }
    
    // Check if player is defeated
    isDefeated() {
        return !this.isAlive || this.numPiecesRemaining === 0;
    }

    isAllyOf(playerNum) {
        return this.playerNum === playerNum;
    }
    
    // Set AI skill level
    setAISkill(skillLevel, advantage = 0) {
        this.compSkill = skillLevel;
        this.compAdvantage = advantage;
    }
    
    // Set default economic allocations
    setDefaultEconomics(growth, tech, ships) {
        this.defaultGrowth = growth;
        this.defaultTech = tech;
        this.defaultShips = ships;
    }
    
    // Set default ship build type
    setDefaultBuildType(buildType) {
        this.defaultBuildType = buildType;
    }
    
    // Get skill level name
    getSkillName() {
        // Load skill names from resources (IDs 300-306)
        const skillIds = {
            0: 300,  // Human
            1: 301,  // Expert
            2: 302,  // Good
            3: 303,  // Average
            4: 304,  // Passable
            5: 305   // Novice
        };
        const stringId = skillIds[this.compSkill];
        if (stringId !== undefined) {
            return I18n.getString(stringId, 'Unknown');
        }
        return I18n.getString(306, 'Unknown');  // Unknown fallback
    }
    
    // Get player type description
    getPlayerType() {
        if (this.isHuman) {
            return I18n.getString(300, 'Human');
        } else {
            const computerStr = I18n.getString(502, 'Computer');
            return `${computerStr} (${this.getSkillName()})`;
        }
    }
    
    // Get player statistics summary
    getStatistics() {
        return {
            playerNum: this.playerNum,
            name: this.name,
            type: this.getPlayerType(),
            isAlive: this.isAlive,
            pieces: this.numPiecesRemaining,
            highestStarTech: this.hiStarTech,
            highestShipTech: this.hiShipTech
        };
    }
    
    // Serialize for save/load
    toJSON() {
        return {
            playerNum: this.playerNum,
            name: this.name,
            isComputer: this.isComputer,
            isAlive: this.isAlive,
            homeStarId: this.homeStarId,
            techStarId: this.techStarId,
            hasTechStar: this.hasTechStar,
            hiStarTech: this.hiStarTech,
            hiShipTech: this.hiShipTech,
            builtColony: this.builtColony,
            builtScout: this.builtScout,
            builtSatellite: this.builtSatellite,
            numPiecesRemaining: this.numPiecesRemaining,
            compSkill: this.compSkill,
            compAdvantage: this.compAdvantage,
            defaultBuildType: this.defaultBuildType,
            defaultGrowth: this.defaultGrowth,
            defaultTech: this.defaultTech,
            defaultShips: this.defaultShips
        };
    }
    
    // Load from serialized data
    static fromJSON(data) {
        const player = new PlayerInfo(data.playerNum, data.isComputer);
        Object.assign(player, data);
        player.isHuman = !player.isComputer;
        return player;
    }
}

module.exports = PlayerInfo;
