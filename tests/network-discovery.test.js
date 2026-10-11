const test=require('./test-framework.js'),LAN=require('../src/js/network-discovery.js'),{JoinWindow}=require('../src/js/network-join.js');
const nonce='a'.repeat(16),info={gameId:'b'.repeat(64),title:'Galaxy 星',turn:2,humans:2,computers:1,slots:[{status:'occupied',name:'Private name',password:'secret'},{status:'open'}],requiresAdmissionCode:true};
const text=()=>LAN.announcement(info,7777,nonce),remote={address:'192.168.1.2',port:LAN.port};
function fixture(){let callbacks,closed=0;const discovery={supported:()=>true,browse:value=>{callbacks=value;return {ready:Promise.resolve(),close:()=>closed++};}};const window=new JoinWindow({discovery});window.open();window.action('lan');return {window,send:rows=>callbacks.onChange(rows),fail:()=>callbacks.onError(Error('private details')),closed:()=>closed};}
const row=i=>({...LAN.decode(text(),remote,nonce),instanceId:i.toString(16).padStart(16,'0'),address:'http://192.168.1.'+(i+2)+':7777',title:'Galaxy '+i});
module.exports=()=>test.describe('Native LAN discovery',()=>{
 test.it('bounds announcements to public game metadata and derives endpoints from actual senders',()=>{
  const message=text(),r=LAN.decode(message,remote,nonce);test.assertEqual(r.address,'http://192.168.1.2:7777');test.assertEqual(r.gameId,info.gameId);test.assertEqual(r.open,1);test.assertTrue(r.private);for(const secret of ['Private name','secret','slots','stars','token'])test.assertFalse(message.includes(secret));const extra=JSON.stringify({...JSON.parse(message),address:'http://evil.invalid',password:'secret'});test.assertEqual(LAN.decode(extra,remote,nonce).address,r.address);test.assertFalse('password' in LAN.decode(extra,remote,nonce));test.assertEqual(Array.from(JSON.parse(LAN.announcement({...info,title:'星'.repeat(200)},7777,nonce)).title).length,128);
 });
 test.it('rejects malformed, oversized, incompatible and unsolicited responses and invalid sender addresses',()=>{
  for(const source of ['bad','[]',' '.repeat(2049)])test.assertNull(LAN.decode(source,remote,nonce));for(const change of [{magic:'other'},{protocol:999},{kind:'query'},{nonce:'c'.repeat(16)},{gameId:'bad'},{instanceId:'bad'},{port:0},{port:65536},{turn:0},{humans:100},{open:3},{computers:-1},{private:1},{title:'bad\nname'},{title:'x'.repeat(129)}])test.assertNull(LAN.decode(JSON.stringify({...JSON.parse(text()),...change}),remote,nonce));for(const address of ['0.0.0.0','999.1.1.1','http://localhost','::1','host.invalid'])test.assertNull(LAN.decode(text(),{address},nonce));
 });
 test.it('accepts only bounded protocol-matching nonce queries',()=>{
  const q={magic:LAN.magic,protocol:1,kind:'query',nonce};test.assertEqual(LAN.query(JSON.stringify(q)),nonce);for(const change of [{protocol:0},{nonce:'short'},{kind:'game'},{magic:'other'}])test.assertNull(LAN.query(JSON.stringify({...q,...change})));test.assertNull(LAN.query('bad'));
 });
 test.it('updates live identities, expires missing games and bounds retained discoveries',()=>{
  let now=0;const index=LAN.createIndex({now:()=>now,expiry:100});index.accept(row(0));now=80;index.accept({...row(0),turn:3});index.accept(row(1));test.assertEqual(index.list().length,2);test.assertEqual(index.list()[0].turn,3);now=180;test.assertEqual(index.list().length,0);for(let i=0;i<100;i++)test.assertTrue(index.accept(row(i)));test.assertFalse(index.accept(row(101)));index.clear();test.assertEqual(index.list().length,0);
 });
 test.it('deduplicates multihomed hosts, prefers LAN addresses and expires each address independently',()=>{
  let now=0;const index=LAN.createIndex({now:()=>now,expiry:100}),base=row(0);index.accept({...base,address:'http://127.0.0.1:7777'});index.accept({...base,address:'http://169.254.1.2:7777'});index.accept(base);test.assertEqual(index.list().length,1);test.assertEqual(index.list()[0].address,base.address);const id=LAN.identity(index.list()[0]);now=80;index.accept({...base,address:'http://127.0.0.1:7777'});now=100;test.assertEqual(index.list()[0].address,'http://127.0.0.1:7777');test.assertEqual(LAN.identity(index.list()[0]),id);index.accept({...base,instanceId:'c'.repeat(16)});test.assertEqual(index.list().length,2);now=200;test.assertEqual(index.list().length,0);
 });
 test.it('validates multicast configuration and identifies unsupported browsers',()=>{
  test.assertEqual(LAN.options({}).port,LAN.port);for(const value of [{port:0},{group:'192.168.1.1'},{group:'239.999.1.1'},{interval:0},{interval:1000,expiry:500}]){let caught=false;try{LAN.options(value);}catch(error){caught=true;}test.assertTrue(caught);}test.assertFalse(LAN.supported({document:{}}));test.assertFalse(LAN.supported({window:{}}));test.assertTrue(LAN.supported({}));
 });
 test.it('updates paged selection as hosts arrive, change and disappear',()=>{
  const f=fixture(),w=f.window;f.send(Array.from({length:6},(_,i)=>row(i)));test.assertEqual(w.lanSelection,LAN.identity(row(0)));w.action('next');test.assertEqual(w.page,1);test.assertEqual(w.lanSelection,LAN.identity(row(4)));w.key(pdg.key_DownArrow);test.assertEqual(w.lanSelection,LAN.identity(row(5)));f.send([row(0)]);test.assertEqual(w.page,0);test.assertEqual(w.lanSelection,LAN.identity(row(0)));f.send([]);test.assertNull(w.lanSelection);test.assertTrue(w.layout(800,600).buttons.find(b=>b.action==='chooseLan').disabled);w.cancel();test.assertEqual(f.closed(),1);
 });
 test.it('cancels discovery without letting late callbacks reopen or mutate a dialog',()=>{
  const f=fixture(),w=f.window;f.send([row(0)]);w.action('directAddress');test.assertEqual(w.stage,'form');test.assertEqual(f.closed(),1);const message=w.message;f.fail();f.send([row(1)]);test.assertEqual(w.message,message);test.assertEqual(w.stage,'form');w.cancel();
 });
 test.it('offers translated bounded lists, empty states, errors and browser fallback',()=>{
  const f=fixture(),w=f.window,old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);f.send(Array.from({length:6},(_,i)=>row(i)));for(const [width,height] of [[800,600],[480,360]]){const l=w.layout(width,height);test.assertEqual(l.title,pdg.res.getString(1192));for(const item of [...l.buttons,...l.choices]){const r=item.rect;test.assertTrue(r.x>=l.rect.x && r.y>=l.rect.y);test.assertTrue(r.x+r.width<=l.rect.x+l.rect.width+.01 && r.y+r.height<=l.rect.y+l.rect.height+.01);}}f.fail();test.assertEqual(w.message,pdg.res.getString(1196));const browser=new JoinWindow({discovery:{supported:()=>false,browse:()=>{throw Error('must not create sockets');}}});browser.open();browser.action('lan');test.assertEqual(browser.message,pdg.res.getString(1195));browser.cancel();}}finally{pdg.res.setLanguage(old);w.cancel();}
 });
});
