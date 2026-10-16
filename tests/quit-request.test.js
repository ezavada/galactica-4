const test=require('./test-framework.js'),Request=require('../src/js/quit-request.js');
function engine(){const registrations=[];return {registrations,eventType_QuitRequest:29,IEventHandler:function(callback){this.callback=callback;},evt:{addHandler:(handler,type)=>registrations.push({handler,type})}};}
module.exports=()=>test.describe('Native application quit request routing',()=>{
 test.it('keeps older runtimes usable without registering an unsupported event',()=>{
  const pdg=engine();delete pdg.eventType_QuitRequest;test.assertNull(Request.install(pdg,()=>{throw Error('Must not request exit');}));test.assertEqual(pdg.registrations.length,0);
 });
 test.it('registers the exact native event and consumes repeated, busy or canceled requests',()=>{
  const pdg=engine();let calls=0;const handler=Request.install(pdg,()=>{calls++;return false;});test.assertEqual(pdg.registrations.length,1);test.assertTrue(pdg.registrations[0].handler===handler);test.assertEqual(pdg.registrations[0].type,29);
  for(let i=0;i<3;i++)test.assertTrue(handler.callback({eventType:29}));test.assertEqual(calls,3);test.assertFalse(handler.callback({eventType:2}));test.assertFalse(handler.callback(null));test.assertEqual(calls,3);
 });
 test.it('preserves native deferral after a decision error and reports it without accepting shutdown',()=>{
  const pdg=engine(),error=Error('Save decision failed');let reported=null;const handler=Request.install(pdg,()=>{throw error;},value=>reported=value);
  test.assertTrue(handler.callback({eventType:29}));test.assertTrue(reported===error);
  const failure=Request.install(pdg,()=>{throw error;},()=>{throw Error('Feedback failed');});test.assertTrue(failure.callback({eventType:29}));
 });
});
