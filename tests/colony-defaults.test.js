const test = require('./test-framework.js');
const Factory = require('../src/js/factory.js');
const Game = require('../src/js/game.js');
const GameConfig = require('../src/js/game-config.js');
const Rules = require('../src/js/rules.js');
const Display = require('../src/js/display.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    return {game,player:game.players[1]};
}
module.exports = function() {
    test.describe('New colony defaults', () => {
        test.it('copies the human defaults into a draft without changing them', () => {
            const {game,player}=fixture(); test.assertTrue(game.beginColonyDefaults());
            test.assertEqual(game.colonyDefaultsDraft.defaultGrowth,334);
            game.setColonyDefaultAllocation('defaultGrowth',600);
            test.assertEqual(player.defaultGrowth,334);
            test.assertEqual(game.colonyDefaultsDraft.defaultGrowth+game.colonyDefaultsDraft.defaultShips+game.colonyDefaultsDraft.defaultTech,1000);
        });
        test.it('keeps allocations coupled at the limits and preserves the 0–1000 scale', () => {
            const {game}=fixture(); game.beginColonyDefaults();
            game.setColonyDefaultAllocation('defaultGrowth',1000);
            test.assertEqual(game.colonyDefaultsDraft.defaultShips,0); test.assertEqual(game.colonyDefaultsDraft.defaultTech,0);
            game.setColonyDefaultAllocation('defaultGrowth',0);
            test.assertEqual(game.colonyDefaultsDraft.defaultShips,500); test.assertEqual(game.colonyDefaultsDraft.defaultTech,500);
            test.assertFalse(game.setColonyDefaultAllocation('unknown',500));
            test.assertFalse(game.setColonyDefaultAllocation('defaultGrowth',NaN));
        });
        test.it('saves the edited economy and selected hull to the captured human player', () => {
            const {game,player}=fixture(); game.beginColonyDefaults();
            game.setColonyDefaultAllocation('defaultGrowth',600);
            game.executeUIAction({type:'setColonyDefaultHull',hull:3});
            test.assertTrue(game.saveColonyDefaults()); test.assertEqual(player.defaultGrowth,600);
            test.assertEqual(player.defaultShips+player.defaultTech,400); test.assertEqual(player.defaultBuildType,3);
            test.assertEqual(game.uiWindow,null); test.assertEqual(game.colonyDefaultsDraft,null);
        });
        test.it('discards allocation and hull edits when Cancel or Escape is used', () => {
            const {game,player}=fixture(); game.beginColonyDefaults(); game.setColonyDefaultAllocation('defaultGrowth',1000);
            game.executeUIAction({type:'setColonyDefaultHull',hull:4}); game.cancelColonyDefaults();
            test.assertEqual(player.defaultGrowth,334); test.assertEqual(player.defaultBuildType,1);
            game.beginColonyDefaults(); game.setColonyDefaultAllocation('defaultTech',1000);
            game.handleKeyPress(pdg.key_Escape); test.assertEqual(player.defaultTech,333); test.assertEqual(game.uiWindow,null);
        });
        test.it('blocks turn advancement while editing and saves on Return', () => {
            const {game}=fixture(); let turns=0; game.endTurn=()=>turns++;
            game.beginColonyDefaults(); game.handleKeyPress(pdg.key_Tab); test.assertEqual(turns,0);
            game.handleKeyPress(13); test.assertEqual(game.uiWindow,null);
        });
        test.it('rejects invalid draft allocations and hulls without updating the player', () => {
            const {game,player}=fixture(); game.beginColonyDefaults();
            test.assertFalse(game.executeUIAction({type:'setColonyDefaultHull',hull:5}));
            game.colonyDefaultsDraft.defaultGrowth=1001;
            test.assertFalse(game.saveColonyDefaults()); test.assertEqual(player.defaultGrowth,334);
            game.colonyDefaultsDraft.defaultGrowth=334; game.colonyDefaultsDraft.defaultBuildType=1.5;
            test.assertFalse(game.saveColonyDefaults()); test.assertEqual(player.defaultBuildType,1);
        });
        test.it('does not expose a defaults editor to an AI-only observer', () => {
            const {game}=fixture(); game.config.numHumans=0; game.players[1].isHuman=false;
            test.assertFalse(game.beginColonyDefaults()); test.assertEqual(game.colonyDefaultsDraft,null);
        });
        test.it('applies saved settings to a neutral colony without changing existing systems', () => {
            const {game}=fixture(); const existing=game.factory.createStar(0,0,'Existing'); existing.owner=1;
            const before=existing.growth.desired; game.beginColonyDefaults();
            game.setColonyDefaultAllocation('defaultGrowth',600); game.executeUIAction({type:'setColonyDefaultHull',hull:4}); game.saveColonyDefaults();
            const colony=game.factory.createStar(4096,4096,'Colony'); colony.owner=1;
            test.assertTrue(game.applyNewColonyDefaults(colony,0)); test.assertEqual(colony.growth.desired,60);
            test.assertEqual(colony.currentShip.type,'battleship'); test.assertEqual(existing.growth.desired,before);
        });
        test.it('routes menu, slider, hull and Save buttons through the foreground window', () => {
            const {game}=fixture(); game.port={getDrawingArea:()=>new pdg.Rect(800,600)};
            const display=new Display(game); game.uiWindow='menu'; let r=display.getCommandActionRegions()[0].rect;
            game.executeUIAction(display.getUIActionAt(r.x+5,r.y+5)); test.assertEqual(game.uiWindow,'colonyDefaults');
            const slider=display.getColonyDefaultSliderRegions()[0];
            game.executeUIAction(display.getUIActionAt(slider.rect.x+slider.rect.width*.7,slider.rect.y+10));
            test.assertEqual(game.colonyDefaultsDraft.defaultGrowth,700);
            test.assertEqual(display.getUIActionAt(0,0).type,'consume');
            r=display.getColonyDefaultActionRegions().find(region=>region.action.type==='setColonyDefaultHull'&&region.action.hull===2).rect;
            game.executeUIAction(display.getUIActionAt(r.x+5,r.y+5)); test.assertEqual(game.colonyDefaultsDraft.defaultBuildType,2);
            r=display.getColonyDefaultActionRegions().find(region=>region.action.type==='saveColonyDefaults').rect;
            game.executeUIAction(display.getUIActionAt(r.x+5,r.y+5)); test.assertEqual(game.players[1].defaultGrowth,700);
        });
    });
};
