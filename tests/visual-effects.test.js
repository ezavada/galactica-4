const test=require('./test-framework.js'),VisualEffects=require('../src/js/visual-effects.js'),Display=require('../src/js/display.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),GameConfig=require('../src/js/game-config.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return {game,display:new Display(game)};}
module.exports=function(){test.describe('Subtle presentation effects',()=>{
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
        for(let id=1;id<500;id++){v.twinkleFrame([id,id+1],45000);v.parallax({panX:id,panY:-id,scale:1/1024});v.transition('window','menu',id);}
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
