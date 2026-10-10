const test=require('./test-framework.js'),VisualEffects=require('../src/js/visual-effects.js'),Display=require('../src/js/display.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),GameConfig=require('../src/js/game-config.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return {game,display:new Display(game)};}
module.exports=function(){test.describe('Subtle presentation effects',()=>{
    test.it('twinkles occasionally rather than making every star flash',()=>{
        const v=new VisualEffects();let eligible=0;for(let id=1;id<=300;id++){
            const hash=Math.imul(id,2654435761)>>>0,time=21000-hash%21000;
            if(v.twinkle(id,time+400)>0)eligible++;
            test.assertEqual(v.twinkle(id,time+1200),0);
        }test.assertTrue(eligible>0&&eligible<60);
    });
    test.it('keeps twinkle phases stable and bounded without depending on draw order',()=>{
        const v=new VisualEffects();for(let id=1;id<=50;id++)for(const time of [0,200,800,9000,21000,100000]){
            const a=v.twinkle(id,time);v.twinkle(id+1,time);test.assertEqual(v.twinkle(id,time),a);test.assertTrue(a>=0&&a<=1);
            test.assertEqual(v.twinkle(id,time+21000),a);
        }
    });
    test.it('does not consume game randomness while sampling effects',()=>{
        const v=new VisualEffects();pdg.srand(424242);const expected=pdg.rand();pdg.srand(424242);
        for(let id=1;id<500;id++){v.twinkle(id,45000);v.parallax({panX:id,panY:-id,scale:1/1024});v.transition('window','menu',id);}
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
        const v=new VisualEffects(true);test.assertEqual(v.twinkle(7,400),0);const p=v.parallax({panX:1e12,panY:1e12,scale:1});test.assertEqual(p.x,0);test.assertEqual(p.y,0);
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
