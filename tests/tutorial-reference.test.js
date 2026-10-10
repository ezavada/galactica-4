const test=require('./test-framework.js'),fs=require('fs'),path=require('path');
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-tutorial.json'),'utf8'));
module.exports=()=>test.describe('Original interactive tutorial port reference',()=>{
 test.it('retains the sixty-lesson sequence and macOS alternate pages in both source languages',()=>{
  test.assertEqual(reference.lessonCount,60);test.assertEqual(reference.macOSOverrides.join(','),'1001,1002,1060');
  for(const lang of ['en','de']){const pages=reference.languages[lang].pages,ids=new Set(pages.map(p=>p.id));test.assertEqual(pages.length,66);for(let id=1;id<=60;id++)test.assertTrue(ids.has(id));for(const p of pages){test.assertGreaterThan(p.text.length,0);test.assertTrue(p.nextPage===-1||p.nextPage===0||ids.has(p.nextPage));for(const e of p.exceptions)test.assertTrue(e.page===-1||e.page===0||ids.has(e.page));test.assertEqual(p.pageResourceSha256.length,64);test.assertEqual(p.textResourceSha256.length,64);}}
 });
 test.it('preserves the actual gameplay lessons and waits rather than converting them into Next-only pages',()=>{
  const pages=reference.languages.en.pages,find=id=>pages.find(p=>p.id===id);
  test.assertEqual(find(10).button,'');test.assertEqual(find(10).binding,2501);test.assertContains(find(10).text.toLowerCase(),'ship');test.assertEqual(find(60).nextPage,-1);test.assertEqual(find(1060).nextPage,-1);test.assertContains(find(50).text,'Compare Players');test.assertContains(find(38).text,'Rendezvous');test.assertContains(find(59).text,'Health Bar');test.assertEqual(find(100).title,null);test.assertEqual(find(1).exceptions.length,4);
 });
 test.it('identifies the saved fixture and deterministic v3 tutorial random seed',()=>{
  test.assertEqual(reference.fixture.signature,'game');test.assertEqual(reference.fixture.bytes,6184);test.assertEqual(reference.fixture.seed,101);test.assertEqual(reference.fixture.sha256,'56ff62f6dfdf2336ea4a3efa8c0a7c64c9c9aef05a970f3aceb5ad53530aad5d');test.assertEqual(reference.languages.en.source,'Resources/gal-tutorial-en.r');
 });
});
