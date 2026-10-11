const test=require('./test-framework.js'),fs=require('fs'),os=require('os'),path=require('path');
const Host=require('../src/js/network-host.js').NetworkHost,Players=require('../src/js/host-players.js'),Save=require('../src/js/game-save.js'),State=require('../src/js/client-state.js'),Client=require('../src/js/network-client.js');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-players-'));try{const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1},path.join(dir,'host.json'));fn(host);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
const login=(host,name='First',password='secret',mode='join')=>host.login.login({protocol:1,mode,name,password});
const change=(host,value)=>host.changePlayer(value,Players.revision(host.game),host.game.turn);
function rejects(fn,code){let actual;try{fn();}catch(e){actual=e.code || e.message;}test.assertEqual(actual,code);}
module.exports=()=>test.describe('Active host player roles and identity',()=>{
 test.it('converts a nonfirst AI slot into an open human slot without moving IDs, homeworlds or claims',()=>fixture(host=>{
  const session=login(host),stars=host.game.stars.map(s=>[s.id,s.owner,s.x,s.y]),home=host.game.players[3].homeStarId;
  change(host,{action:'human',player:3});test.assertDeepEqual(host.game.config.getHumanPlayerSlots(),[1,2,3]);test.assertEqual(host.game.config.numHumans,3);test.assertFalse(host.game.players[3].isComputer);test.assertTrue(host.game.players[3].isHuman);test.assertFalse(host.game.aiManager.isAIPlayer(3));test.assertEqual(host.game.players[3].homeStarId,home);test.assertDeepEqual(host.game.stars.map(s=>[s.id,s.owner,s.x,s.y]),stars);test.assertEqual(host.login.authenticate(session.token).player,1);
  login(host,'Second');const third=login(host,'Third');test.assertEqual(third.player,3);const client=State.restore(host.playerState(3));test.assertEqual(client.getCurrentHumanPlayer(),3);test.assertTrue(client.canHumanControl(client.stars.find(s=>s.owner===3)));
 }));
 test.it('converts a human to AI without renumbering another live human or its password',()=>fixture(host=>{
  const first=login(host),second=login(host,'Second','password'),owner2=host.game.stars.find(s=>s.owner===2).id;
  change(host,{action:'computer',player:1,name:'Robot 星'});test.assertDeepEqual(host.game.config.getHumanPlayerSlots(),[2]);test.assertEqual(host.game.config.numComputers,2);test.assertTrue(host.game.aiManager.isAIPlayer(1));test.assertEqual(host.game.players[1].name,'Robot 星');rejects(()=>host.login.authenticate(first.token),'not_logged_in');test.assertEqual(host.login.authenticate(second.token).player,2);test.assertTrue(host.game.players[2].isLoggedIn);
  const info=Client.validateInfo(host.info());test.assertEqual(info.slots[0].player,2);const accepted=login(host,'Second','password','rejoin');test.assertEqual(Client.validateLogin(accepted,info,'Second').player,2);
  const restored=Host.open(host.file);test.assertEqual(login(restored,'Second','password','rejoin').player,2);test.assertTrue(restored.game.aiManager.isAIPlayer(1));test.assertFalse(restored.game.aiManager.isAIPlayer(2));test.assertEqual(restored.game.stars.find(s=>s.id===owner2).owner,2);const client=State.restore(restored.playerState(2));test.assertTrue(client.canHumanControl(client.stars.find(s=>s.id===owner2)));
 }));
 test.it('renames assigned humans durably with the same password and revokes their old connection',()=>fixture(host=>{
  const session=login(host),claim=host.game.config.networkHost.players[0];change(host,{action:'rename',player:1,name:'Renamed 船'});test.assertEqual(host.game.config.networkHost.players[0].hash,claim.hash);test.assertEqual(host.game.config.networkHost.players[0].salt,claim.salt);rejects(()=>host.login.authenticate(session.token),'not_logged_in');rejects(()=>login(host,'First','secret','rejoin'),'player_not_found');test.assertEqual(login(Host.open(host.file),'Renamed 船','secret','rejoin').player,1);
 }));
 test.it('frees a claimed slot and removes credentials/posted receipts while leaving its territory available to a replacement',()=>fixture(host=>{
  const session=login(host),home=host.game.stars.find(s=>s.owner===1),client=State.restore(host.playerState(1));host.postOrders(1,require('../src/js/player-orders.js').snapshot(client,'a'.repeat(32)));test.assertEqual(host.game.players[1].lastTurnPosted,1);
  change(host,{action:'remove',player:1});rejects(()=>host.login.authenticate(session.token),'not_logged_in');test.assertEqual(host.info().slots[0].status,'open');test.assertEqual(host.game.players[1].lastTurnPosted,0);test.assertFalse(!!host.game.config.networkHost.posts[1]);test.assertEqual(host.game.stars.find(s=>s.id===home.id).owner,1);test.assertEqual(login(host,'Replacement','new').player,1);rejects(()=>login(host,'First','secret','rejoin'),'player_not_found');
 }));
 test.it('renames AIs without changing control, territory or future skill',()=>fixture(host=>{
  const skill=host.game.aiManager.getAIPlayer(3).skillManager.getSkillLevel();change(host,{action:'rename',player:3,name:'Robot renamed'});test.assertTrue(host.game.aiManager.isAIPlayer(3));test.assertEqual(host.game.aiManager.getAIPlayer(3).skillManager.getSkillLevel(),skill);test.assertEqual(Host.open(host.file).game.players[3].name,'Robot renamed');
 }));
 test.it('neutralizes every entity owned by an eliminated player and lets turn processing report its defeat',()=>fixture(host=>{
  const home=host.game.stars.find(s=>s.owner===2),ship=host.game.factory.createShip(home.x,home.y,'scout',home,true);home.ships.push(ship);const fleet=host.game.factory.createFleet(ship.x,ship.y,2,'Fleet');fleet.star=home;fleet.addShip(ship);host.game.createRendezvousAt(home.x,home.y,2,'Point');const first=host.game.stars.find(s=>s.owner===1).id;
  change(host,{action:'kill',player:2});for(const list of [host.game.stars,host.game.allShips,host.game.allFleets,host.game.allRendezvous])test.assertFalse(list.some(e=>e.owner===2));test.assertEqual(host.game.stars.find(s=>s.id===first).owner,1);test.assertTrue(host.game.players[2].isAlive);host.forceEndTurn(1);test.assertFalse(host.game.players[2].isAlive);
 }));
 test.it('same-turn elimination refresh does not restore owned draft units or allocations to a player',()=>fixture(host=>{
  const client=new Client.NetworkClient('localhost:7777'),old=client.install(State.restore(host.playerState(1))),home=old.stars.find(s=>s.owner===1);home.name='Draft';home.growth.desired=50;old.createRendezvousAt(home.x,home.y,1,'Unposted marker');
  change(host,{action:'kill',player:1});const fresh=client.install(State.restore(host.playerState(1)));test.assertFalse(fresh===old);test.assertFalse(fresh.stars.some(s=>s.owner===1));test.assertFalse(fresh.stars.includes(home));test.assertFalse(fresh.allRendezvous.some(r=>r.owner===1));test.assertFalse(fresh.canHumanControl(fresh.stars.find(s=>s.id===home.id)));
 }));
 test.it('keeps unaffected pending orders when another player changes role',()=>fixture(host=>{
  const client=new Client.NetworkClient('localhost:7777'),old=client.install(State.restore(host.playerState(1))),home=old.stars.find(s=>s.owner===1);home.name='Draft kept';change(host,{action:'human',player:3});const fresh=client.install(State.restore(host.playerState(1)));test.assertFalse(fresh===old);test.assertTrue(fresh.stars.includes(home));test.assertEqual(home.name,'Draft kept');test.assertFalse(fresh.players[3].isComputer);
 }));
 test.it('requires a current player revision and turn, including changes caused by new claims',()=>fixture(host=>{
  const old=Players.revision(host.game);login(host);rejects(()=>host.changePlayer({action:'human',player:3},old,1),'stale_host_player');rejects(()=>host.changePlayer({action:'human',player:3},Players.revision(host.game),2),'stale_host_player');test.assertTrue(host.game.players[3].isComputer);host.game.markGameWon(1);change(host,{action:'human',player:3});test.assertFalse(host.game.players[3].isComputer);test.assertEqual(host.game.winningPlayerNum,1);
 }));
 test.it('rolls back role/AI/claim/revision changes and keeps live sessions on failed durable writes',()=>fixture(host=>{
  const session=login(host),second=login(host,'Second'),before=Save.serialize(host.game),saved=fs.readFileSync(host.file,'utf8'),original=host.fs;host.fs={...fs,writeFileSync:()=>{throw Error('disk full');}};
  for(const value of [{action:'computer',player:1,name:'Robot'},{action:'rename',player:1,name:'Changed'},{action:'remove',player:1},{action:'kill',player:1},{action:'human',player:3}]){rejects(()=>change(host,value),'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertEqual(fs.readFileSync(host.file,'utf8'),saved);test.assertEqual(host.login.authenticate(session.token).player,1);test.assertEqual(host.login.authenticate(second.token).player,2);test.assertFalse(host.game.aiManager.isAIPlayer(1));}
  host.fs=original;change(host,{action:'computer',player:1,name:'Robot'});rejects(()=>host.login.authenticate(session.token),'not_logged_in');
 }));
 test.it('rejects malformed, duplicate and inapplicable actions before writing any host changes',()=>fixture(host=>{
  login(host);const before=Save.serialize(host.game);for(const value of [null,{},[],{action:'unknown',player:1},{action:'human',player:1},{action:'computer',player:3,name:'Robot'},{action:'remove',player:3},{action:'remove',player:2},{action:'rename',player:2,name:'New'},{action:'rename',player:1,name:'Bad\nName'},{action:'rename',player:3,name:'First'},{action:'human',player:4},{action:'kill',player:0},{action:'kill',player:1,owner:0},{action:'kill',player:1,name:'Forged'}])rejects(()=>change(host,value),'invalid_host_player');test.assertEqual(Save.serialize(host.game),before);
 }));
 test.it('preserves AI-only scheduling after the last human slot becomes a computer',()=>fixture(host=>{
  change(host,{action:'computer',player:1,name:'Robot one'});change(host,{action:'computer',player:2,name:'Robot two'});test.assertDeepEqual(host.info().slots,[]);test.assertEqual(host.game.config.numHumans,0);test.assertEqual(host.game.config.numComputers,3);host.server={};test.assertTrue(host.tick());test.assertEqual(host.game.turn,2);test.assertTrue(Host.open(host.file).game.aiManager.isAIPlayer(2));
 }));
 test.it('rejects corrupt role maps rather than renumbering restored ownership or admitting an AI',()=>{
  const Config=require('../src/js/game-config.js');for(const humanPlayerSlots of [null,[1,1],[2,1],[1,4],[1],['1',2]])test.assertTrue(new Config({numHumans:2,numComputers:1,humanPlayerSlots}).validate().length>0);
  fixture(host=>{change(host,{action:'computer',player:1,name:'Robot'});rejects(()=>State.restore({...host.playerState(2),viewer:1}),'invalid_player_state');});
 });
});
