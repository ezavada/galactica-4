const test=require('./test-framework.js'),{HostWindow,units}=require('../src/js/network-host-setup.js'),Config=require('../src/js/game-config.js'),Setup=require('../src/js/startup-setup.js'),Documents=require('../src/js/documents.js');
function form(options={}){const backend={supported:true,latest:()=>null},window=new HostWindow(backend,()=>true);window.open(options);return window;}
module.exports=()=>test.describe('Multiplayer Host setup controls',()=>{
 test.it('opens an independent multiplayer draft without changing local setup defaults',()=>{
  const source=new Config({numHumans:1,numComputers:98,gameTitle:'Local 星'}),before=JSON.stringify(source),w=form(source);test.assertEqual(w.humans.text,'2');test.assertEqual(w.computers.text,'97');test.assertEqual(JSON.stringify(source),before);test.assertEqual(w.options().config.totalPlayers,99);test.assertEqual(w.title.text,'Local 星');test.assertTrue(w.file.text.endsWith('.gad4.json'));test.assertEqual(w.options().listen.port,0);
 });
 test.it('updates the suggested host filename with title typing while preserving an explicitly edited path',()=>{
  const w=form();w.key(65);test.assertEqual(w.title.text,'A');test.assertEqual(w.file.text,'A.gad4.json');w.focus='file';w.key(66);test.assertEqual(w.file.text,'B');w.focus='title';w.title.selected=true;w.key(67);test.assertEqual(w.title.text,'C');test.assertEqual(w.file.text,'B');
 });
 test.it('validates human/AI limits, total roster, titles, filenames, port and safe time ranges',()=>{
  for(const [key,value] of [['humans','0'],['humans','100'],['humans','2.5'],['computers','99'],['computers','-1'],['title',' '],['file',''],['file','bad\nfile'],['port','65536'],['port','-1'],['time','0'],['time','2.5']]){const w=form();w[key].text=value;test.assertEqual(w.options(),null);}
  const w=form();w.humans.text='99';w.computers.text='1';test.assertEqual(w.options(),null);w.computers.text='0';test.assertEqual(w.options().config.totalPlayers,99);w.port.text='65535';test.assertEqual(w.options().listen.port,65535);w.action('unit',3);w.time.text='99999999';test.assertEqual(w.options(),null);
 });
 test.it('converts all four units and applies v3 endEarly defaults with an explicit unlimited override',()=>{
  const w=form();w.time.text='2';for(let value=0;value<4;value++){w.action('unit',value);test.assertEqual(w.options().config.maxTimePerTurn,2*units[value].multiplier);test.assertEqual(w.config.endEarly,value===0);w.action('endEarly');test.assertEqual(w.config.endEarly,value!==0);}
  w.action('timed');test.assertEqual(w.options().config.maxTimePerTurn,0);test.assertTrue(w.options().config.endEarly);test.assertFalse(w.layout(800,600).fields.some(f=>f.name==='time'));test.assertFalse(w.layout(800,600).checks.some(c=>c.action==='endEarly'));
 });
 test.it('passes map/AI/visibility/speed choices into validated engine setup without mutating other drafts',()=>{
  const w=form(),other=form();for(const [action,value] of [['skill',1],['advantage',3],['size',5],['density',10]])test.assertTrue(w.action(action,value));w.action('fast');w.action('fog');const c=w.options().config;test.assertEqual(c.compSkill,1);test.assertEqual(c.compAdvantage,3);test.assertEqual(c.sectorSize,5);test.assertEqual(c.density,10);test.assertTrue(c.fastGame);test.assertTrue(c.omniscient);test.assertEqual(other.config.sectorSize,1);test.assertFalse(w.action('unit',4));test.assertFalse(w.action('skill',0));
 });
 test.it('retains the chosen timer when opening another host draft and clears form input only on accepted cancellation',()=>{
  const w=form(new Config({hosting:true,maxTimePerTurn:1209600,endEarly:false}));test.assertTrue(w.timed);test.assertEqual(w.unit,3);test.assertEqual(w.time.text,'2');test.assertFalse(w.config.endEarly);w.title.text='Unsaved draft';test.assertFalse(w.open());test.assertEqual(w.title.text,'Unsaved draft');test.assertTrue(w.cancel());test.assertFalse(w.active);
 });
 test.it('blocks cancellation and edits during host creation/stop and keeps keyboard focus constrained to fields',()=>{
  const w=form();w.busy=true;test.assertFalse(w.cancel());test.assertFalse(w.action('unit',2));test.assertFalse(w.open());const before=w.title.text;w.key(65);test.assertEqual(w.title.text,before);w.busy=false;w.key(pdg.key_Tab);test.assertEqual(w.focus,'humans');w.key(51);test.assertEqual(w.humans.text,'3');w.key(pdg.key_Escape);test.assertFalse(w.active);
 });
 test.it('provides disjoint startup actions and translated bounded Host controls in all six languages',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const w=form(),layout=w.layout(800,600),r=layout.rect;test.assertEqual(layout.title,pdg.res.getString(1050));for(const item of [...layout.fields,...layout.choices,...layout.checks,...layout.buttons]){test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);test.assertTrue((item.label || '').length>0);}
   const rect=Setup.panelRect(800,600),actions=[Setup.tutorialRegion(rect),Setup.settingsRegion(rect),Setup.cancelRegion(rect),Setup.joinRegion(rect),Setup.hostRegion(rect),Setup.quitRegion(rect)];for(let i=1;i<actions.length;i++)test.assertTrue(actions[i].x>=actions[i-1].x+actions[i-1].width);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('routes File Host/H and protects hosted-game shutdown dialogs from cancellation',()=>{
  let opened=0;const docs=new Documents({cancelPick:()=>{}},()=>null,()=>{},()=>{});docs.host=()=>{opened++;return true;};docs.menu();test.assertTrue(docs.layout(800,600).buttons.some(b=>b.action==='host' && b.key==='H'));docs.action('host');docs.key(104);test.assertEqual(opened,2);docs.dialog={kind:'busy',operation:'hostStop',message:'Saving'};test.assertFalse(docs.cancel());test.assertEqual(docs.layout(800,600).buttons.length,0);test.assertEqual(docs.dialog.operation,'hostStop');
 });
});
