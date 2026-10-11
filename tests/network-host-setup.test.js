const test=require('./test-framework.js'),{HostWindow,units}=require('../src/js/network-host-setup.js'),Config=require('../src/js/game-config.js'),Setup=require('../src/js/startup-setup.js'),Documents=require('../src/js/documents.js');
function form(options={}){const backend={supported:true,latest:()=>null},window=new HostWindow(backend,()=>true);window.open(options);return window;}
module.exports=()=>test.describe('Multiplayer Host setup controls',()=>{
 test.it('keeps compact Host drafts scrollable and all measured choices and footer captions separate in six languages',()=>{
  const Caption=require('../src/js/button-caption.js'),original=pdg.res.getLanguage(),measure=(text,size=12)=>Array.from(text).length*size*.65;
  try{for(const language of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(language);const w=form();w.message=pdg.res.getString(1067);const l=w.layout(320,340,measure);
   test.assertTrue(l.compact);test.assertEqual(l.titleHeight,40);test.assertTrue(w.scrollLimit>0);
   for(const item of [...l.fields,...l.checks,...l.choices]){test.assertTrue(item.rect.width>0);test.assertTrue(item.rect.x>=l.bodyClip.x);test.assertTrue(item.rect.x+item.rect.width<=l.bodyClip.x+l.bodyClip.width+.001);}
   const humans=l.fields.find(f=>f.name==='humans'),computers=l.fields.find(f=>f.name==='computers');test.assertTrue(humans.rect.y+humans.rect.height<computers.rect.y);
   for(const action of ['skill','advantage','size','density','unit']){const choices=l.choices.filter(c=>c.action===action);for(let i=0;i<choices.length;i++){const a=choices[i];test.assertTrue(measure(a.label,a.size)+12<=a.rect.width+.001);for(const b of choices.slice(i+1))test.assertTrue(a.rect.y!==b.rect.y || a.rect.x+a.rect.width<=b.rect.x);}}
   for(const b of l.buttons){test.assertTrue(Caption.width(b.label,b.key,measure,{size:b.size})+16<=b.rect.width+.001);test.assertTrue(b.rect.y>=l.bodyClip.y+l.bodyClip.height);test.assertTrue(b.rect.y+b.rect.height<=l.rect.y+l.rect.height-10);}
   for(const line of l.statusLines){test.assertTrue(measure(line.text,12)<=l.rect.width-28+.001);test.assertTrue(line.point.y>l.bodyClip.y+l.bodyClip.height);test.assertTrue(line.point.y<l.buttons[0].rect.y);}
   w.scroll(100000);let end=w.layout(320,340,measure);test.assertTrue(w.bodyScroll>0);test.assertTrue(end.fields.find(f=>f.name==='port').rect.y+26<=end.bodyClip.y+end.bodyClip.height);
   w.focus='title';w.revealFocus=true;const top=w.layout(320,340,measure);test.assertEqual(w.bodyScroll,0);test.assertTrue(top.fields[0].rect.y>=top.bodyClip.y);
   w.key(pdg.key_Tab);const next=w.layout(320,340,measure),field=next.fields.find(f=>f.name===w.focus);test.assertTrue(field.rect.y>=next.bodyClip.y);test.assertTrue(field.rect.y+field.rect.height<=next.bodyClip.y+next.bodyClip.height);
  }}finally{pdg.res.setLanguage(original);}
 });
 test.it('retains compact Open Saved fields and rejects hidden body hit targets through clipping metadata',()=>{
  const w=form();w.cancel();w.openSaved();const l=w.layout(320,340);test.assertTrue(l.compact);test.assertEqual(l.fields.map(f=>f.name).join(','),'file,port');
  test.assertTrue(l.fields.every(f=>f.body));test.assertTrue(l.buttons.every(b=>!b.body));w.key(pdg.key_Escape);test.assertFalse(w.active);test.assertNull(w.layout(320,340));
 });
 test.it('preserves full compact Host metadata and measured commands across local and remote states in six languages',()=>{
  const language=pdg.res.getLanguage(),Caption=require('../src/js/button-caption.js'),measure=(text,size=12)=>Array.from(text).length*size*.65;
  try{for(const lang of ['en','de','es','fr','ja','ru'])for(const remote of [false,true]){pdg.res.setLanguage(lang);
   const w=form(),info={title:'星Host'.repeat(40),address:'http://192.168.123.123:65535',port:65535,file:'/'+('長い名前/'.repeat(100))+'host.json',remoteAdministrator:remote,discovery:'active',info:{humans:3,computers:2,turn:2,clock:{paused:false,secondsRemaining:300}},administration:{complete:false,canContinue:false,players:[],initialState:true}};
   w.record=info;w.stage='hosting';w.backend.describe=()=>info;w.backend.setAdminPassword=()=>{};w.backend.editInitialState=()=>{};
   const feedback=pdg.res.getString(1030),l=w.layout(320,340,measure,feedback);
   test.assertTrue(l.compact);test.assertEqual(l.statusLines.map(line=>line.text).join(''),feedback);
   const content=l.labels.map(label=>label.text).join('');test.assertTrue(content.includes(info.title));test.assertTrue(content.includes(info.address));if(!remote)test.assertTrue(content.includes(info.file));
   test.assertEqual(l.buttons.filter(b=>!b.body).map(b=>b.action).join(','),'stop,cancel');test.assertTrue(w.scrollLimit>0);
   for(const b of l.buttons)test.assertTrue(Caption.width(b.label,b.key,measure,{size:b.size})+16<=b.rect.width+.001);
   test.assertTrue(l.buttons.find(b=>b.action==='initialState').disabled);w.key(pdg.key_PageDown);test.assertTrue(w.bodyScroll>0);
   info.administration.complete=true;const complete=w.layout(320,340,measure);for(const action of ['pause','endNow','settings','players','initialState'])test.assertTrue(complete.buttons.find(b=>b.action===action).disabled);
   if(remote){info.administration.complete=false;info.administration.connected=false;const disconnected=w.layout(320,340,measure,feedback);test.assertTrue(disconnected.buttons.filter(b=>b.body).every(b=>b.disabled));test.assertFalse(disconnected.buttons.find(b=>b.action==='cancel').disabled);}
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('retains compact listen failure feedback and port retry input without losing the host record',()=>{
  const w=form(),info={title:'Failed host',address:null,port:12345,file:'host.json',info:{humans:2,computers:1,turn:1,clock:{paused:false,secondsRemaining:300}},administration:{complete:false,canContinue:false,players:[]}};
  w.record=info;w.stage='hosting';w.backend.describe=()=>info;w.focus='port';w.message=pdg.res.getString(1069);const l=w.layout(320,340);
  test.assertTrue(l.fields.some(f=>f.name==='port'));test.assertTrue(l.buttons.some(b=>b.action==='retry' && b.body));test.assertTrue(l.buttons.find(b=>b.action==='join').disabled);test.assertEqual(l.statusLines.map(line=>line.text).join(''),w.message);test.assertTrue(w.record===info);
 });
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
 test.it('advertises Enter for adding an admission code while keeping it separate from saving policy',()=>{
  const language=pdg.res.getLanguage(),Name=require('../src/js/player-name.js');
  try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const w=form();w.stage='admission';w.admission={allowWithoutCode:true,allowed:[],banned:[]};w.admissionList='allowed';w.admissionSelection=null;w.page=0;w.admissionCode=Name.createEditor('TEST-CODE');
   const rows=w.layout(640,340).buttons;
   test.assertEqual(rows.find(b=>b.action==='admissionAdd').key,'Enter');
   test.assertTrue(!rows.find(b=>b.action==='saveAdmission').key);
   w.key(13);test.assertDeepEqual(w.admission.allowed,['TEST-CODE']);test.assertEqual(w.admissionCode.text,'');test.assertEqual(w.stage,'admission');test.assertFalse(w.busy);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('provides disjoint startup actions and translated bounded Host controls in all six languages',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const w=form(),layout=w.layout(800,600),r=layout.rect;test.assertEqual(layout.title,pdg.res.getString(1050));for(const item of [...layout.fields,...layout.choices,...layout.checks,...layout.buttons]){test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);test.assertTrue((item.label || '').length>0);}
   const rect=Setup.panelRect(800,600),actions=[Setup.tutorialRegion(rect),Setup.settingsRegion(rect),Setup.cancelRegion(rect),Setup.joinRegion(rect),Setup.hostRegion(rect),Setup.quitRegion(rect)];for(let i=1;i<actions.length;i++)test.assertTrue(actions[i].x>=actions[i-1].x+actions[i-1].width);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('routes File Host/H and protects hosted-game shutdown dialogs from cancellation',()=>{
  let opened=0;const docs=new Documents({cancelPick:()=>{}},()=>null,()=>{},()=>{});docs.host=()=>{opened++;return true;};docs.menu();test.assertTrue(docs.layout(800,600).buttons.some(b=>b.action==='host' && b.key==='H'));docs.action('host');docs.key(104);test.assertEqual(opened,2);docs.dialog={kind:'busy',operation:'hostStop',message:'Saving'};test.assertFalse(docs.cancel());test.assertEqual(docs.layout(800,600).buttons.length,0);test.assertEqual(docs.dialog.operation,'hostStop');
 });
 test.it('opens an independent saved-host filename/port editor and offers File Open as host',()=>{
  const w=form();w.cancel();test.assertTrue(w.openSaved());test.assertEqual(w.stage,'open');test.assertEqual(w.focus,'file');test.assertEqual(w.file.text,'');w.key(pdg.key_Tab);test.assertEqual(w.focus,'port');w.key(53);test.assertEqual(w.port.text,'5');w.key(pdg.key_Tab);test.assertEqual(w.focus,'file');w.key(pdg.key_Escape);test.assertFalse(w.active);
  let opened=0;const docs=new Documents({cancelPick:()=>{}},()=>null,()=>{},()=>{});docs.openHost=()=>{opened++;return true;};docs.menu();test.assertTrue(docs.layout(800,600).buttons.some(b=>b.action==='openHost' && b.label===pdg.res.getString(1083)));test.assertTrue(docs.action('openHost'));test.assertEqual(opened,1);
 });
 test.it('keeps saved-host controls in the modal in all languages and disables browser reopening',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const w=form();test.assertTrue(w.layout(800,600).buttons.some(b=>b.action==='openSaved' && b.label===pdg.res.getString(1083)));w.cancel();w.openSaved();const layout=w.layout(800,600),r=layout.rect;test.assertEqual(layout.title,pdg.res.getString(1083));test.assertEqual(r.height,300);test.assertTrue(layout.messageY>layout.fields[1].rect.y-r.y+layout.fields[1].rect.height && layout.messageY<layout.buttons[0].rect.y-r.y);for(const item of [...layout.fields,...layout.buttons])test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);w.backend.supported=false;test.assertTrue(w.layout(800,600).buttons.find(b=>b.action==='resume').disabled);w.busy=true;test.assertFalse(w.cancel());}}
  finally{pdg.res.setLanguage(language);}
 });

 test.it('lays out translated source/turn/player confirmation and independent conversion fields',()=>{
  const language=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);const w=form();w.stage='conversion';w.conversion={token:'offer',title:'Save 星',totalPlayers:3,turn:8};const layout=w.layout(800,600),r=layout.rect;test.assertEqual(layout.title,pdg.res.getString(1090));test.assertEqual(r.height,380);test.assertDeepEqual(layout.fields.map(f=>f.name),['file','humans','port']);test.assertTrue(layout.labels[0].text.includes('8'));for(const item of [...layout.fields,...layout.buttons])test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);test.assertTrue(layout.messageY<layout.buttons[0].rect.y-r.y);w.key(pdg.key_Tab);test.assertEqual(w.focus,'file');}}
  finally{pdg.res.setLanguage(language);}
 });
 test.it('discards the captured conversion on Cancel but keeps it while a conversion is busy',()=>{
  const w=form();let discarded=null;w.backend.discardConversion=token=>{discarded=token;};w.stage='conversion';w.conversion={token:'snapshot'};w.busy=true;test.assertFalse(w.cancel());test.assertEqual(discarded,null);w.busy=false;test.assertTrue(w.cancel());test.assertEqual(discarded,'snapshot');test.assertEqual(w.conversion,null);test.assertFalse(w.active);
 });

 test.it('keeps compact player names complete and commands scrollable with a fixed Close across six languages',()=>{
  const language=pdg.res.getLanguage(),Caption=require('../src/js/button-caption.js'),measure=(text,size=12)=>Array.from(text).length*size*.65;
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const w=form();w.stage='players';w.playerSelection=1;w.page=0;w.playersComplete=false;w.playerList=Array.from({length:7},(_,i)=>({player:i+1,name:i===0?'Commander 星 <Enter>':'Commander 星 '+('Ω'.repeat(20)),isComputer:i>=2,isAlive:true,assigned:true,online:i<2}));
   const l=w.layout(320,340,measure);test.assertTrue(l.compact);test.assertTrue(w.scrollLimit>0);test.assertEqual(l.buttons.filter(b=>!b.body).map(b=>b.action).join(','),'cancel');test.assertEqual(l.choices.map(c=>c.value).join(','),'1,2,3,4');
   for(const c of l.choices){test.assertEqual(c.labelLines.join(''),c.label);test.assertTrue(c.rect.height>=c.labelLines.length*16+8);for(const line of c.labelLines)test.assertTrue(measure(line,12)<=c.rect.width-16+.001);}
   for(const b of l.buttons)test.assertTrue(Caption.width(b.label,b.key,measure,{size:b.size})+16<=b.rect.width+.001);
   test.assertTrue(l.buttons.find(b=>b.action==='player:human').disabled);test.assertFalse(l.buttons.find(b=>b.action==='player:rename').disabled);test.assertFalse(l.buttons.find(b=>b.action==='player:eject').disabled);
   w.key(pdg.key_PageDown);test.assertTrue(w.bodyScroll>0);w.page=1;const page=w.layout(320,340,measure);test.assertEqual(page.choices.map(c=>c.value).join(','),'5,6,7');test.assertTrue(page.choices[0].rect.y>=page.bodyClip.y);test.assertTrue(page.labels.map(x=>x.text).join('').includes(w.playerList[0].name));
   w.key(pdg.key_DownArrow);const keyboard=w.layout(320,340,measure),selected=keyboard.choices.find(c=>c.value===w.playerSelection);test.assertTrue(selected.rect.y>=keyboard.bodyClip.y);test.assertTrue(selected.rect.y+selected.rect.height<=keyboard.bodyClip.y+keyboard.bodyClip.height);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('keeps compact player-name drafts and full current-player labels separate from feedback and Save/Cancel',()=>{
  const language=pdg.res.getLanguage(),measure=(text,size=12)=>Array.from(text).length*size*.65;
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const w=form();w.stage='players';w.playerList=[{player:1,name:'Commander 星 '+('Ω'.repeat(20)),assigned:true,isComputer:false}];w.playerSelection=1;w.playerAction('rename');w.message=pdg.res.getString(1030);const l=w.layout(320,340,measure);
   test.assertTrue(l.compact);test.assertEqual(l.rect.height,300);test.assertEqual(l.fields[0].name,'playerName');test.assertTrue(l.labels.map(x=>x.text).join('').includes(w.playerList[0].name));test.assertEqual(l.statusLines.map(x=>x.text).join(''),w.message);test.assertTrue(l.buttons.every(b=>!b.body));
   w.key(pdg.key_Tab);const focused=w.layout(320,340,measure);test.assertTrue(focused.fields[0].rect.y>=focused.bodyClip.y);test.assertTrue(focused.fields[0].rect.y+26<=focused.bodyClip.y+focused.bodyClip.height);w.cancel();test.assertEqual(w.stage,'players');test.assertEqual(w.playerList[0].name,'Commander 星 '+('Ω'.repeat(20)));
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('keeps compact active Host Settings readable, scrollable and transactional in all languages',()=>{
  const original=pdg.res.getLanguage(),Caption=require('../src/js/button-caption.js'),measure=(text,size=12)=>Array.from(text).length*size*.65;
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const w=form(),info={address:'http://localhost',info:{title:'Host 星',humans:2,computers:1,sectorSize:5,density:10},administration:{complete:false,settingsRevision:4,settings:{compSkill:3,compAdvantage:0,fastGame:true,omniscient:false,maxTimePerTurn:17,endEarly:false}}};
   w.record={};w.backend.describe=()=>info;w.editSettings();w.message=pdg.res.getString(1067);const l=w.layout(320,340,measure);
   test.assertTrue(l.compact);test.assertEqual(l.fields.map(f=>f.name).join(','),'time');test.assertTrue(w.scrollLimit>0);
   test.assertEqual(l.statusLines.map(line=>line.text).join(''),w.message);test.assertTrue(l.buttons.every(b=>!b.body));
   test.assertEqual(l.buttons.map(b=>b.action).join(','),'cancel,saveSettings');test.assertFalse(l.choices.some(c=>['size','density'].includes(c.action)));
   for(const c of l.choices)test.assertTrue(measure(c.label,c.size)+16<=c.rect.width+.001);
   for(const b of l.buttons)test.assertTrue(Caption.width(b.label,b.key,measure,{size:b.size})+16<=b.rect.width+.001);
   const warning=pdg.res.getString(1119);test.assertTrue(l.labels.map(label=>label.text).join('').includes(warning));
   w.key(pdg.key_PageUp);w.layout(320,340,measure);const before=w.bodyScroll;w.key(pdg.key_PageDown);test.assertTrue(w.bodyScroll>before);
   w.key(pdg.key_Tab);const focused=w.layout(320,340,measure),time=focused.fields[0];test.assertTrue(time.rect.y>=focused.bodyClip.y);test.assertTrue(time.rect.y+time.rect.height<=focused.bodyClip.y+focused.bodyClip.height);
   w.message='';w.layout(320,340,measure);w.message=pdg.res.getString(1067);const resized=w.layout(320,340,measure);test.assertTrue(resized.fields[0].rect.y>=resized.bodyClip.y);test.assertTrue(resized.fields[0].rect.y+26<=resized.bodyClip.y+resized.bodyClip.height);
   w.action('skill',1);w.action('fog');test.assertEqual(info.administration.settings.compSkill,3);test.assertFalse(info.administration.settings.omniscient);w.cancel();test.assertEqual(w.stage,'hosting');
  }}finally{pdg.res.setLanguage(original);}
 });
 test.it('edits only active settings and preserves exact second limits without changing the host draft on Cancel',()=>{
  const w=form(),info={address:'http://localhost',info:{title:'Host 星',humans:2,computers:1,sectorSize:1,density:1},administration:{complete:false,settingsRevision:4,settings:{compSkill:3,compAdvantage:0,fastGame:true,omniscient:false,maxTimePerTurn:17,endEarly:false}}};w.record={};w.backend.describe=()=>info;
  test.assertTrue(w.editSettings());test.assertEqual(w.stage,'settings');test.assertEqual(w.unit,4);test.assertEqual(w.time.text,'17');test.assertEqual(w.settingsOptions().maxTimePerTurn,17);test.assertEqual(w.settingsRevision,4);test.assertFalse(w.action('size',3));test.assertFalse(w.action('density',3));w.action('skill',1);test.assertEqual(info.administration.settings.compSkill,3);test.assertTrue(w.cancel());test.assertTrue(w.active);test.assertEqual(w.stage,'hosting');
  w.editSettings();w.action('timed');w.key(65);test.assertEqual(w.time.text,'17');test.assertEqual(w.settingsOptions().maxTimePerTurn,0);w.key(pdg.key_Tab);test.assertEqual(w.stage,'settings');w.cancel();info.administration.complete=true;test.assertFalse(w.editSettings());
 });
 test.it('fits translated active settings controls with fixed title, roster and map labels in all languages',()=>{
  const lang=pdg.res.getLanguage(),w=form();w.record={};w.backend.describe=()=>({address:'http://localhost',info:{title:'Host 星',humans:0,computers:2,sectorSize:1,density:1},administration:{complete:false,settingsRevision:0,settings:{compSkill:3,compAdvantage:0,fastGame:true,omniscient:false,maxTimePerTurn:300,endEarly:false}}});
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);w.editSettings();const l=w.layout(800,600),r=l.rect;test.assertEqual(l.title,pdg.res.getString(1118));test.assertDeepEqual(l.fields.map(f=>f.name),['time']);test.assertFalse(l.choices.some(c=>['size','density'].includes(c.action)));test.assertTrue(l.labels[0].text.includes('Host 星'));test.assertTrue(l.buttons.some(b=>b.action==='saveSettings'));for(const item of [...l.fields,...l.choices,...l.checks,...l.buttons])test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);}}
  finally{pdg.res.setLanguage(lang);}
 });

 test.it('pages Change Player choices, offers only applicable actions and cancels names without touching the host',()=>{
  const w=form(),players=Array.from({length:7},(_,i)=>({player:i+1,name:'Captain '+i,isComputer:i>1,isAlive:i!==4,assigned:i!==1,online:false}));w.record={};w.backend.describe=()=>({address:'http://localhost',info:{turn:8},administration:{complete:false,playersRevision:3,players}});w.editPlayers();test.assertEqual(w.stage,'players');test.assertTrue(w.layout(800,600).buttons.filter(b=>b.action.startsWith('player:')).every(b=>b.disabled));
  w.selectPlayer(1);let l=w.layout(800,600);test.assertTrue(l.buttons.find(b=>b.action==='player:human').disabled);test.assertFalse(l.buttons.find(b=>b.action==='player:computer').disabled);w.playerAction('rename');test.assertEqual(w.stage,'playerName');w.key(65);test.assertEqual(players[0].name,'Captain 0');w.cancel();test.assertEqual(w.stage,'players');w.action('next');test.assertEqual(w.layout(800,600).choices[0].value,5);w.selectPlayer(5);test.assertTrue(w.layout(800,600).buttons.find(b=>b.action==='player:kill').disabled);w.cancel();test.assertEqual(w.stage,'hosting');test.assertTrue(w.active);
 });
 test.it('fits player actions and native-script name editors in all supported languages',()=>{
  const language=pdg.res.getLanguage(),w=form();w.record={};w.backend.describe=()=>({address:'http://localhost',info:{turn:1},administration:{complete:false,playersRevision:0,players:[{player:1,name:'Captain 星',isComputer:false,isAlive:true,assigned:true,online:true}]}});
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);w.editPlayers();w.selectPlayer(1);for(const stage of ['players','playerName']){if(stage==='playerName')w.playerAction('rename');const l=w.layout(800,600),r=l.rect;for(const item of [...l.fields,...l.choices,...l.buttons]){test.assertTrue((item.label || '').length>0);test.assertTrue(item.rect.x>=r.x && item.rect.y>=r.y && item.rect.x+item.rect.width<=r.x+r.width && item.rect.y+item.rect.height<=r.y+r.height);}}w.cancel();w.cancel();}}
  finally{pdg.res.setLanguage(language);}
 });

 test.it('dismisses all nested host dialogs for Quit while preserving the host and deferring busy operations',()=>{
  const w=form();w.record={};w.backend.describe=()=>({address:'http://localhost',info:{turn:1},administration:{complete:false,playersRevision:0,players:[{player:1,name:'Captain',isComputer:false,isAlive:true,assigned:true,online:true}]}});w.editPlayers();w.selectPlayer(1);w.playerAction('rename');w.busy=true;test.assertFalse(w.dismiss());test.assertTrue(w.active);test.assertEqual(w.stage,'playerName');w.busy=false;test.assertTrue(w.dismiss());test.assertFalse(w.active);test.assertNotNull(w.record);
 });

});
