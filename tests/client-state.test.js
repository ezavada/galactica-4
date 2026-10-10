const test=require('./test-framework.js'),Client=require('../src/js/client-state.js'),View=require('../src/js/host-view.js'),Save=require('../src/js/game-save.js'),Display=require('../src/js/display.js');
const Host=require('../src/js/network-host.js').NetworkHost,fs=require('fs'),os=require('os'),path=require('path');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-client-test-'));try{
 const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1},path.join(dir,'host.json')),game=host.game;
 host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'航行 Jäger Второй'});
 const own=game.stars.find(s=>s.owner===2),enemy=game.stars.find(s=>s.owner===1);
 const ship=game.factory.createShip(own.x,own.y,'scout',own,true);own.ships.push(ship);
 const hidden=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);hidden.name='Enemy secret';
 const fleet=game.factory.createFleet(enemy.x,enemy.y,1,'Enemy fleet');fleet.addShip(hidden);
 for(const e of [...game.stars,...game.allShips,...game.allFleets])e.setVisibilityTo(2,0);
 fleet.setVisibilityTo(2,1);
 const state=()=>({...View.snapshot(game,2),gameId:host.info().gameId});
 const display=client=>{client.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const d=new Display(client);client.display=d;return d;};
 fn({host,game,own,enemy,ship,hidden,fleet,state,display});
}finally{fs.rmSync(dir,{recursive:true,force:true});}}
const get=(client,kind,e)=>client[kind].find(row=>row.id===e.id);
function rejects(fn){let caught=false;try{fn();}catch(error){caught=error.message==='invalid_player_state';}test.assertTrue(caught);}
module.exports=()=>test.describe('Visibility-limited multiplayer client model',()=>{
 test.it("reconstructs the second human identity and allows orders only on that player's entities",()=>fixture(({game,own,enemy,ship,state})=>{
  const original=Save.serialize(game);pdg.srand(719);const expected=pdg.rand();pdg.srand(719);const client=Client.restore(state());test.assertEqual(pdg.rand(),expected);const home=get(client,'stars',own),other=get(client,'stars',enemy),courier=get(client,'allShips',ship);
  test.assertEqual(client.getCurrentHumanPlayer(),2);test.assertTrue(client.canHumanControl(home));test.assertTrue(client.canHumanControl(courier));test.assertFalse(client.canHumanControl(other));
  test.assertEqual(client.players[2].name,'航行 Jäger Второй');test.assertEqual(client.players[2].homeStarId,own.id);test.assertEqual(courier.star,home);test.assertTrue(home.ships.includes(courier));
  client.executeUIAction({type:'buildShip',object:home,shipType:'colony'});test.assertEqual(home.currentShip.type,'colony');const previous=other.currentShip;client.executeUIAction({type:'buildShip',object:other,shipType:'colony'});test.assertTrue(other.currentShip===previous);test.assertEqual(Save.serialize(game),original);
 }));
 test.it('keeps transmitted star labels, including remembered homeworld names, independent of missing foreign private records',()=>fixture(({game,enemy,state})=>{
  let data=state(),client=Client.restore(data),star=get(client,'stars',enemy);test.assertEqual(client.getStarDisplayName(star),data.entities.find(r=>r.kind==='star' && r.id===enemy.id).name);test.assertTrue(star.name!==enemy.name);
  enemy.setVisibilityTo(2,1);enemy.setLastSeen(2,game.turn);enemy.setVisibilityTo(2,0);data=state();client=Client.restore(data);star=get(client,'stars',enemy);test.assertEqual(client.getStarDisplayName(star),enemy.name);test.assertFalse('password' in data.privatePlayer);
 }));
 test.it('renders unknown fleet speed without inventing members, deleting the fleet, or recalculating its received statistics',()=>fixture(({fleet,hidden,state,display})=>{
  const data=state(),client=Client.restore(data),remote=get(client,'allFleets',fleet),d=display(client),row=data.entities.find(r=>r.kind==='fleet' && r.id===fleet.id);
  test.assertFalse(remote.isEmpty());test.assertFalse(remote.isDead());test.assertEqual(remote.ships.length,0);test.assertFalse(!!get(client,'allShips',hidden));
  const info=d.getFleetDiagnostics(remote);test.assertEqual(info.count,'?');test.assertEqual(info.power,'?');test.assertEqual(remote.totalSpeed,row.speed);test.assertEqual(d.getFleetDetailsLayout(remote).visibleShips.length,0);
 }));
 test.it('restores class-visible fleet nesting and supplied defenses without needing the hidden simulation',()=>fixture(({game,fleet,hidden,enemy,state,display})=>{
  fleet.setVisibilityTo(2,3);enemy.setVisibilityTo(2,4);const data=state(),client=Client.restore(data),remote=get(client,'allFleets',fleet),member=get(client,'allShips',hidden),star=get(client,'stars',enemy),d=display(client);
  test.assertEqual(member.fleet,remote);test.assertTrue(remote.ships.includes(member));test.assertEqual(d.getFleetDiagnostics(remote).count,'1');
  test.assertDeepEqual(star.getDefenseBreakdown(),data.entities.find(r=>r.kind==='star' && r.id===enemy.id).defense);test.assertFalse(client.canHumanControl(member));
 }));
 test.it('restores route references and memory while preventing client End Turn from running production or AI',()=>fixture(({own,ship,state})=>{
  ship.course.replace(own);ship.course.swapMemory();const client=Client.restore(state()),courier=get(client,'allShips',ship),home=get(client,'stars',own);
  test.assertEqual(courier.course.waypoints[0].target,home);test.assertEqual(courier.course.memory.waypoints[0].target,home);
  const turn=client.turn;client.aiManager.processAITurns=()=>{throw Error('Client simulated AI');};test.assertFalse(client.endTurn());test.assertEqual(client.turn,turn);
  let invalidSave=false;try{Save.serialize(client);}catch(error){invalidSave=true;}test.assertTrue(invalidSave);
 }));
 test.it('makes a rejoined already-posted turn read-only while retaining its current player identity',()=>fixture(({game,own,state})=>{
  game.players[2].lastTurnPosted=game.turn;const client=Client.restore(state());test.assertTrue(client.clientTurnPosted);test.assertEqual(client.getCurrentHumanPlayer(),2);test.assertFalse(client.canHumanControl(get(client,'stars',own)));
 }));
 test.it('uses complete host comparison totals and native-language labels despite the partial map',()=>fixture(({game,state})=>{
  const client=Client.restore(state()),language=pdg.res.getLanguage();test.assertTrue(client.allShips.length<game.allShips.length);test.assertEqual(client.getMapShipCount(),game.allShips.length);
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const rows=client.getPlayerComparisonRows();
   test.assertEqual(rows[0].name,pdg.res.getString(811));test.assertEqual(rows[1].type,pdg.res.getString(300));test.assertEqual(rows[3].type,pdg.res.getString(504));test.assertEqual(rows[2].name,'航行 Jäger Второй');
   for(const source of state().comparisons){const row=rows.find(r=>r.playerNum===source.playerNum);test.assertEqual(row.ships,source.ships);test.assertEqual(row.population,source.population);test.assertEqual(row.production,source.production);}
  }}finally{pdg.res.setLanguage(language);}
 }));
 test.it('rejects malformed versions, slots, numbers, identities, dangling links and containment cycles before exposing a client',()=>fixture(({state,own,ship,fleet,hidden,game})=>{
  for(const mutate of [s=>s.version=99,s=>s.viewer=3,s=>s.map.width=0,s=>s.privatePlayer.playerNum=1,s=>s.entities.push(s.entities[0]),s=>s.entities[0].owner=999,s=>s.entities[0].kind='constructor',s=>s.entities[0].x=null,s=>s.comparisons.pop(),s=>s.comparisons[1].isComputer=true,s=>s.privatePlayer.defaultGrowth='bad',s=>s.map.width+=1,s=>s.entities.find(e=>e.kind==='ship' && e.id===ship.id).star={kind:'star',id:999999},s=>s.events=[{id:1,turn:1,title:'Wrong',message:'Private',recipient:1}]]){const data=state();mutate(data);rejects(()=>Client.restore(data));}
  fleet.setVisibilityTo(2,3);const data=state(),row=data.entities.find(e=>e.kind==='fleet' && e.id===fleet.id);row.ships=[{kind:'fleet',id:fleet.id}];rejects(()=>Client.restore(data));
 }));
});
