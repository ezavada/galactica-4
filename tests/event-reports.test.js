const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js');
const GameConfig=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true,omniscient:false}));
    const home=game.factory.createStar(0,0,'Home');home.owner=1;home.techLevel=5;
    const enemy=game.factory.createStar(900000,0,'Enemy');enemy.owner=2;
    const ship=game.factory.createShip(0,0,'battleship',home,true);home.shipArrived(ship);
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.uiWindow='events';game.eventLog=[];
    return {game,home,enemy,ship,display};
}
function report(game,subject,options={}) {return game.recordEvent('Report','A full report',{subject,recipient:1,...options});}
module.exports=function(){test.describe('V3 last-turn event reports and subjects',()=>{
    test.it('preserves E to close reports and the existing menu shortcut',()=>{
        const {game}=fixture();game.handleKeyPress('e'.charCodeAt(0));test.assertNull(game.uiWindow);
        game.uiWindow='events';game.handleKeyPress('m'.charCodeAt(0));test.assertEqual(game.uiWindow,'menu');
    });
    test.it('assigns stable IDs and snapshots a subject position independently of later movement',()=>{
        const {game,ship}=fixture();const first=report(game,ship),second=report(game,ship);ship.x=500;
        test.assertTrue(second.id>first.id);test.assertEqual(first.position.x,0);test.assertTrue(first.subject===ship);
    });
    test.it('shows the last completed turn rather than older history or next-turn UI entries',()=>{
        const {game,ship}=fixture();report(game,ship,{turn:1});const wanted=report(game,ship,{turn:2});report(game,ship,{turn:3});game.turn=3;
        test.assertEqual(game.getEventRows().length,1);test.assertTrue(game.getEventRows()[0]===wanted);
    });
    test.it('filters private reports by recipient even in omniscient mode',()=>{
        const {game,ship}=fixture();const own=report(game,ship);report(game,ship,{recipient:2});game.config.omniscient=true;
        test.assertEqual(game.getEventRows().length,1);test.assertTrue(game.getEventRows()[0]===own);
    });
    test.it('conceals public reports about unseen foreign subjects',()=>{
        const {game,enemy}=fixture();enemy.setVisibilityTo(1,Common.VisibilityLevel.NONE);
        const event=game.recordEvent('Foreign','Private coordinates',{subject:enemy});
        test.assertEqual(game.getEventRows().length,0);test.assertFalse(game.selectEvent(event));test.assertEqual(game.getEventFocus(event),null);
    });
    test.it('selects and centers a live subject at its current position while retaining the report window',()=>{
        const {game,ship,display}=fixture(),event=report(game,ship);ship.x=500;let centered=null;display.centerOn=(x,y)=>centered={x,y};
        test.assertTrue(game.selectEvent(event));test.assertTrue(game.selectedObject===ship);test.assertEqual(centered.x,500);
        test.assertEqual(game.uiWindow,'events');test.assertTrue(event.handled);test.assertEqual(game.eventSelection,event.id);
    });
    test.it('uses the remembered position of a removed subject without reselecting it',()=>{
        const {game,ship,display}=fixture(),event=report(game,ship);game.entityRemoved(ship);ship.x=999;let centered=null;display.centerOn=(x,y)=>centered={x,y};
        game.selectEvent(event);test.assertNull(game.selectedObject);test.assertEqual(centered.x,0);test.assertTrue(event.handled);
    });
    test.it('does not follow a recaptured invisible subject to its new position',()=>{
        const {game,ship}=fixture(),event=report(game,ship);ship.owner=2;ship.x=999;ship.setVisibilityTo(1,0);
        const focus=game.getEventFocus(event);test.assertNull(focus.object);test.assertEqual(focus.x,0);
    });
    test.it('handles a linked call-in request when its report is selected',()=>{
        const {game,ship}=fixture();game.attention.request(ship);const event=game.eventLog[0];
        test.assertEqual(game.attention.pending().length,1);game.selectEvent(event);
        test.assertEqual(game.attention.pending().length,0);test.assertTrue(event.handled);
    });
    test.it('dims a call-in report after attending its subject through the map',()=>{
        const {game,ship}=fixture();game.attention.request(ship);const event=game.eventLog[0];game.setSelectedObject(ship);
        test.assertTrue(event.handled);test.assertEqual(game.attention.pending().length,0);
    });
    test.it('reports the first satellite class without queuing stationary satellites for orders',()=>{
        const {game,home}=fixture();home.startBuildingShip('defense');home.paidTowardShipBuilding=home.currentShip.cost;home.commissionPaidHulls();
        const satellite=home.defenseSatellites[0];test.assertTrue(satellite.isOnPatrol());test.assertEqual(satellite.speed,0);
        test.assertTrue(game.eventLog.some(e=>e.commissioning && e.commissioning.shipType==='defense'));
        test.assertFalse(game.eventLog.some(e=>e.type===Common.EventType.SHIP_BUILT));
        test.assertEqual(game.attention.pending().length,1);test.assertTrue(game.attention.pending()[0].object===home);
        game.handleKeyPress(13);test.assertEqual(game.attention.pending().length,0);test.assertFalse(game.attention.next());
        test.assertFalse(game.canToggleCallIn(satellite));test.assertFalse(game.canTogglePatrol(satellite));
    });
    test.it('focuses a newly colonized star while the colony ship remains available',()=>{
        const {game,home}=fixture();const colony=game.factory.createShip(0,0,'colony',home,true),star=game.factory.createStar(100,0,'New colony');star.owner=0;
        test.assertTrue(game.colonizeStar(star,colony));test.assertTrue(game.allShips.includes(colony));test.assertEqual(game.attention.pending().length,2);test.assertEqual(game.overlay.type,'report');game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.attention.pending().length,1);test.assertEqual(game.attention.pending()[0].event.type,Common.EventType.RENAME_COLONY);
        test.assertTrue(game.attention.next());test.assertTrue(game.selectedObject===star);test.assertEqual(game.attention.pending().length,0);
    });
    test.it('lets a system report select its star without inventing another automatic request',()=>{
        const {game,home}=fixture();game.noteworthyEvent(home,Common.EventType.TECH_LEVEL_UP,home.techLevel);
        const event=game.eventLog[0];test.assertEqual(game.attention.pending().length,0);game.selectEvent(event);test.assertTrue(game.selectedObject===home);
    });
    test.it('retains every last-turn report even when a turn produces more than eighty entries',()=>{
        const {game,ship}=fixture();for(let i=0;i<120;i++)report(game,ship);game.turn=2;
        test.assertEqual(game.getEventRows().length,120);
    });
    test.it('trims older history without removing current and last-turn reports',()=>{
        const {game,ship}=fixture();for(let i=0;i<120;i++)report(game,ship);game.turn=3;const current=report(game,ship);
        test.assertEqual(game.eventLog.length,80);test.assertTrue(game.eventLog.includes(current));
    });
    test.it('routes row clicks ahead of controls behind the window',()=>{
        const {game,ship,display}=fixture(),event=report(game,ship);
        const row=display.getEventActionRegions().find(r=>r.action.type==='selectEvent');
        test.assertTrue(game.handleUIClick(row.rect.x+5,row.rect.y+5));test.assertEqual(game.eventSelection,event.id);test.assertTrue(game.selectedObject===ship);
    });
    test.it('paginates every report without dropping rows or reusing another page’s subjects',()=>{
        const {game,ship,display}=fixture();for(let i=0;i<18;i++)report(game,ship);
        const first=display.getEventWindowLayout();test.assertEqual(first.pages,3);
        game.executeUIAction({type:'eventPage',page:2});const last=display.getEventWindowLayout();test.assertEqual(last.visibleRows.length,6);
        test.assertTrue(last.visibleRows[0].id>first.visibleRows[5].id);
    });
    test.it('renders complete Unicode narratives over detail pages without splitting code points',()=>{
        const {game,ship,display}=fixture();const message=Array.from({length:40},(_,i)=>`東京 🚀 ${i}`).join('\n')+'\nEND';const event=report(game,ship);
        event.message=message;game.selectEvent(event);const layout=display.getEventWindowLayout();test.assertTrue(layout.detailPages>1);
        const visible=[];for(let page=0;page<layout.detailPages;page++){game.executeUIAction({type:'eventDetailPage',page});visible.push(...display.getEventWindowLayout().visibleLines);}
        test.assertEqual(visible.join('\n'),message);test.assertEqual(visible[visible.length-1],'END');
    });
    test.it('wraps long text to measured widths without losing its words or emoji',()=>{
        const {display}=fixture(),text='Alpha beta 東京🚀 gamma delta';const lines=display.wrapEventMessage(text,60,11);
        test.assertEqual(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
        test.assertTrue(lines.every(line=>display.port.getTextWidth(line,11)<=60));
    });
    test.it('keeps report and detail controls inside smaller resized windows',()=>{
        const {game,ship,display}=fixture();const event=report(game,ship);event.message='Report '.repeat(200);game.selectEvent(event);
        for(const [width,height] of [[640,480],[480,360]]) {
            game.port.getDrawingArea=()=>new pdg.Rect(width,height);const layout=display.getEventWindowLayout();
            test.assertTrue(layout.pageSize<6);test.assertTrue(layout.detailStart+44+(layout.visibleLines.length-1)*15<layout.rect.height-70);
            test.assertTrue(display.getEventActionRegions().every(r=>r.rect.x>=0&&r.rect.y>=0&&r.rect.x+r.rect.width<=width&&r.rect.y+r.rect.height<=height));
        }
    });
    test.it('shows no Go to control for a report without a subject or location',()=>{
        const {game,display}=fixture();const event=game.recordEvent('Notice','No physical subject');game.selectEvent(event);
        test.assertFalse(display.getEventActionRegions().some(r=>r.action.type==='goToEvent'));test.assertTrue(event.handled);
    });
    test.it('rejects stale report controls after the displayed turn changes',()=>{
        const {game,ship}=fixture(),event=report(game,ship);game.turn=3;
        test.assertFalse(game.selectEvent(event));game.executeUIAction({type:'goToEvent',event});test.assertNull(game.selectedObject);
    });
    test.it('uses Enter for a selected event’s Go to action without ending the turn',()=>{
        const {game,ship}=fixture(),event=report(game,ship);game.selectEvent(event);const turn=game.turn;game.handleKeyPress(13);
        test.assertEqual(game.turn,turn);test.assertTrue(game.selectedObject===ship);test.assertEqual(game.uiWindow,null);
    });
    test.it('validates page inputs and provides an empty-state layout',()=>{
        const {game,display}=fixture();test.assertFalse(game.executeUIAction({type:'eventPage',page:-1}));
        test.assertFalse(game.executeUIAction({type:'eventDetailPage',page:NaN}));const layout=display.getEventWindowLayout();
        test.assertEqual(layout.pages,1);test.assertEqual(layout.rows.length,0);test.assertEqual(layout.visibleLines.length,0);
    });
    test.it('localizes report navigation controls in every supported language',()=>{
        const {game,ship,display}=fixture(),event=report(game,ship);game.selectEvent(event);const previous=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
            test.assertEqual(display.getEventActionRegions().find(r=>r.action.type==='goToEvent').label,pdg.res.getString(749));
        }}finally{pdg.res.setLanguage(previous);}
    });
});};
