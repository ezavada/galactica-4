const test=require('./test-framework.js'),Prefs=require('../src/js/colony-preferences.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
const Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js'),Help=require('../src/js/hover-help.js');
function fixture(){const values={},env={window:{localStorage:{getItem:key=>values[key],setItem:(key,value)=>values[key]=value}}},preferences=Prefs.createPreferences(env);
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};game.colonyDefaultsPreferences=preferences;new Display(game);return {values,env,preferences,game};}
module.exports=()=>test.describe('Persistent colony preferences',()=>{
 test.it('persists every hull and coupled allocations independently in native and browser adapters',()=>{
  for(const native of [false,true]){const values={},storage={getItem:key=>values[key],setItem:(key,value)=>values[key]=value},cfg={useConfig:()=>{},getConfigString:storage.getItem,setConfigString:storage.setItem},env=native?{pdg:{cfg}}:{window:{localStorage:storage}};
   for(let hull=1;hull<=4;hull++){const wanted={defaultGrowth:700,defaultShips:200,defaultTech:100,defaultBuildType:hull},p=Prefs.createPreferences(env);test.assertTrue(p.write({...wanted,playerNum:99,password:'private'}));test.assertEqual(JSON.stringify(Prefs.createPreferences(env).read()),JSON.stringify(wanted));test.assertFalse(JSON.stringify(values).includes('private'));}
  }
 });
 test.it('normalizes all allocations together with the v3 equal correction and growth remainder',()=>{
  test.assertEqual(JSON.stringify(Prefs.normalize({defaultGrowth:333,defaultShips:333,defaultTech:333,defaultBuildType:4})),JSON.stringify({defaultGrowth:334,defaultShips:333,defaultTech:333,defaultBuildType:4}));
  for(const input of [{defaultGrowth:900,defaultShips:100},{defaultGrowth:-1,defaultShips:500,defaultTech:501},{defaultGrowth:0,defaultShips:0,defaultTech:1000,defaultBuildType:9},null])test.assertTrue(Prefs.valid(Prefs.normalize(input)));
  const {values,preferences}=fixture();values['galactica.colonyDefaults']='invalid';test.assertEqual(JSON.stringify(preferences.read()),JSON.stringify(Prefs.defaults()));test.assertFalse(preferences.write({defaultGrowth:0,defaultShips:0,defaultTech:0,defaultBuildType:1}));
  const denied=Prefs.createPreferences({window:{get localStorage(){throw Error('Denied');}}});test.assertTrue(denied.write(Prefs.defaults()));test.assertEqual(denied.read().defaultGrowth,334);
 });
 test.it('saves current-human defaults for future games without reallocating existing systems or AI defaults',()=>{
  const {game,preferences}=fixture(),star=game.factory.createStar(0,0,'Existing');star.owner=1;const allocation=star.growth.desired,computer=JSON.stringify(game.players[2]);
  game.uiWindow='settings';game.beginColonyDefaults();game.setColonyDefaultAllocation('defaultGrowth',700);game.executeUIAction({type:'setColonyDefaultHull',hull:4});game.handleKeyPress(13);
  test.assertEqual(game.uiWindow,'settings');test.assertEqual(preferences.read().defaultGrowth,700);test.assertEqual(star.growth.desired,allocation);test.assertEqual(JSON.stringify(game.players[2]),computer);
  const next=fixture().game;test.assertTrue(Prefs.apply(next,preferences));test.assertEqual(next.players[1].defaultGrowth,700);test.assertEqual(next.players[1].defaultBuildType,4);test.assertEqual(next.players[2].defaultGrowth,334);
  const restored=Save.restore(Save.serialize(next));preferences.write({defaultGrowth:500,defaultShips:250,defaultTech:250,defaultBuildType:2});Prefs.apply(restored,preferences);test.assertEqual(restored.players[1].defaultGrowth,500);test.assertEqual(restored.players[1].defaultBuildType,2);
 });
 test.it('cancels without writes and keeps fixed tutorial practice isolated',()=>{
  const {game,preferences,values}=fixture();game.uiWindow='settings';game.beginColonyDefaults();game.setColonyDefaultAllocation('defaultTech',900);game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.uiWindow,'settings');test.assertFalse(Object.hasOwn(values,'galactica.colonyDefaults'));
  preferences.write({defaultGrowth:900,defaultShips:100,defaultTech:0,defaultBuildType:3});game.beginColonyDefaults();test.assertEqual(game.colonyDefaultsDraft.defaultGrowth,900);game.cancelColonyDefaults();test.assertEqual(game.players[1].defaultGrowth,334);game.tutorialSimulation={};test.assertFalse(Prefs.apply(game,preferences));test.assertEqual(game.players[1].defaultGrowth,334);
  game.beginColonyDefaults();game.setColonyDefaultAllocation('defaultGrowth',800);game.saveColonyDefaults();test.assertEqual(preferences.read().defaultGrowth,900);
 });
 test.it('edits persisted defaults through startup slider drag and returns to Settings',()=>{
  const {game,env,preferences}=fixture(),drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences(env);
  const settings=new (require('../src/js/startup-settings.js'))(game.port,{colonyDefaultsPreferences:preferences,drawingPreferences,sound:{play:()=>{},isEnabled:()=>true}});settings.open();settings.model.executeUIAction({type:'beginColonyDefaults'});
  const rect=settings.model.display.getColonyDefaultSliderRegions()[0].rect;settings.mouse({eventType:pdg.eventType_MouseDown,buttonNumber:0,mousePos:{x:rect.x+rect.width*.6,y:rect.y+10}});test.assertDefined(settings.model.uiSliderDrag);
  settings.move({leftButton:true,mousePos:{x:rect.x+rect.width*.7,y:rect.y+10}});settings.mouse({eventType:pdg.eventType_MouseUp,buttonNumber:0,mousePos:{x:rect.x+rect.width*.7,y:rect.y+10}});settings.key(13);
  test.assertEqual(preferences.read().defaultGrowth,700);test.assertEqual(settings.model.uiWindow,'settings');test.assertTrue(settings.active);settings.key(pdg.key_Escape);test.assertFalse(settings.active);
 });
 test.it('exposes localized Settings entry and compact editor controls in all supported languages',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const [width,height] of [[800,600],[320,340]]){
   const {game}=fixture();game.port.getDrawingArea=()=>new pdg.Rect(width,height);game.uiWindow='settings';let entry;
   for(let i=0;i<20;i++){entry=game.display.getSettingsActionRegions().find(r=>r.action.type==='beginColonyDefaults');if(entry)break;game.executeUIAction({type:'settingsPage',delta:1});}
   test.assertDefined(entry);test.assertTrue(!!Help.describe(entry.action));game.executeUIAction(entry.action);const rect=game.display.getColonyDefaultsWindowRect(),sliders=game.display.getColonyDefaultSliderRegions(),buttons=game.display.getColonyDefaultActionRegions();
   for(const row of [...sliders,...buttons]){test.assertTrue(row.rect.width>0);test.assertTrue(row.rect.x>=rect.x && row.rect.x+row.rect.width<=rect.x+rect.width);test.assertTrue(row.rect.y>=rect.y && row.rect.y+row.rect.height<=rect.y+rect.height);}
   test.assertTrue(!!Help.describe({type:'saveColonyDefaults'}));test.assertEqual(buttons.find(row=>row.action.type==='saveColonyDefaults').key,'Enter');
  }}}finally{pdg.res.setLanguage(language);}
 });
});
