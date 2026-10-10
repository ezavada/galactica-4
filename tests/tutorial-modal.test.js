const test=require('./test-framework.js'),Context=require('../src/js/tutorial-context.js'),Controller=require('../src/js/tutorial-controller.js'),Lessons=require('../src/js/tutorial-lessons.js'),I18n=require('../src/js/i18n.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
const path=require('path'),dataPath=path.join(__dirname,'../data');
function fixture(){const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numComputers:0}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);return {game,display};}
module.exports=()=>test.describe('Tutorial entry from modal application windows',()=>{
 test.it('resolves actual front windows and retains New Game/Enter Name exceptions',()=>{
  const {game}=fixture();test.assertDeepEqual(Context.current({game}),{window:1,modal:false});
  for(const field of ['manualError','documentDialog','settingsWindow','titleEditor','computerEditor','skillMenu']){const state={game,starting:field.endsWith('Editor') || field==='skillMenu',[field]:true};test.assertTrue(Context.current(state).modal);test.assertEqual(new Controller(Lessons.load(dataPath)).start(Context.current(state)).id,101);}
  test.assertDeepEqual(Context.current({game,starting:true}),{window:34,modal:true});test.assertDeepEqual(Context.current({game,starting:true,playerName:true}),{window:4,modal:true});
  for(const name of ['settings','comparison','systemComparison','fleets','endTurnConfirm']){game.uiWindow=name;test.assertEqual(new Controller(Lessons.load(dataPath)).start(Context.current({game})).id,101);}
  game.uiWindow='events';test.assertFalse(Context.current({game}).modal);game.overlay={type:'report'};test.assertTrue(Context.current({game}).modal);
 });
 test.it('uses real Settings actions and retries without dismissing the blocking window',()=>{
  const {game,display}=fixture(),controller=new Controller(Lessons.load(dataPath));let started=0;
  game.tutorialCommands={available:()=>!controller.active,start:()=>{started++;controller.start(Context.current({game}));return true;}};
  game.uiWindow='settings';game.settingsPage=1;const row=display.getSettingsActionRegions().find(r=>r.action.type==='startTutorial');test.assertNotNull(row);game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertEqual(controller.pageId,101);test.assertEqual(game.uiWindow,'settings');test.assertEqual(started,1);
  controller.pressButton(Context.current({game}));test.assertEqual(controller.pageId,101);test.assertFalse(game.canStartTutorial());
  game.handleCommandWindowKey(pdg.key_Escape,'');controller.pressButton(Context.current({game}));test.assertEqual(controller.pageId,100);controller.pressButton(Context.current({game}));test.assertEqual(controller.pageId,1);test.assertEqual(game.turn,1);
 });
 test.it('offers Tutorial/T in startup Settings without creating a playable document',()=>{
  const Settings=require('../src/js/startup-settings.js'),Drawing=require('../src/js/drawing-preferences.js'),{game}=fixture();let owner=null;
  const services={drawingPreferences:Drawing.createPreferences({}),presentation:{kind:null},tutorialCommands:{available:()=>!owner,start:()=>{owner=new Controller(Lessons.load(dataPath));owner.start(Context.current({starting:true,settingsWindow:settings.model.uiWindow}));return true;}}};
  const settings=new Settings(game.port,services);settings.open();settings.key(116);test.assertEqual(owner.pageId,101);test.assertTrue(settings.active);owner.pressButton({window:'settings',modal:true});test.assertEqual(owner.pageId,101);settings.key(pdg.key_Escape);test.assertFalse(settings.active);owner.pressButton(Context.current({starting:true}));test.assertEqual(owner.pageId,1);test.assertEqual(game.turn,1);
 });
 test.it('uses localized Tutorial and existing explanatory help in all six languages',()=>{
  const previous=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(language);const {game,display}=fixture();game.uiWindow='settings';game.settingsPage=1;game.tutorialCommands={start:()=>true};const row=display.getSettingsActionRegions().find(r=>r.action.type==='startTutorial');test.assertEqual(row.label,I18n.getString(960));test.assertEqual(row.key,'T');test.assertTrue(require('../src/js/hover-help.js').describe(row.action).length>0);test.assertTrue(Lessons.load(dataPath).find(p=>p.id===101).text.length>0);}}finally{pdg.res.setLanguage(previous);}
 });
});
