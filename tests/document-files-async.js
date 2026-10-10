// Run with ./gad4 tests/document-files-async.js; exercises actual filesystem I/O
// and asynchronous browser handles/downloads with deterministic injected facilities.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),Files=require('../src/js/document-files.js');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'galactica-documents-')),filename=path.join(directory,'Save 星.gad4.json');
 try{
  const files=Files.createFiles({}),text='{"title":"星","turn":7}';const first=await files.save(text,filename);assert.strictEqual(await files.read(first),text);assert.strictEqual((await files.chooseOpen(filename)).text,text);
  const changed='{"turn":8}';await files.save(changed,filename,first);assert.strictEqual(fs.readFileSync(filename,'utf8'),changed);assert.deepStrictEqual(fs.readdirSync(directory),['Save 星.gad4.json']);
  const fake={...fs,renameSync:()=>{throw Error('Rename denied');}};await assert.rejects(Files.createFiles({},fake).save('bad',filename));assert.strictEqual(fs.readFileSync(filename,'utf8'),changed);assert.deepStrictEqual(fs.readdirSync(directory),['Save 星.gad4.json']);
  let writes=[],closes=0,picks=0,currentText='old';const handle={name:'Browser 星.json',getFile:async()=>({size:4,text:async()=>currentText}),createWritable:async()=>({write:async t=>{writes.push(t);currentText=t;},close:async()=>{closes++;}})};
  const env={document:{},showSaveFilePicker:async()=>{picks++;return handle;},showOpenFilePicker:async()=>[handle]};const browser=Files.createFiles(env);
  const saved=await browser.save(text,'Suggested.json',null,true);assert.strictEqual(saved.handle,handle);await browser.save(changed,saved.name,saved);assert.strictEqual(picks,1);assert.strictEqual(closes,2);assert.deepStrictEqual(writes,[text,changed]);assert.strictEqual(await browser.read(saved),changed);assert.strictEqual((await browser.chooseOpen()).text,changed);
  const cancelled=Files.createFiles({document:{},showSaveFilePicker:async()=>{throw {name:'AbortError'};},showOpenFilePicker:async()=>{throw {name:'AbortError'};}});assert.strictEqual(await cancelled.save(text,'Cancelled'),null);assert.strictEqual(await cancelled.chooseOpen(),null);
  let clicked=0,removed=0,revoked=0,link,blob;const downloads=Files.createFiles({document:{body:{appendChild:l=>{link=l;}},createElement:()=>({click:()=>clicked++,remove:()=>removed++})},URL:{createObjectURL:b=>{blob=b;return 'blob:test';},revokeObjectURL:()=>revoked++},Blob:class{constructor(parts){this.parts=parts;}},setTimeout:fn=>fn()});
  const downloaded=await downloads.save(text,'Download.json');assert.strictEqual(downloaded.text,text);assert.strictEqual(link.download,'Download.json');assert.strictEqual(blob.parts[0],text);assert.strictEqual(clicked,1);assert.strictEqual(removed,1);assert.strictEqual(revoked,1);assert.strictEqual(await downloads.read(downloaded),text);
  let input;const uploads=Files.createFiles({document:{body:{appendChild:i=>{input=i;}},createElement:()=>({style:{},click:()=>{},remove:()=>{}})}});const pending=uploads.chooseOpen();input.files=[{name:'Upload.json',size:text.length,text:async()=>text}];await input.onchange();assert.strictEqual((await pending).text,text);
  const pendingCancel=uploads.chooseOpen();uploads.cancelPick();assert.strictEqual(await pendingCancel,null);
  console.log('PASS document files: native atomic writes, browser handles, cancellation, downloads and uploads');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
