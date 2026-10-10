// Versioned local-game documents. Object references are encoded separately from
// properties so containment, waypoints, historical subjects and queues retain identity.
const Game=require('./game.js'),Config=require('./game-config.js'),Factory=require('./factory.js'),Rules=require('./rules.js');
const Star=require('./star.js'),Ship=require('./ship.js'),Fleet=require('./fleet.js'),Rendezvous=require('./rendezvous.js');
const Common=require('./common.js');
const Random=require('./simulation-random.js');
const DisplayModes=require('./map-display-modes.js');
const Course=require('./course.js'),Player=require('./player-info.js'),ChartNames=require('./chart-names.js');
const types={Star,Ship,Fleet,Rendezvous,Course,Player,Allocation:Star.Allocation,Config,Rules};
const entityTypes=[Star,Ship,Fleet,Rendezvous];
const forbidden=new Set(['__proto__','constructor','prototype']);
const fields=['config','rules','players','stars','allShips','allFleets','allRendezvous','turn','gameWidth','gameHeight',
    'selectedObject','isGameOver','winningPlayerNum','victoryTurn','eventLog','nextEventId','eventSelection','eventPage',
    'eventDetailPage','turnAttentionPending','uiWindow','overlay','overlayQueue','showGrid','showNebula','showShips','showAllCourses','showCourierCourses','showScannerRanges','showMapNames','showEnemyEvents','mapDisplayMode'];
const maximumNodes=300000,maximumLength=64*1024*1024;
function invalid() {throw new Error('Invalid Galactica-4 saved game');}
function encodeGraph(root) {
    const nodes=[],known=new Map();
    function value(object,depth=0) {
        if(object===undefined)return {undefined:true};
        if(object===null || typeof object==='string' || typeof object==='boolean')return object;
        if(typeof object==='number'){if(!Number.isFinite(object))invalid();return object;}
        if(typeof object!=='object')invalid();
        if(known.has(object))return {ref:known.get(object)};
        if(depth>256 || nodes.length>=maximumNodes)invalid();
        const index=nodes.length;known.set(object,index);
        let type=Array.isArray(object)?'Array':object instanceof Map?'Map':object instanceof Set?'Set':
            Object.getPrototypeOf(object)===Object.prototype || Object.getPrototypeOf(object)===null?'Object':
            Object.keys(types).find(name=>Object.getPrototypeOf(object)===types[name].prototype);
        if(!type)invalid();
        const node={type};nodes.push(node);
        if(type==='Map')node.entries=[...object].map(([key,item])=>[value(key,depth+1),value(item,depth+1)]);
        else if(type==='Set')node.entries=[...object].map(item=>value(item,depth+1));
        else {
            if(type==='Array')node.length=object.length;
            node.properties=Object.keys(object).filter(key=>key!=='game' && key!=='_spatialLocation').map(key=>{
                if(forbidden.has(key))invalid();return [key,value(object[key],depth+1)];
            });
        }
        return {ref:index};
    }
    return {root:value(root),nodes};
}
function decodeGraph(graph) {
    if(!graph || !Array.isArray(graph.nodes) || graph.nodes.length>maximumNodes)invalid();
    const nodes=graph.nodes.map(node=>{
        if(!node || typeof node.type!=='string')invalid();
        if(node.type==='Array'){if(!Number.isInteger(node.length) || node.length<0 || node.length>maximumNodes)invalid();return new Array(node.length);}
        if(node.type==='Map')return new Map();if(node.type==='Set')return new Set();
        if(node.type==='Object')return {};
        if(!Object.prototype.hasOwnProperty.call(types,node.type))invalid();
        return Object.create(types[node.type].prototype);
    });
    function value(item) {
        if(item===null || typeof item==='string' || typeof item==='boolean')return item;
        if(typeof item==='number'){if(!Number.isFinite(item))invalid();return item;}
        if(!item || typeof item!=='object' || Array.isArray(item) || Object.keys(item).length!==1)invalid();
        if(item.undefined===true)return undefined;
        if(!Number.isInteger(item.ref) || item.ref<0 || item.ref>=nodes.length)invalid();return nodes[item.ref];
    }
    graph.nodes.forEach((node,index)=>{
        const object=nodes[index];
        if(node.type==='Map' || node.type==='Set') {
            if(!Array.isArray(node.entries) || node.entries.length>maximumNodes)invalid();
            node.entries.forEach(entry=>{
                if(node.type==='Map'){if(!Array.isArray(entry) || entry.length!==2)invalid();object.set(value(entry[0]),value(entry[1]));}
                else object.add(value(entry));
            });
        } else {
            if(!Array.isArray(node.properties) || node.properties.length>maximumNodes)invalid();
            const keys=new Set();
            node.properties.forEach(pair=>{
                if(!Array.isArray(pair) || pair.length!==2 || typeof pair[0]!=='string')invalid();
                const key=pair[0];if(types[node.type] && key in types[node.type].prototype)invalid();
                if(forbidden.has(key) || key==='game' || key==='_spatialLocation' || keys.has(key))invalid();keys.add(key);
                if(node.type==='Array' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key)>=node.length))invalid();
                Object.defineProperty(object,key,{value:value(pair[1]),writable:true,enumerable:true,configurable:true});
            });
        }
    });
    return {root:value(graph.root),nodes};
}
function snapshot(game,contentOnly=false) {
    const state={};for(const key of fields)state[key]=game[key];
    // v3 retains the Events window; command menus and order editors are transient.
    state.uiWindow=game.uiWindow==='events'?'events':null;
    state.tutorialRandom=game.tutorialRandom==null?null:game.tutorialRandom;
    state.attention=game.attention.queue;
    state.chart=ChartNames.snapshot(game);
    state.aiSkills=[...game.aiManager.aiPlayers].map(([id,player])=>[id,player.skillManager.getSkillLevel()]);
    state.camera=game.display?{zoom:game.display.camera.zoom,panX:game.display.camera.panX,panY:game.display.camera.panY}:game.savedCamera || null;
    if(contentOnly)for(const key of ['selectedObject','eventLog','nextEventId','eventSelection','eventPage','eventDetailPage','turnAttentionPending','uiWindow','overlay','overlayQueue','attention','chart','camera','showGrid','showNebula','showShips','showAllCourses','showCourierCourses','showScannerRanges','showMapNames','showEnemyEvents','mapDisplayMode'])delete state[key];
    return {format:'Galactica-4',version:1,graph:encodeGraph(state)};
}
// Navigation and report review do not mark the document modified in v3.
function contentSignature(game) {return JSON.stringify(snapshot(game,true));}
function serialize(game) {return JSON.stringify(snapshot(game));}
function validate(state,nodes) {
    if(!state || !Number.isInteger(state.turn) || state.turn<1 || !Number.isFinite(state.gameWidth) || state.gameWidth<=0 || !Number.isFinite(state.gameHeight) || state.gameHeight<=0)invalid();
    if(!(state.config instanceof Config) || state.config.validate().length || !(state.rules instanceof Rules) || state.rules.isFast!==state.config.fastGame)invalid();
    if(fields.some(key=>key!=='showEnemyEvents' && key!=='turnAttentionPending' && !Object.prototype.hasOwnProperty.call(state,key)))invalid();
    if(state.turnAttentionPending!==undefined && typeof state.turnAttentionPending!=='boolean')invalid();
    if(state.showEnemyEvents!==undefined && typeof state.showEnemyEvents!=='boolean')invalid();
    if(state.tutorialRandom!=null && !Random.valid(state.tutorialRandom))invalid();
    const total=state.config.totalPlayers;if(total!==state.config.numHumans+state.config.numComputers)invalid();
    for(const key of ['isGameOver','showGrid','showNebula','showShips','showAllCourses','showCourierCourses','showScannerRanges','showMapNames'])if(typeof state[key]!=='boolean')invalid();
    if(!DisplayModes.valid(state.mapDisplayMode) || (state.uiWindow!==null && state.uiWindow!=='events'))invalid();
    if(!Array.isArray(state.players) || state.players.length!==total+1 || state.players[0]!==null)invalid();
    state.players.slice(1).forEach((player,index)=>{if(!(player instanceof Player) || player.playerNum!==index+1 || !(player.builtFighterClasses instanceof Set))invalid();});
    const lists=[state.stars,state.allShips,state.allFleets,state.allRendezvous];
    lists.forEach((list,index)=>{
        if(!Array.isArray(list) || new Set(list).size!==list.length)invalid();const ids=new Set();
        for(const entity of list){if(!(entity instanceof entityTypes[index]) || ids.has(entity.id))invalid();ids.add(entity.id);}
    });
    if(state.selectedObject!==null && !lists.some(list=>list.includes(state.selectedObject)))invalid();
    const entities=nodes.filter(object=>entityTypes.some(type=>object instanceof type));
    for(const entity of entities) {
        if(!Number.isSafeInteger(entity.id) || entity.id<1 || !Number.isFinite(entity.x) || !Number.isFinite(entity.y) || !Number.isInteger(entity.owner) || entity.owner<0 || entity.owner>total)invalid();
        if(!Array.isArray(entity.visibilityTo) || !Array.isArray(entity.lastSeen) || !Array.isArray(entity.lastSeenBy))invalid();
        if(entity instanceof Star){if(!Number.isFinite(entity.population) || entity.population<0 || !Array.isArray(entity.ships) || !Array.isArray(entity.defenseSatellites))invalid();
            for(const key of ['growth','shipBuilding','research']){const allocation=entity[key];if(!(allocation instanceof Star.Allocation) || !Number.isFinite(allocation.value) || !Number.isFinite(allocation.desired) || allocation.value<0 || allocation.value>100 || allocation.desired<0 || allocation.desired>100)invalid();}}
        if(entity instanceof Ship && (!['scout','colony','battleship','defense'].includes(entity.type) || !Number.isFinite(entity.progress)))invalid();
        if(entity instanceof Fleet && !Array.isArray(entity.ships))invalid();
        if((entity instanceof Ship || entity instanceof Fleet) && (!(entity.course instanceof Course) || entity.course.owner!==entity || !Array.isArray(entity.course.waypoints)))invalid();
    }
    // Reject malformed containment before any recursive fleet methods are invoked.
    const visiting=new Set(),visited=new Set();
    function fleetMembers(fleet) {
        if(visiting.has(fleet))invalid();if(visited.has(fleet))return;visiting.add(fleet);
        for(const member of fleet.ships){if(!(member instanceof Ship || member instanceof Fleet) || member.fleet!==fleet)invalid();if(member instanceof Fleet)fleetMembers(member);}
        visiting.delete(fleet);visited.add(fleet);
    }
    state.allFleets.forEach(fleetMembers);
    for(const star of state.stars)for(const ship of star.ships){if(!(ship instanceof Ship || ship instanceof Fleet) || ship.star!==star || ship.fleet)invalid();}
    if(!Array.isArray(state.eventLog) || !Number.isSafeInteger(state.nextEventId) || state.nextEventId<0 || !Array.isArray(state.attention) || !Array.isArray(state.overlayQueue) || !Array.isArray(state.aiSkills))invalid();
    if(new Set(state.eventLog.map(event=>event && event.id)).size!==state.eventLog.length)invalid();
    for(const event of state.eventLog)if(!event || !Number.isSafeInteger(event.id) || event.id<1 || event.id>state.nextEventId || !Number.isInteger(event.turn) || typeof event.title!=='string' || typeof event.message!=='string')invalid();
    if(state.camera && (!Number.isFinite(state.camera.zoom) || state.camera.zoom<=0 || !Number.isFinite(state.camera.panX) || !Number.isFinite(state.camera.panY)))invalid();
    if(state.chart && (!(state.chart.names instanceof Map) || !Array.isArray(state.chart.pool) || !Array.isArray(state.chart.numerals)))invalid();
    return entities;
}
function restore(input) {
    if(typeof input!=='string' || input.length>maximumLength)invalid();
    const document=JSON.parse(input);
    if(!document || document.format!=='Galactica-4' || document.version!==1)invalid();
    const {root:state,nodes}=decodeGraph(document.graph),entities=validate(state,nodes);
    const factory=new Factory();
    // Suppress generation and constructor startup reports; install saved state afterwards.
    const game=new Game(factory,state.rules,new Config({...state.config,skipMapGeneration:true}));
    for(const key of fields)game[key]=state[key];
    game.turnAttentionPending=state.turnAttentionPending===true;
    game.showEnemyEvents=state.showEnemyEvents===undefined?true:state.showEnemyEvents;
    if(state.tutorialRandom)game.tutorialRandom=state.tutorialRandom;
    game.attention.queue=state.attention;
    for(const entity of entities){entity.game=game;entity._spatialLocation=null;}
    const spatialTypes=[Common.SpatialConstants.ENTITY_TYPE_STAR,Common.SpatialConstants.ENTITY_TYPE_SHIP,Common.SpatialConstants.ENTITY_TYPE_FLEET,Common.SpatialConstants.ENTITY_TYPE_RENDEZVOUS];
    [game.stars,game.allShips,game.allFleets,game.allRendezvous].forEach((list,index)=>list.forEach(entity=>
        game.spatialPartition.addEntity(entity,entity instanceof Ship && entity.type==='defense'?Common.SpatialConstants.ENTITY_TYPE_DEFENSE:spatialTypes[index])));
    for(const entity of entities)entity.constructor.nextId=Math.max(entity.constructor.nextId,entity.id+1);
    for(const [id,skill] of state.aiSkills)game.aiManager.setAISkillLevel(id,skill);
    ChartNames.restore(game,state.chart);
    game.savedCamera=state.camera;
    game.restoredFromSave=true;
    return game;
}
module.exports={serialize,restore,snapshot,contentSignature,encodeGraph,decodeGraph};
