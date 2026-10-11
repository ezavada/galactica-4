// Actual-input client view regression. Compares host view with reconstructed client. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-client-state.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before|fleet-owner|before-fleet-owner|fleet-health|before-fleet-health|fleet-member-stats|before-fleet-member-stats|nested-table|before-nested-table|fleet-label|before-fleet-label|system-contents|before-system-contents|allocation-label|before-allocation-label|system-membership|before-system-membership|table-patrol|before-table-patrol]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-client-state.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before|fleet-owner|before-fleet-owner|fleet-health|before-fleet-health|fleet-member-stats|before-fleet-member-stats|nested-table|before-nested-table|fleet-label|before-fleet-label|system-contents|before-system-contents|allocation-label|before-allocation-label|system-membership|before-system-membership|table-patrol|before-table-patrol]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={makeHost:o=>new Game(new Factory(),new Rules(false),new GameConfig(o)),project:g=>require("./src/js/host-view.js").snapshot(g,2),makeClient:s=>require("./src/js/client-state.js").restore(s),installModel:m=>{game=m;game.port=port;display=new Display(game);game.sound=sound;game.showControlHelp=true;},getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async name=>{currentScene=name;if(!await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=1');await delay(65);if(!await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=250');await delay(150);const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);if(p.x<0 || p.x>=800 || p.y<0 || p.y>=600)throw Error('Point outside canvas '+JSON.stringify({point:p,scene:currentScene,camera:await evaluate('({panX:visual.getDisplay().camera.panX,panY:visual.getDisplay().camera.panY,whip:visual.getDisplay().camera.whipPan,time:visualClock,hasDrawn:visual.getDisplay().hasDrawn,frame:visual.getDisplay().visualTime})')}));await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};
await evaluate('window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;void 0');



const fileMenu=async()=>{await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.type==="fileMenu").rect');};
const decision=async(action)=>click('visual.getDocuments().layout(800,600).buttons.find(b=>b.action==="'+action+'").rect');
const before=process.argv[5]==='before';
await click('visual.getStart()');await click('visual.getSubmit()');
await evaluate(`window.hostGame=visual.makeHost({numHumans:2,numComputers:1,sectorSize:1,density:1});
 hostGame.config.networkHost={id:'a'.repeat(64),players:[{name:'First'},{name:'Voyager'}]};hostGame.players[1].name='First';hostGame.players[2].name='Voyager';
 window.own=hostGame.stars.find(s=>s.owner===2);window.enemy=hostGame.stars.find(s=>s.owner===1);enemy.techLevel=8;
 window.courier=hostGame.factory.createShip(own.x,own.y,'scout',own,true);own.ships.push(courier);courier.name='Voyager';
 window.enemyShip=hostGame.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);enemyShip.name='Enemy ship';${['fleet-health','before-fleet-health','fleet-member-stats','before-fleet-member-stats','table-patrol','before-table-patrol','nested-table','before-nested-table','fleet-label','before-fleet-label'].includes(process.argv[5])?"enemyShip.damage=enemyShip.power*25;":''}
 window.enemyFleet=hostGame.factory.createFleet(enemy.x+200000,enemy.y+100000,1,'Enemy fleet');enemyFleet.addShip(enemyShip);enemyFleet.star=null;enemyFleet.x=524288;enemyFleet.y=424288;enemyFleet.syncShipPositions();enemyFleet.updateSpatialLocation();
 ${['nested-table','before-nested-table','fleet-label','before-fleet-label'].includes(process.argv[5])?"window.enemyGroup=hostGame.factory.createFleet(enemyFleet.x,enemyFleet.y,1,'Secret subgroup');enemyGroup.addShip(enemyShip);enemyFleet.addShip(enemyGroup);":''}
 ${['system-contents','before-system-contents','allocation-label','before-allocation-label','system-membership','before-system-membership'].includes(process.argv[5])?"enemy.x=524288;enemy.y=624288;enemy.updateSpatialLocation(hostGame);window.dockedShip=hostGame.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);dockedShip.name='Secret docked ship';dockedShip.damage=dockedShip.power*40;window.dockedFleet=hostGame.factory.createFleet(enemy.x,enemy.y,1,'Secret docked fleet');dockedFleet.addShip(dockedShip);dockedFleet.star=enemy;dockedFleet.syncShipPositions();":''}
 for(const e of [...hostGame.stars,...hostGame.allShips,...hostGame.allFleets])e.setVisibilityTo(2,0);enemyFleet.setVisibilityTo(2,1);
 ${['table-patrol','before-table-patrol'].includes(process.argv[5])?'enemyFleet.setPatrol(true);':''}
 hostGame.eventLog=[];hostGame.overlay=null;hostGame.overlayQueue=[];hostGame.attention.queue=[];
 window.installView=level=>{enemyFleet.setVisibilityTo(2,level);window.state={...visual.project(hostGame),gameId:'a'.repeat(64)};
  window.model=${before ? 'hostGame' : "visual.makeClient(state)"};
  ${before ? "model.getCurrentHumanPlayer=()=>2;model.canHumanControl=e=>!!e && e.owner===2;" : ''}
  visual.installModel(model);visual.getDisplay().camera.zoom=1.2;visual.getDisplay().camera.updateScaleAndOffsets();visual.getDisplay().camera.updatePanLimits();visual.getDisplay().camera.centerOn(own.x,own.y);visual.getDisplay().updateMapRenderingCalculations();};
 installView(1);void 0`);
await point('({x:visual.getDisplay().toScreenX(own.x),y:visual.getDisplay().toScreenY(own.y)})');
await check('model.selectedObject && model.selectedObject.id===own.id && model.canHumanControl(model.selectedObject)','Actual owned-system selection failed');
if(['allocation-label','before-allocation-label'].includes(process.argv[5])){
 await evaluate('window.originalGrowth=model.selectedObject.growth.value;void 0');
 await point('(()=>{const r=visual.getDisplay().getStarAllocationSliderRegions(model.selectedObject)[0].trackRect;return {x:r.x,y:r.y+4}})()');
 await check('model.selectedObject.growth.desired===0 && model.selectedObject.growth.value===originalGrowth','Measured slider input changed actual output or missed zero target');
}
await capture('player-two-system');
await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="buildShip" && r.action.shipType==="colony").rect');
await check('model.stars.find(s=>s.id===own.id).currentShip.type==="colony"','Actual player-two production control failed');
await capture('player-two-production');
await evaluate('visual.getDisplay().centerOn(enemyFleet.x,enemyFleet.y);visual.getDisplay().updateMapRenderingCalculations();void 0');await advanceClock(1000);
await point('({x:visual.getDisplay().toScreenX(enemyFleet.x),y:visual.getDisplay().toScreenY(enemyFleet.y)})');
await check('model.selectedObject && model.factory.isFleet(model.selectedObject)','Actual Speed fleet selection failed');
await check('visual.getDisplay().getFleetDiagnostics(model.selectedObject).count==="?"','Unknown fleet disclosed members');
if(['fleet-owner','before-fleet-owner'].includes(process.argv[5])){
 const expected=process.argv[5]==='fleet-owner'?1:0;
 await check('model.selectedObject.owner==='+expected,'Wrong detected fleet ownership');
 await check('visual.getDisplay().getFleetDiagnostics(model.selectedObject).tech==="?"','Speed fleet disclosed technology');
 await check('!state.entities.find(e=>e.kind==="fleet" && e.id===enemyFleet.id).ships','Speed projection disclosed fleet contents');
}
await capture('speed-fleet');
await evaluate('installView(3);void 0');await advanceClock(1000);await evaluate('visual.getDisplay().centerOn(enemyFleet.x,enemyFleet.y);visual.getDisplay().updateMapRenderingCalculations();void 0');await advanceClock(1000);
await point('({x:visual.getDisplay().toScreenX(enemyFleet.x),y:visual.getDisplay().toScreenY(enemyFleet.y)})');
await check('model.selectedObject && visual.getDisplay().getFleetDiagnostics(model.selectedObject).count==="1" && !model.canHumanControl(model.selectedObject)','Actual Class fleet failed');
if(['fleet-health','before-fleet-health'].includes(process.argv[5])){
 await evaluate('window.fleetBars=[];window.originalDrawBar=visual.getDisplay().drawBar;visual.getDisplay().drawBar=function(...args){if(args[2]===40 && args[3]===4)fleetBars.push(args);return originalDrawBar.apply(this,args)};void 0');await advanceClock(1000);
 await check(process.argv[5]==='fleet-health'?'fleetBars.length>0 && fleetBars.every(args=>args[4]===.75)':'fleetBars.length===0','Selected fleet health rendering incorrect');
}
if(['fleet-member-stats','before-fleet-member-stats','table-patrol','before-table-patrol'].includes(process.argv[5])){
 await check('visual.getDisplay().getShipDiagnostics(model.selectedObject.ships[0]).health==="?"','Standalone member unexpectedly identified');
 if(process.argv[5]==='fleet-member-stats')await check('visual.getDisplay().getFleetMemberDiagnostics(model.selectedObject,model.selectedObject.ships[0]).health==="75%"','Fleet contents health incorrect');
}
await capture('class-fleet');
if(['fleet-member-stats','before-fleet-member-stats','table-patrol','before-table-patrol'].includes(process.argv[5])){
 await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="showFleetExchange").rect');
 await check('model.uiWindow==="fleetExchange"','Actual Exchange ships button failed');
 await check('visual.getDisplay().getFleetExchangeLayout().lists[0].rows[0].data.health==='+JSON.stringify(['fleet-member-stats','table-patrol','before-table-patrol'].includes(process.argv[5])?'75%':'?'),'Fleet exchange member health incorrect');
 await check('!model.canHumanControl(visual.getDisplay().getFleetExchangeLayout().lists[0].rows[0].object)','Enemy member granted control');
 if(['table-patrol','before-table-patrol'].includes(process.argv[5])){
  await check('visual.getDisplay().getFleetExchangeLayout().lists[0].rows[0].data.title.includes(" · " )==='+ (process.argv[5]==='table-patrol'),'Patrol table status incorrect');
  await check('!state.entities.find(e=>e.kind==="fleet" && e.id===enemyFleet.id).course','Patrol course leaked');
 }
 await capture('fleet-exchange');await key('Escape');
}

if(['nested-table','before-nested-table','fleet-label','before-fleet-label'].includes(process.argv[5])){
 await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="showFleetExchange").rect');
 await click('visual.getDisplay().getFleetExchangeActions().find(r=>r.action.type==="fleetExchangeSelect" && r.action.side==="main").rect');
 await check(['nested-table','fleet-label','before-fleet-label'].includes(process.argv[5])?'model.fleetExchange.active && model.fleetExchange.active.id===enemyGroup.id':'model.fleetExchange.active===null','Subgroup table access incorrect');
 if(process.argv[5]==='fleet-label')await check('visual.getDisplay().getFleetMemberDiagnostics(model.fleetExchange.container,model.fleetExchange.selection).title.startsWith("? ") && !visual.getDisplay().getFleetTableTitle(model.fleetExchange.selection).includes("Secret")','Subgroup table label incorrect');
 await capture('subgroup-selected');
 if(['nested-table','fleet-label','before-fleet-label'].includes(process.argv[5])){
  await check('visual.getDisplay().getFleetExchangeLayout().lists[1].rows[0].data.health==="75%"','Subgroup member statistics missing');
  await click('visual.getDisplay().getFleetExchangeActions().find(r=>r.action.type==="fleetExchangeOpen").rect');
  await check('model.fleetExchange.container.id===enemyGroup.id && visual.getDisplay().getFleetExchangeLayout().lists[0].rows[0].data.health==="75%"','Subgroup Inspect failed');
  await check('model.fleetExchange.container.getVisibilityTo(2)===0 && !model.canExchangeFleetMember() && visual.getDisplay().getShipDiagnostics(model.fleetExchange.selection).health==="?"','Subgroup inspection altered independent knowledge/control');
  await capture('subgroup-inspected');
  await click('visual.getDisplay().getFleetExchangeActions().find(r=>r.action.type==="fleetExchangeParent").rect');
  await check('model.fleetExchange.container.id===enemyFleet.id','Subgroup Parent failed');
  await capture('subgroup-parent');
 }else{
  await click('visual.getDisplay().getFleetExchangeActions().find(r=>r.action.type==="fleetExchangeOpen").rect');
  await check('model.fleetExchange.container.id===enemyFleet.id','Baseline subgroup unexpectedly opened');
  await capture('subgroup-inspected');await capture('subgroup-parent');
 }
 await key('Escape');
}

if(['system-contents','before-system-contents','allocation-label','before-allocation-label','system-membership','before-system-membership'].includes(process.argv[5])){
 await evaluate(`enemy.setVisibilityTo(2,4);
 ${['system-membership','before-system-membership'].includes(process.argv[5])?"window.leavingShip=hostGame.factory.createShip(enemy.x,enemy.y,'scout',enemy,true);window.leavingFleet=hostGame.factory.createFleet(enemy.x,enemy.y,1,'Departing fleet');leavingFleet.addShip(leavingShip);leavingFleet.star=null;leavingFleet.course.replace({x:enemy.x+1000,y:enemy.y});leavingFleet.setVisibilityTo(2,3);leavingFleet.updateSpatialLocation();":''}
 installView(3);void 0`);await advanceClock(1000);
 await evaluate('visual.getDisplay().centerOn(enemy.x,enemy.y);visual.getDisplay().updateMapRenderingCalculations();void 0');await advanceClock(1000);
 await point('({x:visual.getDisplay().toScreenX(enemy.x),y:visual.getDisplay().toScreenY(enemy.y)})');
 if(await evaluate('model.uiWindow==="mapPick"'))await click('visual.getDisplay().getMapSelectionActions().find(r=>r.action.object===model.stars.find(s=>s.id===enemy.id)).rect');
 await check('model.selectedObject && model.selectedObject.id===enemy.id && model.canViewSystemShips(model.selectedObject)','Details-visible system selection failed');
 await capture('enemy-system');
 if(['system-contents','allocation-label','before-allocation-label','system-membership','before-system-membership'].includes(process.argv[5])){
  await check('model.getSystemShipRows(model.selectedObject).some(r=>r.object.id===dockedFleet.id)','Client omitted hidden docked fleet');
  await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="showFleetExchange").rect');
  await click('visual.getDisplay().getFleetExchangeActions().find(r=>r.action.type==="fleetExchangeSelect" && r.action.side==="main" && r.action.object.id===dockedFleet.id).rect');
  await check('model.fleetExchange.active.id===dockedFleet.id && visual.getDisplay().getFleetExchangeLayout().lists[1].rows[0].data.health==="60%"','Docked member table statistics incorrect');
  await check('model.fleetExchange.active.getVisibilityTo(2)===0 && visual.getDisplay().getShipDiagnostics(model.fleetExchange.active.ships[0]).health==="?" && !model.canExchangeFleetMember()','System table altered independent knowledge/control');
  if(['system-membership','before-system-membership'].includes(process.argv[5])){
   const wrong=process.argv[5]==='before-system-membership';
   await check('model.getFleetExchangeState().main.some(e=>model.factory.isFleet(e) && e.id===leavingFleet.id)==='+wrong,'Host membership was not respected');
   await check('state.entities.some(e=>e.kind==="fleet" && e.id===leavingFleet.id && !("course" in e))','Private departure course leaked');
  }
  await capture('enemy-system-contents');await key('Escape');
 }else{
  await check('model.getSystemShipRows(model.selectedObject).length===0','Baseline unexpectedly exposed hidden docked members');
  await capture('enemy-system-contents');
 }
}

await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.window==="menu").rect');
await click('visual.getDisplay().getCommandActionRegions().find(r=>r.action.window==="comparison").rect');
await check('model.uiWindow==="comparison"','Actual Compare Players menu failed');await check('model.getMapShipCount()===hostGame.allShips.length','Partial client map changed the public ship total');
await capture('player-comparison');
console.log('PASS actual client view '+lang+' '+(process.argv[5] || (before?'before':'after'))+' second-human control, production, Speed/Class fleet, Compare Players');
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
