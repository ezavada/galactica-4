const test=require('./test-framework.js'),Startup=require('../src/js/startup-lifecycle.js');
function browser(initial={}){const values=new Map(Object.entries(initial));return {values,window:{localStorage:{get length(){return values.size;},key:i=>Array.from(values.keys())[i],getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}}};}
module.exports=()=>test.describe('First-install startup lifecycle',()=>{
 test.it('detects fresh browser storage and excludes existing Galactica preferences and unrelated keys',()=>{
  const fresh=browser({'other-app.preference':'on'}),installation=Startup.createInstallation(fresh);test.assertTrue(installation.first);installation.remember();test.assertFalse(Startup.createInstallation(fresh).first);
  for(const key of ['galactica.language','galactica.ShowSplash','galactica.colonyDefaults','galactica.windowPosition.settings'])test.assertFalse(Startup.createInstallation(browser({[key]:'value'})).first);
 });
 test.it('snapshots native configuration existence before preference factories and remembers startup',()=>{
  let exists=false,calls=0,saved=null;const env={pdg:{cfg:{useConfig:name=>{test.assertEqual(name,'Galactica');calls++;const old=exists;exists=true;return old;},setConfigString:(key,value)=>saved=[key,value]}}};
  const first=Startup.createInstallation(env);test.assertTrue(first.first);test.assertEqual(calls,1);first.remember();test.assertEqual(saved.join(','),'installationStarted,true');test.assertFalse(Startup.createInstallation(env).first);
 });
 test.it('delays first tutorial until splash dismissal and starts it once without replay on About close',()=>{
  let tutorials=0,manuals=0,writes=0;const lifecycle=new Startup.StartupLifecycle({first:true,remember:()=>writes++},()=>{tutorials++;return true;},()=>manuals++);
  test.assertFalse(lifecycle.finishIntroduction());test.assertTrue(lifecycle.start(true));test.assertEqual(tutorials,0);test.assertEqual(writes,1);test.assertTrue(lifecycle.finishIntroduction());test.assertEqual(tutorials,1);test.assertEqual(manuals,0);test.assertFalse(lifecycle.finishIntroduction());test.assertFalse(lifecycle.start(true));
 });
 test.it('starts onboarding immediately with splash disabled, and suppresses it after an explicit tutorial request',()=>{
  let calls=0;const create=()=>new Startup.StartupLifecycle({first:true,remember:()=>{}},()=>{calls++;return true;},()=>{});
  const immediate=create();immediate.start(false);test.assertEqual(calls,1);
  const explicit=create();explicit.start(true);explicit.consume();test.assertFalse(explicit.finishIntroduction());test.assertEqual(calls,1);
  const returning=new Startup.StartupLifecycle({first:false,remember:()=>{}},()=>{calls++;return true;},()=>{});returning.start(false);test.assertEqual(calls,1);
 });
 test.it('tries the manual once when tutorial startup rejects or throws',()=>{
  for(const tutorial of [()=>false,()=>{throw Error('unavailable lesson');}]){let calls=0;const lifecycle=new Startup.StartupLifecycle({first:true,remember:()=>{}},tutorial,()=>calls++);lifecycle.start(false);test.assertEqual(calls,1);test.assertFalse(lifecycle.finishIntroduction());test.assertEqual(calls,1);}
 });
 test.it('runs onboarding through the real presentation-close handler and leaves About independent',()=>{
  const preferences=require('../src/js/drawing-preferences.js').createPreferences(browser()),presentation=new (require('../src/js/presentation.js'))(preferences);let tutorials=0;
  const lifecycle=new Startup.StartupLifecycle({first:true,remember:()=>{}},()=>{tutorials++;return true;},()=>{});
  const port={getDrawingArea:()=>new pdg.Rect(800,600)},settings=new (require('../src/js/startup-settings.js'))(port,{drawingPreferences:preferences,presentation,sound:{play:()=>{}},presentationClosed:kind=>{if(kind==='startup')lifecycle.finishIntroduction();}});
  settings.open('startup');lifecycle.start(true);settings.key(pdg.key_Escape);test.assertFalse(settings.active);test.assertEqual(tutorials,1);
  settings.open('about');settings.key(pdg.key_Escape);test.assertFalse(settings.active);test.assertEqual(tutorials,1);
 });
 test.it('does not interrupt launch when installation storage is unavailable',()=>{
  const installation=Startup.createInstallation({window:{get localStorage(){throw Error('denied');}}});test.assertFalse(installation.first);installation.remember();
 });
 test.it('dispatches the configured command once after first-install onboarding or manual fallback',()=>{
  for(const first of [false,true])for(const works of [false,true]){
   const calls=[],lifecycle=new Startup.StartupLifecycle({first,remember:()=>calls.push('remember')},()=>{calls.push('tutorial');return works;},()=>calls.push('manual'),()=>calls.push('action'));
   lifecycle.start(true);test.assertEqual(calls.join(','),'remember');lifecycle.finishIntroduction();lifecycle.finishIntroduction();
   test.assertEqual(calls.join(','),first?'remember,tutorial,'+(works?'':'manual,')+'action':'remember,action');
  }
 });
 test.it('keeps explicit tutorial consumption independent from the once-only startup command',()=>{
  let actions=0,tutorials=0;const lifecycle=new Startup.StartupLifecycle({first:true,remember:()=>{}},()=>tutorials++,()=>{},()=>actions++);
  lifecycle.start(true);lifecycle.consume();lifecycle.finishIntroduction();lifecycle.finishIntroduction();test.assertEqual(actions,1);test.assertEqual(tutorials,0);
 });
 test.it('reads native numeric StartAction and preserves zero and unknown commands',()=>{
  const Actions=require('../src/js/startup-actions.js');
  for(const value of [undefined,0,1,3,10,0x4069FFF9,4020,-1])test.assertEqual(Actions.read({pdg:{cfg:{getConfigLong:key=>{test.assertEqual(key,'StartAction');return value;}}}}),value===undefined?2:value);
 });
 test.it('reads browser numeric StartAction without changing preferences and defaults invalid or unavailable storage',()=>{
  const Actions=require('../src/js/startup-actions.js');
  for(const [value,expected] of [['3',3],['0',0],['4021',4021],['-1',-1],['',2],['3.5',2],['true',2],['2147483648',2],['NaN',2]]){
   const env=browser({'galactica.StartAction':value});test.assertEqual(Actions.read(env),expected);test.assertEqual(env.values.get('galactica.StartAction'),value);
  }
  test.assertEqual(Actions.read(browser()),2);test.assertEqual(Actions.read({window:{get localStorage(){throw Error('denied');}}}),2);
 });
 test.it('routes available numeric app commands without substituting New for unknown or missing handlers',()=>{
  const Actions=require('../src/js/startup-actions.js'),calls=[],services={};
  for(const [name,value] of Object.entries(Actions.commands)){
   services[name]=()=>{calls.push(name);return true;};test.assertTrue(Actions.dispatch(value,services,{}));test.assertEqual(calls[calls.length-1],name);
  }
  const count=calls.length;for(const value of [0,-1,4020,4002,4021,987654])test.assertFalse(Actions.dispatch(value,services,{}));test.assertFalse(Actions.dispatch(1,{},{}));test.assertEqual(calls.length,count);
 });
 test.it('defers browser Open to trusted input, consumes it, and removes both gesture listeners',()=>{
  const Actions=require('../src/js/startup-actions.js'),listeners=new Map();let opens=0,prevented=0,stopped=0;
  const env={document:{addEventListener:(type,handler,capture)=>{test.assertTrue(capture);listeners.set(type,handler);},removeEventListener:(type,handler,capture)=>{test.assertTrue(capture);test.assertEqual(listeners.get(type),handler);listeners.delete(type);}},navigator:{userActivation:{isActive:false}}};
  test.assertTrue(Actions.dispatch(3,{open:()=>{opens++;return true;}},env));test.assertEqual(opens,0);
  const handler=listeners.get('pointerdown');handler({isTrusted:false});test.assertEqual(opens,0);test.assertEqual(listeners.size,2);
  handler({isTrusted:true,preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});test.assertEqual(opens,1);test.assertEqual(prevented,1);test.assertEqual(stopped,1);test.assertEqual(listeners.size,0);
  env.navigator.userActivation.isActive=true;test.assertTrue(Actions.dispatch(3,{open:()=>{opens++;return true;}},env));test.assertEqual(opens,2);test.assertEqual(listeners.size,0);
 });

 test.it('toggles application sound through the source startup command and persists it without feedback or a document',()=>{
  const Actions=require('../src/js/startup-actions.js'),env=browser(),preferences=require('../src/js/drawing-preferences.js').createPreferences(env);let starts=0,stops=0;
  const resources={getSound:()=>({setLooping:()=>{},start:()=>starts++,stop:()=>stops++})},Sound=require('../src/js/sound.js'),audio=Sound.createSound(resources,preferences),services=Actions.preferenceServices(preferences,audio,{});
  audio.play(1001);test.assertEqual(starts,1);test.assertTrue(Actions.dispatch(4017,services,{}));test.assertFalse(audio.isEnabled());test.assertEqual(stops,2);test.assertFalse(Sound.createSound(resources,preferences).isEnabled());
  test.assertTrue(Actions.dispatch(4017,services,{}));test.assertTrue(audio.isEnabled());test.assertTrue(Sound.createSound(resources,preferences).isEnabled());test.assertEqual(starts,1);
 });
 test.it('toggles application flyby help and clears existing hover state through the source command',()=>{
  const Actions=require('../src/js/startup-actions.js'),env=browser(),preferences=require('../src/js/drawing-preferences.js').createPreferences(env),changes=[],services=Actions.preferenceServices(preferences,{}, {},enabled=>changes.push(enabled));
  test.assertTrue(Actions.dispatch(0x4069FFFC,services,{}));test.assertFalse(preferences.readControlHelp());test.assertFalse(require('../src/js/drawing-preferences.js').createPreferences(env).readControlHelp());
  test.assertTrue(Actions.dispatch(0x4069FFFC,services,{}));test.assertTrue(preferences.readControlHelp());test.assertEqual(changes.join(','),'false,true');
 });
 test.it('opens application preferences through the synthetic command explicitly handled by v3',()=>{
  const Actions=require('../src/js/startup-actions.js'),env=browser(),preferences=require('../src/js/drawing-preferences.js').createPreferences(env),presentation=new (require('../src/js/presentation.js'))(preferences),port={getDrawingArea:()=>new pdg.Rect(800,600)},settings=new (require('../src/js/startup-settings.js'))(port,{drawingPreferences:preferences,presentation,sound:{isEnabled:()=>true,play:()=>{}}});
  test.assertTrue(Actions.dispatch(1324679167,Actions.preferenceServices(preferences,{},settings),{}));test.assertTrue(settings.active);test.assertEqual(settings.model.uiWindow,'settings');test.assertEqual(settings.model.turn,1);settings.key(pdg.key_Escape);test.assertFalse(settings.active);
 });

});
