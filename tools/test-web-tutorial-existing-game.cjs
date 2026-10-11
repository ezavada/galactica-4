// Actual-input tutorial recovery regression. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-tutorial-existing-game.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. File-picker fixtures retain
// bytes in memory; this test does not automate the operating system's save dialog.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-tutorial-existing-game.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1; window.testLastKey=event.unicode;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let debugSession,currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});debugSession=sessionId;await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");window.savedText=null;window.testFile={name:"Original.gad4.json",createWritable:async()=>({write:async text=>{window.savedText=text},close:async()=>{}})};window.showSaveFilePicker=async()=>testFile;}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async name=>{currentScene=name;await evaluate('window.visualClock+=1');await delay(65);await evaluate('window.visualClock+=250');await delay(150);const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr))throw Error(label);};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

// Model the physical Shift+= shortcut so PDG receives +, not the Equalize key.
const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');
 if(text==='+'){
  await call('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Shift',code:'ShiftLeft',windowsVirtualKeyCode:16,modifiers:8});
  await call('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'+',code:'Equal',windowsVirtualKeyCode:187,modifiers:8});
  await call('Input.dispatchKeyEvent',{type:'char',key:'+',text:'+',unmodifiedText:'=',modifiers:8});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'+',code:'Equal',windowsVirtualKeyCode:187,modifiers:8});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Shift',code:'ShiftLeft',windowsVirtualKeyCode:16});
  await waitForInput(before,1);return;
 }
 const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{
 const frame=await evaluate('window.testDrawCount || 0');await evaluate('visualClock+='+ms);
 for(let i=0;i<100;i++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}
 throw Error('PDG did not draw after advancing the tutorial clock');
};
const drain=async()=>{const page=await evaluate('owner.controller.pageId');for(let i=0;i<50;i++){if(await evaluate('owner.controller.pageId')!==page || !await evaluate('!!visual.getGame().overlay'))return;if(await evaluate('visual.getGame().overlay.animationOnly && !visual.getGame().overlay.manual'))await advanceClock(8500);else {await key('Escape');await advanceClock(400);}}throw Error('Reports did not drain');};
const object=async id=>{await advanceClock(400);await point('visual.getDisplay().getMapMarker(visual.getGame().stars.find(s=>s.id==='+id+'))');if(await evaluate('visual.getGame().uiWindow==="mapPick"')){for(let i=0;i<20;i++){if(await evaluate('visual.getDisplay().getMapSelectionActions().some(r=>r.action.object && r.action.object.id==='+id+' && visual.getGame().factory.isStar(r.action.object))')){await click('visual.getDisplay().getMapSelectionActions().find(r=>r.action.object && r.action.object.id==='+id+' && visual.getGame().factory.isStar(r.action.object)).rect');break;}await click('visual.getDisplay().getMapSelectionActions().find(r=>r.action.type==="mapSelectionPage" && r.action.page>visual.getGame().mapSelectionPicker.page).rect');}}};
const order=async id=>{await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="beginOrders").rect');await object(id);};
await evaluate('window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;void 0');
await click('visual.getStart()');await click('visual.getSubmit()');await key('h');await advanceClock(1000);await key('+');await advanceClock(1000);
await evaluate('window.original=visual.getGame();window.originalDisplay=visual.getDisplay();window.originalSession=visual.getSessions().active;void 0');
await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="fileMenu").rect');
await click('visual.getDocuments().layout(800,600).buttons.find(b=>b.action==="save").rect');
await click('visual.getDocuments().layout(800,600).buttons.find(b=>b.action==="submit").rect');await delay(150);
await check('visual.getDocuments().dialog.kind==="status" && originalSession.file.handle===testFile && !!savedText','Original document did not save through actual controls');await key('Escape');await key('Escape');
await capture('original-saved-game');await evaluate('window.saved=visual.serialize(original);window.originalFile=originalSession.file;window.originalDisk=savedText;void 0');
const launch=async()=>{await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="startTutorial").rect');await evaluate('window.owner=visual.getOwner();void 0');};
await launch();await check('owner.controller.pageId===100 && !owner.engaged && visual.getGame()===original && visual.serialize(original)===saved','Existing game changed before Hide acknowledgment');await capture('page-100-before-hide');
await click('visual.getPanelLayout().close');await check('!visual.getOwner() && visual.getGame()===original && originalSession.file===originalFile && visual.serialize(original)===saved','Cancel before Hide changed original');await capture('cancel-before-hide');
await launch();await click('visual.getPanelLayout().button');await check('owner.controller.pageId===1 && owner.engaged && !visual.getGame() && !!visual.getSessions().transient && visual.serialize(original)===saved','Hide acknowledgment did not suspend original');await capture('welcome-after-hide');
await click('visual.getPanelLayout().close');await check('!visual.getOwner() && visual.getGame()===original && visual.getDisplay()===originalDisplay && originalSession.file===originalFile && visual.serialize(original)===saved','Cancel after Hide did not restore original');await capture('cancel-after-hide');
await launch();await click('visual.getPanelLayout().button');

let last=0,repeats=0,completed=false;const visited=[];
for(let iteration=0;iteration<180;iteration++){
 const state=await evaluate('JSON.stringify({page:owner.controller.pageId,active:owner.controller.active,deadline:owner.controller.deadline,clock:visualClock,lastKey:window.testLastKey,zoom:visual.getDisplay() && visual.getDisplay().camera.zoom,turn:visual.getGame() && visual.getGame().turn,selected:visual.getGame() && visual.getGame().selectedObject && {id:visual.getGame().selectedObject.id,name:visual.getGame().selectedObject.name,type:visual.getGame().getObjectType(visual.getGame().selectedObject)},overlay:visual.getGame() && visual.getGame().overlay && visual.getGame().overlay.type,attention:visual.getGame() && visual.getGame().attention.pending().map(e=>({id:e.object && e.object.id,name:e.object && e.object.name,title:e.event && e.event.title}))})');console.log('STATE '+state);const st=JSON.parse(state);if(!st.active){await check('!visual.getOwner() && !visual.getPanel() && !visual.getGame().tutorialRuntime && !visual.getGame().tutorialSimulation && !visual.getSessions().transient && visual.getSessions().active.id>0 && !visual.getSessions().active.file', 'Finish did not retain an ordinary unsaved practice game');await check('visual.getSessions().sessions.includes(originalSession) && originalSession.file===originalFile && visual.serialize(original)===saved && savedText===originalDisk','Finish lost or modified original document/file');await capture('finished-practice');await key('Escape');
await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="showGames").rect');await capture('original-available-in-games');
await click('visual.getDisplay().getGameSessionLayout().buttons.find(b=>b.action.type==="selectGame" && b.action.id===originalSession.id).rect');
await check('visual.getGame()===original && visual.getDisplay()===originalDisplay && originalSession.file===originalFile && visual.serialize(original)===saved && savedText===originalDisk','Games selection failed to recover unchanged original');await capture('restored-original-after-finish');
completed=true;console.log('PASS full existing-game recovery '+lang+' '+visited.join(','));break;}
 if(st.page===last){if(++repeats>5)throw Error('Stuck at page '+st.page);}else{last=st.page;repeats=0;visited.push(st.page);await capture('page-'+String(st.page).padStart(2,'0'));}
 if(st.page===47)await check('visual.getGame().turn===7 && visual.getGame().selectedObject===visual.getGame().stars.find(s=>s.id===7)', 'New colony lesson did not select S-7 on the intended turn');
 if(st.page===48)await check('visual.getGame().turn===7 && visual.getGame().selectedObject && visual.getGame().selectedObject.id===visual.getGame().tutorialRuntime.roleIds.colony && visual.getGame().selectedObject.star && visual.getGame().selectedObject.star.id===7', 'Patrol lesson did not retain the original colony ship at S-7');
 if(st.overlay && await evaluate('visual.getGame().overlay.animationOnly && !visual.getGame().overlay.manual')){await advanceClock(8500);repeats=0;continue;}
 const mapActions=new Set([7,10,16,17,19,20,25,26,28,30,31,34,36,37,38,39,40,41,42,48,50,51,57]);
 if((mapActions.has(st.page) || [14,27,29,35,44,46,47,49,53].includes(st.page)) && st.overlay){await drain();continue;}
 switch(st.page){
  case 1:case 5:case 6:case 8:case 9:case 11:case 15:case 18:case 24:case 56:case 58:case 59:case 60: await click('visual.getPanelLayout().button');break;
  case 3:await click('visual.getStart()');break;
  case 4:await click('visual.getSubmit()');break;
  case 7:await key('+');await advanceClock(3101);break;
  case 10:await point('(()=>{const r=visual.getDisplay().getStarAllocationSliderRegions(visual.getGame().selectedObject).find(r=>r.key==="shipBuilding" || r.allocationKey==="shipBuilding").trackRect;return {x:r.x+r.width*.2,y:r.y+r.height/2}})()');await advanceClock(2101);break;
  case 12:case 21:case 22:case 32:case 43:case 45:case 52:case 54:await key('Enter');break;
  case 13:case 23:case 33:case 55:await key('Enter');break;
  case 14:case 27:case 29:case 35:case 44:case 46:case 47:case 49:case 53:await key('Tab');break;
  case 16:await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="beginOrders").rect');break;
  case 17:await object(9);break;
  case 19:await object(2);await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="buildShip" && r.action.shipType==="defense").rect');break;
  case 20:await click('visual.getDisplay().getAllocationEqualizeRegions().find(r=>!r.inWindow).rect');break;
  case 25:await object(9);await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="beginRename").rect');await key('Enter');break;
  case 26:await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="buildShip" && r.action.shipType==="battleship").rect');break;
  case 28:await order(7);break;
  case 30:case 36:await object(2);break;
  case 31:case 37:await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="buildShip" && r.action.shipType==="'+(st.page===31?'scout':'battleship')+'").rect');break;
  case 34:await order(9);break;
  case 38:await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.type==="beginRendezvousPlacement").rect');break;
  case 39:await point('(()=>{const g=visual.getGame(),h=g.stars.find(s=>s.id===2),t=g.stars.find(s=>s.id===9),d=visual.getDisplay();return {x:d.toScreenX((h.x+t.x)/2),y:d.toScreenY((h.y+t.y)/2)}})()');break;
  case 40:await key('Enter');break;
  case 41:case 42:await object(st.page===41?2:9);await click('visual.getDisplay().getDefaultDestinationLayout(visual.getGame().selectedObject).regions.find(r=>r.action.type==="beginOrders").rect');await point('visual.getDisplay().getMapMarker(visual.getGame().allRendezvous.find(r=>r.id===owner.controller.alphaId))');if(await evaluate('visual.getGame().uiWindow==="mapPick"'))await click('visual.getDisplay().getMapSelectionActions().find(r=>r.action.object && visual.getGame().factory.isRendezvous(r.action.object) && r.action.object.id===owner.controller.alphaId).rect');break;
  case 48:await key('p');break;
  case 50:await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.window==="comparison").rect');break;
  case 51:await key('Escape');break;
  case 57:await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="showFleetExchange").rect');break;
  default:throw Error('Unhandled page '+st.page);
 }
}
if(!completed)throw Error('Existing-game recovery did not finish within 180 input iterations');
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
