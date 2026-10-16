// Network Save/Close/Quit must await durable drafts, preserving failures for retry.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),Documents=require('../src/js/documents.js'),Sessions=require('../src/js/game-sessions.js'),{QuitDocuments}=require('../src/js/quit-documents.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-documents-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:1,numComputers:1,density:1,sectorSize:1},path.join(dir,'host.json'));const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Writer'});
 const sessions=new Sessions(),session=sessions.accept(client.model,{});session.network=client;
 const docs=new Documents({cancelPick:()=>{},save:()=>{throw Error('Must not export partial map');}},()=>sessions.active,()=>{},()=>{},s=>!!sessions.close(s));
 let exited=false;const quit=new QuitDocuments(sessions,docs,{activate:s=>sessions.select(s.id),exit:()=>exited=true});
 for(const language of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(language);docs.beginSave(true);assert.equal(docs.dialog.kind,'status');assert(docs.dialog.message.length>0);docs.cancel();}pdg.res.setLanguage('en');
 assert(!quit.hasUnsaved());let home=client.model.stars.find(s=>s.owner===1);home.name='Saved through menu';assert(quit.hasUnsaved());
 await docs.beginSave();assert.equal(docs.dialog,null);assert(!quit.hasUnsaved());assert.equal(host.game.stars.find(s=>s.owner===1).name,'Saved through menu');assert.equal(host.game.turn,1);assert(!client.model.clientTurnPosted);assert.equal(session.file,undefined);
 const persist=host.persist.bind(host);home=client.model.stars.find(s=>s.owner===1);home.name='Close retry';host.persist=()=>{throw Error('fixture disk failure');};
 assert.equal(await docs.beginClose(),false);assert.equal(sessions.active,session);assert.equal(docs.dialog.kind,'status');assert(client.pendingChanges);assert(quit.hasUnsaved());assert(!exited);docs.cancel();host.persist=persist;
 // Hold a save in flight: Escape/Discard cannot close the document underneath it.
 let release,arrived;const ready=new Promise(r=>arrived=r),gate=new Promise(r=>release=r),send=client.send.bind(client);client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes'){arrived();await gate;}return reply;};
 home.name='Quit saved';assert(quit.request());assert.equal(docs.dialog.kind,'busy');assert(!docs.cancel());assert(!docs.action('discardClose'));await ready;assert(!exited);assert.equal(sessions.active,session);release();
 for(let n=0;n<100 && !exited;n++)await new Promise(r=>setTimeout(r,10));assert(exited);assert.equal(sessions.sessions.length,0);assert.equal(host.game.stars.find(s=>s.owner===1).name,'Quit saved');assert.equal(host.game.turn,1);assert.equal(host.game.players[1].lastTurnPosted,0);
 console.log('PASS client documents: host Save, no partial export, failed Close retained, retry, noncancelable flush and Quit waits for persistence without posting');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
