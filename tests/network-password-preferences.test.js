const test=require('./test-framework.js'),Prefs=require('../src/js/network-password-preferences.js'),{JoinWindow}=require('../src/js/network-join.js');
const id={address:'localhost:7777',gameId:'a'.repeat(64),role:'player',name:'Voyager'};
function memory(){const store=new Map();return {store,env:{window:{localStorage:{getItem:key=>store.get(key) || null,setItem:(key,value)=>store.set(key,value)}}}};}
module.exports=()=>test.describe('Opt-in network password preferences',()=>{
 test.it('scopes remembered passwords to the canonical endpoint, game, player and role',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);test.assertNull(p.read(id));test.assertTrue(p.write(id,'unused',false));test.assertEqual(m.store.size,0);test.assertTrue(p.write(id,'秘密 Д',true));test.assertEqual(Prefs.createPreferences(m.env).read({...id,address:'http://LOCALHOST:7777/',name:' Voyager '}),'秘密 Д');for(const other of [{...id,address:'localhost:7778'},{...id,gameId:'b'.repeat(64)},{...id,name:'Other'},{...id,role:'administrator'}])test.assertNull(p.read(other));p.write({...id,role:'administrator'},'admin',true);test.assertEqual(p.read(id),'秘密 Д');test.assertEqual(p.read({...id,role:'administrator',name:'ignored'}),'admin');p.write(id,'秘密 Д',false);test.assertNull(p.read(id));test.assertEqual(p.read({...id,role:'administrator'}),'admin');
 });
 test.it('uses the native application config without altering unrelated preferences',()=>{
  const data=new Map([['Sound','true']]);let app;const p=Prefs.createPreferences({pdg:{cfg:{useConfig:name=>app=name,getConfigString:key=>data.get(key),setConfigString:(key,value)=>data.set(key,value)}}});test.assertTrue(p.write(id,'native',true));test.assertEqual(app,'Galactica');test.assertEqual(p.read(id),'native');test.assertEqual(data.get('Sound'),'true');p.write(id,'',true);test.assertNull(p.read(id));
 });
 test.it('bounds stored entries and rejects malformed identities, passwords and corrupt storage',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);for(const bad of [null,{...id,gameId:'bad'},{...id,role:'owner'},{...id,name:''},{...id,address:'http://user:secret@localhost'}])test.assertFalse(p.write(bad,'secret',true));for(const password of [null,{},'x'.repeat(65),'line\nbreak','bad\u0081'])test.assertFalse(p.write(id,password,true));for(let i=0;i<101;i++)p.write({...id,name:'Player '+i},'test',true);test.assertNull(p.read({...id,name:'Player 0'}));test.assertEqual(p.read({...id,name:'Player 100'}),'test');for(const value of ['bad','{}',JSON.stringify([{...id,password:5}]),' '.repeat(131073)]){m.store.set('galactica.networkPasswords',value);test.assertNull(p.read(id));}
 });
 test.it('keeps admission usable when preference storage is unavailable',()=>{
  const p=Prefs.createPreferences({window:{localStorage:{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('full');}}}});test.assertNull(p.read(id));test.assertFalse(p.write(id,'secret',true));test.assertFalse(Prefs.createPreferences({}).write(id,'secret',true));
 });
 test.it('restores only matching passwords and clears transient credentials across slot, name, address and role changes',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env);p.write(id,'player secret',true);p.write({...id,role:'administrator'},'admin secret',true);const w=new JoinWindow({passwordPreferences:p});w.open(id);test.assertEqual(w.password.text,'player secret');test.assertTrue(w.rememberPassword);w.info={gameId:id.gameId,slots:[]};w.name.selected=true;w.focus='name';w.key(65);test.assertEqual(w.password.text,'');test.assertFalse(w.rememberPassword);w.cancel();w.open(id);w.action('administrator');test.assertEqual(w.password.text,'admin secret');test.assertTrue(w.rememberPassword);w.cancel();w.open({...id,role:'administrator'});test.assertEqual(w.password.text,'admin secret');w.cancel();test.assertEqual(p.read(id),'player secret');test.assertEqual(w.password.text,'');
 });
 test.it('offers a translated bounded checkbox and keyboard access without changing opt-in storage',()=>{
  const m=memory(),p=Prefs.createPreferences(m.env),w=new JoinWindow({passwordPreferences:p});w.open();const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const [width,height] of [[800,600],[480,360]]){const l=w.layout(width,height),c=l.checks[0];test.assertEqual(c.label,pdg.res.getString(1182));test.assertFalse(c.value);test.assertTrue(c.rect.y+c.rect.height<=l.rect.y+l.rect.height);}}}finally{pdg.res.setLanguage(old);}w.focus='admissionCode';w.key(pdg.key_Tab);test.assertEqual(w.focus,'rememberPassword');w.key(32);test.assertTrue(w.rememberPassword);test.assertNull(p.read(id));w.key(pdg.key_Tab);test.assertEqual(w.focus,'address');w.cancel();test.assertNull(p.read(id));
 });
 test.it('keeps checkbox, pagers, errors and action buttons separate with a full player list',()=>{
  const m=memory(),w=new JoinWindow({passwordPreferences:Prefs.createPreferences(m.env)});w.open();w.info={gameId:id.gameId,slots:Array.from({length:99},(_,i)=>({player:i+1,status:'occupied',name:'Player '+i,online:false}))};for(const [width,height] of [[800,600],[480,360]]){const l=w.layout(width,height),checkbox=l.checks[0].rect,pager=l.buttons.find(b=>b.action==='next').rect,submit=l.buttons.find(b=>b.action==='connect').rect;test.assertTrue(l.slots[3].rect.y+l.slots[3].rect.height<pager.y);test.assertTrue(pager.y+pager.height<checkbox.y);test.assertTrue(checkbox.y+checkbox.height<l.rect.y+(l.messageY-12)*l.scale);test.assertTrue(l.rect.y+l.messageY*l.scale<submit.y);}
 });

 test.it('does not overwrite other credentials when existing preferences cannot be read',()=>{
  let writes=0;const p=Prefs.createPreferences({window:{localStorage:{getItem:()=>{throw Error('temporarily unavailable');},setItem:()=>writes++}}});test.assertNull(p.read(id));test.assertFalse(p.write(id,'replacement',true));test.assertFalse(p.write(id,'',false));test.assertEqual(writes,0);
 });

});
