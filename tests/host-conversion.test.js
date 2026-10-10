const test=require('./test-framework.js'),Conversion=require('../src/js/host-conversion.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Host=require('../src/js/network-host.js').NetworkHost,Random=require('../src/js/simulation-random.js'),fs=require('fs'),os=require('os'),path=require('path');
function fixture(){
 const game=new Game(new Factory(),new Rules(true),new Config({numHumans:1,numComputers:2,sectorSize:1,density:1,skipMapGeneration:true,fastGame:true,gameTitle:'Local 星',maxTimePerTurn:90,endEarly:false}));
 for(let id=1;id<=3;id++){const star=game.factory.createStar(id*200000,id*180000,'Home '+id);star.owner=id;star.population=id*100000;star.techLevel=id;game.players[id].homeStarId=star.id;game.players[id].name='Player '+id;}
 const home=game.stars[0],ship=game.factory.createShip(home.x,home.y,'scout',home,true),fleet=game.factory.createFleet(home.x,home.y,1,'Fleet 星');fleet.addShip(ship);const point=game.factory.createRendezvous(600000,100000,1,'Meet 星');fleet.destination=point;home.newShipDestination=point;home.growth.desired=60;
 game.turn=8;game.selectedObject=fleet;game.tutorialRandom=Random.create(73);game.aiManager.setAISkillLevel(3,0);game.players[1].lastTurnPosted=8;return game;
}
function graph(game){return Save.encodeGraph({stars:game.stars,ships:game.allShips,fleets:game.allFleets,rendezvous:game.allRendezvous,events:game.eventLog,attention:game.attention.queue});}
function rejected(fn,code='invalid_conversion'){let actual;try{fn();}catch(error){actual=error.code;}test.assertEqual(actual,code);}
module.exports=()=>test.describe('Local saved-turn host conversion',()=>{
 test.it('preserves the exact galaxy/economy/object graph and original save without map generation',()=>{
  const source=fixture(),text=Save.serialize(source),converted=Conversion.prepare(text,2);test.assertEqual(Save.serialize(source),text);test.assertDeepEqual(graph(converted),graph(source));test.assertEqual(converted.turn,8);test.assertEqual(converted.selectedObject,converted.allFleets[0]);test.assertEqual(converted.allFleets[0].ships[0].fleet,converted.allFleets[0]);test.assertEqual(converted.allFleets[0].destination,converted.allRendezvous[0]);test.assertEqual(converted.stars[0].newShipDestination,converted.allRendezvous[0]);test.assertFalse(converted.stars[0]===source.stars[0]);test.assertDeepEqual(converted.tutorialRandom,source.tutorialRandom);
 });
 test.it('assigns the first N players to human control and rebuilds only the remaining AI managers',()=>{
  const text=Save.serialize(fixture());for(const count of [1,2,3]){const g=Conversion.prepare(text,count);test.assertEqual(g.config.numHumans,count);test.assertEqual(g.config.numComputers,3-count);test.assertEqual(g.config.totalPlayers,3);test.assertDeepEqual([...g.aiManager.aiPlayers.keys()],Array.from({length:3-count},(_,i)=>i+count+1));for(let id=1;id<=3;id++){test.assertEqual(g.players[id].isHuman,id<=count);test.assertEqual(g.players[id].isComputer,id>count);test.assertFalse(g.players[id].isLoggedIn);test.assertEqual(g.players[id].lastTurnPosted,0);}if(count<3)test.assertEqual(g.aiManager.getAIPlayer(3).skillManager.getSkillLevel(),0);}
 });
 test.it('uses unlimited hosted turns while retaining original rules and setup values',()=>{
  const source=fixture();source.config.autoplay.enabled=true;const g=Conversion.prepare(Save.serialize(source),2);test.assertTrue(g.config.hosting);test.assertFalse(g.config.skipMapGeneration);test.assertFalse(g.config.autoplay.enabled);test.assertEqual(g.config.maxTimePerTurn,0);test.assertTrue(g.config.endEarly);for(const key of ['gameTitle','fastGame','omniscient','density','sectorSize','compSkill','compAdvantage'])test.assertEqual(g.config[key],source.config[key]);test.assertTrue(g.rules.isFast);test.assertEqual(g.config.networkHost,undefined);
 });
 test.it('rejects invalid human counts and existing hosts without changing the source',()=>{
  const source=fixture(),text=Save.serialize(source);for(const count of [0,4,100,1.5,'2',null])rejected(()=>Conversion.prepare(text,count));test.assertEqual(Save.serialize(source),text);source.config.hosting=true;rejected(()=>Conversion.prepare(Save.serialize(source),2));source.config.hosting=false;source.config.networkHost={};rejected(()=>Conversion.prepare(Save.serialize(source),2));
 });
 test.it('retains completed-game outcome and turn rather than restarting a finished save',()=>{
  const source=fixture();source.isGameOver=true;source.winningPlayerNum=1;source.victoryTurn=8;const g=Conversion.prepare(Save.serialize(source),3);test.assertTrue(g.isGameOver);test.assertEqual(g.winningPlayerNum,1);test.assertEqual(g.victoryTurn,8);test.assertEqual(g.turn,8);
 });
 test.it('publishes a separate durable host with fresh identity and open slots, preserving original bytes',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-convert-'));try{const source=path.join(dir,'local.json'),target=path.join(dir,'host.json'),text=Save.serialize(fixture());fs.writeFileSync(source,text);let offer;try{Host.open(source);}catch(error){offer=error;}test.assertEqual(offer.code,'local_turn_file');test.assertEqual(offer.sourceText,text);test.assertEqual(offer.local.totalPlayers,3);const host=Host.fromLocal(text,2,target);test.assertEqual(host.info().turn,8);test.assertDeepEqual(host.info().slots,[{player:1,status:'open'},{player:2,status:'open'}]);test.assertEqual(host.info().clock.secondsRemaining,null);test.assertTrue(/^[0-9a-f]{64}$/.test(host.info().gameId));test.assertEqual(Host.open(target).info().gameId,host.info().gameId);test.assertEqual(fs.readFileSync(source,'utf8'),text);test.assertDeepEqual(graph(host.game),graph(Save.restore(text)));}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 test.it('refuses existing destinations and leaves no partial host after interrupted writes',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-convert-'));try{const text=Save.serialize(fixture()),target=path.join(dir,'existing.json');fs.writeFileSync(target,text);rejected(()=>Host.fromLocal(text,2,target),'EEXIST');test.assertEqual(fs.readFileSync(target,'utf8'),text);const failed=path.join(dir,'failed.json'),broken={...fs,writeFileSync:(name,text,options)=>{fs.writeFileSync(name,text.slice(0,20),options);const error=new Error('write failed');error.code='EIO';throw error;}};rejected(()=>Host.fromLocal(text,2,failed,broken),'EIO');test.assertFalse(fs.existsSync(failed));test.assertDeepEqual(fs.readdirSync(dir),['existing.json']);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
});
