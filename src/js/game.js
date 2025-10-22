// Game class for Galactica-4
// Contains main game logic and state management

const Common = require('./common.js');
const MapGenerator = require('./map-generator.js');
const GameConfig = require('./game-config.js');
const PlayerInfo = require('./player-info.js');

class Game {
    constructor(factory, rules, config = null) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        
        // Game state
        this.stars = [];
        this.allShips = [];
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
        
        console.log(`Game config: ${this.config.getDescription()}`);
        
        this.initializeGame();
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
        
        // Log player names
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            console.log(`Player ${i}: ${player.name || '(unnamed)'} - ${player.getPlayerType()}`);
        }
    }
    
    entityAdded(entity) {
        const objectType = this.getObjectType(entity);
        if (objectType === Common.ObjectType.STAR) {
            this.stars.push(entity);
        } else if (objectType === Common.ObjectType.SHIP) {
            this.allShips.push(entity);
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
        } else if (objectType === Common.ObjectType.SHIP) {
            this.allShips.splice(this.allShips.indexOf(entity), 1);
        }
    }

    setDisplay(display) {
        this.display = display;
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
        }
        return Common.ObjectType.UNKNOWN;
    }

    draw() {
        if (this.display) {
            this.display.drawGame();
        }
    }
    
    handleMouseClick(x, y) {
        // Convert screen coordinates to galactic coordinates for object selection
        const galacticX = this.display.toGalacticX(x);
        const galacticY = this.display.toGalacticY(y);
        
        // Clear previous selection
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
        
        let selectedObjectType = this.getObjectType(this.selectedObject);

        if (selectedObjectType === Common.ObjectType.SHIP) {
            // if ship is selected and we click on an object, set the destination of the ship to the object
            if (clickedObject) {
                this.selectedObject.setDestination(clickedObject);
                const clickedObjectType = this.getObjectType(clickedObject);
                const destinationName = (clickedObjectType === Common.ObjectType.STAR) ? clickedObject.name : clickedObject.type;
                console.log(`Set destination of ${this.selectedObject.type} to ${destinationName}`);
            } else {
                // If clicking on empty space and have a ship selected, give it a destination (in galactic coordinates)
                this.selectedObject.setDestination({x: galacticX, y: galacticY});
                console.log(`Set destination of ${this.selectedObject.type} to galactic (${galacticX.toFixed(0)}, ${galacticY.toFixed(0)})`);
            }
            return true;
        }

        // set the selected object to the clicked object
        this.selectedObject = clickedObject;
        this.display.setSelectedObject(clickedObject);
        return true;
    }
    
    handleKeyPress(key) {
        if (key === pdg.key_Tab) {
            this.endTurn();
        } else if (key === pdg.key_Escape) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        } else if (this.selectedObject) {
            const objectType = this.getObjectType(this.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                // Handle ship building keys
                this.handleStarKeyPress(this.selectedObject, key);
            } else if (objectType === Game.ObjectType.SHIP) {
                this.handleShipKeyPress(this.selectedObject, key);
            }
        }
        return true;
    }

    handleStarKeyPress(star, key) {
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
        
        // Update all ships
        for (const ship of this.allShips) {
            ship.move();
        }
        // Update all stars
        for (const star of this.stars) {
            star.update();
        }
        
        // resolve combat
        for (const ship of this.allShips) {
            ship.combat();
        }
        
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
}

// Export the class
module.exports = Game;
