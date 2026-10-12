// Player-facing browser End Turn regression against a temporary native host. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-network-orders.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-network-orders.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={drawingPreferences,I18n,getJoin:()=>networkJoin,getNetwork:()=>sessions.active && sessions.active.network,getStartupJoin:()=>{const a=port.getDrawingArea();return StartupSetup.joinRegion(StartupSetup.panelRect(a.width(),a.height()))},makeNetworkClient:address=>new (require("./src/js/network-client.js").NetworkClient)(address),makeHost:o=>new Game(new Factory(),new Rules(false),new GameConfig(o)),project:g=>require("./src/js/host-view.js").snapshot(g,2),makeClient:s=>require("./src/js/client-state.js").restore(s),installModel:m=>{game=m;game.port=port;display=new Display(game);game.sound=sound;game.showControlHelp=true;},getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const infoFile=path.join(profile,'live-info.json');const native=spawn(path.join(__dirname,'../gad4'),[path.join(__dirname,'serve-test-network-host.js')],{cwd:path.join(__dirname,'..'),env:{...process.env,GALACTICA_TEST_HOST_FILE:path.join(profile,'host.json'),GALACTICA_TEST_HOST_INFO:infoFile,GALACTICA_TEST_LANGUAGE:process.argv[4]||'en'},stdio:['ignore','ignore','inherit']});
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
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
let readyHost=false;for(let i=0;i<120;i++){if(fs.existsSync(infoFile)){readyHost=true;break;}if(native.exitCode!==null)throw Error('Native fixture exited '+native.exitCode);await delay(250);}if(!readyHost)throw Error('Native host did not start');
const {url,gameId}=JSON.parse(fs.readFileSync(infoFile,'utf8'));
const names={en:'Voyager',de:'Jäger',es:'Exploración',fr:'Éclaireur',ja:'航行者',ru:'Разведчик'},name=names[lang],password='秘密 Д';

const wait=async(expression,label)=>{for(let i=0;i<160;i++){if(await evaluate(expression))return;await delay(100);}await check(expression,label+' '+JSON.stringify(await evaluate('(()=>{const c=visual.getNetwork();return {networkError:visual.getSessions().active?.networkError,status:c?.status,revision:c?.model?.clientOrderRevision,dirty:c?.hasUnsavedChanges(),saving:!!c?.savePromise,flushing:!!c?.flushPromise,pending:!!c?.pendingChanges,selected:visual.getGame()?.selectedObject?.id}})()')));};
const type=async text=>{for(const c of Array.from(text))await key(c);};
const joinButton=action=>click('visual.getJoin().layout(800,600).buttons.find(b=>b.action==="'+action+'").rect');
const field=async(name,text)=>{await click('visual.getJoin().layout(800,600).fields.find(f=>f.name==="'+name+'").rect');await type(text);};
await capture('startup-with-join');
// Cancel from startup must leave setup and local documents untouched.
await click('visual.getStartupJoin()');await capture('join-empty');await key('Escape');await check('!visual.getJoin().active && !visual.getGame()','Startup cancellation changed game state');
await click('visual.getStart()');await click('visual.getSubmit()');
await evaluate('window.localSession=visual.getSessions().active;window.localSnapshot=visual.serialize(localSession.game);void 0');
await fileMenu();await decision('join');await check('visual.getJoin().active','File Join did not open');
await field('address',url);await joinButton('inspect');await wait('!visual.getJoin().busy','Lobby inspection did not finish');await check('visual.getJoin().info && visual.getJoin().info.gameId==='+JSON.stringify(gameId),'Lobby identity missing');
// Drag the shared modal title; remember the constrained position in preferences.
const rect=await evaluate('visual.getJoin().layout(800,600).rect'),beforeDrag=await evaluate('window.testInputCount || 0');
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x+70,y:rect.y+24,button:'left',clickCount:1});
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+87,y:rect.y+33,button:'left',buttons:1});await delay(100);
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+87,y:rect.y+33,button:'left',clickCount:1});await waitForInput(beforeDrag,2);
await check('(()=>{const r=visual.getJoin().layout(800,600).rect,p=visual.drawingPreferences.readWindowPosition("networkJoin");return r.x>'+rect.x+' && p && r.x===p.x && r.y===p.y && r.x+r.width<=800 && r.y+r.height<=600})()','Modal drag or saved position failed');
await field('name',name);await field('password',password);await capture('join-lobby');
await point('({x:2,y:2})');await check('visual.getJoin().active && visual.getSessions().active===localSession','Outside click dismissed modal or affected local session');
await joinButton('connect');await wait('!visual.getJoin().active || !visual.getJoin().busy','Join did not finish');await check('!visual.getJoin().active && visual.getNetwork().connected && visual.getGame().getCurrentHumanPlayer()===2','UI admission failed');
await check('visual.getSessions().sessions.length===2 && visual.serialize(localSession.game)===localSnapshot','Joining disturbed the retained local game');
await evaluate('window.model=visual.getGame();window.nc=visual.getNetwork();window.home=model.stars.find(s=>s.owner===2);void 0');await advanceClock(1000);
await evaluate('visual.getDisplay().camera.setZoom(1.2);visual.getDisplay().camera.centerOn(home.x,home.y);void 0');await advanceClock(1000);
await point('({x:visual.getDisplay().toScreenX(home.x),y:visual.getDisplay().toScreenY(home.y)})');
await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="buildShip" && r.action.shipType==="colony").rect');await capture('joined-production');

if(process.env.GALACTICA_TEST_CREATION==='1'){
 const baseline=process.argv[5]==='before';await point('({x:20,y:250})');await check('!visual.getGame().selectedObject','Creation fixture retained selection');
 await click('visual.getDisplay().getMapButtonRegions().find(r=>r.action.type==="beginRendezvousPlacement").rect');await capture('creation-crosshair');
 await point('({x:220,y:280})');await check('visual.getGame().allRendezvous.length===1 && visual.getGame().selectedObject===visual.getGame().allRendezvous[0]','Map creation failed');
 if(!baseline)await wait('!visual.getNetwork().flushPromise && !visual.getNetwork().hasUnsavedChanges()','Created point was not saved automatically');
 else await check('visual.getNetwork().hasUnsavedChanges() && !visual.getNetwork().flushPromise','Baseline unexpectedly saved creation');
 await capture('created-point');await click('visual.getDisplay().getContextButtonRegions().find(r=>r.action.type==="beginRename").rect');await capture('created-point-rename');await key('Escape');await capture('created-point-cancel-name');
 await check('visual.getGame().allRendezvous.length===1 && !visual.getGame().clientTurnPosted && visual.getGame().turn===1','Creation acknowledgment lost point or posted turn');
 if(!baseline){const saved=await evaluate('(async()=>{const c=visual.getNetwork(),state=await c.send("/state",{token:c.session.token});return state.entities.filter(e=>e.kind==="rendezvous").length;})()');if(saved!==1)throw Error('Created point missing on host');}
 console.log('PASS automatic point creation '+lang+' '+(baseline?'before':'after'));return;
}
if(process.env.GALACTICA_TEST_WRITEBACK==='1'){
 const baseline=process.argv[5]==='before';
 await click('visual.getDisplay().getStarAllocationSliderRegions(home).find(s=>s.key==="growth").rect');await capture('draft-production');
 await point('({x:20,y:250})');
 if(!baseline){await wait('!visual.getNetwork().flushPromise && !visual.getNetwork().hasUnsavedChanges()', 'Selection writeback did not finish');await check('!visual.getGame().clientTurnPosted && visual.getGame().turn===1 && visual.getGame().clientOrderRevision>0','Selection save posted or lost revision');}
 await capture('selection-save');await fileMenu();await decision('save');
 if(baseline){await check('visual.getDocuments().dialog.kind==="status"','Baseline unexpectedly saved');await capture('document-save');await key('Escape');}
 else{await wait('!visual.getDocuments().dialog','Document Save did not finish');await capture('document-save');
 await evaluate('window.home=visual.getGame().stars.find(s=>s.owner===2);visual.getGame().setSelectedObject(home);void 0');
 await click('visual.getDisplay().getStarAllocationSliderRegions(home).find(s=>s.key==="research").rect');await capture('before-close');
 if(process.env.GALACTICA_TEST_WRITEBACK_ERROR==='1'){
 await fileMenu();await evaluate('visual.getSessions().active.nextRefresh=Date.now()+60000;visual.getGame().stars.find(s=>s.owner===2).name+=" saved draft";window.realSend=nc.send.bind(nc);window.failDraft=true;nc.send=(endpoint,options)=>endpoint==="/changes" && failDraft?(failDraft=false,Promise.reject(Object.assign(new Error("fixture disk failure"),{code:"host_save_failed"}))):realSend(endpoint,options);void 0');
 await decision('close');await wait('visual.getDocuments().dialog?.kind==="status"','Failed Close did not report error');await check('visual.getSessions().active.network===nc && visual.getGame().stars.find(s=>s.owner===2).name.endsWith(" saved draft") && !visual.getGame().clientTurnPosted','Failed Close discarded the document');await capture('close-failure');await key('Escape');
 }
 await fileMenu();await decision('close');
 await wait('visual.getSessions().active===localSession','Close did not restore retained local game');await capture('after-close');await check('nc.model===null && !nc.session','Close did not disconnect');}
 console.log('PASS application draft Save/selection/Close '+lang+' '+(baseline?'before':'after'));return;
}
await capture('before-turn-posting');
// Set the target through the actual slider, then post through the actual map button.
await click('visual.getDisplay().getStarAllocationSliderRegions(home).find(s=>s.key==="growth").rect');
await evaluate('window.desired=home.growth.desired;window.beforeTurn=visual.getGame().turn;void 0');await capture('orders-before-post');
const beforeEndMenu=process.env.GALACTICA_EXPECT_NO_END_MENU==='1';
if(beforeEndMenu)await click('visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").rect');
else {
 await check('visual.getGame().canRequestEndTurn()','Authenticated client End Turn unavailable');
 await click('visual.getDisplay().getMapButtonRegions().find(b=>b.action.window==="menu").rect');
 await check('!visual.getDisplay().getCommandActionRegions().find(b=>b.action.type==="endTurn").disabled','Client menu End Turn incorrectly disabled');
 await capture('client-end-turn-menu');await click('visual.getDisplay().getCommandActionRegions().find(b=>b.action.type==="endTurn").rect');
}
if(await evaluate('visual.getGame().uiWindow==="endTurnConfirm"'))await click('visual.getDisplay().getEndTurnConfirmActions().find(b=>b.action.type==="confirmEndTurn").rect');
await wait('visual.getGame().clientTurnPosted || visual.getSessions().active.networkError','Posting did not finish');
await check('visual.getGame().clientTurnPosted && visual.getGame().turn===beforeTurn && !visual.getNetwork().pendingPost','Posted state was not installed');
await check('visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").label===visual.I18n.getString(1038)','Posted button was not localized');
if(!beforeEndMenu)await check('!visual.getGame().canRequestEndTurn() && visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").disabled','Posted End Turn remains enabled');
await check('!visual.getGame().canHumanControl(visual.getGame().stars.find(s=>s.id===home.id))','Posted orders remained editable');await capture('posted-waiting');
await click('visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").rect');await check('visual.getGame().turn===beforeTurn && !visual.getNetwork().postPromise','Repeated Posted click submitted another turn');
// First human uses the same real browser transport; the second player used the shipped UI above.
await evaluate('(async()=>{window.first=visual.makeNetworkClient('+JSON.stringify(url)+');await first.connect({name:"First",mode:"rejoin"});await first.post();return null;})()');
await wait('visual.getGame().turn>beforeTurn','Both posts did not advance the authoritative turn');await advanceClock(1000);
await check('!visual.getGame().clientTurnPosted && visual.getGame().canHumanControl(visual.getGame().stars.find(s=>s.id===home.id))','New turn did not unlock orders');
if(!beforeEndMenu)await check('visual.getGame().canRequestEndTurn() && !visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").disabled','Authoritative refresh did not re-enable End Turn');
await check('visual.getGame().stars.find(s=>s.id===home.id).growth.desired===desired','Host lost the production target');await capture('authoritative-posted-next-turn');
if(!beforeEndMenu){
 // Finish the source-paced new-turn notice before sending another command.
 await advanceClock(2000);
 // Delay only background refresh so this fixture exercises explicit receipt retry.
 await key('Escape');await evaluate('visual.getGame().clearEventPresentations();visual.getGame().attention.queue=[];visual.getGame().uiWindow=null;visual.getSessions().active.nextRefresh=Date.now()+30000;void 0');
 await evaluate('(async()=>{const r=await fetch('+JSON.stringify(url+'/test/drop-orders-response')+',{method:"POST"});if(!r.ok)throw Error("Fault fixture failed");return null;})()');
 await evaluate('window.retryTurn=visual.getGame().turn;void 0');await click('visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").rect');
 await wait('!visual.getNetwork().postPromise && !!visual.getNetwork().pendingPost && !!visual.getSessions().active.networkError','Dropped-response state did not appear '+JSON.stringify(await evaluate('({pending:!!visual.getNetwork().pendingPost,posting:!!visual.getNetwork().postPromise,posted:visual.getGame().clientTurnPosted,status:visual.getNetwork().status,error:visual.getSessions().active.networkError,window:visual.getGame().uiWindow,available:visual.getGame().canRequestEndTurn(),nextRefresh:visual.getSessions().active.nextRefresh,now:Date.now()})')));
 await check('visual.getGame().canRequestEndTurn() && !visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").disabled && visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").label===visual.I18n.getString(1039)','Live Retry command unavailable');
 await evaluate('window.receipt=visual.getNetwork().pendingPost.postId;window.posts=[];const send=visual.getNetwork().send.bind(visual.getNetwork());visual.getNetwork().send=(endpoint,options)=>{if(endpoint==="/orders")posts.push(options.body.postId);return send(endpoint,options);};void 0');
 await capture('retry-ready');await click('visual.getDisplay().getMapButtonRegions().find(b=>b.action.type==="endTurn").rect');
 await wait('!visual.getNetwork().postPromise && !visual.getNetwork().pendingPost','Retry did not finish');
 await check('visual.getGame().clientTurnPosted && visual.getGame().turn===retryTurn && posts.length===1 && posts[0]===receipt','Retry changed receipt or advanced host prematurely');await capture('retry-posted');
}
await evaluate('(async()=>{await first.disconnect();return null;})()');
await check('visual.serialize(localSession.game)===localSnapshot','Posting modified the retained local game');
console.log('PASS player-facing End Turn '+lang+' actual slider orders, actual End Turn, localized Posted state, edit locks, duplicate-click refusal, two authenticated humans and authoritative next-turn refresh and live UI receipt retry');
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();native.kill('SIGTERM');server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
