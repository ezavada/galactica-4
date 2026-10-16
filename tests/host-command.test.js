const test=require('./test-framework.js'),Command=require('../src/js/host-command.js'),Config=require('../src/js/game-config.js'),Host=require('../src/js/network-host.js').NetworkHost,fs=require('fs'),path=require('path'),os=require('os');
function rejects(args){let code;try{Command.parse(args);}catch(error){code=error.code;}test.assertEqual(code,'invalid_host_command');}
module.exports=()=>test.describe('Dedicated host commands and robot games',()=>{
 test.it('preserves positional reopening and named load without replacing saved setup',()=>{
  test.assertDeepEqual(Command.parse(['Saved 星.json','0','ja']),{mode:'load',file:'Saved 星.json',port:0,language:'ja'});test.assertDeepEqual(Command.parse(['--language','de','--port','65535','--load','Saved 星.json']),{mode:'load',file:'Saved 星.json',port:65535,language:'de'});rejects(['--load','saved','--players','3']);rejects(['--load','saved','--slow']);
 });
 test.it('accepts admission-rule files on new and saved commands and rejects missing or duplicate paths',()=>{
  test.assertEqual(Command.parse(['--new','host','--admission','rules.json']).admissionFile,'rules.json');test.assertDeepEqual(Command.parse(['--load','host','--admission','rules.json']),{mode:'load',file:'host',port:0,language:'en',admissionFile:'rules.json'});rejects(['--load','host','--admission']);rejects(['--new','host','--admission','']);rejects(['--new','host','--admission','a','--admission','b']);
 });
 test.it('accepts administrator password files and rejects malformed paths and duplicate options',()=>{
  test.assertEqual(Command.parse(['--new','host','--admin-password-file','password.json']).adminPasswordFile,'password.json');test.assertEqual(Command.parse(['--load','host','--admin-password-file','password.json']).adminPasswordFile,'password.json');for(const args of [['--load','host','--admin-password-file'],['--new','host','--admin-password-file',''],['--new','host','--admin-password-file','a','--admin-password-file','b']])rejects(args);
 });
 test.it('reads bounded Unicode JSON passwords and publishes only hashed credentials before listening',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-admin-command-'));try{
   const file=path.join(dir,'password.json');for(const password of ['秘密 admin','', '😀'.repeat(64)]){fs.writeFileSync(file,JSON.stringify(password));test.assertEqual(Command.readAdminPassword(file),password);}
   for(const text of ['{}','null','123','"bad\\npassword"',JSON.stringify('x'.repeat(65)), ' '.repeat(1025)]){fs.writeFileSync(file,text);let rejected=false;try{Command.readAdminPassword(file);}catch(error){rejected=true;}test.assertTrue(rejected);}
   const host=Host.create({numHumans:2,numComputers:0,adminPassword:'秘密 admin'},path.join(dir,'host.json'));test.assertTrue(host.admin.enabled);test.assertEqual(host.server,null);const saved=fs.readFileSync(host.file,'utf8');test.assertFalse(saved.includes('秘密 admin'));test.assertEqual(Host.open(host.file).admin.login({protocol:1,gameId:host.info().gameId,password:'秘密 admin'}).role,'administrator');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 test.it('converts total/AI counts, speed/fog, timer minutes and all setup options',()=>{
  const args=['--new','Host 星.json','--title','Host 星','--players','4','--ais','2','--skill','1','--advantage','-3','--size','5','--density','10','--turn-minutes','10080','--end-early','--slow','--no-fog','--port','65535','--language','ru'],before=JSON.stringify(args),c=Command.parse(args);test.assertEqual(JSON.stringify(args),before);test.assertEqual(c.mode,'new');test.assertEqual(c.port,65535);test.assertEqual(c.language,'ru');test.assertDeepEqual(c.options,{numHumans:2,numComputers:2,fastGame:false,omniscient:true,endEarly:true,maxTimePerTurn:604800,compSkill:1,compAdvantage:-3,density:10,sectorSize:5,hosting:true,gameTitle:'Host 星'});test.assertEqual(new Config(c.options).validate().length,0);
 });
 test.it('defaults to two human players and v3 dedicated fast/fog/unlimited/novice choices',()=>{
  const c=Command.parse(['--new','file']);test.assertEqual(c.port,0);test.assertEqual(c.language,'en');test.assertEqual(c.options.numHumans,2);test.assertEqual(c.options.numComputers,0);test.assertTrue(c.options.fastGame);test.assertFalse(c.options.omniscient);test.assertFalse(c.options.endEarly);test.assertEqual(c.options.maxTimePerTurn,0);test.assertEqual(c.options.compSkill,5);test.assertEqual(c.options.sectorSize,1);test.assertEqual(c.options.density,1);
 });
 test.it('accepts inclusive limits and rejects malformed, unsafe and conflicting options before IO',()=>{
  for(const [key,value] of [['players','0'],['players','100'],['ais','3'],['ais','-1'],['skill','0'],['skill','6'],['advantage','-4'],['advantage','4'],['size','0'],['size','6'],['density','0'],['density','11'],['turn-minutes','-1'],['turn-minutes','150119987580'],['port','65536'],['port','1.5'],['language','it'],['title',''],['title','A'.repeat(28)],['title','bad\nname']])rejects(['--new','file','--'+key,value]);
  for(const args of [[],['--new'],['--new',''],['--new','bad\nfile'],['--new','file','--players','2x'],['--new','file','--load','file2'],['--new','file','--players','3','--players','4'],['--new','file','--slow','--slow'],['--new','file','--unknown'],['--help','--new','file'],['file','-1'],['file','0','it'],['file','0','en','extra']])rejects(args);
  const upper=Command.parse(['--new','file','--players','99','--ais','99','--turn-minutes','150119987579']);test.assertEqual(upper.options.numHumans,0);test.assertEqual(upper.options.numComputers,99);test.assertTrue(Number.isSafeInteger(upper.options.maxTimePerTurn*1000));
 });
 test.it('localizes dedicated help and errors in every supported language while preserving flags',()=>{
  const old=pdg.res.getLanguage();try{for(const language of Command.languages){pdg.res.setLanguage(language);test.assertDeepEqual(Command.parse(['--help','--language',language]),{mode:'help',language});test.assertEqual(Command.language(['--new','file','--bad','--language',language]),language);for(const id of [...Command.helpIds,1106])test.assertTrue(pdg.res.getString(id).length>0);test.assertTrue(pdg.res.getString(1100).includes('--new'));test.assertTrue(pdg.res.getString(1103).includes('--turn-minutes'));}}finally{pdg.res.setLanguage(old);}
 });
 test.it('automatically advances AI-only hosts regardless of timer/endEarly with no login',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-robot-'));try{const host=Host.create({numHumans:0,numComputers:2,sectorSize:1,density:1,maxTimePerTurn:3600,endEarly:false},path.join(directory,'robot.json'));test.assertDeepEqual(host.info().slots,[]);test.assertFalse(host.tick());host.server={};test.assertTrue(host.tick());test.assertEqual(host.game.turn,2);test.assertTrue(host.tick());test.assertEqual(host.game.turn,3);test.assertEqual(Host.open(host.file).game.turn,3);test.assertTrue(host.game.players.slice(1).every(p=>p.isComputer && !p.isLoggedIn));}finally{fs.rmSync(directory,{recursive:true,force:true});}
 });
 test.it('holds AI-only hosts while paused or complete, and stops when only one AI survives',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-robot-'));try{const host=Host.create({numHumans:0,numComputers:2,sectorSize:1,density:1},path.join(directory,'robot.json'));host.server={};host.pauseClock();test.assertFalse(host.tick());host.resumeClock();test.assertTrue(host.tick());host.game.players[2].isAlive=false;host.clock.expired=()=>true;test.assertFalse(host.tick());host.game.players[2].isAlive=true;host.game.isGameOver=true;test.assertFalse(host.tick());}finally{fs.rmSync(directory,{recursive:true,force:true});}
 });
 test.it('retains the exact AI-only turn on failed publication and retries it durably',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-robot-'));try{const host=Host.create({numHumans:0,numComputers:2,sectorSize:1,density:1},path.join(directory,'robot.json'));host.server={};const Save=require('../src/js/game-save.js'),before=Save.serialize(host.game),persist=host.persist;host.persist=()=>{throw Error('disk full');};let code;try{host.tick();}catch(error){code=error.code;}test.assertEqual(code,'host_save_failed');test.assertEqual(Save.serialize(host.game),before);test.assertEqual(fs.readFileSync(host.file,'utf8'),before);host.persist=persist;test.assertTrue(host.tick());test.assertEqual(Host.open(host.file).game.turn,2);}finally{fs.rmSync(directory,{recursive:true,force:true});}
 });
});
