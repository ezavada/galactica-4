const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Editor=require('../src/js/player-name.js');
const Config=require('../src/js/game-config.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),I18n=require('../src/js/i18n.js');
module.exports=()=>test.describe('Startup game title',()=>{
 test.it('accepts a Unicode title without changing map or human-name settings',()=>{
  const config=new Config({humanPlayerNames:{1:'Captain'},sectorSize:3,density:4}),name='星の航海 — Звёзды';
  test.assertTrue(Setup.setGameTitle(config,name));test.assertEqual(config.gameTitle,name);test.assertEqual(config.sectorSize,3);test.assertEqual(config.density,4);test.assertEqual(config.humanPlayerNames[1],'Captain');
  test.assertEqual(config.validate().length,0);
 });
 test.it('uses the v3 27-character title limit while player names retain 32 characters',()=>{
  const title=Editor.createEditor('',Setup.maximumTitleLength);title.selected=false;for(let i=0;i<28;i++)Editor.edit(title,'星');
  test.assertEqual(Array.from(title.text).length,27);const config=new Config();test.assertTrue(Setup.setGameTitle(config,title.text));
  test.assertFalse(Setup.setGameTitle(config,title.text+'星'));test.assertEqual(Array.from(config.gameTitle).length,27);
  const name=Editor.createEditor('');name.selected=false;for(let i=0;i<32;i++)Editor.edit(name,'星');test.assertEqual(Array.from(name.text).length,32);
 });
 test.it('rejects empty/control/overlong edits without changing the accepted title',()=>{
  const config=new Config({gameTitle:'Accepted'});for(const text of ['', '  ',null,7,'Line\nBreak','x'.repeat(28)]){
   test.assertFalse(Setup.setGameTitle(config,text));test.assertEqual(config.gameTitle,'Accepted');
  }
  test.assertTrue(Setup.setGameTitle(config,'  Trimmed  '));test.assertEqual(config.gameTitle,'Trimmed');
  for(const gameTitle of ['  ','x'.repeat(28),'A\nB'])test.assertTrue(new Config({gameTitle}).validate().some(error=>error.startsWith('gameTitle')));
 });
 test.it('keeps title edits isolated until acceptance and applies the accepted metadata to the game',()=>{
  const config=new Config({gameTitle:'Old',humanPlayerNames:{1:'Captain'},skipMapGeneration:true}),draft=Editor.createEditor(config.gameTitle,27);
  Editor.edit(draft,'新');Editor.edit(draft,'作');test.assertEqual(config.gameTitle,'Old');test.assertEqual(Editor.edit(draft,pdg.key_Escape),'cancel');
  const next=Editor.createEditor(config.gameTitle,27);Editor.edit(next,'名');test.assertEqual(Editor.edit(next,13),'submit');Setup.setGameTitle(config,next.text);
  const game=new Game(new Factory(),new Rules(false),config);test.assertEqual(game.config.gameTitle,'名');test.assertEqual(game.players[1].name,'Captain');
 });
 test.it('fits title/header text within the game panel even at the Unicode maximum',()=>{
  const config=new Config({gameTitle:'星'.repeat(27),skipMapGeneration:true}),game=new Game(new Factory(),new Rules(false),config);
  game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size)=>Array.from(String(text)).length*size};
  const display=new Display(game);let headline;display.drawPanelSurface=()=>{};display.drawMapButtons=()=>{};
  display.drawTextLine=(text,x,y,color,size)=>{if(y===36)headline={text,size};};display.drawMainUI(1,0,0);
  test.assertTrue(headline.text.includes(config.gameTitle));test.assertTrue(game.port.getTextWidth(headline.text,headline.size)<=392);
 });
 test.it('localizes title controls and keeps their hit area within supported setup viewports',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(let id=825;id<=828;id++)test.assertTrue(I18n.getString(id).length>0);test.assertTrue(I18n.formatString(828,'Title: {0} <T>','星').includes('星'));
   for(const [w,h] of [[480,400],[640,480],[800,600]]){const panel=Setup.panelRect(w,h),r=Setup.titleRegion(panel);test.assertTrue(r.x>=panel.x&&r.x+r.width<=panel.x+panel.width);test.assertTrue(r.y>=panel.y&&r.y+r.height<panel.y+88*panel.height/540);}
   test.assertEqual(new Config().validate().length,0);
  }}finally{pdg.res.setLanguage(old);}
 });
});
