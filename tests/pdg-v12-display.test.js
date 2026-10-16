const test = require('./test-framework.js');
const Camera = require('../src/js/camera.js');
const RetainedPanel = require('../src/js/retained-panel.js');
const SelectionPulse = require('../src/js/selection-pulse.js');

module.exports = function() {
    test.describe('PDG Camera adapter', () => {
        test.it('preserves anchored zoom when the requested zoom exceeds either limit', () => {
            const camera = new Camera({ getDrawingArea: () => new pdg.Rect(800, 600) }, 5242880, 5242880);
            for (const zoom of [20, 0.01]) {
                const x = camera.toGalacticX(321), y = camera.toGalacticY(234);
                camera.zoomToPoint(zoom, x, y, 321, 234);
                test.assertApproximately(camera.toScreenX(x), 321, 0.01);
                test.assertApproximately(camera.toScreenY(y), 234, 0.01);
            }
        });
        test.it('updates the native viewport after a resize without changing pan or zoom', () => {
            let area = new pdg.Rect(800, 600);
            const camera = new Camera({ getDrawingArea: () => area }, 1048576, 1048576);
            camera.setZoom(1.5); camera.setPan(10000, 20000);
            const x = camera.toScreenX(500000), y = camera.toScreenY(500000);
            area = new pdg.Rect(1000, 700); camera.onScreenSizeChanged();
            test.assertApproximately(camera.toScreenX(500000), x + 100, 0.01);
            test.assertApproximately(camera.toScreenY(500000), y + 50, 0.01);
            test.assertEqual(camera.panX, 10000); test.assertEqual(camera.zoom, 1.5);
        });
    });
    test.describe('Camera navigation whip pans',()=>{
        const create=()=>new Camera({getDrawingArea:()=>new pdg.Rect(800,600)},5242880,5242880);
        test.it('moves continuously to the exact requested center within 240ms with aligned inverse transforms',()=>{
            const camera=create(),start=camera.panX;
            camera.whipPanTo(100000,200000,100);
            test.assertEqual(camera.panX,start);
            camera.update(160);const early=camera.panX;
            camera.update(220);test.assertTrue(camera.panX<early && early<start);
            for(const [x,y] of [[100000,200000],[2500000,3500000]]){
                test.assertApproximately(camera.toGalacticX(camera.toScreenX(x)),x,1);
                test.assertApproximately(camera.toGalacticY(camera.toScreenY(y)),y,1);
            }
            camera.update(340);test.assertApproximately(camera.toScreenX(100000),400,.01);test.assertApproximately(camera.toScreenY(200000),300,.01);test.assertNull(camera.whipPan);
        });
        test.it('retargets a running jump from its sampled position without a discontinuity',()=>{
            const camera=create();camera.whipPanTo(100000,200000,100);camera.update(220);
            const x=camera.panX,y=camera.panY;camera.whipPanTo(4000000,3000000,220);
            test.assertEqual(camera.panX,x);test.assertEqual(camera.panY,y);
            camera.update(460);test.assertApproximately(camera.toScreenX(4000000),400,.01);test.assertApproximately(camera.toScreenY(3000000),300,.01);
        });
        test.it('lets dragging, scroll positions and anchored zoom cancel pending navigation',()=>{
            const getTime=pdg.tm.getMilliseconds;let time=100;pdg.tm.getMilliseconds=()=>time;
            try{for(const operation of [c=>c.pan(30,-20),c=>c.setPan(12000,24000),c=>c.zoomToScreenPoint(2,250,150)]){
                const camera=create();time=100;camera.whipPanTo(100000,200000);time=180;operation(camera);
                const x=camera.panX,y=camera.panY;test.assertNull(camera.whipPan);camera.update(1000);test.assertEqual(camera.panX,x);test.assertEqual(camera.panY,y);
            }}finally{pdg.tm.getMilliseconds=getTime;}
        });
        test.it('routes displayed navigation through whip pans while preserving initial and reduced-motion views',()=>{
            const Display=require('../src/js/display.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
            const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);
            display.centerOn(100000,200000);test.assertTrue(!display.camera.whipPan);
            display.hasDrawn=true;display.centerOn(500000,700000);test.assertDefined(display.camera.whipPan);
            display.visualEffects.reducedMotion=true;display.centerOn(300000,400000);test.assertNull(display.camera.whipPan);test.assertApproximately(display.toScreenX(300000),400,.01);
        });
        test.it('animates the position change when fitting content or resetting the view',()=>{
            const Display=require('../src/js/display.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
            const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);
            display.camera.centerOn(100000,200000);display.hasDrawn=true;display.resetView();test.assertDefined(display.camera.whipPan);display.camera.update(display.camera.whipPan.start+240);test.assertEqual(display.camera.panX,0);
            const star=game.factory.createStar(250000,300000,'Fixture');star.owner=1;display.zoomToFit();test.assertDefined(display.camera.whipPan);display.camera.update(display.camera.whipPan.start+240);test.assertApproximately(display.toScreenX(star.x),400,.01);test.assertApproximately(display.toScreenY(star.y),300,.01);
        });
    });
    test.describe('Retained panel text', () => {
        function panel() {
            const attrs = new pdg.Attributes().textSize(12);
            const font = { getFontName: () => 'Test', getFontAscent: () => 9, getFontDescent: () => 3 };
            const display = {
                styles: { divider: new pdg.Attributes() },
                getTextAttributes: () => attrs,
                port: { getCurrentFont: () => font, getTextWidth: text => text.length * 6 }
            };
            return new RetainedPanel(display, 240);
        }
        test.it('updates values in place and resizes their text rectangle', () => {
            const p = panel(); p.text('value', '99', 20, 30);
            const original = p.fields.get('value').element;
            p.text('value', '1000', 20, 30);
            test.assertTrue(p.fields.get('value').element === original);
            test.assertEqual(original.getText(), '1000');
            test.assertEqual(original.getControlPoint(2).x, 44);
            p.text('value', '1', 20, 30);
            test.assertEqual(original.getControlPoint(2).x, 26);
            test.assertEqual(p.drawing.getElementCount(), 2);
        });
        test.it('keeps right-justified text anchored as it grows', () => {
            const p = panel(); p.text('value', '9', 200, 30, 'lightgray', 12, pdg.textStyle_RightJustified);
            p.text('value', '1000', 200, 30, 'lightgray', 12, pdg.textStyle_RightJustified);
            const element = p.fields.get('value').element;
            test.assertEqual(element.getControlPoint(0).x, 176);
            test.assertEqual(element.getControlPoint(2).x, 200);
            test.assertTrue(element.hasLiveAttributes());
        });
        test.it('does not replace unchanged text or accumulate elements', () => {
            const p = panel(); p.text('value', '99', 20, 30);
            const first = p.fields.get('value');
            for (let i = 0; i < 10; i++) p.text('value', '99', 20, 30);
            test.assertTrue(p.fields.get('value') === first);
            test.assertEqual(p.drawing.getElementCount(), 2);
        });
    });
    test.describe('Selection animation script', () => {
        test.it('preserves the existing half-second pulse including repeat boundaries', () => {
            const pulse = new SelectionPulse();
            for (const milliseconds of [0, 125, 375, 499, 500, 625, 1000, 1125]) {
                test.assertApproximately(pulse.sample(milliseconds), (milliseconds % 500) / 500, 0.0001);
            }
        });
        test.it('shares a clock sample without advancing twice in one frame', () => {
            const pulse = new SelectionPulse();
            test.assertApproximately(pulse.sample(125), .25, .0001);
            for (let i = 0; i < 4; i++) test.assertApproximately(pulse.sample(125), .25, .0001);
            test.assertApproximately(pulse.sample(375), .75, .0001);
        });
        test.it('keeps the phase after a long gap between selections', () => {
            const pulse = new SelectionPulse();
            pulse.sample(125);
            test.assertApproximately(pulse.sample(36000375), .75, .0001);
        });
        test.it('handles a late start and a clock reset', () => {
            const pulse = new SelectionPulse();
            test.assertApproximately(pulse.sample(1000125), .25, .0001);
            test.assertApproximately(pulse.sample(125), .25, .0001);
        });
    });
};
