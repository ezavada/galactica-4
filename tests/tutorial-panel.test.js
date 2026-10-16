const Panel=require('../src/js/tutorial-panel.js'),Controller=require('../src/js/tutorial-controller.js'),Lessons=require('../src/js/tutorial-lessons.js');
const path=require('path');
module.exports=()=>{const test=require('./test-framework.js');test.describe('Floating tutorial instructions',()=>{
 const measure=(text,size)=>Array.from(text).reduce((n,c)=>n+(/[^\x00-\x7f]/.test(c)?size:size*.6),0);
 const create=(code='en',preferences)=>{const controller=new Controller(Lessons.load(path.join(__dirname,'../data'),code));controller.start({window:34});const owner={controller,stop:r=>controller.stop(r),pressButton:c=>controller.pressButton(c)};return new Panel(owner,{preferences,context:()=>({window:34})});};
 test.it('fits every localized page in normal and narrow ports without overflowing text or adding forward actions',()=>{
  for(const code of ['en','de','es','fr','ja','ru'])for(const screen of [{width:1024,height:768},{width:320,height:480}]){
   const panel=create(code);
   for(const id of panel.owner.controller.pages.keys()){
    panel.owner.controller.goto(id);const layout=panel.layout(screen,measure);
    test.assert(layout.rect.x>=10 && layout.rect.y>=10 && layout.rect.x+layout.rect.width<=screen.width-10 && layout.rect.y+layout.rect.height<=screen.height-10);
    test.assertEqual(!!layout.button,!!panel.owner.controller.page.button);
    for(const line of layout.lines)test.assert(measure(line,14)<=layout.text.width,'Localized line overflow: '+code+' '+id);
    test.assert(layout.text.y+layout.visible*layout.leading<=layout.close.y);
   }
  }
 });
 test.it('consumes instruction clicks but leaves outside map actions untouched and never advances an action wait',()=>{
  const panel=create(),screen={width:1024,height:768};let l=panel.layout(screen,measure);
  test.assertTrue(panel.mouseDown(l.button.x+5,l.button.y+5,screen,measure));test.assertEqual(panel.owner.controller.pageId,3);panel.layout(screen,measure);test.assertTrue(panel.mouseUp());
  l=panel.layout(screen,measure);test.assertEqual(l.button,null);test.assertTrue(panel.mouseDown(l.text.x+5,l.text.y+5,screen,measure));test.assertEqual(panel.owner.controller.pageId,3);panel.mouseUp();
  test.assertFalse(panel.mouseDown(screen.width/2,screen.height/2,screen,measure));
 });
 test.it('avoids covering the active lesson control and persists constrained title dragging',()=>{
  let saved=null;const panel=create('en',{readWindowPosition:()=>null,writeWindowPosition:(name,p)=>{test.assertEqual(name,'tutorial');saved=p;}}),screen={width:1024,height:768};
  const l=panel.layout(screen,measure,[{x:0,y:0,width:600,height:500}]);test.assert(l.rect.x>=600 || l.rect.y>=500);
  panel.mouseDown(l.title.x+5,l.title.y+5,screen,measure,[{x:0,y:0,width:600,height:500}]);test.assertTrue(panel.mouseMove(-900,-900,true));panel.mouseUp();test.assertEqual(saved.x,10);test.assertEqual(saved.y,10);
  test.assertEqual(panel.layout(screen,measure).rect.x,10);
  panel.owner.controller.goto(7);test.assertEqual(panel.layout(screen,measure).rect.y,10);
 });
 test.it('narrows the instruction window to leave centered system-window controls exposed',()=>{
  const panel=create(),screen={width:800,height:600},target={x:240,y:50,width:320,height:540};panel.owner.controller.goto(7);
  const l=panel.layout(screen,measure,[target]);test.assert(l.rect.x+l.rect.width<target.x || l.rect.x>target.x+target.width);test.assert(l.rect.width>=200);
 });
 test.it('scrolls long instructions without zooming and resets scrolling for the next lesson',()=>{
  const panel=create(),screen={width:320,height:180},l=panel.layout(screen,measure);test.assertGreaterThan(l.maxScroll,0);
  test.assertTrue(panel.wheel(l.text.x,l.text.y,1,screen,measure));test.assertGreaterThan(panel.scroll,0);
  test.assertFalse(panel.wheel(500,500,1,screen,measure));
  panel.owner.controller.goto(6);test.assertEqual(panel.layout(screen,measure).scroll,0);
 });
 test.it('cancels through the localized close button and releases instruction capture',()=>{
  const panel=create('ja'),screen={width:1024,height:768},l=panel.layout(screen,measure);let reason;panel.owner.controller.onStop=r=>reason=r;
  panel.mouseDown(l.close.x+3,l.close.y+3,screen,measure);test.assertEqual(reason,'cancel');test.assertFalse(panel.owner.controller.active);test.assertEqual(panel.layout(screen,measure),null);test.assertTrue(panel.mouseUp());
 });
 test.it('refreshes localized instructions without restarting waits, entry effects, sounds or source control destinations',()=>{
  const panel=create(),screen={width:1024,height:768};let entries=0,code='en';panel.owner.controller.onEnter=()=>entries++;
  const controller=panel.owner.controller;controller.goto(7);controller.observe({type:'zoomChanged'},100);controller.alphaId=77;
  panel.options.language=()=>code;panel.options.loadPages=c=>Lessons.load(path.join(__dirname,'../data'),c);
  const state=JSON.stringify(controller.snapshot(200));
  for(code of ['de','es','fr','ja','ru','en']){panel.layout(screen,measure);test.assertEqual(controller.page.language,code);test.assertEqual(JSON.stringify(controller.snapshot(200)),state);test.assertEqual(entries,1);}
  const bad=Lessons.load(path.join(__dirname,'../data'),'de');bad.find(p=>p.id===7).nextPage=60;let rejected=false;try{controller.replacePresentation(bad);}catch(e){rejected=true;}test.assertTrue(rejected);test.assertEqual(controller.page.language,'en');
 });
 test.it('shows every source illustration below the text without covering footer controls, including narrow ports',()=>{
  const Illustrations=require('../src/js/tutorial-illustrations.js');for(const code of ['en','de','es','fr','ja','ru'])for(const screen of [{width:800,height:600},{width:320,height:340}]){
   const panel=create(code),seen=new Set();for(const page of panel.owner.controller.pages.values()){
    panel.owner.controller.goto(page.id);const l=panel.layout(screen,measure);test.assertEqual(!!l.illustration,!!page.picture);if(!page.picture)continue;seen.add(page.picture);
    test.assertTrue(l.illustration.y>=l.text.y+l.text.height);test.assertTrue(l.illustration.y+l.illustration.height<=l.close.y);test.assertTrue(l.illustration.x>=l.rect.x && l.illustration.x+l.illustration.width<=l.rect.x+l.rect.width);
    const before=panel.owner.controller.snapshot(0);panel.mouseDown(l.illustration.x+3,l.illustration.y+3,screen,measure);panel.mouseUp();test.assertEqual(JSON.stringify(panel.owner.controller.snapshot(0)),JSON.stringify(before));
   }test.assertEqual(seen.size,Object.keys(Illustrations.pictures).length);
  }
 });
 test.it('keeps the real Orders control exposed when an illustration enlarges the lesson',()=>{
  const panel=create(),screen={width:800,height:600};panel.owner.controller.goto(16);const inspector={x:16,y:158,width:350,height:274},orders={x:470,y:172,width:94,height:30,interactive:true};
  const l=panel.layout(screen,measure,[inspector,orders]);test.assertTrue(l.rect.x+l.rect.width<=orders.x || l.rect.x>=orders.x+orders.width || l.rect.y+l.rect.height<=orders.y || l.rect.y>=orders.y+orders.height);
 });
 test.it('redraws illustrative control labels in the current language and reuses attributes',()=>{
  const Illustrations=require('../src/js/tutorial-illustrations.js'),previous=pdg.res.getLanguage(),art=new Illustrations(),texts=[];
  const port={getTextWidth:(t,size)=>measure(t,size),drawRect:()=>{},drawCircle:()=>{},drawLine:()=>{},drawText:t=>texts.push(t)};
  try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const id of Object.keys(Illustrations.pictures))art.draw(port,Number(id),{x:0,y:0,width:300,height:art.height(id)});
   for(const id of [836,563,555,451,577,801])test.assertTrue(texts.includes(pdg.res.getString(id)));const styles=art.styles;art.draw(port,7003,{x:0,y:0,width:300,height:42});test.assertTrue(art.styles===styles);texts.length=0;
  }}finally{pdg.res.setLanguage(previous);}
 });
 test.it('wraps paragraphs and Unicode words without splitting surrogate pairs or losing their content',()=>{
  const source='LongUnbrokenText\n日本語の説明🌌星図\n\nChoose a star.';const lines=Panel.wrap(source,40,t=>Array.from(t).length*10);
  test.assertEqual(lines.join('').replace(/\s/g,''),source.replace(/\s/g,''));test.assertTrue(lines.includes(''));test.assertFalse(lines.some(l=>/[\ud800-\udbff]$/.test(l)));
 });
});};
