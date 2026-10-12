// Actual client draft transport against a durable localhost host; audio muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-writeback-'));let host;const clients=[];
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1},path.join(directory,'host.json'));
 const home=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);host.persist();
 const address=await host.listen({discovery:false}),url='http://127.0.0.1:'+address.port,a=new NetworkClient(url),b=new NetworkClient(url);clients.push(a,b);await a.connect({name:'First'});await b.connect({name:'Second'});
 assert(!a.hasUnsavedChanges());const own=a.model.stars.find(s=>s.owner===1);own.name='Saved 星';assert(a.hasUnsavedChanges());
 await a.save();assert(!a.hasUnsavedChanges());assert.equal(host.game.stars.find(s=>s.id===home.id).name,'Saved 星');assert(!a.model.clientTurnPosted);assert.equal(host.game.turn,1);
 const courier=a.model.allShips.find(s=>s.id===ship.id),fleet=a.model.factory.createFleet(own.x,own.y,1,'First fleet');fleet.star=own;fleet.addShip(courier);
 const marker=a.model.createRendezvousAt(own.x+20,own.y+30,1,'First point');fleet.course.replace(marker);own.defaultDestination=marker;
 // Let the host commit, then hold the acknowledgment while the player edits.
 const send=a.send.bind(a);let release,arrived;const ready=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>release=resolve);
 a.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes'){arrived(reply);await gate;}return reply;};
 const saving=a.save(),reply=await ready;own.name='Edited during save';marker.name='Edited point';
 const next=a.model.createRendezvousAt(own.x+40,own.y+50,1,'Later point');
 // Force a temporary-ID collision with the host-assigned submitted marker.
 next.id=reply.orderIds.find(row=>row.kind==='rendezvous').id;
 fleet.course.replace(next);release();await saving;a.send=send;
 assert(a.hasUnsavedChanges());assert.equal(a.model.stars.find(s=>s.id===home.id).name,'Edited during save');assert(a.model.allFleets.includes(fleet));assert(a.model.allRendezvous.includes(marker));assert(a.model.allRendezvous.includes(next));assert.notEqual(marker.id,next.id);assert.equal(fleet.course.waypoints[0].target,next);assert.equal(courier.fleet,fleet);assert(fleet.ships.includes(courier));assert.equal(own.defaultDestination,marker);
 await a.flush();assert(!a.hasUnsavedChanges());assert.equal(host.game.allRendezvous.length,2);assert.equal(host.game.allFleets.length,1);assert.equal(host.game.stars.find(s=>s.id===home.id).name,'Edited during save');assert(!a.model.clientTurnPosted);
 // Lose a response after durable commit; retry must use the same request ID.
 let lose=true,nonce;own.name='Lost reply';a.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes'){if(lose){lose=false;nonce=o.body.orders.postId;throw Object.assign(Error('fixture lost response'),{code:'network_connection_lost'});}assert.equal(o.body.orders.postId,nonce);}return reply;};
 await assert.rejects(a.save());assert(a.pendingChanges);await a.rejoin('');assert(a.pendingChanges);own.name='Newer after lost reply';await a.save();a.send=send;assert(a.hasUnsavedChanges());await a.flush();assert(!a.hasUnsavedChanges());assert.equal(host.game.stars.find(s=>s.id===home.id).name,'Newer after lost reply');
 // No-op flush must not produce another host revision or mark readiness.
 const revision=a.model.clientOrderRevision;await a.flush();assert.equal(a.model.clientOrderRevision,revision);assert.equal(host.game.players[1].lastTurnPosted,0);
 // A malformed success must not replace the draft or lose its retry envelope.
 own.name='Malformed reply';let malformed=true;a.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes' && malformed){malformed=false;return {...reply,orderRevision:-1};}return reply;};
 await assert.rejects(a.save(),e=>e.code==='network_bad_response');assert(a.pendingChanges);assert.equal(own.name,'Malformed reply');await a.save();a.send=send;assert(!a.hasUnsavedChanges());
 // A failed disk write retains an exact retry; an authoritative context conflict
 // retains the local draft until the caller explicitly discards it on refresh.
 own.name='Disk retry';const persist=host.persist.bind(host);host.persist=()=>{throw Error('fixture disk failure');};await assert.rejects(a.save(),e=>e.code==='host_save_failed');assert(a.pendingChanges);host.persist=persist;await a.save();assert(!a.hasUnsavedChanges());
 own.name='Stale context draft';host.editInitialState({action:'population',star:home.id,value:12345},a.model.clientInitialStateRevision,1);await assert.rejects(a.save(),e=>e.code==='stale_orders');assert.equal(own.name,'Stale context draft');assert(a.hasUnsavedChanges());assert(!a.pendingChanges);await a.refresh({discardOrders:true});assert(!a.hasUnsavedChanges());assert.equal(a.model.stars.find(s=>s.id===home.id).population,12345);
 // End Turn waits for a running flush, then submits the current decisions once.
 a.model.stars.find(s=>s.id===home.id).name='Flush then post';await Promise.all([a.flush(),a.post()]);assert(a.model.clientTurnPosted);await b.post();assert.equal(host.game.turn,2);
 console.log('PASS client writeback: no-op baseline, unposted save, in-flight edits, temporary-ID collision, live references, flush, lost-response retry and turn posting');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{for(const c of clients)await c.disconnect();if(host)await host.close();fs.rmSync(directory,{recursive:true,force:true});process.exit(process.exitCode||0);});
