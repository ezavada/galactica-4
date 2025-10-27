// Spatial Utilities for Galactica-4
// Provides helper functions for spatial calculations and coordinate conversions

const Common = require('./common.js');

/**
 * Helper functions for spatial calculations
 */
const SpatialUtils = {
    /**
     * Get sector coordinates from galactic coordinates
     */
    getSectorFromGalactic(galacticX, galacticY) {
        return {
            sectorX: Math.floor(galacticX / Common.SpatialConstants.PIXELS_PER_SECTOR),
            sectorY: Math.floor(galacticY / Common.SpatialConstants.PIXELS_PER_SECTOR)
        };
    },
    
    /**
     * Get cell coordinates within a sector from galactic coordinates
     */
    getCellFromGalactic(galacticX, galacticY) {
        const sector = SpatialUtils.getSectorFromGalactic(galacticX, galacticY);
        const localX = galacticX - (sector.sectorX * Common.SpatialConstants.PIXELS_PER_SECTOR);
        const localY = galacticY - (sector.sectorY * Common.SpatialConstants.PIXELS_PER_SECTOR);
        
        return {
            cellX: Math.floor(localX / Common.SpatialConstants.PIXELS_PER_CELL),
            cellY: Math.floor(localY / Common.SpatialConstants.PIXELS_PER_CELL)
        };
    },
    
    /**
     * Get all cells within scanner range of a position
     */
    getCellsInRange(centerX, centerY, range) {
        const cells = [];
        const centerSector = SpatialUtils.getSectorFromGalactic(centerX, centerY);
        const centerCell = SpatialUtils.getCellFromGalactic(centerX, centerY);
        
        // Calculate how many cells the range covers
        const cellsInRange = Math.ceil(range / Common.SpatialConstants.PIXELS_PER_CELL);
        
        // Check cells in current sector and adjacent sectors
        for (let sectorOffsetX = -1; sectorOffsetX <= 1; sectorOffsetX++) {
            for (let sectorOffsetY = -1; sectorOffsetY <= 1; sectorOffsetY++) {
                const sectorX = centerSector.sectorX + sectorOffsetX;
                const sectorY = centerSector.sectorY + sectorOffsetY;
                
                // Determine cell range for this sector
                let minCellX = 0, maxCellX = Common.SpatialConstants.CELLS_PER_SECTOR - 1;
                let minCellY = 0, maxCellY = Common.SpatialConstants.CELLS_PER_SECTOR - 1;
                
                if (sectorOffsetX === 0 && sectorOffsetY === 0) {
                    // Current sector - use actual cell range
                    minCellX = Math.max(0, centerCell.cellX - cellsInRange);
                    maxCellX = Math.min(Common.SpatialConstants.CELLS_PER_SECTOR - 1, centerCell.cellX + cellsInRange);
                    minCellY = Math.max(0, centerCell.cellY - cellsInRange);
                    maxCellY = Math.min(Common.SpatialConstants.CELLS_PER_SECTOR - 1, centerCell.cellY + cellsInRange);
                }
                
                // Add all cells in range for this sector
                for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                    for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                        cells.push({
                            sectorX: sectorX,
                            sectorY: sectorY,
                            cellX: cellX,
                            cellY: cellY
                        });
                    }
                }
            }
        }
        
        return cells;
    },
    
    /**
     * Calculate distance between two points
     */
    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * Check if a point is within a circular range
     */
    isWithinRange(centerX, centerY, targetX, targetY, range) {
        const distance = SpatialUtils.calculateDistance(centerX, centerY, targetX, targetY);
        return distance <= range;
    },
    
    /**
     * Get bounding box for a circular range
     */
    getRangeBounds(centerX, centerY, range) {
        return {
            minX: centerX - range,
            maxX: centerX + range,
            minY: centerY - range,
            maxY: centerY + range
        };
    },
    
    /**
     * Convert galactic coordinates to screen coordinates (if camera is available)
     */
    galacticToScreen(galacticX, galacticY, camera) {
        if (!camera) {
            return { screenX: galacticX, screenY: galacticY };
        }
        
        // This would use the camera's zoom and pan to convert coordinates
        // For now, return the galactic coordinates as-is
        return { screenX: galacticX, screenY: galacticY };
    },
    
    /**
     * Convert screen coordinates to galactic coordinates (if camera is available)
     */
    screenToGalactic(screenX, screenY, camera) {
        if (!camera) {
            return { galacticX: screenX, galacticY: screenY };
        }
        
        // This would use the camera's zoom and pan to convert coordinates
        // For now, return the screen coordinates as-is
        return { galacticX: screenX, galacticY: screenY };
    }
};

module.exports = SpatialUtils;
