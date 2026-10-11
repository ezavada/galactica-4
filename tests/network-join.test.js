const test=require('./test-framework.js'),{JoinWindow,errorText}=require('../src/js/network-join.js'),Names=require('../src/js/player-name.js'),I18n=require('../src/js/i18n.js'),Startup=require('../src/js/startup-setup.js');
const info={gameId:'a'.repeat(64),title:'Galaxy',turn:1,slots:Array.from({length:99},(_,i)=>({player:i+1,status:i===0?'open':'occupied',name:'Player '+(i+1),online:false}))};
module.exports=()=>test.describe('Multiplayer admission window',()=>{
 test.it('keeps administrator admission separate from player names and slots and clears mode-switch secrets',()=>{
  const w=new JoinWindow({defaultName:()=> 'Voyager'});w.open({address:'localhost:7777',role:'administrator',gameId:info.gameId});test.assertEqual(w.mode,'administrator');test.assertEqual(w.focus,'password');test.assertEqual(w.name.text,'Voyager');w.info=info;test.assertDeepEqual(w.layout(800,600).fields.map(f=>f.name),['address','password']);test.assertEqual(w.layout(800,600).slots.length,0);test.assertFalse(w.layout(800,600).buttons.some(b=>b.action==='next'));w.key(pdg.key_Tab);test.assertEqual(w.focus,'address');w.key(pdg.key_Tab);test.assertEqual(w.focus,'password');w.password.text='secret';w.action('join');test.assertEqual(w.password.text,'');test.assertNull(w.info);test.assertEqual(w.mode,'join');w.action('administrator');test.assertEqual(w.focus,'password');test.assertEqual(errorText({code:'admin_disabled',message:'private server text'}),I18n.getString(1166));
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
