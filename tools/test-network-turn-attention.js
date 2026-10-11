// Real network refresh and PDG Warning playback; automation stays muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),{TurnAttention}=require('../src/js/network-turn-attention.js'),{createSound}=require('../src/js/sound.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-turn-audio-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,maxTimePerTurn:0},path.join(dir,'host.json'));
 const address=await host.listen();client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Voyager'});
 const session={game:client.model},audio=createSound(pdg.res,{readSound:()=>true,writeSound:()=>{}}),attention=new TurnAttention(audio),calls=[],play=audio.play;
 audio.play=id=>{const result=play(id);calls.push({id,result});return result;};
 const refresh=async options=>{const model=await client.refresh();const result=attention.receive(session,model,options);session.game=model;return result;};
 host.transact(game=>game.endTurn());assert.equal(await refresh({front:true}),false);assert.equal(calls.length,0);
 host.transact(game=>game.endTurn());assert.equal(await refresh({front:false}),true);assert.deepEqual(calls,[{id:1002,result:true}]);assert.equal(await refresh({front:false}),false);
 audio.setEnabled(false);host.transact(game=>game.endTurn());assert.equal(await refresh({front:false}),false);assert.equal(calls.length,2);assert.equal(calls[1].result,false);audio.setEnabled(true);assert.equal(await refresh({front:false}),false);assert.equal(calls.length,2);
 host.transact(game=>game.endTurn());assert.equal(await refresh({front:false}),true);assert.equal(calls.length,3);audio.stop();console.log('PASS native actual HTTP refresh and cached PDG Warning: foreground silence, background arrivals, duplicate guard, mute and no replay');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode || 0);});
