// Same-turn authority updates retain drafts without replaying stale simulation.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-context-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,density:1,sectorSize:1},path.join(dir,'host.json'));
 const star=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(star.x,star.y,'scout',star,true);star.ships.push(ship);host.persist();
 const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Writer'});
 let home=client.model.stars.find(s=>s.id===star.id),member=client.model.allShips.find(s=>s.id===ship.id);home.name='Retained 星';home.growth.desired=60;home.shipBuilding.desired=30;home.research.desired=10;home.growth.locked=true;
 const point=client.model.createRendezvousAt(home.x+50,home.y+60,1,'Draft point',home),fleet=client.model.factory.createFleet(home.x,home.y,1,'Draft group');fleet.star=home;fleet.addShip(member);fleet.course.replace(point);fleet.course.swapMemory();home.defaultDestination=point;client.model.selectedObject=fleet;
 host.editInitialState({action:'population',star:star.id,value:12345},0,1);host.editInitialState({action:'ship',star:star.id,value:'defense'},1,1);
 await client.refresh();home=client.model.stars.find(s=>s.id===star.id);member=client.model.allShips.find(s=>s.id===ship.id);
 assert.equal(home.population,12345);assert.equal(home.name,'Retained 星');assert.equal(home.growth.desired,60);assert(home.growth.locked);assert.equal(home.defaultDestination,point);assert.equal(point.anchor,home);assert.equal(member.fleet,fleet);assert.equal(fleet.star,home);assert.equal(fleet.course.memory.waypoints[0].target,point);assert.equal(client.model.selectedObject,fleet);assert.equal(home.defenseSatellites.length,1);assert(client.hasUnsavedChanges());
 await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.stars.find(s=>s.id===star.id).population,12345);assert.equal(host.game.stars.find(s=>s.id===star.id).name,'Retained 星');assert.equal(host.game.allFleets.length,1);
 // A host-created point can collide with a local temporary ID. Deletions are
 // retained too, while newly authoritative objects remain in the projection.
 const local=client.model.createRendezvousAt(home.x+90,home.y+100,1,'Collision draft');home.defaultDestination=local;
 const remote=host.game.createRendezvousAt(star.x+120,star.y+130,1,'Host point');remote.id=local.id;host.persist();client.model.entityRemoved(point);
 host.editInitialState({action:'population',star:star.id,value:23456},host.game.config.networkHost.initialStateRevision,1);
 await client.refresh();home=client.model.stars.find(s=>s.id===star.id);assert.equal(home.population,23456);assert.notEqual(local.id,remote.id);assert.equal(home.defaultDestination,local);assert(client.model.allRendezvous.some(e=>e.name==='Host point'));assert(!client.model.allRendezvous.some(e=>e.name==='Draft point'));await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.allRendezvous.length,2);
 // The host changes context after committing a save, before a retry ACK arrives.
 const send=client.send.bind(client);home=client.model.stars.find(s=>s.id===star.id);home.name='Committed name';let once=true;
 client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes' && once){once=false;client.model.stars.find(s=>s.id===star.id).name='Newer during ACK';const unsent=client.model.createRendezvousAt(star.x+150,star.y+160,1,'Created during ACK'),added=host.game.createRendezvousAt(star.x+170,star.y+180,1,'Host ACK point');added.id=unsent.id;host.editInitialState({action:'population',star:star.id,value:54321},host.game.config.networkHost.initialStateRevision,1);const fresh=await send('/state',{token:client.session.token});return {...fresh,orderIds:reply.orderIds};}return reply;};
 await client.save();home=client.model.stars.find(s=>s.id===star.id);assert.equal(home.population,54321);assert.equal(home.name,'Newer during ACK');assert(client.model.allRendezvous.some(e=>e.name==='Created during ACK'));assert(client.model.allRendezvous.some(e=>e.name==='Host ACK point'));assert(client.hasUnsavedChanges());client.send=send;await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.stars.find(s=>s.id===star.id).name,'Newer during ACK');assert.equal(host.game.stars.find(s=>s.id===star.id).population,54321);assert.equal(host.game.turn,1);assert.equal(host.game.players[1].lastTurnPosted,0);
 // Revoked ownership adopts the host entity, while still-owned ship edits survive.
 home=client.model.stars.find(s=>s.id===star.id);home.name='No longer authorized';client.model.allShips.find(s=>s.id===ship.id).name='Still owned';
 host.editInitialState({action:'owner',star:star.id,value:2},host.game.config.networkHost.initialStateRevision,1);await client.refresh();
 assert.equal(client.model.stars.find(s=>s.id===star.id).owner,2);assert.notEqual(client.model.stars.find(s=>s.id===star.id).name,'No longer authorized');assert.equal(client.model.allShips.find(s=>s.id===ship.id).name,'Still owned');await client.flush();assert(!client.hasUnsavedChanges());assert.equal(host.game.allShips.find(s=>s.id===ship.id).name,'Still owned');assert.notEqual(host.game.stars.find(s=>s.id===star.id).name,'No longer authorized');
 console.log('PASS client context: authoritative population/new defense, retained drafts/routes/containment, ACK race, continued saving and no posting');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
