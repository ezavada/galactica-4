const test=require('./test-framework.js'),Sessions=require('../src/js/game-sessions.js'),Documents=require('../src/js/documents.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Quit=require('../src/js/quit-documents.js'),I18n=require('../src/js/i18n.js');
function fixture(count=2,env={}) {
 const sessions=new Sessions();for(let i=0;i<count;i++){if(i)sessions.begin();sessions.accept(new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:'Game '+i})),{});}
 let exits=0,restores=0;
 const docs=new Documents({cancelPick:()=>{},browser:true},()=>sessions.active,()=>{},()=>{},session=>!!sessions.close(session));
 const flow=new Quit.QuitDocuments(sessions,docs,{activate:session=>{sessions.starting=false;sessions.active=session;return true;},capture:()=>({active:sessions.active,starting:sessions.starting}),restore:state=>{restores++;sessions.active=state.active;sessions.starting=state.starting;},exit:()=>exits++},env);docs.quit=()=>flow.request();
 return {sessions,docs,flow,exits:()=>exits,restores:()=>restores};
}
module.exports=()=>test.describe('Application Quit document decisions',()=>{
 test.it('closes administrator observations without local save prompts while protecting unsaved local games',()=>{
  const f=fixture(2),observer=f.sessions.active;observer.game.clientAdministrator=true;test.assertTrue(f.flow.hasUnsaved());test.assertTrue(f.docs.beginSave());test.assertEqual(f.docs.dialog.message,I18n.getString(1167));f.docs.cancel();test.assertTrue(f.docs.beginRevert());test.assertEqual(f.docs.dialog.message,I18n.getString(1167));f.docs.cancel();test.assertTrue(f.flow.request());test.assertEqual(f.sessions.sessions.length,1);test.assertEqual(f.docs.dialog.kind,'close');test.assertTrue(f.docs.pendingClose!==observer);test.assertEqual(f.exits(),0);f.docs.action('discardClose');test.assertEqual(f.exits(),1);
  const only=fixture(1);only.sessions.active.game.clientAdministrator=true;test.assertFalse(only.flow.hasUnsaved());test.assertTrue(only.docs.beginClose());test.assertNull(only.docs.dialog);test.assertEqual(only.sessions.sessions.length,0);
 });
 test.it('checks the active game first and terminates only after every document is handled',()=>{
  const f=fixture(),last=f.sessions.active;test.assertTrue(f.flow.request());test.assertTrue(f.docs.pendingClose===last);test.assertEqual(f.exits(),0);f.docs.action('discardClose');test.assertEqual(f.sessions.sessions.length,1);test.assertEqual(f.exits(),0);test.assertEqual(f.docs.dialog.kind,'close');f.docs.action('discardClose');test.assertEqual(f.exits(),1);test.assertEqual(f.sessions.sessions.length,0);test.assertNull(f.sessions.active);test.assertFalse(f.flow.request());test.assertEqual(f.exits(),1);
 });
 test.it('canceling the first decision preserves documents and restores the original setup',()=>{
  const f=fixture();f.sessions.begin();const original=f.sessions.active,before=Save.serialize(original.game);f.flow.request();f.docs.key(pdg.key_Escape);test.assertEqual(f.exits(),0);test.assertEqual(f.restores(),1);test.assertTrue(f.sessions.starting);test.assertTrue(f.sessions.active===original);test.assertEqual(Save.serialize(original.game),before);test.assertEqual(f.sessions.sessions.length,2);test.assertEqual(f.flow.state,'idle');test.assertFalse(f.docs.quitPending);
 });
 test.it('canceling a later decision leaves remaining games open without undoing completed closes',()=>{
  const f=fixture();f.flow.request();f.docs.action('discardClose');const remaining=f.sessions.active;f.docs.cancel();test.assertEqual(f.exits(),0);test.assertEqual(f.sessions.sessions.length,1);test.assertTrue(f.sessions.active===remaining);test.assertEqual(f.restores(),0);test.assertEqual(f.flow.state,'idle');
 });
 test.it('closes clean games without prompts or recursive overflow',()=>{
  const f=fixture(150);for(const s of f.sessions.sessions){s.file={name:'Saved'};s.savedContent=Save.contentSignature(s.game);}f.flow.request();test.assertEqual(f.exits(),1);test.assertNull(f.docs.dialog);test.assertEqual(f.sessions.sessions.length,0);
 });
 test.it('terminates once when no game exists, including initial setup',()=>{
  const f=fixture(0);test.assertTrue(f.flow.request());test.assertEqual(f.exits(),1);test.assertFalse(f.flow.request());test.assertEqual(f.exits(),1);
 });
 test.it('does not restart or skip a pending decision and refuses a busy save',()=>{
  const f=fixture(1);f.docs.dialog={kind:'busy',operation:'save'};test.assertFalse(f.flow.request());test.assertEqual(f.flow.state,'idle');f.docs.dialog=null;f.flow.request();const dialog=f.docs.dialog;test.assertFalse(f.flow.request());test.assertTrue(f.docs.dialog===dialog);test.assertEqual(f.exits(),0);
 });
 test.it('warns on browser unload for any unsaved or changed game and for a pending write',()=>{
  const callbacks={},env={window:{addEventListener:(type,fn)=>callbacks[type]=fn}},f=fixture(2,env),unload=()=>{const event={preventDefault(){this.prevented=true;}};callbacks.beforeunload(event);return event;};test.assertTrue(unload().prevented);for(const s of f.sessions.sessions){s.file={name:'Saved'};s.savedContent=Save.contentSignature(s.game);}test.assertFalse(!!unload().prevented);f.sessions.sessions[0].game.turn++;test.assertTrue(unload().prevented);f.sessions.sessions[0].game.turn--;f.docs.dialog={kind:'busy',operation:'save'};test.assertTrue(unload().prevented);test.assertEqual(unload().returnValue,'');
 });
 test.it('includes an unsaved temporary tutorial in browser unload protection',()=>{
  const f=fixture(1),ordinary=f.sessions.active;ordinary.file={name:'Saved'};ordinary.savedContent=Save.contentSignature(ordinary.game);f.sessions.beginTransient();const game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true}));f.sessions.accept(game,{});test.assertTrue(f.flow.hasUnsaved());test.assertEqual(f.flow.next().id,0);f.sessions.endTransient();test.assertFalse(f.flow.hasUnsaved());
 });
 test.it('does not warn after an accepted application exit',()=>{
  const f=fixture(1);f.flow.request();f.docs.action('discardClose');test.assertFalse(f.flow.hasUnsaved());
 });
 test.it('recognizes native command/control Q without consuming plain Q in editors',()=>{
  for(const event of [{meta:true,unicode:113},{ctrl:true,unicode:81},{ctrl:true,unicode:17}])test.assertTrue(Quit.isShortcut(event));for(const event of [{unicode:113},{meta:true,unicode:87},{alt:true,unicode:113},null])test.assertFalse(Quit.isShortcut(event));
 });
 test.it('localizes Quit decisions and advertises File-menu Q in all six languages',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const f=fixture(1);f.docs.menu();const quit=f.docs.layout(480,400).buttons.find(b=>b.action==='quit');test.assertNotNull(quit);test.assertEqual(quit.key,'Q');for(const height of [320,400,600]){const menu=f.docs.layout(480,height);for(const b of menu.buttons){test.assertTrue(b.rect.height>=24);test.assertTrue(b.rect.y+b.rect.height<=menu.rect.y+menu.rect.height-10);}}f.docs.key(113);const layout=f.docs.layout(480,400);test.assertEqual(layout.title,I18n.getString(996));test.assertTrue(layout.message.includes('Game 0'));test.assertEqual(layout.buttons.length,3);f.docs.cancel();}}finally{pdg.res.setLanguage(old);}
 });
});
