// Saved projections must not interrupt live rename, targeting or pointer input.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-interaction-'));let host,client;
const attach=()=>{client.model.networkCommands={available:()=>true};};
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,density:1,sectorSize:1},path.join(dir,'host.json'));const star=host.game.stars.find(s=>s.owner===1),ship=host.game.factory.createShip(star.x,star.y,'scout',star,true);star.ships.push(ship);host.persist();
 const address=await host.listen({discovery:false});client=new NetworkClient('http://127.0.0.1:'+address.port);await client.connect({name:'Writer'});attach();
 let home=client.model.stars.find(s=>s.id===star.id);home.name='Saved name';const send=client.send.bind(client);let release,arrived;
 const ready=new Promise(r=>arrived=r),gate=new Promise(r=>release=r);client.send=async(p,o)=>{const reply=await send(p,o);if(p==='/changes'){arrived();await gate;}return reply;};
 const saving=client.save();await ready;client.model.beginRenameObject(home);client.model.renameText='Incomplete 星';client.model.renameEditor.text=client.model.renameText;client.model.renameEditor.caret=4;release();await saving;client.send=send;attach();
 assert.equal(client.model.uiWindow,'rename');assert.equal(client.model.renameTarget.id,home.id);assert.equal(client.model.renameText,'Incomplete 星');assert.equal(client.model.renameEditor.caret,4);assert.equal(host.game.stars.find(s=>s.id===star.id).name,'Saved name');assert(!client.hasUnsavedChanges());client.model.commitRename();await client.flush();attach();assert.equal(host.game.stars.find(s=>s.id===star.id).name,'Incomplete 星');
 // A same-turn authoritative replacement remaps the active source, leaving
 // both the map target and allocation drag on the current projection.
 home=client.model.stars.find(s=>s.id===star.id);client.model.pendingMapOrderObject=home;client.model.uiSliderDrag={star:home,window:null,key:'growth'};
 host.editInitialState({action:'population',star:star.id,value:12345},0,1);await client.refresh();attach();home=client.model.stars.find(s=>s.id===star.id);assert.equal(client.model.pendingMapOrderObject,home);assert.equal(client.model.uiSliderDrag.star,home);assert.equal(home.population,12345);
 client.model.pendingMapOrderObject=null;client.model.uiSliderDrag=null;
 const member=client.model.allShips.find(s=>s.id===ship.id);client.model.showCourse(member);client.model.beginCourseEdit();home.name='Course save';await client.save();attach();assert.equal(client.model.pendingMapOrderObject.id,member.id);assert.equal(client.model.pendingCourseEdit.revision,client.model.pendingCourseEdit.object.course.revision);assert(client.model.issuePlayerWaypoint(client.model.pendingMapOrderObject,{x:member.x+100,y:member.y+100}));
 client.model.pendingCourseEdit=null;client.model.pendingMapOrderObject=null;client.model.showCourse(client.model.allShips.find(s=>s.id===ship.id));await client.flush();attach();assert.equal(client.model.uiWindow,'course');assert.equal(client.model.courseWindowObject.id,ship.id);
 // Revoked ownership and actual next turns must not retain invalid edits.
 home=client.model.stars.find(s=>s.id===star.id);client.model.beginRenameObject(home);host.editInitialState({action:'owner',star:star.id,value:2},1,1);await client.refresh();attach();assert.equal(client.model.renameTarget,null);assert.notEqual(client.model.uiWindow,'rename');
 client.model.uiWindow='settings';host.forceEndTurn(1);await client.refresh();assert.equal(client.model.turn,2);assert.equal(client.model.pendingMapOrderObject,null);assert.equal(client.model.renameTarget,null);
 console.log('PASS client interaction: in-flight rename/caret, unsubmitted text, fresh target/drag references, Course editor, revoked ownership and new-turn cancellation');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(client)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
