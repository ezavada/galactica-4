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
        this.offsetX = 0;          // Screen offset for centering
        this.offsetY = 0;          // Screen offset for centering
        this.scale = 1.0;          // Base scale factor for aspect ratio
        
        // Zoom limits
        this.minZoom = 0.1;        // Can zoom out to see entire map
        this.maxZoom = 10.0;       // Can zoom in for detail
        
        // Initialize scale and offsets
        this.updateScaleAndOffsets();
        
        // Pan limits (prevent panning beyond map bounds)
        this.updatePanLimits();
    }
    
    // Get the current drawing area from the port
    getDrawingArea() {
        return this.port.getDrawingArea();
    }
    
    // Update scale and centering offsets based on current screen size
    updateScaleAndOffsets() {
        const drawingArea = this.getDrawingArea();
        // Calculate scale so that at 1:1 zoom, each sector (1024*1024 galactic units) = 1024 pixels
        // So: 1024 galactic units = 1 pixel at zoom 1.0
        // Therefore: scale = 1 / 1024
        this.scale = 1 / 1024;
        // Calculate centering offsets
        this.offsetX = (drawingArea.width() - this.mapWidth * this.scale) / 2;
        this.offsetY = (drawingArea.height() - this.mapHeight * this.scale) / 2;
    }
    
    // Call this when the screen size changes (e.g., window resize)
    onScreenSizeChanged() {
        this.updateScaleAndOffsets();
        this.updatePanLimits();
    }
    
    // Convert galactic coordinates to screen coordinates with camera transform
    toScreenX(galacticX) {
        return ((galacticX - this.panX) * this.zoom * this.scale) + this.offsetX;
    }
    
    toScreenY(galacticY) {
        return ((galacticY - this.panY) * this.zoom * this.scale) + this.offsetY;
    }
    
    // Convert screen coordinates to galactic coordinates with camera transform
    toGalacticX(screenX) {
        return ((screenX - this.offsetX) / (this.zoom * this.scale)) + this.panX;
    }
    
    toGalacticY(screenY) {
        return ((screenY - this.offsetY) / (this.zoom * this.scale)) + this.panY;
    }
    
    // Zoom functions
    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.updateScaleAndOffsets();
        this.updatePanLimits();
    }
    
    // Zoom to a specific point, maintaining its screen position
    zoomToPoint(newZoom, galacticX, galacticY, screenX, screenY) {
        const oldZoom = this.zoom;
        const oldOffsetX = this.offsetX;
        const oldOffsetY = this.offsetY;
        const oldScale = this.scale;
        
        this.setZoom(newZoom);
        
        // Calculate the new pan to keep the point at the same screen position
        // Using the inverse of the coordinate conversion formula:
        // screenX = ((galacticX - panX) * zoom * scale) + offsetX
        // Solving for panX: panX = galacticX - ((screenX - offsetX) / (zoom * scale))
        // Use the NEW scale AND NEW offset values (both are recalculated by setZoom)
        const newPanX = galacticX - ((screenX - this.offsetX) / (newZoom * this.scale));
        const newPanY = galacticY - ((screenY - this.offsetY) / (newZoom * this.scale));
        
        this.panX = newPanX;
        this.panY = newPanY;
        
        // For zoom-to-point operations, we prioritize accuracy over pan limits
        // Do not clamp pan values during zoom-to-point to maintain precision
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
            // For mouse position, we want to maintain the screen position
            // So we use the mouse coordinates directly and calculate the galactic coordinates
            // using the current camera state (this will be the "snapshot" at the start of zoom)
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
        if (this.zoom >= this.maxZoom) {
            return;
        }
        let newZoom = this.zoom * factor;
        if (newZoom > this.maxZoom) {
            newZoom = this.maxZoom;
        }
        
        if (selectedObject) {
            // Selected object zoom - use object coordinates
            const screenX = this.toScreenX(selectedObject.x);
            const screenY = this.toScreenY(selectedObject.y);
            this.zoomToPoint(newZoom, selectedObject.x, selectedObject.y, screenX, screenY);
        } else if (mouseX !== undefined && mouseY !== undefined) {
            // Check if mouse is within bounds
            const drawingArea = this.getDrawingArea();
            if (mouseX >= 0 && mouseX < drawingArea.width() && 
                mouseY >= 0 && mouseY < drawingArea.height()) {
                // Mouse position zoom - use pure screen coordinate approach
                this.zoomToScreenPoint(newZoom, mouseX, mouseY);
            } else {
                // Mouse outside bounds - zoom to center
                const centerX = drawingArea.width() / 2;
                const centerY = drawingArea.height() / 2;
                this.zoomToScreenPoint(newZoom, centerX, centerY);
            }
        } else {
            // Center zoom
            const drawingArea = this.getDrawingArea();
            const centerX = drawingArea.width() / 2;
            const centerY = drawingArea.height() / 2;
            this.zoomToScreenPoint(newZoom, centerX, centerY);
        }
    }
    
    zoomOut(factor = 1.2, selectedObject = null, mouseX = undefined, mouseY = undefined) {
        if (this.zoom <= this.minZoom) {
            return;
        }
        let newZoom = this.zoom / factor;
        if (newZoom < this.minZoom) {
            newZoom = this.minZoom;
        }
        
        if (selectedObject) {
            // Selected object zoom - use object coordinates
            const screenX = this.toScreenX(selectedObject.x);
            const screenY = this.toScreenY(selectedObject.y);
            this.zoomToPoint(newZoom, selectedObject.x, selectedObject.y, screenX, screenY);
        } else if (mouseX !== undefined && mouseY !== undefined) {
            // Check if mouse is within bounds
            const drawingArea = this.getDrawingArea();
            if (mouseX >= 0 && mouseX < drawingArea.width() && 
                mouseY >= 0 && mouseY < drawingArea.height()) {
                // Mouse position zoom - use pure screen coordinate approach
                this.zoomToScreenPoint(newZoom, mouseX, mouseY);
            } else {
                // Mouse outside bounds - zoom to center
                const centerX = drawingArea.width() / 2;
                const centerY = drawingArea.height() / 2;
                this.zoomToScreenPoint(newZoom, centerX, centerY);
            }
        } else {
            // Center zoom
            const drawingArea = this.getDrawingArea();
            const centerX = drawingArea.width() / 2;
            const centerY = drawingArea.height() / 2;
            this.zoomToScreenPoint(newZoom, centerX, centerY);
        }
    }
    
    // Zoom to a specific screen point using pure mathematical approach
    zoomToScreenPoint(newZoom, screenX, screenY) {
        // Store the OLD camera state before any changes
        const oldZoom = this.zoom;
        const oldPanX = this.panX;
        const oldPanY = this.panY;
        const oldOffsetX = this.offsetX;
        const oldOffsetY = this.offsetY;
        const oldScale = this.scale;
        
        // Calculate what galactic point the screen point represents in the OLD camera state
        // This is the key: we need to use the OLD camera state to avoid feedback loops
        const galacticX = ((screenX - oldOffsetX) / (oldZoom * oldScale)) + oldPanX;
        const galacticY = ((screenY - oldOffsetY) / (oldZoom * oldScale)) + oldPanY;
        
        // Update zoom (this will recalculate scale and offsets)
        this.setZoom(newZoom);
        
        // Calculate what pan values are needed to keep the same galactic point at the same screen position
        // Formula: pan = galactic - (screen - offset) / (zoom * scale)
        const newPanX = galacticX - ((screenX - this.offsetX) / (newZoom * this.scale));
        const newPanY = galacticY - ((screenY - this.offsetY) / (newZoom * this.scale));
        
        this.panX = newPanX;
        this.panY = newPanY;
        
        // For zoom-to-point operations, we prioritize accuracy over pan limits
        // Do not clamp pan values during zoom-to-point to maintain precision
    }
    
    // Pan functions
    pan(deltaX, deltaY) {
        // Convert screen coordinate delta to galactic coordinate delta
        // deltaX and deltaY are in screen coordinates, but panX/panY are in galactic coordinates
        const galacticDeltaX = deltaX / (this.zoom * this.scale);
        const galacticDeltaY = deltaY / (this.zoom * this.scale);
        this.panX += galacticDeltaX;
        this.panY += galacticDeltaY;
        this.clampPan();
    }
    
    setPan(x, y) {
        this.panX = x;
        this.panY = y;
        this.clampPan();
    }
    
    // Center view on a specific galactic coordinate
    centerOn(galacticX, galacticY) {
        const drawingArea = this.getDrawingArea();
        const centerX = drawingArea.width() / 2;
        const centerY = drawingArea.height() / 2;
        
        // Calculate pan to center the galactic point at the screen center
        // Using the inverse of the coordinate conversion formula:
        // centerX = ((galacticX - panX) * zoom * scale) + offsetX
        // Solving for panX: panX = galacticX - ((centerX - offsetX) / (zoom * scale))
        this.panX = galacticX - ((centerX - this.offsetX) / (this.zoom * this.scale));
        this.panY = galacticY - ((centerY - this.offsetY) / (this.zoom * this.scale));
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
        const drawingArea = this.getDrawingArea();
        
        // Calculate the visible area in galactic coordinates
        // The visible width/height in galactic coordinates depends on the zoom and scale
        const visibleWidth = drawingArea.width() / (this.zoom * this.scale);
        const visibleHeight = drawingArea.height() / (this.zoom * this.scale);
        
        // When zoomed in, we can pan to show different parts of the map
        // minPanX/Y should be negative when map is larger than visible area
        // maxPanX/Y should be positive when map is larger than visible area
        this.minPanX = Math.min(0, this.mapWidth - visibleWidth);
        this.maxPanX = Math.max(0, this.mapWidth - visibleWidth);
        this.minPanY = Math.min(0, this.mapHeight - visibleHeight);
        this.maxPanY = Math.max(0, this.mapHeight - visibleHeight);
    }
    
    clampPan() {
        //this.panX = Math.max(this.minPanX, Math.min(this.maxPanX, this.panX));
        //this.panY = Math.max(this.minPanY, Math.min(this.maxPanY, this.panY));
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
