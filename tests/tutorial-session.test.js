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
 test.it('completion returns to a previously unfinished setup with the exact configuration and text editor',()=>{
  const f=setup(true);enter(f.owner);install(f.owner);f.owner.controller.goto(60);f.owner.pressButton();test.assertFalse(f.owner.controller.active);test.assertTrue(f.owner.finished);test.assertTrue(f.sessions.starting);test.assertTrue(f.sessions.active===f.session);test.assertTrue(f.visible().config===f.application.config);test.assertTrue(f.visible().editor===f.application.editor);test.assertEqual(f.events[f.events.length-1],'complete');
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
