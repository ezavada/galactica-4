const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js');
const Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js');
const Rules=require('../src/js/rules.js');
const Display=require('../src/js/display.js');
const Common=require('../src/js/common.js');
const I18n=require('../src/js/i18n.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const star=game.factory.createStar(98304,163840,'Atlas');star.owner=1;star.techLevel=8;star.population=1234567;
    star.startBuildingShip('battleship');star.currentShip.progress=99.9;star.setDefaultDestination({x:163840,y:229376});
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;game.setSelectedObject(star);
    return {game,star,display};
}
module.exports=function() {
    test.describe('System diagnostics and v3 visibility',()=>{
        test.it('equalizes targets with = without changing actual production or camera zoom, including locked shares',()=>{
            const {game,star,display}=fixture();star.growth.value=15;star.research.setLocked(true);star.research.desired=20;
            star.growth.desired=65;star.shipBuilding.desired=15;const zoom=display.camera.zoom;
            game.handleKeyPress(61);test.assertEqual(star.growth.desired,40);test.assertEqual(star.shipBuilding.desired,40);test.assertEqual(star.research.desired,20);test.assertEqual(star.growth.value,15);test.assertEqual(display.camera.zoom,zoom);
            game.uiWindow='production';star.growth.desired=70;star.shipBuilding.desired=10;game.handleKeyPress(61);test.assertEqual(star.growth.desired,40);test.assertEqual(display.camera.zoom,zoom);
            game.uiWindow=null;game.handleKeyPress(43);test.assertTrue(display.camera.zoom>zoom);
        });
        test.it('fits Set/Clear after long Unicode destination text in every language without crossing the panel',()=>{
            const {game,star,display}=fixture(),previous=pdg.res.getLanguage(),target=game.factory.createStar(0,0,'京都 '+ '航'.repeat(80));target.owner=1;star.setDefaultDestination(target);
            try{for(const lang of ['en','de','es','fr','ja','ru']){
                pdg.res.setLanguage(lang);display.reloadUIStrings();const layout=display.getStarDetailsLayout(star),destination=display.getDefaultDestinationLayout(star,layout),regions=destination.regions;
                test.assertEqual(regions.length,2);test.assertEqual(regions[0].rect.x,destination.valueX+display.port.getTextWidth(destination.text,11)+4);
                test.assertTrue(regions[0].rect.x+regions[0].rect.width+4<=regions[1].rect.x);test.assertTrue(regions[1].rect.x+regions[1].rect.width<=layout.rect.x+layout.rect.width-12);
                test.assertEqual(destination.y,layout.basicStartY+72);test.assertTrue(destination.text.endsWith('…'));
            }}finally{pdg.res.setLanguage(previous);}
        });

        test.it('shows owned-system integers, named drive class, coordinates, progress and current output',()=>{
            const {star,display}=fixture();const data=display.getStarDiagnostics(star);
            test.assertEqual(data.title,'Atlas');test.assertEqual(data.population,'1,234,567,000');test.assertEqual(data.tech,'8');
            test.assertEqual(data.position,'(1.50, 2.50)');test.assertEqual(data.building,I18n.getString(800).split('|')[1]);
            test.assertEqual(data.completion,99);test.assertEqual(data.production,'12');test.assertEqual(data.destination,'(2.50, 3.50)');
        });
        test.it('hides unseen system ownership and private economy while retaining its coordinates',()=>{
            const {star,display}=fixture();star.owner=2;const data=display.getStarDiagnostics(star);
            test.assertEqual(data.title,I18n.formatString(725,'S-{0}',star.id));test.assertEqual(data.owner,'?');
            for(const field of ['population','tech','building','totalDefense','satelliteDefense','shipDefense','production'])test.assertEqual(data[field],'?');
            test.assertEqual(data.completion,null);test.assertEqual(data.eta,null);test.assertFalse(data.showProduction);test.assertFalse(data.showDestination);
            test.assertEqual(data.destination,I18n.getString(7));test.assertEqual(data.position,'(1.50, 2.50)');
        });
        test.it('reveals ownership at first visibility but not technology or the true name',()=>{
            const {star,display}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
            const data=display.getStarDiagnostics(star);test.assertEqual(data.owner,'2');test.assertEqual(data.tech,'?');
            test.assertFalse(data.title==='Atlas');test.assertEqual(data.population,'?');
        });
        test.it('draws ownership from first detection while keeping name, technology and population gated',()=>{
            const {game,star,display}=fixture();star.owner=2;game.showMapNames=false;game.setSelectedObject(null);
            display.scaledStarRadius=8;const halos=[];display.createAttributes=value=>value;
            display.port.drawCircle=(point,radius,attributes)=>{if(attributes.fillColor===display.ownerColors[2])halos.push(radius);};
            display.port.drawPolygon=()=>{};
            for(const level of [Common.VisibilityLevel.NONE,Common.VisibilityLevel.SPEED,Common.VisibilityLevel.TECH,Common.VisibilityLevel.CLASS,Common.VisibilityLevel.DETAILS]) {
                star.setVisibilityTo(1,level);halos.length=0;display.drawStar(star);
                test.assertEqual(halos.length,level===Common.VisibilityLevel.NONE?0:1);
                const data=display.getStarDiagnostics(star);test.assertEqual(data.owner,level===Common.VisibilityLevel.NONE?'?':'2');
                if(level<Common.VisibilityLevel.TECH)test.assertEqual(data.tech,'?');
                if(level<Common.VisibilityLevel.CLASS){test.assertEqual(data.population,'?');test.assertFalse(data.title==='Atlas');}
            }
        });
        test.it('removes live ownership and mobile markers after detection is lost without clearing last-seen history',()=>{
            const {game,star,display}=fixture();star.owner=2;game.showMapNames=false;game.setSelectedObject(null);
            const ship=game.factory.createShip(star.x,star.y,'scout',star,true);ship.star=null;ship.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            game.turn=4;star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);star.setLastSeen(1,3);ship.setLastSeen(1,3);
            test.assertTrue(display.isMobileVisibleOnMap(ship));game.visibilityCalculator.resetCurrentVisibilityForPlayer(1);
            test.assertFalse(display.isMobileVisibleOnMap(ship));test.assertEqual(ship.getLastSeen(1),3);test.assertEqual(star.getLastSeen(1),3);
            display.scaledStarRadius=8;let halos=0;display.createAttributes=value=>value;display.port.drawPolygon=()=>{};
            display.port.drawCircle=(p,r,a)=>{if(a.fillColor===display.ownerColors[2])halos++;};display.drawStar(star);
            test.assertEqual(halos,0);test.assertEqual(display.getStarDiagnostics(star).owner,'?');
        });
        test.it('draws known allied and omniscient ownership without scanners but leaves neutral stars untinted',()=>{
            const {game,star,display}=fixture();star.owner=2;game.showMapNames=false;game.setSelectedObject(null);display.scaledStarRadius=8;
            let halos=0;display.createAttributes=value=>value;display.port.drawPolygon=()=>{};
            display.port.drawCircle=(p,r,a)=>{if(a.fillColor===display.ownerColors[2])halos++;};
            game.players[1].isAllyOf=owner=>owner===2;game.players[2].isAllyOf=owner=>owner===1;
            display.drawStar(star);test.assertEqual(halos,1);
            game.players[1].isAllyOf=()=>false;game.players[2].isAllyOf=()=>false;game.config.omniscient=true;
            display.drawStar(star);test.assertEqual(halos,2);star.owner=0;display.drawStar(star);test.assertEqual(halos,2);
        });
        test.it('reveals integer technology at tech visibility while population and name remain unknown',()=>{
            const {star,display}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.TECH);
            const data=display.getStarDiagnostics(star);test.assertEqual(data.tech,'8');test.assertEqual(data.population,'?');test.assertFalse(data.title==='Atlas');
        });
        test.it('reveals name and population at class visibility while hiding construction and defenses',()=>{
            const {star,display}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.CLASS);
            const data=display.getStarDiagnostics(star);test.assertEqual(data.title,'Atlas');test.assertEqual(data.population,'1,234,567,000');
            test.assertEqual(data.building,'?');test.assertEqual(data.totalDefense,'?');test.assertEqual(data.completion,null);
        });
        test.it('reveals hull and defenses at details visibility but never enemy progress, allocations or destination',()=>{
            const {star,display}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);
            const data=display.getStarDiagnostics(star);test.assertEqual(data.building,I18n.getString(800).split('|')[1]);
            test.assertFalse(data.totalDefense==='?');test.assertEqual(data.completion,null);test.assertEqual(data.eta,null);
            test.assertEqual(data.production,'?');test.assertTrue(data.showProduction);test.assertFalse(data.showDestination);
        });
        test.it('friendly ships at neutral systems allow inspection without revealing unscanned economy',()=>{
            const {game,star,display}=fixture();star.owner=0;const ship=game.factory.createShip(star.x,star.y,'scout',star,true);ship.owner=1;
            test.assertTrue(game.canViewSystemShips(star));const data=display.getStarDiagnostics(star);
            test.assertEqual(data.population,'?');test.assertFalse(data.showProduction);test.assertTrue(display.getContextActions(star).some(a=>a.action.type==='showSystemShips'));
        });
        test.it('shows allied production and destination as read-only',()=>{
            const {game,star,display}=fixture();star.owner=2;game.players[1].isAllyOf=owner=>owner===2;game.players[2].isAllyOf=owner=>owner===1;
            const data=display.getStarDiagnostics(star);test.assertTrue(data.showProduction);test.assertTrue(data.showDestination);
            test.assertEqual(data.production,'12');test.assertEqual(data.completion,99);test.assertFalse(display.getContextActions(star).some(a=>a.action.type==='showSystemShips'));test.assertTrue(game.canViewSystemShips(star));test.assertEqual(data.destination,'(2.50, 3.50)');
            test.assertEqual(display.getStarAllocationSliderRegions(star).length,0);test.assertEqual(display.getDefaultDestinationRegions().length,0);
            test.assertEqual(display.getAllocationEqualizeRegions().length,0);test.assertFalse(display.getContextActions(star).some(a=>a.action.type==='buildShip'));
        });
        test.it('permits omniscient inspection without granting control over enemy systems',()=>{
            const {game,star,display}=fixture();star.owner=2;game.config.omniscient=true;
            test.assertEqual(display.getStarDiagnostics(star).title,'Atlas');test.assertEqual(display.getStarDiagnostics(star).completion,99);
            test.assertEqual(display.getStarAllocationSliderRegions(star).length,0);test.assertEqual(display.getDefaultDestinationRegions().length,0);
        });
        test.it('refreshes defense damage, construction and population without a cached snapshot',()=>{
            const {game,star,display}=fixture();const ship=game.factory.createShip(star.x,star.y,'battleship',star,true);ship.damage=149;
            const before=display.getStarDiagnostics(star);ship.damage=0;star.population=2000;star.currentShip.progress=12;star.name='京都 α';
            const after=display.getStarDiagnostics(star);test.assertEqual(after.shipDefense,'8');test.assertEqual(before.shipDefense,'6');
            test.assertEqual(after.population,'2,000,000');test.assertEqual(after.completion,12);test.assertEqual(after.title,'京都 α');
        });
        test.it('localizes integer grouping and decimal coordinates in all six languages',()=>{
            const {star,display}=fixture();const previous=pdg.res.getLanguage();
            const separators={en:',',de:'.',es:'.',fr:'\u202f',ja:',',ru:'\u00a0'};
            try{for(const lang of Object.keys(separators)) {
                pdg.res.setLanguage(lang);const data=display.getStarDiagnostics(star),s=separators[lang];
                test.assertEqual(data.population,`1${s}234${s}567${s}000`,lang);test.assertEqual(I18n.formatInteger(-1234567),`-1${s}234${s}567`,lang);
                test.assertEqual(data.position,['de','es','fr','ru'].includes(lang)?'(1,50, 2,50)':'(1.50, 2.50)',lang);
            }}finally{pdg.res.setLanguage(previous);}
        });
        test.it('uses light-year coordinates consistently for ships, rendezvous points and coordinate destinations',()=>{
            const {game,star,display}=fixture();const ship=game.factory.createShip(98304,163840,'scout',star,true);
            ship.star=null;ship.x=98304;ship.y=163840;ship.destination={x:163840,y:229376};
            const data=display.getShipDiagnostics(ship);test.assertEqual(data.location,'(1.50, 2.50)');test.assertEqual(data.destination,'(2.50, 3.50)');
            test.assertEqual(display.formatSpaceCoordinates({x:-65536,y:32768}),'(-1.00, 0.50)');
            const enemy=game.factory.createStar(0,0,'Private name');enemy.owner=2;
            test.assertEqual(display.getSpacePointDescription(enemy),I18n.formatString(725,'S-{0}',enemy.id));
        });
        test.it('keeps compact production controls and destination buttons apart inside the screen',()=>{
            const {star,display}=fixture();star.x=500;star.y=300;display.toScreenX=x=>x;display.toScreenY=y=>y;
            const layout=display.getStarDetailsLayout(star),slider=display.getStarAllocationSliderRegions(star)[2];
            const button=display.getAllocationEqualizeRegions()[0].rect;
            const locks=display.getAllocationLockRegions(display.getStarAllocationSliderRegions(star));test.assertTrue(button.x>=locks[1].rect.x+locks[1].rect.width+4);test.assertEqual(button.y+button.height/2,locks[1].rect.y+locks[1].rect.height/2+3);test.assertTrue(layout.rect.y>=10);
            test.assertTrue(layout.rect.y+layout.rect.height<=590);
            const send=display.getDefaultDestinationRegions()[0].rect;test.assertTrue(send.y+send.height<button.y);
        });
        test.it('draws enemy details without leaking progress, ETA, production percentages or destination text',()=>{
            const {star,display}=fixture();star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);const texts=[];
            display.drawTextLine=text=>texts.push(String(text));display.drawRightTextLine=text=>texts.push(String(text));
            display.drawAnchoredPanel=()=>{};display.drawDivider=()=>{};display.drawBar=()=>{};display.drawUIButton=()=>{};
            display.drawContextButtonArc=()=>{};display.port.drawLine=()=>{};
            display.drawStarDetails(star);test.assertFalse(texts.includes('99%'));test.assertFalse(texts.includes('33.3%'));
            test.assertFalse(texts.includes('(2.50, 3.50)'));test.assertFalse(texts.includes(I18n.getString(679)));test.assertFalse(texts.includes(I18n.getString(674)));
        });
        test.it('fits a long Unicode name and values within the system panel',()=>{
            const {star,display}=fixture();star.name='京都 '+ '航'.repeat(50);const drawn=[];
            display.drawAnchoredPanel=(object,rect,title)=>drawn.push({text:title,width:rect.width-32,size:14});
            display.drawLabelValue=(label,value,x,y,options)=>drawn.push({text:value,width:360-options.labelWidth-24,size:11});
            display.drawTextLine=()=>{};display.drawRightTextLine=()=>{};display.drawDivider=()=>{};display.drawBar=()=>{};
            display.drawUIButton=()=>{};display.drawContextButtonArc=()=>{};display.drawStarAllocationSummary=()=>{};
            display.drawStarDetails(star);test.assertTrue(drawn[0].text.endsWith('…'));
            drawn.forEach(row=>test.assertTrue(display.port.getTextWidth(row.text,row.size)<=row.width));
        });
    });
};
