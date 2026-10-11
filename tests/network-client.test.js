const test=require('./test-framework.js'),Client=require('../src/js/network-client.js'),HTTP=require('../src/js/network-http.js');
const id='a'.repeat(64),token='b'.repeat(64);
function info(){return {protocol:1,gameId:id,title:'Host 星',turn:1,humans:2,computers:1,slots:[{player:1,status:'open'},{player:2,status:'occupied',name:'航行者',online:true}]};}
function rejects(fn,code){let actual;try{fn();}catch(error){actual=error.code;}test.assertEqual(actual,code);}
module.exports=()=>test.describe('Live network client protocol boundaries',()=>{
 test.it('accepts hostname, IPv4, IPv6 and HTTPS origins without embedding credentials or arbitrary request paths',()=>{
  for(const [address,result] of [['localhost:7777','http://localhost:7777'],['127.0.0.1:7777','http://127.0.0.1:7777'],['[::1]:7777','http://[::1]:7777'],['https://example.org/','https://example.org'],[' localhost:80 ','http://localhost']])test.assertEqual(Client.normalizeAddress(address),result);
  for(const address of ['',null,'file:///private/game','http://name:secret@localhost','http://localhost/info','http://localhost?token=secret','http://localhost#secret','local host'])rejects(()=>Client.normalizeAddress(address),'invalid_host_address');
 });
 test.it('validates protocol, game identity, slots and public lobby data before login',()=>{
  const data=info();data.password='secret';data.slots[1].hash='private';const result=Client.validateInfo(data);test.assertFalse('password' in result);test.assertFalse('hash' in result.slots[1]);test.assertEqual(result.slots[1].name,'航行者');
  for(const mutate of [d=>d.gameId='wrong',d=>d.version={},d=>d.endEarly='yes',d=>d.density=11,d=>d.humans=0,d=>d.slots.pop(),d=>d.slots[1].player=1,d=>d.slots[1].online='yes',d=>d.slots[1].name='Bad\nName']){const data=info();mutate(data);rejects(()=>Client.validateInfo(data),'network_bad_response');}
  rejects(()=>Client.validateInfo({...info(),protocol:2}),'bad_protocol');
 });
 test.it('preserves bounded public countdowns without copying arbitrary host clock fields',()=>{
  const data={...info(),turn:2,maxTimePerTurn:3600,clock:{secondsRemaining:315,paused:true,running:false,limitSeconds:172800,password:'secret'}};
  const result=Client.validateInfo(data);test.assertDeepEqual(result.clock,{secondsRemaining:315,paused:true,running:false,limitSeconds:172800});
  for(const clock of [null,[],{secondsRemaining:-1,paused:false,running:true},{secondsRemaining:3601,paused:false,running:true},{secondsRemaining:null,paused:false,running:true},{secondsRemaining:10,paused:true,running:true},{secondsRemaining:10,paused:'yes',running:false},{secondsRemaining:10,paused:false,running:false,limitSeconds:0}])rejects(()=>Client.validateInfo({...data,clock}),'network_bad_response');
  rejects(()=>Client.validateInfo({...data,turn:1}),'network_bad_response');
  test.assertDeepEqual(Client.validateInfo({...data,turn:1,clock:{secondsRemaining:null,paused:false,running:false}}).clock,{secondsRemaining:null,paused:false,running:false});
  test.assertFalse('clock' in Client.validateInfo(info()));
 });
 test.it('accepts AI-only public lobbies without inventing human admission slots',()=>{
  const robots={...info(),humans:0,computers:99,slots:[]};test.assertEqual(Client.validateInfo(robots).computers,99);test.assertEqual(Client.validateInfo(robots).slots.length,0);rejects(()=>Client.validateInfo({...robots,computers:0}),'network_bad_response');rejects(()=>Client.validateInfo({...robots,computers:100}),'network_bad_response');rejects(()=>Client.validateLogin({protocol:1,gameId:id,token,name:'Voyager',player:1,turn:1},robots,'Voyager'),'network_bad_response');
 });
 test.it('binds accepted identity and temporary token to the inspected game and submitted name',()=>{
  const response={protocol:1,gameId:id,name:'Voyager',player:2,token,turn:1};test.assertEqual(Client.validateLogin(response,info(),'Voyager').player,2);
  for(const mutate of [d=>d.name='Other',d=>d.player=3,d=>d.token='short',d=>d.turn=0]){const data={...response};mutate(data);rejects(()=>Client.validateLogin(data,info(),'Voyager'),'network_bad_response');}
  rejects(()=>Client.validateLogin({...response,gameId:'c'.repeat(64)},info(),'Voyager'),'wrong_game');
 });
 test.it('normalizes HTTP failures without echoing arbitrary server text or following redirects',()=>{
  test.assertEqual(HTTP.decode(200,'{"name":"航行者"}').name,'航行者');test.assertDeepEqual(HTTP.decode(204,''),{});
  rejects(()=>HTTP.decode(401,'{"error":"bad_password"}'),'bad_password');rejects(()=>HTTP.decode(409,'{"error":"stale_orders"}'),'stale_orders');rejects(()=>HTTP.decode(500,'{"error":"secret internal path"}'),'network_http_error');rejects(()=>HTTP.decode(302,'{}'),'network_http_error');
  for(const body of ['{','null','[]','"text"'])rejects(()=>HTTP.decode(200,body),'network_bad_response');
 });
 test.it('stores only a public rejoin descriptor and bounds request timeouts',()=>{
  const client=new Client.NetworkClient('localhost:7777');test.assertFalse(client.connected);test.assertNull(client.descriptor());
  client.identity={gameId:id,name:'Voyager',player:2};client.session={token,password:'not saved'};
  test.assertDeepEqual(client.descriptor(),{address:'http://localhost:7777',gameId:id,name:'Voyager',player:2});test.assertFalse(JSON.stringify(client.descriptor()).includes(token));
  for(const timeout of [0,-1,1.5,60001])rejects(()=>new Client.NetworkClient('localhost',{timeout}),'invalid_network_timeout');
 });
 test.it('preserves selected-object identity, camera, local drawing choices and report acknowledgments across a new turn',()=>{
  const old={stars:[{id:4}],allShips:[],allFleets:[],allRendezvous:[],display:{camera:{zoom:2,panX:100,panY:200}},eventLog:[{id:1,handled:true}],showEnemyEvents:false,mapDisplayMode:'population'};old.selectedObject=old.stars[0];
  const fresh={stars:[{id:4}],eventLog:[{id:1,handled:false}],attention:{queue:[{event:null,handled:false}]}};fresh.attention.queue[0].event=fresh.eventLog[0];
  Client.preservePresentation(old,fresh);test.assertTrue(fresh.selectedObject===fresh.stars[0]);test.assertDeepEqual(fresh.savedCamera,{zoom:2,panX:100,panY:200});test.assertFalse(fresh.showEnemyEvents);test.assertEqual(fresh.mapDisplayMode,'population');test.assertTrue(fresh.eventLog[0].handled);test.assertTrue(fresh.attention.queue[0].handled);
 });
});
