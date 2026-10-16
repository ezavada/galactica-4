// Actual chat recipient clicks, title dragging and sending against a native HTTP host.
// Fullscreen is disabled in this fixture to keep screenshot comparisons stable.
// Usage: node tools/test-web-chat-windows.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before|after] [WIDTH HEIGHT]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides Chrome. The host and browser profiles are temporary.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const viewWidth=Number(process.argv[6] || 640),viewHeight=Number(process.argv[7] || 340);
if(!Number.isInteger(viewWidth) || !Number.isInteger(viewHeight) || viewWidth<320 || viewHeight<340)throw Error('Invalid viewport');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-chat-windows.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('new pdg.Rect(0, 0, 800, 600)', 'new pdg.Rect(0, 0, '+viewWidth+', '+viewHeight+')').replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.lastMouse={type:event.eventType,button:event.buttonNumber,x:event.mousePos.x,y:event.mousePos.y};window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.chatAudit={chat:networkChat,preferences:drawingPreferences,installNetworkGame,makeClient:address=>new (require("./src/js/network-client.js").NetworkClient)(address)};window.foregroundAudit={window:foregroundApplicationWindow,placement:windowPlacement};window.visual={getGame:()=>game,getDisplay:()=>display,getSound:()=>sound,getDocuments:()=>documents,getSessions:()=>sessions,getOwner:()=>null};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const infoFile=path.join(profile,'live-info.json');
const native=spawn(path.join(__dirname,'../gad4'),[path.join(__dirname,'serve-test-network-host.js')],{cwd:path.join(__dirname,'..'),env:{...process.env,GALACTICA_TEST_HOST_FILE:path.join(profile,'host.json'),GALACTICA_TEST_HOST_INFO:infoFile,GALACTICA_TEST_LANGUAGE:process.argv[4]||'en'},stdio:['ignore','ignore','inherit']});
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:viewWidth,height:viewHeight,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");localStorage.setItem("galactica.fullscreen","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async name=>{currentScene=name;
 const frame=async()=>{const before=await evaluate('window.testDrawCount || 0');for(let i=0;i<100;i++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>='+ (before+2)))return;}throw Error('Screenshot did not receive complete application frames');};
 await evaluate('window.visualClock+=1');await frame();await evaluate('window.visualClock+=250');await frame();
 const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));
};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/Module.canvas.width,y:c.y+(r.y+r.height/2)*c.height/Module.canvas.height}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
// Fullscreen can letterbox the canvas. Convert model points to its current
// CSS bounds; ceil edge probes so browser pixel quantization stays inside.
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:Math.ceil(c.x+p.x*c.width/Module.canvas.width),y:Math.ceil(c.y+p.y*c.height/Module.canvas.height)}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};
await evaluate('window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;void 0');



const drag=async(rectExpression)=>{
 const before=await evaluate('window.testInputCount || 0');
 const p=await evaluate(`(()=>{const r=${rectExpression},c=Module.canvas.getBoundingClientRect();return {x:c.x+(r.x+20)*c.width/Module.canvas.width,y:c.y+(r.y+14)*c.height/Module.canvas.height,dx:(r.x<=10?24:-24)*c.width/Module.canvas.width,dy:(r.y<=10?20:-20)*c.height/Module.canvas.height}})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+p.dx,y:p.y+p.dy,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+p.dx,y:p.y+p.dy,button:'left',clickCount:1});await waitForInput(before,2);
};




const mode=process.argv[5] || 'after';
const wait=async(expression,label)=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await delay(100);}await check(expression,label);};
let readyHost=false;for(let i=0;i<120;i++){if(fs.existsSync(infoFile)){readyHost=true;break;}if(native.exitCode!==null)throw Error('Native fixture exited '+native.exitCode);await delay(250);}if(!readyHost)throw Error('Native host did not start');
const {url,gameId}=JSON.parse(fs.readFileSync(infoFile,'utf8'));
// Bootstrap a real authenticated client; admission UI has separate coverage.
await evaluate(`(async()=>{window.nc=chatAudit.makeClient(${JSON.stringify(url)});const model=await nc.connect({name:'Chat ${lang}',password:'test-password',mode:'join',gameId:${JSON.stringify(gameId)}});chatAudit.installNetworkGame(model,nc);window.cues=[];const play=visual.getSound().play.bind(visual.getSound());visual.getSound().play=function(id){cues.push(id);return play(id)};return null;})()`);
const chatLayout='chatAudit.chat.layout('+viewWidth+','+viewHeight+')';
await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');
await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="openChat").rect');
await wait('chatAudit.chat.active && !chatAudit.chat.message','Chat did not open/refresh');await capture('chat-original');
await key('Tab');await check('chatAudit.chat.stage==="recipients"','Tab did not open recipients');await capture('recipients-original');
await point('(()=>{const r='+chatLayout+'.choices[0].rect;return {x:r.x+5,y:r.y+1}})()');
await check(mode==='before' && viewHeight<370?'chatAudit.chat.stage==="recipients" && !foregroundAudit.placement.drag':'chatAudit.chat.stage==="chat" && chatAudit.chat.state().to===0','Recipient top-edge selection failed');
await capture('recipient-edge');
// Recover the baseline with a center click, so subsequent history is comparable.
if(mode==='before' && viewHeight<370){await click(chatLayout+'.choices[0].rect');}
await key('Tab');await drag('foregroundAudit.window().rect');
await check('(()=>{const r=foregroundAudit.window().rect,p=chatAudit.preferences.readWindowPosition("networkChat");return p && r.x===p.x && r.y===p.y && r.x>=10 && r.y>=10 && r.x+r.width<='+ (viewWidth-10)+' && r.y+r.height<='+ (viewHeight-10)+'})()','Chat drag/persist/bounds failed');
await evaluate('window.oldTurn=visual.getGame().turn;window.beforeCues=cues.length;void 0');await point('({x:1,y:1})');
await check('chatAudit.chat.active && chatAudit.chat.stage==="recipients" && visual.getGame().turn===oldTurn && cues.length===beforeCues+1 && cues[cues.length-1]===1012','Outside click leaked');await capture('recipients-dragged');
await click(chatLayout+'.choices.find(r=>r.value===0).rect');
await check('chatAudit.chat.stage==="chat"','Recipient selection failed');
for(const c of 'Chat '+lang)await key(c);
await capture('chat-draft');await key('Enter');
await wait('!chatAudit.chat.busy && chatAudit.chat.editor.text===""','Chat send did not finish');
await check('nc.chat.messages.some(r=>r.text==="Chat '+lang+'" && r.from===2 && r.to===0) && visual.getGame().turn===oldTurn','Real host did not accept chat');await capture('chat-sent');
await key('Escape');await check('!chatAudit.chat.active && !foregroundAudit.placement.drag','Escape did not close chat');await capture('chat-closed');
await evaluate('(async()=>{await nc.disconnect();return null;})()');
console.log('PASS actual HTTP chat selection/drag/persistence/modality/send/close '+lang+' '+mode+' '+viewWidth+'x'+viewHeight);
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();native.kill('SIGTERM');server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
