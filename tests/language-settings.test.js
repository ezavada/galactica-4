const test=require('./test-framework.js'),Language=require('../src/js/language-settings.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return {game,display:new Display(game)};}
function restoreLanguage(fn){const previous=pdg.res.getLanguage();try{fn();}finally{pdg.res.setLanguage(previous);}}
module.exports=()=>test.describe('Language settings',()=>{
    test.it('toggles the persisted nebula preference without changing selection, turn or camera',()=>{
        const {game,display}=fixture(),star=game.factory.createStar(0,0,'Home');star.owner=1;game.setSelectedObject(star);
        game.uiWindow='settings';display.camera.setPan(12345,67890);display.camera.setZoom(2);
        const before=[game.turn,display.camera.panX,display.camera.panY,display.camera.zoom],values=new Map();
        game.drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        let row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleNebula');test.assertTrue(row.active);
        game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertFalse(game.showNebula);test.assertFalse(game.drawingPreferences.readNebula());
        test.assertEqual(values.get('galactica.showNebula'),'false');test.assertEqual(game.selectedObject,star);
        test.assertEqual([game.turn,display.camera.panX,display.camera.panY,display.camera.zoom].join(','),before.join(','));
        row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleNebula');test.assertFalse(row.active);
        const rect=display.getSettingsWindowRect();test.assertTrue(row.rect.y+row.rect.height<rect.y+rect.height-16);test.assertTrue(rect.y+rect.height<=600);
        game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertTrue(game.showNebula);test.assertTrue(game.drawingPreferences.readNebula());
    });
    test.it('defaults nebula on and stores it independently through browser/native configuration',()=>{
        const Drawing=require('../src/js/drawing-preferences.js'),values=new Map();
        const browser=Drawing.createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        test.assertTrue(browser.readNebula());browser.writeNebula(false);test.assertFalse(browser.readNebula());test.assertTrue(browser.readGrid());
        const reopened=Drawing.createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});test.assertFalse(reopened.readNebula());
        let namespace;const native=Drawing.createPreferences({pdg:{cfg:{useConfig:name=>namespace=name,getConfigString:key=>values.get(key),setConfigString:(key,value)=>values.set(key,value)}}});
        test.assertTrue(native.readNebula());native.writeNebula(false);test.assertEqual(namespace,'Galactica');test.assertFalse(native.readNebula());native.writeNebula(true);test.assertTrue(native.readNebula());
        const denied=Drawing.createPreferences({window:{get localStorage(){throw Error('denied');}}});test.assertTrue(denied.readNebula());denied.writeNebula(false);
    });
    test.it('toggles grid drawing from settings and F3 without changing simulation state',()=>{
        const {game,display}=fixture();game.uiWindow='settings';let saved;
        game.drawingPreferences={writeGrid:value=>saved=value};
        const row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleGrid');
        test.assertTrue(row.active);const turn=game.turn;
        test.assertTrue(game.handleUIClick(row.rect.x+5,row.rect.y+5));test.assertFalse(game.showGrid);test.assertFalse(saved);
        display.camera.centerOn(0,0);let lines=0;display.port.drawLine=()=>lines++;display.drawGrid();test.assertEqual(lines,0);
        test.assertTrue(game.handleKeyPress(pdg.key_F3));test.assertTrue(game.showGrid);test.assertTrue(saved);
        display.drawGrid();test.assertTrue(lines>0);test.assertEqual(game.turn,turn);test.assertEqual(game.uiWindow,'settings');
    });
    test.it('persists grid choices in browser and native preferences with safe defaults',()=>{
        const Drawing=require('../src/js/drawing-preferences.js'),values=new Map();
        const browser=Drawing.createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        test.assertTrue(browser.readGrid());browser.writeGrid(false);test.assertFalse(browser.readGrid());test.assertEqual(values.get('galactica.showGrid'),'false');browser.writeGrid(true);test.assertTrue(browser.readGrid());
        let namespace,saved;const native=Drawing.createPreferences({pdg:{cfg:{useConfig:name=>namespace=name,getConfigString:()=>saved,setConfigString:(key,value)=>{test.assertEqual(key,'showGrid');saved=value;}}}});
        native.writeGrid(false);test.assertFalse(native.readGrid());test.assertEqual(namespace,'Galactica');
        const denied=Drawing.createPreferences({window:{get localStorage(){throw Error('denied');}}});test.assertTrue(denied.readGrid());denied.writeGrid(false);
    });
    test.it('toggles star names through settings and F2 and keeps preferences separate from grid',()=>{
        const {game,display}=fixture();game.uiWindow='settings';
        const Drawing=require('../src/js/drawing-preferences.js'),values=new Map();
        game.drawingPreferences=Drawing.createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        const row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleMapNames');test.assertTrue(row.active);
        game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertFalse(game.showMapNames);test.assertTrue(game.showGrid);
        test.assertFalse(game.drawingPreferences.readMapNames());test.assertTrue(game.drawingPreferences.readGrid());
        test.assertTrue(game.handleKeyPress(pdg.key_F2));test.assertTrue(game.showMapNames);test.assertTrue(game.drawingPreferences.readMapNames());
        let key,value;const native=Drawing.createPreferences({pdg:{cfg:{useConfig:()=>{},getConfigString:()=>value,setConfigString:(k,v)=>{key=k;value=v;}}}});
        native.writeMapNames(false);test.assertEqual(key,'showMapNames');test.assertFalse(native.readMapNames());
    });
    test.it('toggles ships from settings and F1 with independent persisted state',()=>{
        const {game,display}=fixture();game.uiWindow='settings';const values=new Map();
        game.drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        const row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleShips');test.assertTrue(row.active);
        game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertFalse(game.showShips);test.assertFalse(game.drawingPreferences.readShips());
        test.assertTrue(game.showGrid);test.assertTrue(game.showMapNames);test.assertTrue(game.handleKeyPress(pdg.key_F1));test.assertTrue(game.showShips);test.assertTrue(game.drawingPreferences.readShips());
    });
    test.it('keeps selected visible mobile objects on the map while ships are hidden, with fog and patrol restrictions',()=>{
        const {game,display}=fixture(),home=game.factory.createStar(1000,1000,'Home');home.owner=1;
        const ship=game.factory.createShip(200,200,'scout',home);ship.complete();ship.star=null;
        game.showShips=false;test.assertFalse(display.isMobileVisibleOnMap(ship));
        game.setSelectedObject(ship);test.assertTrue(display.isMobileVisibleOnMap(ship));
        ship.owner=2;ship.setVisibilityTo(1,0);test.assertFalse(display.isMobileVisibleOnMap(ship));
        ship.setVisibilityTo(1,1);test.assertTrue(display.isMobileVisibleOnMap(ship));
        game.setSelectedObject(null);game.showShips=true;test.assertTrue(display.isMobileVisibleOnMap(ship));
        ship.owner=1;ship.star=home;ship.setPatrol(true);test.assertFalse(display.isMobileVisibleOnMap(ship));
    });
    test.it('excludes hidden ships and fleets from map hits and rendering without changing object collections',()=>{
        const {game,display}=fixture(),home=game.factory.createStar(1000,1000,'Home');home.owner=1;
        const ship=game.factory.createShip(200,200,'scout',home);ship.complete();ship.star=null;
        const fleet=game.factory.createFleet(400,200,1,'Fleet');const member=game.factory.createShip(400,200,'scout',home);member.complete();fleet.addShip(member);display.toScreenX=x=>x;display.toScreenY=y=>y;
        let ships=0,fleets=0;display.drawShip=()=>ships++;display.drawFleet=()=>fleets++;
        game.showShips=false;test.assertNull(game.findObjectAtPosition(200,200));test.assertNull(game.findObjectAtPosition(400,200));
        display.drawShips(game.allShips);display.drawFleets(game.allFleets);test.assertEqual(ships,0);test.assertEqual(fleets,0);
        game.setSelectedObject(fleet);display.drawFleets(game.allFleets);test.assertEqual(fleets,1);test.assertTrue(game.findObjectAtPosition(400,200)===fleet);
        game.showShips=true;test.assertTrue(game.findObjectAtPosition(200,200)===ship);test.assertEqual(game.allShips.length,2);test.assertEqual(game.allFleets.length,1);
    });
    test.it('toggles ordinary and courier courses through settings and F4/F5 with independent preferences',()=>{
        const {game,display}=fixture();game.uiWindow='settings';const values=new Map();
        game.drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        for(const [type,property,read,key] of [['toggleAllCourses','showAllCourses','readAllCourses',pdg.key_F4],['toggleCourierCourses','showCourierCourses','readCourierCourses',pdg.key_F5]]) {
            const row=display.getSettingsActionRegions().find(row=>row.action.type===type);test.assertTrue(row.active);
            game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertFalse(game[property]);test.assertFalse(game.drawingPreferences[read]());
            game.handleKeyPress(key);test.assertTrue(game[property]);test.assertTrue(game.drawingPreferences[read]());
        }
        test.assertTrue(game.showShips);test.assertTrue(game.showGrid);test.assertTrue(game.showMapNames);
    });
    test.it('offers persistent scanner-range visibility and the F6 shortcut',()=>{
        const {game,display}=fixture();game.uiWindow='settings';const values=new Map();
        game.drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        const row=display.getSettingsActionRegions().find(row=>row.action.type==='toggleScannerRanges');test.assertTrue(row.active);
        game.handleUIClick(row.rect.x+5,row.rect.y+5);test.assertFalse(game.showScannerRanges);test.assertFalse(game.drawingPreferences.readScannerRanges());
        game.handleKeyPress(pdg.key_F6);test.assertTrue(game.showScannerRanges);test.assertTrue(game.drawingPreferences.readScannerRanges());
    });
    test.it('shows selected scanner rings independently of the switch and excludes private enemy ranges',()=>{
        const {game,display}=fixture(),home=game.factory.createStar(0,0,'Home');home.owner=1;home.setScannerRange(32768);
        display.camera.centerOn(0,0);game.setSelectedObject(home);
        let data=display.getScannerPresentation();test.assertEqual(data.groups.length,1);test.assertEqual(data.rings.length,3);test.assertEqual(data.rings.map(r=>r.radius).join(','),'32,64,128');
        display.camera.setZoom(.5);display.camera.centerOn(0,0);test.assertEqual(display.getScannerPresentation().rings.map(r=>r.radius).join(','),'16,32,64');display.camera.setZoom(1);display.camera.centerOn(0,0);
        game.showScannerRanges=false;data=display.getScannerPresentation();test.assertEqual(data.groups.length,0);test.assertEqual(data.rings.length,3);
        home.owner=2;home.setVisibilityTo(1,1);test.assertEqual(display.getScannerPresentation().rings.length,0);
        home.setVisibilityTo(1,2);test.assertEqual(display.getScannerPresentation().rings.length,3);
        const scout=game.factory.createShip(0,0,'scout',home);scout.complete();scout.setScannerRange(32768);scout.star=null;scout.owner=1;
        game.setSelectedObject(null);game.showScannerRanges=true;scout.course.loop=true;
        test.assertFalse(display.getScannerPresentation().rings.some(r=>r.object===scout));
        game.setSelectedObject(scout);test.assertEqual(display.getScannerPresentation().rings.filter(r=>r.object===scout).length,3);
        scout.owner=2;scout.setVisibilityTo(1,0);test.assertFalse(display.getScannerPresentation().rings.some(r=>r.object===scout));
        scout.setVisibilityTo(1,1);test.assertEqual(display.getScannerPresentation().rings.filter(r=>r.object===scout).length,3);
    });
    test.it('unions overlapping influence circles with opaque cached masks and disposes replaced layers',()=>{
        const ScannerLayer=require('../src/js/scanner-layer.js');let closed=0,deleted=0,allocated=0,drawn=0;
        class Attributes {fillColor(c){this.color=c;return this;}fillOpacity(a){this.opacity=a;return this;}lineStyle(){return this;}delete(){deleted++;}}
        class Image {constructor(port){this.circles=port.circles.slice();}delete(){deleted++;}}
        class Rect {} class Point {constructor(x,y){this.x=x;this.y=y;}} class Color {constructor(r,g,b,a){this.red=r;this.green=g;this.blue=b;this.alpha=a;}}
        const backend={Attributes,Image,Rect,Point,Color,CopyPixels:1,lineStyle_None:0,gfx:{createOffscreenPort:()=>{allocated++;return {circles:[],clear(){},drawCircle(p,r,a){test.assertEqual(a.opacity,1);test.assertEqual(a.color.alpha,1);this.circles.push({p,r});}};},closeGraphicsPort:()=>closed++}};
        const layer=new ScannerLayer(backend),group={owner:1,color:new Color(0,0,1,1),circles:[{x:100,y:100,radius:30},{x:120,y:100,radius:30}]};
        layer.draw({drawImage:()=>drawn++},[group],800,600);test.assertEqual(allocated,3);test.assertEqual(closed,3);test.assertEqual(drawn,3);
        for(const mask of layer.layers.values())test.assertEqual(mask.image.circles.length,2);
        layer.draw({drawImage:()=>{}},[group],800,600);test.assertEqual(allocated,3);
        const images=[...layer.layers.values()].map(mask=>mask.image);
        layer.draw({drawImage:()=>{}},[group],800,600,false);test.assertEqual(allocated,3);
        for(const [index,mask] of [...layer.layers.values()].entries()){test.assertEqual(mask.image,images[index]);test.assertEqual(mask.attrs.opacity,[.0625,.09375,.1875][index]);}
        layer.draw({drawImage:()=>{}},[group],800,600,true);test.assertEqual(allocated,3);
        for(const [index,mask] of [...layer.layers.values()].entries())test.assertEqual(mask.attrs.opacity,[.1,.15,.3][index]);
        group.circles[0].x++;layer.draw({drawImage:()=>{}},[group],800,600);test.assertEqual(deleted,12);
        layer.draw({drawImage:()=>{}},[],800,600);test.assertEqual(layer.layers.size,0);test.assertEqual(deleted,18);layer.dispose();
    });
    test.it('always presents native names in their native scripts',()=>restoreLanguage(()=>{
        const {game,display}=fixture();game.uiWindow='settings';
        const names=['English','Deutsch','Español','Français','日本語','Русский'];
        for(const language of Language.languages){pdg.res.setLanguage(language.code);test.assertEqual(display.getSettingsActionRegions().filter(row=>row.action.type==='setLanguage').map(row=>row.label).join('|'),names.join('|'));}
    }));
    test.it('switches cached UI labels and numeric formatting live without changing game state',()=>restoreLanguage(()=>{
        const {game,display}=fixture();game.uiWindow='settings';const turn=game.turn,selection=game.selectedObject;
        pdg.srand(888);const expected=pdg.rand();pdg.srand(888);
        for(const [code,turnLabel,decimal] of [['en','Turn','.'],['de','Runde',','],['es','Turno',','],['fr','Tour',','],['ja','ターン','.'],['ru','Ход',',']]){
            test.assertTrue(game.executeUIAction({type:'setLanguage',language:code}));test.assertEqual(display.STR.turn,turnLabel);test.assertEqual(require('../src/js/i18n.js').formatDecimal(1.5),'1'+decimal+'5');
            test.assertEqual(game.uiWindow,'settings');test.assertEqual(game.turn,turn);test.assertTrue(game.selectedObject===selection);
            const active=display.getSettingsActionRegions().filter(row=>row.action.type==='setLanguage' && row.active);test.assertEqual(active.length,1);test.assertEqual(active[0].action.language,code);
        }test.assertEqual(pdg.rand(),expected);
    }));
    test.it('rejects unsupported codes and actions outside settings',()=>restoreLanguage(()=>{
        const {game}=fixture();const previous=pdg.res.getLanguage();game.uiWindow='settings';
        for(const language of ['xx','en-US',null,''])test.assertFalse(game.executeUIAction({type:'setLanguage',language}));
        game.uiWindow=null;test.assertFalse(game.executeUIAction({type:'setLanguage',language:'ja'}));test.assertEqual(pdg.res.getLanguage(),previous);
    }));
    test.it('offers settings even in an AI-only observer game',()=>{
        const {game,display}=fixture();game.config.numHumans=0;game.uiWindow='menu';
        const rows=display.getCommandActionRegions();test.assertEqual(rows.length,6);test.assertEqual(rows.find(row=>row.action.window==='settings').action.window,'settings');
    });
    test.it('offers player comparison only in the global menu and keeps its shortcut',()=>{
        const {game,display}=fixture();game.uiWindow='menu';
        const row=display.getCommandActionRegions().find(row=>row.action.window==='comparison');
        test.assertEqual(row.key,'V');test.assertEqual(display.getUIActionAt(row.rect.x+10,row.rect.y+10).window,'comparison');
        for(const owner of [0,1,2]){const star=game.factory.createStar(0,0,'Test');star.owner=owner;test.assertFalse(display.getContextActions(star).some(row=>row.action.window==='comparison'));}
        test.assertFalse(display.getMapButtonDefinitions().some(row=>row.window==='comparison'));
        game.executeUIAction(row.action);test.assertEqual(game.uiWindow,'comparison');
    });
    test.it('routes every language row and consumes clicks outside the settings dialog',()=>{
        const {game,display}=fixture();game.uiWindow='settings';
        for(const row of display.getSettingsActionRegions())test.assertEqual(display.getUIActionAt(row.rect.x+10,row.rect.y+10).language,row.action.language);
        test.assertEqual(display.getUIActionAt(1,1).type,'consume');
    });
    test.it('keeps Enter and Tab from advancing turns or changing selection, and Esc closes settings',()=>{
        const {game}=fixture();game.uiWindow='settings';const turn=game.turn;let calls=0;game.requestEndTurn=()=>calls++;game.attention.next=()=>calls++;
        for(const key of [13,3,pdg.key_Tab])test.assertTrue(game.handleKeyPress(key));test.assertEqual(calls,0);test.assertEqual(game.turn,turn);
        test.assertTrue(game.handleKeyPress(pdg.key_Escape));test.assertNull(game.uiWindow);
    });
    test.it('remembers a choice through the game preference adapter',()=>restoreLanguage(()=>{
        const {game}=fixture();game.uiWindow='settings';let saved;game.languagePreferences={write:code=>saved=code};
        game.executeUIAction({type:'setLanguage',language:'ja'});test.assertEqual(saved,'ja');
    }));
    test.it('uses saved language at startup and lets explicit launch arguments override it',()=>{
        let selected;const res={setLanguage:code=>selected=code},preferences={read:()=> 'ja'};
        Language.initialize([],res,preferences);test.assertEqual(selected,'ja');
        Language.initialize(['--lang=fr'],res,preferences);test.assertEqual(selected,'fr');
        Language.initialize(['--lang=xx'],res,preferences);test.assertEqual(selected,'ja');
        Language.initialize([],res,{read:()=> 'xx'});test.assertEqual(selected,'en');
    });
    test.it('persists browser preferences under the application key',()=>{
        const values=new Map(),p=Language.createPreferences({window:{localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}}});
        p.write('ru');test.assertEqual(p.read(),'ru');test.assertEqual(values.get('galactica.language'),'ru');
    });
    test.it('uses the native PDG configuration manager with an application namespace',()=>{
        let namespace,value,key;const p=Language.createPreferences({pdg:{cfg:{useConfig:name=>namespace=name,getConfigString:name=>{key=name;return value;},setConfigString:(name,text)=>{key=name;value=text;}}}});
        p.write('de');test.assertEqual(p.read(),'de');test.assertEqual(namespace,'Galactica');test.assertEqual(key,'language');
    });
    test.it('keeps switching usable if preference storage is blocked or throws',()=>{
        const denied={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}};
        const p=Language.createPreferences({window:{localStorage:denied}});p.write('fr');test.assertNull(p.read());
        const env={window:{get localStorage(){throw Error('denied');}}};const unavailable=Language.createPreferences(env);test.assertNull(unavailable.read());unavailable.write('ja');
    });
});
