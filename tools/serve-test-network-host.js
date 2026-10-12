// Temporary localhost host used only by the browser transport regression.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),path=require('path');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.res.setLanguage(process.env.GALACTICA_TEST_LANGUAGE || 'en');pdg.srand(424242);
const {NetworkHost}=require('../src/js/network-host.js');let host,malformedInfo=false;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,...(process.env.GALACTICA_TEST_TIMED?{maxTimePerTurn:172800,endEarly:false}:{})},process.env.GALACTICA_TEST_HOST_FILE);
 host.login.login({protocol:1,mode:'join',name:'First'});if(process.env.GALACTICA_TEST_REQUIRE_CODE)host.updateAdmission({allowWithoutCode:false,allowed:['ALLOW'],banned:[]},host.game.config.networkHost.admissionRevision || 0);const home=host.game.stars.find(s=>s.owner===2),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);ship.name='Voyager';home.ships.push(ship);
 host.game.eventLog=[];host.game.overlay=null;host.game.overlayQueue=[];host.game.attention.queue=[];if(process.env.GALACTICA_TEST_TIMED){host.game.turn=2;host.clock.reset(host.game,false);host.clock.remainingMs=315000;host.clock.pause();}if(process.env.GALACTICA_TEST_REPORTS==='1'){
  host.game.recordCommissioningReports(ship,1);host.game.recordDiscoveryReports(home,1);
  const report=host.game.recordEvent(pdg.res.getString(602),Array(45).fill(pdg.res.getString(572)).join('\n'),{subject:home,recipient:2});report.repair={name:ship.name,fleet:false};
  const outcome=host.game.recordEvent(pdg.res.getString(614),'',{recipient:2});host.game.queueOutcome(outcome,'win',2);
  for(const event of host.game.eventLog)event.handled=true;host.game.clearEventPresentations();
 }
 host.persist();
 let dropOrdersResponse=false;const normal=host.handle.bind(host);host.handle=(req,res)=>{
  if(req.url==='/test/advance-turn' && process.env.GALACTICA_TEST_TURN_REFRESH==='1'){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{const value=JSON.parse(body);if(!Number.isSafeInteger(value.turn))throw Error('Invalid turn fixture');host.forceEndTurn(value.turn);res.writeHead(200,headers);res.end(JSON.stringify(host.info()));}catch(error){res.writeHead(400,headers);res.end('{}');}});return;
  }
  if(req.url==='/test/context-update' && process.env.GALACTICA_TEST_CONTEXT==='1'){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
   if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{const value=JSON.parse(body),star=host.game.stars.find(s=>s.id===value.star && s.owner===2);if(!star || value.population!==12345)throw Error('Invalid context fixture');host.editInitialState({action:'population',star:star.id,value:12345},host.game.config.networkHost.initialStateRevision || 0,1);host.editInitialState({action:'ship',star:star.id,value:'defense'},host.game.config.networkHost.initialStateRevision,1);res.writeHead(200,headers);res.end('{}');}catch(error){res.writeHead(400,headers);res.end('{}');}});return;
  }
  if(req.url==='/test/malformed-info' && process.env.GALACTICA_TEST_TIMED){if(req.method==='POST')malformedInfo=true;res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS'});res.end('{}');return;}
  if(req.url==='/info' && malformedInfo){malformedInfo=false;res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify({...host.info(),clock:{secondsRemaining:-1,paused:false,running:true}}));return;}
  if(req.url==='/test/drop-orders-response' && req.method==='POST'){dropOrdersResponse=true;res.writeHead(200,{'Access-Control-Allow-Origin':'*'});res.end('{}');return;}
  if(req.url==='/orders' && req.method==='POST' && dropOrdersResponse){dropOrdersResponse=false;const head=res.writeHead.bind(res),end=res.end.bind(res);res.writeHead=(status,...args)=>head(502,...args);res.end=()=>end(JSON.stringify({error:'network_http_error'}));}
  if(req.url==='/test/settings' && process.env.GALACTICA_TEST_TIMED){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
   if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{host.updateSettings(JSON.parse(body),host.game.config.networkHost.settingsRevision || 0);res.writeHead(200,headers);res.end(JSON.stringify(host.info()));}catch(error){res.writeHead(400,headers);res.end('{}');}});return;
  }
  if(req.url==='/test/clock' && process.env.GALACTICA_TEST_TIMED){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
   if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',()=>{try{
    const value=JSON.parse(body);if(!Number.isSafeInteger(value.seconds) || value.seconds<0 || value.seconds>172800 || typeof value.paused!=='boolean')throw Error('bad fixture clock');
    host.transact(()=>{host.clock.stop();host.clock.remainingMs=value.seconds*1000;host.clock.paused=value.paused;if(!value.paused)host.clock.start();});
    res.writeHead(200,headers);res.end(JSON.stringify(host.info()));
   }catch(error){res.writeHead(400,headers);res.end('{}');}});return;
  }
  if(req.url==='/test/advance'){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
   if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   host.transact(game=>game.endTurn());res.writeHead(200,headers);res.end(JSON.stringify({turn:host.game.turn}));return;
  }
  normal(req,res);
 };
 const address=await host.listen();fs.writeFileSync(process.env.GALACTICA_TEST_HOST_INFO,JSON.stringify({url:'http://127.0.0.1:'+address.port,gameId:host.info().gameId}));
})().catch(error=>{console.error(error.stack);process.exit(1);});
process.on('SIGTERM',async()=>{if(host){if(host.server && host.server.closeAllConnections)host.server.closeAllConnections();await host.close();}process.exit(0);});
