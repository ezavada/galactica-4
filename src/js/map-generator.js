// MapGenerator class for Galactica-4
// Implements the exact same algorithms as the original C++ GalacticaProcessor
// Based on GalacticaProcessor.cpp lines 350-520

const Common = require('./common.js');
const I18n = require('./i18n.js');

class MapGenerator {
    constructor(game) {
        this.game = game;
        
        // Load star names from resources (string ID 100, pipe-separated list)
        const starNamesStr = I18n.getString(100, "Star");
        this.STAR_NAMES = starNamesStr ? [...new Set(starNamesStr.split('|'))] : ["Star"];
        
        // Load roman numerals from resources (string ID 200, pipe-separated list)
        const romanNumeralsStr = I18n.getString(200, "|II|III|IV|V");
        this.ROMAN_NUMERALS = romanNumeralsStr ? romanNumeralsStr.split('|') : ["", "II", "III", "IV", "V"];
        
        // Constants from original C++ code
        this.PIXELS_PER_SECTOR = 1024; // Matches C++ PIXELS_PER_SECTOR at 1:1 zoom
        this.COORDINATE_SCALE = 1024; // Coordinate scaling factor (1024L in original)

        this.nextStarNum = 11;
    }

    /**
     * Generate a complete map with stars and player assignments
     * @param {Object} config - Map generation configuration
     * @param {number} config.sectorSize - Size of the map sector (default: 1)
     * @param {number} config.density - Star density multiplier (default: 1)
     * @param {number} config.totalPlayers - Number of players in the game
     * @param {number} config.numHumans - Number of human players
     * @param {Function} createStarCallback - Function to create star objects
     * @returns {Array} Array of created stars
     */
    generateMap(config, createStarCallback) {
        const {
            sectorSize = 1,
            density = 1,
            totalPlayers = 2,
            numHumans = 1
        } = config;

        console.log(`MapGenerator: Creating map for ${totalPlayers} players (${numHumans} human, ${totalPlayers - numHumans} computer)`);

        // Reserve random star names for each player
        const playerReservedNames = this.reservePlayerNames(totalPlayers);

        // Calculate number of stars (matches original algorithm)
        let numStars = this.calculateStarCount(density, sectorSize, totalPlayers);
        
        // Create stars with random positions
        const unused = this.createRandomStars(numStars, sectorSize, createStarCallback, playerReservedNames);
        
        // Assign player home stars
        const taken = this.assignPlayerHomeStars(unused, totalPlayers, numHumans, sectorSize, playerReservedNames);
        
        console.log(`MapGenerator: Created ${numStars} stars, assigned ${taken.length} home stars`);
        return taken;
    }

    /**
     * Reserve random star names for each player
     */
    reservePlayerNames(totalPlayers) {
        const playerReservedNames = [];
        const availableNames = [...this.STAR_NAMES]; // Create a copy to avoid modifying original
        
        for (let playerNum = 1; playerNum <= totalPlayers; playerNum++) {
            if (availableNames.length > 0) {
                const randomIndex = this.random(availableNames.length);
                const reservedName = availableNames.splice(randomIndex, 1)[0]; // Remove and get the name
                playerReservedNames[playerNum] = reservedName;
                console.log(`MapGenerator: Reserved name "${reservedName}" for player ${playerNum}`);
            } else {
                // Fallback if we run out of names
                playerReservedNames[playerNum] = `Player${playerNum}Star`;
                console.log(`MapGenerator: Using fallback name for player ${playerNum}`);
            }
        }
        
        return playerReservedNames;
    }

    /**
     * Calculate number of stars to create (matches original algorithm)
     */
    calculateStarCount(density, sectorSize, totalPlayers) {
        // Original algorithm: (Rnd(10) + Rnd(10) + 10) * density + Rnd(5) * Rnd(2)
        let numStars = (this.random(10) + this.random(10) + 10) * density + this.random(5) * this.random(2);
        
        // Must have at least one star per player
        if (numStars < totalPlayers) {
            numStars = totalPlayers;
        }
        
        // Adjust for sector size
        numStars *= (sectorSize * sectorSize);
        
        return numStars;
    }

    /**
     * Create stars with random positions (matches original algorithm)
     */
    createRandomStars(numStars, sectorSize, createStarCallback, reservedNames = []) {
        const unused = [];
        const sectorSizePixels = this.PIXELS_PER_SECTOR * this.COORDINATE_SCALE * sectorSize;
        
        const nameUsage = new Array(this.STAR_NAMES.length).fill(0);
        // Homeworld names share the same usage accounting as ordinary stars in v3.
        for (const name of reservedNames) {
            const index = this.STAR_NAMES.indexOf(name);
            if (index >= 0) nameUsage[index]++;
        }
        
        for (let i = 0; i < numStars; i++) {
            // Generate random coordinates (matches original: Rnd(PIXELS_PER_SECTOR * sectorSize) * 1024L)
            // Original: p.x = Rnd(PIXELS_PER_SECTOR * inSectorSize) * 1024L;
            // So: random(1024 * sectorSize) * 1024
            const x = this.random(this.PIXELS_PER_SECTOR * sectorSize) * this.COORDINATE_SCALE;
            const y = this.random(this.PIXELS_PER_SECTOR * sectorSize) * this.COORDINATE_SCALE;
            
            const z = 0; // Original uses 2D coordinates
            
            // Create star using the provided callback
            const star = createStarCallback(x, y, z);
            
            // Assign a unique name to every star (matches original behavior)
            const nameResult = this.generateStarName(nameUsage);
            star.name = nameResult.name;
            star.namedStar = nameResult.namedStar;
            
            unused.push(star);
        }
        
        return unused;
    }

    /**
     * Assign player home stars with distance constraints (matches original algorithm)
     */
    assignPlayerHomeStars(unused, totalPlayers, numHumans, sectorSize, playerReservedNames) {
        const taken = [];
        const sectorSizePixels = this.PIXELS_PER_SECTOR * this.COORDINATE_SCALE * sectorSize;
        
        // Distance constraints (matches original)
        const edgeDist = sectorSizePixels / 4;        // furthest allowed from edge for 1st star
        const minEdgeDist = sectorSizePixels / 8;     // nearest allowed from edge for 1st star
        const homeDist = sectorSizePixels / Math.sqrt(totalPlayers);  // longest dist between players
        const minHomeDist = homeDist * 0.7;           // shortest dist between players
        
        const numExtraStars = unused.length - totalPlayers;
        
        // Find first star (preferably near edge but not too close)
        let firstStarIndex = this.findFirstStar(unused, edgeDist, minEdgeDist, sectorSizePixels, numExtraStars);
        let currentStar = unused[firstStarIndex];
        
        // Assign home stars to all players
        for (let playerNum = 1; playerNum <= totalPlayers; playerNum++) {
            if (!currentStar) {
                console.error(`MapGenerator: No star available for player ${playerNum}`);
                break;
            }
            
            // Initialize star as player home (matches original algorithm)
            this.initializeHomeStar(currentStar, playerNum, playerReservedNames[playerNum]);
            
            // Add to taken list and remove from unused
            taken.push(currentStar);
            unused.splice(unused.indexOf(currentStar), 1);
            
            // Find next star for next player (if any)
            if (playerNum < totalPlayers) {
                const remainingPlayers = totalPlayers - playerNum;
                currentStar = this.findNextPlayerStar(unused, taken, minHomeDist, numExtraStars, remainingPlayers);
            }
        }
        
        return taken;
    }

    /**
     * Find the first star (preferably near edge) - matches original algorithm
     */
    findFirstStar(unused, edgeDist, minEdgeDist, sectorSize, numExtraStars) {
        if (numExtraStars > 0) {
            // Look for a star near the edge but not too close
            for (let i = 0; i < unused.length; i++) {
                const star = unused[i];
                const pos = { x: star.x, y: star.y, z: star.z };
                
                // Check if near edge but not too close (matches original complex condition)
                const nearEdge = (
                    (pos.x < edgeDist || (sectorSize - pos.x) < edgeDist) ||
                    (pos.y < edgeDist || (sectorSize - pos.y) < edgeDist)
                );
                
                const notTooClose = !(
                    (pos.x < minEdgeDist || (sectorSize - pos.x) < minEdgeDist) ||
                    (pos.y < minEdgeDist || (sectorSize - pos.y) < minEdgeDist)
                );
                
                if (nearEdge && notTooClose) {
                    return i;
                }
            }
        }
        
        // Fallback to first star if no suitable edge star found
        return 0;
    }

    /**
     * Find next star for a player with distance constraints - matches original algorithm
     */
    findNextPlayerStar(unused, taken, minHomeDist, numExtraStars, minimumStarsToKeep = 0) {
        let attempts = 0;
        const maxAttempts = unused.length * 2; // Prevent infinite loops
        
        while (attempts < maxAttempts && unused.length > 0) {
            const randomIndex = this.random(unused.length);
            const candidateStar = unused[randomIndex];
            
            // Check distance to all taken stars
            let tooClose = false;
            for (const takenStar of taken) {
                const distance = this.calculateDistance(candidateStar, takenStar);
                if (distance < minHomeDist) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return candidateStar;
            }
            
            // Remove star if too close and we have extras
            if (numExtraStars > 0 && unused.length > minimumStarsToKeep) {
                unused.splice(randomIndex, 1);
                numExtraStars--;
            }
            
            attempts++;
        }
        
        // Fallback: return any remaining star
        return unused.length > 0 ? unused[0] : null;
    }

    /**
     * Initialize a star as a player's home world - matches original algorithm
     */
    initializeHomeStar(star, playerNum, reservedName) {
        // Set basic properties (matches original)
        star.owner = playerNum;
        star.techLevel = 1;
        star.population = 1000000; // 1 billion people
        
        // Update star name to use the reserved name for this player
        star.name = reservedName;
        star.namedStar = true; // Home stars always get names from the original list
        
        // Set scanner range
        star.scannerRange = this.game.rules.getScanRangeForTechLevel(1);
        
        // v3 stores initial construction on the system, not in the ship list.
        star.startBuildingShip('colony');
        star.currentShip.progress = 99;
        star.paidTowardShipBuilding = star.currentShip.cost * 0.99;

        // Update PlayerInfo for this player
        const playerInfo = this.game.players[playerNum];
        if (playerInfo) {
            // Store home star reference
            playerInfo.setHomeStar(star.id || star.name); // Use ID if available, name as fallback
            playerInfo.hiStarTech = 1; // Starting tech level
            
            // Generate computer player name (matches original C++ algorithm)
            if (playerInfo.isComputer) {
                const computerName = this.generateComputerName(star.name);
                playerInfo.setName(computerName);
                console.log(`MapGenerator: Computer player ${playerNum} named "${computerName}"`);
            } else {
                // Human player - set default name from resources
                const youStr = I18n.getString(17, "You");
                const playerStr = I18n.getString(18, "Player");
                playerInfo.setName(this.game.config.humanPlayerNames[playerNum] || (playerNum === 1 ? youStr : `${playerStr} ${playerNum}`));
            }
        }
        
        console.log(`MapGenerator: Assigned ${star.name} to player ${playerNum} (colony ship at 99%)`);
    }
    
    /**
     * Generate computer player name (matches original C++ algorithm)
     * Original: Uses STRx_Names str_TitleSyntax and STRx_CompNames
     * Template: "* %" where * = home star name, % = random group word
     * Examples: "Alpha Pact", "Beta Alliance", "Gamma Empire"
     */
    generateComputerName(homeStarName) {
        // Load name templates from resources (string ID 250, pipe-separated list)
        const templatesStr = I18n.getString(250, "* %");
        const templates = templatesStr ? templatesStr.split('|') : ["* %"];
        
        // Load group names from resources (string ID 270, pipe-separated list)
        const groupNamesStr = I18n.getString(270, "Empire");
        const groupNames = groupNamesStr ? groupNamesStr.split('|') : ["Empire"];
        
        // Choose random name template
        const template = templates[this.random(templates.length)];
        
        // Choose random group name if template uses it
        let name = template;
        if (template.includes('%')) {
            const groupName = groupNames[this.random(groupNames.length)];
            name = name.replace('%', groupName);
        }
        
        // Replace * with home star name
        name = name.replace('*', homeStarName);
        
        // Truncate if too long (original has MAX_PLAYER_NAME_LEN = 32)
        const MAX_NAME_LENGTH = 32;
        if (name.length > MAX_NAME_LENGTH) {
            name = name.substring(0, MAX_NAME_LENGTH);
        }
        
        return name;
    }

    /**
     * Generate a unique named or numbered star label
     */
    generateStarName(nameUsage) {
        // 10% chance to use a random name from the STAR_NAMES array
        if (pdg.rand() % 100 > 10) {
            return { name: `S-${this.nextStarNum++}`, namedStar: false };
        }
        const nameIndex = this.random(this.STAR_NAMES.length);
        const baseName = this.STAR_NAMES[nameIndex];
        // add roman numeral if the name is used more than once
        nameUsage[nameIndex]++;
        if (nameUsage[nameIndex] > 1) {
            const numeral = this.ROMAN_NUMERALS[nameUsage[nameIndex] - 1];
            if (!numeral || this.ROMAN_NUMERALS.indexOf(numeral) !== nameUsage[nameIndex] - 1) {
                return { name: `S-${this.nextStarNum++}`, namedStar: false };
            }
            return { name: `${baseName} ${numeral}`, namedStar: true };
        }
        return { name: baseName, namedStar: true };
    }

    /**
     * Calculate distance between two stars
     */
    calculateDistance(star1, star2) {
        const dx = star1.x - star2.x;
        const dy = star1.y - star2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Random number generator (0 to max-1)
     * Uses PDG's built-in random function for consistency
     */
    random(max) {
        return pdg.rand() % max;
    }
}

module.exports = MapGenerator;
