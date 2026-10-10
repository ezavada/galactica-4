const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Display=require('../src/js/display.js');
const Common=require('../src/js/common.js');
function fixture(type='battleship') {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true,omniscient:false}));
    const star=game.factory.createStar(1024,2048,'Home');star.owner=1;star.techLevel=5;
    star.startBuildingShip(type);const ship=star.completeShip();
    const display=Object.create(Display.prototype);display.game=game;display.STR={ship:'Ship',none:'None',owner:'Owner:',techLevel:'Tech Level:',speed:'Speed:',power:'Power:',damage:'Damage:'};
    return {game,star,ship,display};
}
module.exports=function() {
    test.describe('V3 ship diagnostics',()=>{
        test.it('shows the real name and named drive class with integer tech and power',()=>{
            const {ship,display}=fixture();const data=display.getShipDiagnostics(ship);
            test.assertTrue(data.title.includes(' · '));test.assertTrue(data.title.startsWith(data.driveClass));
            test.assertEqual(data.tech,'5');test.assertEqual(data.power,'5');test.assertEqual(data.speed,'1.2');
        });
        test.it('reflects Unicode renaming immediately',()=>{
            const {game,ship,display}=fixture();game.beginRenameObject(ship);game.renameText='京都 α 🚀';game.commitRename();
            test.assertEqual(display.getShipDiagnostics(ship).title,'京都 α 🚀');
        });
        test.it('uses integer v3 damage percentages and matching health',()=>{
            const {ship,display}=fixture();ship.damage=149;
            test.assertEqual(ship.getDamagePercent(),29);const data=display.getShipDiagnostics(ship);
            test.assertEqual(data.damage,'29%');test.assertEqual(data.health,'71%');test.assertEqual(data.healthRatio,.71);
        });
        test.it('preserves v3 zero-power courier damage display',()=>{
            const {ship,display}=fixture('scout');ship.damage=90;
            test.assertEqual(ship.getDamagePercent(),0);test.assertEqual(display.getShipDiagnostics(ship).damage,'0%');
        });
        test.it('displays a stationary satellite speed as a dash',()=>{
            const {ship,display}=fixture('defense');test.assertEqual(display.getShipDiagnostics(ship).speed,'-');
        });
        test.it('shows localized docked, patrol, travelling and idle states',()=>{
            const {star,ship,display}=fixture();test.assertEqual(display.getShipDiagnostics(ship).status,'Docked');
            ship.setPatrol(true);test.assertEqual(display.getShipDiagnostics(ship).status,'Patrolling');
            ship.setPatrol(false);ship.destination={x:10240,y:20480};test.assertEqual(display.getShipDiagnostics(ship).status,'Travelling');
            ship.destination=null;ship.star=null;test.assertEqual(display.getShipDiagnostics(ship).status,'Idle');
            ship.star=star;test.assertEqual(display.getShipDiagnostics(ship).location,'Home');
        });
        test.it('identifies fleet membership and displays the fleet location and destination',()=>{
            const {game,star,ship,display}=fixture();const fleet=game.factory.createFleet(star.x,star.y,1,'Guard');
            fleet.addShip(ship);fleet.destination=game.factory.createStar(50000,60000,'Fleet target');fleet.destination.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
            const data=display.getShipDiagnostics(ship);test.assertEqual(data.status,'In fleet');
            test.assertEqual(data.location,'Guard');test.assertEqual(data.destination,'Fleet target');
        });
        test.it('reports scanner range in light-years and the current destination',()=>{
            const {game,ship,display}=fixture('scout');ship.setScannerRange(65536);
            ship.destination=game.factory.createStar(30000,40000,'Target');ship.destination.setVisibilityTo(1,Common.VisibilityLevel.CLASS);const data=display.getShipDiagnostics(ship);
            test.assertEqual(data.scanner,'1.00 light-years');test.assertEqual(data.destination,'Target');
        });
        test.it('hides enemy fields until their v3 visibility thresholds are met',()=>{
            const {ship,display}=fixture();ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
            let data=display.getShipDiagnostics(ship);test.assertEqual(data.speed,'1.2');
            ['hull','driveClass','owner','tech','power','damage','health','scanner','status','destination'].forEach(key=>test.assertEqual(data[key],'?'));
            test.assertNull(data.healthRatio);test.assertEqual(data.title,'Ship');
            ship.setVisibilityTo(1,Common.VisibilityLevel.TECH);data=display.getShipDiagnostics(ship);
            test.assertEqual(data.tech,'5');test.assertEqual(data.owner,'2');test.assertEqual(data.power,'?');
            ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);data=display.getShipDiagnostics(ship);
            test.assertEqual(data.power,'5');test.assertEqual(data.damage,'0%');test.assertEqual(data.status,'?');
        });
        test.it('keeps enemy orders private even when other details are visible',()=>{
            const {ship,display}=fixture();ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            ship.destination={name:'Private target',x:99999,y:99999};const data=display.getShipDiagnostics(ship);
            test.assertEqual(data.status,'Travelling');test.assertEqual(data.destination,'?');
        });
        test.it('localizes numeric decimals and scanner units in every supported language',()=>{
            const {ship,display}=fixture('scout');ship.speed=16380*1.5;ship.setScannerRange(65536);
            const previous=pdg.res.getLanguage();
            try { for(const lang of ['en','de','es','fr','ja','ru']) {
                pdg.res.setLanguage(lang);const data=display.getShipDiagnostics(ship);
                test.assertEqual(data.speed,['de','es','fr','ru'].includes(lang)?'1,5':'1.5');
                test.assertTrue(data.scanner.startsWith(['de','es','fr','ru'].includes(lang)?'1,00':'1.00'));
                test.assertFalse(data.scanner.includes('{0}'));
            }} finally { pdg.res.setLanguage(previous); }
        });
        test.it('fits long Unicode names without splitting code points',()=>{
            const {display}=fixture();display.port={getTextWidth:text=>Array.from(text).length*10};
            const fitted=display.fitShipDiagnosticText('🚀'.repeat(32),100);
            test.assertEqual(fitted,'🚀'.repeat(9)+'…');
        });
        test.it('hides enemy course lines and shows health only after class is known',()=>{
            const {ship,display}=fixture();const lines=[],bars=[];
            display.camera={zoom:1};display.selectedObject=ship;display.scaledStarRadius=8;display.scaledShipRadius=5;
            display.toScreenX=x=>x;display.toScreenY=y=>y;display.createAttributes=()=>({});
            display.ownerColors=[];display.styles={};display.selectionPulse={sample:()=>0};
            display.port={drawPolygon:()=>{},drawCircle:()=>{},drawLine:(...args)=>lines.push(args)};
            display.drawBar=(...args)=>bars.push(args);ship.destination={x:30000,y:40000};ship.owner=2;
            ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);display.drawShip(ship);
            test.assertEqual(lines.length,0);test.assertEqual(bars.length,0);
            ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);display.drawShip(ship);
            test.assertEqual(lines.length,0);test.assertEqual(bars.length,1);
            ship.owner=1;display.drawShip(ship);test.assertEqual(lines.length,1);
        });
        test.it('reuses text elements and clears private fields when selecting another ship',()=>{
            const {star,ship,display}=fixture();ship.damage=149;const attrs=new pdg.Attributes();const bars=[];
            display.styles={divider:attrs};display.shipPanels=new Map();display.getTextAttributes=()=>attrs;
            display.port={getTextWidth:text=>Array.from(text).length*6,getCurrentFont:()=>({getFontName:()=> 'Test',getFontAscent:()=>9,getFontDescent:()=>3}),drawDrawing:()=>{}};
            display.getShipDetailsRect=()=>({x:0,y:0,width:350,height:292});display.drawPanelPointer=()=>{};
            display.drawRoundedRect=()=>{};display.drawPanelSurface=()=>{};display.drawContextButtonArc=()=>{};display.drawBar=(x,y,w,h,ratio)=>bars.push(ratio);
            display.drawShipDetails(ship);const panel=display.shipPanels.get(false);const original=panel.fields.get('title').element;
            const count=panel.drawing.getElementCount();test.assertEqual(panel.fields.get('health').text,'71%');
            star.repairDockedShips();display.drawShipDetails(ship);test.assertEqual(panel.fields.get('health').text,'100%');
            test.assertEqual(bars[bars.length-1],1);ship.name='Renamed';display.drawShipDetails(ship);
            test.assertTrue(panel.fields.get('title').element===original);test.assertEqual(original.getText(),'Renamed');
            ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);bars.length=0;display.drawShipDetails(ship);
            test.assertEqual(panel.fields.get('power').text,'?');test.assertEqual(panel.fields.get('destination').text,'?');
            test.assertEqual(bars.length,0);test.assertEqual(panel.drawing.getElementCount(),count);
        });
    });
};
