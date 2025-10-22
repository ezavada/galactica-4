// AI Base classes and common utilities for Galactica-4
// Contains base AI functionality shared between ship and star AI

const Common = require('./common.js');

class AIBase {
    constructor(entity, game, rules) {
        this.entity = entity;
        this.game = game;
        this.rules = rules;
        this.owner = entity.owner;
    }

    // Get all entities owned by this AI player
    getOwnedEntities() {
        const owned = [];
        for (const star of this.game.stars) {
            if (star.owner === this.owner) {
                owned.push(star);
            }
        }
        for (const ship of this.game.allShips) {
            if (ship.owner === this.owner) {
                owned.push(ship);
            }
        }
        return owned;
    }

    // Get all enemy entities
    getEnemyEntities() {
        const enemies = [];
        for (const star of this.game.stars) {
            if (star.owner !== 0 && star.owner !== this.owner) {
                enemies.push(star);
            }
        }
        for (const ship of this.game.allShips) {
            if (ship.owner !== 0 && ship.owner !== this.owner) {
                enemies.push(ship);
            }
        }
        return enemies;
    }

    // Get all unowned entities
    getUnownedEntities() {
        const unowned = [];
        for (const star of this.game.stars) {
            if (star.owner === 0) {
                unowned.push(star);
            }
        }
        return unowned;
    }

    // Calculate distance between two entities
    calculateDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Find nearest entity of a specific type and owner
    findNearestEntity(entity, targetEntities, maxDistance = Infinity) {
        let nearest = null;
        let nearestDistance = maxDistance;

        for (const target of targetEntities) {
            if (target === entity) continue;
            const distance = this.calculateDistance(entity, target);
            if (distance < nearestDistance) {
                nearest = target;
                nearestDistance = distance;
            }
        }

        return { entity: nearest, distance: nearestDistance };
    }

    // Get entities within a certain range
    getEntitiesInRange(entity, entities, range) {
        const inRange = [];
        for (const target of entities) {
            if (target === entity) continue;
            const distance = this.calculateDistance(entity, target);
            if (distance <= range) {
                inRange.push({ entity: target, distance: distance });
            }
        }
        return inRange.sort((a, b) => a.distance - b.distance);
    }

    // Check if entity is at a star
    isAtStar(entity) {
        // Check if the entity is a ship and if it's in any star's ships array
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.star !== null;
        }
        return false;
    }

    // Get the star this entity is currently at
    getCurrentStar(entity) {
        // Find which star contains this entity in its ships array
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.star;
        }
        return null;
    }

    // Calculate combat strength of an entity
    getCombatStrength(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.STAR) {
            return this.rules.getStarDefenseStrength(entity);
        } else if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return this.rules.getShipPower(entity);
        }
        return 0;
    }

    // Check if an entity is damaged
    isDamaged(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.damage > 0;
        }
        return false;
    }

    // Get damage percentage
    getDamagePercent(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.damage / entity.maxHealth * 100;
        }
        return 0;
    }

    // Check if entity has a course plotted
    hasCourse(entity) {
        if (this.game.getObjectType(entity) === Common.ObjectType.SHIP) {
            return entity.destination !== null;
        }
        return false;
    }

    // Debug logging for AI decisions
    debugLog(message, level = 'info') {
        if (this.game.debugAI) {
            console.log(`[AI ${this.owner}] ${message}`);
        }
    }
}

// AI Decision Result class
class AIDecision {
    constructor(action, target, score, reason) {
        this.action = action; // 'goToOwnStar', 'goToEnemyStar', 'goToUnownedStar', 'attackShip', 'formFleet', 'doNothing'
        this.target = target; // The target entity or coordinates
        this.score = score;   // The calculated score for this decision
        this.reason = reason; // Human-readable reason for the decision
    }
}

// AI Action Types
const AIActions = {
    GO_TO_OWN_STAR: 'goToOwnStar',
    GO_TO_ENEMY_STAR: 'goToEnemyStar', 
    GO_TO_UNOWNED_STAR: 'goToUnownedStar',
    ATTACK_SHIP: 'attackShip',
    FORM_FLEET: 'formFleet',
    BUILD_SHIP: 'buildShip',
    DEFEND_STAR: 'defendStar',
    DO_NOTHING: 'doNothing'
};

module.exports = {
    AIBase,
    AIDecision,
    AIActions
};
