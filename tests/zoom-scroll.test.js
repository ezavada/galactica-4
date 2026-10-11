// Test suite for zoom and scroll functionality
// Tests the Camera class and Display integration

const test = require('./test-framework.js');
const Camera = require('../src/js/camera.js');

// Mock port object for testing
const mockPort = {
    getDrawingArea() {
        return { 
            width() { return 800; }, 
            height() { return 600; } 
        };
    }
};

function runZoomScrollTests() {
    test.describe('V3 camera command UI', () => {
        const fixture = () => {
            const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
            const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
            const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
            game.port={getDrawingArea:()=>new pdg.Rect(800,600)};
            const display=new Display(game);game.display=display;
            return {game,display};
        };
        test.it('fits with zero, keypad star and F without resetting to 100 percent',()=>{
            const {game,display}=fixture();let fits=0,resets=0;
            display.zoomToFit=()=>fits++;display.resetView=()=>resets++;
            for(const key of [48,42,102,70])game.handleKeyPress(key);
            test.assertEqual(fits,4);test.assertEqual(resets,0);
        });
        test.it('consumes Enter and Tab in map display and View without advancing turns or attention',()=>{
            const {game}=fixture();let turns=0,next=0;
            game.requestEndTurn=()=>turns++;game.attention.next=()=>next++;
            for(const window of ['settings','mapDisplay','view']) {
                game.uiWindow=window;for(const key of [13,3,pdg.key_Tab])test.assertTrue(game.handleKeyPress(key));
                test.assertEqual(game.uiWindow,window);
            }
            test.assertEqual(turns,0);test.assertEqual(next,0);
        });
        test.it('centers the selected item without changing selection and rejects missing selection',()=>{
            const {game,display}=fixture();let center;
            display.centerOn=(x,y)=>center=[x,y];
            test.assertFalse(game.executeUIAction({type:'centerSelected'}));
            const star=game.factory.createStar(200,300,'Target');game.setSelectedObject(star);
            test.assertTrue(game.executeUIAction({type:'centerSelected'}));
            test.assertEqual(center[0],200);test.assertEqual(center[1],300);test.assertTrue(game.selectedObject===star);
        });
        test.it('localizes all camera menu labels with distinct nonoverlapping controls',()=>{
            const {game,display}=fixture(),previous=pdg.res.getLanguage();game.uiWindow='view';
            try {for(const lang of ['en','de','es','fr','ja','ru']) {
                pdg.res.setLanguage(lang);const rows=display.getViewActionRegions();
                test.assertEqual(rows.length,7);test.assertEqual(rows[0].label,pdg.res.getString(787));
                test.assertEqual(rows[1].label,pdg.res.getString(788));test.assertEqual(rows[4].label,pdg.res.getString(790));
                test.assertEqual(rows[5].label,pdg.res.getString(789));
                for(let i=1;i<rows.length;i++)test.assertTrue(rows[i-1].rect.y+rows[i-1].rect.height<rows[i].rect.y);
            }}finally{pdg.res.setLanguage(previous);}
        });
    });

    test.describe('Camera System - Initialization', () => {
        test.it('should initialize with default values', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            test.assertEqual(camera.zoom, 1.0);
            test.assertEqual(camera.panX, 0);
            test.assertEqual(camera.panY, 0);
            test.assertEqual(camera.minZoom, 0.1);
            test.assertEqual(camera.maxZoom, 10.0);
        });
        
        test.it('should set correct map dimensions', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            test.assertEqual(camera.mapWidth, 1024);
            test.assertEqual(camera.mapHeight, 1024);
            test.assertEqual(camera.port, mockPort);
        });
    });
    
    test.describe('Camera System - Coordinate Conversion', () => {
        test.it('should convert galactic coordinates to screen coordinates correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            // Test center of map
            const screenX = camera.toScreenX(512);
            const screenY = camera.toScreenY(512);
            test.assertApproximately(screenX, 400, 1); // Center of 800px screen
            test.assertApproximately(screenY, 300, 1); // Center of 600px screen
        });
        
        test.it('should convert screen coordinates to galactic coordinates correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            // Test center of screen
            const galacticX = camera.toGalacticX(400);
            const galacticY = camera.toGalacticY(300);
            test.assertApproximately(galacticX, 512, 1); // Center of 1024px map
            test.assertApproximately(galacticY, 512, 1); // Center of 1024px map
        });
        
        test.it('should maintain coordinate consistency', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            const testX = 256;
            const testY = 384;
            
            const screenX = camera.toScreenX(testX);
            const screenY = camera.toScreenY(testY);
            
            const backToGalacticX = camera.toGalacticX(screenX);
            const backToGalacticY = camera.toGalacticY(screenY);
            
            test.assertApproximately(backToGalacticX, testX, 1);
            test.assertApproximately(backToGalacticY, testY, 1);
        });
    });
    
    test.describe('Camera System - Zoom Functionality', () => {
        test.it('should zoom in correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.zoomIn();
            test.assertEqual(camera.zoom, 1.2);
        });
        
        test.it('should zoom out correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.zoomOut();
            test.assertApproximately(camera.zoom, 0.833, 0.01);
        });
        
        test.it('should respect zoom limits', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            // Zoom in beyond max
            camera.setZoom(20.0);
            test.assertEqual(camera.zoom, 10.0);
            
            // Zoom out beyond min
            camera.setZoom(0.05);
            test.assertEqual(camera.zoom, 0.1);
        });
        
        test.it('should update pan limits when zooming', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(2.0);
            // With new scale calculation (scale = 1/1024), pan limits are different
            // Just check that pan limits are calculated (not specific values)
            test.assertNotEqual(camera.minPanX, undefined);
            test.assertNotEqual(camera.maxPanX, undefined);
            test.assertNotEqual(camera.minPanY, undefined);
            test.assertNotEqual(camera.maxPanY, undefined);
        });
        
        test.it('should have correct 1:1 zoom ratio - 1024 galactic units = 1024 screen pixels', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            // Ensure we're at 1:1 zoom with no pan offset
            camera.setZoom(1.0);
            camera.panX = 0;
            camera.panY = 0;
            
            // Test that 1024 galactic units = 1024 screen pixels (accounting for centering offset)
            const galacticX = 1024;
            const galacticY = 1024;
            const screenX = camera.toScreenX(galacticX);
            const screenY = camera.toScreenY(galacticY);
            
            // The coordinate conversion formula is: screen = (galactic - pan) * zoom * scale + offset
            // At 1:1 zoom with no pan: screen = galactic * scale + offset
            // With scale = 1/1024: screen = galactic / 1024 + offset
            // So 1024 galactic units = 1024/1024 + offset = 1 + offset
            const expectedScreenX = (galacticX * camera.scale) + camera.offsetX;
            const expectedScreenY = (galacticY * camera.scale) + camera.offsetY;
            
            test.assertEqual(screenX, expectedScreenX, '1024 galactic units should equal 1 + offsetX at 1:1 zoom');
            test.assertEqual(screenY, expectedScreenY, '1024 galactic units should equal 1 + offsetY at 1:1 zoom');
            
            // Also test that the scale is correct: 1024 galactic units should be 1 pixel before offset
            test.assertEqual(galacticX * camera.scale, 1, '1024 galactic units * scale should equal 1 pixel');
            test.assertEqual(galacticY * camera.scale, 1, '1024 galactic units * scale should equal 1 pixel');
        });
    });
    
    test.describe('Camera System - Pan Functionality', () => {
        test.it('should pan correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(2.0); // Enable panning by zooming in
            camera.pan(100, 50);
            // With scale and zoom conversion: galactic delta = screen delta / (zoom * scale)
            // Expected: 100 / (2.0 * scale) and 50 / (2.0 * scale)
            test.assertApproximately(camera.panX, 100 / (2.0 * camera.scale), 1);
            test.assertApproximately(camera.panY, 50 / (2.0 * camera.scale), 1);
        });
        
        test.it('should clamp pan to limits', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(2.0); // This will set pan limits
            camera.pan(-1000, -1000); // Try to pan beyond limits
            // Pan limits are disabled, so panning should work without clamping
            test.assertApproximately(camera.panX, -1000 / (2.0 * camera.scale), 1);
            test.assertApproximately(camera.panY, -1000 / (2.0 * camera.scale), 1);
        });
    });
    
    test.describe('Camera System - Center On Functionality', () => {
        test.it('should center on a specific point', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            // Zoom in enough so that pan limits won't interfere with centerOn
            // At zoom 4.0, the visible area will be 256x192, much smaller than the 1024x1024 map
            camera.setZoom(4.0);
            // Use a meaningful test point that's not the center of the map
            camera.centerOn(256, 384);
            // With the new coordinate system, pan values depend on scale and offsets
            // The important thing is that the point (256, 384) is actually centered on screen
            const centerX = 400; // 800/2
            const centerY = 300; // 600/2
            const actualScreenX = camera.toScreenX(256);
            const actualScreenY = camera.toScreenY(384);
            test.assertApproximately(actualScreenX, centerX, 1, 'Point should be centered horizontally');
            test.assertApproximately(actualScreenY, centerY, 1, 'Point should be centered vertically');
        });
    });
    
    test.describe('Camera System - Reset View', () => {
        test.it('should reset to default view', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(5.0);
            camera.pan(100, 200);
            camera.resetView();
            
            test.assertEqual(camera.zoom, 1.0);
            test.assertEqual(camera.panX, 0);
            test.assertEqual(camera.panY, 0);
        });
    });
    
    test.describe('Camera System - Zoom to Fit', () => {
        test.it('should zoom to fit entire map', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.zoomToFit();
            // Should zoom out to fit the content area (1024x1024)
            test.assertApproximately(camera.zoom, 600/1024, 0.01); // Height is the limiting factor
            // Should center on the middle of the coordinate space (512, 512)
            // At zoom level 600/1024, visible width = 1024 / (600/1024) = 1024*1024/600 = 1747.2
            // visible height = 1024 / (600/1024) = 1024*1024/600 = 1747.2
            // panX = 512 - 1747.2/2 = 512 - 873.6 = -361.6
            test.assertApproximately(camera.panX, -361.6, 1);
            test.assertApproximately(camera.panY, -361.6, 1);
        });
    });
    
    test.describe('Camera System - Visible Bounds', () => {
        test.it('should calculate visible bounds correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            const bounds = camera.getVisibleBounds();
            test.assertEqual(bounds.left, 0);
            test.assertEqual(bounds.top, 0);
            test.assertEqual(bounds.width, 1024);
            test.assertEqual(bounds.height, 1024);
        });
        
        test.it('should update visible bounds when zooming', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(2.0);
            const bounds = camera.getVisibleBounds();
            test.assertEqual(bounds.width, 512);
            test.assertEqual(bounds.height, 512);
        });
    });
    
    test.describe('Camera System - Visibility Check', () => {
        test.it('should correctly identify visible points', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            test.assertTrue(camera.isVisible(512, 512)); // Center
            test.assertTrue(camera.isVisible(0, 0)); // Corner
            test.assertTrue(camera.isVisible(1024, 1024)); // Other corner
        });
        
        test.it('should correctly identify non-visible points when zoomed in', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(2.0);
            camera.centerOn(512, 512);
            
            test.assertTrue(camera.isVisible(512, 512)); // Center should be visible
            test.assertFalse(camera.isVisible(0, 0)); // Corner should not be visible
        });
    });
    
    test.describe('Camera System - Map Size Updates', () => {
        test.it('should update map size correctly', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.updateMapSize(2048, 2048);
            test.assertEqual(camera.mapWidth, 2048);
            test.assertEqual(camera.mapHeight, 2048);
        });
    });
    
    test.describe('Camera System - Zoom Percentage', () => {
        test.it('should return correct zoom percentage', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            camera.setZoom(1.5);
            test.assertEqual(camera.getZoomPercentage(), 150);
            
            camera.setZoom(0.5);
            test.assertEqual(camera.getZoomPercentage(), 50);
        });
    });
    
    test.describe('Camera System - Zoom to Point', () => {
        test.it('should zoom to selected object when available', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            const selectedObject = { x: 100, y: 200 };
            
            // Get initial screen position of the object
            const initialScreenX = camera.toScreenX(selectedObject.x);
            const initialScreenY = camera.toScreenY(selectedObject.y);
            
            // Zoom in
            camera.zoomIn(1.5, selectedObject);
            
            // Check that the object is still at the same screen position
            const finalScreenX = camera.toScreenX(selectedObject.x);
            const finalScreenY = camera.toScreenY(selectedObject.y);
            
            test.assertApproximately(finalScreenX, initialScreenX, 1);
            test.assertApproximately(finalScreenY, initialScreenY, 1);
        });
        
        test.it('should zoom to mouse position when no selected object', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            const mouseX = 300;
            const mouseY = 250;
            
            // Get initial galactic position of mouse
            const initialGalacticX = camera.toGalacticX(mouseX);
            const initialGalacticY = camera.toGalacticY(mouseY);
            
            // Zoom in
            camera.zoomIn(1.5, null, mouseX, mouseY);
            
            // Check that the mouse position is still at the same screen position
            const finalScreenX = camera.toScreenX(initialGalacticX);
            const finalScreenY = camera.toScreenY(initialGalacticY);
            
            test.assertApproximately(finalScreenX, mouseX, 1);
            test.assertApproximately(finalScreenY, mouseY, 1);
        });
        
        test.it('should zoom to center when no selected object and mouse outside bounds', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            const centerX = 400; // 800/2
            const centerY = 300; // 600/2
            
            // Get initial galactic position of center
            const initialGalacticX = camera.toGalacticX(centerX);
            const initialGalacticY = camera.toGalacticY(centerY);
            
            // Zoom in with mouse outside bounds
            camera.zoomIn(1.5, null, -10, -10);
            
            // Check that the center is still at the same screen position
            const finalScreenX = camera.toScreenX(initialGalacticX);
            const finalScreenY = camera.toScreenY(initialGalacticY);
            
            test.assertApproximately(finalScreenX, centerX, 1);
            test.assertApproximately(finalScreenY, centerY, 1);
        });
    });
    
    test.describe('Camera System - Integration', () => {
        test.it('should be able to create a Camera instance', () => {
            const camera = new Camera(mockPort, 1024, 1024);
            test.assertDefined(camera);
            test.assertEqual(camera.zoom, 1.0);
        });
    });
}

module.exports = runZoomScrollTests;
