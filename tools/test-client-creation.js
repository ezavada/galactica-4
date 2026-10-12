// Actual gameplay fleet creation callbacks persist complete objects before End Turn.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-creation-'));let host,client;
(async()=>{
 host=NetworkHost.create({numHumans:1,numComputers:1,density:1,sectorSize:1},path.join(dir,'host.json'));
 const star=host.game.stars.find(s=>s.owner===1);for(let n=0;n<2;n++){const ship=host.game.factory.createShip(star.x,star.y,'scout',star,true);star.ships.push(ship);}host.persist();
 const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Builder'});let saved,notifications=0;
 const attach=()=>{client.model.networkCommands={available:()=>true,created:()=>{notifications++;saved=client.flush().then(model=>{attach();return model;});return true;}};};attach();
 const home=client.model.stars.find(s=>s.owner===1),ships=client.model.allShips.filter(s=>s.owner===1);assert(client.model.showFleetExchange(home));
 client.model.fleetExchange.selection=ships[0];client.model.fleetExchange.side='main';client.model.fleetExchange.active=null;
 assert(client.model.exchangeFleetMember());const fleet=ships[0].fleet;fleet.addShip(ships[1]);assert(saved);await saved;
 assert.equal(notifications,1);assert(!client.hasUnsavedChanges());assert.equal(host.game.allFleets.length,1);assert.equal(host.game.allFleets[0].ships.length,2);assert.equal(ships[1].fleet,fleet);
 client.model.setSelectedObject(fleet);const group=client.model.createFleetGroup(fleet,ships[0]);assert(group);await saved;
 assert.equal(notifications,2);assert(!client.hasUnsavedChanges());assert.equal(host.game.allFleets.length,2);assert.equal(host.game.allFleets.find(e=>e.id===group.id).fleet.id,fleet.id);assert.equal(host.game.allShips.find(e=>e.id===ships[0].id).fleet.id,group.id);assert.equal(group.fleet,fleet);assert(fleet.ships.includes(group));assert.equal(client.model.selectedObject,group);
 assert.equal(host.game.turn,1);assert.equal(host.game.players[1].lastTurnPosted,0);
 console.log('PASS gameplay creation: Exchange fleet, in-flight member addition, nested group, acknowledged live containment/selection and unposted turn');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
