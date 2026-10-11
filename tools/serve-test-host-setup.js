// Test-only localhost adapter for exercising the shared UI with real desktop hosts.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),path=require('path'),http=require('http');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.res.setLanguage(process.env.GALACTICA_TEST_LANGUAGE || 'en');pdg.srand(424242);
const discoveryOptions={interfaceAddress:'127.0.0.1',...(process.env.GALACTICA_TEST_DISCOVERY_PORT?{port:Number(process.env.GALACTICA_TEST_DISCOVERY_PORT)}:{})};
const service=require('../src/js/host-games.js').createService({discoveryOptions}),directory=path.dirname(process.env.GALACTICA_TEST_HOST_INFO);
const server=http.createServer((req,res)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 if(req.url==='/info'){res.writeHead(200,headers);res.end(JSON.stringify(service.records.map(service.describe)));return;}
 let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',async()=>{try{
  const input=JSON.parse(body),record=service.records.find(r=>service.describe(r).id===input.id);let result;
  if(req.url==='/discover'){
   const LAN=require('../src/js/network-discovery.js');let rows=[];const scan=LAN.browse({...discoveryOptions,interval:250,expiry:800,onChange:value=>rows=value});try{await scan.ready;await new Promise(resolve=>setTimeout(resolve,550));result=rows;}finally{scan.close();}
  }else if(req.url==='/prepare-local'){
   const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Save=require('../src/js/game-save.js');
   if(path.basename(input.file)!==input.file)throw Error('Fixture filename must be a basename');
   const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:2,sectorSize:1,density:1,gameTitle:'Saved '+input.language+' 星'}));game.endTurn();const text=Save.serialize(game);fs.writeFileSync(path.join(directory,input.file),text);result={turn:game.turn,totalPlayers:game.config.totalPlayers,title:game.config.gameTitle,text};
  }else if(req.url==='/source-info'){
   if(path.basename(input.file)!==input.file)throw Error('Fixture filename must be a basename');result={text:fs.readFileSync(path.join(directory,input.file),'utf8')};
  }else if(req.url==='/convert'){
   if(path.basename(input.file)!==input.file)throw Error('Fixture filename must be a basename');result=service.describe(await service.convert(input.token,path.join(directory,input.file),input.numHumans,input.listen));
  }else if(req.url==='/discard-conversion'){result=service.discardConversion(input.token);
  }else if(req.url==='/create'){
   if(path.basename(input.file)!==input.file)throw Error('Fixture filename must be a basename');
   result=service.describe(await service.create(input.options,path.join(directory,input.file),input.listen));
  }else if(req.url==='/open'){
   if(path.basename(input.file)!==input.file)throw Error('Fixture filename must be a basename');
   result=service.describe(await service.open(path.join(directory,input.file),input.listen));
  }else if(req.url==='/postgame-victory' && record){
   const host=record.host;host.pauseClock();host.game.turn=7;for(const star of host.game.stars){if(star.owner===2)star.owner=0;star.currentShip=null;}host.forceEndTurn(7);if(!host.game.isGameOver || host.game.winningPlayerNum!==1)throw Error('Fixture victory failed');result=service.describe(record);
  }else if(req.url==='/turn-control' && record)result=service.describe(await service.turnControl(record,input.action,input.turn));
  else if(req.url==='/initial-state' && record)result=service.describe(await service.editInitialState(record,input.change,input.revision,input.turn));
  else if(req.url==='/player' && record)result=service.describe(await service.changePlayer(record,input.change,input.revision,input.turn));
  else if(req.url==='/admin-sessions' && record)result={count:record.host.admin.sessions.size};
  else if(req.url==='/admin-password' && record){await service.setAdminPassword(record,input.password,input.revision===undefined?record.host.admin.revision():input.revision);result=service.describe(record);}
  else if(req.url==='/admission' && record)result=service.describe(await service.updateAdmission(record,input.policy,input.revision));
  else if(req.url==='/settings' && record)result=service.describe(await service.updateSettings(record,input.settings,input.revision));
  else if(req.url==='/retry' && record)result=service.describe(await service.retry(record,input.port));
  else if(req.url==='/fail-stop' && record){const original=record.host.persist;let once=true;record.host.persist=function(){if(once){once=false;throw Error('test save failure');}return original.call(this);};result=true;}
  else if(req.url==='/stop' && record){await service.stop(record);result=true;}
  else throw Error('Unknown fixture request');
  res.writeHead(200,headers);res.end(JSON.stringify(result));
 }catch(error){if(req.url==='/stop')console.error('Host fixture stop failure:',error.stack || error);res.writeHead(400,headers);res.end(JSON.stringify({code:error.code || 'host_save_failed',...(error.record?{record:service.describe(error.record)}:{}),...(error.conversion?{conversion:{...error.conversion,suggestedFile:path.basename(error.conversion.suggestedFile)}}:{})}));}});
});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(process.env.GALACTICA_TEST_HOST_INFO,JSON.stringify({url:'http://127.0.0.1:'+server.address().port})));
process.on('SIGTERM',async()=>{try{await service.closeAll();}finally{server.close();process.exit(0);}});
