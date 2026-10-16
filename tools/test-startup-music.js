// Real native PDG music/timer regression. Output remains muted throughout.
const assert=require('assert'),path=require('path'),pdg=require('pdg');globalThis.pdg=pdg;
pdg.snd.setMute(true);pdg.res.openResourceFile(path.join(__dirname,'../data'));
const Sound=require('../src/js/sound.js'),Presentation=require('../src/js/presentation.js');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));let clock=0,handle=null,loads=0,starts=0,stops=0;
const audio=Sound.createSound({getSound(file){const value=pdg.res.getSound(file);if(file==='sounds/startup.wav'){handle=value;loads++;const start=value.start,stop=value.stop;value.start=function(...args){starts++;return start.apply(this,args);};value.stop=function(...args){stops++;return stop.apply(this,args);};}return value;}},
 {readSound:()=>true,writeSound:()=>{}},()=>clock);
const presentation=new Presentation({readSplash:()=>true,writeSplash:()=>{}},audio);
(async()=>{
 assert(presentation.open('startup',clock));assert(handle && handle.isLooping());assert.equal(handle.getVolume(),1);
 presentation.close();clock=2500;await delay(150);assert.equal(handle.getVolume(),.5);
 audio.play(1001);audio.stop();assert.equal(handle.getVolume(),.5);
 clock=5000;await delay(150);assert.equal(handle.getVolume(),0);assert.equal(stops,1);
 assert(presentation.open('about',clock));assert.equal(loads,1);assert.equal(handle.getVolume(),1);
 presentation.close();audio.setEnabled(false);assert.equal(stops,3);clock=10000;
 audio.setEnabled(true);assert.equal(starts,2);
 assert(presentation.open('about',clock));presentation.close();clock+=5000;await delay(150);
 assert.equal(handle.getVolume(),0);assert.equal(starts,3);assert.equal(stops,5);
 console.log('PASS real native startup/About loop, cached playback, timer-only fade and mute');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{audio.setEnabled(false);pdg.quit();});

pdg.run();
