// Reconstruct a visibility-limited client document, never a local simulation.
// References are typed because IDs are independent in each entity family.
const Game=require('./game.js'),Config=require('./game-config.js'),Rules=require('./rules.js'),Factory=require('./factory.js');
const Star=require('./star.js'),Ship=require('./ship.js'),Fleet=require('./fleet.js'),Rendezvous=require('./rendezvous.js'),Course=require('./course.js');
const Common=require('./common.js');
const types={star:Star,ship:Ship,fleet:Fleet,rendezvous:Rendezvous};
const numeric=['owner','techLevel','population','classIndex','progress','speed','power','damage','scannerRange','paidTowardShipBuilding','unassignedShipCredit','paidTowardResearch','lastCallInTurn'];
const booleans=['namedStar','onPatrol','toBeScrapped','userCallIn'];
function invalid(){throw new Error('invalid_player_state');}
function object(value){if(!value || typeof value!=='object' || Array.isArray(value))invalid();return value;}
function number(value){if(typeof value!=='number' || !Number.isFinite(value))invalid();return value;}
function integer(value,min=0,max=Number.MAX_SAFE_INTEGER){number(value);if(!Number.isSafeInteger(value) || value<min || value>max)invalid();return value;}
function text(value,max=65536){if(typeof value!=='string' || value.length>max)invalid();return value;}
function list(value){if(!Array.isArray(value) || value.length>300000)invalid();return value;}
function scalar(source,keys){const result={};for(const key of keys)if(source[key]!==undefined){const value=source[key];if(!['string','number','boolean'].includes(typeof value))invalid();if(typeof value==='number')number(value);result[key]=value;}return result;}
function restore(input){
 let state;try{const encoded=typeof input==='string'?input:JSON.stringify(input);if(encoded.length>64*1024*1024)invalid();state=object(JSON.parse(encoded));}catch(error){invalid();}
 if(state.format!=='Galactica-4-player-state' || state.version!==1 || typeof state.isGameOver!=='boolean')invalid();
 text(state.gameId,64);if(!/^[a-f0-9]{64}$/.test(state.gameId))invalid();
 const config=new Config({...object(state.config),hosting:false,skipMapGeneration:true,autoplay:{enabled:false}});
 if(config.validate().length || state.config.totalPlayers!==config.totalPlayers)invalid();
 const viewer=integer(state.viewer,1,config.numHumans),turn=integer(state.turn,1);
 const map=object(state.map);number(map.width);number(map.height);if(map.width!==1024*1024*config.sectorSize || map.height!==1024*1024*config.sectorSize)invalid();
 const privatePlayer=object(state.privatePlayer);if(privatePlayer.playerNum!==viewer)invalid();
 for(const key of ['homeStarId','hiStarTech','hiShipTech','lastTurnPosted','defaultBuildType','defaultGrowth','defaultTech','defaultShips'])if(privatePlayer[key]!==undefined)number(privatePlayer[key]);
 for(const key of ['builtColony','builtScout','builtSatellite'])if(typeof privatePlayer[key]!=='boolean')invalid();
 const records=list(state.entities),byId=new Map();
 for(const row of records){object(row);if(!Object.prototype.hasOwnProperty.call(types,row.kind))invalid();integer(row.id,1);number(row.x);number(row.y);integer(row.visibility,0,4);
  const key=row.kind+':'+row.id;if(byId.has(key))invalid();
  for(const key of numeric)if(row[key]!==undefined)number(row[key]);
  if(row.owner!==undefined)integer(row.owner,0,config.totalPlayers);
  for(const key of booleans)if(row[key]!==undefined && typeof row[key]!=='boolean')invalid();
  if(row.name!==undefined)text(row.name,4096);if(row.type!==undefined){text(row.type,32);if(row.kind==='ship' && !['scout','colony','battleship','defense'].includes(row.type))invalid();}
  byId.set(key,{row,entity:null});
 }
 const game=new Game(new Factory(),new Rules(config.fastGame),config);
 game.clientPlayerNum=viewer;game.clientGameId=state.gameId;game.turn=turn;game.gameWidth=map.width;game.gameHeight=map.height;game.isGameOver=state.isGameOver;
 game.eventLog=[];game.overlay=null;game.overlayQueue=[];game.attention.queue=[];game.remoteComparisons=[];
 const comparisonFields=['stars','ships','shipsBuilding','population','production','productionRaw','power','minimumTech','maxTech','averageTech','minimumShipTech','maximumShipTech','averageShipTech','pieces'];
 const comparisons=list(state.comparisons);if(comparisons.length!==config.totalPlayers+1)invalid();
 comparisons.forEach((row,index)=>{object(row);if(row.playerNum!==index || typeof row.isAlive!=='boolean' || typeof row.assigned!=='boolean' || typeof row.isComputer!=='boolean' || row.isComputer!==(index>config.numHumans))invalid();text(row.name,4096);
  for(const field of comparisonFields)number(row[field]);
  const copy={...scalar(row,comparisonFields),playerNum:index,name:row.name,isAlive:row.isAlive,assigned:row.assigned,isComputer:row.isComputer};game.remoteComparisons.push(copy);
  const player=game.players[index];if(player){player.name=copy.name;player.isAlive=copy.isAlive;player.numPiecesRemaining=copy.pieces;}
 });
 Object.assign(game.players[viewer],scalar(privatePlayer,['homeStarId','hiStarTech','hiShipTech','builtColony','builtScout','builtSatellite','lastTurnPosted','defaultBuildType','defaultGrowth','defaultTech','defaultShips']));
 game.players[viewer].builtFighterClasses=new Set(list(privatePlayer.builtFighterClasses).map(n=>integer(n,1)));
 game.clientTurnPosted=game.players[viewer].lastTurnPosted===turn;
 for(const {row} of byId.values()){
  const e=Object.create(types[row.kind].prototype),defaults={id:row.id,x:row.x,y:row.y,game,owner:0,name:'',type:row.kind==='ship'?'unknown':row.kind,
   techLevel:0,population:0,damage:0,power:0,speed:0,progress:100,classIndex:0,scannerRange:0,stealth:1,apparentSize:0,
   visibilityTo:[],lastSeen:[],lastSeenBy:[],_spatialLocation:null,star:null,fleet:null,onPatrol:false,toBeScrapped:false,userCallIn:false,lastCallInTurn:-5,
   ships:[],defenseSatellites:[],totalPower:0,totalSpeed:0,totalDamage:0,moveDelta:{x:0,y:0},remainingDistance:0,anchor:null,
   currentShip:null,paidTowardShipBuilding:0,unassignedShipCredit:0,paidTowardResearch:0,buildCredits:{},defaultDestination:null};
  if(row.kind==='fleet')for(const key of ['power','speed','damage'])delete defaults[key];
  Object.assign(e,defaults,scalar(row,[...numeric.filter(key=>row.kind!=='fleet' || !['power','speed','damage'].includes(key)),...booleans,'name','type']));
  e.visibilityTo[viewer]=row.visibility;e.lastSeen[viewer]=row.visibility?turn:0;
  if(row.kind==='star'){
   e.chartLabel=row.name;
   for(const field of ['growth','shipBuilding','research']){e[field]=new Star.Allocation(0,0,0,false);if(row[field])Object.assign(e[field],scalar(object(row[field]),['value','desired','rate','benefit','locked']));}
   if(row.currentShip)e.currentShip=scalar(object(row.currentShip),['type','techLevel','cost','progress']);
   if(row.defense)e.remoteDefense=scalar(object(row.defense),['totalDefense','satelliteDefense','shipDefense']);
   if(row.buildCredits)e.buildCredits=scalar(object(row.buildCredits),['defense','scout','colony','battleship']);
  }
  if(row.kind==='fleet'){e.totalPower=row.power||0;e.totalSpeed=row.speed||0;e.totalDamage=row.damage||0;e.remoteUnknownContents=row.ships===undefined;}
  if(row.kind==='ship' || row.kind==='fleet')e.course=new Course(e);
  byId.get(row.kind+':'+row.id).entity=e;
 }
 function ref(value,allowed=Object.keys(types)){
  if(value==null)return null;object(value);if(!allowed.includes(value.kind))invalid();const entry=byId.get(value.kind+':'+integer(value.id,1));if(!entry)invalid();return entry.entity;
 }
 function point(value){object(value);number(value.x);number(value.y);return {x:value.x,y:value.y,target:ref(value.target) || {x:value.x,y:value.y}};}
 function route(value){object(value);const points=list(value.waypoints).map(point);
  const result={waypoints:points,current:integer(value.current,0,points.length),previous:integer(value.previous,-1,points.length),loop:value.loop,hunt:value.hunt,hasOrigin:value.hasOrigin};
  for(const flag of ['loop','hunt','hasOrigin'])if(typeof result[flag]!=='boolean')invalid();return result;
 }
 for(const {row,entity:e} of byId.values()){
  e.star=ref(row.star,['star']);e.fleet=ref(row.fleet,['fleet']);
  if(row.kind==='star'){
   e.defaultDestination=row.defaultDestination?point(row.defaultDestination).target:null;
   e.defenseSatellites=row.defenseSatellites?list(row.defenseSatellites).map(r=>ref(r,['ship'])):[];
  }
  if(row.ships)e.ships=list(row.ships).map(r=>ref(r,['ship','fleet']));
  if(row.kind==='rendezvous'){e.anchor=ref(row.anchor);e.fleet=ref(row.fleet,['fleet']);}
  if(row.course){if(!e.course)invalid();Object.assign(e.course,route(row.course));e.course.revision=integer(row.course.revision,0);
   if(row.course.memory){e.course.memory=route(row.course.memory);if(typeof row.course.memory.patrol!=='boolean')invalid();e.course.memory.patrol=row.course.memory.patrol;}
  }
 }
 const parents=new Map();
 for(const {row,entity:e} of byId.values())if(row.kind==='star' || row.kind==='fleet')for(const member of e.ships){
  if(member===e || parents.has(member))invalid();parents.set(member,e);
  if(row.kind==='fleet'){if(member.fleet && member.fleet!==e)invalid();member.fleet=e;member.star=e.star;}
  else{if(member.fleet || member.star && member.star!==e)invalid();member.star=e;}
 }
 for(const {row,entity:e} of byId.values()){
  if(row.kind==='rendezvous')continue;
  if(e.fleet && !e.fleet.ships.includes(e))invalid();
  const seen=new Set();let parent=e;while(parent){if(seen.has(parent))invalid();seen.add(parent);parent=parent.fleet;}
 }
 const events=list(state.events),ids=new Set();
 game.eventLog=events.map(row=>{object(row);integer(row.id,1);integer(row.turn,1);text(row.title);text(row.message);
  if(ids.has(row.id) || row.recipient!==undefined && row.recipient!==viewer)invalid();ids.add(row.id);
  const event={...scalar(row,['id','turn','title','message','type','recipient','handled','observer','automatic']),subject:ref(row.subject),position:row.position?{x:number(row.position.x),y:number(row.position.y)}:null};
  for(const [key,fields] of Object.entries(require('./host-view.js').reports))if(row[key])event[key]=scalar(object(row[key]),fields);
  return event;
 });
 game.nextEventId=0;for(const id of ids)game.nextEventId=Math.max(game.nextEventId,id);
 const lists={star:game.stars,ship:game.allShips,fleet:game.allFleets,rendezvous:game.allRendezvous};
 const spatial={star:'ENTITY_TYPE_STAR',ship:'ENTITY_TYPE_SHIP',fleet:'ENTITY_TYPE_FLEET',rendezvous:'ENTITY_TYPE_RENDEZVOUS'};
 for(const {row,entity:e} of byId.values()){lists[row.kind].push(e);game.spatialPartition.addEntity(e,Common.SpatialConstants[row.kind==='ship' && e.type==='defense'?'ENTITY_TYPE_DEFENSE':spatial[row.kind]]);}
 for(const event of game.eventLog)if(!event.handled)game.attention.requestEvent(event);
 for(const row of records)types[row.kind].nextId=Math.max(types[row.kind].nextId,row.id+1);
 return game;
}
module.exports={restore};
