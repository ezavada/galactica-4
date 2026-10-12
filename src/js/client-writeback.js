// Reconcile a saved decision snapshot while preserving newer local edits.
const Orders=require('./player-orders.js'),Course=require('./course.js');
const families={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'},types={fleet:require('./fleet.js'),rendezvous:require('./rendezvous.js')};
const key=row=>(row.created?'new:':'')+row.kind+':'+row.id,equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function signature(game){const value=Orders.snapshot(game,'0'.repeat(32));value.entities.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id-b.id);return JSON.stringify(value);}
function capture(game,id){const orders=Orders.snapshot(game,id),refs=new Map();for(const [kind,list] of Object.entries(families))for(const e of game[list])if(e.owner===game.clientPlayerNum)refs.set(kind+':'+e.id,e);return {model:game,orders,refs};}
function validate(pending,fresh,ids){
 const created=pending.orders.entities.filter(row=>row.created);
 if(!Array.isArray(ids) || ids.length!==created.length || fresh.clientOrderRevision!==pending.revision+1)throw Error('network_bad_response');
 const seen=new Set(),assigned=new Set();
 for(const row of ids){if(!row || typeof row!=='object' || Array.isArray(row) || Object.keys(row).some(k=>!['kind','tempId','id'].includes(k)) || !created.some(e=>e.kind===row.kind && e.id===row.tempId) || !Number.isSafeInteger(row.id) || row.id<1 || pending.orders.entities.some(e=>!e.created && e.kind===row.kind && e.id===row.id) || seen.has(row.kind+':'+row.tempId) || assigned.has(row.kind+':'+row.id) || !fresh[families[row.kind]].some(e=>e.id===row.id && e.owner===fresh.clientPlayerNum))throw Error('network_bad_response');seen.add(row.kind+':'+row.tempId);assigned.add(row.kind+':'+row.id);}
}
function reconcile(pending,current,fresh,ids){
 const before=Orders.snapshot(current,'0'.repeat(32)),rows=new Map(before.entities.map(row=>[key(row),row])),base=fresh.clientOrderBase;
 const received=signature(fresh),remaps=ids.map(row=>({row,entity:pending.refs.get(row.kind+':'+row.tempId)}));
 // New in-flight objects may use an ID that the host assigned to a submitted
 // object. Move those temporary objects first; object references remain intact.
 for(const kind of ['fleet','rendezvous']){
  const assigned=new Set(remaps.filter(entry=>entry.row.kind===kind).map(entry=>entry.row.id)),submitted=new Set(remaps.filter(entry=>entry.row.kind===kind).map(entry=>entry.entity));
  const used=new Set([...current[families[kind]],...fresh[families[kind]]].map(e=>e.id));let next=Math.max(types[kind].nextId,1);for(const id of used)next=Math.max(next,id+1);
  for(const e of current[families[kind]])if(e.owner===current.clientPlayerNum && !submitted.has(e) && assigned.has(e.id)){if(!Number.isSafeInteger(next))throw Error('network_bad_response');e.id=next++;}
  types[kind].nextId=Math.max(types[kind].nextId,next);
 }
 for(const {row,entity} of remaps)if(entity)entity.id=row.id;
 current.clientOrderBase=base;
 const currentEntities=new Map(),freshEntities=new Map(),freshKinds=new Map();
 for(const [kind,list] of Object.entries(families)){for(const e of current[list])currentEntities.set(kind+':'+e.id,e);for(const e of fresh[list]){freshEntities.set(kind+':'+e.id,e);freshKinds.set(e,kind);}}
 const target=value=>{if(!value)return null;const kind=freshKinds.get(value);return kind?(value.owner===current.clientPlayerNum?currentEntities.get(kind+':'+value.id) || null:value):{x:value.x,y:value.y};};
 const route=value=>{if(!value)return null;const copy={};for(const k of ['current','previous','loop','hunt','hasOrigin','patrol'])if(value[k]!==undefined)copy[k]=value[k];copy.waypoints=value.waypoints.map(p=>({x:p.x,y:p.y,target:target(p.target) || {x:p.x,y:p.y}}));return copy;};
 const authoritativeRows=new Map(Orders.snapshot(fresh,'0'.repeat(32)).entities.map(row=>[row.kind+':'+row.id,row]));
 const afterRows=new Map(Orders.snapshot(current,'0'.repeat(32)).entities.map(row=>[row.kind+':'+row.id,row]));
 for(const submitted of pending.orders.entities){
  const e=pending.refs.get(submitted.kind+':'+submitted.id),live=rows.get(key(submitted));if(!e || !live || !current[families[submitted.kind]].includes(e))continue;
  const authoritative=freshEntities.get(submitted.kind+':'+e.id),actual=authoritativeRows.get(submitted.kind+':'+e.id),after=afterRows.get(submitted.kind+':'+e.id);if(!authoritative || !actual || !after)continue;
  const copy=(field,apply)=>{if(equal(live[field],submitted[field]) && !equal(after[field],actual[field]))apply();};
  copy('name',()=>e.name=authoritative.name);
  if(submitted.kind==='star'){
   copy('allocations',()=>{for(const field of ['growth','shipBuilding','research']){e[field].desired=authoritative[field].desired;e[field].locked=authoritative[field].locked;}});
   copy('buildType',()=>{e.currentShip=authoritative.currentShip;if(e.currentShip){e.currentShip.star=e;e.currentShip.game=current;}});copy('destination',()=>e.defaultDestination=target(authoritative.defaultDestination));
  }else if(submitted.kind==='rendezvous'){for(const field of ['x','y'])copy(field,()=>e[field]=authoritative[field]);copy('anchor',()=>e.anchor=target(authoritative.anchor));}
  else{
   copy('parent',()=>{e.fleet=target(authoritative.fleet);e.star=target(authoritative.star);});
   copy('course',()=>{const old=e.course;e.course=Object.assign(new Course(e),route(authoritative.course),{revision:(old.revision || 0)+1,memory:old.memory});});
   copy('memory',()=>e.course.memory=route(authoritative.course.memory));
   for(const field of ['onPatrol','toBeScrapped','userCallIn'])copy(field,()=>e[field]=authoritative[field]);
  }
 }
 if(equal(before.defaults,pending.orders.defaults))Object.assign(current.players[current.clientPlayerNum],Orders.snapshot(fresh,'0'.repeat(32)).defaults);
 require('./client-settings-refresh.js').preserveOrders(current,fresh);fresh.clientOrderBase=base;for(const star of fresh.stars)if(star.currentShip){star.currentShip.game=fresh;star.currentShip.star=star;}
 // Rebuild owned containment from the latest child parent references.
 for(const container of [...fresh.stars,...fresh.allFleets]){container.ships=(container.ships || []).filter(e=>e.owner!==fresh.clientPlayerNum);if(container.defenseSatellites)container.defenseSatellites=container.defenseSatellites.filter(e=>e.owner!==fresh.clientPlayerNum);}
 for(const e of [...fresh.allShips,...fresh.allFleets].filter(e=>e.owner===fresh.clientPlayerNum)){const parent=e.fleet || e.star;if(parent){const list=e.type==='defense'?parent.defenseSatellites:parent.ships;if(list && !list.includes(e))list.push(e);}}
 for(const fleet of fresh.allFleets)if(fleet.owner===fresh.clientPlayerNum)fleet.calculateFleetStats();
 return {model:fresh,received};
}
module.exports={signature,capture,validate,reconcile};
