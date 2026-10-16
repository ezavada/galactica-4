// Only player decisions cross this boundary. Simulation values stay on the host.
const View=require('./host-view.js'),Names=require('./player-name.js'),Course=require('./course.js');
const families={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'};
const {protocol}=require('./network-protocol.js');
const allocations=['growth','shipBuilding','research'];
function bad(){const e=new Error('bad_orders');e.code='bad_orders';throw e;}
function object(o,keys){if(!o || typeof o!=='object' || Array.isArray(o) || Object.keys(o).some(k=>!keys.includes(k)))bad();return o;}
function integer(n,min=0,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(n) || n<min || n>max)bad();return n;}
function boolean(v){if(typeof v!=='boolean')bad();return v;}
function array(v,max=300000){if(!Array.isArray(v) || v.length>max)bad();return v;}
function key(ref){return (ref.created?'new:':'')+ref.kind+':'+ref.id;}
function baseline(game){const ids={};for(const [kind,list] of Object.entries(families))ids[kind]=game[list].filter(e=>e.owner===game.clientPlayerNum).map(e=>e.id);return ids;}
function snapshot(game,postId){
 if(!game.clientPlayerNum || !game.clientOrderBase)bad();const viewer=game.clientPlayerNum,kindByEntity=new Map(),base={};
 for(const [kind,list] of Object.entries(families)){base[kind]=new Set(game.clientOrderBase[kind]);for(const e of game[list])kindByEntity.set(e,kind);}
 const ref=e=>{if(!e)return null;const kind=kindByEntity.get(e);return kind?{kind,id:e.id,created:e.owner===viewer && !base[kind].has(e.id)}:null;};
 const point=p=>{const target=p.target || p;return {x:p.x,y:p.y,target:ref(target)};};
 const route=c=>({waypoints:c.waypoints.map(point),current:c.current,previous:c.previous,loop:c.loop,hunt:c.hunt,hasOrigin:c.hasOrigin});
 const rows=[];
 for(const [kind,list] of Object.entries(families))for(const e of game[list])if(e.owner===viewer){
  const row={kind,id:e.id,created:!base[kind].has(e.id),name:e.name};
  if(kind==='star'){row.allocations=allocations.map(k=>({desired:Math.round(e[k].desired*10),locked:e[k].locked}));row.buildType=e.currentShip?e.currentShip.type:null;row.destination=e.defaultDestination?point(e.defaultDestination):null;}
  else if(kind==='rendezvous'){Object.assign(row,{x:e.x,y:e.y,anchor:ref(e.anchor)});}
  else{Object.assign(row,{parent:ref(e.fleet || e.star),course:route(e.course),memory:e.course.memory?{...route(e.course.memory),patrol:e.course.memory.patrol}:null,onPatrol:e.type==='defense'?false:e.onPatrol,toBeScrapped:e.toBeScrapped,userCallIn:e.type==='defense'?false:e.userCallIn});}
  rows.push(row);
 }
 const player=game.players[viewer];return {protocol,gameId:game.clientGameId,turn:game.turn,postId,defaults:{defaultBuildType:player.defaultBuildType,defaultGrowth:player.defaultGrowth,defaultShips:player.defaultShips,defaultTech:player.defaultTech},entities:rows};
}
// Apply to a private staging game; callers publish it only after all checks and persistence succeed.
function apply(game,viewer,request){
 object(request,['protocol','gameId','turn','postId','defaults','entities']);if(request.protocol!==protocol)bad();
 if(request.gameId!==game.config.networkHost.id){const e=new Error('wrong_game');e.code=e.message;throw e;}
 if(request.turn!==game.turn){const e=new Error('wrong_turn');e.code=e.message;throw e;}
 if(typeof request.postId!=='string' || !/^[a-f0-9]{32}$/.test(request.postId))bad();
 const player=game.players[viewer];if(!player || !player.isAlive)bad();
 const defaults=object(request.defaults,['defaultBuildType','defaultGrowth','defaultShips','defaultTech']);
 integer(defaults.defaultBuildType,1,4);for(const k of ['defaultGrowth','defaultShips','defaultTech'])integer(defaults[k],0,1000);
 if(defaults.defaultGrowth+defaults.defaultShips+defaults.defaultTech!==1000)bad();
 const known=new Map(),visible=new Set(View.snapshot(game,viewer).entities.map(e=>e.kind+':'+e.id));
 for(const [kind,list] of Object.entries(families))for(const e of game[list])known.set(kind+':'+e.id,e);
 const rows=array(request.entities),entries=new Map(),created=[];
 for(const row of rows){
  if(!row || !Object.prototype.hasOwnProperty.call(families,row.kind))bad();const kind=row.kind;
  object(row,['kind','id','created','name',...(kind==='star'?['allocations','buildType','destination']:kind==='rendezvous'?['x','y','anchor']:['parent','course','memory','onPatrol','toBeScrapped','userCallIn'])]);
  integer(row.id,1);boolean(row.created);if(entries.has(key(row)))bad();
  let entity=known.get(kind+':'+row.id);
  if(row.created){if(!['fleet','rendezvous'].includes(kind))bad();entity=null;created.push(row);}
  else if(!entity || entity.owner!==viewer)bad();
  if(typeof row.name!=='string' || row.name.length>4096 || (!entity || row.name!==entity.name) && !Names.validName(row.name))bad();
  entries.set(key(row),{row,entity});
 }
 // Stars and ships cannot be manufactured, omitted or deleted by a client.
 for(const [kind,list] of Object.entries(families))if(['star','ship'].includes(kind))for(const e of game[list])if(e.owner===viewer && !entries.has(kind+':'+e.id))bad();
 for(const row of created){const e=row.kind==='fleet'?game.factory.createFleet(0,0,viewer,row.name):game.factory.createRendezvous(0,0,viewer,row.name);entries.get(key(row)).entity=e;}
 function reference(value,allowed=Object.keys(families)){
  if(value===null)return null;object(value,['kind','id','created']);integer(value.id,1);boolean(value.created);if(!allowed.includes(value.kind))bad();
  const entry=entries.get(key(value)),e=value.created?entry && entry.entity:known.get(value.kind+':'+value.id);
  if(!e || !value.created && e.owner===viewer && ['fleet','rendezvous'].includes(value.kind) && !entries.has(key(value)) || !value.created && !visible.has(value.kind+':'+value.id))bad();return e;
 }
 function coordinate(n){if(typeof n!=='number' || !Number.isFinite(n) || Math.abs(n)>Number.MAX_SAFE_INTEGER)bad();return n;}
 function point(p){object(p,['x','y','target']);const x=coordinate(p.x),y=coordinate(p.y),target=reference(p.target);return {x,y,target:target || {x,y}};}
 function route(c,memory=false){
  object(c,['waypoints','current','previous','loop','hunt','hasOrigin',...(memory?['patrol']:[])]);const points=array(c.waypoints,4096).map(point);
  const value={waypoints:points,current:integer(c.current,0,points.length),previous:integer(c.previous,-1,points.length),loop:boolean(c.loop),hunt:boolean(c.hunt),hasOrigin:boolean(c.hasOrigin)};
  if(memory)value.patrol=boolean(c.patrol);return value;
 }
 const byEntity=new Map([...entries.values()].map(entry=>[entry.entity,entry]));
 const parents=new Map(),mobile=[];
 for(const {row,entity:e} of entries.values()){
  if(row.kind==='star'){
   const values=array(row.allocations,3);if(values.length!==3)bad();values.forEach(v=>{object(v,['desired','locked']);integer(v.desired,0,1000);boolean(v.locked);});if(values.reduce((s,v)=>s+v.desired,0)!==1000)bad();
   if(row.buildType!==null && !['defense','scout','colony','battleship'].includes(row.buildType) || row.buildType===null && e.currentShip)bad();
   e._orderDestination=row.destination===null?null:point(row.destination).target;
  }else if(row.kind==='rendezvous'){
   coordinate(row.x);coordinate(row.y);const anchor=reference(row.anchor,['star','ship','fleet']);
   if(anchor && !row.anchor.created && anchor.owner!==viewer && !visible.has(row.anchor.kind+':'+row.anchor.id))bad();
   e._orderAnchor=anchor;e._orderPosition={x:row.x,y:row.y};
  }else{
   const parent=reference(row.parent,['star','fleet']);if(parent && parent.type==='fleet' && parent.owner!==viewer)bad();
   parents.set(e,parent);mobile.push(e);e._orderCourse=route(row.course);e._orderMemory=row.memory===null?null:route(row.memory,true);
   boolean(row.onPatrol);boolean(row.toBeScrapped);boolean(row.userCallIn);
   if(e._orderCourse.waypoints.some(p=>p.target===e) || e._orderMemory && e._orderMemory.waypoints.some(p=>p.target===e))bad();
   if(row.onPatrol && (row.toBeScrapped || e._orderCourse.waypoints.length))bad();
   if(e.type==='defense' && (parent!==e.star || e._orderCourse.waypoints.length || row.onPatrol || row.userCallIn))bad();
  }
 }
 const members=new Map();for(const e of mobile){const p=parents.get(e);if(p){if(!members.has(p))members.set(p,[]);members.get(p).push(e);}}
 const resolving=new Set(),resolved=new Set();
 function location(e){
  if(resolved.has(e))return;if(resolving.has(e))bad();resolving.add(e);
  const entry=byEntity.get(e);
  if(entry && entry.row.kind==='fleet'){
   const contents=members.get(e) || [];if(!contents.length)bad();contents.forEach(location);
   if(entry.row.created){e.x=contents[0].x;e.y=contents[0].y;}
   for(const member of contents)if(Math.abs(member.x-e.x)>=5 || Math.abs(member.y-e.y)>=5)bad();
  }
  resolving.delete(e);resolved.add(e);
 }
 mobile.forEach(location);
 // New membership may only exchange colocated units, with no ancestor cycles.
 for(const e of mobile){const seen=new Set();let p=e;while(p){if(seen.has(p))bad();seen.add(p);p=parents.get(p) || null;}
  const parent=parents.get(e);if(parent && (Math.abs(parent.x-e.x)>=5 || Math.abs(parent.y-e.y)>=5))bad();
  if(e.type!=='defense' && parent!== (e.fleet || e.star) && (byEntity.get(e).row.onPatrol || e.underConstruction && e.underConstruction()))bad();
 }
 // Delete empty groups/removed markers only after references and membership validate.
 for(const kind of ['fleet','rendezvous'])for(const e of [...game[families[kind]]])if(e.owner===viewer && !created.some(r=>entries.get(key(r)).entity===e) && !entries.has(kind+':'+e.id)){
  if(kind==='fleet' && e.ships.some(m=>m.owner!==viewer))bad();game.entityRemoved(e);if(kind==='fleet'){e.ships=[];e.fleet=null;e.star=null;}
 }
 for(const star of game.stars)star.ships=star.ships.filter(e=>e.owner!==viewer || e.type==='defense');
 for(const fleet of game.allFleets)if(fleet.owner===viewer)fleet.ships=[];
 for(const e of mobile){
  const parent=parents.get(e);if(e.type==='defense')continue;
  e.fleet=parent && parent.type==='fleet'?parent:null;e.star=parent && game.factory.isStar(parent)?parent:null;
  if(parent)parent.ships.push(e);
 }
 function dock(e){if(e.fleet){e.star=dock(e.fleet);}return e.star;}
 mobile.forEach(dock);
 for(const {row,entity:e} of entries.values()){
  e.name=row.name;
  if(row.kind==='star'){
   allocations.forEach((k,i)=>{e[k].setDesired(row.allocations[i].desired/10);e[k].setLocked(row.allocations[i].locked);});
   e.defaultDestination=e._orderDestination;delete e._orderDestination;
   if(row.buildType!==null)e.startBuildingShip(row.buildType);
  }else if(row.kind==='rendezvous'){
   e.moveTo(e._orderPosition.x,e._orderPosition.y,e._orderAnchor);if(e.anchor)e.syncToAnchor();delete e._orderPosition;delete e._orderAnchor;
  }else{
   if(row.onPatrol && !e.star)bad();
   Object.assign(e.course,e._orderCourse);e.course.memory=e._orderMemory;e.course.revision++;
   if(e.type!=='defense')e.onPatrol=row.onPatrol;e.toBeScrapped=row.toBeScrapped;e.userCallIn=row.userCallIn;delete e._orderCourse;delete e._orderMemory;
   if(e.calculateFleetStats)e.calculateFleetStats();if(e.calculateMovement)e.calculateMovement();
  }
 }
 Object.assign(player,defaults);game.refreshRendezvousFleetReferences();
 return rows.filter(r=>r.created).map(row=>({kind:row.kind,tempId:row.id,id:entries.get(key(row)).entity.id}));
}
module.exports={snapshot,baseline,apply};
