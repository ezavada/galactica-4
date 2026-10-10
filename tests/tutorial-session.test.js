const test=require('./test-framework.js'),fs=require('fs'),path=require('path');
const Sessions=require('../src/js/game-sessions.js'),Owner=require('../src/js/tutorial-session.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js'),{createTutorialGame}=require('../src/js/tutorial-game.js');
const pages=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-tutorial.json'),'utf8')).languages.en.pages;
const galaxy=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tutorial/galaxy.json'),'utf8'));
function display(game){game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return new Display(game);}
function setup(starting=false){
 const sessions=new Sessions(),original=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,gameTitle:'Original'})),view=display(original),session=sessions.accept(original,view);
 const home=original.factory.createStar(200000,200000,'Home');home.owner=1;original.setSelectedObject(home);original.turn=7;original.uiWindow='events';view.camera.setZoom(1.8);view.centerOn(home.x,home.y);session.file={name:'Original.gad4'};session.autoplay={getStatus:()=>({running:true})};
 if(starting)sessions.begin();
 const application={game:original,display:view,config:{title:'Unsubmitted setup'},editor:{text:'Unsubmitted name'},autoplay:session.autoplay};let visible=application;
 const events=[],owner=new Owner(pages,{sessions,captureApplication:()=>visible,suspendApplication:()=>{visible={game:null,display:null,config:{title:'Tutorial setup'},editor:null};events.push('hide');},restoreApplication:saved=>{visible=saved;events.push('restore');},installApplication:(game,display)=>{visible={game,display};events.push('install');},onStop:reason=>events.push(reason)});
 return {sessions,original,view,session,application,owner,events,visible:()=>visible};
}
function enter(owner){owner.start({window:1});owner.pressButton({window:1});owner.pressButton();test.assertTrue(owner.openSetup());test.assertTrue(owner.acceptSetup());}
function install(owner){const game=createTutorialGame(galaxy),view=display(game);test.assertTrue(!!owner.install(game,view));return {game,view};}
module.exports=()=>test.describe('Temporary tutorial document lifecycle',()=>{
 test.it('launches from the real game-menu action and preserves the suspended document on cancellation',()=>{
  const f=setup(),before=Save.serialize(f.original);f.original.tutorialCommands={available:()=>!f.owner.controller.active,start:()=>{f.original.uiWindow=null;f.owner.start({window:1});return true;}};f.original.uiWindow='menu';
  const row=f.view.getCommandActionRegions().find(r=>r.action.type==='startTutorial');test.assertDefined(row);test.assertTrue(f.original.handleUIClick(row.rect.x+3,row.rect.y+3));test.assertEqual(f.owner.controller.pageId,100);test.assertFalse(f.original.canStartTutorial());test.assertFalse(f.original.executeUIAction({type:'startTutorial'}));
  f.owner.pressButton();test.assertTrue(f.sessions.transient!==null);f.owner.stop();test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible()===f.application);test.assertTrue(f.original.canStartTutorial());
  const expected=Save.restore(before);expected.uiWindow=null;test.assertEqual(Save.serialize(f.original),Save.serialize(expected));
 });
 test.it('keeps localized launch controls reachable alongside setup and menu controls in short viewports',()=>{
  const Setup=require('../src/js/startup-setup.js'),Help=require('../src/js/hover-help.js'),language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const [width,height] of [[800,600],[640,480],[320,340]]){
   const f=setup();f.original.port.getDrawingArea=()=>new pdg.Rect(width,height);f.original.tutorialCommands={start:()=>true};f.original.manualCommands={};f.original.sessionCommands={};f.original.fileCommands={};f.original.uiWindow='menu';
   const rows=f.view.getCommandActionRegions(),tutorial=rows.find(r=>r.action.type==='startTutorial');test.assertDefined(tutorial);test.assertEqual(tutorial.label,pdg.res.getString(960));test.assertEqual(Help.describe(tutorial.action),pdg.res.getString(964));
   const setupRows=Setup.helpRegions(width,height,f.original.config),launch=setupRows.find(r=>r.action.type==='startTutorial'),cancel=setupRows.find(r=>r.action.type==='open');test.assertTrue(launch.rect.x+launch.rect.width<=cancel.rect.x);
   for(const row of [...rows,launch,cancel])test.assertTrue(row.rect.x>=0 && row.rect.y>=0 && row.rect.x+row.rect.width<=width && row.rect.y+row.rect.height<=height);
   for(let i=1;i<rows.length;i++)test.assertTrue(rows[i-1].rect.y+rows[i-1].rect.height<=rows[i].rect.y);
  }}}finally{pdg.res.setLanguage(language);}
 });
 test.it('plays source lesson-entry cues once, leaves source-silent pages quiet and stops on completion',()=>{
  const f=setup(),played=[],Sound=require('../src/js/sound.js');
  f.owner.options.sound=Sound.createSound({getSound(file){return {setLooping:()=>{},start:()=>played.push(file),stop:()=>played.push('stop')};}},{readSound:()=>true,writeSound:()=>{}});
  enter(f.owner);install(f.owner);test.assertEqual(played.filter(x=>x==='tutorial/sounds/7000.wav').length,6);
  const count=played.length;f.owner.controller.tick(1000);f.owner.controller.observe({type:'unrelated'});test.assertEqual(played.length,count);
  f.owner.pressButton();test.assertEqual(f.owner.controller.pageId,6);test.assertEqual(played.length,count);
  f.owner.pressButton();test.assertEqual(f.owner.controller.pageId,7);test.assertEqual(played.length,count);
  f.owner.controller.observe({type:'zoomChanged'},1000);f.owner.controller.tick(4001);test.assertEqual(f.owner.controller.pageId,8);test.assertEqual(played.filter(x=>x==='tutorial/sounds/7000.wav').length,7);
  f.owner.controller.goto(60);f.owner.pressButton();test.assertEqual(played[played.length-1],'stop');test.assertTrue(f.visible().game!==f.original);
 });
 test.it('respects mute without replaying a skipped tutorial cue and stops even before hiding a game',()=>{
  const f=setup(),played=[],Sound=require('../src/js/sound.js');
  const audio=f.owner.options.sound=Sound.createSound({getSound(file){return {setLooping:()=>{},start:()=>played.push(file),stop:()=>played.push('stop')};}},{readSound:()=>false,writeSound:()=>{}});
  f.owner.start({window:1});test.assertEqual(played.length,0);audio.setEnabled(true);f.owner.controller.tick(1000);test.assertEqual(played.length,0);
  f.owner.controller.goto(100);test.assertEqual(played.filter(x=>x==='tutorial/sounds/7000.wav').length,1);
  f.owner.stop();test.assertEqual(played[played.length-1],'stop');test.assertFalse(f.owner.engaged);test.assertTrue(f.visible()===f.application);
 });

 test.it('leaves an open game visible until the hiding acknowledgment and removes its file association from tutorial play',()=>{
  const f=setup();f.owner.start({window:1});test.assertEqual(f.owner.controller.pageId,100);test.assertFalse(f.owner.engaged);test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible()===f.application);
  f.owner.pressButton({window:1});test.assertEqual(f.owner.controller.pageId,1);test.assertTrue(f.owner.engaged);test.assertNull(f.sessions.active);test.assertTrue(f.sessions.starting);test.assertTrue(f.visible().game===null);
  f.owner.pressButton();f.owner.openSetup();f.owner.acceptSetup();const {game}=install(f.owner);test.assertEqual(f.owner.controller.pageId,5);test.assertEqual(game.selectedObject.id,2);
  test.assertEqual(f.sessions.active.id,0);test.assertUndefined(f.sessions.active.file);test.assertEqual(f.session.file.name,'Original.gad4');test.assertEqual(f.sessions.rows().length,1);test.assertTrue(f.sessions.sessions[0]===f.session);test.assertFalse(f.sessions.select(f.session.id));test.assertFalse(f.sessions.replace(f.original,f.view));f.owner.stop();
 });
 test.it('restores the original graph, camera, preferences, file, autoplay and session ID after tutorial cancellation',()=>{
  const f=setup(),saved=Save.serialize(f.original),camera=[f.view.camera.zoom,f.view.camera.panX,f.view.camera.panY],nextId=f.sessions.nextId;enter(f.owner);const {game,view}=install(f.owner);
  game.turn=20;game.stars[0].name='Changed tutorial';game.showControlHelp=false;game.showEnemyEvents=false;view.camera.setZoom(3);const runtime=game.tutorialRuntime;
  test.assertTrue(f.owner.stop());test.assertTrue(runtime.disposed);test.assertUndefined(game.tutorialRuntime);test.assertTrue(f.sessions.active===f.session);test.assertFalse(f.sessions.starting);test.assertEqual(f.sessions.nextId,nextId);test.assertEqual(Save.serialize(f.original),saved);
  test.assertEqual([f.view.camera.zoom,f.view.camera.panX,f.view.camera.panY].join(','),camera.join(','));test.assertTrue(f.visible()===f.application);test.assertTrue(f.sessions.active.file===f.session.file);test.assertTrue(f.sessions.active.autoplay===f.application.autoplay);test.assertEqual(f.events.filter(e=>e==='restore').length,1);test.assertFalse(f.owner.stop());
 });
 test.it('completion keeps the practice graph and renderer as an unsaved ordinary document, without changing the previous game',()=>{
  const f=setup(),original=Save.serialize(f.original),nextId=f.sessions.nextId;enter(f.owner);const {game,view}=install(f.owner),runtime=game.tutorialRuntime;
  game.turn=9;game.stars[0].name='Practiced';view.camera.setZoom(2);view.camera.centerOn(400000,600000);const camera=[view.camera.zoom,view.camera.panX,view.camera.panY];let disposed=0;view.dispose=()=>disposed++;
  const transient=f.sessions.active;f.owner.controller.goto(60);f.owner.pressButton();
  test.assertFalse(f.owner.controller.active);test.assertTrue(f.owner.finished);test.assertTrue(runtime.disposed);test.assertUndefined(game.tutorialRuntime);test.assertUndefined(game.tutorialSimulation);
  test.assertEqual(disposed,0);test.assertTrue(f.visible().game===game);test.assertTrue(f.visible().display===view);test.assertTrue(f.sessions.active===transient);test.assertEqual(transient.id,nextId);test.assertUndefined(transient.file);test.assertEqual(f.sessions.nextId,nextId+1);
  test.assertEqual(game.turn,9);test.assertEqual(game.stars[0].name,'Practiced');test.assertEqual([view.camera.zoom,view.camera.panX,view.camera.panY].join(','),camera.join(','));
  test.assertEqual(f.sessions.rows().length,2);test.assertNull(f.sessions.transient);test.assertFalse(f.sessions.starting);test.assertEqual(Save.serialize(f.original),original);test.assertTrue(f.session.file.name==='Original.gad4');
  test.assertTrue(f.sessions.select(f.session.id)===f.session);test.assertTrue(f.sessions.select(transient.id).game===game);test.assertFalse(f.owner.stop());test.assertEqual(f.events.filter(x=>x==='restore').length,0);
 });
 test.it('reverts a saved practice graph while retaining the current lesson and binding only the restored document',()=>{
  const f=setup();enter(f.owner);const {game,view}=install(f.owner),session=f.sessions.active;
  f.owner.pressButton();f.owner.pressButton();test.assertEqual(f.owner.controller.pageId,7);
  view.zoomIn();const progress=JSON.stringify(f.owner.controller.snapshot(1000));
  const saved=Save.serialize(game),loaded=Save.restore(saved),nextView=display(loaded),runtime=f.owner.runtime;
  let disposed=0;view.dispose=()=>disposed++;const file={name:'Practice.gad4',text:saved};
  test.assertTrue(f.owner.revert(loaded,nextView,file)===session);test.assertEqual(disposed,1);test.assertTrue(runtime.disposed);
  test.assertUndefined(game.tutorialRuntime);test.assertUndefined(game.tutorialSimulation);test.assertTrue(!!loaded.tutorialSimulation);
  test.assertTrue(f.owner.game===loaded);test.assertTrue(f.owner.display===nextView);test.assertTrue(f.visible().game===loaded);
  test.assertTrue(session.file===file);test.assertTrue(session.game===loaded);test.assertEqual(JSON.stringify(f.owner.controller.snapshot(1000)),progress);
  f.owner.controller.tick(loaded.getCurrentMilliseconds()+4000);test.assertEqual(f.owner.controller.pageId,8);
  f.owner.pressButton();test.assertEqual(f.owner.controller.pageId,9);f.owner.pressButton();test.assertEqual(f.owner.controller.pageId,10);
  loaded.stars.find(star=>star.id===2).shipBuilding.desired=20;f.owner.runtime.notify({type:'productionChanged',starId:2});
  f.owner.stop();test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible()===f.application);test.assertUndefined(loaded.tutorialRuntime);
 });
 test.it('rolls back a failed restored renderer binding without disposing the active practice document',()=>{
  const f=setup();enter(f.owner);const {game,view}=install(f.owner),session=f.sessions.active,file=session.file;
  const loaded=Save.restore(Save.serialize(game)),badView=display(loaded);badView.zoomIn=null;
  let previousDisposed=0,failed=false;view.dispose=()=>previousDisposed++;
  try{f.owner.revert(loaded,badView,{name:'Practice.gad4'});}catch(error){failed=true;}
  test.assertTrue(failed);test.assertEqual(previousDisposed,0);test.assertTrue(f.owner.game===game);test.assertTrue(f.owner.display===view);
  test.assertTrue(session.game===game);test.assertTrue(session.display===view);test.assertTrue(session.file===file);
  test.assertTrue(game.tutorialRuntime===f.owner.runtime);test.assertFalse(f.owner.runtime.disposed);test.assertUndefined(loaded.tutorialRuntime);
  test.assertEqual(f.owner.controller.pageId,5);f.owner.stop();test.assertTrue(f.sessions.active===f.session);
 });
 test.it('finishes after revert with the restored practice document and saved file association intact',()=>{
  const f=setup();enter(f.owner);const {game}=install(f.owner),text=Save.serialize(game),loaded=Save.restore(text),view=display(loaded),file={name:'Practice.gad4',text};
  f.owner.revert(loaded,view,file);f.owner.controller.goto(60);f.owner.pressButton();
  test.assertTrue(f.sessions.active.game===loaded);test.assertTrue(f.sessions.active.file===file);test.assertTrue(f.sessions.active.id>0);
  test.assertUndefined(loaded.tutorialRuntime);test.assertUndefined(loaded.tutorialSimulation);test.assertTrue(f.visible().display===view);
 });
 test.it('continues normal production and saves the completed practice game without reattaching tutorial safeguards',()=>{
  const f=setup();enter(f.owner);const {game}=install(f.owner),home=game.stars.find(s=>s.id===2);game.turn=3;
  const turn=game.turn;home.growth.desired=10;home.shipBuilding.desired=20;home.research.desired=70;
  const allocations=[home.growth.desired,home.shipBuilding.desired,home.research.desired];f.owner.controller.goto(60);f.owner.pressButton();
  const saved=Save.serialize(game),loaded=Save.restore(saved);test.assertEqual(loaded.turn,turn);test.assertUndefined(loaded.tutorialSimulation);test.assertUndefined(loaded.tutorialRuntime);
  game.rules.getStarShipBuildingAmount=()=>0;game.rules.getStarResearchAmount=()=>0;game.endTurn();test.assertEqual(game.turn,turn+1);test.assertEqual([home.growth.desired,home.shipBuilding.desired,home.research.desired].join(','),allocations.join(','));
  test.assertEqual(game.tutorialRandom.state,loaded.tutorialRandom.state);
 });
 test.it('completion before accepting a practice game restores suspended setup rather than inventing a document',()=>{
  const f=setup(true);f.owner.start({window:34,modal:true});f.owner.controller.goto(60);f.owner.pressButton();
  test.assertTrue(f.sessions.starting);test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible()===f.application);test.assertEqual(f.sessions.rows().length,1);
 });
 test.it('completion with no previous document leaves a playable practice game instead of returning to startup',()=>{
  const sessions=new Sessions(),state={config:{title:'Initial'}},calls=[];let visible=state;
  const owner=new Owner(pages,{sessions,captureApplication:()=>state,suspendApplication:()=>{},restoreApplication:()=>calls.push('restore'),installApplication:(game,display)=>{visible={game,display};}});
  owner.start();owner.pressButton();owner.openSetup();owner.acceptSetup();const {game,view}=install(owner);owner.controller.goto(60);owner.pressButton();
  test.assertFalse(sessions.starting);test.assertEqual(sessions.rows().length,1);test.assertTrue(sessions.active.game===game);test.assertTrue(visible.display===view);test.assertEqual(calls.length,0);test.assertTrue(sessions.active.id>0);
 });
 test.it('cancelling before hiding or during setup creates no tutorial document and restores only states that were suspended',()=>{
  const f=setup();f.owner.start({window:1});f.owner.stop();test.assertEqual(f.events.join(','),'cancel');test.assertTrue(f.visible()===f.application);
  const second=setup();second.owner.start({window:34,modal:true});test.assertTrue(second.owner.engaged);second.owner.stop();test.assertEqual(second.events.join(','),'hide,restore,cancel');test.assertTrue(second.sessions.active===second.session);
 });
 test.it('rejects incomplete startup and duplicate installs without replacing ordinary sessions',()=>{
  const f=setup();test.assertFalse(f.owner.install(f.original,f.view));enter(f.owner);const {game,view}=install(f.owner);test.assertFalse(f.owner.install(game,view));test.assertFalse(f.owner.openSetup());test.assertFalse(f.owner.acceptSetup());test.assertFalse(f.sessions.beginTransient());f.owner.stop();test.assertFalse(f.owner.start());
 });
 test.it('rolls back a failing suspend callback exactly once',()=>{
  const f=setup();f.owner.options.suspendApplication=()=>{throw Error('Suspend failed');};let failed=false;try{f.owner.start({window:34,modal:true});}catch(error){failed=true;}
  test.assertTrue(failed);test.assertFalse(f.owner.controller.active);test.assertFalse(f.owner.engaged);test.assertNull(f.sessions.transient);test.assertTrue(f.sessions.active===f.session);test.assertEqual(f.events.filter(e=>e==='restore').length,1);test.assertEqual(f.events.filter(e=>e==='error').length,1);
 });
 test.it('rolls back failed application installation and disposes the tutorial renderer and runtime',()=>{
  const f=setup();enter(f.owner);const game=createTutorialGame(galaxy),view=display(game);let disposed=0;const dispose=view.dispose.bind(view);view.dispose=()=>{disposed++;dispose();};f.owner.options.installApplication=()=>{throw Error('Install failed');};let failed=false;try{f.owner.install(game,view);}catch(error){failed=true;}
  test.assertTrue(failed);test.assertEqual(disposed,1);test.assertFalse(f.owner.controller.active);test.assertUndefined(game.tutorialRuntime);test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible()===f.application);
 });
 test.it('returns to initial startup when no ordinary document existed',()=>{
  const sessions=new Sessions(),state={config:{title:'Initial'}},calls=[];const owner=new Owner(pages,{sessions,captureApplication:()=>state,suspendApplication:()=>{},restoreApplication:value=>calls.push(value),installApplication:()=>{}});owner.start();owner.pressButton();owner.openSetup();owner.acceptSetup();install(owner);owner.stop();test.assertTrue(sessions.starting);test.assertNull(sessions.active);test.assertEqual(sessions.sessions.length,0);test.assertTrue(calls[0]===state);
 });
 test.it('keeps modal recovery above the original document until it is resolved',()=>{
  const f=setup();f.owner.start({window:44,modal:true});test.assertEqual(f.owner.controller.pageId,101);test.assertFalse(f.owner.engaged);f.owner.pressButton({window:44,modal:true});test.assertFalse(f.owner.engaged);f.owner.pressButton({window:1});test.assertEqual(f.owner.controller.pageId,100);f.owner.pressButton({window:1});test.assertTrue(f.owner.engaged);f.owner.stop();test.assertTrue(f.sessions.active===f.session);
 });
});
