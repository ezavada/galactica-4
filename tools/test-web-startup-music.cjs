// Actual-input startup/About music and fade regression. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-startup-music.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-startup-music.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('globalThis.pdg = pdg;',"globalThis.pdg = pdg;\nwindow.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;\nwindow.musicCalls=[];const musicLoad=pdg.res.getSound;\npdg.res.getSound=function(file){const sound=musicLoad.call(this,file);\n if(sound && file==='sounds/startup.wav'){\n  musicCalls.push(['load']);window.musicBackend=[...Module.pdgAudioObjects.values()].slice(-1)[0].audio;\n  for(const name of ['start','stop','setVolume','setLooping']){const original=sound[name];sound[name]=function(...args){musicCalls.push([name,...args]);return original.apply(this,args);};}\n }return sound;};\n").replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={suspendDraw:()=>pdg.evt.removeHandler(drawHandler,pdg.eventType_PortDraw),resumeDraw:()=>pdg.evt.addHandler(drawHandler,pdg.eventType_PortDraw),getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","true");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async name=>{currentScene=name;if(!await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=1');await delay(65);if(!await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=250');await delay(150);const r=await call('Page.captureScreenshot',{format:'png',...(name.startsWith('compact')?{clip:{x:0,y:0,width:320,height:340,scale:1}}:{})});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,''],ArrowRight:[39,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};

const before=process.argv[5]==='before';
const model='visual.getSettings().model';
const musicReady=async()=>{if(before)return;for(let i=0;i<100;i++){if(await evaluate('window.musicBackend && musicBackend.readyState>0 && !musicBackend.paused'))return;await delay(50);}throw Error('Music did not decode/play');};
const action=async type=>{for(let i=0;i<5;i++){
 const exists=await evaluate(`${model}.display.getSettingsActionRegions().some(r=>r.action.type===${JSON.stringify(type)})`);
 if(exists){await click(`${model}.display.getSettingsActionRegions().find(r=>r.action.type===${JSON.stringify(type)}).rect`);return;}
 await click(`${model}.display.getSettingsActionRegions().find(r=>r.action.type==='settingsPage' && r.action.delta===1).rect`);
}throw Error('Missing Settings action '+type);};
await check(`${model}.presentation.kind==='startup'`,'Startup introduction missing');await musicReady();
if(!before){
 await check('musicBackend.loop && Math.abs(musicBackend.duration-4263515/44100)<.001 && musicCalls.filter(c=>c[0]==="start").length===1','Startup music loop/duration wrong');
 // Exercise a real end-to-start loop without waiting the whole 96-second track.
 await evaluate('musicBackend.currentTime=musicBackend.duration-.1');await delay(450);
 await check('musicBackend.currentTime<2 && !musicBackend.paused','Actual audio did not loop');
}
await capture('startup-introduction');await key('ArrowRight');await capture('startup-paged');
await click(`${model}.display.getPresentationActions().find(r=>r.action.type==='closePresentation').rect`);
await evaluate('window.dismissedAt=visualClock');await advanceClock(2500);
if(!before)await check('!musicBackend.paused && Math.abs(musicBackend.volume-.5)<.0001','Music did not reach fade midpoint');
await capture('startup-dismissed');
// Reopen the real Credits/About window during the opening-screen fade.
await click('visual.getStartupSettingsButton()');await action('openAbout');await musicReady();
if(!before)await check('musicCalls.filter(c=>c[0]==="start").length===1 && musicCalls.filter(c=>c[0]==="stop").length===0 && musicBackend.volume===1','Credits restarted still-playing opening music');
await capture('about-during-fade');await advanceClock(6000);
if(!before)await check('!musicBackend.paused && musicBackend.volume===1 && musicCalls.filter(c=>c[0]==="start").length===1','Old dismissal fade stopped reopened Credits music');
await key('Escape');await key('Escape');await evaluate('window.dismissedAt=visualClock');
await evaluate('visualClock=dismissedAt+5000');await delay(100);
if(!before)for(let i=0;i<100 && !await evaluate('musicBackend.paused');i++)await delay(25);
if(!before)await check('musicBackend.paused && musicBackend.volume===0','Music did not stop after five seconds');
await click('visual.getStartupSettingsButton()');await action('openAbout');await musicReady();
await capture('about');
if(!before)await check('musicCalls.filter(c=>c[0]==="load").length===1 && musicCalls.filter(c=>c[0]==="start").length===2 && musicBackend.loop && musicBackend.volume===1','About did not reuse/reset music');
await key('Escape');await action('toggleSound');
if(!before)await check('musicBackend.paused && !visual.getSound().isEnabled()','Sound off did not stop owned music');
await action('openAbout');await capture('about-muted');
if(!before)await check('musicBackend.paused && musicCalls.filter(c=>c[0]==="start").length===2','Muted About started music');
await key('Escape');await action('toggleSound');
if(!before)await check('musicBackend.paused','Enabling Sound restarted dismissed music');
await action('openAbout');await musicReady();await capture('about-reenabled');await key('Escape');
await advanceClock(5000);
if(!before)for(let i=0;i<100 && !await evaluate('musicBackend.paused');i++)await delay(25);
if(!before)await check('musicBackend.paused && musicCalls.filter(c=>c[0]==="start").length===3','Reenabled About music did not finish fading '+JSON.stringify(await evaluate('({paused:musicBackend.paused,volume:musicBackend.volume,calls:musicCalls,window:visual.getSettings().model.uiWindow,kind:visual.getSettings().model.presentation.kind})')));
if(!before && lang==='en'){
 await action('openAbout');await musicReady();await key('Escape');
 await evaluate('visual.suspendDraw();window.noDrawCount=window.testDrawCount;visualClock+=2500;void 0');await delay(150);
 await check('window.testDrawCount===noDrawCount && !musicBackend.paused && Math.abs(musicBackend.volume-.5)<.0001','Fade did not advance without drawing');
 await advanceClock(2500);await check('musicBackend.paused && musicBackend.volume===0','Timer did not finish fade without drawing');
 await evaluate('visual.resumeDraw();void 0');
}
await delay(200);await evaluate('true');
console.log('PASS startup/About actual loop, cached playback, five-second fade and Settings mute '+lang+' '+(before?'before':'after'));
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
