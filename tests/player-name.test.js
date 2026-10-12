const test=require('./test-framework.js'),Name=require('../src/js/player-name.js'),Config=require('../src/js/game-config.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),I18n=require('../src/js/i18n.js');
module.exports=()=>test.describe('New game player name',()=>{
 test.it('selects the existing name and replaces it without activating setup shortcuts',()=>{
  const editor=Name.createEditor('Previous');Name.edit(editor,67);Name.edit(editor,65);Name.edit(editor,82);
  test.assertEqual(editor.text,'CAR');test.assertFalse(editor.selected);test.assertEqual(editor.caret,3);Name.edit(editor,32);Name.edit(editor,67);test.assertEqual(editor.text,'CAR C');
 });
 test.it('edits Unicode code points, moves the caret and deletes in both directions',()=>{
  const editor=Name.createEditor('Old');Name.edit(editor,'星');Name.edit(editor,'😀');Name.edit(editor,'α');
  test.assertEqual(editor.text,'星😀α');Name.edit(editor,pdg.key_LeftArrow);Name.edit(editor,8);test.assertEqual(editor.text,'星α');
  Name.edit(editor,pdg.key_Home);Name.edit(editor,pdg.key_Delete);test.assertEqual(editor.text,'α');
  Name.edit(editor,pdg.key_End);Name.edit(editor,'Ю');test.assertEqual(editor.text,'αЮ');
 });
 test.it('enforces the v3 32-character limit and rejects blank/control-containing names',()=>{
  const editor=Name.createEditor('');editor.selected=false;for(let i=0;i<33;i++)Name.edit(editor,'界');test.assertEqual(Array.from(editor.text).length,32);
  test.assertTrue(Name.validName(editor.text));test.assertFalse(Name.validName(editor.text+'界'));
  for(const name of ['', '   ',null,4,'a\nb','a\u007fb'])test.assertFalse(Name.validName(name));
 });
 test.it('returns submit/cancel without altering the name and consumes navigation/function keys',()=>{
  const editor=Name.createEditor('Captain');test.assertEqual(Name.edit(editor,13),'submit');test.assertEqual(Name.edit(editor,pdg.key_Escape),'cancel');
  Name.edit(editor,pdg.key_F1);test.assertEqual(editor.text,'Captain');Name.edit(editor,pdg.key_Tab);Name.edit(editor,8);test.assertEqual(editor.text,'');
 });
 test.it('keeps the caret and text within a measured Unicode viewport',()=>{
  const editor=Name.createEditor('界'.repeat(32)),measure=text=>Array.from(text).length*14;
  let visible=Name.visibleText(editor,140,measure);test.assertTrue(measure(visible.text)<=140);test.assertEqual(visible.caret,140);
  editor.caret=0;visible=Name.visibleText(editor,140,measure);test.assertEqual(visible.caret,0);test.assertEqual(Array.from(visible.text).length,10);
 });
 test.it('applies custom human names during player initialization and map generation without changing AI faction naming',()=>{
  const names={1:'星の船長',2:'Капитан'},config=new Config({numHumans:2,numComputers:1,humanPlayerNames:names,sectorSize:1});
  const game=new Game(new Factory(),new Rules(false),config);
  test.assertEqual(game.players[1].name,names[1]);test.assertEqual(game.players[2].name,names[2]);test.assertTrue(game.players[3].name.length>0);
  test.assertTrue(game.getPlayerComparisonRows().some(row=>row.playerNum===1&&row.name===names[1]));
  test.assertEqual(game.config.humanPlayerNames[1],names[1]);test.assertEqual(config.validate().length,0);
  for(const invalid of [{1:''},{2:'Outside slot'},{1:'x'.repeat(33)},{1:'A\nB'}])test.assertTrue(new Config({numHumans:1,humanPlayerNames:invalid}).validate().length>0);
 });
 test.it('remembers names through browser/native preferences and tolerates corrupt or unavailable storage',()=>{
  for(const native of [false,true]) {
   const data={},store={getItem:key=>data[key],setItem:(key,value)=>data[key]=value},env=native?{pdg:{cfg:{useConfig:()=>{},getConfigString:store.getItem,setConfigString:store.setItem}}}:{window:{localStorage:store}};
   const preferences=Name.createPreferences(env);preferences.write('Étoile 船長');test.assertEqual(Name.createPreferences(env).read(),'Étoile 船長');
   preferences.write('');test.assertEqual(preferences.read(),'Étoile 船長');data[(native?'':'galactica.')+'defaultPlayerName']='x'.repeat(33);test.assertEqual(preferences.read(),'');
  }
  const denied=Name.createPreferences({window:{get localStorage(){throw Error('Unavailable');}}});denied.write('Captain');test.assertEqual(denied.read(),'');
 });
 test.it('exposes a pointer start button inside the startup panel at supported viewport sizes',()=>{
  const Setup=require('../src/js/startup-setup.js');for(const [w,h] of [[480,400],[640,480],[800,600]]) {const panel=Setup.panelRect(w,h),button=Setup.startRegion(panel);test.assertTrue(button.x>=panel.x&&button.x+button.width<=panel.x+panel.width);test.assertTrue(button.y>=panel.y&&button.y+button.height<=panel.y+panel.height);}
 });
 test.it('expands translated Save controls for their measured hint and stacks them in narrow windows',()=>{
  const Caption=require('../src/js/button-caption.js'),old=pdg.res.getLanguage(),measure=(text,size)=>Array.from(String(text)).length*size/2;
  try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);
   for(const width of [320,480,640]){
    const layout=Name.layout(width,340,I18n.getString(839),measure),[cancel,submit]=layout.buttons;
    for(const b of layout.buttons)test.assertTrue(b.rect.width>=Caption.width(b.label,b.key,measure,{size:13})+12);
    test.assertTrue(cancel.rect.x+cancel.rect.width<=submit.rect.x || cancel.rect.y+cancel.rect.height<=submit.rect.y);
   }
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('keeps short-height entry fields and complete measured action hints inside the port',()=>{
  const Caption=require('../src/js/button-caption.js'),old=pdg.res.getLanguage(),measure=(text,size)=>pdg.gfx.getMainPort()?pdg.gfx.getMainPort().getTextWidth(text,size):Array.from(String(text)).length*size/2;
  try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const width of [320,480,800])for(const id of [528,682,839,841]){
   const l=Name.layout(width,240,I18n.getString(id),measure);test.assertTrue(l.compact);
   for(const r of [l.rect,l.field,...l.buttons.map(b=>b.rect)])test.assertTrue(r.x>=0 && r.y>=0 && r.x+r.width<=width && r.y+r.height<=240);
   test.assertTrue(l.field.y+l.field.height<l.footerTop);for(const b of l.buttons)test.assertTrue(b.rect.width>=Caption.width(b.label,b.key,measure,{size:l.buttonSize})+12);
   const [a,b]=l.buttons.map(b=>b.rect);test.assertTrue(a.x+a.width<=b.x || a.y+a.height<=b.y);
  }}}finally{pdg.res.setLanguage(old);}
 });
 test.it('loads translated labels and keeps input/buttons on screen in every language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(let id=822;id<=824;id++)test.assertTrue(I18n.getString(id).length>0);
   for(const [width,height] of [[320,340],[480,400],[640,480],[800,600]]) {const layout=Name.layout(width,height);test.assertEqual(layout.buttons[0].key,'Esc');test.assertEqual(layout.buttons[1].key,'Enter');test.assertEqual(Name.edit(Name.createEditor('Captain'),pdg.key_Escape),'cancel');test.assertEqual(Name.edit(Name.createEditor('Captain'),13),'submit');test.assertTrue(layout.rect.y>=0);test.assertTrue(layout.rect.y+layout.rect.height<=height);
    const [cancel,submit]=layout.buttons.map(b=>b.rect);test.assertTrue(cancel.x+cancel.width<=submit.x || cancel.y+cancel.height<=submit.y);
    for(const r of [layout.field,...layout.buttons.map(button=>button.rect)])test.assertTrue(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height);
   }
  }}finally{pdg.res.setLanguage(old);}
 });
});
