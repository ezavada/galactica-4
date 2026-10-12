// A turn refresh keeps decisions, while movement and valid containment come
// from the host. This is CShip::UpdateClientFromStream's course/progress split.
const kinds=['','star','ship','fleet','rendezvous'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const point=p=>p.target?[p.target.kind,p.target.id]:[p.x,p.y];
function course(draft,base,host,owner){
 const result={...draft,waypoints:draft.waypoints.map(p=>({...p}))};
 if(base && draft.current===base.current && draft.previous===base.previous){
  let prefix=0;while(prefix<base.waypoints.length && prefix<draft.waypoints.length && same(point(base.waypoints[prefix]),point(draft.waypoints[prefix])))prefix++;
  const hostPlan=host.waypoints.map(p=>({x:p.x,y:p.y,target:kinds[owner.game.getObjectType(p.target)]?{kind:kinds[owner.game.getObjectType(p.target)],id:p.target.id}:null}));
  if(prefix>base.current && same(base.waypoints.map(point),hostPlan.map(point)) && host.current<=prefix){
   if(base.loop && !draft.loop && host.current<base.current && host.previous>=base.current){result.current=prefix;result.previous=prefix-1;}
   else{result.current=host.current;result.previous=host.previous;}
  }
  else if(prefix===base.waypoints.length && prefix>base.current && !host.waypoints.length && !base.loop){
   const last=base.waypoints[base.waypoints.length-1],list={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'};
   const target=last.target?owner.game[list[last.target.kind]]?.find(e=>e.id===last.target.id) || last:last;
   if(Math.abs(owner.x-target.x)<5 && Math.abs(owner.y-target.y)<5){result.current=prefix;result.previous=prefix-1;}
  }
 }
 // An already passed synthetic origin follows the new position; a looping
 // courier's origin remains an intentional return waypoint.
 if(result.hasOrigin && !result.loop && result.current>0 && result.waypoints.length && !result.waypoints[0].target)result.waypoints[0]={x:owner.x,y:owner.y,target:null};
 return result;
}
function containment(game,authority){
 const viewer=game.clientPlayerNum,owned=[...game.allShips,...game.allFleets].filter(e=>e.owner===viewer);
 const key=e=>(e.type==='fleet'?'fleet':'ship')+':'+e.id;
 const close=(a,b)=>a && Math.abs(a.x-b.x)<5 && Math.abs(a.y-b.y)<5;
 const original=e=>authority.get(key(e));
 const restore=e=>{const before=original(e);e.fleet=before?.fleet || null;e.star=before?.star || null;};
 const created=game.allFleets.filter(e=>e.owner===viewer && !original(e));
 // New groups survive only when their surviving members remain colocated.
 const visiting=new Set(),placed=new Set();
 const place=fleet=>{if(placed.has(fleet))return true;if(visiting.has(fleet))return false;visiting.add(fleet);
  const members=owned.filter(e=>e.fleet===fleet);for(const member of members)if(created.includes(member) && !place(member))return false;
  const valid=members.length && members.every(e=>close(e,members[0]));
  if(valid){fleet.x=members[0].x;fleet.y=members[0].y;if(fleet.star && !close(fleet,fleet.star))fleet.star=null;}
  visiting.delete(fleet);placed.add(fleet);return !!valid;
 };
 for(const fleet of created)if(!place(fleet)){for(const member of owned.filter(e=>e.fleet===fleet))restore(member);game.allFleets=game.allFleets.filter(e=>e!==fleet);}
 for(const e of owned){
  if(e.type==='fleet' && !game.allFleets.includes(e))continue;
  const before=original(e),parent=e.fleet || e.star;
  const changed=before && (before.fleet!==e.fleet || before.star!==e.star);
  if(parent && (!close(e,parent) || parent.type==='fleet' && (parent.owner!==viewer || !game.allFleets.includes(parent))) || changed && (e.type==='defense' || e.underConstruction?.() || e.onPatrol))restore(e);
  const seen=new Set([e]);let ancestor=e.fleet;while(ancestor){if(seen.has(ancestor)){restore(e);break;}seen.add(ancestor);ancestor=ancestor.fleet;}
  if(e.onPatrol && (!e.star || e.course.waypoints.length || e.toBeScrapped))e.onPatrol=false;
 }
 // Restore host groups needed by a member whose local transfer became invalid.
 const live=()=>owned.filter(e=>e.type!=='fleet' || game.allFleets.includes(e));
 let pruned;do{pruned=false;for(const fleet of created)if(game.allFleets.includes(fleet) && !live().some(e=>e.fleet===fleet)){game.allFleets=game.allFleets.filter(e=>e!==fleet);pruned=true;}}while(pruned);
 for(const e of live()){let parent=e.fleet;const seen=new Set();while(parent && !seen.has(parent)){seen.add(parent);if(!game.allFleets.includes(parent))game.allFleets.push(parent);parent=parent.fleet;}}
 for(const e of live())if(e.fleet){let root=e.fleet;const seen=new Set([e]);while(root.fleet && !seen.has(root)){seen.add(root);root=root.fleet;}e.star=root.star;}
 for(const point of game.allRendezvous)if(point.owner===viewer && point.anchor){if(point.anchor.type==='fleet' && !game.allFleets.includes(point.anchor))point.anchor=null;else{point.x=point.anchor.x;point.y=point.anchor.y;}}
}
module.exports={course,containment};
