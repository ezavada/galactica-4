// Temporary localhost host used only by the browser transport regression.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),path=require('path');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.res.setLanguage(process.env.GALACTICA_TEST_LANGUAGE || 'en');pdg.srand(424242);
const {NetworkHost}=require('../src/js/network-host.js');let host;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,...(process.env.GALACTICA_TEST_TIMED?{maxTimePerTurn:172800,endEarly:false}:{})},process.env.GALACTICA_TEST_HOST_FILE);
 host.login.login({protocol:1,mode:'join',name:'First'});const home=host.game.stars.find(s=>s.owner===2),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);ship.name='Voyager';home.ships.push(ship);
 host.game.eventLog=[];host.game.overlay=null;host.game.overlayQueue=[];host.game.attention.queue=[];if(process.env.GALACTICA_TEST_TIMED){host.game.turn=2;host.clock.reset(host.game,false);host.clock.remainingMs=315000;host.clock.pause();}host.persist();
 const normal=host.handle.bind(host);host.handle=(req,res)=>{
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
