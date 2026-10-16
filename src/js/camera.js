// PDG camera adapter for Galactica-4
// Manages view transformation (zoom + pan) for the map display

class Camera {
    constructor(port, mapWidth, mapHeight) {
        this.port = port;
        this.view = new pdg.Camera();
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        
        // Camera state
        this.zoom = 1.0;           // Zoom level (1.0 = normal, >1.0 = zoomed in)
        this.panX = 0;             // Pan offset in galactic coordinates
        this.panY = 0;             // Pan offset in galactic coordinates
        this.panClock = new pdg.Scene();
        this.panClock.setManual(true);
        this.panClock.addAnimated(this.view);
        this.view.registerAnimatedValue('panX',this,'panX');
        this.view.registerAnimatedValue('panY',this,'panY');
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
    
    // The game stores galactic units (1024 per pixel). Keep that conversion
    // at the boundary, and let PDG own the view/inverse transforms.
    syncView() {
        const area = this.getDrawingArea();
        const width = area.width(), height = area.height();
        const state = this.viewState;
        if (state && state.width === width && state.height === height &&
            state.zoom === this.zoom && state.panX === this.panX && state.panY === this.panY &&
            state.mapWidth === this.mapWidth && state.mapHeight === this.mapHeight) return;
        this.viewState = { width, height, zoom: this.zoom, panX: this.panX, panY: this.panY,
            mapWidth: this.mapWidth, mapHeight: this.mapHeight };
        this.view.setViewport(new pdg.Rect(width, height));
        this.view.setZoom(this.zoom);
        this.view.setLocation(
            this.panX * this.scale + this.mapWidth * this.scale / (2 * this.zoom),
            this.panY * this.scale + this.mapHeight * this.scale / (2 * this.zoom)
        );
    }

    toScreenX(galacticX) {
        this.syncView();
        return this.view.worldToView(new pdg.Point(galacticX * this.scale, 0)).x;
    }

    toScreenY(galacticY) {
        this.syncView();
        return this.view.worldToView(new pdg.Point(0, galacticY * this.scale)).y;
    }

    toGalacticX(screenX) {
        this.syncView();
        return this.view.viewToWorld(new pdg.Point(screenX, 0)).x / this.scale;
    }

    toGalacticY(screenY) {
        this.syncView();
        return this.view.viewToWorld(new pdg.Point(0, screenY)).y / this.scale;
    }

    // Zoom functions
    setZoom(newZoom) {
        this.stopWhipPan();
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.updateScaleAndOffsets();
        this.updatePanLimits();
    }
    
    // Zoom to a specific point, maintaining its screen position
    zoomToPoint(newZoom, galacticX, galacticY, screenX, screenY) {
        this.setZoom(newZoom);
        this.panX += galacticX - this.toGalacticX(screenX);
        this.panY += galacticY - this.toGalacticY(screenY);
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
    
    zoomIn(factor = 1.2, selectedObject = null, mouseX, mouseY) {
        this.stopWhipPan();
        if (this.zoom >= this.maxZoom) return;
        const target = this.getZoomTargetPoint(selectedObject, mouseX, mouseY);
        this.zoomToPoint(this.zoom * factor, target.galacticX, target.galacticY, target.screenX, target.screenY);
    }

    zoomOut(factor = 1.2, selectedObject = null, mouseX, mouseY) {
        this.stopWhipPan();
        if (this.zoom <= this.minZoom) return;
        const target = this.getZoomTargetPoint(selectedObject, mouseX, mouseY);
        this.zoomToPoint(this.zoom / factor, target.galacticX, target.galacticY, target.screenX, target.screenY);
    }

    zoomToScreenPoint(newZoom, screenX, screenY) {
        this.stopWhipPan();
        const x = this.toGalacticX(screenX);
        const y = this.toGalacticY(screenY);
        this.zoomToPoint(newZoom, x, y, screenX, screenY);
    }

    // Pan functions
    pan(deltaX, deltaY) {
        this.stopWhipPan();
        // Convert screen coordinate delta to galactic coordinate delta
        // deltaX and deltaY are in screen coordinates, but panX/panY are in galactic coordinates
        const galacticDeltaX = deltaX / (this.zoom * this.scale);
        const galacticDeltaY = deltaY / (this.zoom * this.scale);
        this.panX += galacticDeltaX;
        this.panY += galacticDeltaY;
        this.clampPan();
    }
    
    setPan(x, y) {
        this.stopWhipPan();
        this.panX = x;
        this.panY = y;
        this.clampPan();
    }
    
    // Center view on a specific galactic coordinate
    centerOn(galacticX, galacticY) {
        this.stopWhipPan();
        const area = this.getDrawingArea();
        this.panX += galacticX - this.toGalacticX(area.width() / 2);
        this.panY += galacticY - this.toGalacticY(area.height() / 2);
        this.clampPan();
    }

    // Presentation-only fast navigation. All transforms use the interpolated
    // pose, so picking, backgrounds and scroll bars stay aligned with the map.
    whipPanTo(galacticX,galacticY,time=pdg.tm.getMilliseconds()) {
        this.update(time);this.whipPan=null;
        const fromX=this.panX,fromY=this.panY;
        this.centerOn(galacticX,galacticY);
        const toX=this.panX,toY=this.panY;
        if(fromX===toX && fromY===toY)return;
        this.panX=fromX;this.panY=fromY;
        this.view.animateValueTo('panX',toX,.24,pdg.easeInOutQuint)
            .animateValueTo('panY',toY,.24,pdg.easeInOutQuint);
        // Native animated values are floats; retain the exact starting pose.
        this.panX=fromX;this.panY=fromY;
        this.whipPan={toX,toY,start:time,elapsed:0};
    }

    update(time=pdg.tm.getMilliseconds()) {
        const motion=this.whipPan;if(!motion)return;
        const elapsed=Math.max(motion.elapsed,Math.min(240,time-motion.start));
        this.panClock.advance((elapsed-motion.elapsed)/1000);
        motion.elapsed=elapsed;
        if(elapsed===240){this.panX=motion.toX;this.panY=motion.toY;this.whipPan=null;}
    }

    stopWhipPan() {
        this.update();this.view.cancelSchedule();this.whipPan=null;
    }

    dispose() {
        this.view.cancelSchedule().unregisterAnimatedValue('panX').unregisterAnimatedValue('panY');
        this.panClock.dispose();
    }

    // Reset to default view (show entire map)
    resetView() {
        this.stopWhipPan();
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
