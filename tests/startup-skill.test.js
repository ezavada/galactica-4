const test=require('./test-framework.js'),Setup=require('../src/js/startup-setup.js'),Config=require('../src/js/game-config.js'),I18n=require('../src/js/i18n.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js');
module.exports=()=>test.describe('Startup skill popup',()=>{
 test.it('offers the five shared v3 skills in order and marks the accepted choice',()=>{
  const config=new Config();for(const value of Setup.skills){Setup.setSkill(config,value);const menu=Setup.skillMenu(800,600,config);
   test.assertEqual(menu.choices.map(c=>c.value).join(','),'1,2,3,4,5');test.assertEqual(menu.choices.filter(c=>c.active).length,1);test.assertEqual(menu.choices.find(c=>c.active).value,value);}
 });
 test.it('changes only the shared skill and leaves other setup metadata intact',()=>{
  const config=new Config({gameTitle:'Title',sectorSize:3,numComputers:12,compAdvantage:-2,humanPlayerNames:{1:'Captain'},aiSkillByPlayer:{2:5}});
  for(const value of Setup.skills){test.assertTrue(Setup.setSkill(config,value));test.assertEqual(config.validate().length,0);}
  test.assertEqual(config.gameTitle,'Title');test.assertEqual(config.numComputers,12);test.assertEqual(config.totalPlayers,13);test.assertEqual(config.compAdvantage,-2);test.assertEqual(config.sectorSize,3);test.assertEqual(config.humanPlayerNames[1],'Captain');test.assertEqual(config.getAISkillForPlayer(2),5);
 });
 test.it('rejects noninteger skills without silently converting explicit zero to the default',()=>{
  for(const value of [0,6,1.5,NaN,Infinity,'2',null]){const config=new Config();test.assertFalse(Setup.setSkill(config,value));test.assertEqual(config.compSkill,2);
   test.assertTrue(new Config({compSkill:value}).validate().some(e=>e.includes('compSkill')));
   test.assertTrue(new Config({aiSkillByPlayer:{2:value}}).validate().some(e=>e.includes('aiSkillByPlayer')));}
 });
 test.it('forwards each shared skill to every computer while preserving the human slot',()=>{
  for(const value of Setup.skills){const config=new Config({numComputers:3,skipMapGeneration:true});Setup.setSkill(config,value);const game=new Game(new Factory(),new Rules(false),config);
   test.assertFalse(game.players[1].isComputer);for(let i=2;i<=4;i++)test.assertEqual(game.players[i].compSkill,value);}
 });
 test.it('keeps popup rows and cancellation separate and within smaller screens',()=>{
  for(const [width,height] of [[480,400],[640,480],[800,600]]){const setup=Setup.panelRect(width,height),field=Setup.skillRegion(setup),count=Setup.computerCountRegion(setup);
   test.assertTrue(field.y>count.y+count.height);test.assertTrue(field.y+field.height<setup.y+160*setup.height/540);
   const {rect,choices,cancel}=Setup.skillMenu(width,height,new Config());test.assertTrue(rect.x>=20&&rect.y>=20);test.assertTrue(rect.x+rect.width<=width-20&&rect.y+rect.height<=height-20);
   for(let i=0;i<choices.length;i++){const r=choices[i].rect;test.assertTrue(r.x>=rect.x&&r.x+r.width<=rect.x+rect.width);test.assertTrue(r.y+r.height<cancel.y);if(i)test.assertTrue(r.y>choices[i-1].rect.y+choices[i-1].rect.height);}
  }
 });
 test.it('uses native translated skill names and existing popup labels in all six languages',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const menu=Setup.skillMenu(800,600,new Config());
   for(const choice of menu.choices)test.assertEqual(choice.label,I18n.getString(300+choice.value));test.assertTrue(I18n.getString(522).length>0);test.assertTrue(I18n.getString(683).length>0);
  }}finally{pdg.res.setLanguage(old);}
 });
});
