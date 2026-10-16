const test=require('./test-framework.js'),fs=require('fs'),path=require('path');
const {createTutorialGame}=require('../src/js/tutorial-game.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tutorial/galaxy.json'),'utf8'));
function gameAt(turn){const g=createTutorialGame(fixture);g.turn=turn;g.aiManager.processAITurns=()=>{};return g;}
function lowOutput(star,type){star.pauseShipBuilding();star.buildCredits[type]=0;star.startBuildingShip(type,false);star.shipBuilding.value=33.3;star.shipBuilding.desired=33.3;star.shipBuilding.benefit=6;star.growth.value=0;star.growth.desired=0;star.research.value=0;star.research.desired=0;}
module.exports=()=>test.describe('Source-scripted tutorial production',()=>{
 test.it('restores only the tutorial home allocation values and targets on turns two through thirteen',()=>{
  for(const turn of [2,3,8,13]){const g=gameAt(turn),home=g.selectedObject,other=g.stars.find(s=>s.id===9);home.growth.value=10;home.growth.desired=70;home.shipBuilding.value=80;home.shipBuilding.desired=20;home.research.value=10;home.research.desired=10;home.growth.locked=true;other.growth.desired=60;g.tutorialSimulation.beforeEndTurn(g);test.assertEqual(home.growth.value,33.4);test.assertEqual(home.growth.desired,33.4);test.assertEqual(home.shipBuilding.value,33.3);test.assertEqual(home.research.desired,33.3);test.assertTrue(home.growth.locked);test.assertEqual(other.growth.desired,60);}
 });
 test.it('retains first-turn and post-lesson production edits',()=>{
  for(const turn of [1,14,20]){const g=gameAt(turn);g.selectedObject.shipBuilding.value=10;g.selectedObject.shipBuilding.desired=60;g.tutorialSimulation.beforeEndTurn(g);test.assertEqual(g.selectedObject.shipBuilding.value,10);test.assertEqual(g.selectedObject.shipBuilding.desired,60);}
 });
 test.it('guarantees selected home hulls on source processing turns three, four and eight through actual end turns',()=>{
  for(const [turn,type] of [[3,'defense'],[4,'scout'],[8,'battleship']]){const g=gameAt(turn),home=g.selectedObject;lowOutput(home,type);const cost=home.currentShip.cost;g.endTurn();const built=g.allShips.filter(s=>s.owner===1&&s.type===type);test.assertEqual(built.length,1);test.assertTrue(built[0].star===home);test.assertEqual(home.currentShip.type,type);test.assertApproximately(home.paidTowardShipBuilding,.1,.000001);test.assertTrue(g.eventLog.some(e=>e.commissioning&&e.recipient===1));test.assertEqual(g.turn,turn+1);test.assertTrue(cost>.1);}
 });
 test.it('guarantees New Terra production on turn eight without forcing another colony',()=>{
  const g=gameAt(8),colony=g.stars.find(s=>s.id===9),other=g.stars.find(s=>s.id===7);for(const star of [colony,other]){star.owner=1;lowOutput(star,'battleship');}g.selectedObject.pauseShipBuilding();g.endTurn();test.assertEqual(g.allShips.filter(s=>s.owner===1&&s.type==='battleship').length,1);test.assertTrue(colony.ships.some(s=>s.type==='battleship'));test.assertEqual(other.ships.length,0);
 });
 test.it('does not invent a build when production is paused or effective ship effort is zero',()=>{
  const g=gameAt(8),home=g.selectedObject;home.pauseShipBuilding();g.endTurn();test.assertFalse(g.allShips.some(s=>s.owner===1));const colony=g.stars.find(s=>s.id===9);colony.owner=1;lowOutput(colony,'battleship');colony.shipBuilding.value=0;colony.shipBuilding.desired=0;g.turn=8;colony.update();test.assertEqual(colony.ships.length,0);test.assertEqual(colony.paidTowardShipBuilding,0);
 });
 test.it('uses battleships as the computer next hull while preserving real colony commissioning',()=>{
  const g=gameAt(1);g.endTurn();for(const owner of [2,3]){const home=g.stars.find(s=>s.owner===owner);test.assertTrue(home.ships.some(s=>s.type==='colony'));test.assertEqual(home.currentShip.type,'battleship');}
 });
 test.it('leaves identical ordinary-game star IDs and production under normal rules',()=>{
  const g=new Game(new Factory(),new Rules(true),new Config({numHumans:1,numComputers:1,skipMapGeneration:true,fastGame:true}));g.aiManager.processAITurns=()=>{};const home=g.factory.createStar(0,0,'Ordinary');home.id=2;home.owner=1;home.population=1000000;lowOutput(home,'battleship');home.growth.desired=50;home.research.desired=16.7;g.turn=8;g.endTurn();test.assertEqual(g.allShips.length,0);test.assertEqual(home.growth.desired,50);test.assertEqual(home.shipBuilding.desired,33.3);test.assertTrue(!g.tutorialSimulation);
 });
});
