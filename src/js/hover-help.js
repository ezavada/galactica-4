const Tooltip=require('./tooltip.js');
const I18n=require('./i18n.js');
const helpIds=Object.freeze({
  "showGameReports":1224,"holdGameReports":1225,
  "openChat":1215,"chatRecipients":1216,"chatSend":1217,"chatPage":1218,"chatText":1220,"chatRefresh":1221,
  "startupSettings":888,
  "openNewGameDefaults":966,
  "presentationPage":981,
  "closePresentation":982,
  "presentationTutorial":985,
  "openAbout":983,
  "toggleSplash":984,
  "openNewGameDefaultChoice":967,
  "setNewGameDefault":967,
  "cancelNewGameDefaultChoice":967,
  "cycleNewGameDefault":966,
  "saveNewGameDefaults":966,
  "cancelNewGameDefaults":966,
  "setAllocation": 858,
  "setColonyDefaultAllocation": 890,
  "toggleAllocationLock": 859,
  "equalizeAllocations": 860,
  "buildShip": 861,
  "setColonyDefaultHull": 890,
  "pauseBuild": 862,
  "beginOrders": 863,
  "showCourse": 864,
  "swapCourseMemory": 865,
  "toggleCourseLoop": 866,
  "togglePatrol": 867,
  "toggleCallIn": 868,
  "toggleCourseHunt": 869,
  "toggleScrap": 870,
  "beginRename": 871,
  "placeRenameCaret": 871,
  "beginFleetTransfer": 872,
  "transferFleetShip": 872,
  "fleetExchangeSelect": 872,
  "removeFleetShip": 873,
  "createFleetGroup": 874,
  "beginRendezvousPlacement": 875,
  "deleteRendezvous": 876,
  "centerObject": 877,
  "centerSelected": 877,
  "selectHomeStar": 877,
  "chooseMapObject": 877,
  "selectFleetMember": 877,
  "selectFleetParent": 877,
  "selectObject": 877,
  "fleetRosterSelect": 877,
  "systemComparisonRow": 877,
  "selectWaypoint": 877,
  "selectGame": 910,
  "sortFleetRoster": 878,
  "sortSystemComparison": 878,
  "sortSystemShips": 878,
  "fleetExchangeSort": 878,
  "coursePage": 879,
  "eventDetailPage": 879,
  "eventPage": 879,
  "fleetExchangePage": 879,
  "fleetMemberPage": 879,
  "fleetRosterPage": 879,
  "gameSessionPage": 879,
  "mapSelectionPage": 879,
  "playerComparisonPage": 879,
  "systemComparisonPage": 879,
  "systemShipPage": 879,
  "outcomePage": 879,
  "selectEvent": 880,
  "goToEvent": 880,
  "replayOutcome": 880,
  "endTurn": 881,
  "confirmEndTurn": 881,
  "toggleAllCourses": 882,
  "toggleCourierCourses": 882,
  "openManual": 946,
  "editInitialState": 1181,
  "startTutorial": 964,
  "toggleFullscreen": 908,
  "toggleGrid": 882,
  "toggleMapNames": 882,
  "toggleNebula": 882,
  "toggleScannerRanges": 882,
  "toggleShips": 882,
  "setMapDisplayMode": 882,
  "resetView": 909,
  "setLanguage": 883,
  "fileMenu": 884,
  "save": 915,
  "saveAs": 916,
  "open": 917,
  "revert": 918,
  "newGame": 885,
  "cancelColonyDefaults": 886,
  "cancelRename": 886,
  "closeFleetRoster": 886,
  "closePlayerComparison": 886,
  "closeSystemComparison": 886,
  "cancel": 886,
  "commitRename": 887,
  "saveColonyDefaults": 968,
  "submit": 887,
  "replace": 887,
  "toggleWindow": 888,
  "toggleFleetWindow": 888,
  "showGames": 888,
  "showSystemComparison": 888,
  "showSystemShips": 888,
  "showFleetExchange": 888,
  "beginColonyDefaults": 968,
  "toggleProduction": 888,
  "zoomIn": 889,
  "zoomOut": 889,
  "zoomToFit": 889,
  "mapScroll": 889,
  "toggleControlHelp": 891,
  "toggleEnemyEvents": 939,
  "toggleSound": 955,
  "settingsPage": 879,
  "startupOptions": 892,
  "startupFast": 893,
  "startupFog": 894,
  "clearOrders": 895,
  "addWaypoint": 896,
  "editWaypoint": 897,
  "deleteWaypoint": 898,
  "dismissOutcome": 899,
  "dismissReport": 899,
  "reportPage": 879,
  "replayReport": 880,
  "reportGoTo": 877,
  "nextAttention": 900,
  "reviewAttention": 900,
  "startupCount": 901,
  "startupSkill": 902,
  "startupAdvantage": 903,
  "startupSize": 904,
  "startupDensity": 905,
  "startupTitle": 906,
  "startupName": 871,
  "startGame": 907,
  "clearDefaultDestination": 911,
  "confirmRevert": 913,
  "confirmOverwrite": 914,
  "ack": 899,
  "saveFileName": 919,
  "openFileName": 920,
  "close": 993,
  "saveClose": 994,
  "discardClose": 995,
  "quit": 1001
});

const hullHelpIds=Object.freeze({defense:921,scout:922,colony:923,battleship:924});
const hullTypes=['defense','scout','colony','battleship'];
const delay=750;
function describe(action) {
 if (action && action.type==='beginOrders' && action.object && typeof action.object.isStar==='function' && action.object.isStar()) return I18n.getString(912);
 const generic=action && helpIds[action.type] ? I18n.getString(helpIds[action.type]) : '';
 const hull=action && (action.type==='buildShip'?action.shipType:action.type==='setColonyDefaultHull'?hullTypes[action.hull-1]:null);
 return hullHelpIds[hull] ? I18n.getString(hullHelpIds[hull])+'\n'+generic : generic;
}
function wrap(text,width,measure) {
 const lines=[];let line='';
 for(const char of Array.from(text)) {
  if(char==='\n'){lines.push(line.trim());line='';continue;}
  if(line && measure(line+char)>width) {
   const space=line.lastIndexOf(' ');
   if(space>0){lines.push(line.slice(0,space));line=line.slice(space+1);}
   else {lines.push(line);line='';}
   if(line && measure(line+char)>width){lines.push(line);line='';}
   line+=char;
  } else line+=char;
 }
 if(line.trim())lines.push(line.trim());return lines;
}
class HoverHelp {
 constructor(){this.clear();}
 clear(){this.key=null;this.since=0;this.visible=null;}
 sample(candidate,time,screen,measure) {
  this.visible=null;
  if(screen.width<56 || screen.height<40){this.clear();return null;}
  if(!candidate || !candidate.text){this.clear();return null;}
  const key=candidate.key || candidate.text;
  if(key!==this.key){this.key=key;this.since=time;this.visible=null;}
  if(time-this.since<delay)return null;
  const width=Math.max(40,Math.min(340,screen.width-16)),lines=wrap(candidate.text,width-24,measure);
  const height=20+lines.length*15;
  if(height>screen.height-16)return null;
  return this.visible={rect:Tooltip.place(candidate.rect,width,height,screen),anchor:candidate.rect,lines,text:candidate.text};
 }
}
module.exports={HoverHelp,describe,helpIds,delay,wrap};
