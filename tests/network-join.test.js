const test=require('./test-framework.js'),{JoinWindow,errorText}=require('../src/js/network-join.js'),Names=require('../src/js/player-name.js'),I18n=require('../src/js/i18n.js'),Startup=require('../src/js/startup-setup.js');
const info={gameId:'a'.repeat(64),title:'Galaxy',turn:1,slots:Array.from({length:99},(_,i)=>({player:i+1,status:i===0?'open':'occupied',name:'Player '+(i+1),online:false}))};
module.exports=()=>test.describe('Multiplayer admission window',()=>{
 test.it('keeps complete admission feedback inside the window and clear of fields, slots, checks and buttons in all six languages',()=>{
  const language=pdg.res.getLanguage(),window=new JoinWindow({passwordPreferences:{}}),measure=(text,size)=>Array.from(text).length*size/2;
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const [width,height] of [[800,600],[640,340],[320,340]]){for(const mode of ['join','rejoin','administrator']){
   window.open();window.mode=mode;window.info={...info,slots:info.slots.slice(0,8)};
   const ids=mode==='administrator'?[1012,1013,1020,1022,1026,1027,1028,1029,1030,1031,1032,1157,1166]:[1012,1013,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1150];
   for(const id of ids){window.message=I18n.getString(id);const layout=window.layout(width,height,measure);test.assertEqual(layout.statusLines.map(line=>line.text).join(''),window.message);
    for(const line of layout.statusLines){test.assertTrue(measure(line.text,line.size)<=layout.rect.width-48,'Caption width '+lang+' '+mode+' '+id);const top=line.point.y-line.size*.8,bottom=line.point.y+line.size*.2;test.assertTrue(top>=layout.rect.y && bottom<=layout.rect.y+layout.rect.height);
     for(const item of ['fields','slots','checks','choices','buttons','labels'].flatMap(key=>layout[key] || []))test.assertTrue(bottom<=item.rect.y || top>=item.rect.y+item.rect.height,'Caption overlap '+lang+' '+mode+' '+id+' '+width+'x'+height);
    }
   }window.cancel();
  }}}}finally{pdg.res.setLanguage(language);}
 });
 test.it('keeps administrator admission separate from player names and slots and clears mode-switch secrets',()=>{
  const w=new JoinWindow({defaultName:()=> 'Voyager'});w.open({address:'localhost:7777',role:'administrator',gameId:info.gameId});test.assertEqual(w.mode,'administrator');test.assertEqual(w.focus,'password');test.assertEqual(w.name.text,'Voyager');w.info=info;test.assertDeepEqual(w.layout(800,600).fields.map(f=>f.name),['address','password']);test.assertEqual(w.layout(800,600).slots.length,0);test.assertFalse(w.layout(800,600).buttons.some(b=>b.action==='next'));w.key(pdg.key_Tab);test.assertEqual(w.focus,'address');w.key(pdg.key_Tab);test.assertEqual(w.focus,'password');w.password.text='secret';w.action('join');test.assertEqual(w.password.text,'');test.assertNull(w.info);test.assertEqual(w.mode,'join');w.action('administrator');test.assertEqual(w.focus,'password');test.assertEqual(errorText({code:'admin_disabled',message:'private server text'}),I18n.getString(1166));
 });
 test.it('presents the complete inspected public settings and elapsed countdown without inventing missing legacy fields',()=>{
  const Information=require('../src/js/network-game-information.js'),data={...info,humans:99,computers:0,turn:2,sectorSize:5,density:10,skill:1,advantage:3,fastGame:true,fogOfWar:false,endEarly:true,maxTimePerTurn:3600,requiresAdmissionCode:true,clock:{secondsRemaining:315,paused:false,running:true,limitSeconds:172800}};
  const rows=Information.rows(data,100,6100),byKey=key=>rows.find(r=>r.key===key).text;
  test.assertEqual(byKey('map'),I18n.formatString(1231,'',5,10));test.assertEqual(byKey('ai'),I18n.formatString(1232,'',I18n.getString(301),'+3'));
  test.assertEqual(byKey('limit'),I18n.formatString(1236,'','01:00:00'));test.assertEqual(byKey('activeLimit'),I18n.formatString(1237,'',Information.duration(172800)));test.assertEqual(byKey('clock'),I18n.formatString(1045,'','00:05:09'));
  test.assertEqual(byKey('status'),I18n.formatString(1238,'',I18n.getString(1239)));test.assertEqual(byKey('admission'),I18n.formatString(1241,'',I18n.getString(807)));
  const legacy=Information.rows({...info,humans:99,computers:0},0,0);test.assertDeepEqual(legacy.map(r=>r.key),['title','players','status']);
  test.assertEqual(Information.rows({...data,maxTimePerTurn:0,clock:{secondsRemaining:null,paused:false,running:false}},0,0).find(r=>r.key==='limit').text,I18n.formatString(1236,'',I18n.getString(1242)));
 });
 test.it('wraps and pages all localized public information inside compact windows and returns to the same credentials',()=>{
  const old=pdg.res.getLanguage(),Information=require('../src/js/network-game-information.js');
  try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const w=new JoinWindow({defaultName:()=> 'Voyager'});w.open();w.info={...info,title:'星'.repeat(256),humans:99,computers:0,turn:2,sectorSize:5,density:10,skill:1,advantage:-3,fastGame:false,fogOfWar:true,endEarly:false,maxTimePerTurn:172800,requiresAdmissionCode:false,clock:{secondsRemaining:315,paused:true,running:false}};w.password.text='secret';w.page=3;test.assertTrue(w.layout(800,600).buttons.some(b=>b.action==='gameInformation'));test.assertTrue(w.action('gameInformation'));
   const found={},captionPages={};let pages=0;for(;;){const layout=w.layout(320,340,(text,size)=>Array.from(text).length*size/2);test.assertEqual(layout.title,I18n.getString(1229));for(const item of [...layout.labels,...layout.buttons]){const r=item.rect;test.assertTrue(r.x>=layout.rect.x && r.y>=layout.rect.y && r.x+r.width<=layout.rect.x+layout.rect.width+.01 && r.y+r.height<=layout.rect.y+layout.rect.height+.01);if(item.text){test.assertTrue(Array.from(item.text).length*6<=r.width);found[item.key]=(found[item.key] || '')+item.text;(captionPages[item.key] ||= new Set()).add(pages);}}
    const next=layout.buttons.find(b=>b.action==='next');pages++;if(!next || next.disabled)break;test.assertTrue(pages<100);w.action('next');}
   for(const row of Information.rows(w.info,w.inspectedAt)){test.assertEqual(found[row.key],row.text);if(row.key!=='title')test.assertEqual(captionPages[row.key].size,1);test.assertFalse(/undefined|\{\d+\}/.test(row.text));}
   test.assertTrue(pages>1);w.key(pdg.key_Escape);test.assertEqual(w.stage,'form');test.assertTrue(w.active);test.assertEqual(w.password.text,'secret');test.assertEqual(w.name.text,'Voyager');test.assertEqual(w.page,3);w.cancel();
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('opens selected address/name fields and keeps passwords out of the public descriptor',()=>{
  const w=new JoinWindow({defaultName:()=> '航行者'});test.assertTrue(w.open());test.assertEqual(w.name.text,'航行者');test.assertEqual(w.focus,'address');test.assertFalse(w.open());w.cancel();
  w.open({address:'localhost:7777',name:'Jäger',gameId:info.gameId});test.assertEqual(w.mode,'rejoin');test.assertEqual(w.focus,'password');test.assertEqual(w.expectedId,info.gameId);test.assertEqual(w.password.text,'');
 });
 test.it('selects a claimed player for rejoining and clears passwords when switching slots',()=>{
  const w=new JoinWindow({defaultName:()=> 'Voyager'});w.open();w.info=info;w.password.text='secret';w.selectSlot(info.slots[1]);test.assertEqual(w.name.text,'Player 2');test.assertEqual(w.mode,'rejoin');test.assertEqual(w.focus,'password');test.assertEqual(w.password.text,'');
  w.selectSlot(info.slots[0]);test.assertEqual(w.mode,'join');test.assertEqual(w.name.text,'Voyager');test.assertEqual(w.focus,'name');w.busy=true;test.assertFalse(w.selectSlot(info.slots[1]));
 });
 test.it('cycles editable fields and invalidates inspected identity after address changes',()=>{
  const w=new JoinWindow();w.open();w.info=info;w.expectedId=info.gameId;w.address=Names.createEditor('localhost');w.key(65);test.assertNull(w.info);test.assertNull(w.expectedId);test.assertEqual(w.address.text,'A');
  w.key(pdg.key_Tab);test.assertEqual(w.focus,'name');w.key(pdg.key_Tab);test.assertEqual(w.focus,'password');w.key(pdg.key_Tab);test.assertEqual(w.focus,'admissionCode');w.key(pdg.key_Tab);test.assertEqual(w.focus,'address');
 });
 test.it('lays out paged player lists and controls inside constrained viewport sizes',()=>{
  const w=new JoinWindow();w.open();w.info=info;
  for(const [width,height] of [[800,600],[480,360]]){const l=w.layout(width,height);for(const r of [...l.fields,...l.buttons,...l.slots].map(x=>x.rect)){test.assertTrue(r.x>=l.rect.x && r.y>=l.rect.y);test.assertTrue(r.x+r.width<=l.rect.x+l.rect.width+.01 && r.y+r.height<=l.rect.y+l.rect.height+.01);}}
  w.action('next');test.assertEqual(w.layout(800,600).slots[0].slot.player,5);for(let i=0;i<100;i++)w.action('next');test.assertEqual(w.page,24);test.assertEqual(w.layout(800,600).slots.length,3);w.action('previous');test.assertEqual(w.page,23);
 });
 test.it('cancels pending admission, clears the password and preserves the retained view',()=>{
  const w=new JoinWindow();w.open();let options;w.client={disconnect:value=>{options=value;}};w.owned=true;w.password.text='secret';const sequence=w.sequence;
  test.assertTrue(w.cancel());test.assertFalse(w.active);test.assertEqual(w.password.text,'');test.assertTrue(w.sequence>sequence);test.assertDeepEqual(options,{keepView:true});test.assertFalse(w.cancel());
 });
 test.it('uses localized safe messages instead of exposing server text or credentials',()=>{
  test.assertEqual(errorText({code:'bad_password',message:'secret'}),I18n.getString(1022));test.assertEqual(errorText({code:'arbitrary_secret'}),I18n.getString(1032));
  for(const id of [1005,1010,1011,1014,1017,1022,1035,1036])test.assertTrue(I18n.getString(id).length>0);
 });
 test.it('places Join alongside startup controls without overlap',()=>{
  const panel=Startup.panelRect(800,600),buttons=[Startup.tutorialRegion(panel),Startup.settingsRegion(panel),Startup.cancelRegion(panel),Startup.joinRegion(panel),Startup.quitRegion(panel)];
  for(let i=1;i<buttons.length;i++)test.assertTrue(buttons[i].x>=buttons[i-1].x+buttons[i-1].width);test.assertTrue(buttons[4].x+buttons[4].width<=panel.x+panel.width);
 });
});
