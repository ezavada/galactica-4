// Visibility Calculator for Galactica-4
// Implements fog of war visibility calculations with spatial partitioning optimization

const Common = require('./common.js');
const SpatialUtils = require('./spatial-utils.js');

class VisibilityCalculator {
    constructor(game) {
        this.game = game;
        
        // Performance counters
        this.stats = {
            distanceCalculations: 0,
            visibilityCalculations: 0,
            entitiesChecked: 0,
            entitiesInRange: 0,
            scannerEntitiesUsed: 0
        };
    }

    /**
     * Calculate visibility of target entity as seen by observer entity
     * Based on original C++ formula: base_visibility = (target_size * scanner_range) / (distance * target_stealth)
     */
    calculateVisibilityToEntity(observer, target) {
        if (!observer || !target) return Common.VisibilityLevel.NONE;
        
        this.stats.visibilityCalculations++;
        const distance = this.calculateDistance(observer, target);
        if (distance === 0) return Common.VisibilityLevel.DETAILS; // Same location
        
        const baseVisibility = (target.getApparentSize() * observer.getScannerRange()) / 
                              (distance * target.getStealth());
        
        return this.visibilityLevelFromBase(baseVisibility);
    }

    /**
     * Convert base visibility value to visibility level
     */
    visibilityLevelFromBase(baseVisibility) {
        const thresholds = Common.FogOfWarConstants.VISIBILITY_THRESHOLDS;
        
        if (baseVisibility >= thresholds.DETAILS) return Common.VisibilityLevel.DETAILS;
        if (baseVisibility >= thresholds.CLASS) return Common.VisibilityLevel.CLASS;
        if (baseVisibility >= thresholds.TECH) return Common.VisibilityLevel.TECH;
        if (baseVisibility >= thresholds.SPEED) return Common.VisibilityLevel.SPEED;
        return Common.VisibilityLevel.NONE;
    }

    /**
     * Calculate distance between two entities
     */
    calculateDistance(entity1, entity2) {
        this.stats.distanceCalculations++;
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate visibility of target for a specific player using spatial partition
     */
    calculateVisibilityToPlayer(target, playerNum) {
        if (!this.game || !this.game.players) {
            return Common.VisibilityLevel.NONE;
        }
        
        const player = this.game.players[playerNum];
        if (!player || player.isComputer === undefined) return Common.VisibilityLevel.NONE;
        
        // Get all entities owned by this player that have scanners
        const playerEntities = this.getPlayerScannerEntities(playerNum);
        
        let bestVisibility = Common.VisibilityLevel.NONE;
        
        for (const entity of playerEntities) {
            // Use spatial partition to check if target is in range
            const entitiesInRange = this.game.spatialPartition.getEntitiesInRange(
                entity.x, entity.y, entity.getScannerRange()
            );
            
            // Only calculate visibility if target is in range
            if (entitiesInRange.includes(target)) {
                const visibility = this.calculateVisibilityToEntity(entity, target);
                if (visibility > bestVisibility) {
                    bestVisibility = visibility;
                }
            }
        }
        
        return bestVisibility;
    }

    /**
     * Get all entities owned by a player that have scanner capability
     * Uses spatial partition for efficient lookup
     */
    getPlayerScannerEntities(playerNum) {
        const entities = [];
        
        // Get all entities in spatial partition
        const allEntities = this.game.spatialPartition.getAllEntities();
        
        for (const entity of allEntities) {
            if (entity.owner === playerNum && entity.getScannerRange() > 0) {
                entities.push(entity);
            }
        }
        
        return entities;
    }

    /**
     * Update visibility for all entities for a specific player
     * Optimized using spatial partition
     */
    updateVisibilityForPlayer(playerNum) {
        const playerEntities = this.getPlayerScannerEntities(playerNum);
        this.stats.scannerEntitiesUsed += playerEntities.length;
        
        // For each scanner entity, update visibility for entities in range
        for (const scanner of playerEntities) {
            const entitiesInRange = this.game.spatialPartition.getEntitiesInRange(
                scanner.x, scanner.y, scanner.getScannerRange()
            );
            this.stats.entitiesInRange += entitiesInRange.length;
            
            for (const target of entitiesInRange) {
                this.stats.entitiesChecked++;
                if (target.owner !== playerNum) { // Don't check visibility to own entities
                    const visibility = this.calculateVisibilityToEntity(scanner, target);
                    const currentVisibility = target.getVisibilityTo(playerNum);
                    
                    if (visibility > currentVisibility) {
                        target.setVisibilityTo(playerNum, visibility);
                        target.setLastSeen(playerNum, this.game.turn);
                    }
                }
            }
        }
    }

    /**
     * Update visibility for all players for all entities
     */
    updateAllVisibility() {
        if (!this.game || !this.game.players) return;
        
        for (let playerNum = 1; playerNum <= this.game.config.totalPlayers; playerNum++) {
            this.updateVisibilityForPlayer(playerNum);
        }
    }

    /**
     * Get entities visible to a specific player
     * Uses spatial partitioning to only check entities within scanner range
     */
    getVisibleEntitiesForPlayer(playerNum) {
        // If omniscient mode is enabled, return all entities
        if (this.game.config && this.game.config.omniscient) {
            return [...this.game.stars, ...this.game.allShips].filter(entity => entity.owner !== playerNum);
        }
        
        const visibleEntities = [];
        const playerEntities = this.getPlayerScannerEntities(playerNum);
        
        // For each scanner entity, find entities in range and check visibility
        for (const scanner of playerEntities) {
            const entitiesInRange = this.game.spatialPartition.getEntitiesInRange(
                scanner.x, scanner.y, scanner.getScannerRange()
            );
            
            for (const entity of entitiesInRange) {
                if (entity.owner !== playerNum && !visibleEntities.includes(entity)) {
                    // Only add if not already in the list and not owned by the player
                    const visibility = this.calculateVisibilityToEntity(scanner, entity);
                    if (visibility > Common.VisibilityLevel.NONE) {
                        visibleEntities.push(entity);
                    }
                }
            }
        }
        
        return visibleEntities;
    }

    /**
     * Get entities of specific type visible to a player
     * Uses spatial partitioning to only check entities within scanner range
     */
    getVisibleEntitiesByTypeForPlayer(playerNum, entityType) {
        // If omniscient mode is enabled, return all entities of the specified type
        if (this.game.config && this.game.config.omniscient) {
            const allEntities = entityType === Common.SpatialConstants.ENTITY_TYPE_STAR ? 
                this.game.stars : this.game.allShips;
            return allEntities.filter(entity => entity.owner !== playerNum);
        }
        
        const visibleEntities = [];
        const playerEntities = this.getPlayerScannerEntities(playerNum);
        
        // For each scanner entity, find entities in range and check visibility
        for (const scanner of playerEntities) {
            const entitiesInRange = this.game.spatialPartition.getEntitiesInRange(
                scanner.x, scanner.y, scanner.getScannerRange()
            );
            
            for (const entity of entitiesInRange) {
                if (entity.owner !== playerNum && !visibleEntities.includes(entity)) {
                    // Check entity type first to avoid unnecessary visibility calculations
                    const isStar = this.game.factory.isStar(entity);
                    const isShip = this.game.factory.isShip(entity);
                    
                    const isCorrectType = (entityType === Common.SpatialConstants.ENTITY_TYPE_STAR && isStar) ||
                                        (entityType === Common.SpatialConstants.ENTITY_TYPE_SHIP && isShip);
                    
                    if (isCorrectType) {
                        const visibility = this.calculateVisibilityToEntity(scanner, entity);
                        if (visibility > Common.VisibilityLevel.NONE) {
                            visibleEntities.push(entity);
                        }
                    }
                }
            }
        }
        
        return visibleEntities;
    }

    /**
     * Check if an entity is visible to a player
     */
    isEntityVisibleToPlayer(entity, playerNum) {
        if (!entity || !playerNum) return false;
        
        // If omniscient mode is enabled, all entities are visible
        if (this.game.config && this.game.config.omniscient) {
            return entity.owner !== playerNum;
        }
        
        return entity.isVisibleTo(playerNum);
    }

    /**
     * Get visibility statistics for debugging
     */
    getVisibilityStats() {
        const stats = {
            totalPlayers: this.game.config.totalPlayers,
            visibilityByPlayer: {}
        };
        
        for (let playerNum = 1; playerNum <= this.game.config.totalPlayers; playerNum++) {
            const visibleEntities = this.getVisibleEntitiesForPlayer(playerNum);
            stats.visibilityByPlayer[playerNum] = {
                totalVisible: visibleEntities.length,
                visibleStars: visibleEntities.filter(e => this.game.factory.isStar(e)).length,
                visibleShips: visibleEntities.filter(e => this.game.factory.isShip(e)).length
            };
        }
        
        return stats;
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return { ...this.stats };
    }
    
    /**
     * Reset performance counters
     */
    resetPerformanceStats() {
        this.stats = {
            distanceCalculations: 0,
            visibilityCalculations: 0,
            entitiesChecked: 0,
            entitiesInRange: 0,
            scannerEntitiesUsed: 0
        };
    }
}

module.exports = VisibilityCalculator;

