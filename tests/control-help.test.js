const test=require('./test-framework.js'),Help=require('../src/js/hover-help.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Setup=require('../src/js/startup-setup.js'),Preferences=require('../src/js/drawing-preferences.js'),fs=require('fs'),path=require('path');
const screen={width:800,height:600},measure=t=>Array.from(t).length*6;
const candidate=(key='a',text='Explain this control.')=>({key,text,rect:{x:700,y:550,width:50,height:30}});
function fixture(){const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true})),home=game.factory.createStar(0,0,'Home');home.owner=1;game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:measure};const display=new Display(game);game.setSelectedObject(home);return {game,display,home};}
module.exports=()=>test.describe('V3 delayed control help',()=>{
 test.it('waits for a linger and removes help when leaving or changing controls',()=>{
  const help=new Help.HoverHelp();test.assertEqual(help.sample(candidate(),100,screen,measure),null);test.assertEqual(help.sample(candidate(),100+Help.delay-1,screen,measure),null);test.assertDefined(help.sample(candidate(),100+Help.delay,screen,measure));test.assertEqual(help.sample(candidate('b'),1000,screen,measure),null);test.assertEqual(help.sample(null,2000,screen,measure),null);test.assertEqual(help.visible,null);help.sample(candidate(),3000,screen,measure);test.assertDefined(help.sample(candidate(),4000,screen,measure));test.assertEqual(help.sample(candidate(),5000,{width:40,height:30},measure),null);test.assertEqual(help.visible,null);
 });
 test.it('wraps complete Unicode explanations within all viewport edges',()=>{
  for(const size of [{width:800,height:600},{width:320,height:420}])for(const rect of [{x:0,y:0,width:30,height:20},{x:size.width-30,y:size.height-20,width:30,height:20}]){
   const help=new Help.HoverHelp(),c={...candidate(),rect,text:'名前 星 Текст du contrôle avec une explication complète et sans perte.'};help.sample(c,0,size,measure);const hint=help.sample(c,1000,size,measure);test.assertDefined(hint);test.assertTrue(hint.rect.x>=0&&hint.rect.y>=0&&hint.rect.x+hint.rect.width<=size.width&&hint.rect.y+hint.rect.height<=size.height);for(const line of hint.lines)test.assertTrue(measure(line)<=hint.rect.width-24);test.assertEqual(hint.lines.join('').replace(/\s/g,''),c.text.replace(/\s/g,''));
  }
 });
 test.it('wraps varying-width glyphs without overflowing the carried word fragment',()=>{
  const measure=text=>Array.from(text).reduce((sum,c)=>sum+(c==='W'?25:c==='i'||c===' '?1:5),0),text='i abcdefW abcdefW';const lines=Help.wrap(text,40,measure);for(const line of lines)test.assertTrue(measure(line)<=40);test.assertEqual(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
 });
 test.it('explains actual fill, target marker and allocation clicks without changing the star',()=>{
  const {game,display,home}=fixture(),slider=display.getStarAllocationSliderRegions(home)[0];home.growth.value=20;home.growth.desired=70;display.setHoverPoint(slider.trackRect.x+20,slider.trackRect.y+4);const hint=display.getControlHelpCandidate();test.assertContains(hint.text,pdg.res.getString(858));test.assertEqual(home.growth.value,20);test.assertEqual(home.growth.desired,70);test.assertEqual(game.turn,1);test.assertEqual(Help.describe({type:'beginOrders',object:home}),pdg.res.getString(912));
 });
 test.it('uses the front window hit targets and suppresses map help behind modal dialogs',()=>{
  const {game,display}=fixture(),map=display.getMapButtonRegions().find(b=>b.action.type==='endTurn');display.setHoverPoint(map.rect.x+3,map.rect.y+3);test.assertContains(display.getControlHelpCandidate().text,pdg.res.getString(881));game.uiWindow='rename';test.assertEqual(display.getControlHelpCandidate(),null);game.uiWindow='settings';const language=display.getSettingsActionRegions()[0];display.setHoverPoint(language.rect.x+3,language.rect.y+3);test.assertContains(display.getControlHelpCandidate().text,pdg.res.getString(883));
 });
 test.it('suppresses hints during drags, destination placement and illustrated overlays',()=>{
  const {game,display}=fixture(),map=display.getMapButtonRegions()[0];display.setHoverPoint(map.rect.x+2,map.rect.y+2);
  for(const key of ['uiSliderDrag','uiWindowDrag','uiMapScrollDrag','pendingCourseEdit','overlay']){game[key]=key==='overlay'?{type:'lab'}:{};test.assertEqual(display.getControlHelpCandidate(),null);game[key]=null;}
 });
 test.it('clears pointer help on clicks and keyboard input without changing shortcuts',()=>{
  const {game,display}=fixture();display.setHoverPoint(10,10);game.handleKeyPress(pdg.key_Escape);test.assertEqual(display.hoverPoint,null);display.setHoverPoint(10,10);game.handleUIClick(10,10);test.assertEqual(display.hoverPoint,null);
 });
 test.it('persists the help toggle and remains usable when storage fails',()=>{
  const data=new Map(),env={window:{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}}},preferences=Preferences.createPreferences(env);test.assertTrue(preferences.readControlHelp());const {game,display}=fixture();game.drawingPreferences=preferences;game.executeUIAction({type:'toggleControlHelp'});test.assertFalse(game.showControlHelp);test.assertFalse(Preferences.createPreferences(env).readControlHelp());display.setHoverPoint(10,10);test.assertEqual(display.getControlHelpCandidate(),null);game.executeUIAction({type:'toggleControlHelp'});test.assertTrue(preferences.readControlHelp());const broken=Preferences.createPreferences({get window(){throw Error('unavailable');}});broken.writeControlHelp(false);test.assertTrue(broken.readControlHelp());
 });
 test.it('covers all current game control action types and dynamic course commands',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/js/display.js'),'utf8'),types=[...source.matchAll(/type:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);for(const type of types.filter(t=>t!=='consume'))test.assertTrue(!!Help.helpIds[type],'Missing help for '+type);for(const type of ['addWaypoint','editWaypoint','deleteWaypoint','clearOrders'])test.assertDefined(Help.helpIds[type]);test.assertEqual(Help.describe({type:'consume'}),'');
 });
 test.it('provides front setup controls with help at regular and smaller sizes',()=>{
  const config=new Config();for(const size of [screen,{width:640,height:480}]){const regions=Setup.helpRegions(size.width,size.height,config);for(const region of regions){test.assertTrue(!!Help.describe(region.action));test.assertTrue(region.rect.y>=0&&region.rect.y+region.rect.height<=size.height);}test.assertEqual(regions.filter(r=>r.action.type==='startupDensity').length,10);}
 });
 test.it('explains each hull in build and colony defaults without changing production',()=>{
  const language=pdg.res.getLanguage();
  try{for(const code of ['en','de','es','fr','ja','ru']) {
   pdg.res.setLanguage(code);const {game,display,home}=fixture();const before=JSON.stringify({hull:home.currentShip,defaults:game.players[1].defaultBuildType});
   for(const [index,type] of ['defense','scout','colony','battleship'].entries()) {
    const action=display.getContextActions(home).find(a=>a.action.type==='buildShip'&&a.action.shipType===type).action;
    const role=pdg.res.getString(921+index);const build=Help.describe(action);
    test.assertTrue(build.startsWith(role));test.assertTrue(build.includes(pdg.res.getString(861)));
    game.beginColonyDefaults();const defaults=display.getColonyDefaultActionRegions().find(a=>a.action.type==='setColonyDefaultHull'&&a.action.hull===index+1).action;
    const text=Help.describe(defaults);test.assertTrue(text.startsWith(role));test.assertTrue(text.includes(pdg.res.getString(890)));
    game.uiWindow=null;
    for(const explanation of [build,text]) {
     const help=new Help.HoverHelp(),c=candidate(type,explanation);help.sample(c,0,{width:320,height:420},measure);
     const hint=help.sample(c,1000,{width:320,height:420},measure);test.assertDefined(hint);
     test.assertTrue(hint.rect.y>=0&&hint.rect.y+hint.rect.height<=420);
     test.assertEqual(hint.lines.join('').replace(/\s/g,''),explanation.replace(/\s/g,''));
    }
   }
   test.assertEqual(JSON.stringify({hull:home.currentShip,defaults:game.players[1].defaultBuildType}),before);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('fits complete translated help for every action in all supported languages',()=>{
  const lang=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const type of Object.keys(Help.helpIds)){const text=Help.describe({type});test.assertTrue(text.length>10);const help=new Help.HoverHelp(),c=candidate(type,text);help.sample(c,0,{width:320,height:420},measure);const hint=help.sample(c,1000,{width:320,height:420},measure);test.assertDefined(hint);for(const line of hint.lines)test.assertTrue(measure(line)<=hint.rect.width-24);test.assertEqual(hint.lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));}}}finally{pdg.res.setLanguage(lang);}
 });
});
