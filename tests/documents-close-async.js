// Promise-based document close/save regressions run on PDG's application loop.
const assert=require('assert'),path=require('path');
require('./test-framework.js');
const Help=require('../src/js/hover-help.js');
const Documents=require('../src/js/documents.js'),Sessions=require('../src/js/game-sessions.js'),Save=require('../src/js/game-save.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
pdg.res.openResourceFile(path.join(__dirname,'../data'));
function fixture(save=async(text,name)=>({name,text})){
 const sessions=new Sessions(),game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:'Game 星'}));sessions.accept(game,{});
 const docs=new Documents({browser:true,cancelPick:()=>{},save},()=>sessions.active,()=>{},()=>{},session=>!!sessions.close(session));return {sessions,game,docs};
}
(async()=>{
 // A new game requires a decision. Cancel preserves its identity and content.
 {const {sessions,game,docs}=fixture(),session=sessions.active,before=Save.serialize(game);assert.strictEqual(docs.beginClose(),true);assert.strictEqual(docs.dialog.kind,'close');docs.key(pdg.key_Escape);assert.strictEqual(sessions.active,session);assert.strictEqual(Save.serialize(game),before);assert.strictEqual(docs.pendingClose,null);docs.beginClose();assert.strictEqual(docs.action('discardClose'),true);assert.strictEqual(sessions.active,null);assert.strictEqual(sessions.sessions.length,0);assert.strictEqual(docs.dialog,null);}
 // Save and close waits for the write; input cannot discard an in-flight save.
 {let finish,text;const {sessions,docs}=fixture((bytes,name)=>{text=bytes;return new Promise(resolve=>finish=()=>resolve({name,text:bytes}));}),session=sessions.active;docs.beginClose();docs.key(13);assert.strictEqual(docs.dialog.kind,'editor');const save=docs.submit();assert.strictEqual(docs.dialog.kind,'busy');assert.strictEqual(docs.cancel(),false);assert.strictEqual(docs.beginClose(),false);assert.strictEqual(sessions.active,session);finish();assert.strictEqual(await save,true);assert.strictEqual(sessions.active,null);assert.strictEqual(Save.restore(text).config.gameTitle,'Game 星');}
 // A failed or canceled picker keeps the game and does not arm a later close.
 {const {sessions,docs}=fixture(async()=>{throw Error('disk full');}),session=sessions.active;docs.beginClose();docs.action('saveClose');assert.strictEqual(await docs.submit(),false);assert.strictEqual(sessions.active,session);assert.strictEqual(docs.dialog.kind,'status');docs.action('ack');assert.strictEqual(docs.pendingClose,null);docs.files.save=async()=>null;docs.beginClose();docs.action('saveClose');assert.strictEqual(await docs.submit(),false);assert.strictEqual(sessions.active,session);assert.strictEqual(docs.pendingClose,null);docs.files.save=async(text,name)=>({name,text});docs.beginSave();await docs.submit();assert.strictEqual(sessions.active,session);assert.strictEqual(docs.dialog.kind,'status');}
 // A successful save establishes a clean baseline. Navigation does not dirty it.
 {const {sessions,game,docs}=fixture();docs.beginSave();await docs.submit();game.savedCamera={zoom:2,panX:20,panY:30};game.showGrid=!game.showGrid;game.uiWindow='events';docs.beginClose();assert.strictEqual(sessions.active,null);assert.strictEqual(docs.dialog,null);}
 // Changed gameplay still requires a decision; Discard leaves the file intact.
 {const {sessions,game,docs}=fixture();docs.beginSave();await docs.submit();const file=sessions.active.file,bytes=file.text;game.turn=3;docs.beginClose();assert.strictEqual(docs.dialog.kind,'close');docs.action('discardClose');assert.strictEqual(file.text,bytes);assert.strictEqual(Save.restore(file.text).turn,1);}
 // Changes made while a write is pending cannot be lost by its completion.
 {let finish;const {sessions,game,docs}=fixture((text,name)=>new Promise(resolve=>finish=()=>resolve({name,text})));docs.beginClose();docs.action('saveClose');const saving=docs.submit();game.turn=2;finish();await saving;assert.ok(sessions.active);assert.strictEqual(docs.dialog.kind,'close');assert.strictEqual(Save.restore(sessions.active.file.text).turn,1);docs.cancel();}
 // A late write from a no-longer-active document cannot close the replacement.
 {let finish;const {sessions,docs}=fixture((text,name)=>new Promise(resolve=>finish=()=>resolve({name,text}))),original=sessions.active;docs.beginClose();docs.action('saveClose');const saving=docs.submit();sessions.begin();const replacement=sessions.accept(new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true})),{});finish();assert.strictEqual(await saving,false);assert.strictEqual(sessions.active,replacement);assert.strictEqual(original.file,undefined);assert.strictEqual(docs.dialog,null);assert.strictEqual(docs.pendingClose,null);}
 // Every language retains all three decisions in narrow and normal viewports.
 {const {docs}=fixture(),old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);docs.beginClose();for(const [w,h] of [[800,600],[480,400]]){const layout=docs.layout(w,h);assert.strictEqual(layout.buttons.length,3);assert.ok(layout.message.includes('Game 星'));for(const b of layout.buttons){assert.ok(b.label.length);assert.ok(Help.describe({type:b.action}));assert.ok(b.rect.x>=layout.rect.x);assert.ok(b.rect.y+b.rect.height<=layout.rect.y+layout.rect.height);assert.ok(b.rect.width>=300);}}docs.cancel();}}finally{pdg.res.setLanguage(old);}}
 console.log('PASS close-game decisions: Cancel, Discard, successful/failed/canceled/deferred Save, clean content and six languages');
})().catch(error=>{console.error(error);process.exitCode=1;});
