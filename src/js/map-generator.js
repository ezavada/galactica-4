// MapGenerator class for Galactica-4
// Implements the exact same algorithms as the original C++ GalacticaProcessor
// Based on GalacticaProcessor.cpp lines 350-520

const Common = require('./common.js');

class MapGenerator {
    constructor(game) {
        this.game = game;
        // Star names array - matches the original game's string resources
        this.STAR_NAMES = [
            "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
            "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
            "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega",
            "Centauri", "Vega", "Sirius", "Procyon", "Altair", "Fomalhaut",
            "Rigel", "Betelgeuse", "Antares", "Aldebaran", "Pollux", "Castor",
            "Spica", "Regulus", "Deneb", "Arcturus", "Capella", "Vega",
            "Polaris", "Canopus", "Achernar", "Hadar", "Acrux", "Gacrux",
            "Mimosa", "Ginan", "Imai", "Kappa Crucis", "Gamma Crucis", "Delta Crucis"
        ];
        
        // Roman numerals for duplicate names (matches original STRx_StarNumbers)
        this.ROMAN_NUMERALS = ["", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        
        // Constants from original C++ code
        this.PIXELS_PER_SECTOR = 1024; // Matches C++ PIXELS_PER_SECTOR at 1:1 zoom
        this.COORDINATE_SCALE = 1024; // Coordinate scaling factor (1024L in original)
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

        // Calculate number of stars (matches original algorithm)
        let numStars = this.calculateStarCount(density, sectorSize, totalPlayers);
        
        // Create stars with random positions
        const unused = this.createRandomStars(numStars, sectorSize, createStarCallback);
        
        // Assign player home stars
        const taken = this.assignPlayerHomeStars(unused, totalPlayers, numHumans, sectorSize);
        
        console.log(`MapGenerator: Created ${numStars} stars, assigned ${taken.length} home stars`);
        return taken;
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
    createRandomStars(numStars, sectorSize, createStarCallback) {
        const unused = [];
        const sectorSizePixels = this.PIXELS_PER_SECTOR * sectorSize;
        const nameUsage = new Array(this.STAR_NAMES.length).fill(0);
        
        for (let i = 0; i < numStars; i++) {
            // Generate random coordinates (matches original: Rnd(PIXELS_PER_SECTOR * sectorSize) * 1024L)
            const x = this.random(sectorSizePixels) * this.COORDINATE_SCALE;
            const y = this.random(sectorSizePixels) * this.COORDINATE_SCALE;
            const z = 0; // Original uses 2D coordinates
            
            // Create star using the provided callback
            const star = createStarCallback(x, y, z);
            
            // Assign a unique name to every star (matches original behavior)
            const starName = this.generateStarName(nameUsage);
            star.name = starName;
            
            unused.push(star);
        }
        
        return unused;
    }

    /**
     * Assign player home stars with distance constraints (matches original algorithm)
     */
    assignPlayerHomeStars(unused, totalPlayers, numHumans, sectorSize) {
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
            this.initializeHomeStar(currentStar, playerNum);
            
            // Add to taken list and remove from unused
            taken.push(currentStar);
            unused.splice(unused.indexOf(currentStar), 1);
            
            // Find next star for next player (if any)
            if (playerNum < totalPlayers) {
                currentStar = this.findNextPlayerStar(unused, taken, minHomeDist, numExtraStars);
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
    findNextPlayerStar(unused, taken, minHomeDist, numExtraStars) {
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
            if (numExtraStars > 0) {
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
    initializeHomeStar(star, playerNum) {
        // Set basic properties (matches original)
        star.owner = playerNum;
        star.techLevel = 1;
        star.population = 1000000; // 1 billion people
        
        // Set scanner range
        star.scannerRange = this.game.rules.getScanRangeForTechLevel(1);
        
        // Start with colony ship at 99% completion (matches original)
        // Create the ship but keep it under construction
        const colonyShip = this.game.factory.createShip(star.x, star.y, 'colony', star);
        colonyShip.progress = 99; // 99% complete
        star.currentShip = colonyShip;
        star.ships.push(colonyShip);
        
        // Set paid amount to 99% of build cost
        const buildCost = this.game.rules.getShipBuildCost(colonyShip, star);
        star.paidTowardShipBuilding = buildCost * 0.99;
        
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
                // Human player - set default name
                playerInfo.setName(playerNum === 1 ? "You" : `Player ${playerNum}`);
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
        // Choose random name template
        const template = Common.CompNameTemplates[this.random(Common.CompNameTemplates.length)];
        
        // Choose random group name if template uses it
        let name = template;
        if (template.includes('%')) {
            const groupName = Common.CompGroupNames[this.random(Common.CompGroupNames.length)];
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
     * Generate a unique star name - matches original algorithm
     */
    generateStarName(nameUsage) {
        const nameIndex = this.random(this.STAR_NAMES.length);
        const baseName = this.STAR_NAMES[nameIndex];
        nameUsage[nameIndex]++;
        
        // Add roman numeral if name is reused
        if (nameUsage[nameIndex] > 1) {
            const romanIndex = Math.min(nameUsage[nameIndex] - 1, this.ROMAN_NUMERALS.length - 1);
            return baseName + " " + this.ROMAN_NUMERALS[romanIndex];
        }
        
        return baseName;
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
