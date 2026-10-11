const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture(zoom){const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true})),lines=[];game.port={getDrawingArea:()=>new pdg.Rect(800,600),drawLine:(a,b,style)=>lines.push({a,b,style})};const display=new Display(game);display.camera.setZoom(zoom);display.camera.centerOn(400000,300000);return {game,display,lines};}
module.exports=()=>test.describe('V3 zoom-dependent map grid',()=>{
 test.it('draws sector tenths and hundredths at source spacing without duplicate boundaries',()=>{
  const {display,lines}=fixture(2);display.drawGrid();
  test.assertTrue(lines.length>50);test.assertTrue(lines.some(l=>l.style===display.styles.gridLines[0]));test.assertTrue(lines.some(l=>l.style===display.styles.gridLines[1]));
  const positions=new Set();for(const l of lines){const vertical=l.a.x===l.b.x,pos=vertical?l.a.x:l.a.y;test.assertTrue(pos>=0 && pos<=(vertical?800:600));const key=(vertical?'x':'y')+pos.toFixed(4);test.assertFalse(positions.has(key));positions.add(key);const coordinate=vertical?display.toGalacticX(pos):display.toGalacticY(pos);test.assertApproximately(coordinate/(1048576/100),Math.round(coordinate/(1048576/100)),.0001);}
 });
 test.it('omits levels below ten pixels and derives neutral brightness from source spacing',()=>{
  for(const zoom of [.1,.97,.98,1,2,10]){const {display,lines}=fixture(zoom);display.drawGrid();for(let level=0;level<3;level++){const pixels=1024*zoom/Math.pow(10,2-level),style=display.styles.gridLines[level];if(pixels<10)test.assertFalse(lines.some(l=>l.style===style));else{const expected=Math.min(0x6666,Math.trunc((pixels-10)*0x33))/65535,color=style.getLineColor();test.assertApproximately(color.red,expected,.0001);test.assertApproximately(color.green,expected,.0001);test.assertApproximately(color.blue,expected,.0001);}}test.assertTrue(lines.length<=150);}
 });
 test.it('keeps grid lines aligned after panning and honors the saved grid toggle',()=>{
  const {game,display,lines}=fixture(2);display.camera.pan(53,-37);display.drawGrid();test.assertTrue(lines.length>0);
  for(const l of lines){const coordinate=l.a.x===l.b.x?display.toGalacticX(l.a.x):display.toGalacticY(l.a.y);test.assertApproximately(coordinate/(1048576/100),Math.round(coordinate/(1048576/100)),.0001);}
  game.showGrid=false;lines.length=0;display.drawGrid();test.assertEqual(lines.length,0);
 });
});
