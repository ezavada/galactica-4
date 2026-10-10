const test=require('./test-framework.js');
const {createController}=require('../src/js/fullscreen.js');
module.exports=function(){
    test.describe('Fullscreen window control',()=>{
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
