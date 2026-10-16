const test=require('./test-framework.js'),fs=require('fs'),os=require('os'),path=require('path');
const {NetworkHost}=require('../src/js/network-host.js'),Clock=require('../src/js/host-clock.js'),Save=require('../src/js/game-save.js'),View=require('../src/js/host-view.js'),State=require('../src/js/client-state.js'),Orders=require('../src/js/player-orders.js');
function fixture(fn,options={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-clock-'));try{
 const host=NetworkHost.create({numHumans:2,numComputers:0,sectorSize:1,density:1,maxTimePerTurn:10,endEarly:false,...options},path.join(dir,'host.json'));
 let now=0;host.clock.now=()=>now;fn(host,value=>{now=value;});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
function post(host,player,id){const client=State.restore({...View.snapshot(host.game,player),gameId:host.info().gameId});host.postOrders(player,Orders.snapshot(client,id.repeat(32)));}
function later(host){host.game.turn=2;host.clock.reset(host.game,false);host.persist();host.server={};host.clock.start();}
module.exports=()=>test.describe('Host turn clock and durable countdown',()=>{
 test.it('leaves turn one untimed even without endEarly, then starts the configured limit',()=>fixture((host,time)=>{
  host.server={};host.clock.start();time(999999);test.assertEqual(host.info().clock.secondsRemaining,null);test.assertFalse(host.tick());
  host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'Second'});
  post(host,1,'a');test.assertEqual(host.game.turn,1);post(host,2,'b');test.assertEqual(host.game.turn,2);test.assertEqual(host.clock.info().secondsRemaining,10);test.assertTrue(host.clock.info().running);
 }));
 test.it('expires at the deadline despite unassigned/offline humans, once per elapsed turn',()=>fixture((host,time)=>{
  later(host);time(9999);test.assertFalse(host.tick());test.assertEqual(host.clock.info().secondsRemaining,1);time(10000);test.assertTrue(host.tick());test.assertEqual(host.game.turn,3);test.assertEqual(host.clock.info().secondsRemaining,10);test.assertFalse(host.tick());
  time(999999);test.assertTrue(host.tick());test.assertEqual(host.game.turn,4);test.assertFalse(host.tick());
 }));
 test.it('waits for expiration after all posts with endEarly off and resolves immediately when enabled',()=>fixture((host,time)=>{
  host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'Second'});later(host);
  post(host,1,'a');post(host,2,'b');test.assertEqual(host.game.turn,2);time(9000);test.assertFalse(host.tick());time(10000);test.assertTrue(host.tick());
  host.game.config.endEarly=true;post(host,1,'c');test.assertEqual(host.game.turn,3);post(host,2,'d');test.assertEqual(host.game.turn,4);test.assertEqual(host.clock.info().secondsRemaining,10);
 }));
 test.it('persists remaining time, preserves paused state and ignores host downtime on reopening',()=>fixture((host,time)=>{
  later(host);time(3500);host.persist();const reopened=NetworkHost.open(host.file);test.assertEqual(reopened.clock.snapshot().remainingMs,6500);test.assertFalse(reopened.clock.info().running);
  host.pauseClock();time(900000);test.assertEqual(host.clock.snapshot().remainingMs,6500);test.assertFalse(host.tick());const paused=NetworkHost.open(host.file);test.assertTrue(paused.clock.info().paused);paused.clock.start();test.assertFalse(paused.clock.info().running);
  host.resumeClock();time(906499);test.assertFalse(host.tick());time(906500);test.assertTrue(host.tick());test.assertEqual(host.game.turn,3);
 }));
 test.it('holds posted turns while paused and releases them after resume without resetting the deadline',()=>fixture((host,time)=>{
  host.server={};host.login.login({protocol:1,mode:'join',name:'First'});host.login.login({protocol:1,mode:'join',name:'Second'});host.pauseClock();post(host,1,'a');post(host,2,'b');test.assertEqual(host.game.turn,1);test.assertFalse(host.tick());host.resumeClock();test.assertTrue(host.tick());test.assertEqual(host.game.turn,2);
  time(2500);host.pauseClock();test.assertEqual(host.clock.snapshot().remainingMs,7500);host.resumeClock();test.assertEqual(host.clock.snapshot().remainingMs,7500);
 }));
 test.it('rolls back expiry, IDs, randomness and clock on failed atomic save, then retries the same turn',()=>fixture((host,time)=>{
  later(host);time(10000);const before=Save.serialize(host.game),clock=host.clock.snapshot(),ids=[require('../src/js/star.js'),require('../src/js/ship.js'),require('../src/js/fleet.js'),require('../src/js/rendezvous.js')].map(t=>t.nextId),persist=host.persist;
  host.persist=()=>{throw Error('disk full');};let code;try{host.tick();}catch(e){code=e.code;}test.assertEqual(code,'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertDeepEqual(host.clock.snapshot(),clock);test.assertDeepEqual([require('../src/js/star.js'),require('../src/js/ship.js'),require('../src/js/fleet.js'),require('../src/js/rendezvous.js')].map(t=>t.nextId),ids);
  host.persist=persist;test.assertTrue(host.tick());test.assertEqual(host.game.turn,3);test.assertFalse(host.tick());
 }));
 test.it('stops unlimited clocks and retains human post-result countdowns and does not manufacture elapsed time when the clock moves backward',()=>fixture((host,time)=>{
  later(host);time(-1000);test.assertEqual(host.clock.snapshot().remainingMs,10000);test.assertFalse(host.tick());host.game.markGameWon(1);host.clock.reset(host.game,true);host.persist();test.assertFalse(host.tick());test.assertEqual(NetworkHost.open(host.file).clock.info().secondsRemaining,10);
  host.game.isGameOver=false;host.game.config.maxTimePerTurn=0;host.clock.reset(host.game,true);test.assertEqual(host.clock.info().secondsRemaining,null);test.assertFalse(host.clock.info().running);
 }));
 test.it('keeps pause/resume and the durable clock unchanged when writes fail',()=>fixture((host,time)=>{
  later(host);time(2000);const before=Save.serialize(host.game),saved=fs.readFileSync(host.file,'utf8'),clock=host.clock.snapshot(),original=host.fs;
  host.fs={...fs,writeFileSync:()=>{throw Error('disk full');}};let code;try{host.pauseClock();}catch(e){code=e.code;}test.assertEqual(code,'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertDeepEqual(host.clock.snapshot(),clock);test.assertEqual(fs.readFileSync(host.file,'utf8'),saved);
  host.fs=original;host.pauseClock();const paused=host.clock.snapshot();host.fs={...fs,writeFileSync:()=>{throw Error('disk full');}};try{host.resumeClock();}catch(e){code=e.code;}test.assertEqual(code,'host_save_failed');test.assertDeepEqual(host.clock.snapshot(),paused);test.assertTrue(NetworkHost.open(host.file).clock.info().paused);host.fs=original;
 }));
 test.it('rejects malformed saved countdowns instead of advancing a corrupt host document',()=>fixture(host=>{
  for(const clock of [{turn:2,remainingMs:10,paused:false},{turn:1,remainingMs:10,paused:false},{turn:1,remainingMs:null,paused:'yes'}]){host.game.config.networkHost.clock=clock;let caught=false;try{new Clock(host.game);}catch(e){caught=e.message==='invalid_host_clock';}test.assertTrue(caught);}
 }));
});
