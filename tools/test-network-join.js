// Async admission-controller lifecycle checks (the synchronous unit framework does not await promises).
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);pdg.res.openResourceFile(require('path').join(__dirname,'../data'));
const assert=require('assert'),{JoinWindow}=require('../src/js/network-join.js'),{NetworkClient}=require('../src/js/network-client.js');
const lobby={gameId:'a'.repeat(64),title:'Test',turn:1,humans:1,computers:0,slots:[{player:1,status:'open'}]};
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
(async()=>{
 let installs=0,cancels=0;const pending=deferred(),next=deferred();let count=0;
 const window=new JoinWindow({create:()=>({address:'http://localhost',inspect:()=>++count===1?pending.promise:next.promise,disconnect:()=>{cancels++;}}),install:()=>installs++});
 window.open();window.address.text='localhost';const old=window.inspect();window.cancel();window.open();window.address.text='localhost';const current=window.inspect();
 pending.resolve({...lobby,title:'Old'});assert.equal(await old,false);assert(window.busy);assert.equal(window.info,null);next.resolve({...lobby,title:'Current'});assert.equal(await current,true);assert.equal(window.info.title,'Current');assert.equal(installs,0);assert.equal(cancels,1);
 window.cancel();
 const admission=deferred();const client={address:'http://localhost',inspect:async()=>lobby,connect:()=>admission.promise,disconnect:()=>{cancels++;}};
 const join=new JoinWindow({create:()=>client,install:()=>installs++});join.open();join.address.text='localhost';join.name.text='Voyager';await join.inspect();const entering=join.connect();join.cancel();admission.resolve({});assert.equal(await entering,false);assert.equal(installs,0);assert(!join.active);assert.equal(join.password.text,'');
 const failed=new JoinWindow({create:()=>({...client,connect:async()=>{const e=new Error('private internal detail');e.code='bad_password';throw e;}}),install:()=>installs++});
 failed.open();failed.address.text='localhost';failed.name.text='Voyager';await failed.inspect();assert.equal(await failed.connect(),false);assert(failed.active);assert(!failed.busy);assert(!failed.message.includes('private internal detail'));failed.cancel();
 // Cancelling during a reused client's logout must not start a new login afterwards.
 const logout=deferred();let requests=0;const transport=new NetworkClient('localhost',{request:()=>{requests++;return {promise:logout.promise,cancel:()=>{}};}});
 transport.identity={name:'Voyager',player:1,gameId:lobby.gameId};transport.session={token:'b'.repeat(64)};
 const rejoining=transport.rejoin('secret');await transport.disconnect({keepView:true});logout.resolve({});let code;try{await rejoining;}catch(error){code=error.code;}assert.equal(code,'network_cancelled');assert.equal(requests,1);assert.equal(transport.session,null);
 const values=new Map(),preferences=require('../src/js/network-password-preferences.js').createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}}),identity={address:'http://localhost',gameId:lobby.gameId,role:'player',name:'Voyager'};
 const saved=new JoinWindow({passwordPreferences:preferences,create:()=>({...client,connect:async()=>({})}),install:()=>installs++});saved.open();saved.address.text='localhost';saved.name.text='Voyager';saved.password.text='remembered';saved.action('rememberPassword');await saved.inspect();assert(await saved.connect());assert.equal(preferences.read(identity),'remembered');assert.equal(saved.password.text,'');
 saved.open(identity);assert.equal(saved.password.text,'remembered');saved.action('rememberPassword');saved.cancel();assert.equal(preferences.read(identity),'remembered');
 saved.open(identity);saved.action('rememberPassword');await saved.inspect();assert(await saved.connect());assert.equal(preferences.read(identity),null);
 preferences.write(identity,'old good',true);const invalid=new JoinWindow({passwordPreferences:preferences,create:()=>({...client,connect:async()=>{throw {code:'bad_password'};}}),install:()=>installs++});invalid.open(identity);await invalid.inspect();invalid.password.text='wrong replacement';assert.equal(await invalid.connect(),false);assert.equal(preferences.read(identity),'old good');invalid.cancel();
 const installFailure=new JoinWindow({passwordPreferences:preferences,create:()=>({...client,connect:async()=>({})}),install:()=>{throw Error('failed install');}});installFailure.open(identity);await installFailure.inspect();installFailure.password.text='not installed';assert.equal(await installFailure.connect(),false);assert.equal(preferences.read(identity),'old good');installFailure.cancel();
 const pause=deferred(),pendingSave=new JoinWindow({passwordPreferences:preferences,create:()=>({...client,connect:()=>pause.promise}),install:()=>installs++});pendingSave.open(identity);await pendingSave.inspect();pendingSave.password.text='cancelled';const saving=pendingSave.connect();pendingSave.cancel();pause.resolve({});assert.equal(await saving,false);assert.equal(preferences.read(identity),'old good');
 // Background inspection updates public data without replacing credentials or
 // focus, and cannot deliver a canceled/obsolete response into a reopened form.
 const refresh=deferred(),reopened=deferred();let inspections=0;
 const live=new JoinWindow({create:()=>({address:'http://localhost',inspect:()=>++inspections===1?Promise.resolve(lobby):inspections===2?refresh.promise:reopened.promise,disconnect:()=>{}})});
 live.open();live.address.text='localhost';live.name.text='Editing';live.password.text='secret';await live.inspect();live.focus='password';live.action('gameInformation');live.nextInspection=0;const update=live.poll();assert(update);assert.equal(live.poll(),false);refresh.resolve({...lobby,turn:2});assert(await update);assert.equal(live.info.turn,2);assert.equal(live.stage,'information');assert.equal(live.name.text,'Editing');assert.equal(live.password.text,'secret');assert.equal(live.focus,'password');
 live.nextInspection=0;const stale=live.poll();live.cancel();live.open();assert.equal(live.refreshing,null);reopened.resolve({...lobby,title:'Obsolete'});assert.equal(await stale,false);assert.equal(live.info,null);assert(live.active);live.cancel();
 console.log('PASS async Join/Rejoin lifecycle: cancelled inspect/reopen, cancelled admission, localized rejection and cancellation during logout');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>process.exit(process.exitCode || 0));
