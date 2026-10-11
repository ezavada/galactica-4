// Actual Host title capture and actual native-host controls against a native HTTP host.
// Fullscreen is disabled in this fixture to keep screenshot comparisons stable.
// Usage: node tools/test-web-host-status-compact.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE] [before|after] [WIDTH HEIGHT]
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides Chrome. The host and browser profiles are temporary.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const viewWidth=Number(process.argv[6] || 640),viewHeight=Number(process.argv[7] || 340);
if(!Number.isInteger(viewWidth) || !Number.isInteger(viewHeight) || viewWidth<320 || viewHeight<340)throw Error('Invalid viewport');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-host-status-compact.cjs BUILD_DIR SCREENSHOT_DIR [LANGUAGE]');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';let data=fs.readFileSync(p);if(p===path.join(root,'main.js'))data=Buffer.from(data.toString().replace("const hostedGames=require('./src/js/host-games.js').createService();",'const hostedGames=window.hostTestBackend;').replace('new pdg.Rect(0, 0, 800, 600)', 'new pdg.Rect(0, 0, '+viewWidth+', '+viewHeight+')').replace('const mouseHandler = new pdg.IEventHandler(function(event) {', 'const mouseHandler = new pdg.IEventHandler(function(event) { window.lastMouse={type:event.eventType,button:event.buttonNumber,x:event.mousePos.x,y:event.mousePos.y};window.testInputCount=(window.testInputCount || 0)+1;').replace('const mouseWheelHandler = new pdg.IEventHandler(function(event) {','const mouseWheelHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const keyHandler = new pdg.IEventHandler(function(event) {', 'const keyHandler = new pdg.IEventHandler(function(event) { window.testInputCount=(window.testInputCount || 0)+1;').replace('const drawHandler = new pdg.IEventHandler(function(event) {', 'const drawHandler = new pdg.IEventHandler(function(event) { window.testDrawCount=(window.testDrawCount || 0)+1;')+'\nwindow.hostAudit={host:networkHosting,preferences:drawingPreferences,backend:hostedGames,start:()=>{const a=port.getDrawingArea();return StartupSetup.hostRegion(StartupSetup.panelRect(a.width(),a.height()))}};window.foregroundAudit={window:foregroundApplicationWindow,placement:windowPlacement};window.visual={getGame:()=>game,getDisplay:()=>display,getSound:()=>sound,getDocuments:()=>documents,getSessions:()=>sessions,getOwner:()=>null};\n');res.setHeader('Content-Type',p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':p.endsWith('.wav')?'audio/wav':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const infoFile=path.join(profile,'live-info.json');
const native=spawn(path.join(__dirname,'../gad4'),[path.join(__dirname,'serve-test-host-setup.js')],{cwd:path.join(__dirname,'..'),env:{...process.env,GALACTICA_TEST_HOST_FILE:path.join(profile,'host.json'),GALACTICA_TEST_HOST_INFO:infoFile,GALACTICA_TEST_LANGUAGE:process.argv[4]||'en'},stdio:['ignore','ignore','inherit']});
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Target.activateTarget',{targetId});const call=(m,p)=>send(m,p,sessionId);const evaluate=async expression=>{if(runtimeFailure)throw Error(runtimeFailure);const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:viewWidth,height:viewHeight,deviceScaleFactor:1,mobile:false});await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.protocol==="http:"){localStorage.setItem("galactica.language",'+JSON.stringify(process.argv[4]||'en')+');localStorage.setItem("galactica.ShowSplash","false");localStorage.setItem("galactica.fullscreen","false");}'});let brokerReady=false;for(let i=0;i<120;i++){if(fs.existsSync(infoFile)){brokerReady=true;break;}if(native.exitCode!==null)throw Error('Native broker exited '+native.exitCode);await delay(250);}if(!brokerReady)throw Error('Native broker did not start');const broker=JSON.parse(fs.readFileSync(infoFile,'utf8')).url;
await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
 const url=${JSON.stringify(broker)},records=[];
 const send=async(route,body)=>{const response=await fetch(url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok){if(data.record){records.push(data.record);}throw data;}return data;};
 window.nativeLanBackend={supported:()=>true,browse:({onChange,onError})=>{let alive=true,timer=null;const poll=async()=>{try{const rows=await send('/discover',{});if(alive)onChange(rows);}catch(error){if(alive)onError(error);}finally{if(alive)timer=setTimeout(poll,400);}};return {ready:poll(),close(){alive=false;clearTimeout(timer);}};}};
 window.hostTestBackend={supported:false,records,latest:()=>records.at(-1)||null,describe:r=>r,
  create:async(options,file,listen)=>{const r=await send('/create',{options,file,listen});records.push(r);return r;},
  open:async(file,listen)=>{const r=await send('/open',{file,listen});if(!records.some(old=>old.id===r.id))records.push(r);return records.find(old=>old.id===r.id);},
  convert:async(token,file,numHumans,listen)=>{const r=await send('/convert',{token,file,numHumans,listen});records.push(r);return r;},
  discardConversion:token=>send('/discard-conversion',{token}),
  editInitialState:async(r,change,revision,turn)=>Object.assign(r,await send('/initial-state',{id:r.id,change,revision,turn})),
  changePlayer:async(r,change,revision,turn)=>Object.assign(r,await send('/player',{id:r.id,change,revision,turn})),
  setAdminPassword:async(r,password,revision)=>Object.assign(r,await send('/admin-password',{id:r.id,password,revision})),
  updateAdmission:async(r,policy,revision)=>Object.assign(r,await send('/admission',{id:r.id,policy,revision})),
  updateSettings:async(r,settings,revision)=>Object.assign(r,await send('/settings',{id:r.id,settings,revision})),
  turnControl:async(r,action,turn)=>Object.assign(r,await send('/turn-control',{id:r.id,action,turn})),
  retry:async(r,port)=>Object.assign(r,await send('/retry',{id:r.id,port})),
  stop:async r=>{await send('/stop',{id:r.id});records.splice(records.indexOf(r),1);return true;},
  closeAll:async()=>{for(const r of [...records])await window.hostTestBackend.stop(r);}};
 setInterval(async()=>{try{const all=await(await fetch(url+'/info')).json();for(const fresh of all){const r=records.find(r=>r.id===fresh.id);if(r)Object.assign(r,fresh);}}catch(ignored){}},500);
})();`});
await call('Page.navigate' ,{url:'http://127.0.0.1:'+server.address().port+'/?seed=424242&lang='+(process.argv[4]||'en')});let ready=false;for(let i=0;i<120;i++){await delay(250);const s=await evaluate('document.documentElement.dataset.status');if(s==='failed')throw Error(await evaluate('document.body.textContent'));if(s==='ready'){ready=true;break;}}if(!ready)throw Error('Startup timeout');
const capture=async name=>{currentScene=name;
 const frame=async()=>{const before=await evaluate('window.testDrawCount || 0');for(let i=0;i<100;i++){await delay(25);if(await evaluate('(window.testDrawCount || 0)>='+ (before+2)))return;}throw Error('Screenshot did not receive complete application frames');};
 await evaluate('window.visualClock+=1');await frame();await evaluate('window.visualClock+=250');await frame();
 const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));const geometry=await evaluate('hostAudit.host.active?hostAudit.host.layout('+viewWidth+','+viewHeight+'):null');fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(geometry,null,2));
};

const lang=process.argv[4]||'en';
const check=async(expr,label)=>{if(!await evaluate(expr)){await capture('failure');throw Error(label+' '+JSON.stringify(await evaluate('({status:document.documentElement.dataset.status,dialog:visual.getDocuments().dialog,sessions:visual.getSessions().sessions.length,transient:!!visual.getSessions().transient,owner:!!visual.getOwner(),active:visual.getSessions().active && visual.getSessions().active.id})')));}};
// CDP dispatch acknowledges browser delivery, not PDG's queued input. Wait for
// the application to receive each event and render it before the next action.
const waitForInput=async(before,count)=>{for(let i=0;i<100;i++){if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testInputCount || 0)>='+ (before+count))){const frame=await evaluate('window.testDrawCount || 0');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.documentElement.dataset.status==="closed"'))return;if(await evaluate('(window.testDrawCount || 0)>'+frame))return;}throw Error('PDG did not draw after input');}await delay(25);}throw Error('PDG did not receive input');};
const click=async expr=>{const before=await evaluate('window.testInputCount || 0');const p=await evaluate(`(()=>{const r=${expr},c=Module.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/Module.canvas.width,y:c.y+(r.y+r.height/2)*c.height/Module.canvas.height}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await waitForInput(before,2);};

const key=async(text)=>{const before=await evaluate('window.testInputCount || 0');const special={Enter:[13,'\r'],Tab:[9,''],Escape:[27,''],PageDown:[34,''],PageUp:[33,'']}[text],code=special?special[0]:text==='+'||text==='='?187:text.toUpperCase().charCodeAt(0),value=special?special[1]:text;await call('Input.dispatchKeyEvent',{type:'keyDown',key:text,text:value,unmodifiedText:value,windowsVirtualKeyCode:code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:text,windowsVirtualKeyCode:code});await waitForInput(before,1);};
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
await evaluate('hostAudit.backend.supported=true;window.cues=[];const play=visual.getSound().play.bind(visual.getSound());visual.getSound().play=function(id){cues.push(id);return play(id)};void 0');
const layout='hostAudit.host.layout('+viewWidth+','+viewHeight+')';
const visible=async expression=>{
 for(let i=0;i<24;i++){
  const state=await evaluate(`(()=>{const l=${layout},r=${expression};if(!l.bodyClip || !r)return 0;return r.y<l.bodyClip.y?-1:r.y+r.height>l.bodyClip.y+l.bodyClip.height?1:0})()`);
  if(!state)return;await key(state<0?'PageUp':'PageDown');
 }throw Error('Control not visible '+expression);
};
const field=async name=>{
 if(mode==='before' && viewWidth<400 && await evaluate('hostAudit.host.stage!=="hosting"')){for(let i=0;i<10 && await evaluate('hostAudit.host.focus!=='+JSON.stringify(name));i++)await key('Tab');return;}
 const expression=layout+'.fields.find(f=>f.name==='+JSON.stringify(name)+').rect';await visible(expression);await click(expression);
};
const action=async name=>{const item=layout+'.buttons.find(b=>b.action==='+JSON.stringify(name)+')';if(await evaluate(item+'.body'))await visible(item+'.rect');await click(item+'.rect');};
const type=async(text)=>{for(const c of text)await key(c);};
const inspect=async(name)=>{
 await capture(name+'-original');await drag('foregroundAudit.window().rect');
 await check('(()=>{const r=foregroundAudit.window().rect,p=hostAudit.preferences.readWindowPosition("networkHosting");return p && r.x===p.x && r.y===p.y && r.x>=10 && r.y>=10 && r.x+r.width<='+ (viewWidth-10)+' && r.y+r.height<='+ (viewHeight-10)+'})()','Host drag/persist/bounds failed '+name);
 await evaluate('window.beforeCues=cues.length;window.oldStage=hostAudit.host.stage;void 0');await point('({x:1,y:1})');
 await check('hostAudit.host.active && hostAudit.host.stage===oldStage && !visual.getGame() && cues.length===beforeCues+1 && cues[cues.length-1]===1012','Outside click leaked '+name);await capture(name+'-dragged');
};
await click('hostAudit.start()');await field('title');await type('Live '+lang+' 星・'+('Galactica '.repeat(3)));await field('file');await type('live-'+lang+'.json');await action('create');await wait('!hostAudit.host.busy','Host creation unfinished');
await check('hostAudit.host.stage==="hosting" && !!hostAudit.host.record.address','No live native host');
await evaluate('window.firstPort=hostAudit.host.record.port;window.firstId=hostAudit.host.record.id;window.liveTitle=hostAudit.host.record.title;void 0');
await capture('hosting-top');await inspect('hosting');
if(mode!=='before' && viewWidth<400){
 await check(`(()=>{const l=${layout};return (l.title+l.labels.map(label=>label.text).join('')).includes(liveTitle)})()`,'Long live title missing');
 await check(`${layout}.buttons.filter(b=>!b.body).map(b=>b.action).join(',')==='stop,cancel'`,'Stop/Close not fixed');
}
await action('pause');await wait('!hostAudit.host.busy && hostAudit.host.record.info.clock.paused','Pause failed');await capture('hosting-paused');
await action('resumeClock');await wait('!hostAudit.host.busy && !hostAudit.host.record.info.clock.paused','Resume failed');
await action('settings');await capture('hosting-settings');await key('Escape');
await action('players');await capture('hosting-players');await key('Escape');
await action('endNow');await wait('!hostAudit.host.busy && hostAudit.host.record.info.turn===2','End Now failed');
await check(`${layout}.buttons.find(b=>b.action==='initialState').disabled`,'Initial state did not disable after turn one');await capture('hosting-turn-two');
// Request a second real native listener on the first host's occupied port.
await action('another');await field('title');await type('Retry '+lang);await field('file');await type('retry-'+lang+'.json');await field('port');await type(String(await evaluate('firstPort')));await action('create');await wait('!hostAudit.host.busy','Collision create unfinished');
await check('hostAudit.host.stage==="hosting" && !hostAudit.host.record.address && !!hostAudit.host.message','Real listen failure was not retained');await capture('hosting-listen-failure');
if(mode!=='before' && viewWidth<400)await check(`${layout}.statusLines.map(l=>l.text).join('')===hostAudit.host.message`,'Listen failure caption truncated');
await field('port');await type('0');await action('retry');await wait('!hostAudit.host.busy && !!hostAudit.host.record.address','Retry did not listen');await capture('hosting-retried');
await action('cancel');await check('!hostAudit.host.active','Close failed');await click('hostAudit.start()');await action('stop');await wait('!hostAudit.host.busy','Stop unfinished');await check('hostAudit.backend.records.length===1 && hostAudit.backend.records[0].id===firstId','Stopped wrong host');
await check('!hostAudit.host.active','Stopped host window stayed open');
console.log('PASS compact live hosting, timer/admin commands, real port failure/retry/stop '+lang+' '+viewWidth+'x'+viewHeight+' '+mode);
})().catch(async e=>{console.error(e);console.error('Failed scene '+currentScene);process.exitCode=1;}).finally(()=>{chrome.kill();native.kill();server.close();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});process.exit(process.exitCode||0);},500);});
