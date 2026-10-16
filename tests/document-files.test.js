const test=require('./test-framework.js'),Files=require('../src/js/document-files.js');
module.exports=()=>test.describe('Cross-platform saved-game files',()=>{
 test.it('suggests portable Unicode names and avoids platform-reserved filenames',()=>{
  test.assertEqual(Files.suggestedName('Game 星'),'Game 星.gad4.json');test.assertEqual(Files.suggestedName('a/b:c*'),'a_b_c_.gad4.json');test.assertEqual(Files.suggestedName('CON'),'Galactica.gad4.json');test.assertEqual(Files.suggestedName('...'),'Galactica.gad4.json');
 });
 // Native PDG runs these promise continuations on its regular application loop;
 // the asynchronous transport assertions live in the dedicated async runner.
});
