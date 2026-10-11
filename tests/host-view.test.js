const test=require('./test-framework.js'),View=require('../src/js/host-view.js'),Names=require('../src/js/chart-names.js'),Save=require('../src/js/game-save.js');
const Host=require('../src/js/network-host.js').NetworkHost,fs=require('fs'),os=require('os'),path=require('path');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-view-test-'));try{
 const host=Host.create({numHumans:2,numComputers:1,sectorSize:1,density:1},path.join(dir,'host.json')),game=host.game;
 const own=game.stars.find(s=>s.owner===1),enemy=game.stars.find(s=>s.owner===2);
 for(const e of [...game.stars,...game.allShips,...game.allFleets]){e.setVisibilityTo(1,0);e.setVisibilityTo(2,0);}
 game.eventLog=[];game.overlay=null;game.overlayQueue=[];game.attention.queue=[];
 const ship=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);ship.name='Private ship';ship.setVisibilityTo(1,0);
 const fleet=game.factory.createFleet(enemy.x,enemy.y,2,'Private fleet');fleet.addShip(ship);fleet.setVisibilityTo(1,0);
 const marker=game.factory.createRendezvous(enemy.x+100,enemy.y,2,'Private rendezvous');
 const first=host.login.login({protocol:1,mode:'join',name:'Player one',password:'secret-one'});
 fn({host,game,own,enemy,ship,fleet,marker,first});
}finally{fs.rmSync(dir,{recursive:true,force:true});}}
const entity=(view,kind,object)=>view.entities.find(e=>e.kind===kind && e.id===object.id);
module.exports=()=>test.describe('Authenticated player-state transport',()=>{
 test.it('projects detected fleet allegiance at every visibility tier without exposing higher-tier details or private orders',()=>fixture(({game,fleet,host})=>{
  const State=require('../src/js/client-state.js');for(const level of [0,1,2,3,4]){
   fleet.setVisibilityTo(1,level);const view=host.playerState(1),row=entity(view,'fleet',fleet);
   if(!level){test.assertFalse(!!row);continue;}
   test.assertEqual(row.owner,2);test.assertEqual('techLevel' in row,level>=2);test.assertEqual('name' in row,level>=3);test.assertEqual('ships' in row,level>=3);test.assertEqual('scannerRange' in row,level>=4);test.assertFalse('course' in row);
   const model=State.restore(view),copy=model.allFleets.find(e=>e.id===fleet.id);test.assertEqual(copy.owner,2);test.assertEqual(copy.getVisibilityTo(1),level);test.assertFalse(model.canHumanControl(copy));
  }
 }));

 test.it('keeps hidden homeworld aliases distinct from comparison names and leaves the host graph and RNG untouched',()=>fixture(({game,enemy,host})=>{
  const before=Save.serialize(game),prior=Names.snapshot(game);pdg.srand(87);const expected=pdg.rand();pdg.srand(87);
  const a=View.snapshot(game,1),b=View.snapshot(game,1),star=entity(a,'star',enemy);
  test.assertEqual(a.map.width,1024*1024*game.config.sectorSize);test.assertEqual(a.map.height,a.map.width);test.assertTrue(star.name!==enemy.name);test.assertEqual(star.name,entity(b,'star',enemy).name);test.assertFalse('owner' in star);test.assertFalse('techLevel' in star);
  test.assertEqual(a.comparisons.find(p=>p.playerNum===2).name,'');test.assertFalse(a.comparisons.find(p=>p.playerNum===2).assigned);
  test.assertEqual(Save.serialize(game),before);test.assertTrue(Names.snapshot(game)===prior);test.assertEqual(pdg.rand(),expected);
  host.login.login({protocol:1,mode:'join',name:enemy.name+' Alliance'});const c=View.snapshot(game,1);
  test.assertEqual(c.comparisons.find(p=>p.playerNum===2).name,enemy.name+' Alliance');test.assertEqual(entity(c,'star',enemy).name,star.name);
 }));
 test.it('gates star ownership, tech, population, defenses and economic targets at the existing knowledge levels',()=>fixture(({game,enemy})=>{
  enemy.currentShip={type:'scout',techLevel:10,progress:57,cost:100};enemy.growth.desired=91;enemy.defaultDestination={x:777,y:888,name:'Private delivery'};
  for(let level=0;level<=4;level++){enemy.setVisibilityTo(1,level);const row=entity(View.snapshot(game,1),'star',enemy);
   test.assertEqual('owner' in row,level>0);test.assertEqual('techLevel' in row,level>=2);test.assertEqual('population' in row,level>=3);test.assertEqual('defense' in row,level>=4);
   test.assertFalse('defaultDestination' in row);test.assertFalse('buildCredits' in row);
   if(level===4){test.assertDeepEqual(row.currentShip,{type:'scout'});test.assertFalse('desired' in row.growth);}
  }
  enemy.setLastSeen(1,2);enemy.setVisibilityTo(1,0);test.assertEqual(entity(View.snapshot(game,1),'star',enemy).name,enemy.name);
 }));
 test.it('omits hidden mobile units and enemy rendezvous while revealing class-level nested fleet membership',()=>fixture(({game,fleet,ship,marker,enemy})=>{
  const child=game.factory.createFleet(enemy.x,enemy.y,2,'Child fleet');child.addShip(ship);fleet.addShip(child);child.setVisibilityTo(1,0);
  let view=View.snapshot(game,1);test.assertFalse(!!entity(view,'fleet',fleet));test.assertFalse(!!entity(view,'ship',ship));test.assertFalse(!!entity(view,'rendezvous',marker));
  fleet.setVisibilityTo(1,1);view=View.snapshot(game,1);const speed=entity(view,'fleet',fleet);test.assertFalse('ships' in speed);test.assertFalse('name' in speed);test.assertEqual(speed.owner,2);test.assertFalse(!!entity(view,'fleet',child));
  fleet.setVisibilityTo(1,3);view=View.snapshot(game,1);test.assertEqual(entity(view,'fleet',fleet).ships[0].id,child.id);test.assertEqual(entity(view,'fleet',child).ships[0].id,ship.id);test.assertFalse('name' in entity(view,'ship',ship));test.assertEqual(entity(view,'ship',ship).visibility,0);test.assertEqual(entity(view,'ship',ship).type,'battleship');test.assertFalse('course' in entity(view,'ship',ship));
  const model=require('../src/js/client-state.js').restore({...view,gameId:'a'.repeat(64)});
  model.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(s,size=11)=>String(s).length*size/2};
  model.display=new (require('../src/js/display.js'))(model);
  const copy=model.allFleets.find(e=>e.id===child.id),member=model.allShips.find(e=>e.id===ship.id);
  test.assertTrue(model.showFleetExchange(copy));test.assertTrue(model.getFleetExchangeState().main.includes(member));
  test.assertEqual(copy.getVisibilityTo(1),0);test.assertFalse(model.canHumanControl(member));
  test.assertEqual(model.display.getFleetMemberDiagnostics(copy,member).health,'100%');
  test.assertEqual(model.display.getShipDiagnostics(member).health,'?');
 }));
 test.it('projects Details-visible system tables without promoting standalone names or orders',()=>fixture(({game,enemy,fleet,ship})=>{
  fleet.star=enemy;fleet.x=enemy.x;fleet.y=enemy.y;fleet.syncShipPositions();
  const child=game.factory.createFleet(enemy.x,enemy.y,2,'Private group');child.addShip(ship);fleet.addShip(child);child.setVisibilityTo(1,0);
  const departing=game.factory.createShip(enemy.x+500,enemy.y,'scout',enemy,true);departing.star=null;departing.setVisibilityTo(1,0);
  enemy.setVisibilityTo(1,3);let view=View.snapshot(game,1);test.assertFalse(!!entity(view,'fleet',fleet));test.assertFalse('ships' in entity(view,'star',enemy));
  enemy.setVisibilityTo(1,4);view=View.snapshot(game,1);const system=entity(view,'star',enemy);
  test.assertTrue(system.ships.some(r=>r.id===fleet.id));test.assertFalse(!!entity(view,'ship',departing));
  for(const [kind,object] of [['fleet',fleet],['fleet',child],['ship',ship]]){
   const row=entity(view,kind,object);test.assertEqual(row.visibility,0);test.assertFalse('name' in row);test.assertFalse('course' in row);test.assertFalse('scannerRange' in row);test.assertTrue('power' in row);
  }
  const model=require('../src/js/client-state.js').restore({...view,gameId:'a'.repeat(64)});
  model.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(s,size=11)=>String(s).length*size/2};model.display=new (require('../src/js/display.js'))(model);
  const copy=model.stars.find(e=>e.id===enemy.id),group=model.allFleets.find(e=>e.id===child.id),member=model.allShips.find(e=>e.id===ship.id);
  test.assertTrue(model.showFleetExchange(copy));test.assertTrue(model.getFleetExchangeState().main.some(e=>e.id===fleet.id));
  test.assertTrue(model.showFleetExchange(group));test.assertEqual(model.display.getFleetMemberDiagnostics(group,member).health,'100%');test.assertEqual(model.display.getShipDiagnostics(member).health,'?');test.assertFalse(model.canHumanControl(member));
  copy.setVisibilityTo(1,3);test.assertFalse(model.canViewFleetExchange(group));test.assertNull(model.getFleetExchangeState());
  enemy.owner=0;enemy.setVisibilityTo(1,0);
  const ally=game.factory.createShip(enemy.x,enemy.y,'colony',enemy);ally.owner=1;
  view=View.snapshot(game,1);test.assertFalse(!!entity(view,'fleet',fleet));
  ally.complete();view=View.snapshot(game,1);test.assertTrue(entity(view,'star',enemy).ships.some(r=>r.id===fleet.id));test.assertTrue(!!entity(view,'ship',ship));
  ally.star=null;ally.x+=500;view=View.snapshot(game,1);test.assertFalse(!!entity(view,'fleet',fleet));
 }));
 test.it('uses host system membership when detected departing ships and fleets still share its coordinates',()=>fixture(({game,enemy,fleet,ship,own})=>{
  enemy.setVisibilityTo(1,4);fleet.star=enemy;fleet.x=enemy.x;fleet.y=enemy.y;fleet.syncShipPositions();
  const departing=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);departing.star=null;departing.setVisibilityTo(1,3);departing.course.replace({x:enemy.x+1000,y:enemy.y});
  const leaving=game.factory.createFleet(enemy.x,enemy.y,2,'Departing fleet'),member=game.factory.createShip(enemy.x,enemy.y,'scout',enemy,true);leaving.addShip(member);leaving.star=null;leaving.course.replace({x:enemy.x+2000,y:enemy.y});leaving.setVisibilityTo(1,3);
  const view=View.snapshot(game,1);test.assertFalse(entity(view,'star',enemy).ships.some(r=>r.id===departing.id && r.kind==='ship' || r.id===leaving.id && r.kind==='fleet'));
  test.assertTrue(!!entity(view,'ship',departing));test.assertTrue(!!entity(view,'fleet',leaving));test.assertFalse('course' in entity(view,'ship',departing));test.assertFalse('course' in entity(view,'fleet',leaving));
  const model=require('../src/js/client-state.js').restore({...view,gameId:'a'.repeat(64)});model.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(s,size=11)=>String(s).length*size/2};model.display=new (require('../src/js/display.js'))(model);
  const system=model.stars.find(e=>e.id===enemy.id),rows=model.getSystemShipRows(system);
  test.assertTrue(rows.some(r=>r.object.id===fleet.id && model.factory.isFleet(r.object)));
  test.assertFalse(rows.some(r=>r.object.id===departing.id && model.factory.isShip(r.object)));
  test.assertFalse(rows.some(r=>r.object.id===leaving.id && model.factory.isFleet(r.object)));
  test.assertTrue(model.showFleetExchange(system));test.assertFalse(model.getFleetExchangeState().main.some(e=>e.id===leaving.id && model.factory.isFleet(e)));
  const parked=game.factory.createFleet(own.x,own.y,1,'Coordinate-only fleet'),ownShip=game.factory.createShip(own.x,own.y,'scout',own,true);parked.addShip(ownShip);parked.star=null;
  const ownView=View.snapshot(game,1);test.assertTrue(entity(ownView,'star',own).ships.some(r=>r.id===parked.id && r.kind==='fleet'));
  const ownModel=require('../src/js/client-state.js').restore({...ownView,gameId:'a'.repeat(64)}),ownSystem=ownModel.stars.find(s=>s.id===own.id);
  test.assertTrue(ownModel.getDockedSystemMembers(ownSystem).some(e=>ownModel.factory.isFleet(e) && e.id===parked.id));
  test.assertFalse(game.getDockedSystemMembers(enemy).includes(departing));test.assertFalse(game.getDockedSystemMembers(enemy).includes(leaving));
 }));
 test.it('keeps the existing ship faction marker at Speed while gating inspector fields and enemy courses',()=>fixture(({game,ship,fleet})=>{
  fleet.removeShip(ship);ship.course.replace({x:1234,y:5678,name:'Secret order'});
  for(let level=1;level<=4;level++){ship.setVisibilityTo(1,level);const row=entity(View.snapshot(game,1),'ship',ship);
   test.assertEqual(row.owner,2);test.assertTrue('speed' in row);test.assertEqual('techLevel' in row,level>=2);test.assertEqual('name' in row,level>=3);test.assertEqual('scannerRange' in row,level>=4);test.assertFalse('course' in row);
  }
 }));
 test.it('delivers complete owned orders and defaults without following hidden target graphs or resolving waypoints',()=>fixture(({game,own,ship})=>{
  const courier=game.factory.createShip(own.x,own.y,'scout',own,true);courier.course.replace(ship);courier.course.memory={waypoints:[{x:10,y:20,target:ship}],current:0,previous:-1,loop:false,hunt:false,hasOrigin:false,patrol:true};
  const oldX=courier.course.waypoints[0].x;ship.x+=500;own.defaultDestination={x:321,y:654,name:'No graph'};
  const before=Save.serialize(game),view=View.snapshot(game,1),row=entity(view,'ship',courier);
  test.assertEqual(row.course.waypoints[0].x,oldX);test.assertNull(row.course.waypoints[0].target);test.assertNull(row.course.memory.waypoints[0].target);
  test.assertEqual(entity(view,'star',own).growth.desired,own.growth.desired);test.assertEqual(entity(view,'star',own).defaultDestination.x,321);test.assertEqual(view.privatePlayer.homeStarId,own.id);
  test.assertFalse(JSON.stringify(row).includes('Private ship'));test.assertEqual(Save.serialize(game),before);
 }));
 test.it('respects omniscient inspection including courses while keeping other players private records and markers private',()=>fixture(({game,ship,marker})=>{
  game.config.omniscient=true;ship.course.replace({x:999,y:888});const view=View.snapshot(game,1);
  test.assertEqual(entity(view,'ship',ship).course.waypoints[0].x,999);test.assertFalse(!!entity(view,'rendezvous',marker));
  game.players[2].password='PRIVATE PASSWORD';game.players[2].defaultGrowth=123;
  const text=JSON.stringify(View.snapshot(game,1));test.assertFalse(text.includes('PRIVATE PASSWORD'));test.assertFalse(text.includes('password'));test.assertFalse(text.includes('networkHost'));
  test.assertFalse('players' in view);test.assertEqual(view.privatePlayer.playerNum,1);
 }));
 test.it('filters reports by recipient and observer visibility and serializes only explicit report fields',()=>fixture(({game,own,enemy,ship})=>{
  const a=game.recordEvent('Owner report','Owner message',{subject:own,recipient:1});a.builtShip={name:'Known build',starName:own.name,shipType:'scout',techLevel:3,privateGraph:game};
  const b=game.recordEvent('Other report','Secret other message',{subject:enemy,recipient:2});
  const c=game.recordEvent('Observer','Not yet visible',{subject:enemy,recipient:1});c.observer=true;
  const d=game.recordEvent('Lost ship','Historic position',{subject:ship,recipient:1,position:{x:1,y:2}});
  let view=View.snapshot(game,1);test.assertTrue(view.events.some(e=>e.id===a.id));test.assertFalse(view.events.some(e=>e.id===b.id));test.assertFalse(view.events.some(e=>e.id===c.id));
  test.assertFalse('privateGraph' in view.events.find(e=>e.id===a.id).builtShip);test.assertNull(view.events.find(e=>e.id===d.id).subject);test.assertDeepEqual(view.events.find(e=>e.id===d.id).position,{x:1,y:2});
  enemy.setVisibilityTo(1,1);view=View.snapshot(game,1);test.assertTrue(view.events.some(e=>e.id===c.id));test.assertTrue(View.snapshot(game,2).events.some(e=>e.id===b.id));test.assertFalse(View.snapshot(game,2).events.some(e=>e.id===a.id));
 }));
 test.it('binds HTTP state to the bearer session and never accepts a client-selected player or leaks credentials',()=>fixture(({host,first})=>{
  const second=host.login.login({protocol:1,mode:'join',name:'Second',password:'secret-two'});
  for(const [url,token,status,viewer] of [['/state',first.token,200,1],['/state',second.token,200,2],['/state','invalid',401],['/state?viewer=1',second.token,404]]){
   let actual,body;host.handle({method:'GET',url,headers:{authorization:'Bearer '+token}},{writeHead:s=>actual=s,end:s=>body=JSON.parse(s)});test.assertEqual(actual,status);
   if(status===200){test.assertEqual(body.viewer,viewer);test.assertEqual(body.privatePlayer.playerNum,viewer);test.assertFalse(JSON.stringify(body).includes(token));test.assertFalse(JSON.stringify(body).includes(host.game.config.networkHost.players[0].hash));}
  }
  host.login.logout(first.token);let actual;host.handle({method:'GET',url:'/state',headers:{authorization:'Bearer '+first.token}},{writeHead:s=>actual=s,end:()=>{}});test.assertEqual(actual,401);
 }));
 test.it('preserves public native-script labels and private report snapshots in all six supported languages',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);fixture(({game,own})=>{
   own.name='航行 Étoile Звезда';const event=game.recordEvent('Report','Ergebnis 結果 Результат',{recipient:1,subject:own});
   const view=View.snapshot(game,1);test.assertEqual(entity(view,'star',own).name,own.name);test.assertEqual(view.events.find(e=>e.id===event.id).message,event.message);
  });}}finally{pdg.res.setLanguage(language);}
 });
});
