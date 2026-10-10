// Real socket validation under the same embedded Node/PDG runtime as the game.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),assert=require('assert');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-host-socket-'));
let first,second;
function request(port,method,url,body,token,split=false){return new Promise((resolve,reject)=>{
 const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;
 const req=http.request({host:'127.0.0.1',port,method,path:url,headers},res=>{let text='';res.setEncoding('utf8');res.on('data',part=>text+=part);res.on('end',()=>resolve({status:res.statusCode,body:text?JSON.parse(text):null,cache:res.headers['cache-control'],cors:res.headers['access-control-allow-origin']}));});req.on('error',reject);
 if(body!==undefined){const bytes=Buffer.from(typeof body==='string'?body:JSON.stringify(body));if(split){const cut=bytes.indexOf(Buffer.from('星'))+1;req.write(bytes.subarray(0,cut));req.write(bytes.subarray(cut));}else req.write(bytes);}req.end();
 });}

(async()=>{
 first=NetworkHost.create({numHumans:2,numComputers:1,gameTitle:'Network 星',maxTimePerTurn:3600,endEarly:false},path.join(directory,'first.gad4.json'));
 const address=await first.listen();const info=await request(address.port,'GET','/info');
 assert.equal(info.status,200);assert.equal(info.cache,'no-store');assert.equal(info.body.title,'Network 星');assert.equal(info.body.slots.length,2);assert.equal(info.body.maxTimePerTurn,3600);assert.equal(info.body.endEarly,false);assert(!('stars' in info.body));assert(!JSON.stringify(info.body).includes(directory));
 assert.equal((await request(address.port,'POST','/info')).status,405);assert.equal((await request(address.port,'GET','/state')).status,401);
 assert.equal((await request(address.port,'OPTIONS','/login')).status,204);
 const login=await request(address.port,'POST','/login',{protocol:1,mode:'join',name:'Voyager 星',password:'秘密 Д'},null,true);
 assert.equal(login.status,200);assert.equal(login.body.player,1);assert.equal(login.body.name,'Voyager 星');assert.equal(login.cors,'*');
 const state=await request(address.port,'GET','/state',undefined,login.body.token);assert.equal(state.status,200);assert.equal(state.body.viewer,1);assert.equal(state.body.privatePlayer.playerNum,1);assert.equal(state.cache,'no-store');assert(!JSON.stringify(state.body).includes('秘密'));assert(!JSON.stringify(state.body).includes(login.body.token));
 const token=login.body.token,gameId=login.body.gameId;assert.equal((await request(address.port,'GET','/session',undefined,token)).body.player,1);
 assert.equal((await request(address.port,'GET','/session',undefined,'invalid')).status,401);
 assert.equal((await request(address.port,'POST','/login',{protocol:2,mode:'join',name:'Other'})).status,400);
 assert.equal((await request(address.port,'POST','/login','{')).status,400);
 assert.equal((await request(address.port,'POST','/login','x'.repeat(9000))).status,413);
 assert.equal((await request(address.port,'POST','/login',{protocol:1,mode:'join',name:'Voyager 星'})).body.error,'duplicate_name');
 assert.equal((await request(address.port,'POST','/login',{protocol:1,mode:'rejoin',name:'Voyager 星',password:'wrong'})).status,401);
 const replacement=await request(address.port,'POST','/login',{protocol:1,mode:'rejoin',name:'Voyager 星',password:'秘密 Д',gameId});
 assert.equal(replacement.status,200);assert.notEqual(replacement.body.token,token);assert.equal((await request(address.port,'GET','/session',undefined,token)).status,401);
 assert.equal((await request(address.port,'POST','/logout',undefined,replacement.body.token)).status,200);
 const visitor=await request(address.port,'POST','/login',{protocol:1,mode:'join',name:'Visitor'});assert.equal(visitor.body.player,2);
 assert.equal((await request(address.port,'POST','/login',{protocol:1,mode:'join',name:'Third'})).body.error,'game_full');
 const visitorState=await request(address.port,'GET','/state',undefined,visitor.body.token);assert.equal(visitorState.status,200);assert.equal(visitorState.body.viewer,2);assert.equal(visitorState.body.privatePlayer.playerNum,2);assert.equal((await request(address.port,'GET','/state?viewer=1',undefined,visitor.body.token)).status,404);assert.equal((await request(address.port,'GET','/state',undefined,token)).status,401);
 const publicInfo=(await request(address.port,'GET','/info')).body;assert.equal(publicInfo.slots[0].name,'Voyager 星');assert.equal(publicInfo.slots[0].online,false);assert.equal(publicInfo.slots[1].online,true);assert(!JSON.stringify(publicInfo).includes(visitor.body.token));assert(!JSON.stringify(publicInfo).includes('秘密'));

 second=NetworkHost.create({numHumans:2,numComputers:0},path.join(directory,'second.gad4.json'));
 let collision=false;try{await second.listen({port:address.port});}catch(error){collision=error.code==='EADDRINUSE';}assert(collision);assert.equal(second.server,null);assert(fs.existsSync(second.file));
 await first.close();assert.equal(first.server,null);const resumed=NetworkHost.open(first.file);first=resumed;const next=await resumed.listen();assert.equal((await request(next.port,'GET','/info')).body.title,'Network 星');
 assert.equal((await request(next.port,'GET','/session',undefined,visitor.body.token)).status,401);
 const resumedLogin=await request(next.port,'POST','/login',{protocol:1,mode:'rejoin',name:'Voyager 星',password:'秘密 Д',gameId});assert.equal(resumedLogin.status,200);assert.equal(resumedLogin.body.player,1);
 console.log('PASS native network host: real galaxy/document, HTTP information and authenticated player states, mutation/private-path denial, Unicode login, duplicate/full/password/protocol checks, token replacement/logout, request bounds, port collision, durable rejoin');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(first)await first.close();if(second)await second.close();fs.rmSync(directory,{recursive:true,force:true});process.exit(process.exitCode||0);});
