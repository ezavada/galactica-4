// Test-only localhost bridge to actual desktop document I/O in a temporary tree.
const pdg=require('pdg');globalThis.pdg=pdg;if(pdg.snd)pdg.snd.setMute(true);
const fs=require('fs'),path=require('path'),http=require('http');pdg.res.openResourceFile(path.join(__dirname,'../data'));pdg.res.setLanguage(process.env.GALACTICA_TEST_LANGUAGE || 'en');pdg.srand(424242);
const directory=path.dirname(process.env.GALACTICA_TEST_DOCUMENT_INFO),Files=require('../src/js/document-files.js').createFiles({}),Save=require('../src/js/game-save.js');
const name=Array.from({length:8},(_,i)=>'Folder '+i+' '+('path'.repeat(14))).join('/')+'/Final  星.gad4.json';
const resolve=value=>{const p=path.resolve(directory,value);if(!p.startsWith(directory+path.sep))throw Error('Fixture path must remain in its temporary tree');return p;};
fs.mkdirSync(path.dirname(resolve(name)),{recursive:true});
const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js');
const game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,gameTitle:'Document status '+(process.env.GALACTICA_TEST_LANGUAGE || 'en')+' 星'}));const home=game.factory.createStar(100000,100000,'Home');home.owner=1;home.population=10000;game.players[1].homeStarId=home.id;
fs.writeFileSync(resolve(name),Save.serialize(game));fs.writeFileSync(resolve('corrupt.json'),'not a game');fs.writeFileSync(resolve('not-a-directory'),'blocked');
let held=null,nextHold=null,nextFailure=null;
async function gate(operation){if(nextHold!==operation)return;nextHold=null;await new Promise(release=>held={operation,release});}
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const server=http.createServer((req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
 if(req.url==='/paths'){res.writeHead(200,headers);res.end(JSON.stringify({name}));return;}
 let body='';req.setEncoding('utf8');req.on('data',chunk=>body+=chunk);req.on('end',async()=>{try{
  const input=JSON.parse(body || '{}');let value;
  if(req.url==='/hold'){if(held || nextHold)throw Error('Already holding an operation');nextHold=input.operation;value=true;}
  else if(req.url==='/release'){if(!held)throw Error('No held operation');const pending=held;held=null;pending.release();value=true;}
  else if(req.url==='/fail'){nextFailure=input.operation;value=true;}
  else if(req.url==='/state'){const restored=Save.restore(await Files.read({name:resolve(name)}));value={population:restored.stars.find(s=>s.owner===1).population,held:held && held.operation};}
  else if(['/save','/open','/read'].includes(req.url)){
   const operation=req.url.slice(1);await gate(operation);const fail=nextFailure===operation;if(fail)nextFailure=null;
   if(operation==='save'){const result=await Files.save(input.text,fail?resolve('not-a-directory/fail.json'):resolve(input.name));value={...result,name:input.name};}
   else if(operation==='read')value=await Files.read({name:fail?resolve('missing.json'):resolve(input.name)});
   else {const result=await Files.chooseOpen(resolve(fail?'corrupt.json':name));value={...result,name:fail?'corrupt.json':name};}
  }else throw Error('Unknown fixture route');
  res.writeHead(200,headers);res.end(JSON.stringify(value));
 }catch(error){res.writeHead(400,headers);res.end(JSON.stringify({code:error.code || 'fixture_error',message:error.message}));}});
});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(process.env.GALACTICA_TEST_DOCUMENT_INFO,JSON.stringify({url:'http://127.0.0.1:'+server.address().port})));
process.on('SIGTERM',()=>{if(held)held.release();server.close();process.exit(0);});
