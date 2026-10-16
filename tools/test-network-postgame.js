// Actual authenticated HTTP post-game turns; automation remains muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),{NetworkAdminClient}=require('../src/js/network-admin-client.js'),HTTP=require('../src/js/network-http.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-postgame-http-'));let host;const clients=[];
const rejected=async(p,code)=>{let actual;try{await p;}catch(e){actual=e.code;}assert.equal(actual,code);};
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,maxTimePerTurn:10,endEarly:true,adminPassword:'Postgame admin'},path.join(dir,'host.json'));
 const address=await host.listen(),url='http://127.0.0.1:'+address.port,a=new NetworkClient(url),b=new NetworkClient(url),admin=new NetworkAdminClient(url);clients.push(a,b,admin);await a.connect({name:'Champion'});await b.connect({name:'Opponent'});await admin.connect({password:'Postgame admin'});
 host.pauseClock();host.game.turn=7;for(const star of host.game.stars){if(star.owner===2)star.owner=0;star.currentShip=null;}host.forceEndTurn(7);
 await a.refresh();await admin.refresh();assert(a.model.canAdvanceTurns());assert.equal(a.model.victoryTurn,7);assert(admin.administration.administration.canContinue);assert.equal(a.model.turn,8);
 await rejected(HTTP.request(url,{path:'/admin/action',method:'POST',token:a.session.token,body:{action:'end',turn:8}}).promise,'not_logged_in');
 await admin.act({action:'resume'});const normal=host.handle.bind(host);let drop=true;host.handle=(req,res)=>{if(req.url==='/orders' && drop)res.end=()=>{drop=false;res.destroy();};normal(req,res);};
 a.model.stars.find(s=>s.owner===1).name='Postgame 星';await rejected(a.post(),'network_unreachable');assert.equal(host.game.turn,9);await a.post();assert.equal(host.game.turn,9);assert.equal(a.model.turn,9);assert(a.model.postGame);assert.equal(a.model.winningPlayerNum,1);assert.equal(a.model.victoryTurn,7);host.handle=normal;
 await admin.refresh();await admin.act({action:'pause'});assert(host.clock.paused);await admin.act({action:'end',turn:9});assert.equal(host.game.turn,10);assert.equal(host.game.victoryTurn,7);
 const service=require('../src/js/host-games.js').createService(),record={host,address:url};service.records.push(record);await service.turnControl(record,'end',10);assert.equal(host.game.turn,11);service.records.length=0;
 await a.refresh();assert.equal(a.model.turn,11);assert(a.model.postGame);assert.equal(a.model.stars.find(s=>s.owner===1).name,'Postgame 星');
 for(const client of clients)await client.disconnect();await host.close();host=NetworkHost.open(path.join(dir,'host.json'));await host.listen({port:address.port});await a.rejoin('');await admin.rejoin('Postgame admin');assert.equal(a.model.turn,11);assert(a.model.postGame);assert.equal(a.model.victoryTurn,7);assert(admin.administration.administration.canContinue);
 console.log('PASS real HTTP post-game victory, player orders, lost-response retry, authenticated administration, persistent result and rejoin');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{for(const client of clients)await client.disconnect();if(host)await host.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode || 0);});
