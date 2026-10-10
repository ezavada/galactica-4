const test=require('./test-framework.js'),Defaults=require('../src/js/new-game-defaults.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js'),Help=require('../src/js/hover-help.js');
function fixture(){const values={},env={window:{localStorage:{getItem:key=>values[key],setItem:(key,value)=>values[key]=value}}},preferences=Defaults.createPreferences(env);
 const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);game.newGameDefaultsPreferences=preferences;game.uiWindow='settings';return {values,env,preferences,game,display};}
module.exports=()=>test.describe('Application new-game defaults',()=>{
 test.it('offers distinct startup settings, tutorial and open/cancel controls with localized help',()=>{
  const setup=require('../src/js/startup-setup.js');
  for(const [width,height] of [[800,600],[320,340]]){const rect=setup.panelRect(width,height),rows=[setup.tutorialRegion(rect),setup.settingsRegion(rect),setup.cancelRegion(rect)];
   for(let i=0;i<rows.length;i++){const row=rows[i];test.assertTrue(row.x>=rect.x && row.x+row.width<=rect.x+rect.width);test.assertTrue(row.y+row.height<=rect.y+rect.height);if(i)test.assertTrue(rows[i-1].x+rows[i-1].width<row.x);}
   test.assertDefined(setup.helpRegions(width,height,new Config()).find(row=>row.action.type==='startupSettings'));test.assertTrue(!!Help.describe({type:'startupSettings'}));
  }
 });
 test.it('edits startup preferences without creating map objects or mutating an existing setup/game',()=>{
  const {env,preferences,game}=fixture(),before=Save.serialize(game),pending=new Config({density:7}),setupBefore=JSON.stringify(pending);
  const drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences(env),sounds=[];
  const window=new (require('../src/js/startup-settings.js'))(game.port,{newGameDefaultsPreferences:preferences,drawingPreferences,sound:{play:id=>sounds.push(id),isEnabled:()=>true}});
  test.assertFalse(window.active);window.open();const model=window.model;test.assertTrue(window.active);test.assertEqual(model.stars.length,0);test.assertEqual(model.allShips.length,0);test.assertEqual(model.config.numComputers,0);
  const rect=model.display.getActiveWindowRect();window.mouse({eventType:pdg.eventType_MouseDown,buttonNumber:0,mousePos:{x:rect.x+50,y:rect.y+12}});
  window.move({mousePos:{x:900,y:700},leftButton:true});window.key(pdg.key_Escape);test.assertTrue(window.active);test.assertNull(model.uiWindowDrag);test.assertDefined(drawingPreferences.readWindowPosition('settings'));
  window.key(13);window.key(pdg.key_Tab);window.key('n'.charCodeAt(0));test.assertEqual(model.turn,1);test.assertEqual(model.uiWindow,'settings');
  window.mouse({eventType:pdg.eventType_MouseDown,buttonNumber:0,mousePos:{x:0,y:0}});test.assertEqual(sounds.at(-1),1012);
  model.executeUIAction({type:'openNewGameDefaults'});model.executeUIAction({type:'openNewGameDefaultChoice',field:'density'});model.executeUIAction({type:'setNewGameDefault',field:'density',value:10});window.key(13);test.assertEqual(preferences.read().density,10);test.assertEqual(model.uiWindow,'settings');
  window.key(pdg.key_F3);test.assertFalse(drawingPreferences.readGrid());window.key(pdg.key_Escape);test.assertFalse(window.active);
  test.assertEqual(JSON.stringify(pending),setupBefore);test.assertEqual(Save.serialize(game),before);
  window.open();test.assertEqual(window.model,model);test.assertFalse(model.showGrid);model.executeUIAction({type:'openNewGameDefaults'});model.executeUIAction({type:'cycleNewGameDefault',field:'fastGame'});window.key(pdg.key_Escape);window.key(pdg.key_Escape);test.assertTrue(preferences.read().fastGame);
 });

 test.it('restores separate preferences in both adapters without storing title, players or autoplay',()=>{
  for(const native of [false,true]){const values={},storage={getItem:key=>values[key],setItem:(key,value)=>values[key]=value},cfg={useConfig:()=>{},getConfigString:storage.getItem,setConfigString:storage.setItem},env=native?{pdg:{cfg}}:{window:{localStorage:storage}};
   const p=Defaults.createPreferences(env),wanted={sectorSize:2,density:4,compSkill:5,compAdvantage:-2,fastGame:false,omniscient:true};p.write({...wanted,gameTitle:'Private',numComputers:77,autoplay:{enabled:true}});
   const loaded=Defaults.createConfig(Defaults.createPreferences(env));for(const key of Object.keys(wanted))test.assertEqual(loaded[key],wanted[key]);test.assertEqual(loaded.numComputers,2);test.assertFalse(loaded.gameTitle==='Private');test.assertFalse(loaded.autoplay.enabled);
  }
 });
 test.it('validates stored fields independently and tolerates corrupt or inaccessible storage',()=>{
  const {values,preferences}=fixture();values['galactica.newGameDefaults']=JSON.stringify({sectorSize:0,density:10,compSkill:'1',compAdvantage:4,fastGame:'false',omniscient:true});
  const loaded=preferences.read();test.assertEqual(loaded.sectorSize,5);test.assertEqual(loaded.density,10);test.assertEqual(loaded.compSkill,2);test.assertEqual(loaded.compAdvantage,0);test.assertTrue(loaded.fastGame);test.assertTrue(loaded.omniscient);
  values['galactica.newGameDefaults']='invalid';test.assertEqual(JSON.stringify(preferences.read()),JSON.stringify(Defaults.defaults()));
  const bad=Defaults.createPreferences({window:{get localStorage(){throw Error('Denied');}}});test.assertTrue(bad.read().fastGame);bad.write({density:3});test.assertEqual(bad.read().density,1);
 });
 test.it('saves an edited draft for future games without changing the active simulation and cancels edits',()=>{
  const {preferences,game,display}=fixture(),before=Save.serialize(game);test.assertTrue(game.executeUIAction({type:'openNewGameDefaults'}));
  const region=display.getNewGameDefaultsActionRegions().find(r=>r.action.field==='density');test.assertTrue(game.handleUIClick(region.rect.x+5,region.rect.y+5));test.assertEqual(game.newGameDefaultsChoice,'density');game.executeUIAction({type:'setNewGameDefault',field:'density',value:2});test.assertEqual(game.newGameDefaultsDraft.density,2);test.assertEqual(preferences.read().density,1);
  game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.uiWindow,'settings');test.assertEqual(preferences.read().density,1);test.assertNull(game.newGameDefaultsDraft);
  game.executeUIAction({type:'openNewGameDefaults'});game.executeUIAction({type:'openNewGameDefaultChoice',field:'density'});game.executeUIAction({type:'setNewGameDefault',field:'density',value:2});game.executeUIAction({type:'cycleNewGameDefault',field:'fastGame'});game.handleKeyPress(13);
  test.assertEqual(preferences.read().density,2);test.assertFalse(preferences.read().fastGame);test.assertEqual(Save.serialize(game),before);test.assertEqual(Defaults.createConfig(preferences).density,2);
 });
 test.it('cycles every supported choice and refuses unrelated fields or out-of-window actions',()=>{
  const draft=Defaults.defaults();for(const [field,maximum,minimum] of [['sectorSize',5,1],['density',10,1],['compSkill',5,1],['compAdvantage',3,-3]]){draft[field]=maximum;test.assertTrue(Defaults.cycle(draft,field));test.assertEqual(draft[field],minimum);}
  test.assertFalse(Defaults.cycle(draft,'gameTitle'));const {game}=fixture();test.assertFalse(game.executeUIAction({type:'saveNewGameDefaults'}));test.assertFalse(game.executeUIAction({type:'cycleNewGameDefault',field:'density'}));
 });
 test.it('selects numeric defaults directly while Escape dismisses only the choice menu',()=>{
  const {game,preferences,display}=fixture();game.executeUIAction({type:'openNewGameDefaults'});
  for(const [field,value] of [['sectorSize',4],['density',10],['compSkill',1],['compAdvantage',-3]]){
   const before=game.newGameDefaultsDraft[field];game.executeUIAction({type:'openNewGameDefaultChoice',field});
   test.assertFalse(game.executeUIAction({type:'setNewGameDefault',field,value:99}));test.assertEqual(game.newGameDefaultsDraft[field],before);
   const row=display.getNewGameDefaultsActionRegions().find(r=>r.action.value===value);test.assertDefined(row);game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertEqual(game.newGameDefaultsDraft[field],value);test.assertNull(game.newGameDefaultsChoice);
  }
  game.executeUIAction({type:'openNewGameDefaultChoice',field:'density'});game.handleKeyPress(pdg.key_DownArrow);test.assertEqual(game.newGameDefaultsChoiceIndex,1);test.assertEqual(game.newGameDefaultsDraft.density,10);game.handleKeyPress(pdg.key_Escape);
  test.assertEqual(game.uiWindow,'newGameDefaults');test.assertNull(game.newGameDefaultsChoice);test.assertEqual(game.newGameDefaultsDraft.density,10);
  game.executeUIAction({type:'openNewGameDefaultChoice',field:'density'});game.handleKeyPress(pdg.key_RightArrow);game.handleKeyPress(13);test.assertEqual(game.newGameDefaultsDraft.density,1);test.assertEqual(game.uiWindow,'newGameDefaults');
  test.assertEqual(preferences.read().compSkill,2);game.handleKeyPress(13);test.assertEqual(preferences.read().compSkill,1);test.assertEqual(preferences.read().compAdvantage,-3);
 });
 test.it('shows every numeric choice with localized captions and compact reachable bounds',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const [width,height] of [[800,600],[320,340]]){
   const {game,display}=fixture();game.port.getDrawingArea=()=>new pdg.Rect(width,height);game.executeUIAction({type:'openNewGameDefaults'});
   for(const field of ['sectorSize','density','compSkill','compAdvantage']){
    game.executeUIAction({type:'openNewGameDefaultChoice',field});const rect=display.getNewGameDefaultsWindowRect(),rows=display.getNewGameDefaultsActionRegions();test.assertEqual(rows.length,Defaults.choices(field).length+1);
    for(const row of rows){test.assertTrue(row.rect.x>=rect.x && row.rect.y>=rect.y && row.rect.x+row.rect.width<=rect.x+rect.width && row.rect.y+row.rect.height<=rect.y+rect.height);test.assertTrue(!!Help.describe(row.action));}
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)test.assertFalse(rows[i].rect.x<rows[j].rect.x+rows[j].rect.width && rows[j].rect.x<rows[i].rect.x+rows[i].rect.width && rows[i].rect.y<rows[j].rect.y+rows[j].rect.height && rows[j].rect.y<rows[i].rect.y+rows[i].rect.height);
    game.executeUIAction({type:'cancelNewGameDefaultChoice'});
   }
  }}}finally{pdg.res.setLanguage(language);}
 });
 test.it('localizes reachable modal controls and their help in normal and narrow viewports',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const [width,height] of [[800,600],[320,340]]){
   const {game,display}=fixture();game.port.getDrawingArea=()=>new pdg.Rect(width,height);game.executeUIAction({type:'openNewGameDefaults'});const rows=display.getNewGameDefaultsActionRegions(),rect=display.getNewGameDefaultsWindowRect();
   test.assertEqual(rows.length,8);test.assertTrue(require('../src/js/window-behavior.js').isSystem('newGameDefaults'));
   for(const row of rows){test.assertTrue(row.rect.x>=rect.x && row.rect.y>=rect.y && row.rect.x+row.rect.width<=rect.x+rect.width && row.rect.y+row.rect.height<=rect.y+rect.height);test.assertTrue(!!Help.describe(row.action));test.assertFalse(row.label==='');}
   const turn=game.turn;game.handleKeyPress(pdg.key_Tab);test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'newGameDefaults');
  }}}finally{pdg.res.setLanguage(language);}
 });
});
