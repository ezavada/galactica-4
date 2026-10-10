// Temporary localhost host used only by the browser transport regression.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),path=require('path');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.res.setLanguage(process.env.GALACTICA_TEST_LANGUAGE || 'en');pdg.srand(424242);
const {NetworkHost}=require('../src/js/network-host.js');let host;
(async()=>{
 host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1},process.env.GALACTICA_TEST_HOST_FILE);
 host.login.login({protocol:1,mode:'join',name:'First'});const home=host.game.stars.find(s=>s.owner===2),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);ship.name='Voyager';home.ships.push(ship);
 host.game.eventLog=[];host.game.overlay=null;host.game.overlayQueue=[];host.game.attention.queue=[];host.persist();
 const normal=host.handle.bind(host);host.handle=(req,res)=>{
  if(req.url==='/test/advance'){
   const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS'};
   if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
   if(req.method!=='POST'){res.writeHead(405,headers);res.end('{}');return;}
   host.game.endTurn();host.persist();res.writeHead(200,headers);res.end(JSON.stringify({turn:host.game.turn}));return;
  }
  normal(req,res);
 };
 const address=await host.listen();fs.writeFileSync(process.env.GALACTICA_TEST_HOST_INFO,JSON.stringify({url:'http://127.0.0.1:'+address.port,gameId:host.info().gameId}));
})().catch(error=>{console.error(error.stack);process.exit(1);});
process.on('SIGTERM',async()=>{if(host){if(host.server && host.server.closeAllConnections)host.server.closeAllConnections();await host.close();}process.exit(0);});
