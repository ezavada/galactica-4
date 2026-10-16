// Real native PDG fade regression. Output remains muted; no draw/update loop.
const assert=require('assert'),path=require('path'),pdg=require('pdg');globalThis.pdg=pdg;
pdg.snd.setMute(true);pdg.res.openResourceFile(path.join(__dirname,'../data'));
const Sound=require('../src/js/sound.js'),Presentation=require('../src/js/presentation.js');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let handle=null,loads=0,starts=0;
const audio=Sound.createSound({getSound(file){const value=pdg.res.getSound(file);if(file==='sounds/startup.wav'){handle=value;loads++;const start=value.start;value.start=function(...args){starts++;return start.apply(this,args);};}return value;}},
 {readSound:()=>true,writeSound:()=>{}});
const presentation=new Presentation({readSplash:()=>true,writeSplash:()=>{}},audio);
const stopped=()=>handle.getPlaybackState()===pdg.soundState_Stopped;
const waitStopped=async()=>{const deadline=Date.now()+7000;while(!stopped() && Date.now()<deadline)await delay(50);assert(stopped(),'PDG did not stop the faded music');assert.equal(handle.getVolume(),0);};
(async()=>{
 assert(presentation.open('startup',0));assert(handle && handle.isLooping());assert.equal(handle.getVolume(),1);
 presentation.close();await delay(2500);assert(Math.abs(handle.getVolume()-.5)<.15,'Music did not reach its fade midpoint');
 const volume=handle.getVolume();audio.play(1001);audio.stop();assert.equal(handle.getVolume(),volume);
 assert(presentation.open('about',2500));assert.equal(loads,1);assert.equal(starts,1);assert.equal(handle.getVolume(),1);
 // Pass the original fade deadline without drawing or a Galactica timer.
 await delay(3000);assert(!stopped());assert.equal(handle.getVolume(),1);
 presentation.close();await waitStopped();
 assert(presentation.open('about',11000));assert.equal(loads,1);assert.equal(starts,2);assert.equal(handle.getVolume(),1);
 presentation.close();audio.setEnabled(false);assert(stopped());
 audio.setEnabled(true);assert.equal(starts,2);assert(stopped());
 assert(presentation.open('about',12000));assert.equal(starts,3);assert.equal(handle.getVolume(),1);
 console.log('PASS native PDG five-second fade/stop, midpoint, reopen cancellation, cached restart and mute without drawing');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{audio.setEnabled(false);pdg.quit();});

pdg.run();
