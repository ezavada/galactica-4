const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Config=require('../src/js/game-config.js'),I18n=require('../src/js/i18n.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js');
module.exports=()=>test.describe('Startup Fast Game checkbox',()=>{
 test.it('toggles the accepted option without changing other setup selections',()=>{
  const config=new Config({gameTitle:'Title',numComputers:12,compSkill:5,compAdvantage:-2,sectorSize:3,density:4,omniscient:true});
  test.assertFalse(config.fastGame);test.assertTrue(Setup.toggleFastGame(config));test.assertTrue(config.fastGame);test.assertTrue(Setup.toggleFastGame(config));test.assertFalse(config.fastGame);
  test.assertEqual(config.gameTitle,'Title');test.assertEqual(config.numComputers,12);test.assertEqual(config.compSkill,5);test.assertEqual(config.compAdvantage,-2);test.assertEqual(config.sectorSize,3);test.assertEqual(config.density,4);test.assertTrue(config.omniscient);
 });
 test.it('rejects nonboolean values without changing the option',()=>{
  for(const value of ['false',0,1,null,NaN]){const config=new Config();test.assertFalse(Setup.setFastGame(config,value));test.assertFalse(config.fastGame);test.assertTrue(new Config({fastGame:value}).validate().some(e=>e.includes('fastGame')));}
 });
 test.it('forwards fast mode to actual scan, speed and shipbuilding rules',()=>{
  const result=fastGame=>{const config=new Config({skipMapGeneration:true});Setup.setFastGame(config,fastGame);const game=new Game(new Factory(),new Rules(config.fastGame),config);
   const star=game.factory.createStar(0,0,'Home');star.owner=1;star.population=1000000;star.techLevel=4;const ship=game.factory.createShip(0,0,'scout',star);
   return {scan:game.rules.getStarScanRange(star),speed:game.rules.getShipInitialSpeed(ship),effort:game.rules.getStarShipBuildingAmount(star)};};
  const normal=result(false),fast=result(true);for(const key of ['scan','speed','effort'])test.assertGreaterThan(normal[key],0);test.assertEqual(fast.scan,normal.scan*2);test.assertEqual(fast.speed,normal.speed*2);test.assertEqual(fast.effort,normal.effort*2);
 });
 test.it('keeps the checkbox below density choices and above hints at smaller viewports',()=>{
  for(const [w,h] of [[480,400],[640,480],[800,600]]){const panel=Setup.panelRect(w,h),rect=Setup.fastGameRegion(panel),density=Setup.densityRegions(panel,new Config())[0].rect;
   test.assertTrue(rect.y>=density.y+density.height);test.assertTrue(rect.x>=panel.x);test.assertTrue(rect.x+rect.width+12<panel.x+panel.width-28);test.assertTrue(rect.y+rect.height<panel.y+380*panel.height/540);}
 });
 test.it('uses the existing native-language Fast Game label and keyboard hint in every language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);test.assertTrue(I18n.getString(505).length>0);test.assertTrue(I18n.getString(527).includes('<F>'));}}finally{pdg.res.setLanguage(old);}
 });
});
