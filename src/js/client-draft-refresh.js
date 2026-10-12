// Adopt authoritative simulation state while replaying only unsaved decisions.
const Orders=require('./player-orders.js'),Course=require('./course.js'),Common=require('./common.js');
const families={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'};
const types={fleet:require('./fleet.js'),rendezvous:require('./rendezvous.js')};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),key=row=>row.kind+':'+row.id;
function rebase(current,fresh,saved){
 const base=JSON.parse(saved),received=require('./client-writeback.js').signature(fresh);
 const baseline=new Map(base.entities.map(row=>[key(row),row])),viewer=fresh.clientPlayerNum;
 // A host-side creation can occupy a temporary ID used by a local draft.
 for(const kind of ['fleet','rendezvous']){
  const server=new Set(fresh[families[kind]].map(e=>e.id));let next=Math.max(1,types[kind].nextId);
  for(const e of [...fresh[families[kind]],...current[families[kind]]])next=Math.max(next,e.id+1);
  for(const e of current[families[kind]])if(e.owner===viewer && !current.clientOrderBase[kind].includes(e.id) && server.has(e.id)){
   if(!Number.isSafeInteger(next))throw Error('invalid_player_state');e.id=next++;
  }
  types[kind].nextId=Math.max(types[kind].nextId,next);
 }
 const draft=Orders.snapshot(current,'0'.repeat(32)),rows=new Map(draft.entities.map(row=>[key(row),row]));
 const hasTerritory=[...fresh.stars,...fresh.allShips].some(e=>e.owner===viewer);
 for(const kind of ['fleet','rendezvous']){
  fresh[families[kind]]=fresh[families[kind]].filter(e=>e.owner!==viewer || !baseline.has(kind+':'+e.id) || rows.has(kind+':'+e.id));
  if(hasTerritory)for(const e of current[families[kind]])if(e.owner===viewer && !current.clientOrderBase[kind].includes(e.id)){fresh[families[kind]].push(e);e.game=fresh;}
 }
 const entities=new Map();for(const [kind,list] of Object.entries(families))for(const e of fresh[list])entities.set(kind+':'+e.id,e);
 const ref=value=>value?entities.get(value.kind+':'+value.id) || null:null;
 const destination=p=>p?(ref(p.target) || {x:p.x,y:p.y}):null;
 const route=(data,owner)=>{
  if(!data)return null;const copy={};for(const field of ['current','previous','loop','hunt','hasOrigin','patrol'])if(data[field]!==undefined)copy[field]=data[field];
  copy.waypoints=data.waypoints.map(p=>({x:p.x,y:p.y,target:destination(p)}));return owner?Object.assign(new Course(owner),copy):copy;
 };
 for(const row of draft.entities){
  const e=entities.get(key(row)),old=baseline.get(key(row));if(!e || e.owner!==viewer)continue;
  const changed=field=>row.created || !!old && !equal(row[field],old[field]);
  if(changed('name'))e.name=row.name;
  if(row.kind==='star'){
   if(changed('allocations'))['growth','shipBuilding','research'].forEach((field,index)=>{e[field].desired=row.allocations[index].desired/10;e[field].locked=row.allocations[index].locked;});
   if(changed('buildType') && row.buildType && e.currentShip?.type!==row.buildType)e.startBuildingShip(row.buildType);
   if(changed('destination'))e.defaultDestination=destination(row.destination);
  }else if(row.kind==='rendezvous'){
   for(const field of ['x','y'])if(changed(field))e[field]=row[field];if(changed('anchor'))e.anchor=ref(row.anchor);
  }else{
   if(changed('parent')){const parent=ref(row.parent);e.fleet=row.parent?.kind==='fleet'?parent:null;e.star=row.parent?.kind==='star'?parent:null;}
   if(changed('course')){const memory=e.course.memory;e.course=route(row.course,e);e.course.memory=memory;}
   if(changed('memory'))e.course.memory=route(row.memory);
   for(const field of ['onPatrol','toBeScrapped','userCallIn'])if(changed(field))e[field]=row[field];
  }
 }
 for(const [field,value] of Object.entries(draft.defaults))if(!equal(value,base.defaults[field]))fresh.players[viewer][field]=value;
 // Newly retained objects may still refer to the previous projection.
 const oldKinds=new Map();for(const [kind,list] of Object.entries(families))for(const e of current[list])oldKinds.set(e,kind);
 const link=e=>e && oldKinds.has(e)?entities.get(oldKinds.get(e)+':'+e.id) || null:e;
 const linkCourse=course=>{if(!course)return;for(const p of course.waypoints)p.target=link(p.target) || {x:p.x,y:p.y};if(course.memory)linkCourse(course.memory);};
 for(const [kind,list] of Object.entries(families))for(const e of fresh[list]){
  if(e.owner!==viewer)continue;
  for(const field of ['star','fleet','anchor','defaultDestination'])if(e[field])e[field]=link(e[field]);
  if(e.course)linkCourse(e.course);
 }
 for(const container of [...fresh.stars,...fresh.allFleets]){container.ships=(container.ships || []).filter(e=>e.owner!==viewer);if(container.defenseSatellites)container.defenseSatellites=container.defenseSatellites.filter(e=>e.owner!==viewer);}
 for(const e of [...fresh.allShips,...fresh.allFleets].filter(e=>e.owner===viewer)){const parent=e.fleet || e.star;if(parent){const list=e.type==='defense'?parent.defenseSatellites:parent.ships;if(list && !list.includes(e))list.push(e);}}
 for(const e of fresh.allFleets)if(e.owner===viewer)e.calculateFleetStats();
 fresh.spatialPartition=new (require('./spatial-partition.js').SpatialPartition)();
 for(const [kind,list] of Object.entries(families))for(const e of fresh[list]){e.game=fresh;e._spatialLocation=null;fresh.spatialPartition.addEntity(e,Common.SpatialConstants[kind==='ship' && e.type==='defense'?'ENTITY_TYPE_DEFENSE':'ENTITY_TYPE_'+kind.toUpperCase()]);}
 fresh.clientPosting=current.clientPosting;return {model:fresh,received};
}
module.exports={rebase};
