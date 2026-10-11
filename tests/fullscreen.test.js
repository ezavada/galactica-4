const test=require('./test-framework.js');
const {createController}=require('../src/js/fullscreen.js');
module.exports=function(){
    test.describe('Fullscreen window control',()=>{
        test.it('exposes fullscreen in Settings and consumes failures without leaving the modal',()=>{
            const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js');
            const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size)=>Array.from(text).length*size*.6};new Display(game);
            let active=false,fail=true,writes=[];game.fullscreen=createController({gfx:{inFullScreenMode:()=>active,switchToFullScreenMode:()=>{if(!fail)active=true;return true;},switchToWindowMode:()=>{active=false;return true;}}},game.port,{}, {writeFullscreen:value=>writes.push(value)});game.uiWindow='settings';
            const find=()=>{for(let i=0;i<10;i++){const row=game.display.getSettingsActionRegions().find(r=>r.action.type==='toggleFullscreen');if(row)return row;game.executeUIAction({type:'settingsPage',delta:1});}};
            let row=find();test.assertDefined(row);test.assertFalse(row.active);test.assertTrue(game.handleUIClick(row.rect.x+10,row.rect.y+10));test.assertTrue(game.fullscreen.error);test.assertEqual(writes.length,0);test.assertEqual(game.uiWindow,'settings');test.assertEqual(game.turn,1);test.assertTrue(game.display.getSettingsFullscreenFailureLines().length>0);
            fail=false;row=find();test.assertTrue(game.handleUIClick(row.rect.x+10,row.rect.y+10));test.assertTrue(find().active);test.assertEqual(writes.join(','),'true');test.assertEqual(game.display.getSettingsFullscreenFailureLines().length,0);
            active=false;test.assertFalse(find().active);game.fullscreen.supported=false;game.settingsPage=0;const seen=[];for(let i=0;i<10;i++){seen.push(...game.display.getSettingsActionRegions());game.executeUIAction({type:'settingsPage',delta:1});}test.assertFalse(seen.some(r=>r.action.type==='toggleFullscreen'));
        });
        test.it('shares the fullscreen controller with startup Settings without creating a document',()=>{
            const values={},env={window:{localStorage:{getItem:key=>values[key],setItem:(key,value)=>values[key]=value}}},drawingPreferences=require('../src/js/drawing-preferences.js').createPreferences(env);
            let active=false;const port={getDrawingArea:()=>new pdg.Rect(800,600)},fullscreen={supported:true,active:()=>active,toggle:()=>{active=!active;drawingPreferences.writeFullscreen(active);return true;}};
            const settings=new (require('../src/js/startup-settings.js'))(port,{fullscreen,drawingPreferences,sound:{play:()=>{},isEnabled:()=>true}});settings.open();let row;
            for(let i=0;i<10;i++){row=settings.model.display.getSettingsActionRegions().find(r=>r.action.type==='toggleFullscreen');if(row)break;settings.model.executeUIAction({type:'settingsPage',delta:1});}
            test.assertDefined(row);settings.mouse({eventType:pdg.eventType_MouseDown,buttonNumber:0,mousePos:{x:row.rect.x+10,y:row.rect.y+10}});test.assertTrue(active);test.assertTrue(settings.active);test.assertTrue(drawingPreferences.readFullscreen());test.assertEqual(settings.model.stars.length,0);settings.key(pdg.key_Escape);test.assertFalse(settings.active);
        });
        test.it('fits localized fullscreen failure messages and paged controls in compact Settings',()=>{
            const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Help=require('../src/js/hover-help.js');
            const old=pdg.res.getLanguage();try{for(const code of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(code);for(const [width,height] of [[800,600],[320,340]]){
                const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true}));game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size)=>Array.from(text).length*size*.6};new Display(game);game.uiWindow='settings';game.fullscreen={supported:true,error:true,active:()=>false,toggle:()=>false};
                const rect=game.display.getSettingsWindowRect(),lines=game.display.getSettingsFullscreenFailureLines();test.assertTrue(lines.length>0);for(const line of lines)test.assertTrue(game.port.getTextWidth(line,11)<=rect.width-28);
                const failureTop=rect.y+rect.height-90-(lines.length-1)*15;let found=false;
                for(let i=0;i<20;i++){const rows=game.display.getSettingsActionRegions();for(const row of rows){test.assertTrue(row.rect.y>=rect.y && row.rect.y+row.rect.height<=rect.y+rect.height);if(!['settingsPage','closeWindow'].includes(row.action.type))test.assertTrue(row.rect.y+row.rect.height<failureTop);if(row.action.type==='toggleFullscreen'){found=true;test.assertTrue(!!Help.describe(row.action));}}if(!rows.some(r=>r.action.type==='settingsPage' && r.action.delta===1))break;game.executeUIAction({type:'settingsPage',delta:1});}
                test.assertTrue(found);
            }}}finally{pdg.res.setLanguage(old);}
        });

        test.it('uses the existing screen mode and restores the same native port',()=>{
            let active=false,calls=[];const port={};
            const gfx={inFullScreenMode:()=>active,switchToFullScreenMode:(change,p)=>{calls.push([change,p]);active=true;return true;},switchToWindowMode:p=>{calls.push(p);active=false;return true;}};
            const c=createController({gfx},port,{});
            test.assertTrue(c.supported);test.assertFalse(c.active());test.assertTrue(c.toggle());test.assertTrue(c.active());
            test.assertEqual(calls[0][0],false);test.assertEqual(calls[0][1],port);
            test.assertTrue(c.toggle());test.assertFalse(c.active());test.assertEqual(calls[1],port);
        });
        test.it('restores native fullscreen preferences and persists only successful transitions',()=>{
            let active=false,enabled=true,fail=false;const writes=[];
            const prefs={readFullscreen:()=>enabled,writeFullscreen:value=>writes.push(value)};
            const gfx={inFullScreenMode:()=>active,switchToFullScreenMode:()=>{if(fail)return false;active=true;return true;},switchToWindowMode:()=>{active=false;return true;}};
            const c=createController({gfx},{},{},prefs);test.assertTrue(c.restore());test.assertTrue(active);test.assertEqual(writes.join(','),'true');
            test.assertTrue(c.restore());test.assertEqual(writes.length,1);c.toggle();test.assertEqual(writes.join(','),'true,false');
            enabled=false;test.assertFalse(c.restore());test.assertFalse(active);enabled=true;fail=true;test.assertFalse(c.restore());test.assertEqual(writes.length,2);
        });
        test.it('does not overwrite fullscreen preferences when a native backend reports success without changing state',()=>{
            const writes=[],gfx={inFullScreenMode:()=>false,switchToFullScreenMode:()=>true,switchToWindowMode:()=>true};
            const c=createController({gfx},{},{},{readFullscreen:()=>true,writeFullscreen:value=>writes.push(value)});
            test.assertFalse(c.restore());test.assertTrue(c.error);test.assertFalse(c.active());test.assertEqual(writes.length,0);
        });
        test.it('defers browser restoration to a gesture and remembers browser Escape exits',()=>{
            const listeners={},writes=[];let calls=0;
            const target={requestFullscreen:()=>{calls++;return new Promise(()=>{});}};
            const document={documentElement:target,fullscreenEnabled:true,fullscreenElement:null,getElementById:()=>target,exitFullscreen:()=>{},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];}};
            const c=createController({gfx:{}},{},{document},{readFullscreen:()=>true,writeFullscreen:value=>writes.push(value)});
            test.assertTrue(c.restore());test.assertTrue(c.restorePending);test.assertEqual(calls,0);listeners.click();test.assertEqual(calls,1);test.assertFalse(c.restorePending);test.assertUndefined(listeners.click);test.assertUndefined(listeners.keydown);
            document.fullscreenElement=target;listeners.fullscreenchange();document.fullscreenElement=null;listeners.fullscreenchange();test.assertEqual(writes.join(','),'true,false');
        });
        test.it('keeps windowed browser startup and cancels queued restoration on an explicit toggle',()=>{
            const listeners={};let saved=false,calls=0;const target={requestFullscreen:()=>{calls++;return new Promise(()=>{});}};
            const document={documentElement:target,fullscreenEnabled:true,fullscreenElement:null,getElementById:()=>target,exitFullscreen:()=>{},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]};
            const c=createController({gfx:{}},{},{document},{readFullscreen:()=>saved,writeFullscreen:()=>{}});test.assertFalse(c.restore());test.assertEqual(calls,0);saved=true;c.restore();c.toggle();test.assertEqual(calls,1);test.assertUndefined(listeners.click);test.assertUndefined(listeners.keydown);
        });
        test.it('persists fullscreen independently through browser and native preference adapters',()=>{
            const Preferences=require('../src/js/drawing-preferences.js'),values={};
            for(const env of [{window:{localStorage:{getItem:key=>values[key],setItem:(key,value)=>values[key]=value}}},{pdg:{cfg:{useConfig:()=>{},getConfigString:key=>values[key],setConfigString:(key,value)=>values[key]=value}}}]){
                const p=Preferences.createPreferences(env);test.assertTrue(p.readFullscreen());p.writeFullscreen(false);test.assertFalse(Preferences.createPreferences(env).readFullscreen());p.writeFullscreen(true);test.assertTrue(Preferences.createPreferences(env).readFullscreen());
            }
        });
        test.it('reports native failure without claiming fullscreen and can retry',()=>{
            let pass=false,active=false;const c=createController({gfx:{inFullScreenMode:()=>active,switchToWindowMode:()=>{active=false;return true;},switchToFullScreenMode:()=>{if(pass)active=true;return pass;}}}, {}, {});
            test.assertFalse(c.toggle());test.assertTrue(c.error);test.assertFalse(c.active());pass=true;
            test.assertTrue(c.toggle());test.assertFalse(c.error);
        });
        test.it('does not expose unavailable browser fullscreen or use native emulation',()=>{
            let calls=0;const c=createController({gfx:{switchToFullScreenMode:()=>++calls}}, {}, {document:{getElementById:()=>({})}});
            test.assertFalse(c.supported);test.assertFalse(c.toggle());test.assertEqual(calls,0);
        });
        test.it('uses actual browser state and catches a synchronous request rejection',()=>{
            const canvas={requestFullscreen:()=>{throw Error('Denied');}},document={documentElement:canvas,fullscreenEnabled:true,fullscreenElement:null,getElementById:()=>canvas,exitFullscreen:()=>{}};
            const c=createController({gfx:{}},{},{document});test.assertFalse(c.active());test.assertFalse(c.toggle());test.assertTrue(c.error);test.assertFalse(c.pending);
            document.fullscreenElement=canvas;test.assertTrue(c.active());document.fullscreenElement=null;test.assertFalse(c.active());
        });
        test.it('keeps a pending browser transition from requesting fullscreen twice',()=>{
            let calls=0;const canvas={requestFullscreen:()=>{calls++;return new Promise(()=>{});}};
            const c=createController({gfx:{}},{},{document:{documentElement:canvas,fullscreenEnabled:true,fullscreenElement:null,getElementById:()=>canvas,exitFullscreen:()=>{}}});
            test.assertTrue(c.toggle());test.assertTrue(c.pending);test.assertFalse(c.toggle());test.assertEqual(calls,1);
        });
    });
};
