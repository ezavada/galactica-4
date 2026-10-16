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
    const display=Object.create(Display.prototype);display.game=game;display.factory=game.factory;display.STR={ship:'Ship',none:'None',owner:'Owner:',techLevel:'Tech Level:',speed:'Speed:',power:'Power:',damage:'Damage:'};
    return {game,star,ship,display};
}
module.exports=function() {
    test.describe('V3 ship diagnostics',()=>{
        test.it('keeps complete compact ship and hull diagnostics and commands accessible in six languages',()=>{
            const old=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru'])for(const [width,height] of [[320,240],[800,240],[320,600]]){
                pdg.res.setLanguage(language);const {game,star,ship}=fixture();game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.display=display;game.clearEventPresentations();game.setSelectedObject(ship);ship.name='Long name 星 '.repeat(3);ship.damage=149;
                let l=display.getShipDetailsLayout(ship);test.assertTrue(l.rect.compact);test.assertEqual(l.rows.length,11);test.assertTrue(l.titleLines.join(' ').includes('Long name'));test.assertEqual(l.rows[7].ratio,.71);test.assertTrue(l.rect.x>=10 && l.rect.y>=10 && l.rect.x+l.rect.width<=width-10 && l.rect.y+l.rect.height<=height-10);test.assertTrue(l.commands.some(b=>b.action.type==='beginOrders'));
                game.handleKeyPress(pdg.key_PageDown);test.assertEqual(game.shipInspectorScroll,Math.min(80,l.scrollLimit));game.scrollShipInspector(100000);l=display.getShipDetailsLayout(ship);test.assertEqual(l.bodyScroll,l.scrollLimit);for(const b of display.getContextButtonRegions(ship))test.assertTrue(b.rect.x>=l.rect.x && b.rect.x+b.rect.width<=l.rect.x+l.rect.width && b.rect.y>=l.bodyClip.y && b.rect.y+b.rect.height<=l.bodyClip.y+l.bodyClip.height);
                test.assertEqual(display.getUIActionAt(l.rect.x+2,l.rect.y+l.rect.height/2).type,'consume');test.assertTrue(game.beginMapOrder(ship));test.assertFalse(game.scrollShipInspector(80));game.handleKeyPress(pdg.key_Escape);game.uiWindow='events';test.assertTrue(game.scrollShipInspector(-80));game.uiWindow='settings';test.assertFalse(game.scrollShipInspector(80));game.uiWindow=null;
                const hull=game.factory.createShip(star.x,star.y,'colony',star);hull.progress=75;game.setSelectedObject(hull);l=display.getShipDetailsLayout(hull);test.assertTrue(l.construction);test.assertEqual(l.rows.length,4);test.assertEqual(l.rows[2].ratio,.75);test.assertEqual(l.bodyScroll,0);
            }}finally{pdg.res.setLanguage(old);}
        });
        test.it('uses compact ship visibility thresholds and never exposes foreign hull progress or orders',()=>{
            const {game,star,ship}=fixture();game.port={getDrawingArea:()=>new pdg.Rect(320,240),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};const display=new Display(game);game.display=display;game.setSelectedObject(ship);ship.owner=2;ship.name='Secret';ship.destination={name:'Secret destination',x:30000,y:40000};ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
            let l=display.getShipDetailsLayout(ship);test.assertFalse(l.titleLines.join(' ').includes('Secret'));test.assertEqual(l.data.destination,'?');test.assertTrue(l.rows.every(r=>r.ratio===null));test.assertFalse(l.commands.some(b=>['beginOrders','beginRename','toggleScrap','togglePatrol'].includes(b.action.type)));
            ship.setVisibilityTo(1,Common.VisibilityLevel.CLASS);l=display.getShipDetailsLayout(ship);test.assertEqual(l.data.destination,'?');test.assertNotNull(l.rows[7].ratio);
            const hull=game.factory.createShip(star.x,star.y,'colony',star);hull.owner=2;hull.progress=73;hull.setVisibilityTo(1,Common.VisibilityLevel.SPEED);game.setSelectedObject(hull);l=display.getShipDetailsLayout(hull);test.assertFalse(l.full);test.assertFalse(l.rows.some(r=>r.lines.join(' ').includes('73%')));test.assertTrue(l.rows.every(r=>r.ratio===null));
        });
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
            display.port={getTextWidth:text=>text.length*6,drawText:()=>{},drawPolygon:()=>{},drawCircle:()=>{},drawLine:(...args)=>lines.push(args)};
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
            display.drawRoundedRect=()=>{};display.drawPanelSurface=()=>{};display.getOwnerPanelStyle=()=>null;display.drawContextButtonArc=()=>{};display.drawBar=(x,y,w,h,ratio)=>bars.push(ratio);
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
