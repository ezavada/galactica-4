const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Names=require('../src/js/chart-names.js'),Display=require('../src/js/display.js');
function fixture(){const game=new Game(new Factory(),new Rules(),new Config({numHumans:1,numComputers:2,skipMapGeneration:true}));
    const own=game.factory.createStar(0,0,'Vega'),enemy=game.factory.createStar(2000,0,'Sirius'),other=game.factory.createStar(4000,0,'Rigel'),ordinary=game.factory.createStar(6000,0,'Altair');
    own.owner=1;enemy.owner=2;other.owner=3;for(const star of [own,enemy,other,ordinary])star.namedStar=true;
    for(const [i,s] of [[1,own],[2,enemy],[3,other]])game.players[i].homeStarId=s.id;
    game.players[2].name='Sirius Alliance';return {game,own,enemy,other,ordinary};}
module.exports=()=>test.describe('Public star-chart names and disguised homeworlds',()=>{
    test.it('hides chart labels without hiding stars or changing fog aliases and diagnostic names',()=>{
        const {game,enemy}=fixture();game.port={getDrawingArea:()=>new pdg.Rect(800,600),drawPolygon:()=>polygons++,drawCircle:()=>{},drawText:text=>labels.push(text),getTextWidth:text=>text.length*6};
        let polygons=0,labels=[];const d=new Display(game);d.scaledStarRadius=3;d.mapEntityNameOpacity=1;
        const alias=game.getStarDisplayName(enemy);d.drawStar(enemy);test.assertEqual(labels[0],alias);
        game.showMapNames=false;labels=[];d.drawStar(enemy);test.assertEqual(labels.length,0);test.assertEqual(polygons,2);
        test.assertEqual(game.getStarDisplayName(enemy),alias);test.assertEqual(enemy.name,'Sirius');test.assertEqual(game.players[2].name,'Sirius Alliance');
        game.showMapNames=true;d.drawStar(enemy);test.assertEqual(labels[0],alias);
    });
    test.it('gates mobile map labels by docked selection, zoom, Class visibility and the global name switch',()=>{
        const {game}=fixture();let labels=[];game.port={getDrawingArea:()=>new pdg.Rect(800,600),drawText:text=>labels.push(text),getTextWidth:text=>text.length*6};
        const d=new Display(game);d.mapEntityNameOpacity=1;const object={owner:2,name:'Enemy',getVisibilityTo:()=>1};
        game.getObjectDisplayName=obj=>obj.name;
        d.drawMobileMapName(object,100,100,5,false);test.assertEqual(labels.length,0);
        object.getVisibilityTo=()=>3;d.drawMobileMapName(object,100,100,5,false);test.assertEqual(labels[0],'Enemy');
        labels=[];d.drawMobileMapName(object,100,100,5,true);test.assertEqual(labels.length,0);
        d.selectedObject=object;d.drawMobileMapName(object,100,100,5,true);test.assertEqual(labels[0],'Enemy');
        labels=[];game.showMapNames=false;d.drawMobileMapName(object,100,100,5,false);test.assertEqual(labels.length,0);
        game.showMapNames=true;d.camera.zoom=.4;d.drawMobileMapName(object,100,100,5,false);test.assertEqual(labels.length,0);
    });
    test.it('shows real names of yellow ordinary stars through fog while retaining private diagnostic fields',()=>{
        const {game,ordinary}=fixture();test.assertEqual(game.getStarDisplayName(ordinary),'Altair');test.assertEqual(game.getObjectDisplayName(ordinary),'Altair');
        const d=Object.create(Display.prototype);d.game=game;test.assertEqual(d.getStarDisplayName(ordinary),'Altair');test.assertFalse(d.isStarOwnerKnown(ordinary));
    });
    test.it('uses stable plausible aliases distinct from real labels and other homeworld aliases without consuming randomness',()=>{
        const {game,enemy,other}=fixture();pdg.srand(42);const expected=pdg.rand();pdg.srand(42);
        const a=game.getStarDisplayName(enemy),b=game.getStarDisplayName(other);test.assertFalse(game.stars.some(s=>s.name===a||s.name===b));test.assertTrue(a!==b);
        for(let i=0;i<50;i++){test.assertEqual(game.getStarDisplayName(enemy),a);test.assertEqual(game.getObjectDisplayName(enemy),a);}
        test.assertEqual(pdg.rand(),expected);test.assertEqual(enemy.name,'Sirius');
    });
    test.it('reveals at first detection rather than requiring Class visibility and remembers observed names after scanners move away',()=>{
        const {game,enemy}=fixture();test.assertTrue(game.getStarDisplayName(enemy)!==enemy.name);
        enemy.setVisibilityTo(1,1);test.assertEqual(game.getStarDisplayName(enemy),enemy.name);enemy.setLastSeen(1,2);enemy.setVisibilityTo(1,0);
        test.assertEqual(game.getStarDisplayName(enemy),enemy.name);
    });
    test.it('uses real names for own systems, allies, no-fog games and observers',()=>{
        const {game,own,enemy}=fixture();test.assertEqual(game.getStarDisplayName(own),'Vega');
        const original=enemy.isAllyOf;enemy.isAllyOf=()=>true;test.assertEqual(game.getStarDisplayName(enemy),'Sirius');enemy.isAllyOf=original;
        game.config.omniscient=true;test.assertEqual(game.getStarDisplayName(enemy),'Sirius');game.config.omniscient=false;
        test.assertEqual(Names.displayName(game,enemy,null),'Sirius');
    });
    test.it('keeps true home-derived faction names in comparison while hiding their matching map labels',()=>{
        const {game,enemy}=fixture(),alias=game.getStarDisplayName(enemy);
        test.assertTrue(alias!==enemy.name);test.assertEqual(game.getPlayerComparisonRows().find(r=>r.playerNum===2).name,'Sirius Alliance');
        test.assertEqual(game.players[2].name,'Sirius Alliance');test.assertEqual(enemy.name,'Sirius');
        enemy.setVisibilityTo(1,1);test.assertEqual(game.getStarDisplayName(enemy),'Sirius');
        test.assertEqual(game.getPlayerComparisonRows().find(r=>r.playerNum===2).name,'Sirius Alliance');
    });
    test.it('detects and remembers real names through actual spatial scanner updates',()=>{
        const {game,own,enemy}=fixture();own.setScannerRange(1000);game.visibilityCalculator.updateVisibilityForPlayer(1);test.assertTrue(game.getStarDisplayName(enemy)!==enemy.name);
        game.spatialPartition.updateEntityPosition(enemy,'star',500,0);game.visibilityCalculator.updateVisibilityForPlayer(1);
        test.assertTrue(enemy.getVisibilityTo(1)>0);test.assertEqual(game.getStarDisplayName(enemy),'Sirius');
        game.spatialPartition.updateEntityPosition(enemy,'star',2000,0);game.visibilityCalculator.updateVisibilityForPlayer(1);
        test.assertEqual(enemy.getVisibilityTo(1),0);test.assertEqual(game.getStarDisplayName(enemy),'Sirius');
    });
    test.it('keeps undiscovered aliases stable across language changes',()=>{
        const {game,enemy}=fixture(),alias=game.getStarDisplayName(enemy),i18n=require('../src/js/i18n.js'),original=i18n.getString;
        i18n.getString=(id,...args)=>id===100?'日本|星':original.call(i18n,id,...args);
        try{test.assertEqual(game.getStarDisplayName(enemy),alias);}finally{i18n.getString=original;}
    });
    test.it('does not disclose an unobserved homeworld after its ownership changes',()=>{
        const {game,enemy}=fixture(),alias=game.getStarDisplayName(enemy);enemy.owner=3;test.assertEqual(game.getStarDisplayName(enemy),alias);enemy.owner=0;
        test.assertEqual(game.getStarDisplayName(enemy),alias);enemy.owner=1;test.assertEqual(game.getStarDisplayName(enemy),'Sirius');
    });
    test.it('allocates aliases in homeworld order regardless of which star is inspected first',()=>{
        const a=fixture(),b=fixture();const aOther=a.game.getStarDisplayName(a.other),aEnemy=a.game.getStarDisplayName(a.enemy);
        const bEnemy=b.game.getStarDisplayName(b.enemy),bOther=b.game.getStarDisplayName(b.other);
        test.assertEqual(aEnemy,bEnemy);test.assertEqual(aOther,bOther);
    });
    test.it('keeps discovery history separate for each viewer',()=>{
        const {game,enemy}=fixture(),unseen=Names.displayName(game,enemy,3);enemy.setLastSeen(1,5);
        test.assertEqual(Names.displayName(game,enemy,1),'Sirius');test.assertEqual(Names.displayName(game,enemy,3),unseen);
    });
    test.it('terminates with a stable unique catalog alias when the name pool contains only homeworld names',()=>{
        const {game,enemy,other}=fixture(),i18n=require('../src/js/i18n.js'),original=i18n.getString;
        i18n.getString=(id,...args)=>id===100?'Vega':original.call(i18n,id,...args);
        try{const a=game.getStarDisplayName(enemy),b=game.getStarDisplayName(other);test.assertTrue(a!==b);test.assertTrue(a!==enemy.name);test.assertEqual(game.getStarDisplayName(enemy),a);}finally{i18n.getString=original;}
    });

});
