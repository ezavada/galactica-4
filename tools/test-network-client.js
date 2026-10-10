// Real HTTP transport checks in the embedded Node/PDG runtime, not async
// assertions in the synchronous unit-test framework.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),http=require('http');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js'),{NetworkClient}=require('../src/js/network-client.js'),HTTP=require('../src/js/network-http.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-socket-'));let host,fake;
const clients=[];const make=(address,options)=>{const c=new NetworkClient(address,options);clients.push(c);return c;};
const reject=async(promise,code)=>{let actual;try{await promise;}catch(error){actual=error.code;}assert.equal(actual,code);};
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1},path.join(dir,'host.json'));const address=await host.listen(),url='http://127.0.0.1:'+address.port;
 const a=make(url),b=make(url);assert.equal((await a.inspect()).humans,2);
 await a.connect({name:'Voyager 星',password:'秘密 Д'});assert.equal(a.model.getCurrentHumanPlayer(),1);assert(a.connected);assert(!JSON.stringify(a.descriptor()).includes(a.session.token));assert(!JSON.stringify(a.descriptor()).includes('秘密'));
 const home=a.model.stars.find(s=>s.owner===1);home.name='Local rename';home.growth.desired=90;a.model.selectedObject=home;a.model.savedCamera={zoom:1.5,panX:123,panY:456};a.model.showEnemyEvents=false;
 await b.connect({name:'Second'});const original=a.model;assert.equal(await a.refresh(),original);assert.equal(a.model.stars.find(s=>s.id===home.id).name,'Local rename');assert.equal(home.growth.desired,90);assert.equal(a.model.players[2].name,'Second');assert.notEqual(host.game.stars.find(s=>s.id===home.id).name,home.name);
 const concurrent=a.refresh();assert.equal(a.refresh(),concurrent);await concurrent;
 const token=a.session.token;const replacement=make(url);await replacement.connect({name:'Voyager 星',password:'秘密 Д',mode:'rejoin',gameId:a.identity.gameId});await reject(a.refresh(),'not_logged_in');assert.equal(a.model,original);assert.equal(a.session,null);
 await reject(a.rejoin('wrong'),'bad_password');await a.rejoin('秘密 Д');assert.equal(a.model,original);assert.notEqual(a.session.token,token);await reject(replacement.refresh(),'not_logged_in');
 host.transact(game=>game.endTurn());await a.refresh();assert.equal(a.model.turn,host.game.turn);assert.notEqual(a.model,original);assert.equal(a.model.selectedObject.id,home.id);assert.deepEqual(a.model.savedCamera,{zoom:1.5,panX:123,panY:456});assert.equal(a.model.showEnemyEvents,false);
 const stateBefore=a.model;host.game.turn--;await reject(a.refresh(),'stale_server_state');assert.equal(a.model,stateBefore);host.game.turn++;
 await a.disconnect();assert(!a.connected);assert.equal(a.model,null);assert.equal(host.info().slots[0].online,false);await a.rejoin('秘密 Д');assert(a.connected);
 const id=a.identity.gameId;await reject(make(url).connect({name:'Third',gameId:'c'.repeat(64)}),'wrong_game');
 await a.disconnect();await b.disconnect();await host.close();host=NetworkHost.open(host.file);const resumed=await host.listen({port:address.port});assert.equal(resumed.port,address.port);await a.rejoin('秘密 Д');assert.equal(a.identity.gameId,id);
 await a.disconnect();const normal=host.handle.bind(host);let failState=true;
 host.handle=(req,res)=>{if(failState && req.url==='/state'){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'host_state_failed'}));return;}normal(req,res);};
 const partial=make(url);await reject(partial.connect({name:'Voyager 星',password:'秘密 Д',mode:'rejoin',gameId:id}),'host_state_failed');assert.equal(partial.descriptor().gameId,id);assert.equal(host.info().slots[0].online,false);
 failState=false;await partial.rejoin('秘密 Д');assert(partial.connected);await partial.disconnect();
 let releaseState;const receivedState=new Promise(resolve=>releaseState=resolve);
 host.handle=(req,res)=>{if(req.url==='/state'){releaseState(res);return;}normal(req,res);};
 const cancelled=make(url),attemptState=cancelled.connect({name:'Voyager 星',password:'秘密 Д',mode:'rejoin',gameId:id});const blocked=await receivedState;await cancelled.disconnect();await reject(attemptState,'network_cancelled');blocked.destroy();assert.equal(cancelled.model,null);assert.equal(cancelled.status,'idle');assert.equal(host.info().slots[0].online,false);host.handle=normal;
 for(const [code,name,password] of [['en','Voyager'],['de','Jäger','größer'],['es','Exploración','contraseña'],['fr','Éclaireur','accès'],['ja','航行者','秘密'],['ru','Разведчик','пароль']]){
  pdg.res.setLanguage(code);const sample=NetworkHost.create({numHumans:1,numComputers:1},path.join(dir,code+'.json'));const bound=await sample.listen();const client=make('http://127.0.0.1:'+bound.port);
  await client.connect({name,password});await client.rejoin(password);assert.equal(client.model.players[1].name,name);await client.disconnect();await sample.close();
 }
 let mode='timeout',redirectHits=0;
 fake=http.createServer((req,res)=>{if(mode==='timeout')return;if(mode==='redirect'){res.writeHead(302,{Location:url+'/session'});res.end('{}');return;}if(mode==='huge'){res.end('x'.repeat(100));return;}if(mode==='bad'){res.end('{');return;}redirectHits++;res.end('{}');});
 await new Promise(resolve=>fake.listen(0,'127.0.0.1',resolve));const fakeUrl='http://127.0.0.1:'+fake.address().port;
 await reject(make(fakeUrl,{timeout:20}).inspect(),'network_timeout');
 mode='redirect';await reject(HTTP.request(fakeUrl,{path:'/state',token:'sensitive',timeout:1000}).promise,'network_http_error');assert.equal(redirectHits,0);
 mode='huge';await reject(HTTP.request(fakeUrl,{path:'/info',limit:16,timeout:1000}).promise,'network_response_too_large');mode='bad';await reject(make(fakeUrl).inspect(),'network_bad_response');
 mode='timeout';const pending=make(fakeUrl,{timeout:1000}),attempt=pending.connect({name:'Cancel'});await pending.disconnect();await reject(attempt,'network_cancelled');assert.equal(pending.model,null);assert.equal(pending.status,'idle');
 console.log('PASS live native client: HTTP join/state, two identities, same-turn orders, public updates, single-flight refresh, token replacement, password/rejoin, host reopening, new-turn presentation, stale state, six languages, timeout, malformed/oversize response, redirect denial and cancellation');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{for(const client of clients)await client.disconnect();if(host)await host.close();if(fake)await new Promise(resolve=>fake.close(resolve));fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
