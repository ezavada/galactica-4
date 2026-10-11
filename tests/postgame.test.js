const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Save=require('../src/js/game-save.js'),Autoplay=require('../src/js/autoplay.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));const star=game.factory.createStar(0,0,'Last Home 星');star.owner=1;star.population=10000;star.techLevel=1;game.players[1].homeStarId=star.id;game.turn=7;return {game,star};}
module.exports=()=>test.describe('Local post-game continuation',()=>{
 test.it('starts the next turn after victory and continues real production without repeating results',()=>{
  const {game,star}=fixture();const first=game.endTurn();test.assertTrue(first.isGameOver);test.assertEqual(game.victoryTurn,7);test.assertEqual(game.turn,8);test.assertFalse(game.postGame);
  const outcomes=game.eventLog.filter(e=>e.outcome).length,population=star.population;game.endTurn();test.assertTrue(game.postGame);test.assertEqual(game.turn,9);test.assertTrue(star.population>population);test.assertEqual(game.victoryTurn,7);test.assertEqual(game.winningPlayerNum,1);test.assertEqual(game.eventLog.filter(e=>e.outcome).length,outcomes);
 });
 test.it('retains the result and post-game phase across a complete save and further turns',()=>{
  const {game}=fixture();game.endTurn();game.endTurn();const loaded=Save.restore(Save.serialize(game));test.assertTrue(loaded.postGame);test.assertTrue(loaded.isGameOver);test.assertEqual(loaded.turn,9);loaded.endTurn();test.assertEqual(loaded.turn,10);test.assertEqual(loaded.victoryTurn,7);test.assertEqual(loaded.winningPlayerNum,1);
 });
 test.it('defaults legacy saves to pre-continuation and refuses inconsistent phase data',()=>{
  const {game}=fixture();game.endTurn();delete game.postGame;const loaded=Save.restore(Save.serialize(game));test.assertFalse(loaded.postGame);loaded.endTurn();test.assertTrue(loaded.postGame);test.assertEqual(loaded.turn,9);
  const invalid=fixture().game;invalid.postGame=true;test.assertThrows(()=>Save.restore(Save.serialize(invalid)));
 });
 test.it('keeps automated observer runs stopped at their recorded result',()=>{
  const {game}=fixture();game.markGameWon(1);const turn=game.turn;const controller=new Autoplay.AutoplayController(game,{enabled:true});controller.step();test.assertEqual(game.turn,turn);test.assertFalse(game.postGame);
 });
});
