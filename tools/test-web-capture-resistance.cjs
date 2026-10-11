// Actual-input capture and defeated-resistance presentation regression. Requires a packaged web build and Chrome.
// Usage: node tools/test-web-capture-resistance.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-capture-resistance.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.visual={getSettings:()=>startupSettings,getSettingsModel:()=>startupSettings.active?startupSettings.model:game,getStartupSettingsButton:()=>{const a=port.getDrawingArea();return StartupSetup.settingsRegion(StartupSetup.panelRect(a.width(),a.height()))},getQuit:()=>quitDocuments,getStartupQuit:()=>{const a=port.getDrawingArea();return StartupSetup.quitRegion(StartupSetup.panelRect(a.width(),a.height()))},getDocuments:()=>documents,switchGameSession,startGame,getGame:()=>game,getDisplay:()=>display,beginTutorial,getSound:()=>sound,getDestructionTiming:()=>require("./src/js/destruction-effect.js"),beginPlayerName,getSessions:()=>sessions,getOwner:()=>tutorialSession,getPanel:()=>tutorialPanel,getStartupOpen:()=>{const a=port.getDrawingArea();return StartupSetup.cancelRegion(StartupSetup.panelRect(a.width(),a.height()))},getTutorialStart:()=>{const a=port.getDrawingArea();return StartupSetup.tutorialRegion(StartupSetup.panelRect(a.width(),a.height()))},getPanelLayout:()=>{const c=tutorialPanelContext();return tutorialPanel.layout(c.screen,c.measure,c.targets)},setName:name=>{startupPlayerName.text=name},getStart:()=>{const a=port.getDrawingArea();return StartupSetup.startRegion(StartupSetup.panelRect(a.width(),a.height()))},getSubmit:()=>{const a=port.getDrawingArea();return PlayerName.layout(a.width(),a.height(),I18n.getString(682,"Save")).buttons.find(b=>b.action==="submit").rect},serialize:g=>require("./src/js/game-save.js").serialize(g),restore:s=>require("./src/js/game-save.js").restore(s),next:g=>require("./src/js/simulation-random.js").next(g)};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");}'});await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async (name,{freezeClock=false}={})=>{currentScene=name;if(!freezeClock && !await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=1');await delay(65);if(!freezeClock && !await evaluate('document.documentElement.dataset.status==="closed"'))await evaluate('window.visualClock+=250');await delay(150);const r=await call('Page.captureScreenshot',{format:'png',...(name.startsWith('compact')?{clip:{x:0,y:0,width:320,height:340,scale:1}}:{})});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+r.x+r.width/2,y:c.y+r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
const point=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const p=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+p.x,y:c.y+p.y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};
const advanceClock=async ms=>{await evaluate('visualClock+='+ms);await delay(100);};





await evaluate(`window.visualClock=125;pdg.tm.getMilliseconds=()=>visualClock;window.cueEvents=[];const load=pdg.res.getSound;pdg.res.getSound=function(file){const sound=load.call(this,file);if(sound){const start=sound.start;sound.start=function(){cueEvents.push({file,eventId:window.g && g.overlay && g.overlay.eventId});return start.apply(this,arguments);};}return sound;};void 0`);
await click('visual.getStart()');await click('visual.getSubmit()');
await evaluate('window.g=visual.getGame();window.d=visual.getDisplay();g.players[3]=g.players[3] || {...g.players[2],name:"Third player"};void 0');
const renderClock=async expression=>{const value=await evaluate('visualClock='+expression);for(let i=0;i<120;i++){if(await evaluate('Math.abs(d.getVisualTime()-'+value+')<.001'))return;await delay(25);}throw Error('Renderer did not reach clock '+value);};
for(const [side,colony] of [['attacker',false],['defender',false],['attacker',true],['defender',true],['observer-quiet',true],['observer-auto',true]]){
 const scene=(colony?'capture':'resistance')+'-'+side;currentScene=scene;
 const attacker=side==='attacker'?1:2,defender=side==='defender'?1:side==='attacker'?2:3;
 await evaluate(`g.clearEventPresentations();g.uiWindow=null;g.setSelectedObject(null);g.eventLog=[];g.turn=2;g.config.omniscient=false;g.showEnemyEvents=${side==='observer-auto'};
 window.target=g.stars.find(s=>s.owner===0);target.owner=${defender};target.name='Colony 星 $&';target.population=1;target.techLevel=1;target.setDefaultDestination(g.stars.find(s=>s.owner===1));
 window.origin=g.stars.find(s=>s.owner===${attacker});origin.techLevel=20;g.players[${attacker}].name='Attacker Д $&';g.players[${defender}].name='Defender 星';
 window.fleet=g.factory.createFleet(target.x+1000,target.y,${attacker},'Invaders Д');window.warship=g.factory.createShip(fleet.x,fleet.y,'battleship',origin,true);fleet.addShip(warship);
 window.colonyShip=null;if(${colony}){colonyShip=g.factory.createShip(fleet.x,fleet.y,'colony',origin,true);fleet.addShip(colonyShip);}
 fleet.star=null;fleet.x=target.x+1000;fleet.y=target.y;fleet.syncShipPositions();target.setVisibilityTo(1,${side==='observer-auto'?1:0});fleet.setDestination(target);pdg.srand(42);fleet.move();g.turn=3;
 window.notices=g.eventLog.filter(e=>e.occupation);window.locals=notices.filter(e=>e.recipient===1);void 0`);
 await check('target.owner==='+ (colony?attacker:0)+' && g.allShips.includes(warship) && '+(colony?'g.allShips.includes(colonyShip)':'!notices.some(e=>e.occupation.kind==="capture")'),'Real fleet arrival did not defeat resistance or apply colony occupancy');
 await check('target.getDefaultDestination()===null','Conquest retained the previous owner default ship destination');
 await check('notices.filter(e=>e.occupation.kind==="defendersLost").length===2 && '+(colony?'notices.filter(e=>e.occupation.kind==="capture").length===3':'notices.length===2'),'Source participant/observer emitter counts');
 if(side.startsWith('observer')){
  await check('locals.length===1 && locals[0].observer && locals[0].occupation.kind==="capture"','Observer received a private resistance notice');
  if(side==='observer-quiet'){
   await check('!g.overlay && !g.isEventAccessible(locals[0]) && !g.replayReport(locals[0])','Hidden observer capture exposed');
   await evaluate('target.setVisibilityTo(1,1);void 0');
   await check('!g.overlay && g.isEventAccessible(locals[0])','Quiet detected observer capture auto-played or unavailable');
  }else await check('g.overlay && g.overlay.eventId===locals[0].id && g.overlay.automaticObserver','Detected capture observer did not automatically play');
 }else await check('locals.length==='+ (colony?2:1)+' && locals.every(e=>e.occupation.side==="'+side+'") && !g.replayReport(notices.find(e=>!e.observer && e.recipient!==1))','Participant narratives or private access incorrect');
 const count=await evaluate('locals.length');
 for(let index=0;index<count;index++){
  await evaluate('window.local=locals['+index+'];void 0');
  const kind=await evaluate('local.occupation.kind');
  if(side!=='observer-quiet'){
   await check('g.overlay && g.overlay.eventId===local.id && g.overlay.animationOnly','Source no-dialog notice missing or out of order');
   if(kind==='defendersLost'){
    for(let i=0;i<120 && !await evaluate('d.destructionStarts && Number.isFinite(d.destructionStarts.get(g.overlay))');i++)await delay(25);
    await evaluate('window.started=d.destructionStarts.get(g.overlay);void 0');
    await renderClock('started+283.333333333');await capture(scene+'-'+kind+'-explosion',{freezeClock:true});
    await renderClock('started+1500');
   }else{
    for(let i=0;i<120 && !await evaluate('cueEvents.some(e=>e.eventId===local.id)');i++)await delay(25);
    await capture(scene+'-'+kind+'-automatic');
   }
   const cue=kind==='defendersLost'?(side==='attacker'?1007:1008):(side==='attacker'?1009:side==='defender'?1010:1014);
   await renderClock('visualClock+1000');
   await check(`cueEvents.filter(e=>e.eventId===local.id).map(e=>e.file).join(',')==='${kind==='defendersLost'?'sounds/1000.wav,':''}sounds/${cue}.wav'`,'Source explosion/recipient sound sequence');
   await renderClock('visualClock+5000');
   await check('local.handled && (!g.overlay || g.overlay.eventId!==local.id) && g.turn===3','Automatic notice did not complete or advanced the turn');
  }
 }
 // Clear the supplemental participant summary before manual source-report review.
 for(let i=0;i<8 && await evaluate('!!g.overlay');i++){
  if(await evaluate('!g.overlay.animationOnly'))await key('Escape');else await renderClock('visualClock+8500');
 }
 for(let index=0;index<count;index++){
  await evaluate('window.local=locals['+index+'];void 0');const kind=await evaluate('local.occupation.kind');
  await click('d.getMapButtonRegions().find(r=>r.action.window==="events").rect');
  for(let page=0;page<20 && !await evaluate('d.getEventActionRegions().some(r=>r.action.type==="selectEvent" && r.action.event===local)');page++)await click('d.getEventActionRegions().find(r=>r.action.type==="eventPage" && r.action.page>d.getEventWindowLayout().page).rect');
  await click('d.getEventActionRegions().find(r=>r.action.type==="selectEvent" && r.action.event===local).rect');
  await capture(scene+'-'+kind+'-events');await click('d.getEventActionRegions().find(r=>r.action.type==="replayReport").rect');
  await check('g.overlay && g.overlay.manual && !g.overlay.animationOnly && g.overlay.eventId===local.id','Full manual occupation narrative missing');
  await renderClock('visualClock+1500');await capture(scene+'-'+kind+'-manual');
  await check('d.getReportLayout(g.overlay).lines.join(" ").includes("Colony 星 $&") && !/\\{\\d+\\}/.test(local.message)','Recorded name or resolved localization missing');
  await key('Escape');await check('!g.overlay && g.turn===3','Manual occupation replay advanced the turn');
 }
}
console.log('PASS real fleet resistance/capture, source recipient counts, private/observer gates, ordered no-dialog notices, sound sequences and Events replay '+lang);
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
