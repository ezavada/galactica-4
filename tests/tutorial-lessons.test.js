const test=require('./test-framework.js'),fs=require('fs'),path=require('path'),Lessons=require('../src/js/tutorial-lessons.js'),Controller=require('../src/js/tutorial-controller.js');
const data=path.join(__dirname,'../data'),reference=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-tutorial.json'),'utf8'));
const metadata=()=>JSON.parse(fs.readFileSync(path.join(data,'tutorial/pages.json'),'utf8'));
const language=code=>JSON.parse(fs.readFileSync(path.join(data,'tutorial/languages',code+'.json'),'utf8'));
const rejects=fn=>{let rejected=false;try{fn();}catch(error){rejected=true;}test.assertTrue(rejected);};
module.exports=()=>test.describe('Localized runtime tutorial lessons',()=>{
 test.it('loads every lesson, recovery and platform variant in all six languages without English fallback',()=>{
  const previous=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(code);const pages=Lessons.load(data),r=language(code);test.assertEqual(pages.length,66);
   for(const page of pages){test.assertEqual(page.language,code);test.assertEqual(page.text,r.text[page.textKey]);test.assertEqual(page.title,r.titles[page.titleKey]);test.assertEqual(page.button,page.buttonKey?r.buttons[page.buttonKey]:'');test.assertGreaterThan(page.close.length,0);}
   test.assertTrue(pages.find(p=>p.id===1001).text===pages.find(p=>p.id===1).text);
   if(code!=='en')test.assertFalse(pages.find(p=>p.id===59).text===Lessons.load(data,'en').find(p=>p.id===59).text);
  }}finally{pdg.res.setLanguage(previous);}
 });
 test.it('preserves the source action waits, transitions, recovery exceptions and sounds for every language',()=>{
  for(const code of ['en','de','es','fr','ja','ru'])for(const page of Lessons.load(data,code)){
   const original=reference.languages.en.pages.find(p=>p.id===page.id);
   for(const key of ['id','variant','binding','nextPage','exceptions','sound','picture'])test.assertEqual(JSON.stringify(page[key]),JSON.stringify(original[key]));
   test.assertEqual(!!page.button,!!original.button);
  }
 });
 test.it('uses the same localized start, action-only waits, retry and completion behavior on both platform modes',()=>{
  for(const code of ['en','de','es','fr','ja','ru'])for(const macOS of [false,true]){
   const t=new Controller(Lessons.load(data,code),{macOS});t.start({window:1});test.assertEqual(t.pageId,100);t.pressButton();test.assertEqual(t.pageId,1);test.assertEqual(t.page.language,code);
   t.pressButton({window:34});test.assertEqual(t.pageId,3);test.assertFalse(t.pressButton());t.observe({type:'setupAccepted',window:4});test.assertEqual(t.pageId,4);
   t.goto(18);test.assertTrue(t.pressButton());test.assertEqual(t.pageId,16);t.goto(60);test.assertTrue(t.pressButton());test.assertFalse(t.active);
  }
 });
 test.it('rejects missing, mismatched and blank translations instead of silently leaving English instructions',()=>{
  for(const mutate of [r=>delete r.text['41'],r=>r.text['55']=' ',r=>delete r.titles.compare,r=>r.buttons.retry='',r=>r.buttons.next='Next',r=>r.language='xx']){
   const r=language('ja');mutate(r);rejects(()=>Lessons.decode(metadata(),r));
  }
  const m=metadata();m.pages.pop();rejects(()=>Lessons.decode(m,language('en')));
  const duplicate=metadata();duplicate.pages[1]=duplicate.pages[0];rejects(()=>Lessons.decode(duplicate,language('en')));
  const broken=metadata();broken.pages[0].exceptions[0].page=102;rejects(()=>Lessons.decode(broken,language('en')));
 });
 test.it('returns independent page objects and restricts unsupported language filenames to the normal English default',()=>{
  const a=Lessons.load(data,'de');a[0].size.width=99;a[0].exceptions.length=0;const b=Lessons.load(data,'de');test.assertFalse(b[0].size.width===99);test.assertGreaterThan(b[0].exceptions.length,0);test.assertEqual(Lessons.load(data,'../../other')[0].language,'en');
 });
 test.it('explains current controls and intentional v4 behavior throughout the English instructions',()=>{
  const pages=Lessons.load(data,'en'),find=id=>pages.find(p=>p.id===id).text;
  test.assertContains(find(11),'solid slider fill');test.assertContains(find(13),'Enter or Escape');test.assertFalse(find(13).includes('<tab>'));test.assertContains(find(20),'press =');test.assertContains(find(31),'Scout');test.assertContains(find(38),'map');test.assertContains(find(41),'Set');test.assertContains(find(50),'command menu');test.assertContains(find(58),'Exchange');test.assertContains(find(60),'stays open');test.assertContains(find(100),'Open games');
 });
});
