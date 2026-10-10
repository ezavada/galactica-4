const test=require('./test-framework.js'),Language=require('../src/js/language-settings.js');
const Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
function fixture(){const game=new Game(new Factory(),new Rules(false),new Config({numHumans:1,numComputers:1,skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};return {game,display:new Display(game)};}
function restoreLanguage(fn){const previous=pdg.res.getLanguage();try{fn();}finally{pdg.res.setLanguage(previous);}}
module.exports=()=>test.describe('Language settings',()=>{
    test.it('always presents native names in their native scripts',()=>restoreLanguage(()=>{
        const {game,display}=fixture();game.uiWindow='settings';
        const names=['English','Deutsch','Español','Français','日本語','Русский'];
        for(const language of Language.languages){pdg.res.setLanguage(language.code);test.assertEqual(display.getSettingsActionRegions().map(row=>row.label).join('|'),names.join('|'));}
    }));
    test.it('switches cached UI labels and numeric formatting live without changing game state',()=>restoreLanguage(()=>{
        const {game,display}=fixture();game.uiWindow='settings';const turn=game.turn,selection=game.selectedObject;
        pdg.srand(888);const expected=pdg.rand();pdg.srand(888);
        for(const [code,turnLabel,decimal] of [['en','Turn','.'],['de','Runde',','],['es','Turno',','],['fr','Tour',','],['ja','ターン','.'],['ru','Ход',',']]){
            test.assertTrue(game.executeUIAction({type:'setLanguage',language:code}));test.assertEqual(display.STR.turn,turnLabel);test.assertEqual(require('../src/js/i18n.js').formatDecimal(1.5),'1'+decimal+'5');
            test.assertEqual(game.uiWindow,'settings');test.assertEqual(game.turn,turn);test.assertTrue(game.selectedObject===selection);
            const active=display.getSettingsActionRegions().filter(row=>row.active);test.assertEqual(active.length,1);test.assertEqual(active[0].action.language,code);
        }test.assertEqual(pdg.rand(),expected);
    }));
    test.it('rejects unsupported codes and actions outside settings',()=>restoreLanguage(()=>{
        const {game}=fixture();const previous=pdg.res.getLanguage();game.uiWindow='settings';
        for(const language of ['xx','en-US',null,''])test.assertFalse(game.executeUIAction({type:'setLanguage',language}));
        game.uiWindow=null;test.assertFalse(game.executeUIAction({type:'setLanguage',language:'ja'}));test.assertEqual(pdg.res.getLanguage(),previous);
    }));
    test.it('offers settings even in an AI-only observer game',()=>{
        const {game,display}=fixture();game.config.numHumans=0;game.uiWindow='menu';
        const rows=display.getCommandActionRegions();test.assertEqual(rows.length,2);test.assertEqual(rows.find(row=>row.action.window==='settings').action.window,'settings');
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
