const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Config=require('../src/js/game-config.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),I18n=require('../src/js/i18n.js');
module.exports=()=>test.describe('Computer-opponent setup',()=>{
 test.it('accepts the full local range including zero and opponents above five',()=>{
  const config=new Config({gameTitle:'Title',sectorSize:3,humanPlayerNames:{1:'Captain'}});
  for(let count=0;count<=98;count++){test.assertTrue(Setup.setComputerCount(config,count));test.assertEqual(config.totalPlayers,count+1);test.assertEqual(config.validate().length,0);}
  test.assertEqual(config.gameTitle,'Title');test.assertEqual(config.sectorSize,3);test.assertEqual(config.humanPlayerNames[1],'Captain');
 });
 test.it('rejects invalid drafts and preserves accepted configuration',()=>{
  const config=new Config({numComputers:7});for(const text of ['', ' ', 'NaN', '2.5','-1','99','100','2a',null]){
   test.assertFalse(Setup.acceptComputerCount(config,text));test.assertEqual(config.numComputers,7);test.assertEqual(config.totalPlayers,8);
  }
  test.assertTrue(Setup.acceptComputerCount(config,' 08 '));test.assertEqual(config.numComputers,8);
 });
 test.it('respects human slots and rejects fractional or nonnumeric counts',()=>{
  const config=new Config({numHumans:3,numComputers:2});test.assertTrue(Setup.setComputerCount(config,96));test.assertFalse(Setup.setComputerCount(config,97));
  for(const count of [-1,NaN,Infinity,1.5,'2',null])test.assertFalse(Setup.setComputerCount(config,count));
  for(const key of ['numHumans','numComputers'])for(const value of [1.5,NaN,Infinity,'1',null])test.assertTrue(new Config({[key]:value}).validate().some(e=>e.includes(key)));
 });
 test.it('permits solo exploration but refuses an empty game',()=>{
  const game=new Game(new Factory(),new Rules(false),new Config({numComputers:0,sectorSize:1,humanPlayerNames:{1:'Captain'}}));
  test.assertEqual(game.players.length,2);test.assertFalse(game.players[1].isComputer);test.assertEqual(game.players[1].name,'Captain');
  test.assertEqual(game.stars.filter(s=>s.owner===1).length,1);game.updateVictoryState();test.assertFalse(game.isGameOver);
  game.endTurn();test.assertEqual(game.turn,2);test.assertFalse(game.isGameOver);
  test.assertTrue(new Config({numHumans:0,numComputers:0}).validate().length>0);
 });
 test.it('constructs every configured AI slot above the old limit with the selected skill',()=>{
  const config=new Config({numComputers:12,compSkill:4,sectorSize:1}),game=new Game(new Factory(),new Rules(false),config);
  test.assertEqual(game.config.totalPlayers,13);for(let i=2;i<=13;i++){test.assertTrue(game.players[i].isComputer);test.assertEqual(game.config.getAISkillForPlayer(i),4);test.assertEqual(game.stars.filter(s=>s.owner===i).length,1);}
 });
 test.it('supports the maximum 99-player model without inventing extra slots',()=>{
  const config=new Config({numComputers:98,sectorSize:5}),game=new Game(new Factory(),new Rules(false),config);
  test.assertEqual(game.players.length,100);test.assertTrue(game.players[99].isComputer);test.assertEqual(game.players[100],undefined);
  for(let i=1;i<=99;i++)test.assertEqual(game.stars.filter(s=>s.owner===i).length,1);
 });
 test.it('fits count controls in setup without overlapping the title and localizes all labels',()=>{
  for(const [w,h] of [[480,400],[640,480],[800,600]]){const panel=Setup.panelRect(w,h),rect=Setup.computerCountRegion(panel),title=Setup.titleRegion(panel);
   test.assertTrue(rect.y>title.y+title.height);test.assertTrue(rect.x>=panel.x);test.assertTrue(rect.x+rect.width<=panel.x+panel.width);test.assertTrue(rect.y+rect.height<panel.y+136*panel.height/540);
  }
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const id of [525,829,830,831])test.assertTrue(I18n.getString(id).length>0);test.assertTrue(I18n.formatString(830,'',98).includes('98'));}}finally{pdg.res.setLanguage(old);}
 });
});
