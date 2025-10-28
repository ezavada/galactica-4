// Game class for Galactica-4
// Contains main game logic and state management

const Common = require('./common.js');
const MapGenerator = require('./map-generator.js');
const GameConfig = require('./game-config.js');
const PlayerInfo = require('./player-info.js');
const { AIManager } = require('./ai-manager.js');
const { SpatialPartition } = require('./spatial-partition.js');
const VisibilityCalculator = require('./visibility-calculator.js');

class Game {
    constructor(factory, rules, config = null) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        
        // Game state
        this.stars = [];
        this.allShips = [];
        this.allFleets = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        
        // Core systems
        this.factory = factory;
        this.rules = rules;
        
        // Game configuration
        this.config = config || GameConfig.createSinglePlayer();
        const errors = this.config.validate();
        if (errors.length > 0) {
            console.error("Invalid game configuration:", errors);
            throw new Error("Invalid game configuration: " + errors.join(", "));
        }
        
        // Player info (index 0 unused, players 1-N)
        this.players = [];
        this.players[0] = null; // Reserve index 0
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const isComputer = (i > this.config.numHumans);
            this.players[i] = new PlayerInfo(i, isComputer);
            if (isComputer) {
                this.players[i].setAISkill(this.config.compSkill, this.config.compAdvantage);
            }
        }
        
        // Initialize AI Manager
        this.aiManager = new AIManager(this, rules);
        
        // Initialize spatial partition and visibility calculator
        this.spatialPartition = new SpatialPartition();
        this.visibilityCalculator = new VisibilityCalculator(this);
        
        // Initialize AI players for computer-controlled players
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            if (this.players[i] && this.players[i].isComputer) {
                // Map compSkill to AI skill levels (1=Expert is best, but AI uses 2=Expert as best)
                // Original: 1=Expert, 2=Good, 3=Average, 4=Passable, 5=Novice
                // AI System: 0=Average, 1=Good, 2=Expert
                let aiSkillLevel = 0; // Default to Average
                if (this.config.compSkill === 1) aiSkillLevel = 2; // Expert
                else if (this.config.compSkill === 2) aiSkillLevel = 1; // Good
                else aiSkillLevel = 0; // Average or lower
                
                this.aiManager.initializeAIPlayer(i, aiSkillLevel);
                console.log(`AI initialized for player ${i} (skill level ${aiSkillLevel})`);
            }
        }
        
        console.log(`Game config: ${this.config.getDescription()}`);
        
        if (!this.config.skipMapGeneration) {
            this.initializeGame();
        }
        console.log("Game constructor completed");
    }
    initializeGame() {
        console.log("Initializing game with MapGenerator...");
        
        // Initialize MapGenerator
        const mapGenerator = new MapGenerator(this);
        
        // Get map configuration from game config
        const mapConfig = this.config.toMapGeneratorConfig();
        
        // Create star callback function for MapGenerator
        const createStarCallback = (x, y, z) => {
            // Store stars in galactic coordinates (conversion to screen happens in Display)
            const star = this.factory.createStar(x, y, "Unnamed");
            return star;
        };
        
        // Generate the map using the original Galactica algorithms
        const homeStars = mapGenerator.generateMap(mapConfig, createStarCallback);
        
        // The MapGenerator has already set up the home stars with proper:
        // - Owner assignment
        // - Tech level (1)
        // - Population (1 billion)
        // - Build queue (colony ship at 99%)
        // - Unique names
        // - Scanner range
        // - Computer player names (for AI players)
        // - PlayerInfo updates (home star references)
        
        console.log(`Game initialized with ${this.stars.length} stars using original Galactica algorithms`);
        console.log(`Home stars assigned: ${homeStars.length}`);
        
        // Initialize fog of war for all entities
        this.initializeFogOfWar();
        
        // Log player names
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            console.log(`Player ${i}: ${player.name || '(unnamed)'} - ${player.getPlayerType()}`);
        }
    }
    
    /**
     * Initialize fog of war properties for all entities
     */
    initializeFogOfWar() {
        // Initialize fog of war properties for all entities
        for (const star of this.stars) {
            this.initializeEntityFogOfWar(star);
        }
        for (const ship of this.allShips) {
            this.initializeEntityFogOfWar(ship);
        }
    }
    
    /**
     * Initialize fog of war properties for a single entity
     */
    initializeEntityFogOfWar(entity) {
        // Initialize visibility arrays
        entity.visibilityTo = [];
        entity.lastSeen = [];
        entity.lastSeenBy = [];
        
        // Set default values
        if (this.factory.isStar(entity)) {
            entity.setScannerRange(this.rules.getScanRangeForTechLevel(entity.techLevel));
            entity.setStealth(1); // Stars have minimal stealth
            entity.setApparentSize(5000000); // 5 million meters
        } else if (this.factory.isShip(entity)) {
            entity.setScannerRange(this.rules.getShipScanRange(entity));
            entity.setStealth(this.calculateShipStealth(entity));
            entity.setApparentSize(entity.calculateApparentSize());
        }
    }
    
    /**
     * Calculate ship stealth based on tech level
     */
    calculateShipStealth(ship) {
        // Stealth = (tech level * 0.75) + 1 (matches C++ formula)
        return Math.floor((ship.techLevel * 0.75) + 1);
    }
    
    entityAdded(entity) {
        const objectType = this.getObjectType(entity);
        if (objectType === Common.ObjectType.STAR) {
            this.stars.push(entity);
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
        } else if (objectType === Common.ObjectType.SHIP) {
            this.allShips.push(entity);
            // Add to spatial partition
            const entityType = (entity.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
            this.spatialPartition.addEntity(entity, entityType);
        } else if (objectType === Common.ObjectType.FLEET) {
            this.allFleets.push(entity);
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
        }
    }

    entityRemoved(entity) {
        if (this.selectedObject === entity) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        }
        
        const objectType = this.getObjectType(entity);
        if (objectType === Common.ObjectType.STAR) {
            this.stars.splice(this.stars.indexOf(entity), 1);
            // Remove from spatial partition
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
        } else if (objectType === Common.ObjectType.SHIP) {
            this.allShips.splice(this.allShips.indexOf(entity), 1);
            // Remove from spatial partition
            const entityType = (entity.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
            this.spatialPartition.removeEntity(entity, entityType);
        } else if (objectType === Common.ObjectType.FLEET) {
            this.allFleets.splice(this.allFleets.indexOf(entity), 1);
            // Remove from spatial partition
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
        }
    }

    setDisplay(display) {
        this.display = display;
        // Select the player's home star after display is set
        // Use setTimeout to ensure the display is fully constructed
        setTimeout(() => {
            this.selectHomeStar();
        }, 0);
    }
    setRules(rules) {
        this.rules = rules;
    }
    
    getFactory() {
        return this.factory;
    }
    getRules() {
        return this.rules;
    }

    getObjectType(object) {
        if (this.factory.isStar(object)) {
            return Common.ObjectType.STAR;
        } else if (this.factory.isShip(object)) {
            return Common.ObjectType.SHIP;
        } else if (this.factory.isFleet(object)) {
            return Common.ObjectType.FLEET;
        }
        return Common.ObjectType.UNKNOWN;
    }
    
    // Check if a human player can control this entity
    // Returns true if the entity is owned by a human player (player 1 to numHumans)
    canHumanControl(entity) {
        if (!entity || entity.owner === undefined) {
            return false; // Unowned or invalid entity
        }
        
        // Human players are numbered 1 to numHumans
        return entity.owner > 0 && entity.owner <= this.config.numHumans;
    }
    
    // Get the player number for the current human (for single player, this is 1)
    // In multiplayer, this would need to be tracked differently
    getCurrentHumanPlayer() {
        return 1; // For now, assume player 1 is the human
    }

    // Get the home star ID for a specific player
    getPlayerHomeSystem(playerNum) {
        if (playerNum < 1 || playerNum > this.config.totalPlayers) {
            return null;
        }
        const player = this.players[playerNum];
        return player ? player.homeStarId : null;
    }

    draw() {
        if (this.display) {
            this.display.drawGame();
        }
    }
    
    handleMouseClick(x, y) {
        // Left click - select object to view information
        var clickedObject = this.findObjectAtPosition(x, y);
        
        // Allow selecting any object to view information
        this.selectedObject = clickedObject;
        this.display.setSelectedObject(clickedObject);
        return true;
    }
    
    handleMouseRightClick(x, y) {
        // Right click - give orders to selected ship
        // Convert screen coordinates to galactic coordinates
        const galacticX = this.display.toGalacticX(x);
        const galacticY = this.display.toGalacticY(y);
        
        // Check if we have a ship or fleet selected
        const selectedObjectType = this.getObjectType(this.selectedObject);
        if (selectedObjectType !== Common.ObjectType.SHIP && selectedObjectType !== Common.ObjectType.FLEET) {
            return true; // Ignore right clicks if no ship or fleet selected
        }
        
        // Only allow giving orders to ships we control
        if (!this.canHumanControl(this.selectedObject)) {
            console.log(`Cannot give orders to ship owned by player ${this.selectedObject.owner}`);
            return true;
        }
        
        // Find what was right-clicked on
        var clickedObject = this.findObjectAtPosition(x, y);
        
        // Set destination - either to an object or to coordinates
        if (clickedObject) {
            this.selectedObject.setDestination(clickedObject);
            const clickedObjectType = this.getObjectType(clickedObject);
            let destinationName;
            if (clickedObjectType === Common.ObjectType.STAR) {
                destinationName = clickedObject.name;
            } else if (clickedObjectType === Common.ObjectType.FLEET) {
                destinationName = `fleet (${clickedObject.getSize()} ships)`;
            } else {
                destinationName = clickedObject.type;
            }
            const selectedObjectName = (selectedObjectType === Common.ObjectType.FLEET) ? `fleet (${this.selectedObject.getSize()} ships)` : this.selectedObject.type;
            console.log(`Set destination of ${selectedObjectName} to ${destinationName}`);
        } else {
            // Right-clicking on empty space - give ship/fleet a destination (in galactic coordinates)
            this.selectedObject.setDestination({x: galacticX, y: galacticY});
            const selectedObjectName = (selectedObjectType === Common.ObjectType.FLEET) ? `fleet (${this.selectedObject.getSize()} ships)` : this.selectedObject.type;
            console.log(`Set destination of ${selectedObjectName} to galactic (${galacticX.toFixed(0)}, ${galacticY.toFixed(0)})`);
        }
        return true;
    }
    
    findObjectAtPosition(x, y) {
        // Helper method to find what object is at a given screen position
        var clickedObject = null;
        
        // Check for ship clicks (using screen-space radius for consistent UI feel)
        const shipRadiusSquared = Common.ShipRadius * Common.ShipRadius;
        for (const ship of this.allShips) {
            // Convert ship position to screen for distance check
            const shipScreenX = this.display.toScreenX(ship.x);
            const shipScreenY = this.display.toScreenY(ship.y);
            
            let dx = x - shipScreenX;
            let dy = y - shipScreenY;
            if (ship.star) {
                // adjust for parking orbit around star
                dx -= 10;
                dy += 6;
            }
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= shipRadiusSquared) {
                clickedObject = ship;
                console.log(`Clicked on ship: ${ship.type}`);
             }
        }

        // Check for fleet clicks (using screen-space radius for consistent UI feel)
        const fleetRadiusSquared = Common.ShipRadius * Common.ShipRadius * 2.25; // Fleet hexagons are larger than ships
        for (const fleet of this.allFleets) {
            // Convert fleet position to screen for distance check
            let fleetScreenX = this.display.toScreenX(fleet.x);
            let fleetScreenY = this.display.toScreenY(fleet.y);
            
            // Adjust for fleet offset when at star (same as ships)
            const fleetAtStar = this.stars.find(star => 
                Math.abs(star.x - fleet.x) < 5 && Math.abs(star.y - fleet.y) < 5
            );
            if (fleetAtStar) {
                fleetScreenX += this.display.scaledStarRadius * 1.25;
                fleetScreenY -= this.display.scaledStarRadius * 0.75;
            }
            
            const dx = x - fleetScreenX;
            const dy = y - fleetScreenY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= fleetRadiusSquared) {
                clickedObject = fleet;
                console.log(`Clicked on fleet: ${fleet.getSize()} ships`);
                break; // Fleet takes priority over ships/stars
            }
        }

        // Check for star clicks (using screen-space radius for consistent UI feel)
        const starRadiusSquared = Common.StarRadius * Common.StarRadius;
        for (const star of this.stars) {
            // Convert star position to screen for distance check
            const starScreenX = this.display.toScreenX(star.x);
            const starScreenY = this.display.toScreenY(star.y);
            
            const dx = x - starScreenX;
            const dy = y - starScreenY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= starRadiusSquared) {
                clickedObject = star;
                console.log(`Clicked on star: ${star.name}`);
            }
        }
        
        return clickedObject;
    }
    
    handleKeyPress(key) {
        if (key === pdg.key_Tab) {
            this.endTurn();
        } else if (key === pdg.key_Escape) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        } else if (key === 61 || key === 43) { // = or + key
            // Zoom in with + or = key (zoom to center of screen)
            this.display.zoomIn();
        } else if (key === 45) { // - key
            // Zoom out with - key (zoom to center of screen)
            this.display.zoomOut();
        } else if (key === 48) { // 0 key
            // Reset view with 0 key
            this.display.resetView();
        //} else if (key === 99 || key === 67) { // c or C key
        //    // Center on selected object with C key
        //    if (this.selectedObject) {
        //        this.display.centerOn(this.selectedObject.x, this.selectedObject.y);
        //    }
        } else if (key === 102 || key === 70) { // f or F key
            // Zoom to fit entire map with F key
            this.display.zoomToFit();
        } else if (key === 104 || key === 72) { // h or H key
            // Select player's home star with H key
            this.selectHomeStar();
        } else if (this.selectedObject) {
            const objectType = this.getObjectType(this.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                // Handle ship building keys
                this.handleStarKeyPress(this.selectedObject, key);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.handleShipKeyPress(this.selectedObject, key);
            }
        }
        return true;
    }

    selectHomeStar() {
        // Check if display is available
        if (!this.display) {
            // console.log('Display not available yet, skipping home star selection');
            return;
        }
        
        // Get the player's home star ID
        const homeStarId = this.getPlayerHomeSystem(1); // Player 1 is the human player
        if (!homeStarId) {
            console.log('No home star found for player 1');
            return;
        }
        
        // Find the home star object
        const homeStar = this.stars.find(star => star.id === homeStarId);
        if (!homeStar) {
            console.log(`Home star with ID ${homeStarId} not found`);
            return;
        }
        
        // Select the home star
        this.selectedObject = homeStar;
        this.display.setSelectedObject(homeStar);
        
        // Center the view on the home star
        this.display.centerOn(homeStar.x, homeStar.y);
    }

    handleStarKeyPress(star, key) {
        // Verify the star can be controlled by human
        if (!this.canHumanControl(star)) {
            console.log(`Cannot build ships at ${star.name} - owned by player ${star.owner}`);
            return;
        }
        
        switch (String.fromCharCode(key)) {
            case 's':
                star.startBuildingShip('scout');
                break;
            case 'd':
                star.startBuildingShip('defense');
                break;
            case 'b':
                star.startBuildingShip('battleship');
                break;
            case 'c':
                star.startBuildingShip('colony');
                break;
            default:
                console.log(`Invalid key pressed: ${key}`);
                break;
        }
    }

    handleShipKeyPress(ship, key) {
        // no ship keys yet
    }
    
    endTurn() {
        console.log(`=== End of Turn ${this.turn} ===`);
        
        // Process AI decisions before moving/updating
        if (this.aiManager) {
            this.aiManager.processAITurns();
        }
        
        // Update all ships
        for (const ship of this.allShips) {
            ship.move();
        }
        // Update all fleets
        for (const fleet of this.allFleets) {
            fleet.move();
        }
        // Update all stars
        for (const star of this.stars) {
            star.update();
        }
        
        // resolve combat
        for (const ship of this.allShips) {
            ship.combat();
        }
        
        // Update visibility after all movements and changes
        this.visibilityCalculator.updateAllVisibility();
        
        // Update player piece counts and check for defeats
        this.updatePlayerPieceCounts();

        this.turn++;
        console.log(`=== Start of Turn ${this.turn} ===`);
    }
    
    // Update piece counts for all players
    updatePlayerPieceCounts() {
        if (!this.players) return;
        
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            if (!player) continue;
            
            // Count stars owned by this player
            const starCount = this.stars.filter(star => star.owner === i).length;
            
            // Count ships owned by this player
            const shipCount = this.allShips.filter(ship => ship.owner === i).length;
            
            // Update piece count (returns true if player just died)
            if (player.updatePieceCount(starCount, shipCount)) {
                console.log(`${player.name} has been defeated!`);
                this.noteworthyEvent(player, Common.EventType.PLAYER_DIED);
            }
        }
    }

    noteworthyEvent(who, what, where, how, why, other) {
        switch (what) {
            case Common.EventType.SHIP_ARRIVED:
                console.log(`${who.type} ship arrived at ${where.name}`); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_INTERCEPT:
                console.log(`${who.type} ship intercepted ${where.type} ship at (${where.x}, ${where.y})`); // who = Ship, where = Ship
                // Check if ships are friendly and can form a fleet
                if (who.owner === where.owner && who.canFormFleet() && where.canFormFleet()) {
                    this.handleFleetFormation(who, where);
                }
                break;
            case Common.EventType.SHIP_STOPPED:
                console.log(`${who.type} ship stopped at (${who.x}, ${who.y})`); // who = Ship
                break;
            case Common.EventType.SHIP_DESTROYED:
                // TODO: different message based on where, how, and why
                console.log(`${who.type} ship destroyed at (${where.x}, ${where.y})`); // who = Ship, where = position or Star or Ship
                break;
            case Common.EventType.SHIP_BUILT:
                console.log(`${where.name} built a ${who.type} ship`); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_DEPARTED:
                console.log(`${who.type} ship departed from ${where.name}`); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_TASKED:
                if (why === Common.EventWhy.NEW_DESTINATION) {
                    console.log(`${who.type} ship moving to (${where.x}, ${where.y})`); // who = Ship, where = coordinates, why = reason for tasking
                } else {
                    console.log(`${who.type} ship tasked to (${where.x}, ${where.y}) for ${why}`); // who = Ship, where = coordinates, why = reason for tasking
                }
                break;
            case Common.EventType.TECH_LEVEL_UP:
                console.log(`${who.name} reached tech level ${who.techLevel}`); // who = Star, where = Tech Level
                break;
            case Common.EventType.STAR_COLONIZED:
                console.log(`Player ${where.owner} colonized ${where.name}`); // who = Star, where = Star
                break;
            case Common.EventType.STAR_CAPTURED:
                console.log(`Player ${where.owner} captured ${where.name}`); // who = Star, where = Star
                break;
            default:
                console.log(`=== Noteworthy Event: ${who} ${what} ${where} ${how} ${why} ${other} ===`);
                break;
        }
    }
    
    /**
     * Get spatial partition statistics for debugging
     */
    getSpatialStats() {
        return this.spatialPartition.getStats();
    }
    
    /**
     * Get visibility statistics for debugging
     */
    getVisibilityStats() {
        return this.visibilityCalculator.getVisibilityStats();
    }
    
    /**
     * Handle automatic fleet formation when friendly ships intercept
     */
    handleFleetFormation(entity1, entity2) {
        // Check if either entity is already a fleet
        const entity1Type = this.getObjectType(entity1);
        const entity2Type = this.getObjectType(entity2);
        
        if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
            // Both entities are fleets - merge them
            if (entity1 !== entity2) {
                this.mergeFleets(entity1, entity2);
            }
        } else if (entity1Type === Common.ObjectType.FLEET) {
            // Entity1 is a fleet, add entity2 to it if it can form a fleet
            if (entity2.canFormFleet()) {
                entity1.addShip(entity2);
            }
        } else if (entity2Type === Common.ObjectType.FLEET) {
            // Entity2 is a fleet, add entity1 to it if it can form a fleet
            if (entity1.canFormFleet()) {
                entity2.addShip(entity1);
            }
        } else {
            // Both entities are ships - check if either ship is already in a fleet
            if (entity1.isInFleet() && entity2.isInFleet()) {
                // Both ships are in fleets - merge the fleets
                if (entity1.fleet !== entity2.fleet) {
                    this.mergeFleets(entity1.fleet, entity2.fleet);
                }
            } else if (entity1.isInFleet()) {
                // Ship1 is in a fleet, add ship2 to it
                entity1.fleet.addShip(entity2);
            } else if (entity2.isInFleet()) {
                // Ship2 is in a fleet, add ship1 to it
                entity2.fleet.addShip(entity1);
            } else {
                // Neither ship is in a fleet, create a new fleet
                const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                fleet.addShip(entity1);
                fleet.addShip(entity2);
            }
        }
    }
    
    /**
     * Merge two fleets into one
     */
    mergeFleets(fleet1, fleet2) {
        // Add all ships from fleet2 to fleet1
        const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
        for (const ship of shipsToMove) {
            fleet1.addShip(ship);
        }
        
        // Remove the empty fleet2
        this.entityRemoved(fleet2);
    }
}

// Export the class
module.exports = Game;
