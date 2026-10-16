// Transport records are deliberately independent of the save graph. In v3,
// SendGameDataTo sends a private player record and visibility-tagged entities.
// Here the existing inspector knowledge gates also constrain transmitted data.
const Common=require('./common.js'),Names=require('./chart-names.js');
const V=Common.VisibilityLevel;
function pick(source,keys){const result={};for(const key of keys)if(source[key]!==undefined && (source[key]===null || ['string','boolean','number'].includes(typeof source[key])))result[key]=source[key];return result;}
const reports={
 playerMessage:['sender','name','text'],
 combat:['side','result','forceName','ownShipsLost','enemyShipsLost','location'],
 occupation:['kind','starName','attackerOwner','previousOwner','attackerName','defenderName','side'],
 destruction:['kind','name','owner','opponentOwner','ownerName','opponentName','location','side'],
 systemDefense:['starName','attackerOwner','defenderOwner','shipsLost','attackerName','defenderName','side'],
 repair:['name','fleet'],rendezvousFormation:['owner','ownerName','location'],
 colonization:['owner','ownerName','starName'],
 commissioning:['owner','ownerName','name','shipType','classIndex','techLevel','starName'],
 discovery:['owner','ownerName','starName','techLevel','classIndex'],
 callIn:['name','location','fleet'],builtShip:['name','starName','shipType','techLevel'],
 outcome:['kind','playerNum','name','turn']
};
function snapshot(game,viewer){
 if(!Number.isInteger(viewer) || !game.config.isHumanPlayer(viewer))throw new Error('invalid_viewer');
 // Alias allocation is deterministic, but its cache belongs to the host UI.
 // Isolate it so even the first remote request cannot modify a saved document.
 const prior=Names.snapshot(game);
 Names.restore(game,prior?{names:new Map(prior.names),pool:[...prior.pool],numerals:[...prior.numerals]}:null);
 try{return project(game,viewer);}finally{Names.restore(game,prior);}
}
function project(game,viewer,administrator=false){
 const full=e=>administrator || game.config.omniscient || game.isOwnerAlliedWith(viewer,e.owner);
 const level=e=>full(e)?V.DETAILS:e.getVisibilityTo(viewer);
 const known=new Map(),kinds=new Map();
 for(const [kind,list] of [['star',game.stars],['ship',game.allShips],['fleet',game.allFleets],['rendezvous',game.allRendezvous]])for(const entity of list){
  kinds.set(entity,kind);
  const visibility=administrator?V.DETAILS:kind==='rendezvous'?(entity.owner===viewer?V.DETAILS:V.NONE):level(entity);
  if(kind==='star' || visibility>V.NONE)known.set(entity,visibility);
 }
 // Class-level fleet inspection exposes its members even when they have no
 // independent scanner visibility. Below Class it must not expose their IDs.
 function members(fleet,inherited){for(const member of fleet.ships){
  const visibility=Math.max(known.get(member)||0,inherited);
  known.set(member,visibility);
  if(kinds.get(member)==='fleet' && visibility>=V.CLASS)members(member,visibility);
 }}
 // V3 Details-visible system tables expose docked members and group contents
 // even without their independent scanner visibility. Promote table statistics
 // only to Class; names still use level(e), and private orders remain full-only.
 const systemMembers=new Map();
 for(const star of game.stars) {
  const accessible=full(star) || level(star)>=V.DETAILS || !star.owner && game.allShips.some(ship=>
   ship.star===star && full(ship) && !ship.underConstruction());
  if(!accessible)continue;
  const contents=game.getDockedSystemMembers(star);systemMembers.set(star,contents);
  for(const member of contents)known.set(member,Math.max(known.get(member)||0,V.CLASS));
 }
 for(const fleet of game.allFleets)if((known.get(fleet)||0)>=V.CLASS)members(fleet,known.get(fleet));
 const ref=e=>known.has(e)?{kind:kinds.get(e),id:e.id}:null;
 const point=p=>p?{x:p.x,y:p.y,target:ref(p.target || p)}:null;
 const course=c=>c?{...pick(c,['current','previous','loop','hunt','hasOrigin','revision']),
  waypoints:c.waypoints.map(point),memory:c.memory?{...pick(c.memory,['current','previous','loop','hunt','hasOrigin','patrol']),waypoints:c.memory.waypoints.map(point)}:null}:null;
 const entities=[];
 for(const [e,visibility] of known){
  const kind=kinds.get(e),all=full(e),row={kind,id:e.id,x:e.x,y:e.y,visibility:kind==='rendezvous'?visibility:level(e)};
  if(kind==='star'){
   row.name=administrator?e.name:Names.displayName(game,e,viewer);row.namedStar=!!e.namedStar;
   if(all || visibility>V.NONE)row.owner=e.owner;
   if(visibility>=V.TECH)row.techLevel=e.techLevel;
   if(visibility>=V.CLASS)row.population=e.population;
   if(visibility>=V.DETAILS){
    row.defense=pick(e.getDefenseBreakdown({resolveCourses:false}),['totalDefense','satelliteDefense','shipDefense']);
    row.currentShip=e.currentShip?pick(e.currentShip,all?['type','techLevel','cost','progress']:['type']):null;
    for(const key of ['growth','shipBuilding','research'])row[key]=pick(e[key],all?['value','desired','rate','benefit','locked']:['value']);
   }
   if(systemMembers.has(e))row.ships=systemMembers.get(e).map(ref).filter(Boolean);
   if(all){Object.assign(row,pick(e,['paidTowardShipBuilding','unassignedShipCredit','paidTowardResearch','damage','scannerRange']));
    row.buildCredits=pick(e.buildCredits,Object.keys(e.buildCredits));row.defaultDestination=point(e.defaultDestination);
    row.defenseSatellites=e.defenseSatellites.map(ref).filter(Boolean);}
  }else if(kind==='rendezvous'){
   Object.assign(row,pick(e,['owner','name']));row.anchor=ref(e.anchor);row.fleet=ref(e.fleet);
  }else{
   // V3 CShip::DrawSelf colors both ships and fleets by owner as soon as
   // they are detected. Names, technology and contents retain separate gates.
   row.owner=e.owner;
   if(visibility>=V.SPEED)row.speed=kind==='fleet'?e.totalSpeed:e.speed;
   if(visibility>=V.TECH)row.techLevel=e.techLevel;
   if(visibility>=V.CLASS){Object.assign(row,pick(e,['type','classIndex','progress']));if(level(e)>=V.CLASS)row.name=e.name;
    // V3 contents rows show patrol status even for independently hidden members.
    // Expose the flag with table statistics, keeping course waypoints private.
    row.onPatrol=!!e.isOnPatrol();row.power=kind==='fleet'?e.totalPower:e.power;row.damage=kind==='fleet'?e.totalDamage:e.damage;
    if(kind==='fleet')row.ships=e.ships.map(ref).filter(Boolean);
   }
   if(visibility>=V.DETAILS){Object.assign(row,pick(e,['scannerRange','onPatrol']));row.star=ref(e.star);row.fleet=ref(e.fleet);}
   if(all){Object.assign(row,pick(e,['toBeScrapped','userCallIn','lastCallInTurn']));row.course=course(e.course);}
  }
  entities.push(row);
 }
 const player=game.players[viewer],privatePlayer=administrator?{playerNum:0,builtColony:false,builtScout:false,builtSatellite:false,builtFighterClasses:[]}:{...pick(player,['playerNum','homeStarId','hiStarTech','hiShipTech','builtColony','builtScout','builtSatellite','lastTurnPosted','defaultBuildType','defaultGrowth','defaultTech','defaultShips']),builtFighterClasses:[...player.builtFighterClasses]};
 const comparisons=game.getPlayerComparisonRows().map(source=>{
  const row=pick(source,['playerNum','isAlive','stars','ships','shipsBuilding','population','production','productionRaw','power','minimumTech','maxTech','averageTech','minimumShipTech','maximumShipTech','averageShipTech','pieces']);
  const p=game.players[row.playerNum],claim=p && !p.isComputer?game.config.networkHost.players[game.config.getHumanPlayerSlots().indexOf(row.playerNum)]:null;
  row.isComputer=!!(p && p.isComputer);row.name=p?(p.isComputer?p.name:claim?claim.name:''):'';row.assigned=!!(p && (p.isComputer || claim));
  return row;
 });
 const events=game.eventLog.filter(event=>game.isEventAccessible(event,viewer)).map(event=>{
  const row=pick(event,['id','turn','title','message','type','recipient','handled','observer','automatic']);
  row.subject=ref(event.subject);row.position=event.position?pick(event.position,['x','y']):null;
  for(const [key,keys] of Object.entries(reports))if(event[key])row[key]=pick(event[key],keys);
  return row;
 });
 return {format:administrator?'Galactica-4-admin-state':'Galactica-4-player-state',version:1,viewer,turn:game.turn,
  map:{width:1024*1024*game.config.sectorSize,height:1024*1024*game.config.sectorSize},
  playerRevision:game.config.networkHost.playerStateRevision || 0,initialStateRevision:game.config.networkHost.initialStateRevision || 0,
  config:{...(game.config.humanPlayerSlots===undefined?{}:{humanPlayerSlots:[...game.config.humanPlayerSlots]}),...pick(game.config,['humanPlayerSlots','gameTitle','numHumans','numComputers','totalPlayers','sectorSize','density','fastGame','omniscient','compSkill','compAdvantage','maxTimePerTurn','endEarly'])},
  ...(administrator?{role:'administrator'}:{}),isGameOver:game.isGameOver,canContinue:game.canAdvanceTurns(),postGame:game.postGame,winningPlayerNum:game.winningPlayerNum,victoryTurn:game.victoryTurn,privatePlayer,comparisons,entities,events};
}
function adminSnapshot(game){const state=project(game,0,true);state.config.omniscient=true;return state;}
module.exports={snapshot,adminSnapshot,reports};
