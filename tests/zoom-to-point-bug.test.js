// Test to reproduce the zoom-to-point coordinate drift bug
const test = require('./test-framework.js');
const Camera = require('../src/js/camera.js');

// Mock port that simulates a large window
const mockPort = {
    getDrawingArea() {
        return { 
            width() { return 1200; }, 
            height() { return 800; } 
        };
    }
};

function runZoomToPointBugTests() {
    test.describe('Zoom-to-Point Coordinate Drift Bug', () => {
        test.it('should maintain star position during zoom operations', () => {
            const camera = new Camera(mockPort, 1048576, 1048576); // 1-sector map
            
            // Place a star at the top center of the map
            const starX = 1048576 / 2; // Center X
            const starY = 1048576 / 8; // Top 1/8 of map (top center)
            
            console.log(`\n=== Testing star at top center of map ===`);
            console.log(`Star position: galactic(${starX}, ${starY})`);
            
            // Start zoomed out to see the whole map
            camera.setZoom(0.3);
            camera.centerOn(starX, starY);
            
            // Get initial screen position of the star
            const initialScreenX = camera.toScreenX(starX);
            const initialScreenY = camera.toScreenY(starY);
            console.log(`Initial screen position: (${initialScreenX.toFixed(1)}, ${initialScreenY.toFixed(1)})`);
            
            // Mock mouse pointing at the star
            const mouseX = initialScreenX;
            const mouseY = initialScreenY;
            console.log(`Mouse pointing at: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`);
            
            // Test zooming in step by step
            const zoomSteps = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
            
            for (let i = 0; i < zoomSteps.length; i++) {
                const newZoom = zoomSteps[i];
                console.log(`--- Zoom step ${i + 1}: ${camera.zoom.toFixed(2)} -> ${newZoom.toFixed(2)} ---`);
                 
                // Get current target point (this is where the bug happens)
                const target = camera.getZoomTargetPoint(null, mouseX, mouseY);
                
                // Perform zoom-to-point
                camera.zoomToPoint(newZoom, target.galacticX, target.galacticY, target.screenX, target.screenY);
                
                // Check where the star actually ended up on screen
                const actualScreenX = camera.toScreenX(starX);
                const actualScreenY = camera.toScreenY(starY);
                const errorX = Math.abs(actualScreenX - mouseX);
                const errorY = Math.abs(actualScreenY - mouseY);
                
                console.log(`Star actual position: (${actualScreenX.toFixed(1)}, ${actualScreenY.toFixed(1)})`);
               
                // The error should be small (within a few pixels)
                if (errorX > 10 || errorY > 10) {
                    console.log(`Target: galactic(${target.galacticX.toFixed(0)}, ${target.galacticY.toFixed(0)}) screen(${target.screenX.toFixed(1)}, ${target.screenY.toFixed(1)})`);
                     console.log(`Error: X=${errorX.toFixed(1)}, Y=${errorY.toFixed(1)}`);
                    console.log(`❌ LARGE ERROR DETECTED! Star has drifted significantly from mouse position.`);
                    console.log(`   Expected: (${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`);
                    console.log(`   Actual: (${actualScreenX.toFixed(1)}, ${actualScreenY.toFixed(1)})`);
                    console.log(`   This is the bug!`);
                    throw new Error(`Zoom-to-point drift detected: error X=${errorX.toFixed(1)}, Y=${errorY.toFixed(1)}`);
                }
            }
        });
        
        test.it('should show coordinate conversion consistency', () => {
            const camera = new Camera(mockPort, 1048576, 1048576);
            
            // Test coordinate conversion consistency at different zoom levels
            const testPoints = [
                { galacticX: 524288, galacticY: 131072 }, // Top center
                { galacticX: 524288, galacticY: 524288 }, // Center
                { galacticX: 524288, galacticY: 917504 }   // Bottom center
            ];
            
            const zoomLevels = [0.3, 0.5, 0.7, 1.0, 1.5, 2.0];
            
            console.log(`\n=== Testing coordinate conversion consistency ===`);
            
            for (const point of testPoints) {
                
                for (const zoom of zoomLevels) {
                    camera.setZoom(zoom);
                    camera.centerOn(point.galacticX, point.galacticY);
                    
                    // Convert to screen and back
                    const screenX = camera.toScreenX(point.galacticX);
                    const screenY = camera.toScreenY(point.galacticY);
                    const backToGalacticX = camera.toGalacticX(screenX);
                    const backToGalacticY = camera.toGalacticY(screenY);
                    
                    const errorX = Math.abs(backToGalacticX - point.galacticX);
                    const errorY = Math.abs(backToGalacticY - point.galacticY);
                    
                    if (errorX > 1000 || errorY > 1000) {
                        console.log(`\nTesting point: galactic(${point.galacticX}, ${point.galacticY})`);
                        console.log(`  Zoom ${zoom.toFixed(1)}: screen(${screenX.toFixed(1)}, ${screenY.toFixed(1)}) -> galactic(${backToGalacticX.toFixed(0)}, ${backToGalacticY.toFixed(0)}) error(${errorX.toFixed(0)}, ${errorY.toFixed(0)})`);
                        console.log(`    ❌ Large conversion error detected!`);
                    }
                }
            }
        });
    });
}

module.exports = runZoomToPointBugTests;
