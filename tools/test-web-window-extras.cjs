// Actual Production/picker dragging, inline rename and turn confirmation checks.
// Usage: node tools/test-web-window-extras.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-context-panels.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;if(event.eventType===pdg.eventType_MouseDown)window.lastMouseDown={button:event.buttonNumber,ctrl:event.ctrl,alt:event.alt,shift:event.shift,x:event.mousePos.x,y:event.mousePos.y};').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,formatCount:n=>require("./src/js/i18n.js").formatPluralString(746,"",n),getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
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
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};
// Let source-paced no-dialog notices complete before manual review.
const finishAutomaticNotices=async()=>{for(let i=0;i<100;i++){if(!await evaluate('g.overlay && g.overlay.animationOnly'))return;await advanceClock(8500);}throw Error('Automatic notice queue did not finish');};
await evaluate('window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;void 0');



const fileMenu=async()=>{await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="fileMenu").rect');};
const decision=async(action)=>click('visual.getDocuments().layout(800,600).buttons.find(b=>b.action==="'+action+'").rect');
await click('visual.getStart()');await click('visual.getSubmit()');
await evaluate(`window.g=visual.getGame();window.home=g.stars.find(s=>s.owner===1);g.clearEventPresentations();g.attention.queue=[];g.eventLog=[];g.turnAttentionPending=false;home.techLevel=15;window.unit=g.factory.createShip(home.x,home.y,'scout',home,true);home.shipArrived(unit);window.fleet=g.factory.createFleet(home.x,home.y,1,'Guard 星');window.member=g.factory.createShip(home.x,home.y,'colony',home,true);fleet.addShip(member);window.meeting=g.createRendezvousAt(home.x+10000,home.y+10000,1,'Meeting 星');g.setSelectedObject(home);g.display.centerOn(home.x,home.y);window.cues=[];const play=g.sound.play.bind(g.sound);g.sound.play=function(id){cues.push(id);return play(id)};void 0`);
const menu=async()=>click('g.display.getMapButtonRegions().find(r=>r.action.window==="menu").rect');
const command=async predicate=>{await menu();await click('g.display.getCommandActionRegions().find(r=>'+predicate+').rect');};
const context=async type=>click('g.display.getContextButtonRegions(g.selectedObject).find(r=>r.action.type==="'+type+'").rect');
const settingsAction=async type=>{
 await command('r.action.window==="settings"');
 for(let i=0;i<10;i++){
  if(await evaluate('g.display.getSettingsActionRegions().some(r=>r.action.type==="'+type+'")')){await click('g.display.getSettingsActionRegions().find(r=>r.action.type==="'+type+'").rect');return;}
  await click('g.display.getSettingsActionRegions().find(r=>r.action.type==="settingsPage" && r.action.delta===1).rect');
 }throw Error('Missing Settings action '+type);
};
const drag=async(rectExpression)=>{
 const before=await evaluate('window.testInputCount || 0');
 const p=await evaluate(`(()=>{const r=${rectExpression},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+20,y:c.y+r.y+14}})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+24,y:p.y+20,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+24,y:p.y+20,button:'left',clickCount:1});await waitForInput(before,2);
};
const inspect=async(name,modal,returns=null)=>{
 await check('g.uiWindow==="'+name+'"','Wrong window '+name);
 await evaluate('window.oldRect=g.display.getActiveWindowRect();void 0');
 await capture(name+'-original');await drag('g.display.getActiveWindowRect()');
 await check('(()=>{const r=g.display.getActiveWindowRect();return r.x!==oldRect.x || r.y!==oldRect.y})()','Title did not drag '+name);
 await check('(()=>{const r=g.display.getActiveWindowRect();return r.x>=10 && r.y>=10 && r.x+r.width<=790 && r.y+r.height<=590})()','Dragged outside port '+name);
 if(modal){
  await evaluate('window.priorSelection=g.selectedObject;window.priorTurn=g.turn;window.cueCount=cues.length;void 0');
  await point('({x:1,y:1})');
  await check('g.uiWindow==="'+name+'" && g.selectedObject===priorSelection && g.turn===priorTurn && cues.length===cueCount+1 && cues[cues.length-1]===1012','Outside modal click leaked '+name);
 }
 await capture(name+'-dragged');
 const close=await evaluate('g.display.getWindowCloseActions('+JSON.stringify(name)+',g.display.getActiveWindowRect())[0]');
 if(['production','endTurnConfirm'].includes(name) && await evaluate('g.display.getUIActionAt('+ (close.rect.x+close.rect.width/2)+','+(close.rect.y+close.rect.height/2)+').type==="closeWindow"'))await point(JSON.stringify({x:close.rect.x+close.rect.width/2,y:close.rect.y+close.rect.height/2}));
 else await key('Escape');
 await check('g.uiWindow==='+JSON.stringify(returns),'Escape did not close '+name);
 if(returns){await key('Escape');await check('g.uiWindow===null','Return window did not close');}
};
await key('p');await inspect('production',false);
// Control-click exposes the same nearby-object picker used for crowded map hits.
const pickerPoint=await evaluate('g.display.getObjectScreenPosition(home)');
const inputBefore=await evaluate('window.testInputCount || 0');
const canvas=await evaluate('({x:Module.canvas.getBoundingClientRect().x,y:Module.canvas.getBoundingClientRect().y})');
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17,modifiers:2});
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:canvas.x+pickerPoint.x,y:canvas.y+pickerPoint.y,button:'left',clickCount:1,modifiers:2});
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:canvas.x+pickerPoint.x,y:canvas.y+pickerPoint.y,button:'left',clickCount:1,modifiers:2});
await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Control',code:'ControlLeft',windowsVirtualKeyCode:17});await waitForInput(inputBefore,2);
if(!await evaluate('g.uiWindow==="mapPick"'))console.error('Picker diagnostics '+JSON.stringify(await evaluate('(()=>{const p=g.display.getObjectScreenPosition(home),a=g.display.getUIActionAt(p.x,p.y);return {point:{x:p.x,y:p.y},mouse:window.lastMouseDown,window:g.uiWindow,drag:!!g.uiWindowDrag,action:a && a.type,candidates:g.findObjectsAtPosition(p.x,p.y,true).map(o=>({id:o.id,type:o.type}))}})()')));
await inspect('mapPick',false);
await evaluate('g.setSelectedObject(home);window.originalName=home.name;void 0');
await context('beginRename');await check('g.uiWindow==="rename"','Inline rename did not open');await capture('inline-rename');
await key('X');await key('Escape');await check('home.name===originalName && g.uiWindow===null','Escape changed the original name');
await evaluate('if(!g.attention.request(unit))throw new Error("Owned ship was not eligible for attention");void 0');await key('Enter');await inspect('endTurnConfirm',true);
await check('g.turn===1','Cancel confirmation advanced the turn');
console.log('PASS Production/picker title dragging, inline rename cancellation and modal turn confirmation '+lang);
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
