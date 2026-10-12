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
        test.it('keeps compact system diagnostics, destinations and editable sliders accessible in six languages',()=>{
            const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru'])for(const [width,height] of [[320,240],[800,240],[320,600]]){
                pdg.res.setLanguage(lang);const {game,star,display}=fixture();game.port.getDrawingArea=()=>new pdg.Rect(width,height);display.reloadUIStrings();game.clearEventPresentations();star.name='Long system 星 '.repeat(2);star.growth.value=20;star.growth.desired=70;star.shipBuilding.desired=20;star.research.desired=10;
                let l=display.getStarDetailsLayout(star);test.assertTrue(l.compact);test.assertTrue(l.titleLines.join(' ').includes('Long system'));test.assertTrue(l.rect.x>=10 && l.rect.y>=10 && l.rect.x+l.rect.width<=width-10 && l.rect.y+l.rect.height<=height-10);test.assertEqual(l.sliders.length,3);test.assertTrue(l.destination.lines.length>0);
                game.starInspectorScroll=l.sliders[0].trackRect.y-l.bodyClip.y-20;l=display.getStarDetailsLayout(star);const first=display.getStarAllocationSliderRegions(star)[0],px=first.trackRect.x+first.trackRect.width/2,py=first.trackRect.y+4;
                test.assertTrue(game.handleUIClick(px,py));test.assertEqual(star.growth.desired,50);test.assertEqual(star.growth.value,20);test.assertTrue(game.beginUISliderDrag(px,py));test.assertFalse(game.scrollStarInspector(80));game.updateUISliderDrag(first.trackRect.x+first.trackRect.width*.8,py);game.endUISliderDrag();test.assertEqual(star.growth.desired,80);
                const lock=display.getAllocationLockRegions().find(r=>r.action.allocationKey==='growth');test.assertNotNull(lock);test.assertTrue(game.handleUIClick(lock.rect.x+lock.rect.width/2,lock.rect.y+lock.rect.height/2));test.assertTrue(star.growth.locked);game.handleUIClick(lock.rect.x+lock.rect.width/2,lock.rect.y+lock.rect.height/2);test.assertFalse(star.growth.locked);
                const equal=display.getAllocationEqualizeRegions().find(r=>!r.inWindow);test.assertNotNull(equal);test.assertTrue(game.handleUIClick(equal.rect.x+equal.rect.width/2,equal.rect.y+equal.rect.height/2));test.assertEqual(star.growth.value,20);test.assertTrue(Math.abs(star.growth.desired+star.shipBuilding.desired+star.research.desired-100)<.001);
                game.scrollStarInspector(100000);l=display.getStarDetailsLayout(star);test.assertEqual(l.bodyScroll,l.scrollLimit);for(const b of display.getContextButtonRegions(star))test.assertTrue(b.rect.x>=l.rect.x && b.rect.x+b.rect.width<=l.rect.x+l.rect.width && b.rect.y>=l.bodyClip.y && b.rect.y+b.rect.height<=l.bodyClip.y+l.bodyClip.height);
                test.assertEqual(display.getUIActionAt(l.rect.x+2,l.rect.y+l.rect.height/2).type,'consume');test.assertTrue(game.beginMapOrder(star));test.assertFalse(game.scrollStarInspector(80));game.handleKeyPress(pdg.key_Escape);
            }}finally{pdg.res.setLanguage(old);}
        });
        test.it('keeps compact enemy production private and removes all editing controls',()=>{
            const {game,star,display}=fixture();game.port.getDrawingArea=()=>new pdg.Rect(320,240);star.owner=2;star.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);const l=display.getStarDetailsLayout(star);
            test.assertFalse(l.owned);test.assertNull(l.data.completion);test.assertNull(l.data.eta);test.assertNull(l.destination);test.assertTrue(l.sliders.every(s=>s.allocation.value===0 && s.allocation.desired===0));test.assertEqual(display.getStarAllocationSliderRegions(star).length,0);test.assertEqual(display.getAllocationEqualizeRegions().length,0);test.assertEqual(display.getDefaultDestinationRegions().length,0);test.assertFalse(l.commands.some(b=>['beginOrders','buildShip','beginRename'].includes(b.action.type)));
        });
        test.it('equalizes targets with = without changing actual production or camera zoom, including locked shares',()=>{
            const {game,star,display}=fixture();star.growth.value=15;star.research.setLocked(true);star.research.desired=20;
            star.growth.desired=65;star.shipBuilding.desired=15;const zoom=display.camera.zoom;
            game.handleKeyPress(61);test.assertEqual(star.growth.desired,40);test.assertEqual(star.shipBuilding.desired,40);test.assertEqual(star.research.desired,20);test.assertEqual(star.growth.value,15);test.assertEqual(display.camera.zoom,zoom);
            game.uiWindow='production';star.growth.desired=70;star.shipBuilding.desired=10;game.handleKeyPress(61);test.assertEqual(star.growth.desired,40);test.assertEqual(display.camera.zoom,zoom);
            game.uiWindow=null;game.handleKeyPress(43);test.assertTrue(display.camera.zoom>zoom);
        });
        test.it('fits translated production labels without moving values or locks and uses the painted track for input',()=>{
            const {game,star,display}=fixture(),language=pdg.res.getLanguage();star.growth.value=20;star.growth.desired=35;
            const labels=[],bars=[],buttons=[],markers=[];
            display.drawRightTextLine=(text,x,y,color,size)=>labels.push({text,x,size});display.drawTextLine=()=>{};
            display.drawBar=(x,y,width,height,value)=>bars.push({x,width,value});display.drawUIButton=rect=>buttons.push(rect);
            display.port.drawLine=point=>markers.push(point.x);
            try{for(const lang of ['en','de','es','fr','ja','ru']){
                pdg.res.setLanguage(lang);display.reloadUIStrings();const layout=display.getStarDetailsLayout(star),rects=display.getAllocationSliderRects(layout.x,layout.sliderStartY,layout.sliderWidth);
                for(const label of [display.STR.growth,display.STR.ships.replace(/:$/,''),display.STR.research])test.assertTrue(rects.label.width>=display.port.getTextWidth(label+':',11));
                test.assertEqual(rects.track.x+rects.track.width,layout.x+64+8+150);test.assertTrue(rects.track.width>100);
                const region=display.getStarAllocationSliderRegions(star)[0];test.assertEqual(region.trackRect.x,rects.track.x);test.assertEqual(region.trackRect.width,rects.track.width);
                labels.length=bars.length=buttons.length=markers.length=0;display.drawAllocationSlider(display.STR.research,star.growth,layout.x,layout.sliderStartY,layout.sliderWidth,'green');
                test.assertTrue(labels[0].x-display.port.getTextWidth(labels[0].text,11)>=layout.x);test.assertEqual(bars[0].width,region.trackRect.width);test.assertEqual(bars[0].value,.2);
                test.assertEqual(markers[0],region.trackRect.x+Math.round(region.trackRect.width*.35));test.assertEqual(buttons[0].x,display.getAllocationLockRegions([region])[0].rect.x);
                star.growth.desired=35;test.assertTrue(game.beginUISliderDrag(region.trackRect.x,region.trackRect.y+4));game.endUISliderDrag();test.assertEqual(star.growth.desired,0);test.assertEqual(star.growth.value,20);star.growth.desired=35;
                game.uiWindow='production';const modal=display.getProductionWindowSliderRegions()[0];test.assertEqual(modal.trackRect.x+modal.trackRect.width,display.getProductionWindowRect().x+14+64+8+185);game.uiWindow=null;
            }}finally{pdg.res.setLanguage(language);display.reloadUIStrings();}
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
