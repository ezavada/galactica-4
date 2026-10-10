const assert=require('assert'),path=require('path');require('./test-framework.js');
const Sessions=require('../src/js/game-sessions.js'),Documents=require('../src/js/documents.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Quit=require('../src/js/quit-documents.js');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
function fixture(save) {
 const sessions=new Sessions();for(let i=0;i<2;i++){if(i)sessions.begin();sessions.accept(new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:'Game '+i})),{});}
 let exits=0;const docs=new Documents({browser:true,cancelPick:()=>{},save},()=>sessions.active,()=>{},()=>{},session=>!!sessions.close(session));
 const flow=new Quit.QuitDocuments(sessions,docs,{activate:session=>{sessions.active=session;return true;},exit:()=>exits++},{});return {sessions,docs,flow,exits:()=>exits};
}
(async()=>{
 // Each successful write precedes closing its own document; exit waits for both.
 {const writes=[],f=fixture(async(text,name)=>{writes.push({text,name});return {name,text};});f.flow.request();f.docs.action('saveClose');await f.docs.submit();assert.strictEqual(f.sessions.sessions.length,1);assert.strictEqual(f.exits(),0);f.docs.action('saveClose');await f.docs.submit();assert.strictEqual(f.exits(),1);assert.deepStrictEqual(writes.map(x=>Save.restore(x.text).config.gameTitle),['Game 1','Game 0']);}
 // Failed saving never exits or closes the original; acknowledgment cancels Quit.
 {const f=fixture(async()=>{throw Error('disk full');}),original=f.sessions.active;f.flow.request();f.docs.action('saveClose');await f.docs.submit();assert.strictEqual(f.exits(),0);assert.strictEqual(f.sessions.active,original);assert.strictEqual(f.docs.dialog.kind,'status');f.docs.action('ack');assert.strictEqual(f.flow.state,'idle');assert.strictEqual(f.sessions.sessions.length,2);}
 // Canceled picking cancels the whole Quit transaction, including future saves.
 {const f=fixture(async()=>null),original=f.sessions.active;f.flow.request();f.docs.action('saveClose');await f.docs.submit();assert.strictEqual(f.flow.state,'idle');assert.strictEqual(f.exits(),0);assert.strictEqual(f.sessions.active,original);f.docs.files.save=async(text,name)=>({name,text});f.docs.beginSave();await f.docs.submit();assert.strictEqual(f.exits(),0);assert.strictEqual(f.sessions.sessions.length,2);assert.strictEqual(f.docs.dialog.kind,'status');}
 // A pending write cannot be bypassed by another Quit or Cancel request.
 {let finish;const f=fixture((text,name)=>new Promise(resolve=>finish=()=>resolve({name,text})));f.flow.request();f.docs.action('saveClose');const saving=f.docs.submit();assert.strictEqual(f.flow.request(),false);assert.strictEqual(f.docs.cancel(),false);assert.strictEqual(f.exits(),0);finish();await saving;assert.strictEqual(f.exits(),0);assert.strictEqual(f.sessions.sessions.length,1);f.docs.action('discardClose');assert.strictEqual(f.exits(),1);}
 // Changes during saving require a fresh decision before any exit.
 {let finish;const f=fixture((text,name)=>new Promise(resolve=>finish=()=>resolve({name,text}))),original=f.sessions.active;f.flow.request();f.docs.action('saveClose');const saving=f.docs.submit();original.game.turn=2;finish();await saving;assert.strictEqual(f.docs.dialog.kind,'close');assert.strictEqual(f.sessions.active,original);assert.strictEqual(f.exits(),0);f.docs.cancel();assert.strictEqual(f.flow.state,'idle');assert.strictEqual(Save.restore(original.file.text).turn,1);}
 console.log('PASS Quit async: all-game saves, failed/canceled/deferred writes, repeated requests and changed content');
})().catch(error=>{console.error(error);process.exitCode=1;});
