const test=require('./test-framework.js'),GameSessions=require('../src/js/game-sessions.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Setup=require('../src/js/startup-setup.js'),I18n=require('../src/js/i18n.js');
function document(title='First') {const game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:title}));
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(s,size=12)=>Array.from(String(s)).length*size/2};return {game,display:new Display(game)};}
function fixture(){const sessions=new GameSessions(),first=document();sessions.accept(first.game,first.display);
 first.game.sessionCommands={begin:()=>sessions.begin(),rows:()=>sessions.rows(),select:id=>sessions.select(id)};return {sessions,...first};}
module.exports=()=>test.describe('Local game documents and New Game lifecycle',()=>{
 test.it('promotes only the accepted temporary document once, preserving previous IDs and file associations',()=>{
  const {sessions,game,display}=fixture();const previous=sessions.active;previous.file={name:'Original.gad4'};
  test.assertFalse(sessions.promoteTransient(game,display));sessions.beginTransient();test.assertFalse(sessions.promoteTransient(game,display));
  const practice=document('Tutorial'),transient=sessions.accept(practice.game,practice.display),nextId=sessions.nextId;
  test.assertFalse(sessions.promoteTransient(game,display));test.assertTrue(sessions.promoteTransient(practice.game,practice.display)===transient);
  test.assertEqual(transient.id,nextId);test.assertEqual(sessions.nextId,nextId+1);test.assertTrue(sessions.active===transient);test.assertUndefined(transient.file);test.assertEqual(sessions.rows().length,2);
  test.assertFalse(sessions.promoteTransient(practice.game,practice.display));test.assertEqual(sessions.nextId,nextId+1);test.assertTrue(sessions.select(previous.id)===previous);test.assertEqual(previous.file.name,'Original.gad4');
 });

 test.it('keeps startup open until a complete document is accepted and prevents cancelling the initial setup',()=>{
  const sessions=new GameSessions();test.assertTrue(sessions.starting);test.assertFalse(sessions.cancel());test.assertFalse(sessions.accept(null,null));test.assertTrue(sessions.starting);
  const d=document();test.assertTrue(!!sessions.accept(d.game,d.display));test.assertFalse(sessions.starting);test.assertFalse(sessions.accept(d.game,d.display));test.assertEqual(sessions.sessions.length,1);
 });
 test.it('cancel preserves the original graph, turn, events, allocations, selection and camera',()=>{
  const {sessions,game,display}=fixture(),star=game.factory.createStar(100000,100000,'Colony');star.owner=1;game.setSelectedObject(star);star.growth.desired=60;
  game.turn=9;const event=game.recordEvent('Order','Remember');display.camera.setZoom(1.8);display.camera.centerOn(star.x,star.y);const x=display.camera.offsetX,y=display.camera.offsetY;
  test.assertTrue(sessions.begin());test.assertFalse(sessions.begin());test.assertFalse(sessions.select(1));test.assertTrue(sessions.cancel());
  test.assertTrue(sessions.active.game===game);test.assertTrue(game.selectedObject===star);test.assertEqual(game.turn,9);test.assertTrue(game.eventLog.includes(event));test.assertEqual(star.growth.desired,60);test.assertEqual(display.camera.zoom,1.8);test.assertEqual(display.camera.offsetX,x);test.assertEqual(display.camera.offsetY,y);
 });
 test.it('creates independent games and switches back without resetting either simulation',()=>{
  const {sessions,game,display}=fixture();game.turn=7;sessions.begin();const second=document('Second');const active=sessions.accept(second.game,second.display);second.game.turn=3;
  test.assertFalse(second.game.factory===game.factory);test.assertFalse(second.game.rules===game.rules);test.assertFalse(second.game.config===game.config);
  test.assertTrue(sessions.select(1).game===game);test.assertEqual(game.turn,7);test.assertTrue(sessions.active.display===display);test.assertTrue(sessions.select(active.id).game===second.game);test.assertEqual(second.game.turn,3);const replacement=document('Restored');const replaced=sessions.replace(replacement.game,replacement.display);test.assertEqual(replaced.id,active.id);test.assertEqual(sessions.sessions.length,2);test.assertTrue(sessions.active.game===replacement.game);
 });
 test.it('keeps document IDs stable even when titles match and rejects unknown IDs',()=>{
  const {sessions}=fixture();sessions.begin();const second=document();const accepted=sessions.accept(second.game,second.display);test.assertFalse(sessions.rows()[0].id===accepted.id);test.assertEqual(sessions.rows()[0].title,sessions.rows()[1].title);
  test.assertFalse(sessions.select(-1));test.assertEqual(sessions.active.id,accepted.id);test.assertTrue(sessions.rows()[1].active);
 });
 test.it('exposes New Game and Open Games through menu buttons and menu-only shortcuts',()=>{
  const {sessions,game,display}=fixture();game.uiWindow='menu';const buttons=display.getCommandActionRegions();test.assertTrue(buttons.some(b=>b.action.type==='newGame'));test.assertTrue(buttons.some(b=>b.action.type==='showGames'));
  game.handleKeyPress(110);test.assertTrue(sessions.starting);sessions.cancel();game.uiWindow='menu';game.handleKeyPress(103);test.assertEqual(game.uiWindow,'games');
 });
 test.it('makes the game chooser modal to map, turn, selection and slider input',()=>{
  const {game,display}=fixture();const star=game.factory.createStar(0,0,'Home');star.owner=1;game.setSelectedObject(star);const turn=game.turn;
  game.executeUIAction({type:'showGames'});test.assertEqual(display.getUIActionAt(1,1).type,'consume');game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);test.assertEqual(game.turn,turn);test.assertTrue(game.selectedObject===star);test.assertEqual(game.uiWindow,'games');
  const r=display.getStarAllocationSliderRegions(star)[0].trackRect;test.assertFalse(game.beginUISliderDrag(r.x+2,r.y+2));game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);
 });
 test.it('pages every open document and preserves active marking and bounds',()=>{
  const {sessions,game,display}=fixture();for(let i=0;i<14;i++){sessions.begin();const d=document('Game '+i);sessions.accept(d.game,d.display);}game.executeUIAction({type:'showGames'});
  let ids=[];const count=display.getGameSessionLayout().pages;for(let page=0;page<count;page++){game.gameSessionPage=page;const l=display.getGameSessionLayout();ids.push(...l.visibleRows.map(r=>r.id));for(const b of l.buttons)test.assertTrue(b.rect.y+b.rect.height<=l.rect.y+l.rect.height);}
  test.assertEqual(ids.length,15);test.assertEqual(new Set(ids).size,15);game.gameSessionPage=999;test.assertEqual(display.getGameSessionLayout().page,count-1);game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.gameSessionPage,count-2);
 });
 test.it('selects a retained game through pointer actions and rejects actions outside the chooser',()=>{
  const {sessions,game,display}=fixture();sessions.begin();const second=document('Second');const active=sessions.accept(second.game,second.display);game.executeUIAction({type:'showGames'});
  const button=display.getGameSessionLayout().buttons.find(b=>b.action.id===active.id);test.assertTrue(game.handleUIClick(button.rect.x+2,button.rect.y+2));test.assertEqual(sessions.active.id,active.id);game.uiWindow=null;test.assertFalse(game.executeUIAction({type:'selectGame',id:1}));
 });
 test.it('separates setup Start and Cancel controls at normal and smaller sizes',()=>{
  for(const [w,h] of [[800,600],[640,480],[480,400]]){const panel=Setup.panelRect(w,h),start=Setup.startRegion(panel),cancel=Setup.cancelRegion(panel);test.assertTrue(start.y+start.height<cancel.y);test.assertTrue(cancel.y+cancel.height<=panel.y+panel.height);}
 });
 test.it('localizes document controls and keeps menu buttons inside the panel in every language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const {game,display}=fixture();game.uiWindow='menu';game.fullscreen={supported:true,active:()=>false};for(const height of [600,480,400]){display.getScreenSize=()=>({width:480,height});const r=display.getCommandWindowRect();for(const b of display.getCommandActionRegions())test.assertTrue(b.rect.y+b.rect.height<r.y+r.height-16);}for(const id of [836,837])test.assertTrue(I18n.getString(id).length>0);}}
  finally{pdg.res.setLanguage(old);}
 });
});
