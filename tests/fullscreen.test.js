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
        test.it('reports native failure without claiming fullscreen and can retry',()=>{
            let pass=false;const c=createController({gfx:{inFullScreenMode:()=>pass,switchToWindowMode:()=>true,switchToFullScreenMode:()=>pass}}, {}, {});
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
