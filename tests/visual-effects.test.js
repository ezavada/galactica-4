const test=require('./test-framework.js'),VisualEffects=require('../src/js/visual-effects.js'),Display=require('../src/js/display.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),GameConfig=require('../src/js/game-config.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return {game,display:new Display(game)};}
module.exports=function(){test.describe('Subtle presentation effects',()=>{
    test.it('measures button labels, shortcuts and inline icons at their actual font size',()=>{
        const {display:d}=fixture();let text,size;d.port.getTextWidth=(t,s)=>{text=t;size=s;return t.length*s;};
        test.assertEqual(d.getButtonWidth('Long label','Enter',{size:10}),204);test.assertEqual(text,'Long label <Enter>');test.assertEqual(size,10);
        test.assertEqual(d.getButtonWidth('Settings',null,{size:10,icon:'gear'}),130);
        test.assertEqual(d.getButtonWidth('Very long icon label','H',{iconOnly:true,minWidth:98}),98);
    });
    test.it('keeps expanded map buttons separate, onscreen and clickable at their new edges',()=>{
        const {game,display:d}=fixture();d.port.getTextWidth=(text,size)=>Array.from(text).length*size*.8;
        d.STR.endTurn='A much longer translated end-turn label';
        const buttons=d.getMapButtonRegions();
        for(const b of buttons){test.assertTrue(b.rect.x>=0&&b.rect.x+b.rect.width<=800);test.assertTrue(b.rect.width>=d.getButtonWidth(b.label,b.key,{iconOnly:!!b.icon}));}
        for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
            const a=buttons[i].rect,b=buttons[j].rect;test.assertFalse(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height);
        }
        const button=buttons.find(b=>b.action.type==='endTurn');test.assertEqual(d.getUIActionAt(button.rect.x+button.rect.width-2,button.rect.y+3).type,'endTurn');
        d.port.getDrawingArea=()=>new pdg.Rect(480,600);const narrow=d.getMapButtonRegions();test.assertTrue(narrow.every(b=>b.rect.x===narrow[0].rect.x));
    });
    test.it('expands popup buttons together with their click areas and connectors',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Home');star.owner=1;game.setSelectedObject(star);
        d.port.getTextWidth=(text,size)=>text.length*size*.6;d.STR.rename='A longer localized rename action';
        d.toScreenX=()=>400;d.toScreenY=()=>300;
        const button=d.getContextButtonRegions(star).find(b=>b.action.type==='beginRename');
        test.assertTrue(button.rect.width>96);test.assertEqual(d.getUIActionAt(button.rect.x+2,button.centerY).type,'beginRename');
        const end=d.getButtonConnectorPoint(star,button);test.assertTrue(end.x===button.rect.x||end.x===button.rect.x+button.rect.width);
    });
    test.it('wraps command-button rows instead of overlapping long labels',()=>{
        const {display:d}=fixture();d.port.getTextWidth=(text,size)=>text.length*size*.6;
        const buttons=['A long command','Another command','Third command'].map(label=>({label,key:'X'}));
        const layout=d.layoutButtonRow(buttons,{x:10,y:20,width:220,size:10});test.assertTrue(layout.rows>1);
        for(const button of layout.regions){test.assertTrue(button.rect.x+button.rect.width<=230);test.assertTrue(button.rect.width>=d.getButtonWidth(button.label,button.key,{size:10}));}
    });
    test.it('reserves course-window space for wrapped controls on smaller screens',()=>{
        const {game,display:d}=fixture();d.port.getDrawingArea=()=>new pdg.Rect(480,400);
        d.port.getTextWidth=(text,size)=>text.length*size*.8;
        const star=game.factory.createStar(0,0,'Home');star.owner=1;star.techLevel=3;
        const ship=game.factory.createShip(0,0,'scout',star);ship.complete();
        game.courseWindowObject=ship;game.uiWindow='course';game.issuePlayerWaypoint(ship,{x:1000,y:1000});game.courseSelection=0;
        const layout=d.getCourseWindowLayout();test.assertTrue(layout.rect.y+layout.rect.height<=400);
        for(const button of d.getCourseActionRegions().filter(b=>b.label)){
            test.assertTrue(button.rect.y>=layout.rect.y&&button.rect.y+button.rect.height<=layout.rect.y+layout.rect.height);
            test.assertTrue(button.rect.x+button.rect.width<=layout.rect.x+layout.rect.width);
        }
    });
    test.it('cycles every star within ten percent of its average with individual phases and speeds',()=>{
        const v=new VisualEffects(),initials=new Set(),changes=new Set();
        for(let id=1;id<=50;id++) {
            initials.add(v.starBrightness(id,0));changes.add(v.starBrightness(id,1500)-v.starBrightness(id,0));
            for(let time=0;time<20000;time+=250){const a=v.starBrightness(id,time);test.assertTrue(a>=.81&&a<=.99);v.starBrightness(id+1,time);test.assertEqual(v.starBrightness(id,time),a);}
        }
        test.assertTrue(initials.size>40&&changes.size>40);
    });
    test.it('lets white stars brighten as well as dim without clipping the color range',()=>{
        const v=new VisualEffects();for(const id of [1,9,20]) {
            const hash=Math.imul(id,0x9e3779b1)>>>0,period=4800+hash%4801,phase=hash%period;
            test.assertApproximately(v.starBrightness(id,period/4-phase),.99,.000001);
            test.assertApproximately(v.starBrightness(id,period*3/4-phase),.81,.000001);
            test.assertApproximately(v.starBrightness(id,period+1234),v.starBrightness(id,1234),.000001);
        }
    });
    test.it('applies continuous brightness to the actual star gradient while preserving hue',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Test');star.namedStar=true;
        d.scaledStarRadius=3;d.mapEntityNameOpacity=0;d.port.drawPolygon=()=>{};d.port.drawText=()=>{};d.port.getTextWidth=text=>text.length*6;
        const original=d.createAttributes.bind(d);let center;
        d.createAttributes=definition=>{if(definition.fillRadialGradient)center=definition.fillRadialGradient.centerColor;return original(definition);};
        for(const brightness of [.81,.99]){d.visualEffects.starBrightness=()=>brightness;d.drawStar(star);test.assertApproximately(center.red,brightness,.000001);test.assertApproximately(center.green,brightness,.000001);test.assertEqual(center.blue,0);}
    });
    test.it('slows rendezvous color pulsing to a 4.4 second cycle and disables both continuous effects with reduced motion',()=>{
        const v=new VisualEffects();test.assertEqual(v.rendezvousPulse(0),0);test.assertApproximately(v.rendezvousPulse(2200),1,.000001);test.assertApproximately(v.rendezvousPulse(4400),0,.000001);
        const reduced=new VisualEffects(true);test.assertEqual(reduced.rendezvousPulse(2200),0);test.assertEqual(reduced.starBrightness(42,1234),1);
    });
    test.it('twinkles one visible star every 1.8 seconds with a quiet interval between pulses',()=>{
        const v=new VisualEffects(),ids=[3,19,200];
        for(let slot=0;slot<20;slot++){
            const frame=v.twinkleFrame(ids,slot*1800+160);test.assertTrue(ids.includes(frame.id));test.assertApproximately(frame.strength,1,.000001);
            test.assertNull(v.twinkleFrame(ids,slot*1800+1200));
        }
        test.assertNull(v.twinkleFrame([],160));
    });
    test.it('keeps twinkle selection independent of draw order and smoothly bounded',()=>{
        const v=new VisualEffects(),ids=[1,2,3,4,5];let targets=new Set();
        for(let time=0;time<18000;time+=100){
            const a=v.twinkleFrame(ids,time),b=v.twinkleFrame(ids.slice().reverse(),time);
            if(a){test.assertEqual(a.id,b.id);test.assertEqual(a.strength,b.strength);test.assertTrue(a.strength>=0&&a.strength<=1);targets.add(a.id);}
            else test.assertNull(b);
        }
        test.assertTrue(targets.size>1);
    });
    test.it('still provides regular twinkles with only one onscreen star',()=>{
        const v=new VisualEffects();for(let slot=0;slot<10;slot++){test.assertEqual(v.twinkleFrame([42],slot*1800+160).id,42);}
        test.assertNull(new VisualEffects(true).twinkleFrame([42],160));
    });
    test.it('limits candidates to the viewport and refreshes them after scrolling',()=>{
        const {display:d}=fixture();d.visualTime=160;let pan=0;
        d.toScreenX=x=>x-pan;d.toScreenY=y=>y;d.drawStar=()=>{};
        const stars=[{id:1,x:200,y:100},{id:2,x:-10,y:100},{id:3,x:1000,y:100},{id:4,x:200,y:601}];
        d.drawStars(stars);test.assertEqual(d.starTwinkle.id,1);
        pan=900;d.drawStars(stars);test.assertEqual(d.starTwinkle.id,3);
        pan=3000;d.drawStars(stars);test.assertNull(d.starTwinkle);
    });
    test.it('does not consume game randomness while sampling effects',()=>{
        const v=new VisualEffects();pdg.srand(424242);const expected=pdg.rand();pdg.srand(424242);
        for(let id=1;id<500;id++){v.twinkleFrame([id,id+1],45000);v.starBrightness(id,45000);v.rendezvousPulse(45000);v.parallax({panX:id,panY:-id,scale:1/1024});v.transition('window','menu',id);}
        test.assertEqual(pdg.rand(),expected);
    });
    test.it('moves the background only a small distance opposite camera movement',()=>{
        const v=new VisualEffects();const a=v.parallax({panX:102400,panY:-102400,scale:1/1024});test.assertTrue(a.x<0&&a.y>0);test.assertTrue(Math.abs(a.x)<3);
        const b=v.parallax({panX:1e12,panY:-1e12,scale:1/1024});test.assertTrue(Math.abs(b.x)<=8&&Math.abs(b.y)<=8);
    });
    test.it('keeps parallax independent of camera zoom',()=>{
        const v=new VisualEffects(),camera={panX:102400,panY:204800,scale:1/1024,zoom:1};const a=v.parallax(camera);camera.zoom=8;const b=v.parallax(camera);
        test.assertEqual(a.x,b.x);test.assertEqual(a.y,b.y);
    });
    test.it('covers every viewport edge during parallax across aspect ratios',()=>{
        const d=Object.create(Display.prototype);d.visualEffects=new VisualEffects();d.styles={image:{}};
        for(const [width,height] of [[800,600],[1600,900],[480,800]])for(const [iw,ih] of [[1920,1080],[1000,1000],[600,1000]])for(const sign of [-1,1]){
            let rect;d.port={getDrawingArea:()=>new pdg.Rect(width,height),drawImage:(i,r)=>{rect=r}};d.backgroundImage={getWidth:()=>iw,getHeight:()=>ih};d.camera={panX:sign*1e12,panY:-sign*1e12,scale:1/1024};
            d.drawBackground();test.assertTrue(rect.left<=0&&rect.top<=0&&rect.right>=width&&rect.bottom>=height);
        }
    });
    test.it('settles a barely displaced opening window within 120 milliseconds',()=>{
        const v=new VisualEffects(),first=v.transition('window','menu',100),last=v.transition('window','menu',220);
        test.assertEqual(first.opacity,.92);test.assertEqual(first.offset,2);test.assertEqual(last.opacity,1);test.assertEqual(last.offset,0);
    });
    test.it('fades the cached window out fully within 85 milliseconds',()=>{
        const v=new VisualEffects();v.transition('window','menu',100);v.transition('window','menu',300);
        test.assertEqual(v.transition('window',null,400).opacity,1);test.assertTrue(v.transition('window',null,440).opacity<1);test.assertEqual(v.transition('window',null,485).opacity,0);
    });
    test.it('never displays a phantom window on startup or after a clock reset',()=>{
        const v=new VisualEffects();test.assertEqual(v.transition('window',null,0).opacity,0);
        v.transition('window','menu',100);v.transition('window',null,300);v.transition('window',null,400);
        test.assertEqual(v.transition('window',null,50).opacity,0);
    });
    test.it('keeps inspector and menu animation clocks independent',()=>{
        const v=new VisualEffects();v.transition('inspector',1,0);v.transition('window','menu',200);
        test.assertEqual(v.transition('inspector',1,201).opacity,1);test.assertTrue(v.transition('window','menu',201).opacity<1);
    });
    test.it('disables twinkle, parallax and transition movement with reduced motion',()=>{
        const v=new VisualEffects(true);test.assertNull(v.twinkleFrame([7],160));const p=v.parallax({panX:1e12,panY:1e12,scale:1});test.assertEqual(p.x,0);test.assertEqual(p.y,0);
        test.assertEqual(v.transition('window','menu',0).opacity,1);test.assertEqual(v.transition('window','menu',0).offset,0);test.assertEqual(v.transition('window',null,1).opacity,0);
    });
    test.it('tints controlled planet panels and leaves unknown ownership unaccented',()=>{
        const {game,display:d}=fixture();const home=game.factory.createStar(0,0,'Home');home.owner=1;let style;
        d.drawPanelPointer=()=>{};d.drawPanel=(rect,title,border,appearance)=>{style=appearance};const rect={x:0,y:0,width:100,height:100};d.drawAnchoredPanel(home,rect);
        const first=style;test.assertTrue(d.panelStyleColors.get(style).blue>d.getUIColor('panelFill').blue);d.drawAnchoredPanel(home,rect);test.assertTrue(style===first);
        home.owner=0;d.drawAnchoredPanel(home,rect);test.assertNull(style);home.owner=2;d.drawAnchoredPanel(home,rect);test.assertNull(style);
        home.owner=8;game.config.numHumans=8;d.drawAnchoredPanel(home,rect);test.assertTrue(!!style);test.assertTrue(Number.isFinite(d.panelStyleColors.get(style).red));
    });
    test.it('tints enemy panels at exactly the visibility where ownership is revealed',()=>{
        const {display:d}=fixture(),star=d.game.factory.createStar(0,0,'Enemy');star.owner=2;
        d.drawPanelPointer=()=>{};let style;d.drawPanel=(r,t,b,a)=>style=a;
        for(const level of [0,1,2,3,4,0]) {
            star.setVisibilityTo(1,level);d.drawAnchoredPanel(star,{x:0,y:0,width:100,height:100});
            test.assertEqual(!!style,level>0);test.assertEqual(d.getStarDiagnostics(star).owner,level>0?'2':'?');
            if(style)test.assertTrue(d.panelStyleColors.get(style).red>d.getUIColor('panelFill').red);
        }
    });
    test.it('tints identifiable owners with fog disabled, but never unclaimed systems',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Enemy');star.owner=2;game.config.omniscient=true;
        d.drawPanelPointer=()=>{};let style;d.drawPanel=(r,t,b,a)=>style=a;const rect={x:0,y:0,width:100,height:100};
        d.drawAnchoredPanel(star,rect);test.assertTrue(!!style);const enemyStyle=style;
        star.owner=1;d.drawAnchoredPanel(star,rect);test.assertTrue(style!==enemyStyle);
        star.owner=0;d.drawAnchoredPanel(star,rect);test.assertNull(style);
    });
    test.it('tints known allied ownership without requiring a sensor observation',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Ally');star.owner=2;game.players[2].isAllyOf=player=>player===1;
        test.assertTrue(d.isStarOwnerKnown(star));test.assertEqual(d.getStarDiagnostics(star).owner,'2');
    });
    test.it('keeps every neutral panel and dialog gradient free of color bias',()=>{
        const {display:d}=fixture();d.drawRoundedRect=()=>{};
        for(const key of ['panel','windowPanel','topInfoPanel']) {
            const attrs=d.styles[key];let top,bottom;
            attrs.fillGradient=(a,t,b,c)=>{top=t;bottom=c;return attrs;};
            d.drawPanelSurface({x:0,y:0,width:100,height:200},attrs);
            for(const c of [top,bottom]){test.assertApproximately(c.red,c.green,.000001);test.assertApproximately(c.green,c.blue,.000001);}
            test.assertTrue(top.red>bottom.red);test.assertApproximately(top.alpha,bottom.alpha,.000001);
        }
    });
    test.it('uses the same neutral gradient and border recipe on the start screen',()=>{
        const appearance=require('../src/js/panel-appearance.js');let top,bottom,thickness,style;
        const attrs={fillGradient:(a,t,b,c)=>{top=t;bottom=c;},lineStyle:s=>{style=s;return attrs;},lineThickness:t=>thickness=t};
        appearance.applySurface(attrs,{x:0,y:0,width:100,height:100},appearance.color('panelFill'));
        test.assertApproximately(top.red-bottom.red,.075,.000001);test.assertEqual(top.red,top.blue);test.assertEqual(bottom.red,bottom.blue);
        test.assertEqual(style,pdg.lineStyle_Solid);test.assertEqual(thickness,.7);
        const border=appearance.color('panelBorder');test.assertEqual(border.red,border.blue);
    });
    test.it('adds a restrained owner tint to cached borders without revealing unknown owners',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Home');star.owner=1;
        let border;const original=d.createAttributes.bind(d);d.createAttributes=definition=>{const attrs=original(definition);attrs.lineColor=c=>{border=c;return attrs;};return attrs;};
        const style=d.getOwnerPanelStyle(star),base=d.getUIColor('panelBorder');
        test.assertTrue(border.blue>border.red);test.assertApproximately(border.alpha,base.alpha,.000001);
        test.assertApproximately(border.blue,base.blue*.8+d.ownerColors[1].blue*.2,.000001);
        test.assertTrue(d.getOwnerPanelStyle(star)===style);star.owner=2;test.assertNull(d.getOwnerPanelStyle(star));
        game.config.omniscient=true;d.getOwnerPanelStyle(star);test.assertTrue(border.red>border.blue);
    });
    test.it('fades owner-tinted panels from the existing top color to neutral gray at the bottom',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Home');star.owner=1;
        const appearance=d.getOwnerPanelStyle(star),tint=d.panelStyleColors.get(appearance),base=d.getUIColor('panelFill');let colors;
        const attrs={fillGradient:(a,top,b,bottom)=>colors={a,top,b,bottom},lineStyle:()=>({lineThickness:()=>{}})};
        d.panelStyleColors.set(attrs,tint);d.drawRoundedRect=()=>{};d.drawPanelSurface({x:10,y:20,width:100,height:200},attrs);
        test.assertApproximately(colors.top.blue,tint.blue+.022,.000001);test.assertApproximately(colors.bottom.blue,base.blue,.000001);
        test.assertApproximately(colors.bottom.red,base.red,.000001);test.assertApproximately(colors.top.alpha,base.alpha,.000001);test.assertEqual(colors.a.y,20);test.assertEqual(colors.b.y,220);
    });
    test.it('shares the owner gradient with ship panels only when ship ownership is known',()=>{
        const {game,display:d}=fixture(),star=game.factory.createStar(0,0,'Home');star.owner=1;star.startBuildingShip('scout');const ship=star.completeShip();
        test.assertTrue(d.getOwnerPanelStyle(ship)===d.getOwnerPanelStyle(star));ship.owner=2;
        for(const level of [0,1,2,3,4,0]) {ship.setVisibilityTo(1,level);test.assertEqual(!!d.getOwnerPanelStyle(ship),level>=2);}
        game.config.omniscient=true;test.assertTrue(!!d.getOwnerPanelStyle(ship));ship.owner=0;test.assertNull(d.getOwnerPanelStyle(ship));
    });
    test.it('renders ships with unknown ownership using the neutral surface',()=>{
        const RetainedPanel=require('../src/js/retained-panel.js'),neutral={};let appearance;
        const panel={display:{styles:{panel:neutral},drawPanelSurface:(rect,attrs)=>appearance=attrs,port:{drawDrawing:()=>{}}},drawing:{},parentAttributes:{}};
        RetainedPanel.prototype.draw.call(panel,{x:0,y:0,width:100,height:100},null);test.assertTrue(appearance===neutral);
    });
    test.it('keeps familiar icons tied to the original actions and localized labels',()=>{
        const {display}=fixture();const buttons=display.getMapButtonDefinitions();
        for(const [type,icon] of [['selectHomeStar','home'],['zoomToFit','fit']]){const button=buttons.find(b=>b.action.type===type);test.assertEqual(button.icon,icon);test.assertTrue(button.label.length>0);}
        const menu=buttons.find(b=>b.window==='menu');test.assertEqual(menu.icon,'menu');test.assertTrue(menu.label.length>0);
    });
    test.it('restores the real drawing port even if rendering a transition throws',()=>{
        const d=Object.create(Display.prototype),real={getDrawingArea:()=>new pdg.Rect(800,600),getCurrentFont:()=>null};d.port=real;d.visualEffects=new VisualEffects();d.visualTime=10;
        const surface={clear:()=>{},setFont:()=>{}};d.uiSurfaces=new Map([['window',{port:surface,width:800,height:600}]]);
        let threw=false;try{d.drawTransitionLayer('window','menu',()=>{test.assertTrue(d.port===surface);throw Error('render failure')})}catch(e){threw=true}
        test.assertTrue(threw);test.assertTrue(d.port===real);
    });
});};
