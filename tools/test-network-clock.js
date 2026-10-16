// Awaited real scheduler/socket checks. Audio output stays muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-clock-live-')),file=path.join(dir,'host.json');
let host,first,second,realPersist;const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,limit=5000){const end=Date.now()+limit;while(!fn()){if(Date.now()>=end)throw Error('Host scheduler did not satisfy expected state');await delay(50);}}
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,maxTimePerTurn:1,endEarly:false},file);
 let address=await host.listen();const endpoint='http://127.0.0.1:'+address.port;
 first=new NetworkClient(endpoint);second=new NetworkClient(endpoint);
 await first.connect({name:'First'});await second.connect({name:'Second'});
 assert.equal(host.info().clock.secondsRemaining,null);await delay(1100);assert.equal(host.game.turn,1);
 await first.post();await second.post();assert.equal(host.game.turn,2);assert(host.info().clock.running);
 const raw=await first.send('/state',{token:first.session.token});assert.equal(raw.clock.secondsRemaining,1);assert.equal(raw.clock.paused,false);
 host.pauseClock();await first.disconnect();await second.disconnect();await delay(1100);assert.equal(host.game.turn,2);assert.equal(host.info().clock.secondsRemaining,1);
 host.resumeClock();await waitFor(()=>host.game.turn===3);await delay(100);await host.close();assert.equal(host.clockTimer,null);assert.equal(host.clock.info().running,false);
 const savedRemaining=host.clock.snapshot().remainingMs;assert(savedRemaining>0 && savedRemaining<1000);
 await delay(1100);host=NetworkHost.open(file);assert.equal(host.clock.snapshot().remainingMs,savedRemaining);assert.equal(host.game.turn,3);
 address=await host.listen();const info=await new NetworkClient('http://127.0.0.1:'+address.port).send('/info');assert.equal(info.clock.running,true);assert.equal(info.turn,3);
 await waitFor(()=>host.game.turn===4);const persist=host.persist;realPersist=persist;host.persist=()=>{throw Error('test disk full');};
 await waitFor(()=>host.clockError==='host_save_failed');assert.equal(host.game.turn,4);assert.equal(require('../src/js/game-save.js').restore(fs.readFileSync(file,'utf8')).turn,4);
 host.persist=persist;await waitFor(()=>host.game.turn===5);assert.equal(host.clockError,null);await host.close();const stoppedTurn=host.game.turn;await delay(300);assert.equal(host.game.turn,stoppedTurn);
 console.log('PASS real host clock: untimed first turn, two-player posting, authenticated countdown, paused offline players, automatic deadline resolution, stopped/reopened remaining time, failed-save rollback/retry and listener shutdown');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{
 try{if(host && realPersist)host.persist=realPersist;if(first)await first.disconnect();if(second)await second.disconnect();if(host)await host.close();}catch(error){console.error(error.stack);process.exitCode=1;}
 fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);
});
