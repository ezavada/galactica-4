const test=require('./test-framework.js'),Presentation=require('../src/js/presentation.js'),Preferences=require('../src/js/drawing-preferences.js');
module.exports=()=>test.describe('Startup and About presentation',()=>{
 test.it('defaults on and persists independently of game saves, including unavailable storage',()=>{
  const values={},env={window:{localStorage:{getItem:k=>values[k],setItem:(k,v)=>values[k]=v}}},prefs=Preferences.createPreferences(env),p=new Presentation(prefs);
  test.assertTrue(p.showSplash);p.toggleSplash();test.assertFalse(p.showSplash);test.assertFalse(new Presentation(Preferences.createPreferences(env)).showSplash);
  const denied=new Presentation(Preferences.createPreferences({window:{get localStorage(){throw Error('denied');}}}));test.assertTrue(denied.showSplash);denied.toggleSplash();test.assertFalse(denied.showSplash);
 });
 test.it('separates splash and About, rejects duplicate openings, and preserves return destination',()=>{
  const p=new Presentation({readSplash:()=>true,writeSplash:()=>{}});test.assertFalse(p.open('invalid',0));test.assertTrue(p.open('about',10,'settings'));test.assertFalse(p.open('startup',20));test.assertEqual(p.kind,'about');test.assertEqual(p.close(),'settings');test.assertTrue(p.open('startup',30));test.assertEqual(p.close(),null);
 });
 test.it('keeps all text accessible with manual paging and reduced motion',()=>{
  const p=new Presentation({readSplash:()=>true,writeSplash:()=>{}});p.open('startup',0);
  test.assertEqual(p.sample(50000,100,10,true),0);p.step(1,10,100);test.assertEqual(p.sample(50000,100,10),170);p.step(100,10,100);test.assertEqual(p.offset,90);p.step(-100,10,100);test.assertEqual(p.offset,0);
  p.close();p.open('about',0);test.assertFalse(p.paused);test.assertTrue(Number.isFinite(p.sample(50000,100,10)));
 });
 test.it('loads complete localized origin story and source credits in every supported language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const p=new Presentation({readSplash:()=>true,writeSplash:()=>{}});p.open('startup',0);test.assertTrue(p.text().length>700);test.assertEqual(p.text().split('\n\n').length,7);p.close();p.open('about',0);test.assertTrue(p.text().includes('Claudio Berni'));test.assertTrue(p.text().includes('Michael Wardman'));test.assertTrue(p.text().includes('Edmund R. Zavada'));}}finally{pdg.res.setLanguage(old);}
 });
 test.it('fits modal content and every action inside desktop and compact viewports',()=>{
  const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
  for(const [width,height] of [[800,600],[320,340]]){
   const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size)=>Array.from(text).length*size*.6};new Display(game);game.presentation=new Presentation({readSplash:()=>true,writeSplash:()=>{}});game.presentation.open('startup',0);game.uiWindow='presentation';
   const r=game.display.getPresentationRect(),c=game.display.getPresentationContent();test.assertTrue(c.height>0 && c.width>0);test.assertTrue(c.y+c.height<=r.y+r.height-42);
   for(const row of game.display.getPresentationActions()){test.assertTrue(row.rect.x>=r.x && row.rect.x+row.rect.width<=r.x+r.width);test.assertTrue(row.rect.y+row.rect.height<=r.y+r.height);test.assertEqual(game.display.getActiveWindowActionAt(row.rect.x+2,row.rect.y+2).type,row.action.type);}
   game.handleCommandWindowKey(pdg.key_RightArrow,'');test.assertTrue(game.presentation.paused);game.handleCommandWindowKey(pdg.key_Escape,'');test.assertEqual(game.uiWindow,null);
  }
 });
});
