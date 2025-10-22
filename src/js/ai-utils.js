// AI Utility Functions for Galactica-4
// Contains helper functions for AI decision making and game state analysis

const Common = require('./common.js');

class AIUtils {
    constructor(game, rules) {
        this.game = game;
        this.rules = rules;
    }

    // Find the closest stars to a given entity
    findClosestStars(entity, maxDistance = Infinity) {
        const results = {
            nearestUnownedStar: null,
            nearestOwnedStar: null,
            nearestEnemyStar: null,
            distances: [Infinity, Infinity, Infinity, Infinity]
        };

        let minUnownedDist = Infinity;
        let minOwnedDist = Infinity;
        let minEnemyDist = Infinity;

        for (const star of this.game.stars) {
            const distance = this.calculateDistance(entity, star);
            
            if (distance > maxDistance) continue;

            if (star.owner === 0) {
                // Unowned star
                if (distance < minUnownedDist) {
                    results.nearestUnownedStar = star;
                    results.distances[0] = distance;
                    minUnownedDist = distance;
                }
            } else if (star.owner === entity.owner) {
                // Owned star
                if (distance < minOwnedDist) {
                    results.nearestOwnedStar = star;
                    results.distances[1] = distance;
                    minOwnedDist = distance;
                }
            } else {
                // Enemy star
                if (distance < minEnemyDist) {
                    results.nearestEnemyStar = star;
                    results.distances[2] = distance;
                    minEnemyDist = distance;
                }
            }
        }

        return results;
    }

    // Find the closest enemy ship to a given entity
    findClosestEnemyShip(entity, maxDistance = Infinity) {
        let closestShip = null;
        let closestDistance = maxDistance;

        for (const ship of this.game.allShips) {
            if (ship.owner === entity.owner || ship.owner === 0) continue;
            
            const distance = this.calculateDistance(entity, ship);
            if (distance < closestDistance) {
                closestShip = ship;
                closestDistance = distance;
            }
        }

        return { ship: closestShip, distance: closestDistance };
    }

    // Find the weakest enemy star within range
    findWeakestEnemyStar(entity, maxDistance = Infinity) {
        let weakestStar = null;
        let weakestStrength = Infinity;

        for (const star of this.game.stars) {
            if (star.owner === entity.owner || star.owner === 0) continue;
            
            const distance = this.calculateDistance(entity, star);
            if (distance > maxDistance) continue;

            const strength = this.rules.getStarDefenseStrength(star);
            if (strength < weakestStrength) {
                weakestStar = star;
                weakestStrength = strength;
            }
        }

        return weakestStar;
    }

    // Find the nearest enemy star that's focused on tech production
    findNearestEnemyTechProductionStar(entity, maxDistance = Infinity) {
        let bestStar = null;
        let bestDistance = Infinity;
        let bestTechSpending = 0;

        for (const star of this.game.stars) {
            if (star.owner === entity.owner || star.owner === 0) continue;
            
            const distance = this.calculateDistance(entity, star);
            if (distance > maxDistance) continue;

            // Calculate tech spending (this would need to be implemented in the star class)
            const techSpending = this.getStarTechSpending(star);
            
            if (techSpending > bestTechSpending || 
                (techSpending === bestTechSpending && distance < bestDistance)) {
                bestStar = star;
                bestDistance = distance;
                bestTechSpending = techSpending;
            }
        }

        return bestStar;
    }

    // Find the nearest allied star with lower tech level
    findNearestLowerTechAlliedStar(entity, maxDistance = Infinity) {
        let bestStar = null;
        let bestDistance = Infinity;

        for (const star of this.game.stars) {
            if (star.owner !== entity.owner) continue;
            
            const distance = this.calculateDistance(entity, star);
            if (distance > maxDistance) continue;

            if (star.techLevel < entity.techLevel && distance < bestDistance) {
                bestStar = star;
                bestDistance = distance;
            }
        }

        return bestStar;
    }

    // Calculate distance between two entities
    calculateDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if a star has ships of a specific class
    starHasShipClass(star, shipClass) {
        if (!star.ships || !Array.isArray(star.ships)) {
            return false;
        }
        
        return star.ships.some(ship => ship.type === shipClass);
    }

    // Get the number of ships at a star
    getShipsAtStar(star) {
        if (!star.ships || !Array.isArray(star.ships)) {
            return 0;
        }
        
        return star.ships.length;
    }

    // Get ships of a specific class at a star
    getShipsOfClassAtStar(star, shipClass) {
        if (!star.ships || !Array.isArray(star.ships)) {
            return [];
        }
        
        return star.ships.filter(ship => ship.type === shipClass);
    }

    // Calculate relative strength between two entities
    calculateRelativeStrength(entity1, entity2) {
        const strength1 = this.getEntityStrength(entity1);
        const strength2 = this.getEntityStrength(entity2);
        return strength1 - strength2;
    }

    // Get the combat strength of an entity
    getEntityStrength(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.STAR) {
            return this.rules.getStarDefenseStrength(entity);
        } else if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return this.rules.getShipPower(entity);
        }
        return 0;
    }

    // Get the speed of an entity
    getEntitySpeed(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.speed || this.rules.getShipInitialSpeed(entity);
        }
        return 0;
    }

    // Calculate relative speed between two entities
    calculateRelativeSpeed(entity1, entity2) {
        const speed1 = this.getEntitySpeed(entity1);
        const speed2 = this.getEntitySpeed(entity2);
        return speed1 - speed2;
    }

    // Check if an entity is damaged
    isEntityDamaged(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.damage > 0;
        }
        return false;
    }

    // Get damage percentage of an entity
    getDamagePercentage(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return (entity.damage / entity.maxHealth) * 100;
        }
        return 0;
    }

    // Check if an entity has a destination/course
    hasDestination(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.destination !== null;
        }
        return false;
    }

    // Get the tech spending of a star (relative allocation 0-100)
    getStarTechSpending(star) {
        // Return the research allocation value (0-100) for relative effort comparison
        return star.research ? star.research.value : 0;
    }

    // Get the total research output of a star
    getStarResearchOutput(star) {
        // Return the total research benefits (actual research points generated)
        return star.research ? star.research.getBenefits() : 0;
    }

    // Check if there's fog of war enabled
    hasFogOfWar() {
        // Fog of war is always enabled
        return true;
    }

    // Check if this is a fast game
    isFastGame() {
        // This would need to be implemented based on game settings
        return this.rules.isFast;
    }

    // Get all ships owned by a player
    getPlayerShips(playerId) {
        return this.game.allShips.filter(ship => ship.owner === playerId);
    }

    // Get all stars owned by a player
    getPlayerStars(playerId) {
        return this.game.stars.filter(star => star.owner === playerId);
    }

    // Calculate total player strength
    calculatePlayerStrength(playerId) {
        let totalStrength = 0;
        
        // Add star strength
        for (const star of this.getPlayerStars(playerId)) {
            totalStrength += this.getEntityStrength(star);
        }
        
        // Add ship strength
        for (const ship of this.getPlayerShips(playerId)) {
            totalStrength += this.getEntityStrength(ship);
        }
        
        return totalStrength;
    }

    // Find the strongest enemy player
    findStrongestEnemyPlayer(playerId) {
        const enemyPlayers = new Set();
        
        // Find all enemy players
        for (const star of this.game.stars) {
            if (star.owner !== 0 && star.owner !== playerId) {
                enemyPlayers.add(star.owner);
            }
        }
        
        let strongestPlayer = null;
        let strongestStrength = 0;
        
        for (const enemyId of enemyPlayers) {
            const strength = this.calculatePlayerStrength(enemyId);
            if (strength > strongestStrength) {
                strongestPlayer = enemyId;
                strongestStrength = strength;
            }
        }
        
        return strongestPlayer;
    }

    // Check if a player has any ships
    playerHasShips(playerId) {
        return this.getPlayerShips(playerId).length > 0;
    }

    // Check if a player has any stars
    playerHasStars(playerId) {
        return this.getPlayerStars(playerId).length > 0;
    }

    // Get the average tech level of a player's stars
    getPlayerAverageTechLevel(playerId) {
        const stars = this.getPlayerStars(playerId);
        if (stars.length === 0) return 0;
        
        const totalTech = stars.reduce((sum, star) => sum + star.techLevel, 0);
        return totalTech / stars.length;
    }

    // Check if two players are allies (placeholder)
    areAllies(player1, player2) {
        // This would need to be implemented based on alliance mechanics
        return false;
    }

    // Get random number for AI decisions
    getRandomVariation(maxVariation) {
        return Math.floor(Math.random() * maxVariation * 2) - maxVariation;
    }

    // Sign a random number (for AI randomness)
    signRandom(maxValue) {
        const value = Math.floor(Math.random() * maxValue);
        return Math.random() < 0.5 ? value : -value;
    }
    
    // Get all entities within range of a given entity
    // Returns array of {entity, distance} objects
    getEntitiesInRange(fromEntity, entities, range) {
        const entitiesInRange = [];
        
        for (const entity of entities) {
            const distance = this.calculateDistance(fromEntity, entity);
            if (distance <= range) {
                entitiesInRange.push({
                    entity: entity,
                    distance: distance
                });
            }
        }
        
        // Sort by distance (closest first)
        entitiesInRange.sort((a, b) => a.distance - b.distance);
        
        return entitiesInRange;
    }
    
    // Get all enemy entities (ships and stars) for a given owner
    getEnemyEntities(ownerId) {
        const enemies = [];
        
        // Add enemy ships
        for (const ship of this.game.allShips) {
            if (ship.owner !== 0 && ship.owner !== ownerId) {
                enemies.push(ship);
            }
        }
        
        // Add enemy stars
        for (const star of this.game.stars) {
            if (star.owner !== 0 && star.owner !== ownerId) {
                enemies.push(star);
            }
        }
        
        return enemies;
    }
    
    // Get all enemy ships for a given owner
    getEnemyShips(ownerId) {
        return this.game.allShips.filter(ship => ship.owner !== 0 && ship.owner !== ownerId);
    }
    
    // Get all enemy stars for a given owner
    getEnemyStars(ownerId) {
        return this.game.stars.filter(star => star.owner !== 0 && star.owner !== ownerId);
    }
    
    // Get all unowned entities (stars with owner === 0)
    getUnownedEntities() {
        const unowned = [];
        for (const star of this.game.stars) {
            if (star.owner === 0) {
                unowned.push(star);
            }
        }
        return unowned;
    }
    
    // Get all unowned stars
    getUnownedStars() {
        return this.game.stars.filter(star => star.owner === 0);
    }
    
    // Check if a ship is currently at a star (orbiting/docked)
    isAtStar(ship) {
        return ship.star !== null && ship.star !== undefined;
    }
    
    // Get the star that a ship is currently at (null if not at a star)
    getCurrentStar(ship) {
        return ship.star || null;
    }
}

module.exports = AIUtils;
