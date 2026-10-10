const test=require('./test-framework.js'),Version=require('../src/js/application-version.js');
const revision='a123456789abcdef0123456789abcdef01234567';
module.exports=()=>test.describe('Application build identity',()=>{
 test.it('reads native launcher metadata independently of the PDG version pin',()=>{
  const build=Version.info({process:{env:{GALACTICA_BUILD_REVISION:revision,GALACTICA_BUILD_DIRTY:'true',PDG_SOURCE_COMMIT:'b'.repeat(40)}}});test.assertEqual(build.revision,revision);test.assertTrue(build.dirty);
  test.assertEqual(Version.info({process:{env:{PDG_SOURCE_COMMIT:revision}}}),null);
 });
 test.it('uses packaged browser identity instead of the native runtime environment',()=>{
  const build=Version.info({window:{GALACTICA_BUILD_INFO:{revision,dirty:false}},process:{env:{GALACTICA_BUILD_REVISION:'b'.repeat(40),GALACTICA_BUILD_DIRTY:'true'}}});test.assertEqual(build.revision,revision);test.assertFalse(build.dirty);
 });
 test.it('does not present corrupt or unavailable metadata as a valid build',()=>{
  for(const raw of [null,{}, {revision:'not a revision',dirty:false},{revision,dirty:'false'},{revision:revision+'x',dirty:true}])test.assertEqual(Version.normalize(raw),null);
  test.assertEqual(Version.info({get window(){throw Error('unavailable');}}),null);
 });
 test.it('keeps localized Close labels separate from their keyboard hint in compact presentation',()=>{
  const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Caption=require('../src/js/button-caption.js');
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));const measure=(text,size)=>Array.from(text).length*size*.6;game.port={getDrawingArea:()=>new pdg.Rect(320,340),getTextWidth:measure};new Display(game);
   const rows=game.display.getPresentationActions(),close=rows[3],caption=Caption.layout(close.rect,close.label,close.key,measure,{size:12});
   test.assertTrue(caption.labelX-measure(caption.label,12)/2>=close.rect.x+2);test.assertTrue(caption.labelX+measure(caption.label,12)/2<caption.keyX-measure(caption.key,9)-4);
   test.assertTrue(rows[2].rect.x+rows[2].rect.width<close.rect.x);for(let i=1;i<3;i++)test.assertEqual(rows[i].rect.x-rows[i-1].rect.x-rows[i-1].rect.width,6);
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('localizes clean, modified and unknown build labels and fits compact About without losing text',()=>{
  const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   const clean=Version.label({revision,dirty:false}),dirty=Version.label({revision,dirty:true});test.assertTrue(clean.includes(revision.slice(0,12)));test.assertTrue(dirty.includes(pdg.res.getString(987)));test.assertTrue(dirty.length>clean.length);test.assertEqual(Version.label(null),pdg.res.getString(988));
   for(const [width,height] of [[800,600],[320,340]]){const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size)=>Array.from(text).length*size*.6};new Display(game);
    const build={revision,dirty:true},lines=game.display.getPresentationVersionLines(build),r=game.display.getPresentationRect();test.assertEqual(lines.join('').replace(/\s/g,''),dirty.replace(/\s/g,''));for(const line of lines)test.assertTrue(game.port.getTextWidth(line,11)<=r.width-(r.width<480?100:28));
   }
  }}finally{pdg.res.setLanguage(old);}
 });
});
