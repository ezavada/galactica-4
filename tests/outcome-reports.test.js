const test=require('./test-framework.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),Display=require('../src/js/display.js'),Common=require('../src/js/common.js'),I18n=require('../src/js/i18n.js');
function fixture(options={},width=800,height=600){const game=new Game(new Factory(),new Rules(),new Config({skipMapGeneration:true,...options}));
 game.port={getDrawingArea:()=>new pdg.Rect(width,height),getTextWidth:(text,size)=>Array.from(String(text)).length*size};const display=new Display(game);return {game,display};}
function ownStar(game,owner){const star=game.factory.createStar(owner*100000,0,'Home '+owner);star.owner=owner;return star;}
function dismissUntil(game,kind){while(game.overlay && game.overlay.kind!==kind)game.dismissEventPresentation();return game.overlay;}
module.exports=()=>test.describe('Victory and defeat reports',()=>{
 test.it('uses name-safe outcome summaries in every language for local pronouns and literal player names',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);
   for(const name of [I18n.getString(17),'星$&Д{7}']){
    const {game,display}=fixture();game.players[1].name=name;game.turn=7;game.markGameWon(1);
    let event=game.eventLog.find(e=>e.outcome && e.outcome.kind==='win');test.assertEqual(event.message,I18n.formatString(644,'',name,7));test.assertContains(event.message,name);test.assertContains(event.message,I18n.getString(614));test.assertEqual(display.getOutcomeLayout(game.overlay).summaryLines.join(' '),event.message);
    game.clearEventPresentations();game.noteworthyEvent(game.players[1],Common.EventType.PLAYER_DIED);event=game.eventLog.find(e=>e.outcome && e.outcome.kind==='defeat');test.assertEqual(event.message,I18n.formatString(637,'',name));test.assertContains(event.message,name);test.assertContains(event.message,I18n.getString(613));test.assertEqual(display.getOutcomeLayout(game.overlay).summaryLines.join(' '),event.message);
   }
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('packages selected final outcome art and confines it to affected-player views at every tested size',()=>{
  const fs=require('fs'),path=require('path'),crypto=require('crypto'),manifest=require('../data/events/outcome-art.json');
  for(const kind of ['victory','defeat']){const asset=fs.readFileSync(path.join(__dirname,'../data/events/'+kind+'.png'));test.assertEqual(crypto.createHash('sha256').update(asset).digest('hex'),manifest[kind].sha256);test.assertEqual(asset.readUInt32BE(16),manifest[kind].width);test.assertEqual(asset.readUInt32BE(20),manifest[kind].height);test.assertTrue(manifest[kind].width>0 && manifest[kind].height>0);}
  for(const [width,height] of [[800,600],[480,400],[320,340]]){const {game,display}=fixture({},width,height);
   for(const kind of ['win','defeat']){const local=display.getOutcomeLayout({kind,playerNum:1,name:'Captain',turn:1}),art=local.illustration;
    test.assertDefined(art);test.assertTrue(Array.isArray(local.buttons));for(const button of local.buttons)test.assertTrue(button.rect.y+button.rect.height<=local.rect.y+local.rect.height);test.assertContains(art.path,kind==='win'?'victory':'defeat');test.assertTrue(art.rect.x>=local.rect.x&&art.rect.x+art.rect.width<=local.rect.x+local.rect.width);test.assertTrue(art.rect.y>=local.rect.y+44&&art.rect.y+art.rect.height<=local.rect.y+local.rect.height-90);const selected=manifest[kind==='win'?'victory':'defeat'];test.assertTrue(Math.abs(art.rect.width/art.rect.height-selected.width/selected.height)<.00001);
    test.assertNull(display.getOutcomeLayout({kind,playerNum:2,name:'Enemy',turn:1}).illustration);
   }
   test.assertNull(display.getOutcomeLayout({kind:'draw',playerNum:0,turn:1}).illustration);
  }
 });
 test.it('automatically completes an opponent defeat notice even with enemy events off and retains manual review',()=>{
  const {game,display}=fixture({numComputers:2});ownStar(game,1);ownStar(game,3);game.showEnemyEvents=false;game.updatePlayerPieceCounts();
  const event=game.eventLog.find(e=>e.outcome && e.outcome.playerNum===2);test.assertDefined(event);test.assertFalse(game.isGameOver);test.assertTrue(game.overlay.animationOnly);
  let dim=0,narrative=0;display.port.drawRect=()=>dim++;display.drawOutcome=()=>narrative++;display.drawDestructionEffect=()=>false;
  let now=0;game.getCurrentMilliseconds=()=>now;display.drawOverlay(game.overlay);test.assertNotNull(game.overlay);now=4000;display.drawOverlay(game.overlay);test.assertNull(game.overlay);test.assertEqual(dim,0);test.assertEqual(narrative,0);test.assertTrue(event.handled);
  test.assertTrue(game.replayOutcome(event));test.assertTrue(game.overlay.manual);test.assertFalse(!!game.overlay.animationOnly);display.drawOverlay(game.overlay);test.assertEqual(dim,1);test.assertEqual(narrative,1);test.assertEqual(game.turn,1);
 });
 test.it('automatically advances opponent defeat to the local victory dialog without dismissing or advancing time',()=>{
  const {game,display}=fixture();ownStar(game,1);game.updatePlayerPieceCounts();test.assertEqual(game.overlay.kind,'defeat');test.assertTrue(game.overlay.animationOnly);
  display.drawDestructionEffect=()=>false;let now=0;game.getCurrentMilliseconds=()=>now;display.drawOverlay(game.overlay);test.assertEqual(game.overlay.kind,'defeat');now=4000;display.drawOverlay(game.overlay);test.assertEqual(game.overlay.kind,'win');test.assertEqual(game.overlay.playerNum,1);test.assertFalse(game.overlay.animationOnly);test.assertEqual(game.turn,1);
  test.assertTrue(display.getOutcomeLayout(game.overlay).lines.join(' ').includes('Victory is yours!'));
 });
 test.it('queues a defeated-opponent notice then the full local victory narrative after the last opponent falls',()=>{
  const {game,display}=fixture();ownStar(game,1);game.players[1].name='Captain 星';game.updatePlayerPieceCounts();
  test.assertTrue(game.isGameOver);test.assertEqual(game.overlay.kind,'defeat');test.assertEqual(game.overlay.playerNum,2);test.assertEqual(game.overlayQueue.length,1);
  const outcome=dismissUntil(game,'win'),layout=display.getOutcomeLayout(outcome);test.assertEqual(outcome.playerNum,1);test.assertTrue(layout.lines.join(' ').includes('Victory is yours!'));test.assertTrue(layout.summaryLines.join(' ').includes('Captain 星'));
 });
 test.it('shows the human defeat story with a literal full name while remaining opponents continue',()=>{
  const {game,display}=fixture({numComputers:2});ownStar(game,2);ownStar(game,3);game.players[1].name='星 | $& Captain';game.updatePlayerPieceCounts();
  test.assertFalse(game.isGameOver);test.assertEqual(game.overlay.kind,'defeat');test.assertEqual(game.overlay.playerNum,1);
  const text=display.getOutcomeLayout(game.overlay).lines.join(' ');test.assertTrue(text.includes('星 | $& Captain'));test.assertFalse(text.includes('{0}'));test.assertTrue(text.includes('taken prisoner'));
 });
 test.it('does not address another winner or a defeated AI as the local player, including observers',()=>{
  for(const options of [{},{numHumans:0,numComputers:2}]){const {game,display}=fixture(options);game.markGameWon(2);test.assertEqual(display.getOutcomeLayout(game.overlay).lines.length,0);}
  const {game,display}=fixture();const event=game.recordEvent('Defeat','Notice');game.queueOutcome(event,'defeat',2);test.assertEqual(display.getOutcomeLayout(game.overlay).lines.length,0);
 });
 test.it('does not duplicate defeat or terminal reports when piece counts are checked again',()=>{
  const {game}=fixture();ownStar(game,1);game.updatePlayerPieceCounts();const events=game.eventLog.length,queued=game.overlayQueue.length;
  for(let i=0;i<5;i++)game.updatePlayerPieceCounts();test.assertEqual(game.eventLog.length,events);test.assertEqual(game.overlayQueue.length,queued);test.assertFalse(game.markGameWon(1));test.assertFalse(game.markGameDraw());
 });
 test.it('reports stalemate when everyone is gone and preserves existing event ordering',()=>{
  const {game}=fixture();game.queueEventOverlay({type:'lab',classIndex:1});game.updatePlayerPieceCounts();test.assertEqual(game.overlay.type,'lab');
  const outcome=dismissUntil(game,'draw');test.assertEqual(outcome.kind,'draw');test.assertEqual(game.winningPlayerNum,0);test.assertTrue(game.eventLog.some(e=>e.type===Common.EventType.GAME_DRAW));
 });
 test.it('keeps quiet autoplay free of dialogs while retaining replay metadata',()=>{
  const {game}=fixture({numHumans:0,numComputers:2,autoplay:{enabled:true,showEventWindows:false}});ownStar(game,1);game.updatePlayerPieceCounts();
  test.assertNull(game.overlay);test.assertEqual(game.overlayQueue.length,0);test.assertTrue(game.eventLog.some(e=>e.outcome && e.outcome.kind==='win'));
 });
 test.it('acknowledges reports without advancing turns and keeps map controls available outside the report',()=>{
  const {game,display}=fixture();const star=ownStar(game,1);game.setSelectedObject(star);game.uiWindow='endTurnConfirm';game.markGameWon(1);test.assertNull(game.uiWindow);const event=game.eventLog.find(e=>e.outcome && e.outcome.kind==='win'),turn=game.turn;
  game.handleKeyPress(pdg.key_F4);test.assertTrue(game.showAllCourses);test.assertNotNull(game.overlay);test.assertNull(display.getUIActionAt(1,1));
  const slider=display.getStarAllocationSliderRegions(star)[0];const covered=display.containsPoint(display.getOutcomeLayout(game.overlay).rect,slider.trackRect.x+10,slider.trackRect.y+4);test.assertEqual(game.beginUISliderDrag(slider.trackRect.x+10,slider.trackRect.y+4),!covered);game.endUISliderDrag();
  const button=display.getOutcomeLayout(game.overlay).buttons.find(b=>b.action.type==='dismissOutcome');test.assertTrue(game.handleUIClick(button.rect.x+2,button.rect.y+2));test.assertNull(game.overlay);test.assertTrue(event.handled);test.assertEqual(game.turn,turn);
  game.replayOutcome(event);game.handleKeyPress(13);test.assertNull(game.overlay);test.assertEqual(game.turn,turn);
 });
 test.it('pages complete Unicode narratives in smaller windows without losing lines or overlapping controls',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);const {game,display}=fixture({},320,340);game.players[1].name='星'.repeat(32);
   const event=game.recordEvent('Defeat','Notice');game.queueOutcome(event,'defeat',1);let layout=display.getOutcomeLayout(game.overlay),all=[];
   for(let page=0;page<layout.pages;page++){game.overlay.page=page;layout=display.getOutcomeLayout(game.overlay);all.push(...layout.visibleLines);test.assertTrue(layout.bodyY+layout.visibleLines.length*18<=layout.rect.y+layout.rect.height-82);for(const b of layout.buttons)test.assertTrue(b.rect.x>=layout.rect.x&&b.rect.x+b.rect.width<=layout.rect.x+layout.rect.width);}
   for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const a=layout.buttons[i].rect,b=layout.buttons[j].rect;test.assertFalse(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y);}
   test.assertEqual(all.join('\n'),layout.lines.join('\n'));game.overlay.page=0;game.handleKeyPress(pdg.key_RightArrow);test.assertEqual(game.overlay.page,Math.min(1,layout.pages-1));game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.overlay.page,0);
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('replays retained outcomes from the event list without adding duplicate log entries and rejects unrelated reports',()=>{
  const {game,display}=fixture();game.markGameWon(1);const event=game.eventLog.find(e=>e.outcome),count=game.eventLog.length;game.dismissEventPresentation();game.uiWindow='events';game.eventSelection=event.id;
  test.assertTrue(display.getEventActionRegions().some(b=>b.action.type==='replayOutcome'));game.handleKeyPress(13);test.assertEqual(game.overlay.eventId,event.id);test.assertNull(game.uiWindow);test.assertEqual(game.eventLog.length,count);
  game.dismissEventPresentation();test.assertFalse(game.replayOutcome({outcome:event.outcome}));const other=game.recordEvent('Other','Other');test.assertFalse(game.replayOutcome(other));
 });
 test.it('retains current-turn outcomes for replay on later turns without exposing unrelated current events',()=>{
  const {game,display}=fixture();game.turn=6;const previous=game.recordEvent('Previous','Previous');game.turn=7;
  const current=game.recordEvent('Current','Current');game.markGameWon(1);const result=game.eventLog.find(e=>e.outcome);
  game.dismissEventPresentation();test.assertTrue(game.getEventRows().includes(previous));test.assertFalse(game.getEventRows().includes(current));
  test.assertTrue(game.getEventRows().includes(result));test.assertTrue(game.replayOutcome(result));test.assertEqual(game.overlay.turn,7);
  game.dismissEventPresentation();let heading;display.drawWindowPanel=(rect,title)=>{heading=title;};display.drawTextLine=()=>{};display.drawDivider=()=>{};display.drawRoundedRect=()=>{};display.drawUIButton=()=>{};display.drawEventWindow();test.assertTrue(heading.endsWith('6–7'));
  game.turn=8;display.drawEventWindow();test.assertTrue(heading.endsWith('7'));test.assertTrue(game.getEventRows().includes(result));game.turn=9;test.assertFalse(game.getEventRows().includes(result));
 });
 test.it('automatically presents only the local battle report and retains the report while allowing outside map input',()=>{
  const {game,display}=fixture(),home=ownStar(game,1),enemy=ownStar(game,2);home.techLevel=20;enemy.techLevel=1;
  const attacker=game.factory.createShip(home.x,home.y,'battleship',home,true),defender=game.factory.createShip(enemy.x,enemy.y,'battleship',enemy,true);
  pdg.srand(42);game.combatSystem.resolveCombat(attacker,defender);
  test.assertEqual(game.overlay.type,'report');const event=game.eventLog.find(e=>e.id===game.overlay.eventId);
  test.assertEqual(event.recipient,1);test.assertFalse(game.overlayQueue.some(o=>o.type==='report'));
  const turn=game.turn,names=game.showMapNames;game.handleKeyPress(pdg.key_F2);test.assertEqual(game.showMapNames,names);test.assertEqual(game.overlay.type,'report');
  test.assertNull(display.getUIActionAt(1,1));const r=display.getReportLayout(game.overlay).buttons.find(b=>b.action.type==='dismissReport').rect;
  test.assertTrue(game.handleUIClick(r.x+2,r.y+2));test.assertEqual(game.overlay,null);test.assertTrue(event.handled);test.assertTrue(game.selectedObject===attacker);test.assertEqual(game.turn,turn);
 });
 test.it('reopens a retained combat message from Events without duplicating reports or advancing the turn',()=>{
  const {game,display}=fixture(),home=ownStar(game,1),event=game.recordEvent('Combat','Battle at 星',{recipient:1,subject:home});event.combat={result:'won'};
  test.assertTrue(game.queueReport(event));game.handleKeyPress(32);const turn=game.turn,count=game.eventLog.length;game.uiWindow='events';game.eventSelection=event.id;
  test.assertTrue(display.getEventActionRegions().some(b=>b.action.type==='replayReport'));game.handleKeyPress(13);test.assertEqual(game.overlay.eventId,event.id);test.assertEqual(game.uiWindow,null);test.assertEqual(game.eventLog.length,count);
  game.handleKeyPress(pdg.key_Escape);test.assertEqual(game.turn,turn);test.assertFalse(game.replayReport({combat:{result:'won'}}));
  const privateEvent=game.recordEvent('Combat','Hidden',{recipient:2});privateEvent.combat={result:'won'};test.assertFalse(game.queueReport(privateEvent));test.assertFalse(game.replayReport(privateEvent));
 });
 test.it('pages complete translated message text in small windows with measured nonoverlapping controls',()=>{
  const language=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']) {
   pdg.res.setLanguage(lang);const {game,display}=fixture({},320,340),home=ownStar(game,1);
   const text=(I18n.getString(926)+' 星 $& Д\n\n').repeat(16),event=game.recordEvent(I18n.getString(607),text,{recipient:1,subject:home});event.combat={result:'won'};game.queueReport(event);
   let layout=display.getReportLayout(game.overlay),all=[];test.assertTrue(layout.pages>1);
   for(let page=0;page<layout.pages;page++) {game.overlay.page=page;layout=display.getReportLayout(game.overlay);all.push(...layout.visibleLines);
    const bottom=layout.bodyY+layout.visibleLines.length*18;test.assertTrue(bottom<=Math.min(...layout.buttons.map(b=>b.rect.y)));
    for(const b of layout.buttons){test.assertTrue(b.rect.x>=layout.rect.x&&b.rect.x+b.rect.width<=layout.rect.x+layout.rect.width);test.assertTrue(b.rect.y+b.rect.height<=layout.rect.y+layout.rect.height);test.assertTrue(b.rect.width>=game.port.getTextWidth(b.label,11));}
    for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){const a=layout.buttons[i].rect,b=layout.buttons[j].rect;test.assertFalse(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y);}
   }
   test.assertEqual(all.join('\n'),layout.lines.join('\n'));game.overlay.page=0;game.handleKeyPress(pdg.key_RightArrow);test.assertEqual(game.overlay.page,1);game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.overlay.page,0);
  }}finally{pdg.res.setLanguage(language);}
 });
 test.it('preserves queued ordinary messages and their identities through complete-game saves',()=>{
  const {game}=fixture(),home=ownStar(game,1);for(const message of ['First 星','Second Д']){const event=game.recordEvent('Combat',message,{recipient:1,subject:home});event.combat={result:'won'};game.queueReport(event);}
  const Save=require('../src/js/game-save.js'),loaded=Save.restore(Save.serialize(game));test.assertEqual(loaded.overlay.type,'report');test.assertEqual(loaded.overlayQueue.length,1);
  const first=loaded.eventLog.find(e=>e.id===loaded.overlay.eventId);loaded.dismissEventPresentation();test.assertTrue(first.handled);test.assertEqual(loaded.overlay.type,'report');test.assertEqual(loaded.eventLog.find(e=>e.id===loaded.overlay.eventId).message,'Second Д');
 });
 test.it('keeps autoplay message windows disabled while retaining reports for later review',()=>{
  const {game}=fixture({autoplay:{enabled:true,showEventWindows:false}}),event=game.recordEvent('Combat','Review later',{recipient:1});event.combat={result:'won'};
  test.assertFalse(game.queueReport(event));test.assertEqual(game.overlay,null);test.assertTrue(game.getEventRows().includes(event));
 });
 test.it('renders acknowledgement text without displaying internal action objects',()=>{
  const {game,display}=fixture();const labels=[];game.port.drawImage=()=>{};game.port.drawRect=()=>{};game.port.drawLine=()=>{};game.port.drawText=text=>labels.push(text);game.markGameWon(1);display.drawOverlay(game.overlay);
  test.assertTrue(labels.includes(I18n.getString(834)));test.assertFalse(labels.some(text=>String(text).includes('[object Object]')));
 });
 test.it('translates the three narrative paragraphs, player substitution and acknowledgement controls in every language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);for(const id of [832,833])test.assertEqual(I18n.getString(id).split('|').length,3);test.assertTrue(I18n.getString(833).includes('{0}'));for(const id of [834,835])test.assertTrue(I18n.getString(id).length>0);}}
  finally{pdg.res.setLanguage(old);}
 });
});
