const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Config=require('../src/js/game-config.js'),I18n=require('../src/js/i18n.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js');
module.exports=()=>test.describe('Startup Fog of War checkbox',()=>{
 test.it('uses the v3 inverse checkbox/omniscient mapping and preserves other options',()=>{
  const config=new Config({gameTitle:'Title',fastGame:true,numComputers:12,compSkill:5,sectorSize:3,density:4});
  test.assertTrue(config.isFogOfWarEnabled());test.assertTrue(Setup.toggleFogOfWar(config));test.assertTrue(config.omniscient);test.assertFalse(config.isFogOfWarEnabled());
  test.assertTrue(Setup.toggleFogOfWar(config));test.assertFalse(config.omniscient);test.assertTrue(config.isFogOfWarEnabled());
  test.assertEqual(config.gameTitle,'Title');test.assertTrue(config.fastGame);test.assertEqual(config.numComputers,12);test.assertEqual(config.compSkill,5);test.assertEqual(config.sectorSize,3);test.assertEqual(config.density,4);
 });
 test.it('rejects nonboolean fog options without changing accepted state',()=>{
  for(const value of ['false',0,1,null,NaN]){const config=new Config();test.assertFalse(Setup.setFogOfWar(config,value));test.assertFalse(config.omniscient);test.assertTrue(new Config({omniscient:value}).validate().some(e=>e.includes('omniscient')));}
 });
 test.it('reveals enemy diagnostics and mobile entities only when the checkbox is cleared',()=>{
  const config=new Config({skipMapGeneration:true}),game=new Game(new Factory(),new Rules(),config);game.port={getDrawingArea:()=>new pdg.Rect(800,600)};
  const star=game.factory.createStar(100000,0,'Sirius');star.owner=2;star.techLevel=8;star.population=1000000;
  const ship=game.factory.createShip(star.x,star.y,'scout',star);ship.owner=2;ship.setVisibilityTo(1,0);
  const display=new Display(game);test.assertEqual(display.getStarDiagnostics(star).tech,'?');test.assertFalse(display.isEntityVisibleToPlayer(ship,1));
  Setup.setFogOfWar(config,false);test.assertEqual(display.getStarDiagnostics(star).tech,'8');test.assertTrue(display.isEntityVisibleToPlayer(ship,1));test.assertEqual(display.getVisibilityLevelForPlayer(ship,1),Common.VisibilityLevel.DETAILS);
  Setup.setFogOfWar(config,true);test.assertEqual(display.getStarDiagnostics(star).tech,'?');test.assertFalse(display.isEntityVisibleToPlayer(ship,1));test.assertEqual(ship.getVisibilityTo(1),0);
 });
 test.it('preserves public yellow-star labels and disguises unseen enemy homeworlds while comparison keeps the true name',()=>{
  const config=new Config({skipMapGeneration:true}),game=new Game(new Factory(),new Rules(),config);
  const own=game.factory.createStar(0,0,'Vega'),enemy=game.factory.createStar(100000,0,'Sirius'),ordinary=game.factory.createStar(200000,0,'Altair');own.owner=1;enemy.owner=2;
  for(const star of [own,enemy,ordinary])star.namedStar=true;game.players[2].homeStarId=enemy.id;game.players[2].name='Sirius Alliance';
  const alias=game.getStarDisplayName(enemy);test.assertTrue(alias!==enemy.name);test.assertEqual(game.getStarDisplayName(ordinary),'Altair');test.assertEqual(game.getPlayerComparisonRows().find(r=>r.playerNum===2).name,'Sirius Alliance');
  Setup.setFogOfWar(config,false);test.assertEqual(game.getStarDisplayName(enemy),'Sirius');Setup.setFogOfWar(config,true);test.assertEqual(game.getStarDisplayName(enemy),alias);test.assertEqual(game.getStarDisplayName(ordinary),'Altair');
 });
 test.it('separates Fast Game and Fog checkboxes and localizes the fixed checkbox label in all six languages',()=>{
  for(const [w,h] of [[480,400],[640,480],[800,600]]){const panel=Setup.panelRect(w,h),fast=Setup.fastGameRegion(panel),fog=Setup.fogOfWarRegion(panel);
   test.assertTrue(fog.x>fast.x+fast.width);test.assertEqual(fog.y,fast.y);test.assertEqual(fog.height,fast.height);test.assertTrue(fog.x+fog.width<=panel.x+panel.width-28);}
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const config=new Config();test.assertEqual(config.getFogOfWarDescription(),I18n.getString(508));Setup.setFogOfWar(config,false);test.assertEqual(config.getFogOfWarDescription(),I18n.getString(506));test.assertTrue(I18n.getString(527).includes('<O>'));}}finally{pdg.res.setLanguage(old);}
 });
});
