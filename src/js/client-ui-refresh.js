// Keep local interaction state through a same-turn server projection replacement.
const families={star:'stars',ship:'allShips',fleet:'allFleets',rendezvous:'allRendezvous'};
const fields=['uiWindow','clientEventSequence','settingsPage','eventSelection','eventPage','eventDetailPage','courseWindowObject','courseSelection','coursePage','courseBodyScroll','compactCoursePage','compactCourseObject',
 'fleetMemberPage','fleetRosterPage','fleetRosterBodyScroll','compactFleetRosterPage','fleetRosterSort','fleetRosterLastClick','fleetRosterGeometry','fleetExchange',
 'systemShipWindowStar','systemShipPage','systemShipSort','systemShipBodyScroll','compactSystemShipPage','compactSystemShipStar','playerComparisonPage','systemComparisonPage','systemComparisonSort','systemComparisonSelection','systemComparisonLastClick','systemComparisonGeometry',
 'commandMenuScroll','playerComparisonColumnPage','playerComparisonBodyScroll','compactComparisonBodyPage','windowPositions','uiWindowDrag','uiMapScrollDrag','uiSliderDrag',
 'pendingMapOrderObject','pendingCourseEdit','pendingRendezvousPlacement','mapSelectionPicker','renameTarget','renameText','renameEditor',
 'colonyDefaultsDraft','colonyDefaultsReturn','newGameDefaultsDraft','newGameDefaultsChoice','newGameDefaultsChoiceIndex'];
function preserve(old,fresh){
 if(!old.clientGameId || old.clientGameId!==fresh.clientGameId || old.clientPlayerNum!==fresh.clientPlayerNum || old.turn!==fresh.turn)return;
 const keys=new Map(),entities=new Map(),memo=new WeakMap();
 for(const [kind,list] of Object.entries(families)){for(const e of old[list])keys.set(e,kind+':'+e.id);for(const e of fresh[list]){keys.set(e,kind+':'+e.id);entities.set(kind+':'+e.id,e);}}
 const clone=value=>{
  if(!value || typeof value!=='object')return value;
  if(keys.has(value))return entities.get(keys.get(value)) || null;
  if(memo.has(value))return memo.get(value);
  if(Array.isArray(value)){const copy=[];memo.set(value,copy);for(const item of value){const next=clone(item);if(!keys.has(item) || next)copy.push(next);}return copy;}
  const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype && proto!==null)return value;
  const copy={};memo.set(value,copy);for(const [field,item] of Object.entries(value))copy[field]=clone(item);return copy;
 };
 for(const field of fields)if(old[field]!==undefined)fresh[field]=clone(old[field]);
 const editing=fresh.clientPlayerNum>0 && !fresh.clientPosting && (!fresh.isGameOver || fresh.canContinue) && fresh.players[fresh.clientPlayerNum]?.isAlive!==false;
 const owned=e=>editing && e && e.owner===fresh.clientPlayerNum && entities.get(keys.get(e))===e;
 const editable=e=>owned(e) && e.course && (e.type==='fleet'?e.ships.length>0:!e.fleet && e.type!=='defense' && !e.isDead() && !e.underConstruction());
 const courseKey=course=>course && JSON.stringify({current:course.current,previous:course.previous,loop:course.loop,hunt:course.hunt,hasOrigin:course.hasOrigin,
  waypoints:course.waypoints.map(p=>keys.has(p.target)?keys.get(p.target):[p.x,p.y])});
 if(fresh.renameTarget && !owned(fresh.renameTarget)){fresh.renameTarget=null;fresh.renameText='';fresh.renameEditor=null;if(fresh.uiWindow==='rename')fresh.uiWindow=null;}
 if(old.renameTarget && !fresh.renameTarget && fresh.uiWindow==='rename')fresh.uiWindow=null;
 if(fresh.pendingMapOrderObject && !(owned(fresh.pendingMapOrderObject) && (keys.get(fresh.pendingMapOrderObject)?.startsWith('star:') || editable(fresh.pendingMapOrderObject))))fresh.pendingMapOrderObject=null;
 if(old.pendingCourseEdit){
  const before=old.pendingCourseEdit.object,after=fresh.pendingCourseEdit?.object;
  if(!editable(after) || before.course.revision!==old.pendingCourseEdit.revision || courseKey(before.course)!==courseKey(after.course)){
   fresh.pendingCourseEdit=null;fresh.pendingMapOrderObject=null;
  }else fresh.pendingCourseEdit.revision=after.course.revision;
 }
 const placement=fresh.pendingRendezvousPlacement;
 if(placement && (!editing || placement.owner!==fresh.clientPlayerNum || placement.mode==='move' && !owned(placement.rendezvous)))fresh.pendingRendezvousPlacement=null;
 if(fresh.uiSliderDrag && (!editing || fresh.uiSliderDrag.star && !owned(fresh.uiSliderDrag.star)))fresh.uiSliderDrag=null;
 if(!editing && fresh.uiWindow==='colonyDefaults'){fresh.uiWindow=null;fresh.colonyDefaultsDraft=null;}
 if(fresh.uiWindow==='course' && (!fresh.courseWindowObject || !fresh.config.omniscient && fresh.courseWindowObject.owner!==fresh.clientPlayerNum))fresh.uiWindow=null;
 if(fresh.uiWindow==='systemShips' && !fresh.systemShipWindowStar)fresh.uiWindow=null;
 if(fresh.uiWindow==='fleetExchange' && !fresh.fleetExchange?.container){fresh.uiWindow=null;fresh.fleetExchange=null;}
 if(fresh.mapSelectionPicker && (fresh.mapSelectionPicker.mode==='order' && !fresh.pendingMapOrderObject || fresh.mapSelectionPicker.mode==='transfer' && (!owned(fresh.mapSelectionPicker.sourceFleet) || !owned(fresh.mapSelectionPicker.transferShip)))){
  fresh.mapSelectionPicker=null;if(fresh.uiWindow==='mapPick')fresh.uiWindow=null;
 }
 // Local command log entries are not part of a host's event projection.
 const reports=new Map(fresh.eventLog.map(event=>[event.id,event])),ordered=[];
 for(const event of old.eventLog){if(event.id<0)ordered.push({...event,subject:clone(event.subject)});else if(reports.has(event.id)){ordered.push(reports.get(event.id));reports.delete(event.id);}}
 fresh.eventLog=ordered.concat([...reports.values()]);
}
// Retain live presentation identity: Sound's WeakMap uses it to prevent a
// second cue. Rebinding references does not reopen/focus or restart the report.
function preserveManualReports(old,fresh){
 if(!old.overlay?.manual && !(old.overlayQueue || []).some(row=>row.manual))return;
 if(!old.clientGameId || old.clientGameId!==fresh.clientGameId || old.clientPlayerNum!==fresh.clientPlayerNum || old.turn!==fresh.turn || !fresh.shouldShowEventWindows())return;
 // An explicitly shown held report may be older than the Events list window.
 const rows=new Map(fresh.eventLog.filter(event=>fresh.isEventAccessible(event)).map(event=>[event.id,event]));
 const valid=overlay=>{
  if(!overlay?.manual)return false;
  const event=rows.get(overlay.eventId);if(!event)return false;
  return overlay.type==='report'?fresh.hasReplayableReport(event):overlay.type==='outcome'?!!event.outcome:
   overlay.type==='lab'?!!event.discovery && !event.observer:overlay.type==='stardock'?!!event.commissioning && !event.observer:false;
 };
 const active=valid(old.overlay)?old.overlay:null,queued=(old.overlayQueue || []).filter(valid);
 if(!active && !queued.length)return;
 const retained=[active,...queued].filter(Boolean),same=(a,b)=>a.eventId===b.eventId && a.type===b.type;
 for(const overlay of retained)for(const field of ['ship','origin'])if(overlay[field]){
  const list=Object.values(families).find(list=>old[list].includes(overlay[field]));
  overlay[field]=list?fresh[list].find(entity=>entity.id===overlay[field].id) || null:null;
 }
 const incoming=[fresh.overlay,...fresh.overlayQueue].filter(overlay=>overlay && !retained.some(row=>same(row,overlay)));
 if(active){fresh.overlay=active;fresh.overlayQueue=queued.concat(incoming);}
 else {fresh.overlay=incoming.shift() || null;fresh.overlayQueue=queued.concat(incoming);if(!fresh.overlay)fresh.showEventOverlay(fresh.overlayQueue.shift());}
}
module.exports={preserve,preserveManualReports};
