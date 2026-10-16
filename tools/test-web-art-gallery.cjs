// Browser verification of all comparison artwork and scene compositing controls.
// Usage: node tools/test-web-art-gallery.cjs PROJECT_OR_DIST SCREENSHOT_DIR
// Chrome output is muted without disabling application sound logic.
// GALACTICA_CHROME overrides the Chrome executable. No file dialogs are opened.
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const root=process.argv[2],out=process.argv[3];if(!root || !out)throw Error('Usage: node tools/test-web-art-gallery.cjs PROJECT_OR_DIST SCREENSHOT_DIR');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';const data=fs.readFileSync(p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html');res.end(data);}catch(e){res.writeHead(404);res.end('Missing');}});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-visual-'));
const chrome=spawn(process.env.GALACTICA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--remote-debugging-pipe','--no-first-run','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let currentScene,runtimeFailure=null;let seq=0,buffer='';const pending=new Map();chrome.stdio[4].on('data',b=>{buffer+=b;let n;while((n=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,n));if(m.method==='Runtime.exceptionThrown'){runtimeFailure=m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text;console.error(JSON.stringify(m.params));}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')console.error(JSON.stringify(m.params));buffer=buffer.slice(n+1);if(pending.has(m.id)){const v=pending.get(m.id);clearTimeout(v.timer);pending.delete(m.id);m.error?v.reject(Error(m.error.message)):v.resolve(m.result);}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error('Timeout '+method)),method==='Page.captureScreenshot'?30000:15000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});const delay=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const call=(m,p)=>send(m,p,sessionId);
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await call('Runtime.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1536,height:1080,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/data/art-styles/'});
 for(let i=0;i<180;i++){await delay(250);if(await evaluate('document.documentElement.dataset.ready'))break;if(runtimeFailure)throw Error(runtimeFailure);}
 const ready=await evaluate('window.artGalleryReady');if(!ready || ready.failures || ready.artworkRows!==19)throw Error('Gallery did not load '+JSON.stringify(ready));
 const check=async(expr,label)=>{if(!await evaluate(expr))throw Error(label);};
 await check('document.querySelectorAll(".comparison").length===22 && document.querySelectorAll(".art-button").length===66','Missing art columns');
 async function change(selector,value){await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(e.type==="checkbox")e.checked='+JSON.stringify(value)+';else e.value='+JSON.stringify(String(value))+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');for(let i=0;i<100;i++){await delay(25);if(await evaluate('Array.from(document.querySelectorAll(".scene")).every(e=>e.dataset.ready==="true")'))return;}throw Error('Render timed out');}
 const before=await evaluate('document.querySelector("#scene-stardock canvas").toDataURL()');
 await change('#scene-stardock select',12);
 await check('document.querySelector("#scene-stardock canvas").toDataURL()!=='+JSON.stringify(before),'Hull selection did not change art');
 for(const scene of ['stardock','lab','movement']){
  const choices=await evaluate('document.querySelector("#scene-'+scene+' select").options.length');
  for(let i=0;i<choices;i++){
   const val=await evaluate('document.querySelector("#scene-'+scene+' select").options['+i+'].value');await change('#scene-'+scene+' select',val);
  }
  for(const index of [0,1,2]){
   await evaluate('(()=>{const e=document.querySelectorAll("#scene-'+scene+' input")[ '+index+' ];e.checked=false;e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  }
  for(let i=0;i<100;i++){await delay(25);if(await evaluate('document.querySelector("#scene-'+scene+'").dataset.ready==="true"'))break;}
  await check('Array.from(document.querySelectorAll("#scene-'+scene+' canvas")).every(c=>{const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;return d.every((v,i)=>i%4!==3||v===0)})','Layer controls left opaque pixels');
  await evaluate('document.querySelectorAll("#scene-'+scene+' input").forEach(e=>{e.checked=true;e.dispatchEvent(new Event("change",{bubbles:true}));})');
 }
 await change('#scene-movement select',12);
 const selectors=await evaluate('document.querySelectorAll("#scene-movement select").length');if(selectors!==2)throw Error('Space backgrounds unavailable');
 for(let i=0;i<7;i++){await evaluate('(()=>{const s=document.querySelectorAll("#scene-movement select")[1];s.value="'+i+'";s.dispatchEvent(new Event("change",{bubbles:true}));})()');for(let j=0;j<100;j++){await delay(25);if(await evaluate('document.querySelector("#scene-movement").dataset.ready==="true"'))break;}}
 await evaluate('document.querySelector(".art-button").click()');await check('document.querySelector("#viewer").open && document.querySelector("#download").href.startsWith("data:image/png")','Zoom/export failed');await evaluate('document.querySelector("#close-viewer").click()');
 const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'gallery.png'),Buffer.from(shot.data,'base64'));
 for(const language of ['de','es','fr','ja','ru']){
  // Release the previous page's full-resolution canvases before loading the next locale.
  await call('Page.navigate',{url:'about:blank'});
  for(let i=0;i<100;i++){await delay(25);if(await evaluate('location.href==="about:blank"'))break;}
  await call('HeapProfiler.collectGarbage');
  await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/data/art-styles/?lang='+language});
  for(let i=0;i<180;i++){await delay(100);if(await evaluate('document.documentElement.dataset.ready'))break;}
  const localizedReady=await evaluate('window.artGalleryReady');
  if(!localizedReady || localizedReady.failures)throw Error('Gallery artwork failed for '+language);
  await check('document.documentElement.lang==="'+language+'" && document.querySelector("#language").value==="'+language+'"','Language '+language+' failed');
 }
 if(runtimeFailure)throw Error(runtimeFailure);
 console.log('PASS: all 57 assets, nine composites, all hulls/research classes/backgrounds, layer toggles, full-resolution export and six languages.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{const stopped=new Promise(resolve=>chrome.once('exit',resolve));chrome.kill();await stopped;server.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
