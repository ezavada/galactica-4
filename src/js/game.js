// Game class for Galactica-4
// Contains main game logic and state management

const Common = require('./common.js');

class Game {
    constructor(factory, rules) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        this.stars = [];
        this.allShips = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        this.factory = factory;
        this.rules = rules;
        this.initializeGame();
        console.log("Game constructor completed");
    }
    initializeGame() {
        // Create random stars
        const starCount = this.rules.getStarCount();
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * (this.gameWidth - 100) + 50;
            const y = Math.random() * (this.gameHeight - 100) + 50;
            const name = `Star ${i + 1}`;
            let star = this.factory.createStar(x, y, name);
            if (i < 2) {
                star.population = 1000000; // 1 billion initial population
                star.techLevel = 1;
                star.owner = i + 1; // create 2 players
            }
        }
        
        console.log(`Game initialized with ${this.stars.length} stars`);
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
        // Clear previous selection
        var clickedObject = null;
        
        // Check for ship clicks
        const shipRadiusSquared = Common.ShipRadius * Common.ShipRadius;
        for (const ship of this.allShips) {
            const dx = x - ship.x;
            const dy = y - ship.y;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= shipRadiusSquared) {
                clickedObject = ship;
                console.log(`Clicked on ship: ${ship.type}`);
             }
        }

         // Check for star clicks
        const starRadiusSquared = Common.StarRadius * Common.StarRadius;
        for (const star of this.stars) {
            const dx = x - star.x;
            const dy = y - star.y;
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
                // If clicking on empty space and have a ship selected, give it a destination
                this.selectedObject.setDestination({x, y});
                console.log(`Set destination of ${this.selectedObject.type} to (${x}, ${y})`);
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

        this.turn++;
        console.log(`=== Start of Turn ${this.turn} ===`);
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
                console.log(`${who.type} ship stopped at (${where.x}, ${where.y})`); // who = Ship, where = coordinates
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
