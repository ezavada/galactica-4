const test=require('./test-framework.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js');
function fixture(count=2) {
    const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:1,skipMapGeneration:true}));
    game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size=11)=>Array.from(String(text)).length*size/2};
    const display=new Display(game);game.display=display;
    const star=game.factory.createStar(200000,200000,'Home');star.owner=1;star.techLevel=8;
    const source=game.factory.createFleet(star.x,star.y,1,'Source');
    const ship=game.factory.createShip(star.x,star.y,'battleship',star,true);ship.name='Traveler';source.addShip(ship);
    source.addShip(game.factory.createShip(star.x,star.y,'scout',star,true));
    const targets=[];for(let i=0;i<count;i++){
        const target=game.factory.createFleet(star.x,star.y,1,'Destination '+i);
        target.addShip(game.factory.createShip(star.x,star.y,'scout',star,true));targets.push(target);
    }
    game.setSelectedObject(source);display.camera.centerOn(star.x,star.y);display.updateMapRenderingCalculations();
    return {game,display,source,ship,targets,star};
}
function click(game,rect){return game.handleUIClick(rect.x+rect.width/2,rect.y+rect.height/2);}
module.exports=()=>test.describe('Explicit fleet transfer destinations',()=>{
    test.it('opens a destination chooser from the actual Transfer button and moves to the chosen second fleet',()=>{
        const {game,display,source,ship,targets}=fixture();
        const button=display.getFleetMemberActionRegions(source).find(r=>r.action.type==='beginFleetTransfer'&&r.action.ship===ship);
        test.assertTrue(click(game,button.rect));test.assertEqual(game.uiWindow,'mapPick');test.assertTrue(ship.fleet===source);
        const row=display.getMapSelectionActions().find(r=>r.action.object===targets[1]);test.assertTrue(click(game,row.rect));
        test.assertTrue(ship.fleet===targets[1]);test.assertEqual(targets[0].getSize(),1);
        test.assertTrue(game.selectedObject===source);test.assertEqual(game.mapSelectionPicker,null);
    });
    test.it('preserves source membership and events on cancel and blocks unrelated modal input',()=>{
        const {game,ship,source}=fixture(),events=game.eventLog.length,turn=game.turn;
        test.assertTrue(game.beginFleetTransfer(ship));game.handleKeyPress(13);game.handleKeyPress(pdg.key_Tab);
        test.assertFalse(game.requestEndTurn());test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'mapPick');
        game.handleKeyPress(pdg.key_Escape);test.assertTrue(ship.fleet===source);test.assertEqual(game.eventLog.length,events);
        test.assertEqual(game.uiWindow,null);test.assertEqual(game.mapSelectionPicker,null);
    });
    test.it('keeps direct single-destination transfer behavior',()=>{
        const {game,ship,targets}=fixture(1);test.assertTrue(game.beginFleetTransfer(ship));
        test.assertTrue(ship.fleet===targets[0]);test.assertEqual(game.mapSelectionPicker,null);
    });
    test.it('reaches every destination through paged numbered choices even when map mobiles are hidden',()=>{
        const {game,display,ship,targets}=fixture(9);game.showShips=false;test.assertTrue(game.beginFleetTransfer(ship));
        test.assertEqual(game.getMapSelectionRows().length,9);
        const next=display.getMapSelectionActions().find(r=>r.action.type==='mapSelectionPage');test.assertTrue(click(game,next.rect));
        game.handleKeyPress(51);test.assertTrue(ship.fleet===targets[8]);
    });
    test.it('rejects moved removed foreign or empty destinations before changing membership or recording events',()=>{
        const {game,ship,source,targets}=fixture(4),events=game.eventLog.length;
        test.assertTrue(game.beginFleetTransfer(ship));targets[0].x+=5;game.entityRemoved(targets[1]);
        targets[2].owner=2;targets[3].removeShip(targets[3].ships[0]);
        for(const target of targets){test.assertFalse(game.chooseMapSelection(target));test.assertFalse(game.transferShipToFleet(ship,target));}
        test.assertEqual(game.getMapSelectionRows().length,0);test.assertTrue(ship.fleet===source);test.assertEqual(game.eventLog.length,events);
    });
    test.it('revalidates source ownership membership and selection and rejects construction or dead units',()=>{
        const {game,ship,source,targets,star}=fixture();test.assertTrue(game.beginFleetTransfer(ship));
        game.setSelectedObject(star);test.assertFalse(game.chooseMapSelection(targets[0]));game.cancelMapSelection();game.setSelectedObject(source);
        ship.owner=2;test.assertFalse(game.beginFleetTransfer(ship));ship.owner=1;
        source.ships.splice(source.ships.indexOf(ship),1);test.assertFalse(game.transferShipToFleet(ship,targets[0]));source.ships.push(ship);
        ship.damage=ship.power*100+1;test.assertFalse(game.transferShipToFleet(ship,targets[0]));ship.damage=0;
        ship.progress=50;test.assertFalse(game.transferShipToFleet(ship,targets[0]));ship.progress=100;
        game.entityRemoved(source);test.assertFalse(game.transferShipToFleet(ship,targets[0]));
    });
    test.it('allows a completed standalone ship to join a colocated fleet but prevents remote transfer',()=>{
        const {game,ship,source,targets}=fixture();source.removeShip(ship);
        targets[0].x+=10000;test.assertFalse(game.transferShipToFleet(ship,targets[0]));test.assertEqual(ship.fleet,null);
        test.assertTrue(game.transferShipToFleet(ship,targets[1]));test.assertTrue(ship.fleet===targets[1]);
    });
    test.it('localizes transfer heading and fits all chooser rows in supported languages',()=>{
        const {game,display,ship}=fixture(9),language=pdg.res.getLanguage();game.beginFleetTransfer(ship);
        try{for(const lang of ['en','de','es','fr','ja','ru']){
            pdg.res.setLanguage(lang);test.assertTrue(pdg.res.getString(795).length>0);
            let heading;display.drawWindowPanel=(r,title)=>heading=title;display.drawUIButton=()=>{};display.drawTextLine=()=>{};
            display.drawMapSelectionWindow();test.assertEqual(heading,pdg.res.getString(795));
            const rect=display.getMapSelectionRect();for(const row of display.getMapSelectionActions())test.assertTrue(row.rect.y+row.rect.height<rect.y+rect.height);
        }}finally{pdg.res.setLanguage(language);}
    });
});
