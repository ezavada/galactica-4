// Camera class for Galactica-4
// Manages view transformation (zoom + pan) for the map display

class Camera {
    constructor(port, mapWidth, mapHeight) {
        this.port = port;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        
        // Camera state
        this.zoom = 1.0;           // Zoom level (1.0 = normal, >1.0 = zoomed in)
        this.panX = 0;             // Pan offset in galactic coordinates
        this.panY = 0;             // Pan offset in galactic coordinates
        
        // Zoom limits
        this.minZoom = 0.1;        // Can zoom out to see entire map
        this.maxZoom = 10.0;       // Can zoom in for detail
        
        // Pan limits (prevent panning beyond map bounds)
        this.updatePanLimits();
    }
    
    // Get the current drawing area from the port
    getDrawingArea() {
        return this.port.getDrawingArea();
    }
    
    // Convert galactic coordinates to screen coordinates with camera transform
    toScreenX(galacticX) {
        const drawingArea = this.getDrawingArea();
        // Use uniform scaling to maintain aspect ratio
        const scale = Math.min(drawingArea.width() / this.mapWidth, drawingArea.height() / this.mapHeight);
        // Center the map in the screen
        const offsetX = (drawingArea.width() - this.mapWidth * scale) / 2;
        return ((galacticX - this.panX) * this.zoom * scale) + offsetX;
    }
    
    toScreenY(galacticY) {
        const drawingArea = this.getDrawingArea();
        // Use uniform scaling to maintain aspect ratio
        const scale = Math.min(drawingArea.width() / this.mapWidth, drawingArea.height() / this.mapHeight);
        // Center the map in the screen
        const offsetY = (drawingArea.height() - this.mapHeight * scale) / 2;
        return ((galacticY - this.panY) * this.zoom * scale) + offsetY;
    }
    
    // Convert screen coordinates to galactic coordinates with camera transform
    toGalacticX(screenX) {
        const drawingArea = this.getDrawingArea();
        // Use uniform scaling to maintain aspect ratio
        const scale = Math.min(drawingArea.width() / this.mapWidth, drawingArea.height() / this.mapHeight);
        // Center the map in the screen
        const offsetX = (drawingArea.width() - this.mapWidth * scale) / 2;
        return ((screenX - offsetX) / (this.zoom * scale)) + this.panX;
    }
    
    toGalacticY(screenY) {
        const drawingArea = this.getDrawingArea();
        // Use uniform scaling to maintain aspect ratio
        const scale = Math.min(drawingArea.width() / this.mapWidth, drawingArea.height() / this.mapHeight);
        // Center the map in the screen
        const offsetY = (drawingArea.height() - this.mapHeight * scale) / 2;
        return ((screenY - offsetY) / (this.zoom * scale)) + this.panY;
    }
    
    // Zoom functions
    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.updatePanLimits();
    }
    
    // Zoom to a specific point, maintaining its screen position
    zoomToPoint(newZoom, galacticX, galacticY, screenX, screenY) {
        const oldZoom = this.zoom;
        this.setZoom(newZoom);
        
        // Calculate the new pan to keep the point at the same screen position
        const zoomRatio = this.zoom / oldZoom;
        this.panX = galacticX - (screenX / this.zoom) * (this.mapWidth / this.getDrawingArea().width());
        this.panY = galacticY - (screenY / this.zoom) * (this.mapHeight / this.getDrawingArea().height());
        this.clampPan();
    }
    
    // Determine the best zoom target point based on priority
    getZoomTargetPoint(selectedObject, mouseX, mouseY) {
        const drawingArea = this.getDrawingArea();
        
        // Priority 1: Selected object
        if (selectedObject) {
            const screenX = this.toScreenX(selectedObject.x);
            const screenY = this.toScreenY(selectedObject.y);
            return {
                galacticX: selectedObject.x,
                galacticY: selectedObject.y,
                screenX: screenX,
                screenY: screenY
            };
        }
        
        // Priority 2: Mouse position if within drawing area
        if (mouseX !== undefined && mouseY !== undefined && 
            mouseX >= 0 && mouseX < drawingArea.width() && 
            mouseY >= 0 && mouseY < drawingArea.height()) {
            const galacticX = this.toGalacticX(mouseX);
            const galacticY = this.toGalacticY(mouseY);
            return {
                galacticX: galacticX,
                galacticY: galacticY,
                screenX: mouseX,
                screenY: mouseY
            };
        }
        
        // Priority 3: Center of drawing area
        const centerX = drawingArea.width() / 2;
        const centerY = drawingArea.height() / 2;
        const galacticX = this.toGalacticX(centerX);
        const galacticY = this.toGalacticY(centerY);
        return {
            galacticX: galacticX,
            galacticY: galacticY,
            screenX: centerX,
            screenY: centerY
        };
    }
    
    zoomIn(factor = 1.2, selectedObject = null, mouseX = undefined, mouseY = undefined) {
        const target = this.getZoomTargetPoint(selectedObject, mouseX, mouseY);
        const newZoom = this.zoom * factor;
        this.zoomToPoint(newZoom, target.galacticX, target.galacticY, target.screenX, target.screenY);
    }
    
    zoomOut(factor = 1.2, selectedObject = null, mouseX = undefined, mouseY = undefined) {
        const target = this.getZoomTargetPoint(selectedObject, mouseX, mouseY);
        const newZoom = this.zoom / factor;
        this.zoomToPoint(newZoom, target.galacticX, target.galacticY, target.screenX, target.screenY);
    }
    
    // Pan functions
    pan(deltaX, deltaY) {
        this.panX += deltaX;
        this.panY += deltaY;
        this.clampPan();
    }
    
    setPan(x, y) {
        this.panX = x;
        this.panY = y;
        this.clampPan();
    }
    
    // Center view on a specific galactic coordinate
    centerOn(galacticX, galacticY) {
        const visibleWidth = this.mapWidth / this.zoom;
        const visibleHeight = this.mapHeight / this.zoom;
        this.panX = galacticX - visibleWidth / 2;
        this.panY = galacticY - visibleHeight / 2;
        this.clampPan();
    }
    
    // Reset to default view (show entire map)
    resetView() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
    }
    
    // Zoom to fit entire map in view
    zoomToFit() {
        const drawingArea = this.getDrawingArea();
        const scaleX = drawingArea.width() / this.mapWidth;
        const scaleY = drawingArea.height() / this.mapHeight;
        const zoom = Math.min(scaleX, scaleY);
        this.setZoom(zoom);
        
        // Center on the middle of the coordinate space
        this.centerOn(this.mapWidth / 2, this.mapHeight / 2);
    }
    
    // Zoom to fit specific content bounds
    zoomToFitBounds(minX, minY, maxX, maxY, padding = 50) {
        const drawingArea = this.getDrawingArea();
        
        // Calculate the content dimensions in galactic coordinates
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // Add padding around the content (in galactic coordinates)
        const paddedWidth = contentWidth + (padding * 2);
        const paddedHeight = contentHeight + (padding * 2);
        
        // Calculate zoom level to fit content in viewport
        // The content spans a certain percentage of the map, so we need to zoom in accordingly
        const contentRatioX = paddedWidth / this.mapWidth;
        const contentRatioY = paddedHeight / this.mapHeight;
        
        // Calculate the zoom needed to fit this content ratio in the screen
        const scaleX = 1.0 / contentRatioX;
        const scaleY = 1.0 / contentRatioY;
        const zoom = Math.min(scaleX, scaleY);
        
        
        // Set the zoom level
        this.setZoom(zoom);
        
        // Center on the content
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        this.centerOn(centerX, centerY);
    }
    
    // Get current visible area in galactic coordinates
    getVisibleBounds() {
        const visibleWidth = this.mapWidth / this.zoom;
        const visibleHeight = this.mapHeight / this.zoom;
        
        return {
            left: this.panX,
            top: this.panY,
            right: this.panX + visibleWidth,
            bottom: this.panY + visibleHeight,
            width: visibleWidth,
            height: visibleHeight
        };
    }
    
    // Check if a galactic coordinate is visible in current view
    isVisible(galacticX, galacticY) {
        const bounds = this.getVisibleBounds();
        return galacticX >= bounds.left && galacticX <= bounds.right &&
               galacticY >= bounds.top && galacticY <= bounds.bottom;
    }
    
    // Helper functions
    updatePanLimits() {
        const visibleWidth = this.mapWidth / this.zoom;
        const visibleHeight = this.mapHeight / this.zoom;
        
        // When zoomed in, we can pan to show different parts of the map
        // minPanX/Y should be negative to allow panning left/up
        // maxPanX/Y should be positive to allow panning right/down
        this.minPanX = Math.min(0, this.mapWidth - visibleWidth);
        this.maxPanX = Math.max(0, this.mapWidth - visibleWidth);
        this.minPanY = Math.min(0, this.mapHeight - visibleHeight);
        this.maxPanY = Math.max(0, this.mapHeight - visibleHeight);
    }
    
    clampPan() {
        this.panX = Math.max(this.minPanX, Math.min(this.maxPanX, this.panX));
        this.panY = Math.max(this.minPanY, Math.min(this.maxPanY, this.panY));
    }
    
    // Update map dimensions (called when map size changes)
    updateMapSize(mapWidth, mapHeight) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.updatePanLimits();
        this.clampPan();
    }
    
    // Get zoom level as percentage
    getZoomPercentage() {
        return Math.round(this.zoom * 100);
    }
}

module.exports = Camera;
