const test=require('./test-framework.js'),Common=require('../src/js/common.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture(count=14) {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;
    const star=game.factory.createStar(200000,200000,'Home');star.owner=1;star.techLevel=8;
    const fleet=game.factory.createFleet(star.x,star.y,1,'Guard');
    for(let i=0;i<count;i++){const ship=game.factory.createShip(star.x,star.y,'battleship',star,true);ship.name='Member '+i;fleet.addShip(ship);}
    game.setSelectedObject(fleet);display.camera.centerOn(star.x,star.y);display.updateMapRenderingCalculations();
    return {game,display,fleet,star};
}
function click(game,region) {return game.handleUIClick(region.rect.x+region.rect.width/2,region.rect.y+region.rect.height/2);}
module.exports=()=>test.describe('Complete fleet member inspector',()=>{
    test.it('reaches every member with real paged UI hit testing',()=>{
        const {game,display,fleet}=fixture(),seen=[];
        for(let i=0;i<3;i++){
            const layout=display.getFleetDetailsLayout(fleet);seen.push(...layout.visibleShips);
            const next=display.getFleetMemberPageRegions(fleet).find(r=>r.action.page>layout.page);
            if(next)test.assertTrue(click(game,next));else test.assertEqual(i,2);
        }
        test.assertEqual(seen.length,14);test.assertEqual(new Set(seen).size,14);
        const previous=display.getFleetMemberPageRegions(fleet).find(r=>r.action.page===1);test.assertTrue(click(game,previous));
        test.assertEqual(display.getFleetDetailsLayout(fleet).page,1);
    });
    test.it('selects a later-page member and resets paging for a different selection',()=>{
        const {game,display,fleet}=fixture();game.executeUIAction({type:'fleetMemberPage',fleet,page:2});
        const row=display.getFleetMemberActionRegions(fleet).find(r=>r.action.type==='selectFleetMember');
        test.assertTrue(click(game,row));test.assertTrue(game.selectedObject===fleet.ships[12]);test.assertEqual(game.fleetMemberPage,0);
        game.setSelectedObject(fleet);test.assertEqual(display.getFleetDetailsLayout(fleet).page,0);
    });
    test.it('removes and transfers actual later-page members without selecting the row beneath the button',()=>{
        const {game,display,fleet,star}=fixture(),target=game.factory.createFleet(star.x,star.y,1,'Other');
        target.addShip(game.factory.createShip(star.x,star.y,'scout',star,true));
        game.executeUIAction({type:'fleetMemberPage',fleet,page:1});
        const regions=display.getFleetMemberActionRegions(fleet),transfer=regions.find(r=>r.action.type==='transferFleetShip');
        test.assertTrue(click(game,transfer));test.assertTrue(transfer.action.ship.fleet===target);test.assertTrue(game.selectedObject===fleet);
        const remove=display.getFleetMemberActionRegions(fleet).find(r=>r.action.type==='removeFleetShip');
        test.assertTrue(click(game,remove));test.assertEqual(remove.action.ship.fleet,null);test.assertTrue(game.selectedObject===fleet);
    });
    test.it('clamps the visible page when members disappear and rejects stale or invalid page and member actions',()=>{
        const {game,display,fleet,star}=fixture();game.executeUIAction({type:'fleetMemberPage',fleet,page:2});
        const stale=display.getFleetMemberActionRegions(fleet).find(r=>r.action.type==='selectFleetMember').action;
        fleet.removeShip(fleet.ships[13]);fleet.removeShip(fleet.ships[12]);
        test.assertEqual(display.getFleetDetailsLayout(fleet).page,1);test.assertFalse(game.executeUIAction(stale));
        for(const page of [-1,2,Infinity,NaN,1.5])test.assertFalse(game.executeUIAction({type:'fleetMemberPage',fleet,page}));
        game.setSelectedObject(star);test.assertFalse(game.executeUIAction({type:'fleetMemberPage',fleet,page:0}));
    });
    test.it('draws live health ratios and v3 member tech speed power with measured long names',()=>{
        const {display,fleet}=fixture(2),text=[],bars=[];
        const ship=fleet.ships[0];ship.damage=ship.power*35;ship.name='京都 α 🚀 '.repeat(20);
        display.drawAnchoredPanel=()=>{};display.drawLabelValue=()=>{};display.drawTextLine=t=>text.push(t);
        display.drawDivider=()=>{};display.drawUIButton=()=>{};display.drawContextButtonArc=()=>{};
        display.drawBar=(x,y,w,h,v)=>bars.push(v);display.drawFleetDetails(fleet);
        test.assertTrue(text.includes('Health: 65%'));test.assertTrue(text.includes('8 / 1.4 / 8'));
        test.assertTrue(bars.includes(.65));test.assertTrue(text.some(t=>t.includes('京都')&&t.endsWith('…')));
        ship.damage=0;text.length=0;bars.length=0;display.drawFleetDetails(fleet);
        test.assertTrue(bars.every(v=>v===1));
    });
    test.it('shares fleet-context member health with exchange tables without changing independent scanner knowledge',()=>{
        const {game,display,fleet,star}=fixture(1),ship=fleet.ships[0];star.owner=2;star.setVisibilityTo(1,0);fleet.owner=2;ship.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);ship.setVisibilityTo(1,Common.VisibilityLevel.NONE);ship.damage=ship.power*35;
        let standalone=display.getShipDiagnostics(ship);test.assertEqual(standalone.health,'?');test.assertEqual(standalone.tech,'?');
        const member=display.getFleetMemberDiagnostics(fleet,ship);test.assertEqual(member.health,'65%');test.assertEqual(member.healthRatio,.65);test.assertEqual(member.tech,'8');test.assertEqual(member.power,'8');test.assertFalse(member.title.includes('Member'));
        test.assertTrue(game.showFleetExchange(fleet));const row=display.getFleetExchangeLayout().lists[0].rows[0];test.assertTrue(row.object===ship);test.assertEqual(row.data.health,'65%');test.assertEqual(row.data.tech,'8');
        test.assertEqual(ship.getVisibilityTo(1),Common.VisibilityLevel.NONE);test.assertEqual(display.getShipDiagnostics(ship).health,'?');test.assertFalse(game.canHumanControl(ship));
        fleet.setVisibilityTo(1,Common.VisibilityLevel.TECH);test.assertEqual(display.getFleetMemberDiagnostics(fleet,ship).health,'?');test.assertNull(game.getFleetExchangeState());
    });
    test.it('shows source-backed member stats in detected fleets while keeping names and commands private',()=>{
        const {game,display,fleet}=fixture(8);fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
        for(const ship of fleet.ships){ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.NONE);}
        const text=[],bars=[];display.drawAnchoredPanel=()=>{};display.drawLabelValue=()=>{};display.drawTextLine=t=>text.push(t);
        display.drawDivider=()=>{};display.drawUIButton=()=>{};display.drawContextButtonArc=()=>{};display.drawBar=(...args)=>bars.push(args);
        display.drawFleetDetails(fleet);test.assertTrue(text.includes('Health: 100%'));test.assertTrue(text.includes('8 / 1.4 / 8'));test.assertTrue(bars.every(b=>b[4]===1));test.assertFalse(text.some(t=>String(t).startsWith('Member ')));
        let regions=display.getFleetMemberActionRegions(fleet);test.assertFalse(regions.some(r=>['removeFleetShip','transferFleetShip'].includes(r.action.type)));
        test.assertTrue(click(game,regions.find(r=>r.action.type==='fleetMemberPage')));
        regions=display.getFleetMemberActionRegions(fleet);test.assertTrue(click(game,regions.find(r=>r.action.type==='selectFleetMember')));
        test.assertTrue(fleet.ships.includes(game.selectedObject));
        game.setSelectedObject(fleet);fleet.setVisibilityTo(1,Common.VisibilityLevel.TECH);
        test.assertEqual(display.getFleetMemberActionRegions(fleet).length,0);
    });
    test.it('draws map help beneath inspectors and foreground windows',()=>{
        const {display}=fixture(2),calls=[];
        for(const method of ['updateMapRenderingCalculations','drawBackground','drawScannerRanges','drawGrid','drawDecorativeStars',
            'drawStars','drawShips','drawRendezvousPoints','drawFleets','drawMainUI','drawMapDisplayLegend','drawMapScrollbars',
            'drawIconHint','drawRendezvousPlacementPrompt'])display[method]=()=>{};
        display.drawInstructions=()=>calls.push('help');display.drawFleetDetails=()=>calls.push('inspector');
        display.drawActiveWindow=()=>calls.push('window');display.drawTransitionLayer=(name,key,draw)=>draw();
        display.drawGame();test.assertEqual(calls.join(','),'help,inspector,window');
    });
    test.it('fits every page and translated control in normal and smaller screens',()=>{
        const {game,display,fleet}=fixture(),language=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru'])for(const height of [600,480]){
            pdg.res.setLanguage(lang);display.reloadUIStrings();game.port.getDrawingArea=()=>new pdg.Rect(640,height);
            game.fleetMemberPage=1;const layout=display.getFleetDetailsLayout(fleet);
            test.assertTrue(layout.rect.y>=10&&layout.rect.y+layout.rect.height<=height-10);
            for(const region of display.getFleetMemberActionRegions(fleet)){
                test.assertTrue(region.rect.x>=layout.rect.x&&region.rect.x+region.rect.width<=layout.rect.x+layout.rect.width);
                test.assertTrue(region.rect.y>=layout.rect.y&&region.rect.y+region.rect.height<=layout.rect.y+layout.rect.height);
            }
            const last=display.getFleetMemberActionRegions(fleet).filter(r=>r.action.type==='selectFleetMember').pop();
            const next=display.getFleetMemberPageRegions(fleet,layout).find(r=>r.action.page>layout.page);
            if(next)test.assertTrue(last.rect.y+last.rect.height<next.rect.y);
        }}finally{pdg.res.setLanguage(language);}
    });
});
