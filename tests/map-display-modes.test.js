const test=require('./test-framework.js'),Modes=require('../src/js/map-display-modes.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js');
function fixture(){
    const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:text=>Array.from(text).length*6};
    const a=game.factory.createStar(100,100,'A'),b=game.factory.createStar(300,100,'B'),hidden=game.factory.createStar(500,100,'Hidden');
    a.owner=b.owner=1;hidden.owner=2;a.techLevel=1;b.techLevel=9;hidden.techLevel=999;
    hidden.setVisibilityTo(1,Common.VisibilityLevel.NONE);
    return {game,a,b,hidden,display:new Display(game)};
}
module.exports=()=>test.describe('Map display modes',()=>{
    test.it('scales technology brightness between owned systems and handles equal or empty ranges',()=>{
        const {game,a,b,hidden}=fixture();let state=Modes.sample(game,'tech');
        test.assertEqual(state.low,1);test.assertEqual(state.high,9);test.assertEqual(Modes.brightness(game,a,true,state),.1);test.assertEqual(Modes.brightness(game,b,true,state),1);
        test.assertEqual(Modes.brightness(game,hidden,true,state),.6);
        a.techLevel=b.techLevel=4;state=Modes.sample(game,'tech');test.assertEqual(Modes.brightness(game,a,true,state),1);
        a.owner=b.owner=0;state=Modes.sample(game,'tech');test.assertNull(state.low);test.assertNull(state.high);test.assertEqual(Modes.brightness(game,a,true,state),.6);
    });
    test.it('keeps unknown enemy values out of both shading and normalization until the relevant knowledge threshold',()=>{
        const {game,a,b,hidden}=fixture();hidden.setVisibilityTo(1,Common.VisibilityLevel.SPEED);
        const first=Modes.sample(game,'tech');hidden.techLevel=100000;
        const second=Modes.sample(game,'tech');test.assertEqual(first.high,second.high);test.assertEqual(Modes.brightness(game,a,true,first),Modes.brightness(game,a,true,second));
        hidden.setVisibilityTo(1,Common.VisibilityLevel.TECH);test.assertEqual(Modes.sample(game,'tech').high,100000);
        let defenseReads=0;hidden.getTotalDefenseStrength=()=>{defenseReads++;return 1000000;};
        test.assertFalse(Modes.sample(game,'defense').values.has(hidden));test.assertEqual(defenseReads,0);
        hidden.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);test.assertEqual(Modes.sample(game,'defense').values.get(hidden),10000);test.assertEqual(defenseReads,1);
        test.assertFalse(Modes.sample(game,'production').values.has(hidden));test.assertFalse(Modes.sample(game,'growth').values.has(hidden));
        game.config.omniscient=true;test.assertTrue(Modes.sample(game,'production').values.has(hidden));test.assertTrue(Modes.sample(game,'growth').values.has(hidden));
    });
    test.it('uses target allocations rather than actual output and includes docked ships in defense',()=>{
        const {game,a,b}=fixture();a.growth.desired=10;a.growth.value=90;b.growth.desired=80;b.growth.value=20;
        const state=Modes.sample(game,'growth');test.assertEqual(state.low,10);test.assertEqual(state.high,80);test.assertEqual(Modes.brightness(game,a,true,state),.1);
        a.shipBuilding.desired=70;a.research.desired=20;test.assertEqual(Modes.sample(game,'shipbuilding').values.get(a),70);test.assertEqual(Modes.sample(game,'research').values.get(a),20);
        const before=Modes.sample(game,'defense').values.get(a),ship=game.factory.createShip(a.x,a.y,'battleship',a);ship.complete();ship.power=30;
        test.assertEqual(Modes.sample(game,'defense').values.get(a),before+ship.getDefenseStrength()/100);
        test.assertEqual(Modes.sample(game,'production').values.get(a),a.getProduction()/100);
    });
    test.it('uses star ranges for mobile tech and defense while de-emphasizing mobile objects in economic modes',()=>{
        const {game,a,b}=fixture(),ship=game.factory.createShip(500,200,'scout',a);ship.complete();ship.techLevel=5;
        test.assertEqual(Modes.brightness(game,ship,false,Modes.sample(game,'tech')),.6);
        test.assertEqual(Modes.brightness(game,ship,false,Modes.sample(game,'production')),.05);
        test.assertEqual(Modes.brightness(game,ship,false,Modes.sample(game,'ownership')),1);
        ship.owner=2;ship.setVisibilityTo(1,Common.VisibilityLevel.SPEED);test.assertEqual(Modes.brightness(game,ship,false,Modes.sample(game,'tech')),.05);
        ship.setVisibilityTo(1,Common.VisibilityLevel.TECH);test.assertEqual(Modes.brightness(game,ship,false,Modes.sample(game,'tech')),.6);
        ship.setVisibilityTo(1,Common.VisibilityLevel.DETAILS);test.assertEqual(Modes.value(game,ship,'defense',false),ship.getDefenseStrength()/100);
    });
    test.it('offers every working v3 mode to players and observers and consumes modal map clicks',()=>{
        const {game,display,a}=fixture();game.uiWindow='menu';let r=display.getCommandActionRegions().find(row=>row.action.window==='mapDisplay').rect;
        test.assertTrue(game.handleUIClick(r.x+5,r.y+5));test.assertEqual(game.uiWindow,'mapDisplay');
        const turn=game.turn;game.setSelectedObject(a);
        for(const mode of Modes.modes){r=display.getMapDisplayActionRegions().find(row=>row.action.mode===mode.key).rect;test.assertTrue(game.handleUIClick(r.x+5,r.y+5));test.assertEqual(game.mapDisplayMode,mode.key);test.assertEqual(display.getMapDisplayActionRegions().filter(row=>row.active).length,1);}
        test.assertEqual(game.turn,turn);test.assertEqual(game.selectedObject,a);test.assertEqual(display.getUIActionAt(20,20).type,'consume');
        test.assertFalse(game.executeUIAction({type:'setMapDisplayMode',mode:'danger'}));test.assertEqual(game.mapDisplayMode,'research');
        game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);
        game.getCurrentHumanPlayer=()=>null;game.uiWindow='menu';test.assertTrue(display.getCommandActionRegions().some(row=>row.action.window==='mapDisplay'));
    });
    test.it('consumes clicks on the legend and removes its hit region when returning to ownership',()=>{
        const {game,display}=fixture();display.port.drawRect=()=>{};display.drawPanelSurface=()=>{};display.drawTextLine=()=>{};
        display.mapDisplayState=Modes.sample(game,'tech');display.drawMapDisplayLegend();
        const r=display.mapDisplayLegendRect;test.assertEqual(display.getUIActionAt(r.x+5,r.y+5).type,'consume');
        display.mapDisplayState=Modes.sample(game,'ownership');display.drawMapDisplayLegend();test.assertNull(display.mapDisplayLegendRect);
    });
    test.it('keeps ownership mode as the default and refuses non-finite values',()=>{
        const {game,a,b,display}=fixture();test.assertEqual(game.mapDisplayMode,'ownership');test.assertEqual(display.getMapDisplayBrightness(a,true),1);
        a.techLevel=NaN;b.techLevel=Infinity;const state=Modes.sample(game,'tech');test.assertNull(state.low);test.assertEqual(state.values.size,0);
    });
});
