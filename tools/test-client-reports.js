// Manual presentation continuity through actual HTTP save receipts and refreshes.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-reports-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,density:1,sectorSize:1},path.join(dir,'host.json'));const star=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(star.x,star.y,'scout',star,true);star.ships.push(ship);
 const repair=host.game.recordEvent('Repair','Repaired',{subject:ship,recipient:1});repair.repair={name:ship.name,fleet:false};
 const commissioning=host.game.recordCommissioningReports(ship,1).find(e=>e.recipient===1),discovery=host.game.recordDiscoveryReports(star,1).find(e=>e.recipient===1);
 const outcome=host.game.recordEvent('Outcome','Win',{recipient:1});host.game.queueOutcome(outcome,'win',1);
 for(const e of host.game.eventLog)e.handled=true;host.game.clearEventPresentations();host.persist();
 const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Reviewer'});
 let cues=0;const sound=require('../src/js/sound.js').createSound({getSound:()=>({setLooping(){},setVolume(){},start(){cues++;},stop(){}})},{readSound:()=>true,writeSound(){}},()=>0);
 const send=client.send.bind(client);
 for(const [type,source] of [['report',repair],['stardock',commissioning],['lab',discovery],['outcome',outcome]]){
  client.model.stars.find(s=>s.id===star.id).name='Saved '+type;let release,arrived;const ready=new Promise(r=>arrived=r),gate=new Promise(r=>release=r);
  client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes'){arrived();await gate;}return reply;};const saving=client.save();await ready;
  const model=client.model,event=model.eventLog.find(e=>e.id===source.id);if(type==='report')assert(model.replayReport(event));else if(type==='outcome')assert(model.replayOutcome(event));else model.showEventOverlay({type,manual:true,eventId:event.id,ship:model.allShips.find(s=>s.id===ship.id),origin:model.stars.find(s=>s.id===star.id),classIndex:1});
  const overlay=model.overlay;overlay.page=2;sound.present(model,overlay,false);const played=cues;release();await saving;client.send=send;
  assert.notEqual(client.model,model);assert.equal(client.model.overlay,overlay);assert.equal(overlay.page,2);sound.present(client.model,overlay,false);assert.equal(cues,played);
  if(overlay.ship)assert.equal(overlay.ship,client.model.allShips.find(s=>s.id===ship.id));if(overlay.origin)assert.equal(overlay.origin,client.model.stars.find(s=>s.id===star.id));assert(!client.hasUnsavedChanges());client.model.dismissEventPresentation();
 }
 const event=client.model.eventLog.find(e=>e.id===repair.id);assert(client.model.replayReport(event));const overlay=client.model.overlay;
 host.editInitialState({action:'population',star:star.id,value:12345},0,1);await client.refresh();assert.equal(client.model.overlay,overlay);assert.equal(client.model.stars.find(s=>s.id===star.id).population,12345);
 host.game.eventLog=host.game.eventLog.filter(e=>e.id!==repair.id);host.editInitialState({action:'population',star:star.id,value:12346},1,1);await client.refresh();assert.equal(client.model.overlay,null);
 console.log('PASS manual report HTTP continuity: report/page, owner Stardock/Lab, outcome, fresh references, single cue, authoritative population update and removed-report cancellation');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
