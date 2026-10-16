// Real authenticated two-player posting and uncertain-response retry checks.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),HTTP=require('../src/js/network-http.js'),Orders=require('../src/js/player-orders.js'),Save=require('../src/js/game-save.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-post-socket-'));let host;const clients=[];
const make=(url,options)=>{const c=new NetworkClient(url,options);clients.push(c);return c;};
const rejected=async(p,code)=>{let actual;try{await p;}catch(e){actual=e.code;}assert.equal(actual,code);};
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1},path.join(dir,'host.json'));
 for(let owner=1;owner<=2;owner++){const h=host.game.stars.find(s=>s.owner===owner),ship=host.game.factory.createShip(h.x,h.y,'scout',h,true);h.ships.push(ship);}
 host.persist();const address=await host.listen(),url='http://127.0.0.1:'+address.port,a=make(url),b=make(url);await a.connect({name:'First'});await b.connect({name:'Second'});
 const home=a.model.stars.find(s=>s.owner===1),courier=a.model.allShips.find(s=>s.owner===1);home.name='航行者';home.growth.desired=60;home.shipBuilding.desired=30;home.research.desired=10;
 const rz=a.model.createRendezvousAt(home.x+20000,home.y+10000,1,'集合');courier.course.replace(rz);courier.userCallIn=true;a.model.selectedObject=rz;
 const beforeHostTurn=host.game.turn,posting=a.post();assert.strictEqual(a.post(),posting);assert(!a.model.canHumanControl(home));await posting;
 assert.equal(a.model.turn,beforeHostTurn);assert(a.model.clientTurnPosted);assert(!a.model.canHumanControl(a.model.stars.find(s=>s.owner===1)));assert.equal(host.game.stars.find(s=>s.id===home.id).name,'航行者');assert.equal(a.model.selectedObject.name,'集合');assert.equal(a.model.selectedObject.id,host.game.allRendezvous.find(e=>e.name==='集合').id);
 await rejected(a.post(),'already_posted');await b.post();assert.equal(host.game.turn,beforeHostTurn+1);await a.refresh();assert.equal(a.model.turn,host.game.turn);assert(!a.model.clientTurnPosted);assert(a.model.canHumanControl(a.model.stars.find(s=>s.owner===1)));
 // If the server commits but the reply is lost, retry the same receipt/body.
 const normal=host.handle.bind(host);let drop=true;host.handle=(req,res)=>{
  if(req.url==='/orders' && drop){const originalEnd=res.end;res.end=function(...args){drop=false;res.destroy();};}
  normal(req,res);
 };
 const firstMarker=a.model.createRendezvousAt(-100,500,1,'First new point'),secondMarker=a.model.createRendezvousAt(-200,500,1,'Second new point');
 // Force a server permanent ID to overlap the next temporary ID. All remaps must capture identities before assignment.
 require('../src/js/rendezvous.js').nextId=firstMarker.id+1;a.model.selectedObject=firstMarker;
 const currentTurn=a.model.turn;await rejected(a.post(),'network_unreachable');assert(a.pendingPost);assert(a.model.clientPosting);assert.equal(host.game.players[1].lastTurnPosted,currentTurn);
 const receipt=a.pendingPost.postId,committed=Save.serialize(host.game);await a.post();assert.equal(Save.serialize(host.game),committed);assert.equal(host.game.config.networkHost.posts[1].postId,receipt);assert(a.model.clientTurnPosted);assert.equal(a.pendingPost,null);assert.equal(a.model.selectedObject.name,'First new point');assert.equal(a.model.allRendezvous.filter(e=>['First new point','Second new point'].includes(e.name)).length,2);host.handle=normal;
 await b.refresh();await b.post();assert.equal(host.game.turn,currentTurn+1);await a.refresh();
 // Malformed and unauthenticated uploads cannot mutate a live game.
 const request=Orders.snapshot(a.model,'d'.repeat(32));request.entities[0].techLevel=999;const before=Save.serialize(host.game);
 await rejected(HTTP.request(url,{path:'/orders',method:'POST',token:a.session.token,body:request}).promise,'bad_orders');assert.equal(Save.serialize(host.game),before);
 await rejected(HTTP.request(url,{path:'/orders',method:'POST',body:request}).promise,'not_logged_in');assert.equal(Save.serialize(host.game),before);
 // Reopening retains posted receipts, while old temporary credentials expire.
 const pending=Orders.snapshot(a.model,'e'.repeat(32));await HTTP.request(url,{path:'/orders',method:'POST',token:a.session.token,body:pending}).promise;
 await a.disconnect();await b.disconnect();await host.close();host=NetworkHost.open(path.join(dir,'host.json'));await host.listen({port:address.port});await a.rejoin('');assert(a.model.clientTurnPosted);
 const persisted=Save.serialize(host.game);await HTTP.request(url,{path:'/orders',method:'POST',token:a.session.token,body:pending}).promise;assert.equal(Save.serialize(host.game),persisted);
 console.log('PASS live two-player posting: owned orders, single flight, locks, ID remapping, authoritative resolution, dropped-response retry, forged/unauthenticated denial and durable reopen receipts');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{for(const c of clients)await c.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode || 0);});
