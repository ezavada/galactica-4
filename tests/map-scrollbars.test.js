const test=require('./test-framework.js'),Scrollbars=require('../src/js/map-scrollbars.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture() {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    const size={width:800,height:600};game.port={getDrawingArea:()=>new pdg.Rect(size.width,size.height)};
    const display=new Display(game);game.display=display;display.camera.setZoom(2);
    const star=game.factory.createStar(200000,300000,'Home');game.setSelectedObject(star);
    return {game,display,camera:display.camera,size,star};
}
const midpoint=r=>[r.x+r.width/2,r.y+r.height/2];
function browserFixture() {
    const listeners={},windowListeners={},released=[];
    const canvas={focus(){},setPointerCapture(id){this.captured=id;},
        addEventListener(type,handler){(listeners[type] || (listeners[type]=[])).push(handler);},
        dispatchEvent(event){event.target=this;if(event.type==='mouseup')released.push(event);
            for(const handler of listeners[event.type] || [])handler(event);}};
    const window={location:{href:'http://localhost/',search:''},
        addEventListener(type,handler){windowListeners[type]=handler;}};
    const document={getElementById:id=>id==='pdg-canvas'?canvas:null,createElement:()=>({}),head:{appendChild(){}}};
    function URL(){this.pathname='/';}
    function Params(){this.get=()=>null;}
    function MouseEvent(type,props){Object.assign(this,props,{type});}
    const source=require('fs').readFileSync(require('path').join(__dirname,'../web/galactica-web.js'),'utf8');
    new Function('window','document','URL','URLSearchParams','navigator','MouseEvent','setTimeout',source)
        (window,document,URL,Params,{language:'en'},MouseEvent,()=>{});
    const fire=(type,props={})=>{for(const handler of listeners[type] || [])handler(Object.assign({type,clientX:10,clientY:20,buttons:0},props));};
    return {canvas,fire,windowListeners,released};
}
module.exports=()=>test.describe('Map scroll bars',()=>{
    test.it('forwards external browser releases once through the canvas with their coordinates',()=>{
        const {canvas,fire,windowListeners,released}=browserFixture();fire('mousedown',{button:0,buttons:1});
        windowListeners.mouseup({button:0,target:{},clientX:-10,clientY:40});
        test.assertEqual(released.length,1);test.assertTrue(released[0].target===canvas);
        test.assertEqual(released[0].clientX,-10);test.assertEqual(released[0].clientY,40);
        windowListeners.mouseup({button:0,target:{},clientX:0,clientY:0});test.assertEqual(released.length,1);
    });
    test.it('recovers missing browser release on re-entry and releases middle drag on blur',()=>{
        const {fire,windowListeners,released}=browserFixture();fire('mousedown',{button:0,buttons:1});
        fire('mousemove',{buttons:0,clientX:30,clientY:40});test.assertEqual(released.length,1);
        fire('mousemove',{buttons:0});test.assertEqual(released.length,1);
        fire('mousedown',{button:1,buttons:4,clientX:50,clientY:60});windowListeners.blur();
        test.assertEqual(released.length,2);test.assertEqual(released[1].button,1);test.assertEqual(released[1].clientX,50);
    });
    test.it('captures real mouse pointers and leaves normal canvas releases unduplicated',()=>{
        const {canvas,fire,windowListeners,released}=browserFixture();
        fire('pointerdown',{pointerType:'mouse',button:0,pointerId:7});test.assertEqual(canvas.captured,7);
        fire('mousedown',{button:0,buttons:1});fire('mousemove',{buttons:1});test.assertEqual(released.length,0);
        fire('mouseup',{button:0});windowListeners.mouseup({button:0,target:canvas});
        fire('mousemove',{buttons:0});test.assertEqual(released.length,0);
    });
    test.it('keeps the selection but hides map action arcs when scrolling it offscreen',()=>{
        const {game,display,camera,star}=fixture();star.owner=1;
        camera.centerOn(star.x,star.y);test.assertTrue(display.getContextButtonArc(star,{x:430,y:80,width:360,height:400}).length>0);
        camera.centerOn(camera.mapWidth,camera.mapHeight);
        test.assertEqual(display.getContextButtonArc(star,{x:10,y:10,width:360,height:400}).length,0);
        test.assertTrue(game.selectedObject===star);
    });
    test.it('uses actual inverse viewport extents and proportional thumbs at every zoom',()=>{
        const {camera}=fixture();
        for(const zoom of [.1,1,2,10]) {
            camera.setZoom(zoom);const bars=Scrollbars.layout(camera,800,600);
            for(const bar of bars) {
                const span=(bar.axis==='x'?800:600)/(zoom*camera.scale);
                test.assertApproximately(bar.span,span,.001);
                test.assertEqual(bar.enabled,bar.range>0);
                test.assertTrue(bar.thumbLength<=bar.trackLength && bar.thumbLength>0);
            }
        }
    });
    test.it('scrolls each axis to both boundaries without changing the other axis or zoom',()=>{
        const {camera}=fixture();
        for(const bar of Scrollbars.layout(camera,800,600)) {
            const other=bar.axis==='x'?camera.toGalacticY(0):camera.toGalacticX(0);
            Scrollbars.move(camera,bar,-100);test.assertApproximately(bar.axis==='x'?camera.toGalacticX(0):camera.toGalacticY(0),0,.01);
            Scrollbars.move(camera,bar,bar.range+100);test.assertApproximately(bar.axis==='x'?camera.toGalacticX(0):camera.toGalacticY(0),bar.range,.01);
            test.assertApproximately(bar.axis==='x'?camera.toGalacticY(0):camera.toGalacticX(0),other,.01);
            test.assertEqual(camera.zoom,2);
        }
    });
    test.it('captures thumb drag without jumping and clamps release outside the window',()=>{
        const {game,display,camera,star}=fixture();const bar=display.getMapScrollbars()[0],start=midpoint(bar.thumb),before=camera.toGalacticX(0);
        test.assertTrue(game.beginMapScrollDrag(...start));game.updateMapScrollDrag(...start);
        test.assertApproximately(camera.toGalacticX(0),Math.max(0,before),.01);
        game.updateMapScrollDrag(10000,start[1]+200);test.assertApproximately(camera.toGalacticX(0),bar.range,.01);
        game.endMapScrollDrag(-10000,start[1]);test.assertApproximately(camera.toGalacticX(0),0,.01);
        test.assertEqual(game.uiMapScrollDrag,null);test.assertTrue(game.selectedObject===star);
    });
    test.it('pages track clicks and steps arrow clicks rather than selecting underlying stars',()=>{
        const {game,display,camera,star}=fixture();let bar=display.getMapScrollbars()[0];
        Scrollbars.move(camera,bar,bar.range/2);bar=display.getMapScrollbars()[0];const before=bar.leading;
        test.assertTrue(game.handleUIClick(...midpoint(bar.after)));test.assertApproximately(camera.toGalacticX(0),before+.1*bar.span,.01);
        bar=display.getMapScrollbars()[0];const x=bar.thumb.x-2;
        test.assertTrue(game.handleUIClick(x,bar.rect.y+6));test.assertApproximately(camera.toGalacticX(0),Math.max(0,before-.8*bar.span),.01);
        test.assertTrue(game.selectedObject===star);
    });
    test.it('repeats held arrows after a delay and stops when released or moved off the arrow',()=>{
        const {game,display,camera}=fixture(),clock=pdg.tm.getMilliseconds;
        let time=100;pdg.tm.getMilliseconds=()=>time;
        try {
            const point=midpoint(display.getMapScrollbars()[0].after);
            game.beginMapScrollDrag(...point);const first=camera.toGalacticX(0);
            time=200;game.updateMapScrollDrag(...point);test.assertEqual(camera.toGalacticX(0),first);
            time=500;game.updateMapScrollDrag(...point);test.assertTrue(camera.toGalacticX(0)>first);
            const repeated=camera.toGalacticX(0);time=600;game.updateMapScrollDrag(point[0],point[1]-100);
            test.assertEqual(camera.toGalacticX(0),repeated);game.endMapScrollDrag();
            time=1000;test.assertFalse(game.updateMapScrollDrag(...point));test.assertEqual(camera.toGalacticX(0),repeated);
        } finally {pdg.tm.getMilliseconds=clock;}
    });
    test.it('disables fitted axes and preserves map state on disabled clicks',()=>{
        const {game,display,camera}=fixture();camera.setZoom(.1);const x=camera.panX,y=camera.panY;
        for(const bar of display.getMapScrollbars()) {
            test.assertFalse(bar.enabled);test.assertTrue(game.beginMapScrollDrag(...midpoint(bar.thumb)));
            test.assertEqual(game.uiMapScrollDrag,null);
        }
        test.assertEqual(camera.panX,x);test.assertEqual(camera.panY,y);
    });
    test.it('honors modal windows and cancels stale captures after zoom resize and Escape',()=>{
        const {game,display,camera,size}=fixture();
        for(const window of ['rename','colonyDefaults','settings','mapDisplay','view','endTurnConfirm']) {
            game.uiWindow=window;test.assertFalse(game.beginMapScrollDrag(...midpoint(display.getMapScrollbars()[0].thumb)));
        }
        game.uiWindow=null;
        for(const change of [()=>camera.setZoom(3),()=>size.width=900,()=>game.uiWindow='view']) {
            game.beginMapScrollDrag(...midpoint(display.getMapScrollbars()[0].thumb));change();
            test.assertTrue(game.updateMapScrollDrag(300,500));test.assertEqual(game.uiMapScrollDrag,null);game.uiWindow=null;
        }
        game.beginMapScrollDrag(...midpoint(display.getMapScrollbars()[0].thumb));game.handleKeyPress(pdg.key_Escape);
        test.assertEqual(game.uiMapScrollDrag,null);
    });
    test.it('consumes Enter and Tab during a scrollbar drag without advancing turn or selection',()=>{
        const {game,display,star}=fixture();let next=0;game.attention.next=()=>next++;
        game.beginMapScrollDrag(...midpoint(display.getMapScrollbars()[0].thumb));const turn=game.turn;
        game.handleKeyPress(pdg.key_Tab);game.handleKeyPress(13);
        test.assertEqual(next,0);test.assertEqual(game.turn,turn);test.assertTrue(game.selectedObject===star);game.endMapScrollDrag();
    });
});
