// Spatial Partitioning System for Galactica-4
// Provides efficient O(k) entity lookup instead of O(n²) for visibility calculations

const Common = require('./common.js');
const SpatialUtils = require('./spatial-utils.js');

class SpatialCell {
    constructor(sectorX, sectorY, cellX, cellY) {
        this.sectorX = sectorX;
        this.sectorY = sectorY;
        this.cellX = cellX;
        this.cellY = cellY;
        this.stars = [];      // Stars in this cell (don't move)
        this.ships = [];      // Ships in this cell (move frequently)
        this.defense = [];    // Defense satellites (part of star systems)
        this.fleets = [];     // Fleets in this cell (move frequently)
    }
    
    addEntity(entity, entityType) {
        switch (entityType) {
            case Common.SpatialConstants.ENTITY_TYPE_STAR:
                if (!this.stars.includes(entity)) {
                    this.stars.push(entity);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_SHIP:
                if (!this.ships.includes(entity)) {
                    this.ships.push(entity);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_DEFENSE:
                if (!this.defense.includes(entity)) {
                    this.defense.push(entity);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_FLEET:
                if (!this.fleets.includes(entity)) {
                    this.fleets.push(entity);
                }
                break;
        }
    }
    
    removeEntity(entity, entityType) {
        switch (entityType) {
            case Common.SpatialConstants.ENTITY_TYPE_STAR:
                const starIndex = this.stars.indexOf(entity);
                if (starIndex !== -1) {
                    this.stars.splice(starIndex, 1);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_SHIP:
                const shipIndex = this.ships.indexOf(entity);
                if (shipIndex !== -1) {
                    this.ships.splice(shipIndex, 1);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_DEFENSE:
                const defenseIndex = this.defense.indexOf(entity);
                if (defenseIndex !== -1) {
                    this.defense.splice(defenseIndex, 1);
                }
                break;
            case Common.SpatialConstants.ENTITY_TYPE_FLEET:
                const fleetIndex = this.fleets.indexOf(entity);
                if (fleetIndex !== -1) {
                    this.fleets.splice(fleetIndex, 1);
                }
                break;
        }
    }
    
    getAllEntities() {
        return [...this.stars, ...this.ships, ...this.defense, ...this.fleets];
    }
    
    getEntitiesByType(entityType) {
        switch (entityType) {
            case Common.SpatialConstants.ENTITY_TYPE_STAR:
                return this.stars;
            case Common.SpatialConstants.ENTITY_TYPE_SHIP:
                return this.ships;
            case Common.SpatialConstants.ENTITY_TYPE_DEFENSE:
                return this.defense;
            case Common.SpatialConstants.ENTITY_TYPE_FLEET:
                return this.fleets;
            default:
                return this.getAllEntities();
        }
    }
}

class SpatialSector {
    constructor(sectorX, sectorY) {
        this.sectorX = sectorX;
        this.sectorY = sectorY;
        this.cells = [];
        
        // Initialize 10x10 grid of cells
        for (let cellX = 0; cellX < Common.SpatialConstants.CELLS_PER_SECTOR; cellX++) {
            this.cells[cellX] = [];
            for (let cellY = 0; cellY < Common.SpatialConstants.CELLS_PER_SECTOR; cellY++) {
                this.cells[cellX][cellY] = new SpatialCell(sectorX, sectorY, cellX, cellY);
            }
        }
    }
    
    getCell(cellX, cellY) {
        if (cellX >= 0 && cellX < Common.SpatialConstants.CELLS_PER_SECTOR &&
            cellY >= 0 && cellY < Common.SpatialConstants.CELLS_PER_SECTOR) {
            return this.cells[cellX][cellY];
        }
        return null;
    }
    
    getAllEntities() {
        const entities = [];
        for (let cellX = 0; cellX < Common.SpatialConstants.CELLS_PER_SECTOR; cellX++) {
            for (let cellY = 0; cellY < Common.SpatialConstants.CELLS_PER_SECTOR; cellY++) {
                entities.push(...this.cells[cellX][cellY].getAllEntities());
            }
        }
        return entities;
    }
}

class SpatialPartition {
    constructor() {
        this.sectors = new Map(); // Key: "sectorX,sectorY", Value: SpatialSector
    }
    
    /**
     * Get or create a sector
     */
    getSector(sectorX, sectorY) {
        const key = `${sectorX},${sectorY}`;
        if (!this.sectors.has(key)) {
            this.sectors.set(key, new SpatialSector(sectorX, sectorY));
        }
        return this.sectors.get(key);
    }
    
    /**
     * Get or create a cell
     */
    getCell(sectorX, sectorY, cellX, cellY) {
        const sector = this.getSector(sectorX, sectorY);
        return sector.getCell(cellX, cellY);
    }
    
    /**
     * Add an entity to the spatial partition
     */
    addEntity(entity, entityType) {
        const sector = SpatialUtils.getSectorFromGalactic(entity.x, entity.y);
        const cell = SpatialUtils.getCellFromGalactic(entity.x, entity.y);
        
        const spatialCell = this.getCell(sector.sectorX, sector.sectorY, cell.cellX, cell.cellY);
        spatialCell.addEntity(entity, entityType);
        
        // Store spatial location on entity for quick updates
        entity._spatialLocation = {
            sectorX: sector.sectorX,
            sectorY: sector.sectorY,
            cellX: cell.cellX,
            cellY: cell.cellY
        };
    }
    
    /**
     * Remove an entity from the spatial partition
     */
    removeEntity(entity, entityType) {
        if (!entity._spatialLocation) return;
        
        const { sectorX, sectorY, cellX, cellY } = entity._spatialLocation;
        const spatialCell = this.getCell(sectorX, sectorY, cellX, cellY);
        spatialCell.removeEntity(entity, entityType);
        
        delete entity._spatialLocation;
    }
    
    /**
     * Update entity position in spatial partition
     */
    updateEntityPosition(entity, entityType, newX, newY) {
        // Remove from old location
        this.removeEntity(entity, entityType);
        
        // Update entity coordinates
        entity.x = newX;
        entity.y = newY;
        
        // Add to new location
        this.addEntity(entity, entityType);
    }
    
    /**
     * Get all entities within scanner range of a position
     */
    getEntitiesInRange(centerX, centerY, range) {
        const entities = [];
        const cellsInRange = SpatialUtils.getCellsInRange(centerX, centerY, range);
        
        for (const cellInfo of cellsInRange) {
            const cell = this.getCell(cellInfo.sectorX, cellInfo.sectorY, cellInfo.cellX, cellInfo.cellY);
            if (cell) {
                // Filter entities by actual distance
                for (const entity of cell.getAllEntities()) {
                    const distance = Math.sqrt((entity.x - centerX) ** 2 + (entity.y - centerY) ** 2);
                    if (distance <= range) {
                        entities.push(entity);
                    }
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Get entities of specific type within range
     */
    getEntitiesInRangeByType(centerX, centerY, range, entityType) {
        const entities = [];
        const cellsInRange = SpatialUtils.getCellsInRange(centerX, centerY, range);
        
        for (const cellInfo of cellsInRange) {
            const cell = this.getCell(cellInfo.sectorX, cellInfo.sectorY, cellInfo.cellX, cellInfo.cellY);
            if (cell) {
                // Filter entities by actual distance and type
                for (const entity of cell.getEntitiesByType(entityType)) {
                    const distance = Math.sqrt((entity.x - centerX) ** 2 + (entity.y - centerY) ** 2);
                    if (distance <= range) {
                        entities.push(entity);
                    }
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Get all entities in the partition (for debugging/statistics)
     */
    getAllEntities() {
        const entities = [];
        for (const sector of this.sectors.values()) {
            entities.push(...sector.getAllEntities());
        }
        return entities;
    }
    
    /**
     * Get statistics about the spatial partition
     */
    getStats() {
        let totalEntities = 0;
        let totalStars = 0;
        let totalShips = 0;
        let totalDefense = 0;
        let totalFleets = 0;
        
        for (const sector of this.sectors.values()) {
            for (let cellX = 0; cellX < Common.SpatialConstants.CELLS_PER_SECTOR; cellX++) {
                for (let cellY = 0; cellY < Common.SpatialConstants.CELLS_PER_SECTOR; cellY++) {
                    const cell = sector.getCell(cellX, cellY);
                    if (cell) {
                        totalEntities += cell.getAllEntities().length;
                        totalStars += cell.stars.length;
                        totalShips += cell.ships.length;
                        totalDefense += cell.defense.length;
                        totalFleets += cell.fleets.length;
                    }
                }
            }
        }
        
        return {
            totalSectors: this.sectors.size,
            totalEntities: totalEntities,
            totalStars: totalStars,
            totalShips: totalShips,
            totalDefense: totalDefense,
            totalFleets: totalFleets
        };
    }
}

module.exports = { SpatialPartition, SpatialSector, SpatialCell };
