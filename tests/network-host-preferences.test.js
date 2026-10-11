const test=require('./test-framework.js'),Prefs=require('../src/js/network-host-preferences.js'),{JoinWindow}=require('../src/js/network-join.js');
function memory(){const store=new Map();return {store,env:{window:{localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}}}};}
const bookmark={address:'localhost:7777',gameId:'a'.repeat(64),role:'player',name:'Voyager',title:'Galaxy'};
module.exports=()=>test.describe('Saved network games',()=>{
 test.it('canonicalizes manual addresses and upgrades them after admission without retaining credentials',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);test.assertTrue(p.upsert({address:'HTTP://LOCALHOST:7777/'}));test.assertTrue(p.upsert({address:'localhost:7777'}));test.assertEqual(p.list().length,1);test.assertNull(p.list()[0].gameId);
  test.assertTrue(p.upsert({...bookmark,password:'private',token:'private',admissionCode:'private'}));test.assertEqual(p.list().length,1);test.assertDeepEqual(Prefs.createPreferences(m.env).list()[0],{...bookmark,address:'http://localhost:7777'});test.assertFalse(m.store.get('galactica.networkHosts').includes('private'));
 });
 test.it('keeps separate games, players and administrator identities and removes only the selected entry',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);for(const row of [bookmark,{...bookmark,name:'Other'},{...bookmark,gameId:'b'.repeat(64)},{...bookmark,role:'administrator'}])test.assertTrue(p.upsert(row));test.assertEqual(p.list().length,4);const selected=p.list()[2];test.assertTrue(p.remove(Prefs.identity(selected)));test.assertEqual(p.list().length,3);test.assertFalse(p.list().some(row=>Prefs.identity(row)===Prefs.identity(selected)));p.upsert({...bookmark,title:'Renamed'});test.assertEqual(p.list().length,3);test.assertEqual(p.list()[0].title,'Renamed');
 });
 test.it('uses native config and preserves unrelated preferences',()=>{
  const values=new Map([['playSound','true']]);let name;const p=Prefs.createPreferences({pdg:{cfg:{useConfig:value=>name=value,getConfigString:key=>values.get(key),setConfigString:(key,value)=>values.set(key,value)}}});test.assertTrue(p.upsert(bookmark));test.assertEqual(name,'Galactica');test.assertEqual(values.get('playSound'),'true');test.assertEqual(p.list()[0].name,'Voyager');
 });
 test.it('rejects invalid identities, strips malformed stored entries and bounds the list',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);for(const row of [null,{address:'http://secret@localhost'},{...bookmark,gameId:'bad'},{...bookmark,role:'owner'},{...bookmark,name:''},{...bookmark,title:'bad\nname'},{address:'localhost',role:'administrator'}])test.assertFalse(p.upsert(row));for(let i=0;i<101;i++)p.upsert({...bookmark,name:'Player '+i});test.assertEqual(p.list().length,100);test.assertEqual(p.list()[0].name,'Player 100');test.assertFalse(p.list().some(row=>row.name==='Player 0'));
  m.store.set('galactica.networkHosts',JSON.stringify([bookmark,bookmark,{...bookmark,name:'bad\nname'}]));test.assertEqual(p.list().length,1);for(const raw of ['bad','{}',' '.repeat(131073)]){m.store.set('galactica.networkHosts',raw);test.assertEqual(p.list().length,0);}
 });
 test.it('does not overwrite a list when storage cannot be read and reports write failures',()=>{
  let writes=0;const p=Prefs.createPreferences({window:{localStorage:{getItem:()=>{throw Error('blocked');},setItem:()=>writes++}}});test.assertEqual(p.list().length,0);test.assertFalse(p.upsert(bookmark));test.assertFalse(p.remove('anything'));test.assertEqual(writes,0);const full=Prefs.createPreferences({window:{localStorage:{getItem:()=>null,setItem:()=>{throw Error('full');}}}});test.assertFalse(full.upsert(bookmark));test.assertFalse(Prefs.createPreferences({}).upsert(bookmark));
 });
 test.it('adds addresses, pages with visible selection, removes entries and preserves them on cancel',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env),w=new JoinWindow({hostPreferences:p});w.open();w.action('savedHosts');w.address.text='bad/path';test.assertFalse(w.action('addSavedHost'));test.assertTrue(w.message.length>0);for(let i=0;i<6;i++){w.address.text='localhost:'+(7777+i);test.assertTrue(w.action('addSavedHost'));}test.assertEqual(w.savedHosts.length,6);w.action('next');test.assertEqual(w.page,1);test.assertEqual(w.savedSelection,w.layout(800,600).choices[0].value);w.key(pdg.key_DownArrow);test.assertEqual(w.savedSelection,w.layout(800,600).choices[1].value);w.action('removeSavedHost');test.assertEqual(p.list().length,5);w.cancel();test.assertEqual(Prefs.createPreferences(m.env).list().length,5);
 });
 test.it('bounds translated rows and controls and disables actions when no entry is available',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env),w=new JoinWindow({hostPreferences:p});w.open();w.action('savedHosts');test.assertTrue(w.layout(800,600).buttons.find(b=>b.action==='chooseSavedHost').disabled);for(let i=0;i<5;i++)p.upsert({...bookmark,name:'Player '+i});w.action('directAddress');w.action('savedHosts');const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const [width,height] of [[800,600],[480,360]]){const l=w.layout(width,height);test.assertEqual(l.title,pdg.res.getString(1183));for(const item of [...l.fields,...l.buttons,...l.choices]){const r=item.rect;test.assertTrue(r.x>=l.rect.x && r.y>=l.rect.y);test.assertTrue(r.x+r.width<=l.rect.x+l.rect.width+.01 && r.y+r.height<=l.rect.y+l.rect.height+.01);}test.assertTrue(l.buttons.find(b=>b.action==='previous').disabled);}}}finally{pdg.res.setLanguage(old);}
 });
 test.it('keeps narrow saved-host feedback and footer fixed while keyboard focus reaches every bookmarked row and the address field',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const m=memory(),p=Prefs.createPreferences(m.env);for(let i=0;i<5;i++)p.upsert({...bookmark,name:'Player '+i});
   const w=new JoinWindow({hostPreferences:p});w.open();w.action('savedHosts');w.message=pdg.res.getString(1188);
   const initial=w.layout(320,340),footer=initial.buttons.filter(b=>!b.body && !b.action.startsWith('scroll'));
   test.assertTrue(initial.compact);test.assertTrue(w.scrollLimit>0);test.assertEqual(initial.choices.length,4);
   test.assertTrue(initial.statusLines[0].point.y-12>=initial.bodyClip.y+initial.bodyClip.height);
   w.key(pdg.key_PageDown);test.assertTrue(w.bodyScroll>0);w.scroll(100000);
   const end=w.layout(320,340);test.assertDeepEqual(end.statusLines,initial.statusLines);test.assertDeepEqual(end.buttons.filter(b=>!b.body && !b.action.startsWith('scroll')),footer);
   w.key(pdg.key_Tab);test.assertEqual(w.focus,'address');const address=w.layout(320,340).fields[0];test.assertTrue(address.rect.y>=initial.bodyClip.y);
   w.key(pdg.key_Tab);for(let i=0;i<4;i++)w.key(pdg.key_DownArrow);test.assertEqual(w.page,1);
   const last=w.layout(320,340),choice=last.choices[0];test.assertEqual(choice.value,w.savedSelection);test.assertTrue(choice.rect.y>=last.bodyClip.y && choice.rect.y+choice.rect.height<=last.bodyClip.y+last.bodyClip.height+.01);
   w.action('removeSavedHost');test.assertEqual(p.list().length,4);test.assertEqual(w.page,0);w.cancel();test.assertEqual(p.list().length,4);
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('clears temporary secrets and inspected clients when opening the saved list',()=>{
  const m=memory(),w=new JoinWindow({hostPreferences:Prefs.createPreferences(m.env)});w.open();let disconnected=0;w.client={disconnect:()=>disconnected++};w.owned=true;w.password.text='secret';w.admissionCode.text='invite';w.info={gameId:bookmark.gameId};w.action('savedHosts');test.assertEqual(disconnected,1);test.assertEqual(w.password.text,'');test.assertEqual(w.admissionCode.text,'');test.assertNull(w.info);test.assertNull(w.client);w.busy=true;test.assertFalse(w.action('directAddress'));w.busy=false;w.action('directAddress');test.assertEqual(w.stage,'form');
 });
});
