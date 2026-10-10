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
});
