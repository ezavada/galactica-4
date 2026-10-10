const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js'), Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'), Rules=require('../src/js/rules.js'), Display=require('../src/js/display.js');
function fixture() {
    const g=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const home=g.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const enemy=g.factory.createStar(900000,0,'Enemy');enemy.owner=2;
    const ship=g.factory.createShip(0,0,'battleship',home,true);home.shipArrived(ship);ship.speed=100;
    g.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    g.display=new Display(g);g.setSelectedObject(ship);g.showCourse(ship);g.aiManager.processAITurns=()=>{};
    return {g,home,ship};
}
module.exports=function(){test.describe('V3 human call-ins and attention',()=>{
    test.it('enables a movable human ship and preserves course/Patrol/memory when toggled',()=>{
        const {g,ship}=fixture();ship.destination={x:400,y:0};ship.course.swapMemory();ship.setPatrol(true);
        const target=ship.destination;test.assertTrue(g.toggleCallIn(ship));test.assertTrue(ship.userCallIn);
        test.assertTrue(ship.destination===target);test.assertTrue(ship.course.hasMemory);test.assertTrue(ship.isOnPatrol());
        test.assertTrue(g.toggleCallIn(ship));test.assertFalse(ship.userCallIn);
    });
    test.it('routes editor C and shows active call-in state without closing the editor',()=>{
        const {g,ship}=fixture();g.handleKeyPress(99);test.assertTrue(ship.userCallIn);test.assertEqual(g.uiWindow,'course');
        test.assertTrue(g.display.getCourseActionRegions().find(r=>r.action.type==='toggleCallIn').active);
        g.handleKeyPress(67);test.assertFalse(ship.userCallIn);
    });
    test.it('rejects stationary, enemy, unfinished, removed and member objects',()=>{
        const {g,ship}=fixture();ship.speed=0;test.assertFalse(g.toggleCallIn(ship));ship.speed=100;
        ship.owner=2;test.assertFalse(g.toggleCallIn(ship));ship.owner=1;ship.progress=50;test.assertFalse(g.toggleCallIn(ship));ship.progress=100;
        const fleet=g.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);test.assertFalse(g.toggleCallIn(ship));
        fleet.removeShip(ship);g.entityRemoved(ship);test.assertFalse(g.toggleCallIn(ship));
    });
    test.it('requests attention on the next turn and retains manual call-in until canceled',()=>{
        const {g,ship}=fixture();g.toggleCallIn(ship);test.assertEqual(g.attention.pending().length,0);
        g.endTurn();test.assertEqual(g.attention.pending().length,1);test.assertTrue(ship.userCallIn);
        g.attention.next();test.assertEqual(g.attention.pending().length,0);g.endTurn();test.assertEqual(g.attention.pending().length,1);
        g.toggleCallIn(ship);g.endTurn();test.assertEqual(g.attention.pending().length,0);
    });
    test.it('lets moving ships call in manually without interrupting their course',()=>{
        const {g,ship}=fixture();ship.destination={x:400,y:0};g.toggleCallIn(ship);g.endTurn();
        test.assertEqual(ship.x,100);test.assertNotNull(ship.destination);test.assertEqual(g.attention.pending().length,1);
    });
    test.it('queues a finished non-looping course and excludes a continuing loop',()=>{
        const {g,home,ship}=fixture();ship.destination={x:100,y:0};g.endTurn();test.assertEqual(g.attention.pending().length,1);
        ship.x=0;ship.star=home;g.issuePlayerWaypoint(ship,{x:100,y:0});ship.course.loop=true;g.endTurn();
        test.assertNotNull(ship.destination);test.assertEqual(g.attention.pending().length,0);
    });
    test.it('calls idle ships in space every five turns, excluding docked idle ships',()=>{
        const {g,ship}=fixture();ship.star=null;g.attention.beginTurn();g.attention.finishTurn();
        test.assertEqual(g.attention.pending().length,1);test.assertEqual(ship.lastCallInTurn,1);
        g.turn=5;g.attention.beginTurn();g.attention.finishTurn();test.assertEqual(g.attention.pending().length,0);
        g.turn=6;g.attention.finishTurn();test.assertEqual(g.attention.pending().length,1);test.assertEqual(ship.lastCallInTurn,6);
        ship.star=g.stars[0];g.turn=20;g.attention.beginTurn();g.attention.finishTurn();test.assertEqual(g.attention.pending().length,0);
    });
    test.it('suppresses automatic calls while a course is plotted, including immobile courses',()=>{
        const {g,ship}=fixture();ship.star=null;ship.destination={x:400,y:0};ship.speed=0;g.turn=10;
        g.attention.beginTurn();g.attention.finishTurn();test.assertEqual(g.attention.pending().length,0);
    });
    test.it('does not generate computer, fleet-member or satellite call-ins',()=>{
        const {g,home,ship}=fixture();ship.owner=2;ship.userCallIn=true;test.assertFalse(g.attention.request(ship));ship.owner=1;
        const fleet=g.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);test.assertFalse(g.attention.request(ship));
        const satellite=g.factory.createShip(0,0,'defense',home,true);test.assertFalse(g.attention.request(satellite));
    });
    test.it('deduplicates subjects and skips removed objects in attention order',()=>{
        const {g,home,ship}=fixture();const second=g.factory.createShip(0,0,'scout',home,true);
        g.attention.request(ship);test.assertFalse(g.attention.request(ship));g.attention.request(second);g.entityRemoved(ship);
        test.assertTrue(g.attention.next());test.assertTrue(g.selectedObject===second);test.assertEqual(g.attention.pending().length,0);
    });
    test.it('marks a subject attended when manually selected and cancels stale ownership',()=>{
        const {g,ship}=fixture();g.attention.request(ship);g.setSelectedObject(ship);test.assertEqual(g.attention.pending().length,0);
        g.attention.queue=[];g.attention.request(ship);ship.owner=2;test.assertEqual(g.attention.pending().length,0);
    });
    test.it('uses Tab for the next subject and never advances an empty attention list',()=>{
        const {g,ship}=fixture();g.uiWindow=null;g.attention.request(ship);const turn=g.turn;g.handleKeyPress(pdg.key_Tab);
        test.assertTrue(g.selectedObject===ship);test.assertEqual(g.attention.pending().length,0);g.handleKeyPress(pdg.key_Tab);test.assertEqual(g.turn,turn);
        const button=g.display.getMapButtonRegions().find(r=>r.action.type==='nextAttention');
        test.assertTrue(g.handleUIClick(button.rect.x+5,button.rect.y+5));test.assertEqual(g.turn,turn);
    });
    test.it('plays the shipped No more cue on empty Tab and Next item without advancing or changing selection',()=>{
        const {g,ship}=fixture(),files=[],started=[];
        const Sound=require('../src/js/sound.js');
        g.sound=Sound.createSound({getSound:file=>{files.push(file);return {setLooping:()=>{},stop:()=>{},start:()=>started.push(file)};}},{readSound:()=>true,writeSound:()=>{}});
        g.uiWindow=null;g.attention.queue=[];const turn=g.turn;g.handleKeyPress(pdg.key_Tab);
        test.assertEqual(started.join(','),'sounds/1012.wav');test.assertTrue(g.selectedObject===ship);test.assertEqual(g.turn,turn);
        const button=g.display.getMapButtonRegions().find(r=>r.action.type==='nextAttention');
        test.assertTrue(g.handleUIClick(button.rect.x+5,button.rect.y+5));test.assertEqual(started.length,2);test.assertEqual(files.length,1);test.assertEqual(g.turn,turn);test.assertTrue(g.selectedObject===ship);
        g.sound.setEnabled(false);g.handleKeyPress(pdg.key_Tab);test.assertEqual(started.length,2);
    });
    test.it('does not play an exhausted-list sound for a pending call-in or during map orders and quiet autoplay',()=>{
        const {g,ship}=fixture(),started=[];const Sound=require('../src/js/sound.js');
        g.sound=Sound.createSound({getSound:file=>({setLooping:()=>{},stop:()=>{},start:()=>started.push(file)})},{readSound:()=>true,writeSound:()=>{}});
        g.uiWindow=null;g.attention.request(ship);g.handleKeyPress(pdg.key_Tab);test.assertEqual(started.join(','),'sounds/1001.wav');
        for(const field of ['pendingMapOrderObject','pendingRendezvousPlacement','uiSliderDrag','uiMapScrollDrag']){g[field]={};g.handleKeyPress(pdg.key_Tab);test.assertEqual(started.length,1);g[field]=null;}
        g.config.autoplay={enabled:true,showEventWindows:false};g.handleKeyPress(pdg.key_Tab);test.assertEqual(started.length,1);
        g.config.autoplay=null;g.overlay={type:'lab',classIndex:1};g.sound.noMore(g);test.assertEqual(started.length,1);
    });
    test.it('does not navigate attention while awaiting a destination click',()=>{
        const {g,ship}=fixture();g.attention.request(ship);g.pendingMapOrderObject=ship;g.handleKeyPress(pdg.key_Tab);
        test.assertEqual(g.attention.pending().length,1);test.assertTrue(g.pendingMapOrderObject===ship);
        g.pendingMapOrderObject=null;g.uiSliderDrag={};g.handleKeyPress(pdg.key_Tab);test.assertEqual(g.attention.pending().length,1);
    });
    test.it('confirms End Turn with unattended items, and review visits rather than advances',()=>{
        const {g,ship}=fixture();g.uiWindow=null;g.attention.request(ship);const turn=g.turn;g.handleKeyPress(13);
        test.assertEqual(g.uiWindow,'endTurnConfirm');test.assertEqual(g.turn,turn);g.executeUIAction({type:'reviewAttention'});
        test.assertEqual(g.turn,turn);test.assertEqual(g.uiWindow,null);test.assertEqual(g.attention.pending().length,0);
        g.executeUIAction({type:'endTurn'});test.assertEqual(g.turn,turn+1);
    });
    test.it('lets confirmed End Turn discard requests and Esc cancel without changing a turn',()=>{
        const {g,ship}=fixture();g.attention.request(ship);g.requestEndTurn();g.handleKeyPress(pdg.key_Escape);
        test.assertEqual(g.uiWindow,null);test.assertEqual(g.attention.pending().length,1);const turn=g.turn;
        g.requestEndTurn();g.executeUIAction({type:'confirmEndTurn'});test.assertEqual(g.turn,turn+1);test.assertEqual(g.uiWindow,null);
    });
    test.it('preserves event overlays for review and confirms before discarding them',()=>{
        const {g}=fixture();g.overlay={type:'lab',classIndex:1};g.requestEndTurn();test.assertEqual(g.uiWindow,'endTurnConfirm');
        g.executeUIAction({type:'reviewAttention'});test.assertNotNull(g.overlay);test.assertEqual(g.uiWindow,null);
        g.requestEndTurn();g.handleKeyPress(13);test.assertEqual(g.overlay,null);test.assertEqual(g.uiWindow,null);
    });
    test.it('presents the first completed-turn request after report playback and only once',()=>{
        const {g,home,ship}=fixture();g.uiWindow=null;g.attention.request(ship);g.turnAttentionPending=true;g.overlay={type:'lab'};
        test.assertFalse(g.presentTurnAttention());test.assertTrue(g.turnAttentionPending);
        g.dismissEventPresentation();test.assertTrue(g.presentTurnAttention());test.assertTrue(g.selectedObject===ship);
        test.assertFalse(g.turnAttentionPending);test.assertFalse(g.presentTurnAttention());
    });
    test.it('handles one request at a time when independent entries share a subject',()=>{
        const {g,ship}=fixture();g.uiWindow=null;g.attention.request(ship,false);
        const event=g.recordEvent('Attention','Separate report',{type:'callIn',subject:ship,recipient:1});g.attention.requestEvent(event);
        g.turnAttentionPending=true;test.assertTrue(g.presentTurnAttention());test.assertTrue(g.selectedObject===ship);
        test.assertEqual(g.attention.pending().length,1);test.assertTrue(g.attention.pending()[0].event===event);test.assertFalse(event.handled);
        test.assertTrue(g.attention.next());test.assertTrue(event.handled);test.assertEqual(g.attention.pending().length,0);
    });
    test.it('does not consume deferred attention while a foreground dialog or map interaction is active',()=>{
        const {g,ship}=fixture();g.attention.request(ship);g.turnAttentionPending=true;
        for(const name of ['settings','rename','endTurnConfirm']){g.uiWindow=name;test.assertFalse(g.presentTurnAttention());test.assertTrue(g.turnAttentionPending);}
        g.uiWindow=null;g.pendingMapOrderObject=ship;test.assertFalse(g.presentTurnAttention());g.pendingMapOrderObject=null;
        test.assertTrue(g.presentTurnAttention());
    });
    test.it('manual attention navigation prevents a second automatic jump and quiet playback suppresses it',()=>{
        const {g,home,ship}=fixture(),other=g.factory.createShip(0,0,'scout',home,true);g.uiWindow=null;g.attention.request(ship);g.attention.request(other);g.turnAttentionPending=true;
        g.attention.next();test.assertFalse(g.turnAttentionPending);test.assertFalse(g.presentTurnAttention());test.assertTrue(g.selectedObject===ship);
        g.config.autoplay.enabled=true;g.config.autoplay.showEventWindows=false;g.turnAttentionPending=true;test.assertFalse(g.presentTurnAttention());test.assertEqual(g.attention.pending().length,1);
    });
    test.it('retains deferred turn attention across a save made during report playback',()=>{
        const Save=require('../src/js/game-save.js'),{g,ship}=fixture();g.attention.request(ship);g.overlay={type:'lab',classIndex:1};g.turnAttentionPending=true;
        const loaded=Save.restore(Save.serialize(g));loaded.display={centerOn:()=>{},setSelectedObject:()=>{}};
        test.assertTrue(loaded.turnAttentionPending);test.assertFalse(loaded.presentTurnAttention());loaded.handleKeyPress(13);test.assertTrue(loaded.presentTurnAttention());
        test.assertEqual(loaded.selectedObject.id,ship.id);test.assertFalse(loaded.turnAttentionPending);
    });
    test.it('queues newly built mobile ships without a duplicate call-in log',()=>{
        const {g,home}=fixture();home.startBuildingShip('scout');g.rules.getShipBuildCost=()=>1;home.currentShip.cost=1;
        g.rules.getStarShipBuildingAmount=()=>1;g.endTurn();
        test.assertEqual(g.attention.pending().length,2); // first-class report plus the built ship
        g.dismissEventPresentation();test.assertEqual(g.attention.pending().length,1);
        test.assertFalse(g.eventLog.some(e=>e.type==='callIn'));
    });
    test.it('exposes the next-attention menu action and fits the final map row inside the screen',()=>{
        const {g,ship}=fixture();g.attention.request(ship);g.uiWindow='menu';
        const action=g.display.getCommandActionRegions().find(r=>r.action.type==='nextAttention');
        test.assertTrue(action.active);g.executeUIAction(action.action);test.assertTrue(g.selectedObject===ship);
        const fit=g.display.getMapButtonRegions().find(r=>r.action.type==='zoomToFit');
        test.assertEqual(fit.rect.width,44);test.assertTrue(fit.rect.x+fit.rect.width<=800);
    });
    test.it('supports fleet manual requests without modifying member flags',()=>{
        const {g,ship}=fixture();const fleet=g.factory.createFleet(0,0,1,'Guard');fleet.addShip(ship);
        test.assertTrue(g.toggleCallIn(fleet));test.assertFalse(ship.userCallIn);g.endTurn();
        test.assertEqual(g.attention.pending().length,1);test.assertTrue(g.attention.pending()[0].object===fleet);
    });
    test.it('keeps confirmation modal and restores an event presentation when canceled',()=>{
        const {g}=fixture();g.overlay={type:'lab',classIndex:1};g.requestEndTurn();
        const turn=g.turn;test.assertTrue(g.handleUIClick(2,2));test.assertEqual(g.uiWindow,'endTurnConfirm');
        g.handleKeyPress(pdg.key_Escape);test.assertEqual(g.turn,turn);test.assertNotNull(g.overlay);test.assertEqual(g.uiWindow,null);
    });
    test.it('does not end a turn while awaiting a map destination or dragging a slider',()=>{
        const {g,ship}=fixture();g.uiWindow=null;const turn=g.turn;g.pendingMapOrderObject=ship;g.handleKeyPress(13);
        test.assertEqual(g.turn,turn);g.pendingMapOrderObject=null;g.uiSliderDrag={};test.assertFalse(g.requestEndTurn());test.assertEqual(g.turn,turn);
    });
    test.it('honors the End Turn hotkey from event lists and course panels',()=>{
        const {g}=fixture();g.uiWindow='events';g.handleKeyPress(13);test.assertEqual(g.turn,2);test.assertEqual(g.uiWindow,null);
        g.uiWindow='course';g.handleKeyPress(13);test.assertEqual(g.turn,3);
    });
    test.it('confirms queued presentations even if none is currently visible, and Review shows one',()=>{
        const {g}=fixture();g.overlay=null;g.overlayQueue=[{type:'lab',classIndex:1}];g.uiWindow=null;const turn=g.turn;
        g.handleKeyPress(13);test.assertEqual(g.uiWindow,'endTurnConfirm');test.assertEqual(g.turn,turn);
        g.executeUIAction({type:'reviewAttention'});test.assertNotNull(g.overlay);test.assertEqual(g.turn,turn);test.assertEqual(g.uiWindow,null);
    });
    test.it('uses translated controls, prompts and call-in events in every language',()=>{
        const {g,ship}=fixture();const previous=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(lang);g.uiWindow='course';
            test.assertEqual(g.display.getCourseActionRegions().find(r=>r.action.type==='toggleCallIn').label,pdg.res.getString(742));
            g.attention.queue=[];g.attention.request(ship);test.assertEqual(g.eventLog[g.eventLog.length-1].title,pdg.res.getString(744));
            g.requestEndTurn();test.assertEqual(g.display.getEndTurnConfirmActions()[0].label,pdg.res.getString(748));
        }}finally{pdg.res.setLanguage(previous);}
    });
});};
