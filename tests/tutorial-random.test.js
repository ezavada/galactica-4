const test=require('./test-framework.js'),fs=require('fs'),path=require('path');
const Random=require('../src/js/simulation-random.js'),Save=require('../src/js/game-save.js');
const {createTutorialGame}=require('../src/js/tutorial-game.js');
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
const AIUtils=require('../src/js/ai-utils.js'),{AISkillManager}=require('../src/js/ai-skill.js'),{AIFactory}=require('../src/js/ai-manager.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/tutorial/galaxy.json'),'utf8'));
const normal=()=>new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));
function summary(g){return JSON.stringify({turn:g.turn,random:g.tutorialRandom,
 stars:g.stars.map(s=>[s.id,s.owner,s.population,s.techLevel,s.currentShip&&s.currentShip.type,s.paidTowardShipBuilding]),
 ships:g.allShips.map(s=>[s.owner,s.type,s.x,s.y,s.damage,s.star&&s.star.id,s.destination&&[s.destination.x,s.destination.y]])});}
module.exports=()=>test.describe('Tutorial random stream isolation',()=>{
 test.it('uses a portable exact integer sequence with validated serialized state',()=>{
  const game={tutorialRandom:Random.create(1)},expected=[16807,282475249,1622650073,984943658,1144108930];
  test.assertEqual(expected.map(()=>Random.next(game)).join(','),expected.join(','));
  for(const seed of [0,-1,.5,2147483647,NaN])test.assertThrows(()=>Random.create(seed));
  test.assertTrue(Random.valid(Random.create(101)));test.assertFalse(Random.valid({algorithm:'unknown',state:101}));
 });
 test.it('constructs and processes real tutorial AI turns and combat without any global PDG roll',()=>{
  const original=pdg.rand;let calls=0;pdg.rand=()=>{calls++;throw Error('Global tutorial roll');};
  try{
   const game=createTutorialGame(fixture);test.assertEqual(game.tutorialRandom.state,101);
   for(let i=0;i<4;i++)game.endTurn();
   const home=game.stars.find(s=>s.id===2),ship=game.factory.createShip(home.x,home.y,'battleship',home,true);
   for(const attacker of [home,ship])test.assertTrue(attacker.getOneAttackAgainst(null)<=attacker.getAttackStrength());
   test.assertNotEqual(game.tutorialRandom.state,101);test.assertEqual(calls,0);
  }finally{pdg.rand=original;}
 });
 test.it('leaves the actual native random continuation unchanged through tutorial play',()=>{
  const ordinary=normal();pdg.srand(424242);const expected=Array.from({length:12},()=>Random.next(ordinary));
  pdg.srand(424242);const game=createTutorialGame(fixture);for(let i=0;i<4;i++)game.endTurn();
  test.assertEqual(Array.from({length:12},()=>Random.next(ordinary)).join(','),expected.join(','));
 });
 test.it('routes AI helpers and skill choices through their own game while normal AI retains PDG',()=>{
  const tutorial=createTutorialGame(fixture),ordinary=normal(),original=pdg.rand;let calls=0;
  pdg.rand=()=>{calls++;return 12345;};
  try{
   const utils=new AIUtils(tutorial,tutorial.rules),skill=new AISkillManager(1,tutorial);
   utils.randomInt(20);utils.signRandom(10);skill.getRandomVariation(1);skill.shouldAvoidActionGood('formFleet',{});
   tutorial.aiManager.createRandomAIPlayer(2);AIFactory.createRandomAIPlayer(3,tutorial,tutorial.rules);AISkillManager.createRandomSkill(tutorial);
   test.assertEqual(calls,0);const state=tutorial.tutorialRandom.state;
   test.assertEqual(new AIUtils(ordinary,ordinary.rules).randomInt(20),5);
   test.assertEqual(new AISkillManager(1,ordinary).getRandomVariation(1),-3);
   test.assertEqual(calls,2);test.assertEqual(tutorial.tutorialRandom.state,state);
  }finally{pdg.rand=original;}
 });
 test.it('reproduces actual tutorial simulation despite unrelated native random activity',()=>{
  pdg.srand(3);const first=createTutorialGame(fixture);const firstColony=first.stars.find(s=>s.id===40);firstColony.owner=2;firstColony.techLevel=0;firstColony.population=100000;for(let i=0;i<10;i++)first.endTurn();test.assertNotEqual(first.tutorialRandom.state,101);
  const expected=summary(first);pdg.srand(888);for(let i=0;i<100;i++)pdg.rand();
  const second=createTutorialGame(fixture);const secondColony=second.stars.find(s=>s.id===40);secondColony.owner=2;secondColony.techLevel=0;secondColony.population=100000;for(let i=0;i<10;i++)second.endTurn();
  test.assertEqual(summary(second),expected);
 });
 test.it('retains the next private random sequence across full graph saves',()=>{
  const game=createTutorialGame(fixture);for(let i=0;i<15;i++)Random.next(game);
  const loaded=Save.restore(Save.serialize(game));test.assertTrue(loaded.tutorialRandom!==game.tutorialRandom);
  const expected=Array.from({length:20},()=>Random.next(game));
  test.assertEqual(Array.from({length:20},()=>Random.next(loaded)).join(','),expected.join(','));
 });
 test.it('rejects corrupt private stream state and still reads older ordinary documents',()=>{
  const game=createTutorialGame(fixture),document=Save.snapshot(game);
  const stream=document.graph.nodes.find(n=>n.properties&&n.properties.some(p=>p[0]==='algorithm'&&p[1]==='park-miller-16807'));
  stream.properties.find(p=>p[0]==='state')[1]=0;test.assertThrows(()=>Save.restore(JSON.stringify(document)));
  const old=Save.snapshot(normal()),root=old.graph.nodes[old.graph.root.ref];root.properties=root.properties.filter(p=>p[0]!=='tutorialRandom');
  test.assertTrue(!Save.restore(JSON.stringify(old)).tutorialRandom);
 });
});
