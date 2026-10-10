const test=require('./test-framework.js'),fs=require('fs'),path=require('path'),Save=require('../src/js/game-save.js');
const {createTutorialGame}=require('../src/js/tutorial-game.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tutorial/galaxy.json'),'utf8'));
module.exports=()=>test.describe('Fixed v3 tutorial starting galaxy',()=>{
 test.it('reconstructs every original system with stable IDs, coordinates, ownership and economy',()=>{
  const g=createTutorialGame(fixture);test.assertEqual(g.stars.length,42);test.assertEqual(g.allShips.length,0);test.assertEqual(g.allFleets.length,0);test.assertEqual(g.turn,1);test.assertTrue(g.config.omniscient);test.assertTrue(g.config.fastGame);test.assertEqual(g.config.density,3);test.assertEqual(g.config.sectorSize,1);
  for(const saved of fixture.stars){const star=g.stars.find(s=>s.id===saved.id);test.assertNotNull(star);for(const key of ['name','x','y','owner','population','techLevel'])test.assertEqual(star[key],saved[key]);['growth','shipBuilding','research'].forEach((key,i)=>{test.assertEqual(star[key].value,saved.allocations[i].value);test.assertEqual(star[key].desired,saved.allocations[i].desired);test.assertEqual(star[key].rate,6);test.assertEqual(star[key].benefit,6);});test.assertNotNull(star._spatialLocation);}
  test.assertEqual(g.stars.find(s=>s.id===2).name,'Andromeda');test.assertEqual(g.stars.find(s=>s.id===7).name,'S-7');test.assertEqual(g.stars.find(s=>s.id===9).name,'S-20');test.assertEqual(g.selectedObject.id,2);
 });
 test.it('restores the three faction homeworlds and first-build milestones without creating phantom ships',()=>{
  const g=createTutorialGame(fixture);for(const source of fixture.players){const p=g.players[source.owner];test.assertEqual(p.homeStarId,source.homeStarId);test.assertEqual(p.hiStarTech,1);test.assertEqual(p.hiShipTech,-5);test.assertFalse(p.builtColony);const home=g.stars.find(s=>s.id===p.homeStarId);test.assertEqual(home.population,1000000);test.assertEqual(home.currentShip.type,'colony');test.assertEqual(home.currentShip.cost,4.5);test.assertApproximately(home.currentShip.progress,99,.00001);test.assertEqual(home.ships.length,0);}
  test.assertEqual(g.players[2].name,'Merjia Pact');test.assertEqual(g.players[3].name,'Catambay Pact');test.assertEqual(g.eventLog.length,0);
 });
 test.it('commissions the original first-turn colony through actual turn production',()=>{
  const g=createTutorialGame(fixture);g.aiManager.processAITurns=()=>{};g.endTurn();test.assertEqual(g.turn,2);const ship=g.allShips.find(s=>s.owner===1&&s.type==='colony');test.assertNotNull(ship);test.assertEqual(ship.star.id,2);test.assertFalse(ship.underConstruction());test.assertTrue(g.players[1].builtColony);test.assertTrue(g.eventLog.some(e=>e.commissioning&&!e.observer&&e.recipient===1));
 });
 test.it('survives complete saves and allows ordinary colonies, production and attention afterward',()=>{
  const g=createTutorialGame(fixture),loaded=Save.restore(Save.serialize(g));test.assertEqual(loaded.stars.length,42);test.assertEqual(loaded.selectedObject.id,2);test.assertEqual(loaded.players[1].homeStarId,2);test.assertApproximately(loaded.selectedObject.currentShip.progress,99,.00001);loaded.selectedObject.update();const colony=loaded.allShips.find(s=>s.owner===1&&s.type==='colony');const target=loaded.stars.find(s=>s.id===9);loaded.colonizeStar(target,colony);test.assertEqual(target.owner,1);test.assertEqual(target.name,'S-20');test.assertTrue(loaded.attention.pending().length>0);
 });
 test.it('creates independent games without resetting entity allocators or changing the source fixture',()=>{
  const before=JSON.stringify(fixture),first=createTutorialGame(fixture,{gameTitle:'Learning 星',playerName:'Learner Д'}),home=first.selectedObject;const nextId=first.factory.starConstructor.nextId;const second=createTutorialGame(fixture);test.assertTrue(home!==second.selectedObject);second.selectedObject.growth.desired=70;test.assertEqual(home.growth.desired,33.4);test.assertEqual(first.config.gameTitle,'Learning 星');test.assertEqual(first.players[1].name,'Learner Д');test.assertEqual(second.players[1].name,'Ed');test.assertTrue(first.factory.starConstructor.nextId>=nextId);test.assertEqual(JSON.stringify(fixture),before);
 });
});
