// Reproject a same-turn settings change without dropping the player's draft orders.
const Common=require('./common.js'),Spatial=require('./spatial-partition.js').SpatialPartition;
const families={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'};
function preserveOrders(old,fresh){
 const viewer=old.clientPlayerNum,hasTerritory=[...fresh.stars,...fresh.allShips].some(e=>e.owner===old.clientPlayerNum),keys=new Map(),authoritative=new Map();
 for(const [kind,list] of Object.entries(families)){
  for(const e of old[list])keys.set(e,kind+':'+e.id);
  for(const e of fresh[list]){keys.set(e,kind+':'+e.id);authoritative.set(kind+':'+e.id,e);}
  fresh[list]=fresh[list].filter(e=>e.owner!==viewer).concat(old[list].filter(e=>e.owner===viewer && (authoritative.get(kind+':'+e.id)?.owner===viewer || hasTerritory && !old.clientOrderBase[kind].includes(e.id))));
 }
 const entities=new Map();for(const [kind,list] of Object.entries(families))for(const e of fresh[list])entities.set(kind+':'+e.id,e);
 const reference=e=>e && keys.has(e)?entities.get(keys.get(e)) || null:null;
 const target=e=>reference(e) || (e && !keys.has(e) && Number.isFinite(e.x) && Number.isFinite(e.y)?{x:e.x,y:e.y}:null);
 function route(course){if(!course)return;for(const p of course.waypoints)p.target=target(p.target) || {x:p.x,y:p.y};if(course.memory)route(course.memory);}
 fresh.spatialPartition=new Spatial();
 for(const [kind,list] of Object.entries(families))for(const e of fresh[list]){
  const original=authoritative.get(kind+':'+e.id);if(e.owner===viewer && original){e.scannerRange=original.scannerRange;e.visibilityTo=original.visibilityTo;e.lastSeen=original.lastSeen;e.lastSeenBy=original.lastSeenBy;}
  e.game=fresh;e._spatialLocation=null;
  for(const field of ['star','fleet','anchor'])if(field in e)e[field]=reference(e[field]);
  for(const field of ['ships','defenseSatellites'])if(Array.isArray(e[field]))e[field]=e[field].map(reference).filter(Boolean);
  if(e.defaultDestination)e.defaultDestination=target(e.defaultDestination);
  if(e.course)route(e.course);
  fresh.spatialPartition.addEntity(e,Common.SpatialConstants[kind==='ship' && e.type==='defense'?'ENTITY_TYPE_DEFENSE':'ENTITY_TYPE_'+kind.toUpperCase()]);
 }
 for(const event of fresh.eventLog)event.subject=reference(event.subject);
 for(const entry of fresh.attention.queue)entry.object=entry.event?entry.event.subject:reference(entry.object);
 for(const field of ['defaultBuildType','defaultGrowth','defaultShips','defaultTech'])fresh.players[viewer][field]=old.players[viewer][field];
 fresh.clientOrderBase=Object.fromEntries(Object.entries(old.clientOrderBase).map(([kind,ids])=>[kind,[...ids]]));fresh.clientPosting=old.clientPosting;
 return fresh;
}
module.exports={preserveOrders};
