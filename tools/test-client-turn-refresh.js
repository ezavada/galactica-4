// Real forced turns, rejected old requests and old durable receipts with muted audio.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.srand(424242);
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-turn-refresh-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1},path.join(dir,'host.json'));
 const home=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);host.persist();
 const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Writer'});
 const own=()=>client.model.stars.find(s=>s.id===home.id),courier=()=>client.model.allShips.find(s=>s.id===ship.id),send=client.send.bind(client);
 courier().course.replace({x:home.x+100,y:home.y+100});await client.save();
 own().name='Next-turn name';courier().course.insert({x:home.x+50000,y:home.y+50000});const beforeX=courier().x;
 host.forceEndTurn(1);await client.refresh();assert.equal(client.model.turn,2);assert.equal(own().name,'Next-turn name');assert.equal(courier().x,host.game.allShips.find(s=>s.id===ship.id).x);assert.notEqual(courier().x,beforeX);assert.equal(courier().star,null);assert.equal(courier().course.current,1);assert.equal(courier().course.waypoints.length,2);assert(client.hasUnsavedChanges());await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.allShips.find(s=>s.id===ship.id).course.current,1);assert.notEqual(host.game.players[1].lastTurnPosted,2);
 // Save has not reached the host when it advances. Carry all unaccepted decisions.
 own().name='Rejected old-turn draft';let release,arrived;let ready=new Promise(r=>arrived=r),gate=new Promise(r=>release=r);
 client.send=async(p,o)=>{if(p==='/changes'){arrived();await gate;}return send(p,o);};const saving=client.save();await ready;host.forceEndTurn(2);release();await saving;client.send=send;assert.equal(client.model.turn,3);assert.equal(own().name,'Rejected old-turn draft');assert(client.hasUnsavedChanges());await client.flush();assert(!client.hasUnsavedChanges());
 // A receipt lost after commit is retried after the turn. Submitted creations
 // may already be destroyed: their accepted IDs must not be created again.
 const point=client.model.createRendezvousAt(own().x+70,own().y+80,1,'Accepted marker');own().name='Accepted old name';let lost=true;
 client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes' && lost){lost=false;throw Object.assign(Error('lost receipt'),{code:'network_connection_lost'});}return reply;};await assert.rejects(client.save());assert(client.pendingChanges);const ids=host.game.config.networkHost.changes[1].ids;
 own().name='Edited after receipt loss';const later=client.model.createRendezvousAt(own().x+90,own().y+100,1,'Unsent marker');later.id=ids.find(row=>row.tempId===point.id).id;
 host.forceEndTurn(3);host.transact(g=>{const accepted=g.allRendezvous.find(e=>e.id===ids.find(r=>r.tempId===point.id).id);g.entityRemoved(accepted);});
 await client.rejoin('');client.send=send;assert.equal(client.model.turn,4);assert(!client.pendingChanges);assert.equal(own().name,'Edited after receipt loss');assert(!client.model.allRendezvous.some(e=>e.name==='Accepted marker'));assert(client.model.allRendezvous.some(e=>e.name==='Unsent marker'));await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.allRendezvous.filter(e=>e.name==='Unsent marker').length,1);
 // End Turn was requested for the old turn; recovering a receipt must never
 // declare the following turn ready without a new explicit player command.
 own().name='Before late post';lost=true;client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes' && lost){lost=false;throw Object.assign(Error('lost receipt'),{code:'network_connection_lost'});}return reply;};await assert.rejects(client.save());own().name='Newer late-post edit';host.forceEndTurn(4);let posts=0;client.send=async(p,o)=>{if(p==='/orders')posts++;return send(p,o);};await assert.rejects(client.post(),e=>e.code==='wrong_turn');client.send=send;
 assert.equal(client.model.turn,5);assert.equal(posts,0);assert(!client.model.clientPosting);assert.equal(own().name,'Newer late-post edit');assert.notEqual(host.game.players[1].lastTurnPosted,5);await client.flush();assert(!client.hasUnsavedChanges());
 // Cancel during rejected-turn state recovery: an obsolete request must not
 // change the newer disconnected session's status after its awaited fetch.
 own().name='Cancel recovery';let stateArrived,releaseState;const stateReady=new Promise(r=>stateArrived=r),stateGate=new Promise(r=>releaseState=r);let rejected=false;
 client.send=async(p,o)=>{if(p==='/changes' && !rejected){rejected=true;host.forceEndTurn(5);}if(p==='/state' && rejected){stateArrived();await stateGate;throw Object.assign(Error('canceled state recovery'),{code:'network_cancelled'});}return send(p,o);};
 const canceled=client.save().then(()=>{throw Error('Expected cancellation');},e=>e);await stateReady;await client.disconnect({keepView:true});releaseState();assert.equal((await canceled).code,'network_cancelled');assert.equal(client.status,'idle');assert.equal(client.session,null);client.send=send;
 // Let the real running host scheduler expire, rather than invoking its
 // force-turn command, while an old request waits to reach the server.
 await client.rejoin('');await client.flush();own().name='Deadline draft';let deadlineArrived,releaseDeadline;const deadlineReady=new Promise(r=>deadlineArrived=r),deadlineGate=new Promise(r=>releaseDeadline=r);let held=false;
 client.send=async(p,o)=>{if(p==='/changes' && !held){held=true;deadlineArrived();await deadlineGate;}return send(p,o);};const deadlineSave=client.save();await deadlineReady;
 host.updateSettings({...require('../src/js/host-settings.js').snapshot(host.game),maxTimePerTurn:3600,endEarly:false},0);host.transact(()=>{host.clock.stop();host.clock.remainingMs=1;host.clock.paused=false;host.clock.start();});
 for(let i=0;i<100 && host.game.turn===6;i++)await new Promise(r=>setTimeout(r,25));assert.equal(host.game.turn,7);releaseDeadline();await deadlineSave;client.send=send;
 assert.equal(client.model.turn,7);assert.equal(own().name,'Deadline draft');assert(client.hasUnsavedChanges());await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.stars.find(s=>s.id===home.id).name,'Deadline draft');assert.notEqual(host.game.players[1].lastTurnPosted,7);
 // A submitted End Turn is not an unposted draft. Its lost reply must not
 // replay already executed movement/orders when rejoining the next turn.
 own().name='Posted name';courier().course.replace({x:courier().x+100,y:courier().y+100});const postedMarker=client.model.createRendezvousAt(own().x+120,own().y+130,1,'Posted marker');let losePost=true;
 client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/orders' && losePost){losePost=false;throw Object.assign(Error('lost post reply'),{code:'network_connection_lost'});}return reply;};await assert.rejects(client.post());assert(client.pendingPost);host.forceEndTurn(7);await client.rejoin('');client.send=send;
 assert.equal(client.model.turn,8);assert.equal(client.pendingPost,null);assert(!client.model.clientPosting);assert(!client.hasUnsavedChanges());assert.equal(courier().course.waypoints.length,0);assert.equal(host.game.allRendezvous.filter(e=>e.name==='Posted marker').length,1);assert.equal(client.model.allRendezvous.filter(e=>e.name==='Posted marker').length,1);
 console.log('PASS turn refresh: authoritative movement, appended-course progress, unposted dirty decisions, rejected old requests, lost receipt/rejoin, removed accepted creation, unsent creation and no accidental next-turn posting and canceled recovery status and actual scheduler deadline and no replay of accepted End Turn orders');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
