// Separate native process: real atomic writes followed by the actual PDG Quit API.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');require('./test-framework.js');
const Sessions=require('../src/js/game-sessions.js'),Documents=require('../src/js/documents.js'),Files=require('../src/js/document-files.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Quit=require('../src/js/quit-documents.js');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-quit-runtime-')),sessions=new Sessions();
 for(let i=0;i<2;i++){if(i)sessions.begin();sessions.accept(new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:'Native '+i})),{});}
 const docs=new Documents(Files.createFiles({}),()=>sessions.active,()=>{},()=>{},session=>!!sessions.close(session));
 const flow=new Quit.QuitDocuments(sessions,docs,{activate:session=>{sessions.active=session;return true;},exit:()=>{
  assert.strictEqual(sessions.sessions.length,0);for(let i=0;i<2;i++)assert.strictEqual(Save.restore(fs.readFileSync(path.join(directory,i+'.gad4.json'),'utf8')).config.gameTitle,'Native '+i);
  fs.rmSync(directory,{recursive:true,force:true});console.log('PASS real native Quit: both files written and all game documents closed before pdg.quit');pdg.quit();
 }},{});
 flow.request();docs.action('saveClose');docs.dialog.editor.text=path.join(directory,'1.gad4.json');await docs.submit();assert.strictEqual(flow.state,'checking');
 docs.action('saveClose');docs.dialog.editor.text=path.join(directory,'0.gad4.json');await docs.submit();assert.strictEqual(flow.state,'complete');
})().catch(error=>{console.error(error);process.exitCode=1;});
