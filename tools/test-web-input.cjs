// Actual browser input against the packaged app. No documents are written.
// Usage: node tools/test-web-input.cjs BUILD_DIR [LANGUAGE]
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),{spawn}=require('child_process'),assert=require('assert');
const root=path.resolve(process.argv[2]),language=process.argv[3] || 'en';
const instrumentation=`
window.inputTest={start:()=>startGame(),game:()=>game,input:commandInput,state:currentInputState,settings:()=>startupSettings,documents,
 prepare:()=>{window.inputCalls=[];userManual.open=()=>{inputCalls.push('help');return true;};documents.beginSave=as=>{inputCalls.push(as?'saveAs':'save');return true;};game.requestEndTurn=()=>{inputCalls.push('end');return true;};game.attention.next=()=>{inputCalls.push('attention');return true;};},
 rect:()=>game.display.getActiveWindowRect()};
`;
const server=http.createServer((request,response)=>{
 try{
  let file=path.resolve(root,'.'+new URL(request.url,'http://localhost').pathname);if(file!==root && !file.startsWith(root+path.sep))throw Error('Invalid path');
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  let data=fs.readFileSync(file);if(file===path.join(root,'main.js'))data=Buffer.from(data.toString()+instrumentation);
  response.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':file.endsWith('.wav')?'audio/wav':'text/html');response.end(data);
 }catch(error){response.writeHead(404);response.end('Missing');}
});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-input-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let sequence=0,buffer='',failure=null,session;const pending=new Map();
chrome.stdio[4].on('data',bytes=>{
 buffer+=bytes;let index;while((index=buffer.indexOf('\0'))>=0){const message=JSON.parse(buffer.slice(0,index));buffer=buffer.slice(index+1);
  if(message.method==='Runtime.exceptionThrown')failure=message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text;
  const task=pending.get(message.id);if(task){clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result);}
 }
});
const send=(method,params={},sessionId=session)=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method));},20000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function evaluate(expression){if(failure)throw Error(failure);const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);return result.result.value;}
async function check(expression,label){assert(await evaluate(expression),label+' '+JSON.stringify(await evaluate('({calls:window.inputCalls,state:window.inputTest && inputTest.state(),focus:window.inputTest && inputTest.input.focus})')));}
async function key(key,modifiers=0){const special={Enter:13,Escape:27,Tab:9,ArrowLeft:37,ArrowRight:39,Home:36,End:35},code=special[key] || (key==='?'?191:0) || (/^F\d+$/.test(key)?111+Number(key.slice(1)):key.toUpperCase().charCodeAt(0));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key,windowsVirtualKeyCode:code,modifiers,...(!modifiers && key.length===1?{text:key}:{})});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key,windowsVirtualKeyCode:code,modifiers});await delay(100);
}
async function point(x,y){return evaluate(`(()=>{const c=Module.canvas.getBoundingClientRect();return {x:c.x+${x}*c.width/Module.canvas.width,y:c.y+${y}*c.height/Module.canvas.height}})()`);}
async function click(x,y,button='left'){const p=await point(x,y);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button,clickCount:1});await delay(100);}
async function wheel(x,y,deltaY){const p=await point(x,y);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaX:0,deltaY});await delay(100);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const {targetId}=await send('Target.createTarget',{url:'about:blank'},undefined);({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},undefined));
 await send('Runtime.enable');await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('galactica.installationStarted','true');localStorage.setItem('galactica.ShowSplash','false');localStorage.setItem('galactica.language',${JSON.stringify(language)});`});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+language});
 let ready=false;for(let n=0;n<120;n++){await delay(250);if(await evaluate('document.documentElement.dataset.status==="ready" && !!window.inputTest')){ready=true;break;}}assert(ready,'Startup timed out');
 await evaluate('inputTest.start();inputTest.prepare();window.g=inputTest.game();void 0');await delay(200);
 const primary=await evaluate('inputTest.input.platform==="darwin"')?4:2;
 await key('Enter');await check('inputCalls.length===0','Bare Enter issued a command');
 await key('Enter',primary);await check('inputCalls.join(",")==="end"','Explicit End Turn failed');
 await key('s',primary|8);await key('s',primary);await check('inputCalls.slice(-2).join(",")==="saveAs,save"','Save As also triggered Save');
 await key('F1');await key('?',primary|8);await check('inputCalls.filter(c=>c==="help").length===2','Help aliases failed');
 await evaluate('window.oldShips=g.showShips;void 0');await key('F2');await check('g.showShips!==oldShips','F2 did not toggle ships');
 await evaluate('g.uiWindow="settings";void 0');await key('s',primary);await check('inputCalls.filter(c=>c==="save").length===1','Save escaped a modal');await key('Escape');
 await evaluate('g.uiWindow="comparison";void 0');await key('Tab');await check('inputCalls.at(-1)==="attention"','Tab was trapped by an informational window');
 await click(1,1);await check('g.uiWindow==="comparison" && inputTest.input.focus==="map"','Outside map click closed or failed to defocus the informational window');
 await key('Enter',primary);await check('inputCalls.filter(c=>c==="end").length===2','Gameplay focus did not re-enable End Turn');
 await evaluate('window.zoom=g.display.camera.zoom;window.r=inputTest.rect();void 0');const rect=await evaluate('r');await wheel(rect.x+20,rect.y+60,-120);await check('g.display.camera.zoom===zoom','Wheel at panel boundary zoomed the map');
 await wheel(2,200,-120);await check('g.display.camera.zoom>zoom','Wheel outside panel did not zoom');
 await evaluate('g.uiWindow=null;window.home=g.stars.find(s=>s.owner===1);g.beginRenameObject(home);void 0');
 await key('a',primary);await key('z');await check('g.renameText==="z"','Select All/replace failed');
 await key('s',primary);await check('inputCalls.filter(c=>c==="save").length===1 && g.renameText==="z"','Save escaped a text editor');
 await key('Escape');await check('home.name!=="z" && g.uiWindow===null','Escape did not discard rename draft');
 await evaluate('window.ship=g.factory.createShip(home.x,home.y,"scout",home,true);g.setSelectedObject(ship);g.beginMapOrder(ship);void 0');await key('Enter',primary);await check('inputCalls.filter(c=>c==="end").length===2','End Turn escaped targeting');await click(2,200,'right');await check('!g.pendingMapOrderObject && !g.mapSelectionPicker','Right-click committed rather than cancelled targeting');
 assert(!failure,failure);console.log('PASS actual browser command aliases, exact chords, modal/text ownership, modeless panels, Tab, wheel boundaries and target cancellation '+language);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();for(const task of pending.values())clearTimeout(task.timer);setTimeout(()=>fs.rmSync(profile,{recursive:true,force:true}),250);});
