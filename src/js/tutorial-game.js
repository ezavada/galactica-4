// Construct the fixed original tutorial galaxy without procedural generation.
// Session/controller code supplies the decoded fixture; this module changes no
// normal game, global random seed, preferences or file association.
const Game=require('./game.js');
const Config=require('./game-config.js');
const Rules=require('./rules.js');
const Factory=require('./factory.js');
const TutorialSimulation=require('./tutorial-simulation.js');
const hulls=['battleship','scout','colony','defense'];
function createTutorialGame(fixture,options={}) {
    if(!fixture || fixture.format!==1 || fixture.stars.length!==42 || fixture.players.length!==3)
        throw new Error('Invalid tutorial fixture');
    const config=new Config({...fixture.config,density:fixture.config.sectorDensity,skipMapGeneration:true,
        gameTitle:options.gameTitle || fixture.config.gameTitle});
    const rules=new Rules(config.fastGame),factory=new Factory(),game=new Game(factory,rules,config);
    game.turn=fixture.turn;
    game.tutorialSimulation=new TutorialSimulation();
    for(const saved of fixture.stars) {
        // Assign the source ID before registration so spatial keys are correct.
        const star=new factory.starConstructor(saved.x,saved.y,saved.name,game);
        star.id=saved.id;
        factory.starConstructor.nextId=Math.max(factory.starConstructor.nextId,star.id+1);
        star.owner=saved.owner;star.population=saved.population;star.techLevel=saved.techLevel;
        star.namedStar=!/^S-\d+$/.test(star.name);
        star.scannerRange=rules.getStarScanRange(star);
        ['growth','shipBuilding','research'].forEach((key,index)=>Object.assign(star[key],saved.allocations[index]));
        star.paidTowardResearch=saved.paidTowardResearch;
        hulls.forEach((type,index)=>{star.buildCredits[type]=saved.buildCredits[index];});
        game.entityAdded(star);
        if(saved.owner && hulls[saved.buildHull]) {
            star.startBuildingShip(hulls[saved.buildHull],false);
            // Preserve the saved cost/payment until the normal turn reprices it.
            star.currentShip.cost=saved.buildCost;
            star.currentShip.progress=Math.min(100,star.paidTowardShipBuilding/saved.buildCost*100);
        }
    }
    for(const saved of fixture.players) {
        const player=game.players[saved.owner];
        for(const key of ['name','homeStarId','numPiecesRemaining','lastTurnPosted','hiStarTech','hiShipTech',
                'builtColony','builtScout','builtSatellite'])player[key]=saved[key];
        if(saved.owner===1 && options.playerName)player.name=options.playerName;
    }
    game.eventLog=[];game.nextEventId=0;
    game.visibilityCalculator.updateAllVisibility();
    game.setSelectedObject(game.stars.find(s=>s.id===fixture.originalUI.selectedId) || null);
    return game;
}
module.exports={createTutorialGame};
