const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
function fixture(window=null) {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(0,0,'Home'); star.owner=1; game.setSelectedObject(star);
    game.port={getDrawingArea:()=>new pdg.Rect(800,600)}; const display=new Display(game); game.uiWindow=window;
    const slider=(window==='production'?display.getProductionWindowSliderRegions():display.getStarAllocationSliderRegions(star))[0];
    const x=value=>slider.trackRect.x+slider.trackRect.width*value;
    return {game,star,display,slider,x,y:slider.trackRect.y+4};
}
module.exports = function() {
    test.describe('Captured slider dragging', () => {
        test.it('updates an owned system continuously and clamps beyond either endpoint', () => {
            const {game,star,x,y}=fixture(); test.assertTrue(game.beginUISliderDrag(x(.4),y));
            game.updateUISliderDrag(x(.7),y+100); test.assertEqual(star.growth.desired,70);
            game.updateUISliderDrag(x(2),y); test.assertEqual(star.growth.desired,100);
            game.updateUISliderDrag(x(-1),y); test.assertEqual(star.growth.desired,0);
            test.assertEqual(star.growth.desired+star.shipBuilding.desired+star.research.desired,100);
        });
        test.it('uses the foreground production window track', () => {
            const {game,star,x,y,slider}=fixture('production');
            game.beginUISliderDrag(x(.3),y); test.assertEqual(game.uiSliderDrag.trackRect.width,slider.trackRect.width);
            game.updateUISliderDrag(x(.6),y); test.assertEqual(star.growth.desired,60);
        });
        test.it('preserves a locked neighboring allocation and rejects a locked target', () => {
            const {game,star,x,y}=fixture(); star.research.locked=true;
            game.beginUISliderDrag(x(.6),y); test.assertEqual(star.research.desired,33.3);
            test.assertEqual(star.shipBuilding.desired,6.7); game.endUISliderDrag();
            star.growth.locked=true; test.assertFalse(game.beginUISliderDrag(x(.7),y));
            test.assertEqual(star.growth.desired,60);
        });
        test.it('does not capture controls hidden behind an opaque window', () => {
            const {game,display,slider,x,y}=fixture('events');
            display.getActiveWindowRect=()=>slider.rect;
            test.assertFalse(game.beginUISliderDrag(x(.5),y)); test.assertEqual(game.uiSliderDrag,null);
        });
        test.it('coalesces intermediate production notifications and includes the release position', () => {
            const {game,star,x,y}=fixture(); let notifications=0; game.recordProductionChange=()=>notifications++;
            game.beginUISliderDrag(x(.4),y); game.updateUISliderDrag(x(.5),y); game.updateUISliderDrag(x(.6),y);
            test.assertEqual(notifications,0); game.endUISliderDrag(x(.8),y);
            test.assertEqual(star.growth.desired,80); test.assertEqual(notifications,1);
            test.assertFalse(game.updateUISliderDrag(x(.2),y)); test.assertFalse(game.endUISliderDrag());
            test.assertEqual(notifications,1);
        });
        test.it('ends capture if the window, selection, or ownership changes', () => {
            const {game,star,x,y}=fixture(); game.beginUISliderDrag(x(.4),y); game.uiWindow='events';
            game.updateUISliderDrag(x(.8),y); test.assertEqual(star.growth.desired,40); test.assertEqual(game.uiSliderDrag,null);
            game.uiWindow=null; game.beginUISliderDrag(x(.4),y); star.owner=2;
            game.updateUISliderDrag(x(.8),y); test.assertEqual(star.growth.desired,40); test.assertEqual(game.uiSliderDrag,null);
            star.owner=1; game.beginUISliderDrag(x(.4),y); game.setSelectedObject(null);
            game.updateUISliderDrag(x(.8),y); test.assertEqual(star.growth.desired,40); test.assertEqual(game.uiSliderDrag,null);
        });
        test.it('ends capture when a target becomes locked', () => {
            const {game,star,x,y}=fixture(); game.beginUISliderDrag(x(.4),y); star.growth.locked=true;
            game.updateUISliderDrag(x(.8),y); test.assertEqual(star.growth.desired,40); test.assertEqual(game.uiSliderDrag,null);
        });
        test.it('stops on Escape without dismissing the production window or undoing applied values', () => {
            const {game,star,x,y}=fixture('production'); game.beginUISliderDrag(x(.5),y);
            game.handleKeyPress(pdg.key_Escape); test.assertEqual(game.uiSliderDrag,null);
            test.assertEqual(game.uiWindow,'production'); test.assertEqual(star.growth.desired,50);
        });
        test.it('drags colony defaults on their 0–1000 scale without changing the saved player', () => {
            const {game,display}=fixture(); game.beginColonyDefaults();
            const r=display.getColonyDefaultSliderRegions()[0].rect;
            game.beginUISliderDrag(r.x+r.width*.5,r.y+10); game.updateUISliderDrag(r.x+r.width*.8,r.y+100);
            test.assertEqual(game.colonyDefaultsDraft.defaultGrowth,800); test.assertEqual(game.players[1].defaultGrowth,334);
            test.assertEqual(game.colonyDefaultsDraft.defaultShips+game.colonyDefaultsDraft.defaultTech,200);
            game.endUISliderDrag(); game.saveColonyDefaults(); test.assertEqual(game.players[1].defaultGrowth,800);
        });
        test.it('does not capture default-editor step buttons and stops when its draft is discarded', () => {
            const {game,display}=fixture(); game.beginColonyDefaults();
            let r=display.getColonyDefaultActionRegions()[0].rect;
            test.assertFalse(game.beginUISliderDrag(r.x+5,r.y+5));
            r=display.getColonyDefaultSliderRegions()[0].rect;
            game.beginUISliderDrag(r.x+r.width*.5,r.y+10); game.cancelColonyDefaults();
            game.updateUISliderDrag(r.x+r.width*.8,r.y); test.assertEqual(game.uiSliderDrag,null);
            test.assertEqual(game.players[1].defaultGrowth,334);
        });
    });
};
