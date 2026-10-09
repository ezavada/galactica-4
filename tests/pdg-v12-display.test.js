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
