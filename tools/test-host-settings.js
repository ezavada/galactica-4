// Real desktop settings saves, refreshed clients and failure recovery; audio muted.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const {createService}=require('../src/js/host-games.js'),{HostWindow}=require('../src/js/network-host-setup.js'),{NetworkClient}=require('../src/js/network-client.js'),{NetworkHost}=require('../src/js/network-host.js'),Save=require('../src/js/game-save.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-host-settings-')),service=createService(),clients=[];
(async()=>{
 for(const lang of ['en','de','es','fr','ja','ru']){
  pdg.res.setLanguage(lang);const file=path.join(dir,lang+'.json');let record=await service.create({numHumans:2,numComputers:1,sectorSize:1,density:1,maxTimePerTurn:300,endEarly:false},file,{port:0});
  const client=new NetworkClient(record.address);clients.push(client);await client.connect({name:'Captain '+lang});await service.turnControl(record,'pause');await service.turnControl(record,'end',1);await client.refresh();
  const form=new HostWindow(service,()=>true);form.open();assert(form.layout(800,600).buttons.some(b=>b.action==='settings'));const before=Save.serialize(record.host.game);form.editSettings();form.action('skill',1);form.cancel();assert.equal(Save.serialize(record.host.game),before);
  form.editSettings();form.action('skill',1);form.action('advantage',3);form.action('fast');form.action('fog');form.time.text='1';
  const own=client.model.stars.find(s=>s.owner===1);own.name='Draft '+lang;own.growth.desired=60;own.shipBuilding.desired=30;own.research.desired=10;
  fs.chmodSync(dir,0o500);assert.equal(await form.saveSettings(),false);assert.equal(form.stage,'settings');assert.equal(form.message,pdg.res.getString(1030));assert.equal(Save.serialize(record.host.game),before);fs.chmodSync(dir,0o700);
  const save=form.saveSettings();assert(form.busy);assert.equal(form.cancel(),false);assert.equal(await save,true);assert.equal(form.stage,'hosting');assert(record.host.clock.paused);assert.equal(record.host.clock.remaining(),300000);assert.equal(record.host.game.config.maxTimePerTurn,60);assert.equal(record.host.game.players[3].compSkill,1);assert.equal(record.host.game.players[3].compAdvantage,3);
  const reopened=NetworkHost.open(file);assert.equal(reopened.clock.remaining(),300000);assert.equal(reopened.game.config.maxTimePerTurn,60);
  await client.refresh();assert.equal(client.model.config.compSkill,1);assert.equal(client.model.config.maxTimePerTurn,60);assert.equal(client.model.clientClock.limitSeconds,300);assert.equal(client.model.stars.find(s=>s.id===own.id).name,'Draft '+lang);await client.post();assert.equal(record.host.game.stars.find(s=>s.id===own.id).name,'Draft '+lang);
  form.editSettings();await service.updateSettings(record,{...service.describe(record).administration.settings,compSkill:2},1);assert.equal(await form.saveSettings(),false);assert.equal(form.stage,'hosting');assert.equal(form.message,pdg.res.getString(1121));assert.equal(record.host.game.config.compSkill,2);
  form.editSettings();form.action('timed');assert.equal(await form.saveSettings(),true);assert.equal(record.host.clock.remaining(),null);form.editSettings();form.action('timed');form.time.text='2';assert.equal(await form.saveSettings(),true);assert.equal(record.host.clock.remaining(),120000);assert(record.host.clock.paused);
  await client.disconnect();await service.stop(record);record=await service.open(file);assert(record.host.clock.paused);assert.equal(record.host.clock.remaining(),120000);assert.equal(record.host.game.config.compSkill,2);await service.stop(record);
 }
 await assert.rejects(createService({document:{}}).updateSettings({}, {},0),e=>e.code==='desktop_host_required');await assert.rejects(service.updateSettings({}, {},0),e=>e.code==='invalid_host_record');
 console.log('PASS host settings: actual desktop save failure/draft retry, stale revision, six-language controls, global AI, same-turn client draft retention/post, preserved current deadline, enable/disable timer, durable reopen and desktop guards');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{fs.chmodSync(dir,0o700);try{for(const c of clients)await c.disconnect();await service.closeAll();}catch(e){console.error(e.stack);process.exitCode=1;}fs.rmSync(dir,{recursive:true,force:true});process.exit(process.exitCode||0);});
