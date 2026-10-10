// Real socket validation under the same embedded Node/PDG runtime as the game.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),assert=require('assert');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {NetworkHost}=require('../src/js/network-host.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-host-socket-'));
let first,second;
function request(port,method,url){return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,method,path:url},res=>{let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(body),cache:res.headers['cache-control']}));});req.on('error',reject);req.end();});}
(async()=>{
 first=NetworkHost.create({numHumans:2,numComputers:1,gameTitle:'Network 星',maxTimePerTurn:3600,endEarly:false},path.join(directory,'first.gad4.json'));
 const address=await first.listen();const info=await request(address.port,'GET','/info');
 assert.equal(info.status,200);assert.equal(info.cache,'no-store');assert.equal(info.body.title,'Network 星');assert.equal(info.body.slots.length,2);assert.equal(info.body.maxTimePerTurn,3600);assert.equal(info.body.endEarly,false);assert(!('stars' in info.body));assert(!JSON.stringify(info.body).includes(directory));
 assert.equal((await request(address.port,'POST','/info')).status,405);assert.equal((await request(address.port,'GET','/state')).status,404);
 second=NetworkHost.create({numHumans:2,numComputers:0},path.join(directory,'second.gad4.json'));
 let collision=false;try{await second.listen({port:address.port});}catch(error){collision=error.code==='EADDRINUSE';}assert(collision);assert.equal(second.server,null);assert(fs.existsSync(second.file));
 await first.close();assert.equal(first.server,null);const resumed=NetworkHost.open(first.file);first=resumed;const next=await resumed.listen();assert.equal((await request(next.port,'GET','/info')).body.title,'Network 星');
 console.log('PASS native network host: real galaxy/document, HTTP information, mutation/private-path denial, port collision, close and reopen');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(first)await first.close();if(second)await second.close();fs.rmSync(directory,{recursive:true,force:true});process.exit(process.exitCode||0);});
