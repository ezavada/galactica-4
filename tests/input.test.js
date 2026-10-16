const test=require('./test-framework.js'),{Input,state,wheel}=require('../src/js/input.js');
module.exports=()=>test.describe('PDG command ownership',()=>{
 const normal={mode:'gameplay',blocked:false,panel:null,text:false};
 function fixture(platform='darwin'){
  const input=new Input(pdg,{platform}),commands=[],local=[];
  return {input,commands,local,key:(unicode,options={},context=normal)=>input.key({unicode,...options},context,name=>commands.push(name),event=>local.push(event.unicode))};
 }
 test.it('dispatches a button action before any keyboard or pointer event',()=>{
  const input=new Input(pdg);try{let calls=0;test.assertEqual(input.action({type:'menu'},()=>++calls),1);test.assertEqual(calls,1);}finally{input.dispose();}
 });
 test.it('maps all Help bindings to one action, isolates Save As, and consumes unsupported chords',()=>{
  const f=fixture();try{
   f.key(pdg.key_F1);f.key(pdg.key_Help);f.key(63,{meta:true,shift:true});
   f.key(83,{meta:true,shift:true});f.key(115,{meta:true});f.key(110,{meta:true});
   f.key(120,{meta:true});
   test.assertEqual(f.commands.join(','),'help,help,help,saveAs,save,new');test.assertEqual(f.local.length,0);
  }finally{f.input.dispose();}
 });
 test.it('allows Help and Quit through modals but blocks gameplay and other app commands',()=>{
  const f=fixture(),modal={mode:'modal',blocked:true,panel:'rename'};try{
   f.key(115,{meta:true},modal);f.key(13,{meta:true},modal);f.key(pdg.key_F2,{},modal);f.key(pdg.key_Tab,{},modal);
   f.key(pdg.key_F1,{},modal);f.key(113,{meta:true},modal);
   test.assertEqual(f.commands.join(','),'help,quit');
  }finally{f.input.dispose();}
 });
 test.it('keeps Enter local, makes End Turn explicit and fresh-press only, and preserves Tab across information panels',()=>{
  const f=fixture();try{
   f.key(13);f.key(13,{meta:true});f.key(13,{meta:true,isRepeating:true});
   f.key(pdg.key_Tab,{}, {...normal,panel:'events'});
   f.key(pdg.key_Tab,{}, {...normal,targeting:true});f.key(13,{meta:true},{...normal,targeting:true});f.key(13,{meta:true},{...normal,dragging:true});
   test.assertEqual(f.commands.join(','),'endTurn,nextAttention');test.assertEqual(f.local.length,0);
   f.input.focus='panel';f.key(13,{}, {...normal,panel:'events'});test.assertEqual(f.local.join(','),'13');
  }finally{f.input.dispose();}
 });
 test.it('repeats only navigation and increments and shifts display toggles to F2-F7',()=>{
  const f=fixture('win32');try{
   f.key(13,{ctrl:true});f.key(pdg.key_F2);f.key(pdg.key_F7);
   f.key(115,{isRepeating:true});f.key(43,{isRepeating:true});f.key(113,{isRepeating:true},{...normal,panel:'production'});
   test.assertEqual(f.commands.join(','),'endTurn,toggleShips,toggleScannerRanges');test.assertEqual(f.local.join(','),'43,113');
  }finally{f.input.dispose();}
 });
 test.it('classifies informational panels independently of system-window styling',()=>{
  const game={uiWindow:'comparison',isAwaitingMapTarget:()=>false};test.assertFalse(state(game).blocked);
  game.uiWindow='rename';test.assertTrue(state(game).text);test.assertTrue(state(game).blocked);
  game.uiWindow='events';game.overlay={type:'lab'};test.assertTrue(state(game).blocked);test.assertEqual(state(game).panel,'lab');game.overlay.type='report';test.assertFalse(state(game).blocked);test.assertEqual(state(game).panel,'report');
 });
 test.it('consumes a hovered panel at its scroll boundary and zooms only outside',()=>{
  let zoom=0,scroll=0;const rect={x:0,y:0,width:100,height:100};
  const game={uiWindow:'course',scrollCourse:()=>{scroll++;return false;},getSelectedStar:()=>null,getSelectedFleet:()=>null,factory:{isShip:()=>false},display:{getActiveWindowRect:()=>rect,containsPoint:(r,x,y)=>!!r && x>=r.x && y>=r.y && x<r.x+r.width && y<r.y+r.height,zoomIn:()=>zoom++,zoomOut:()=>zoom++}};
  wheel(game,{x:10,y:10},-1);test.assertEqual(scroll,1);test.assertEqual(zoom,0);
  wheel(game,{x:200,y:200},-1);test.assertEqual(zoom,1);
  game.overlay={type:'lab'};wheel(game,{x:200,y:200},-1);test.assertEqual(zoom,1);
 });
});
