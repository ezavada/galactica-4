const test=require('./test-framework.js'),Manual=require('../src/js/user-manual.js');
module.exports=()=>test.describe('Bundled manual opening',()=>{
 test.it('opens each supported page locally in a separate browser tab with no opener',()=>{
  const opened=[],popup={opener:'game'},env={document:{baseURI:'https://example.test/galactica/index.html'},URL,open:(url,target)=>{opened.push([url,target]);return popup;}};
  const service=Manual.createManual('/app',env,{fs:{existsSync:()=>true}});
  for(const language of Manual.languages){test.assertTrue(service.open(language));test.assertEqual(opened[opened.length-1][0],'https://example.test/galactica/data/manual/'+language+'.html');test.assertEqual(opened[opened.length-1][1],'_blank');test.assertNull(popup.opener);test.assertNull(service.error());}
 });
 test.it('reports missing files and blocked browser tabs and permits a later retry',()=>{
  let exists=false,blocked=true;const service=Manual.createManual('/app',{document:{baseURI:'https://example.test/'},URL,open:()=>blocked?null:{}},{fs:{existsSync:()=>exists}});
  test.assertFalse(service.open('en'));test.assertEqual(service.error(),944);exists=true;test.assertFalse(service.open('en'));test.assertEqual(service.error(),945);blocked=false;test.assertTrue(service.open('en'));test.assertNull(service.error());
 });
 test.it('uses native argument arrays for paths with spaces and shell characters on all desktop platforms',()=>{
  for(const [platform,command] of [['darwin','open'],['linux','xdg-open'],['win32','rundll32.exe']]) {
   let call;const service=Manual.createManual('/games/Galactica $x; title',{}, {platform,fs:{existsSync:()=>true},execFile:(...args)=>{call=args;args[2](null);}});
   test.assertTrue(service.open('ja'));test.assertEqual(call[0],command);test.assertEqual(call[1][call[1].length-1],'/games/Galactica $x; title/data/manual/ja.html');test.assertNull(service.error());
  }
 });
 test.it('tracks launch errors without letting a stale failed request replace the latest successful result',()=>{
  const callbacks=[],service=Manual.createManual('/app',{}, {platform:'darwin',fs:{existsSync:()=>true},execFile:(command,args,callback)=>callbacks.push(callback)});
  service.open('en');callbacks[0](Error('No browser'));test.assertEqual(service.error(),945);service.open('de');service.open('fr');callbacks[1](Error('Old request'));test.assertNull(service.error());callbacks[2](null);test.assertNull(service.error());service.clearError();test.assertNull(service.error());
 });
 test.it('routes startup and in-game manual commands without changing settings, ships or turns',()=>{
  const Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Config=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),Setup=require('../src/js/startup-setup.js');
  const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:1}));game.port={getDrawingArea:()=>new pdg.Rect(800,600)};const display=new Display(game);let calls=0;
  game.manualCommands={open:language=>{calls++;test.assertEqual(language,pdg.res.getLanguage());return false;}};game.uiWindow='menu';
  const button=display.getCommandActionRegions().find(r=>r.action.type==='openManual');test.assertNotNull(button);test.assertTrue(game.handleUIClick(button.rect.x+5,button.rect.y+5));test.assertEqual(calls,1);test.assertEqual(game.turn,1);test.assertEqual(game.uiWindow,'menu');
  game.handleKeyPress(72);test.assertEqual(calls,2);game.handleKeyPress(pdg.key_Help);test.assertEqual(calls,3);const before=game.showShips;game.handleKeyPress(pdg.key_F1);test.assertEqual(game.showShips,!before);test.assertEqual(calls,3);
  for(const size of [[800,600],[640,480],[320,340]]){const regions=Setup.helpRegions(...size,game.config),manual=regions.find(r=>r.action.type==='openManual'),start=regions.find(r=>r.action.type==='startGame');test.assertTrue(manual.rect.x>=start.rect.x+start.rect.width);test.assertTrue(manual.rect.x+manual.rect.width<=size[0]);test.assertTrue(manual.rect.y+manual.rect.height<=size[1]);}
 });
 test.it('wraps translated failure messages above their acknowledgment button in all six languages',()=>{
  const language=pdg.res.getLanguage(),service=Manual.createManual('/app',{}, {fs:{existsSync:()=>false}});try{for(const code of Manual.languages){pdg.res.setLanguage(code);service.open(code);test.assertTrue(pdg.res.getString(943).length>0);test.assertTrue(pdg.res.getString(946).length>0);
   const measure=text=>Array.from(text).length*6.5,layout=service.layout(320,340,measure);test.assertEqual(layout.label,pdg.res.getString(834));test.assertEqual(layout.key,'Enter');test.assertTrue(layout.button.width>=require('../src/js/button-caption.js').width(layout.label,layout.key,measure,{size:13}));for(const line of layout.lines)test.assertTrue(measure(line)<=layout.rect.width-48);test.assertTrue(layout.rect.y+60+(layout.lines.length-1)*18<layout.button.y);test.assertTrue(layout.button.y+layout.button.height<=layout.rect.y+layout.rect.height);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('ships complete localized offline documents with valid contents and cross-language navigation',()=>{
  const fs=require('fs'),path=require('path'),root=path.join(__dirname,'../data/manual');
  const required=['start','map','economy','hulls','building','orders','fleets','rendezvous','fog','combat','events','compare','files','settings','strategy','keys','network'];
  for(const language of Manual.languages) {
   const file=path.join(root,language+'.html'),html=fs.readFileSync(file,'utf8');test.assertContains(html,'<html lang="'+language+'">');test.assertContains(html,'charset="utf-8"');
   const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);test.assertEqual(ids.length,new Set(ids).size);
   for(const chapter of required){test.assertTrue(ids.includes(chapter),'Missing '+language+' chapter '+chapter);test.assertContains(html,'href="#'+chapter+'"');}
   for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const target=match[1];test.assertFalse(/^(https?:|\/\/)/.test(target),'Manual must work offline');
    const pieces=target.split('#'),destination=pieces[0]?path.join(root,pieces[0]):file;test.assertTrue(fs.existsSync(destination),'Missing '+language+' link '+target);
    if(pieces[1])test.assertContains(fs.readFileSync(destination,'utf8'),'id="'+pieces[1]+'"');
   }
   for(const code of Manual.languages)test.assertContains(html,'href="'+code+'.html" lang="'+code+'"');
   test.assertContains(html,'href="'+language+'.html" lang="'+language+'" aria-current="page"');
   test.assertContains(html,'F1');test.assertContains(html,'F6');test.assertContains(html,'.gad4.json');test.assertContains(html,'100');
  }
 });
 test.it('rejects traversal as a language and safely falls back to the English page',()=>{
  let file;const service=Manual.createManual('/app',{}, {platform:'linux',fs:{existsSync:name=>{file=name;return true;},},execFile:()=>{}});
  test.assertTrue(service.open('../../private'));test.assertEqual(file,'/app/data/manual/en.html');test.assertEqual(Manual.manualLanguage(null),'en');
 });
});
