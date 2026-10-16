// Actual shared text-entry hints, title dragging and keyboard behavior.
// Usage: node tools/test-web-startup-hints.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before|after] [WIDTH HEIGHT]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides Chrome. Uses the application Save As editor,
// without opening an operating-system file picker.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const viewWidth=Number(process.argv[6] || 640),viewHeight=Number(process.argv[7] || 480);
if(!Number.isInteger(viewWidth) || !Number.isInteger(viewHeight) || viewWidth<320 || viewHeight<340)throw Error('Invalid viewport');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-startup-hints.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('new pdg.Rect(0, 0, 800, 600)', 'new pdg.Rect(0, 0, '+viewWidth+', '+viewHeight+')').replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.lastMouse={type:event.eventType,button:event.buttonNumber,x:event.mousePos.x,y:event.mousePos.y};window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.foregroundAudit={window:foregroundApplicationWindow,placement:windowPlacement,setup:StartupSetup,config:()=>pendingConfig,buttons:()=>PlayerName.layout(640,480).buttons,editor:()=>startupComputerCount || startupGameTitle || startupPlayerName,skill:()=>startupAISkill};window.visual={getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,formatCount:n=>require("./src/js/i18n.js").formatPluralString(746,"",n),getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:viewWidth,height:viewHeight,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
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
// Let source-paced no-dialog notices complete before manual review.
const finishAutomaticNotices=async()=>{for(let i=0;i<100;i++){if(!await evaluate('g.overlay && g.overlay.animationOnly'))return;await advanceClock(8500);}throw Error('Automatic notice queue did not finish');};
await evaluate('window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;void 0');



const drag=async(rectExpression)=>{
 const before=await evaluate('window.testInputCount || 0');
 const p=await evaluate(`(()=>{const r=${rectExpression},c=Module.canvas.getBoundingClientRect();return {x:c.x+(r.x+20)*c.width/Module.canvas.width,y:c.y+(r.y+14)*c.height/Module.canvas.height,dx:(r.x<=10?24:-24)*c.width/Module.canvas.width,dy:(r.y<=10?20:-20)*c.height/Module.canvas.height}})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+p.dx,y:p.y+p.dy,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+p.dx,y:p.y+p.dy,button:'left',clickCount:1});await waitForInput(before,2);
};



const mode=process.argv[5] || 'after';
const expectHints=mode!=='before';
await evaluate('window.cues=[];window.originalPlay=visual.getSound().play.bind(visual.getSound());visual.getSound().play=function(id){cues.push(id);return originalPlay(id)};void 0');
const rect='foregroundAudit.window().rect';
const inspect=async(name)=>{
 await evaluate('window.oldRect=foregroundAudit.window().rect;void 0');await capture(name+'-original');await drag(rect);
 await check('(()=>{const r=foregroundAudit.window().rect;return (r.x!==oldRect.x || r.y!==oldRect.y) && r.x>=10 && r.y>=10 && r.x+r.width<='+ (viewWidth-10)+' && r.y+r.height<='+ (viewHeight-10)+'})()','Title drag/bounds failed '+name);
 await evaluate('window.beforeCues=cues.length;window.oldForeground=foregroundAudit.window().name;window.oldConfig=JSON.stringify(foregroundAudit.config());void 0');
 await point('({x:1,y:1})');
 await check('foregroundAudit.window().name===oldForeground && JSON.stringify(foregroundAudit.config())===oldConfig && cues.length===beforeCues+1 && cues[cues.length-1]===1012','Outside click leaked '+name);
 await capture(name+'-dragged');
};
await inspect('startup');
await check('JSON.parse(localStorage.getItem("galactica.windowPosition.startup")).x===foregroundAudit.window().rect.x','Startup position was not persisted');
await point('(()=>{const r=foregroundAudit.setup.titleRegion(foregroundAudit.window().rect);return {x:r.x+5,y:r.y+1}})()');
await capture('title-edge');
await check('!!foregroundAudit.editor()','Compact title control was intercepted by drag capture '+JSON.stringify(await evaluate('({mouse:window.lastMouse,rect:foregroundAudit.window().rect,canvas:Module.canvas.getBoundingClientRect().toJSON()})')));
await inspect('game-title');await key('Enter');await check('!foregroundAudit.editor()','Enter did not accept game title');await click('foregroundAudit.setup.titleRegion(foregroundAudit.window().rect)');await key('Escape');
await click('foregroundAudit.setup.computerCountRegion(foregroundAudit.window().rect)');await inspect('computer-count');await key('Escape');
await click('foregroundAudit.setup.skillRegion(foregroundAudit.window().rect)');await inspect('ai-skill');await key('Escape');
await click('foregroundAudit.setup.startRegion(foregroundAudit.window().rect)');await inspect('player-name');await key('Escape');
await check('!foregroundAudit.editor() && !foregroundAudit.skill()','Canceled startup editor remained open');

await check('(()=>{const buttons=foregroundAudit.buttons();return buttons[0].key==='+(expectHints?'"Esc"':'undefined')+' && buttons[1].key==='+(expectHints?'"Enter"':'undefined')+'})()','Shared text entry hints do not match expected version');
await click('visual.getStart()');await click('visual.getSubmit()');
const fileMenu=async()=>{await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="fileMenu").rect');};
await fileMenu();await click('visual.getDocuments().layout('+viewWidth+','+viewHeight+').buttons.find(b=>b.action==="saveAs").rect');
await check('visual.getDocuments().dialog.kind==="editor" && visual.getDocuments().dialog.operation==="save"','Save As did not open the shared text editor');
await inspect('save-name');await key('Escape');await check('visual.getDocuments().dialog===null','Escape did not cancel Save As');
console.log('PASS shared text-entry hints and title/count/player/save keyboard behavior '+lang+' '+mode);
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
