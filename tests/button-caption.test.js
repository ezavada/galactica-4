const test=require('./test-framework.js'),Caption=require('../src/js/button-caption.js'),I18n=require('../src/js/i18n.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size)=>Array.from(String(text)).length*size*.6};return {game,display:new Display(game)};}
module.exports=()=>test.describe('Compact button shortcut hints',()=>{
 test.it('separates prefix, suffix, alternate and explicit shortcuts without changing ordinary angle-bracket names',()=>{
  test.assertEqual(Caption.parts('<Enter> Start').label,'Start');test.assertEqual(Caption.parts('<Enter> Start').key,'Enter');
  test.assertEqual(Caption.parts('Show grid <F3>').key,'F3');test.assertEqual(Caption.parts('<V>/<Esc> Close comparison').key,'V / Esc');
  test.assertEqual(Caption.parts('End turn','Enter').label,'End turn');test.assertEqual(Caption.parts('Visit <Andromeda>').label,'Visit <Andromeda>');
  test.assertEqual(Caption.parts('Title: <Andromeda> <T>').label,'Title: <Andromeda>');test.assertEqual(Caption.tooltip('<Esc> Close'), 'Close · Esc');
 });
 test.it('draws labels and shortcuts at separate sizes and reserves space so they cannot overlap',()=>{
  const {display:d}=fixture(),draws=[];d.drawRoundedRect=()=>{};d.drawTextLine=(text,x,y,color,size,style)=>draws.push({text,x,y,color,size,style});
  const label='A longer translated button',key='Enter',width=d.getButtonWidth(label,key),rect={x:30,y:50,width,height:30};
  d.drawUIButton(rect,label,key);const hint=draws.find(draw=>draw.text===key),caption=draws.find(draw=>draw.text===label);
  test.assertEqual(hint.size,9);test.assertEqual(hint.style,pdg.textStyle_RightJustified);test.assertEqual(hint.x,rect.x+rect.width-8);test.assertEqual(caption.size,11);
  test.assertTrue(caption.x+d.port.getTextWidth(label,11)/2<hint.x-d.port.getTextWidth(key,9));test.assertTrue(draws.every(draw=>!draw.text.includes('<')));
 });
 test.it('renders translated Close and Start buttons with compact hints in all six languages',()=>{
  const previous=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(language);for(const id of [528,531,545]){const label=I18n.getString(id),caption=Caption.parts(label);test.assertTrue(!!caption.key);test.assertFalse(caption.label.includes('<'));test.assertFalse(caption.label.includes('>'));
    const {display:d}=fixture(),draws=[];d.drawRoundedRect=()=>{};d.drawTextLine=(text,x,y,color,size)=>draws.push({text,size});d.drawUIButton({x:20,y:20,width:d.getButtonWidth(label),height:30},label);
    test.assertTrue(draws.some(draw=>draw.text===caption.label&&draw.size===11));test.assertTrue(draws.some(draw=>draw.text===caption.key&&draw.size===9));
   }
  }}finally{pdg.res.setLanguage(previous);}
 });
 test.it('reserves and draws multi-character hints for icon buttons without colliding with their icons',()=>{
  const {display:d}=fixture(),draws=[],icons=[];d.drawRoundedRect=()=>{};d.drawTextLine=(text,x,y,color,size)=>draws.push({text,x,size});d.drawUIIcon=(name,x,y)=>icons.push({name,x,y});
  const width=d.getButtonWidth('Home','Home',{iconOnly:true});d.drawUIButton({x:20,y:30,width,height:30},'Home','Home',{icon:'home',iconOnly:true});
  test.assertEqual(draws.length,1);test.assertEqual(draws[0].text,'Home');test.assertEqual(draws[0].size,9);test.assertTrue(icons[0].x+7<draws[0].x-d.port.getTextWidth('Home',9));
 });
});
