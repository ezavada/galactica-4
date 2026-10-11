const test=require('./test-framework.js'),Common=require('../src/js/common.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture(owner=2) {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;
    const home=game.factory.createStar(200000,200000,'Home');home.owner=1;home.techLevel=8;
    const fleet=game.factory.createFleet(home.x,home.y,owner,'Private Fleet');
    for(const type of ['battleship','scout']) {
        const ship=game.factory.createShip(home.x,home.y,type,home,true);ship.owner=owner;ship.name='Secret '+type;
        ship.setVisibilityTo(1,Common.VisibilityLevel.NONE);fleet.addShip(ship);
    }
    fleet.setVisibilityTo(1,Common.VisibilityLevel.SPEED);fleet.destination={x:700000,y:700000,name:'Private Order'};
    display.camera.centerOn(home.x,home.y);display.updateMapRenderingCalculations();
    return {game,display,fleet,home};
}
module.exports=()=>test.describe('V3 fleet information visibility',()=>{
    test.it('reveals only speed at Speed and technology at Tech',()=>{
        const {display,fleet}=fixture();let data=display.getFleetDiagnostics(fleet);
        test.assertEqual(data.title,pdg.res.getString(591));test.assertEqual(data.count,'?');test.assertEqual(data.power,'?');
        test.assertEqual(data.tech,'?');test.assertEqual(data.speed,'1.4');
        test.assertEqual(display.getFleetDetailsLayout(fleet).visibleShips.length,0);
        test.assertEqual(display.getFleetDetailsLayout(fleet).compositionRows.length,0);
        fleet.setVisibilityTo(1,Common.VisibilityLevel.TECH);data=display.getFleetDiagnostics(fleet);
        test.assertEqual(data.tech,'8');test.assertEqual(data.power,'?');test.assertEqual(data.count,'?');
    });
    test.it('opens fleet contents at Class while keeping enemy orders and controls private',()=>{
        const {display,fleet}=fixture();fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
        const data=display.getFleetDiagnostics(fleet),layout=display.getFleetDetailsLayout(fleet);
        test.assertEqual(data.title,'Private Fleet');test.assertEqual(data.count,'2');test.assertTrue(data.power!=='?');
        test.assertEqual(layout.visibleShips.length,2);test.assertEqual(layout.compositionRows.length,2);
        test.assertFalse(layout.knowledge.full);test.assertEqual(display.getFleetMemberActionRegions(fleet).filter(r=>['removeFleetShip','transferFleetShip'].includes(r.action.type)).length,0);
        test.assertEqual(layout.memberStartOffset,18+18+18+22+32+46);
    });
    test.it('does not render hidden fleet names, members, stats, composition or orders',()=>{
        const {display,fleet}=fixture();const text=[];
        display.drawAnchoredPanel=(o,r,title)=>text.push(title);display.drawLabelValue=(l,v)=>text.push(l,v);
        display.drawTextLine=t=>text.push(t);display.drawDivider=()=>{};display.drawUIButton=()=>{};display.drawContextButtonArc=()=>{};
        display.drawFleetDetails(fleet);test.assertFalse(text.some(t=>/Private|Secret|Battleship|Scout/.test(t)));
        test.assertEqual(text.filter(t=>t==='?').length,3);
        fleet.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);text.length=0;display.drawFleetDetails(fleet);
        test.assertFalse(text.includes('Private Order'));test.assertFalse(text.some(t=>String(t).startsWith('Secret')));
    });
    test.it('keeps unknown map sizes and count text independent of the real fleet size',()=>{
        const {display,fleet,game,home}=fixture();const initial=display.getMapMarker(fleet).radius;
        for(let i=0;i<15;i++){const ship=game.factory.createShip(home.x,home.y,'scout',home,true);ship.owner=2;fleet.addShip(ship);}
        test.assertEqual(display.getMapMarker(fleet).radius,initial);
        const text=[],attributes=[];display.port.drawPolygon=()=>{};display.port.drawText=t=>text.push(t);
        display.createAttributes=value=>{attributes.push(value);return value;};display.drawMobileMapName=()=>{};display.drawCourseLines=()=>{};
        display.drawFleet(fleet);test.assertEqual(text.length,0);
        test.assertTrue(attributes[0].fillColor===display.ownerColors[2]);
        fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);test.assertTrue(display.getMapMarker(fleet).radius>initial);
        display.drawFleet(fleet);test.assertTrue(text.includes('17'));test.assertTrue(attributes[1].fillColor===display.ownerColors[2]);
    });
    test.it('shows selected fleet health only at normal zoom with sufficient knowledge',()=>{
        const {display,fleet,game}=fixture();const bars=[];
        fleet.ships[0].damage=fleet.ships[0].power*25;fleet.ships[1].damage=fleet.ships[1].power*50;fleet.calculateFleetStats();
        display.port.drawPolygon=()=>{};display.port.drawCircle=()=>{};display.port.drawText=()=>{};
        display.drawMobileMapName=()=>{};display.drawCourseLines=()=>{};display.drawBar=(...args)=>bars.push(args);
        display.selectedObject=fleet;display.camera.zoom=1;display.drawFleet(fleet);test.assertEqual(bars.length,0);
        fleet.setVisibilityTo(1,Common.VisibilityLevel.CLASS);display.drawFleet(fleet);test.assertEqual(bars.length,1);
        test.assertEqual(bars[0][4],(100-fleet.getDamagePercent())/100);test.assertEqual(bars[0][2],40);test.assertEqual(bars[0][3],4);
        const marker=display.getMapMarker(fleet);test.assertTrue(bars[0][1]+4<marker.y-marker.radius);
        bars.length=0;display.camera.zoom=.75;display.drawFleet(fleet);test.assertEqual(bars.length,0);
        display.camera.zoom=1;display.selectedObject=null;display.drawFleet(fleet);test.assertEqual(bars.length,0);
        display.selectedObject=fleet;fleet.setVisibilityTo(1,Common.VisibilityLevel.SPEED);game.config.omniscient=true;display.drawFleet(fleet);test.assertEqual(bars.length,1);
        game.config.omniscient=false;fleet.owner=1;display.drawFleet(fleet);test.assertEqual(bars.length,2);
    });
    test.it('shows complete allied and omniscient information but leaves enemy controls unavailable',()=>{
        const {display,fleet,game}=fixture(1);let layout=display.getFleetDetailsLayout(fleet);
        test.assertTrue(layout.knowledge.full);test.assertTrue(layout.memberStartOffset>140);
        test.assertNotNull(display.getOwnerPanelStyle(fleet));test.assertTrue(display.getFleetMemberActionRegions(fleet).length>0);
        fleet.owner=2;fleet.setVisibilityTo(1,Common.VisibilityLevel.SPEED);test.assertNull(display.getOwnerPanelStyle(fleet));
        fleet.setVisibilityTo(1,Common.VisibilityLevel.TECH);test.assertNotNull(display.getOwnerPanelStyle(fleet));
        game.config.omniscient=true;layout=display.getFleetDetailsLayout(fleet);
        test.assertTrue(layout.knowledge.full);test.assertEqual(layout.visibleShips.length,2);
        test.assertEqual(display.getFleetMemberActionRegions(fleet).filter(r=>['removeFleetShip','transferFleetShip'].includes(r.action.type)).length,0);
    });
    test.it('uses the active human and translated generic names and formatted speed in all six languages',()=>{
        const {display,fleet,game}=fixture(),language=pdg.res.getLanguage();
        try{for(const lang of ['en','de','es','fr','ja','ru']) {
            pdg.res.setLanguage(lang);let data=display.getFleetDiagnostics(fleet);
            test.assertEqual(data.title,pdg.res.getString(591));test.assertFalse(data.speed.includes('29484'));
        }}finally{pdg.res.setLanguage(language);}
        game.getCurrentHumanPlayer=()=>2;test.assertEqual(display.getFleetDiagnostics(fleet).title,'Private Fleet');
        test.assertTrue(display.getFleetKnowledge(fleet).full);
    });
});
