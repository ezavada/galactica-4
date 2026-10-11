// Actual-input friendly interception course inheritance regression. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-arrival-course.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const viewWidth=Number(process.env.GALACTICA_COURSE_WIDTH || 800),viewHeight=Number(process.env.GALACTICA_COURSE_HEIGHT || 600);
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-arrival-course.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('new pdg.Rect(0, 0, 800, 600)','new pdg.Rect(0, 0, '+viewWidth+', '+viewHeight+')').replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testLastMouseX=event.mousePos.x; window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,getDestructionTiming:()=>require("./src/js/destruction-effect.js"),beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Emulation.setDeviceMetricsOverride',{width:viewWidth,height:viewHeight,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");localStorage.setItem("galactica.fullscreen","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async (name,{freezeClock=false}={})=>{currentScene=name;if(!freezeClock && !await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=1');await delay(65);if(!freezeClock && !await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=250');await delay(150);const r=await call('Page.captureScreenshot',{format:'png',...(name.startsWith('compact')?{clip:{x:0,y:0,width:320,height:340,scale:1}}:{})});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,''],PageDown:[34,''],PageUp:[33,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};






await evaluate(`window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;window.cueEvents=[];const load=pdg.res.getSound;pdg.res.getSound=function(file){const sound=load.call(this,file);if(sound){const start=sound.start;sound.start=function(){cueEvents.push({file,eventId:window.g && g.overlay && g.overlay.eventId});return start.apply(this,arguments);};}return sound;};void 0`);
await click('visual.getStart()');await click('visual.getSubmit()');
await evaluate('window.g=visual.getGame();window.d=visual.getDisplay();void 0');
const renderClock=async expression=>{const value=await evaluate('visualClock='+expression);for(let i=0;i<120;i++){if(await evaluate('Math.abs(d.getVisualTime()-'+value+')<.001'))return;await delay(25);}throw Error('Renderer did not reach clock '+value);};

await evaluate(`g.clearEventPresentations();g.uiWindow=null;g.eventLog=[];g.attention.queue=[];g.turn=2;
 window.home=g.stars.find(s=>s.owner===1);window.waiting=g.factory.createShip(home.x+1000,home.y,'scout',home,true);waiting.star=null;waiting.name='Leader 星 $&';
 window.incoming=g.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(incoming);incoming.name='Joiner';
 g.issuePlayerWaypoint(waiting,{x:waiting.x+65536,y:waiting.y+10000});waiting.course.swapMemory();g.issuePlayerWaypoint(waiting,{x:waiting.x+131072,y:waiting.y+20000});waiting.course.hunt=true;
 incoming.setDestination(waiting);incoming.move();window.fleet=waiting.fleet;g.setSelectedObject(fleet);d.centerOn(fleet.x,fleet.y);void 0`);
await check('fleet && incoming.fleet===fleet && fleet.ships.length===2 && !g.overlay','Actual interception did not form a surviving non-modal friendly fleet');
await capture('formed-fleet');await key('g');
await check('g.uiWindow==="course" && g.courseWindowObject===fleet','Real Course shortcut did not open the formed fleet course');
await capture('inherited-course');
if(process.env.GALACTICA_EXPECT_LOST_COURSE==='1'){
 await check('fleet.course.waypoints.length===0 && !fleet.course.hasMemory','Baseline no longer reproduces lost course');
}else{
 await check('fleet.course.waypoints.length===3 && fleet.course.current===1 && fleet.course.previous===0 && fleet.course.loop && fleet.course.hunt && fleet.course.hasMemory && d.getCourseWindowLayout().rows.length===3','Source active course/progress/flags/memory not inherited or shown');
 await key('m');await check('fleet.course.waypoints.length===2 && !fleet.course.loop && !fleet.course.hunt && fleet.course.hasMemory','Real Memory shortcut did not swap inherited saved course');await capture('inherited-memory');
 await key('m');await check('fleet.course.waypoints.length===3 && fleet.course.loop && fleet.course.hunt','Second Memory shortcut did not restore full original course');
 await evaluate('window.saved=visual.restore(visual.serialize(g));window.restored=saved.allFleets.find(f=>f.id===fleet.id);void 0');
 await check('restored && restored.course.waypoints.length===3 && restored.course.loop && restored.course.hunt && restored.course.hasMemory && restored.ships.length===2','Fleet course/memory/membership did not survive save/restore');
}
await key('Escape');await check('g.turn===2 && g.uiWindow!=="course"','Course inspection advanced turn or failed to dismiss');
await key('g');await evaluate('g.courseSelection=fleet.course.current;void 0');await capture('course-controls');
const layout=await evaluate('(()=>{const l=d.getCourseWindowLayout();return {rect:l.rect,compact:l.compact,scrollLimit:l.scrollLimit,regions:d.getCourseActionRegions().map(r=>({rect:r.rect,type:r.action.type}))}})()');
fs.writeFileSync(path.join(out,'course-layout.json'),JSON.stringify(layout,null,2));
if(process.env.GALACTICA_COURSE_BASELINE!=='1' && viewWidth<400){
 await check('d.getCourseWindowLayout().compact && d.getCourseWindowLayout().rect.height<= '+(viewHeight-20),'Compact course not bounded');
 await check('d.getCourseActionRegions().every(r=>r.rect.x>=10 && r.rect.x+r.rect.width<='+ (viewWidth-10)+' && r.rect.y>=10 && r.rect.y+r.rect.height<='+ (viewHeight-10)+')','Course hit targets out of viewport');
 const before=await evaluate('window.testDrawCount || 0');await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:120,y:140,deltaX:0,deltaY:20000});
 for(let i=0;i<100;i++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>'+before+'+2'))break;}
 await capture('course-scrolled');await check('d.getCourseWindowLayout().bodyScroll===d.getCourseWindowLayout().scrollLimit','Course wheel did not expose last controls');
 const callIn=await evaluate('fleet.userCallIn');await click('d.getCourseActionRegions().find(r=>r.action.type==="toggleCallIn").rect');await check('fleet.userCallIn!=='+JSON.stringify(callIn),'Compact Call in click failed');await click('d.getCourseActionRegions().find(r=>r.action.type==="toggleCallIn").rect');
 await click('d.getCourseActionRegions().find(r=>r.action.type==="coursePage" && r.action.page===1).rect');await check('g.coursePage===1 && d.getCourseWindowLayout().bodyScroll===0','Compact next page failed or did not reset scroll');await capture('course-next');
 await click('d.getCourseActionRegions().find(r=>r.action.type==="coursePage" && r.action.page===0).rect');await check('g.coursePage===0','Compact previous page failed');
 await click('d.getCourseActionRegions().find(r=>r.action.type==="addWaypoint").rect');await check('g.isAwaitingMapTarget() && d.getContextButtonArc(fleet,null).length===0 && d.getSelectedObjectPanelRect(fleet)===null','Compact Add did not expose the map');await capture('course-add');
 await key('Escape');await check('g.uiWindow==="course" && g.courseWindowObject===fleet','Cancel Add failed to restore course');
 await click('d.getCourseActionRegions().find(r=>r.action.type==="closeCourse").rect');await check('g.uiWindow===null && g.turn===2','Compact Close failed');
}
if(process.env.GALACTICA_TARGET_PROMPTS==='1'){
 const baseline=process.env.GALACTICA_TARGET_PROMPTS_BASELINE==='1';
 await key('g');await key('a');await capture('target-course');
 if(!baseline){await check('d.getCourseTargetPromptLayout().lines.join("")===pdg.res.getString(734)','Course prompt lost translated text');
  await click('(()=>{const r=d.getCourseTargetPromptLayout().rect;return {x:r.x+20,y:r.y+r.height-5,width:1,height:1}})()');await check('g.isAwaitingMapTarget()','Prompt click placed a course behind the hint');}
 await key('Escape');await key('Escape');
 await evaluate('window.promptMarker=g.createRendezvousAt(home.x,home.y,1);void 0');
 for(const move of [false,true]){
  await evaluate('g.beginRendezvousPlacement('+ (move?'promptMarker':'null') +');void 0');await capture(move?'target-rendezvous-move':'target-rendezvous-place');
  if(!baseline){await check('(()=>{const l=d.getRendezvousPlacementPromptLayout();return l.rect.x>=10 && l.rect.x+l.rect.width<='+ (viewWidth-10)+' && l.rect.y+l.rect.height<='+ (viewHeight-10)+' && l.helpLines.join("")===(g.pendingRendezvousPlacement.mode==="move"?d.STR.moveRendezvousHelp:d.STR.placeRendezvousHelp)})()','Rendezvous prompt bounds/text failed');
   const count=await evaluate('g.allRendezvous.length');await click('(()=>{const r=d.getRendezvousPlacementPromptRect();return {x:r.x+20,y:r.y+r.height-5,width:1,height:1}})()');await check('!!g.pendingRendezvousPlacement && g.allRendezvous.length==='+count,'Prompt click changed rendezvous');}
  await key('Escape');await check('!g.pendingRendezvousPlacement && promptMarker.x===home.x && promptMarker.y===home.y && g.turn===2','Rendezvous cancel changed position/turn');
 }
}
if(process.env.GALACTICA_MAP_INSTRUCTIONS==='1'){
 const baseline=process.env.GALACTICA_MAP_INSTRUCTIONS_BASELINE==='1';
 await evaluate('g.uiWindow=null;g.clearEventPresentations();g.setSelectedObject(null);void 0');await capture('map-instructions');
 if(!baseline){const l=await evaluate('d.getMapInstructionsLayout()');fs.writeFileSync(path.join(out,'map-instructions.json'),JSON.stringify(l,null,2));
  await check('(()=>{const l=d.getMapInstructionsLayout();return l.mode==="manual"?l.lines.length===0:l.lines.every(line=>d.port.getTextWidth(line.text,line.size)<=l.rect.width) && d.getMapButtonRegions().every(button=>l.rect.x+l.rect.width+10<=button.rect.x)})()','Map instructions overlap controls');}
 const beforeTargets=await send('Target.getTargets');const old=new Set(beforeTargets.targetInfos.map(t=>t.targetId));
 await click('d.getMapButtonRegions().find(r=>r.action.window==="menu").rect');await capture('map-help-menu');
 if(await evaluate('typeof d.getCommandMenuLayout==="function" && d.getCommandMenuLayout().compact')){
  const close=await evaluate('d.getCommandMenuLayout().close.rect.y'),zoom=await evaluate('d.camera.zoom');
  await key('PageDown');await check('d.getCommandMenuLayout().bodyScroll>0','Compact menu PageDown failed');await key('PageUp');await check('d.getCommandMenuLayout().bodyScroll===0','Compact menu PageUp failed');
  for(let wheel=0;wheel<30 && await evaluate('d.getCommandMenuLayout().bodyScroll<d.getCommandMenuLayout().scrollLimit');wheel++){const frame=await evaluate('window.testDrawCount || 0');await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:120,y:140,deltaX:0,deltaY:20000});for(let i=0;i<100;i++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>'+frame+'+2'))break;}}
  await check('d.getCommandMenuLayout().bodyScroll===d.getCommandMenuLayout().scrollLimit && d.getCommandMenuLayout().close.rect.y==='+close+' && d.camera.zoom==='+zoom,'Compact menu wheel/footer/map isolation failed');await capture('map-help-menu-scrolled');
  const held=await evaluate('g.holdGameReports');await click('d.getCommandActionRegions().find(r=>r.action.type==="holdGameReports").rect');await check('g.holdGameReports!=='+JSON.stringify(held),'Compact Hold reports click failed');await click('d.getCommandActionRegions().find(r=>r.action.type==="holdGameReports").rect');
 }

 await click('d.getCommandActionRegions().find(r=>r.action.type==="openManual").rect');
 let manual;for(let i=0;i<100;i++){const result=await send('Target.getTargets');manual=result.targetInfos.find(t=>!old.has(t.targetId) && t.url.includes('/data/manual/'));if(manual)break;await delay(50);}if(!manual)throw Error('Actual Manual click did not open bundled help');
 const attachment=await send('Target.attachToTarget',{targetId:manual.targetId,flatten:true});await send('Emulation.setDeviceMetricsOverride',{width:viewWidth,height:viewHeight,deviceScaleFactor:1,mobile:false},attachment.sessionId);await send('Page.enable',{},attachment.sessionId);
 let ready=false;for(let i=0;i<100;i++){const result=await send('Runtime.evaluate',{expression:'document.readyState==="complete" && !!document.getElementById("map")',returnByValue:true},attachment.sessionId);if(result.result.value){ready=true;break;}await delay(50);}if(!ready)throw Error('Manual did not load map instructions');
 const language=await send('Runtime.evaluate',{expression:'({language:document.documentElement.lang,map:document.getElementById("map").textContent,opener:window.opener===null})',returnByValue:true},attachment.sessionId);
 if(language.result.value.language!==lang || !language.result.value.map || !language.result.value.opener)throw Error('Manual language/content/opener incorrect');
 const styled=await send('Runtime.evaluate',{expression:'getComputedStyle(document.body).fontFamily.includes("system-ui") && document.documentElement.scrollWidth<=document.documentElement.clientWidth',returnByValue:true},attachment.sessionId);if(!styled.result.value)throw Error('Manual CSS did not load or page overflows horizontally');
 await send('Runtime.evaluate',{expression:'document.getElementById("map").scrollIntoView()',returnByValue:true},attachment.sessionId);await delay(100);
 const picture=await send('Page.captureScreenshot',{format:'png'},attachment.sessionId);fs.writeFileSync(path.join(out,'map-help-manual.png'),Buffer.from(picture.data,'base64'));
 await send('Target.closeTarget',{targetId:manual.targetId});await send('Target.activateTarget',{targetId});await click('d.getCommandActionRegions().find(r=>r.action.type==="closeWindow" && r.action.window==="menu").rect');await check('g.uiWindow===null && g.turn===2 && g.selectedObject===null','Menu Close failed or Help changed game turn/selection');
}
console.log('PASS actual friendly interception, inherited course editor, memory controls and save '+lang);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
