const test=require('./test-framework.js'),Sound=require('../src/js/sound.js'),Preferences=require('../src/js/drawing-preferences.js'),Common=require('../src/js/common.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Save=require('../src/js/game-save.js');
function fixture(enabled=true) {
 const calls=[],stored=[],sounds=new Map();let tick=null;
 const audio=Sound.createSound({getSound(file){calls.push(['load',file]);const sound={setLooping:v=>calls.push(['loop',file,v]),start:()=>calls.push(['start',file]),stop:()=>calls.push(['stop',file]),setVolume:v=>calls.push(['volume',file,v])};sounds.set(file,sound);return sound;}},{readSound:()=>enabled,writeSound:value=>stored.push(value)},()=>clock,{start:callback=>{tick=callback;return 1;},stop:()=>{tick=null;}});
 return {audio,calls,stored,sounds,tick:()=>{if(tick)tick();},starts:()=>calls.filter(c=>c[0]==='start').map(c=>c[1])};
}
let clock=0;
const visible=events=>({getCurrentMilliseconds:()=>clock,eventLog:events,shouldShowEventWindows:()=>true,isEventAccessible:e=>!!e});
module.exports=()=>test.describe('Shipped sound playback and preferences',()=>{
 test.it('persists independent music choices without muting event effects',()=>{
  const values=new Map(),env={window:{localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}}};
  let preferences=Preferences.createPreferences(env);test.assertTrue(preferences.readMusic());
  preferences.writeMusic(false);preferences=Preferences.createPreferences(env);
  test.assertFalse(preferences.readMusic());test.assertTrue(preferences.readSound());
  const starts=[],resources={getSound:file=>({setLooping:()=>{},setVolume:()=>{},start:()=>starts.push(file),stop:()=>{}})};
  const audio=Sound.createSound(resources,preferences,()=>clock,{start:()=>1,stop:()=>{}});
  test.assertFalse(audio.startMusic());test.assertTrue(audio.play(1001));test.assertEqual(starts.join(','),'sounds/1001.wav');
  audio.endMusic();audio.setMusicEnabled(true);test.assertEqual(starts.length,1);
  test.assertTrue(Preferences.createPreferences(env).readMusic());test.assertTrue(audio.startMusic());
  audio.setMusicEnabled(false);test.assertTrue(audio.isEnabled());test.assertTrue(audio.play(1003));
  test.assertFalse(Preferences.createPreferences(env).readMusic());
 });
 test.it('music changes stop an active fade and resume only an open requested presentation',()=>{
  clock=0;const f=fixture();f.audio.startMusic();f.audio.endMusic();clock=2500;f.tick();
  f.audio.setMusicEnabled(false);clock=6000;f.tick();test.assertFalse(f.audio.update());
  f.audio.setMusicEnabled(true);test.assertEqual(f.starts().length,1);
  f.audio.startMusic();f.audio.setMusicEnabled(false);f.audio.setMusicEnabled(true);
  test.assertEqual(f.starts().length,3);f.audio.setMusicEnabled(true);test.assertEqual(f.starts().length,3);
  f.audio.setEnabled(false);f.audio.setMusicEnabled(true);test.assertEqual(f.starts().length,3);
  f.audio.setEnabled(true);test.assertEqual(f.starts().length,4);
  f.audio.endMusic();f.audio.setMusicEnabled(false);
 });
 test.it('the source combined Sound command writes both persistent flags',()=>{
  const flags={sound:true,music:false},audio=Sound.createSound({getSound:()=>null},{readSound:()=>flags.sound,readMusic:()=>flags.music,writeSound:v=>flags.sound=v,writeMusic:v=>flags.music=v});
  audio.setEnabled(false);test.assertFalse(flags.sound);test.assertFalse(flags.music);
  audio.setEnabled(true);test.assertTrue(flags.sound);test.assertTrue(flags.music);test.assertTrue(audio.isMusicEnabled());
 });
 test.it('offers the translated Music control in standalone and game Settings only',()=>{
  const game=new Game(new Factory(),new Rules(false),new Config({numComputers:0,skipMapGeneration:true}));
  game.port={getDrawingArea:()=>new pdg.Rect(800,600)};new Display(game);
  const f=fixture();game.sound=f.audio;game.uiWindow='settings';
  let region;
  for(let page=0;page<5;page++){game.settingsPage=page;region=game.display.getSettingsActionRegions().find(r=>r.action.type==='toggleMusic');if(region)break;}
  test.assertTrue(!!region);test.assertTrue(region.active);test.assertEqual(region.label,pdg.res.getString(1245));
  test.assertTrue(game.executeUIAction(region.action));test.assertFalse(f.audio.isMusicEnabled());test.assertTrue(f.audio.isEnabled());
  test.assertEqual(f.starts().length,0);game.uiWindow=null;test.assertFalse(game.executeUIAction(region.action));
  test.assertFalse(f.audio.isMusicEnabled());
 });
 test.it('uses native application configuration and tolerates unavailable music preference storage',()=>{
  const values=new Map(),cfg={useConfig:name=>test.assertEqual(name,'Galactica'),getConfigString:key=>values.get(key),setConfigString:(key,value)=>values.set(key,value)};
  let prefs=Preferences.createPreferences({pdg:{cfg}});test.assertTrue(prefs.readMusic());prefs.writeMusic(false);
  prefs=Preferences.createPreferences({pdg:{cfg}});test.assertFalse(prefs.readMusic());test.assertTrue(prefs.readSound());
  prefs.writeMusic(true);test.assertTrue(prefs.readMusic());test.assertEqual(values.get('playMusic'),'true');
  const broken=Preferences.createPreferences({window:{get localStorage(){throw Error('denied');}}});
  broken.writeMusic(false);test.assertTrue(broken.readMusic());
 });
 test.it('loops startup/About music and fades linearly for five seconds without event cues cutting it off',()=>{
  clock=100;const f=fixture();test.assertTrue(f.audio.startMusic());
  test.assertTrue(f.calls.some(c=>c[0]==='loop' && c[1]==='sounds/startup.wav' && c[2]));
  test.assertTrue(f.calls.some(c=>c[0]==='volume' && c[2]===1));
  f.audio.play(1001);f.audio.stop();
  const stops=()=>f.calls.filter(c=>c[0]==='stop' && c[1]==='sounds/startup.wav').length;
  test.assertEqual(stops(),0);test.assertTrue(f.audio.endMusic());clock=2600;test.assertTrue(f.audio.update());
  test.assertEqual(f.calls.filter(c=>c[0]==='volume').slice(-1)[0][2],.5);test.assertEqual(stops(),0);
  test.assertFalse(f.audio.endMusic());clock=5099;f.audio.update();test.assertEqual(stops(),0);
  clock=5100;f.audio.update();test.assertEqual(stops(),1);test.assertFalse(f.audio.update());
 });
 test.it('reopening credits during the opening fade keeps one playback and cancels the old fade',()=>{
  clock=0;const f=fixture();f.audio.startMusic();f.audio.endMusic();
  clock=2500;f.tick();test.assertEqual(f.calls.filter(c=>c[0]==='volume').slice(-1)[0][2],.5);
  test.assertTrue(f.audio.startMusic());
  test.assertEqual(f.starts().length,1);test.assertEqual(f.calls.filter(c=>c[0]==='stop').length,0);
  test.assertEqual(f.calls.filter(c=>c[0]==='volume').slice(-1)[0][2],1);
  clock=10000;f.tick();test.assertFalse(f.audio.update());
  test.assertTrue(f.audio.startMusic());test.assertEqual(f.starts().length,1);
  f.audio.endMusic();clock=15000;f.tick();
  test.assertEqual(f.calls.filter(c=>c[0]==='stop').length,1);
  f.audio.startMusic();test.assertEqual(f.starts().length,2);
 });
 test.it('caches music, resets a pending fade on reopening, and obeys the persistent Sound switch',()=>{
  clock=0;const f=fixture(false);test.assertFalse(f.audio.startMusic());test.assertEqual(f.starts().length,0);
  f.audio.setEnabled(true);test.assertEqual(f.starts().join(','),'sounds/startup.wav');
  f.audio.setEnabled(true);test.assertEqual(f.starts().length,1);
  f.audio.endMusic();clock=2500;f.audio.update();f.audio.startMusic();clock=7500;test.assertFalse(f.audio.update());
  test.assertEqual(f.calls.filter(c=>c[0]==='load').length,1);test.assertEqual(f.starts().length,1);
  test.assertEqual(f.calls.filter(c=>c[0]==='volume').slice(-1)[0][2],1);
  f.audio.setEnabled(false);test.assertFalse(f.audio.update());f.audio.endMusic();f.audio.setEnabled(true);
  test.assertEqual(f.starts().length,1);
 });
 test.it('finishes music fades after a long frame gap and recovers from missing or failed backends',()=>{
  clock=0;const f=fixture();f.audio.startMusic();f.audio.endMusic();clock=20000;f.tick();
  test.assertEqual(f.calls.filter(c=>c[0]==='volume').slice(-1)[0][2],0);test.assertFalse(f.audio.update());
  for(const resources of [{getSound:()=>false},{getSound:()=>{throw Error('unavailable');}}]){
   const audio=Sound.createSound(resources,{readSound:()=>true,writeSound:()=>{}},()=>clock);
   test.assertFalse(audio.startMusic());test.assertFalse(audio.endMusic());test.assertFalse(audio.update());
  }
  const broken=Sound.createSound({getSound:()=>({setLooping:()=>{},setVolume:()=>{throw Error('failed');},stop:()=>{}})},
   {readSound:()=>true,writeSound:()=>{}},()=>clock);test.assertFalse(broken.startMusic());test.assertFalse(broken.endMusic());
 });

 test.it('persists the default-on choice independently of games and survives unavailable storage',()=>{
  const values=new Map(),env={window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}};
  const preferences=Preferences.createPreferences(env);test.assertTrue(preferences.readSound());preferences.writeSound(false);test.assertFalse(Preferences.createPreferences(env).readSound());preferences.writeSound(true);test.assertTrue(preferences.readSound());test.assertTrue(Preferences.createPreferences({}).readSound());
 });
 test.it('caches public PDG sound objects, starts controllable instances and stops them on mute',()=>{
  const f=fixture();test.assertTrue(f.audio.play(1001));test.assertTrue(f.audio.play(1001));test.assertEqual(f.calls.filter(c=>c[0]==='load').length,1);test.assertEqual(f.calls.filter(c=>c[0]==='loop')[0][2],false);
  f.audio.setEnabled(false);test.assertEqual(f.calls[f.calls.length-1][0],'stop');const count=f.calls.length;test.assertFalse(f.audio.play(1000));test.assertEqual(f.calls.length,count);test.assertEqual(f.stored[0],false);f.audio.setEnabled(true);test.assertTrue(f.audio.play(1000));test.assertEqual(f.stored[1],true);test.assertFalse(f.audio.play(9999));
 });
 test.it('selects source recipient cues and leaves source-silent reports silent',()=>{
  const cases=[[{colonization:{},observer:false},1011],[{colonization:{},observer:true},1014],[{occupation:{kind:'capture',side:'attacker'}},1009],[{occupation:{kind:'capture',side:'defender'}},1010],[{occupation:{kind:'capture',side:'observer'}},1014],[{occupation:{kind:'defendersLost',side:'attacker'}},1007],[{occupation:{kind:'defendersLost',side:'defender'}},1008],[{destruction:{side:'winner'}},1007],[{destruction:{side:'loser'}},1008],[{repair:{}},1001],[{type:Common.EventType.NEW_SHIP_CLASS},1011],[{type:Common.EventType.NEW_TECH_DISCOVERY},1013],[{type:Common.EventType.SHIP_BUILT},1001],[{type:'callIn'},1001],[{type:Common.EventType.RENAME_COLONY},1001],[{rendezvousFormation:{}},null],[{systemDefense:{}},null],[{outcome:{}},null],[{combat:{result:'inconclusive'}},null]];
  for(const [event,cue] of cases)test.assertEqual(Sound.eventCue(event),cue);
 });
 test.it('uses recovered private victory/defeat and observer-defeat cues without adding a draw or observer-win cue',()=>{
  for(const [kind,player,viewer,cue] of [['win',1,1,1005],['win',2,1,null],['defeat',1,1,1004],['defeat',2,1,1006],['draw',0,1,null]]){
   const event={id:1,outcome:{kind,playerNum:player}},game={...visible([event]),getCurrentHumanPlayer:()=>viewer},f=fixture(),overlay={type:'outcome',eventId:1};
   test.assertEqual(Sound.eventCue(event,viewer),cue);f.audio.present(game,overlay,false);f.audio.present(game,overlay,false);
   test.assertEqual(f.starts().join(','),cue?'sounds/'+cue+'.wav':'');
   f.audio.present(game,{...overlay,manual:true},false);test.assertEqual(f.starts().length,cue?2:0);
   f.audio.setEnabled(false);f.audio.present(game,{...overlay},false);test.assertEqual(f.starts().length,cue?2:0);
  }
 });
 test.it('plays one explosion then one recipient cue per presentation and restarts manual replays',()=>{
  clock=0;const f=fixture(),event={id:1,destruction:{side:'loser'}},game=visible([event]),overlay={type:'report',eventId:1};
  f.audio.present(game,overlay,true);f.audio.present(game,overlay,true);test.assertEqual(f.starts().join(','),'sounds/1000.wav');clock=600;f.audio.present(game,overlay,false);test.assertEqual(f.starts().length,1);test.assertTrue(f.audio.isPending(overlay));clock=900;f.audio.present(game,overlay,false);f.audio.present(game,overlay,false);test.assertFalse(f.audio.isPending(overlay));test.assertEqual(f.starts().join(','),'sounds/1000.wav,sounds/1008.wav');f.audio.present(game,{...overlay},true);test.assertEqual(f.starts().length,3);
 });
 test.it('does not reveal private or quiet-autoplay reports and never replays muted cues after enabling',()=>{
  const f=fixture(),event={id:1,colonization:{}},game=visible([event]),overlay={type:'report',eventId:1};game.isEventAccessible=()=>false;f.audio.present(game,overlay,false);test.assertEqual(f.starts().length,0);game.isEventAccessible=()=>true;game.shouldShowEventWindows=()=>false;f.audio.present(game,overlay,false);f.audio.attention(game,event);test.assertEqual(f.starts().length,0);game.shouldShowEventWindows=()=>true;f.audio.setEnabled(false);f.audio.present(game,overlay,false);f.audio.setEnabled(true);f.audio.present(game,overlay,false);test.assertEqual(f.starts().length,0);f.audio.setEnabled(false);const explosion={type:'report',eventId:1};f.audio.present(game,explosion,true);f.audio.setEnabled(true);clock+=1000;f.audio.present(game,explosion,false);test.assertEqual(f.starts().length,0);
 });
 test.it('recovers from unavailable audio without changing gameplay',()=>{
  const prefs={readSound:()=>true,writeSound:()=>{}};
  for(const resources of [{getSound:()=>false},{getSound:()=>{throw Error('No backend');}}]){const audio=Sound.createSound(resources,prefs);test.assertFalse(audio.play(1001));audio.setEnabled(false);audio.stop();}
 });
 test.it('uses the real Settings action and keeps audio services out of saved simulation state',()=>{
  const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:1,skipMapGeneration:true})),f=fixture();game.sound=f.audio;game.uiWindow='settings';game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.settingsPage=1;
  const row=display.getSettingsActionRegions().find(r=>r.action.type==='toggleSound');test.assertNotNull(row);test.assertTrue(row.active);game.executeUIAction(row.action);test.assertFalse(f.audio.isEnabled());game.executeUIAction(row.action);test.assertTrue(f.audio.isEnabled());test.assertEqual(f.starts().join(','),'sounds/1001.wav');test.assertFalse(JSON.stringify(Save.snapshot(game)).includes('sounds/1001.wav'));
 });
 test.it('renders Sound and its control help in every supported language',()=>{
  const fs=require('fs'),path=require('path');for(const lang of ['en','de','es','fr','ja','ru']){const text=fs.readFileSync(path.join(__dirname,'../data/',lang==='en'?'strings.txt':'strings-'+lang+'.txt'),'utf8');test.assertTrue(/^954\t.+$/m.test(text));test.assertTrue(/^955\t.+$/m.test(text));}
 });
});
