const test=require('./test-framework.js'),Factory=require('../src/js/factory.js'),Game=require('../src/js/game.js');
const GameConfig=require('../src/js/game-config.js'),Rules=require('../src/js/rules.js'),Display=require('../src/js/display.js'),I18n=require('../src/js/i18n.js');
function fixture(){
 const game=new Game(new Factory(),new Rules(false),new GameConfig({numHumans:1,numComputers:2,skipMapGeneration:true}));
 game.port={getDrawingArea:()=>new pdg.Rect(800,600),getTextWidth:(text,size)=>Array.from(String(text)).length*size*.5};
 const display=new Display(game);game.display=display;game.players[1].name='Sol';game.players[2].name='Sirius Alliance';game.players[3].name='Defeated';
 const star=(owner,name,tech,population)=>{const s=game.factory.createStar(0,0,name);s.owner=owner;s.techLevel=tech;s.population=population;return s;};
 return {game,display,star};
}
module.exports=()=>test.describe('Compare Players v3 summary',()=>{
 test.it('reports all eleven metrics with integer averages, raw population and combined production',()=>{
  const {game,star}=fixture();const a=star(1,'Alpha',5,1001),b=star(1,'Beta',8,2002);
  a.shipBuilding.benefit=3.8;a.research.benefit=7.4;b.shipBuilding.benefit=5.2;b.research.benefit=4.6;
  game.factory.createShip(0,0,'battleship',a,true);game.factory.createShip(0,0,'scout',b,true);
  const row=game.getPlayerComparisonRows().find(r=>r.playerNum===1);
  test.assertEqual(row.stars,2);test.assertEqual(row.ships,2);test.assertEqual(row.population,3003);test.assertEqual(row.production,20);
  test.assertEqual(row.minimumTech,5);test.assertEqual(row.maxTech,8);test.assertEqual(row.averageTech,6);
  test.assertEqual(row.minimumShipTech,5);test.assertEqual(row.maximumShipTech,8);test.assertEqual(row.averageShipTech,6);test.assertEqual(row.power,5);
 });
 test.it('counts nested fleet members once, includes satellites, excludes dead and unfinished hulls, and retains raw power after damage',()=>{
  const {game,star}=fixture(),s=star(1,'Home',10,1000),first=game.factory.createShip(0,0,'battleship',s,true),sat=game.factory.createShip(0,0,'defense',s,true);
  first.damage=500;sat.damage=200;const child=game.factory.createFleet(0,0);child.owner=1;child.addShip(first);
  const root=game.factory.createFleet(0,0);root.owner=1;root.addShip(child);
  const dead=game.factory.createShip(0,0,'battleship',s,true);dead.damage=1001;
  game.factory.createShip(0,0,'colony',s,false);s.startBuildingShip('battleship');
  const row=game.getPlayerComparisonRows().find(r=>r.playerNum===1);test.assertEqual(row.ships,2);test.assertEqual(row.power,20);test.assertEqual(row.shipsBuilding,1);
 });
 test.it('adds unowned systems without inventing ship statistics and labels defeated and unassigned players',()=>{
  const {game,star}=fixture();star(0,'Neutral',2,0);star(1,'Live',4,1000);game.players[1].name='';
  const rows=game.getPlayerComparisonRows(),neutral=rows[0],unknown=rows[1],dead=rows[3];
  test.assertEqual(neutral.playerNum,0);test.assertEqual(neutral.stars,1);test.assertTrue(neutral.italicizeName);test.assertTrue(neutral.isAlive);
  test.assertEqual(unknown.name,I18n.getString(306));test.assertTrue(unknown.italicizeName);
  test.assertFalse(dead.isAlive);test.assertEqual(dead.name,I18n.formatString(819,'{0} (defeated)','Defeated'));
 });
 test.it('computes extrema only from living competitors with corresponding assets, with blue taking precedence on ties',()=>{
  const {game,display,star}=fixture();star(0,'Neutral',100,999999);const a=star(1,'A',2,1000),b=star(2,'B',5,4000);
  game.factory.createShip(0,0,'scout',a,true);game.factory.createShip(0,0,'battleship',b,true);
  const rows=game.getPlayerComparisonRows(),extrema=game.getPlayerComparisonExtrema(rows);
  test.assertEqual(extrema.population.minimum,1000);test.assertEqual(extrema.population.maximum,4000);
  test.assertEqual(display.getPlayerComparisonCellColor(rows[1],'population',extrema),'comparisonWorst');
  test.assertEqual(display.getPlayerComparisonCellColor(rows[2],'population',extrema),'comparisonBest');
  test.assertEqual(display.getPlayerComparisonCellColor(rows[1],'stars',extrema),'comparisonBest');
  test.assertEqual(display.getPlayerComparisonCellColor(rows[0],'population',extrema),'gray');test.assertEqual(display.getPlayerComparisonCellColor(rows[3],'power',extrema),'gray');
 });
 test.it('compares production hundredths before formatting so rounded ties retain the correct winner',()=>{
  const {game,display,star}=fixture(),a=star(1,'A',2,1000),b=star(2,'B',2,1000);a.getProduction=()=>1040;b.getProduction=()=>1080;
  const rows=game.getPlayerComparisonRows(),extrema=game.getPlayerComparisonExtrema(rows);test.assertEqual(rows[1].production,10);test.assertEqual(rows[2].production,10);
  test.assertEqual(display.getPlayerComparisonCellColor(rows[1],'production',extrema),'comparisonWorst');test.assertEqual(display.getPlayerComparisonCellColor(rows[2],'production',extrema),'comparisonBest');
 });
 test.it('refreshes after ownership, build completion and elimination without treating stale alive flags as current statistics',()=>{
  const {game,star}=fixture(),s=star(1,'A',5,1000);game.players[1].isAlive=false;
  test.assertTrue(game.getPlayerComparisonRows()[1].isAlive);const ship=game.factory.createShip(0,0,'colony',s,false);
  test.assertEqual(game.getPlayerComparisonRows()[1].ships,0);ship.complete();test.assertEqual(game.getPlayerComparisonRows()[1].ships,1);
  s.owner=2;ship.owner=2;test.assertFalse(game.getPlayerComparisonRows()[1].isAlive);test.assertEqual(game.getPlayerComparisonRows()[2].ships,1);
 });
 test.it('pages every player in a bounded window and clamps the final page after configuration changes',()=>{
  const {game,display}=fixture();game.config.totalPlayers=30;game.uiWindow='comparison';const layout=display.getPlayerComparisonLayout(),seen=[];
  test.assertEqual(layout.columns.length,12);test.assertTrue(layout.rect.y+layout.rect.height<=590);
  for(let page=0;page<layout.pages;page++){game.executeUIAction({type:'playerComparisonPage',page});seen.push(...display.getPlayerComparisonLayout().visibleRows.map(r=>r.playerNum));}
  test.assertEqual(seen.length,31);test.assertEqual(new Set(seen).size,31);game.config.totalPlayers=3;test.assertEqual(display.getPlayerComparisonLayout().page,0);
 });
 test.it('keeps narrow comparison paging and Close separate and reaches all players in every language',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const {game,display}=fixture();display.reloadUIStrings();game.port.getDrawingArea=()=>new pdg.Rect(320,340);game.config.totalPlayers=30;game.uiWindow='comparison';const seen=[];
   for(let page=0;page<display.getPlayerComparisonLayout().pages;page++){
    game.playerComparisonPage=page;const layout=display.getPlayerComparisonLayout(),buttons=display.getPlayerComparisonActionRegions();seen.push(...layout.visibleRows.map(row=>row.playerNum));
    test.assertTrue(layout.rect.y+layout.rect.height<=330);test.assertEqual(buttons.length,5);
    for(let i=0;i<buttons.length;i++){const a=buttons[i].rect;test.assertTrue(a.x>=layout.rect.x && a.x+a.width<=layout.rect.x+layout.rect.width);test.assertTrue(a.y>=layout.rect.y+70+layout.visibleRows.length*26 && a.y+a.height<=layout.rect.y+layout.rect.height);
     for(const b of buttons.slice(i+1).map(button=>button.rect))test.assertFalse(a.x<b.x+b.width && b.x<a.x+a.width && a.y<b.y+b.height && b.y<a.y+a.height,'Overlapping footer '+lang);
    }
    const next=buttons.find(b=>b.action.type==='playerComparisonPage' && b.action.page===page+1);test.assertEqual(next.disabled,page===layout.pages-1);
   }
   test.assertEqual(new Set(seen).size,31);const close=display.getPlayerComparisonActionRegions().find(b=>b.action.type==='closePlayerComparison').rect;game.handleUIClick(close.x+close.width/2,close.y+close.height/2);test.assertNull(game.uiWindow);
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('renders complete compact names, headers and every statistic with stable player pages in all languages',()=>{
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const {game,display,star}=fixture();display.reloadUIStrings();game.port.getDrawingArea=()=>new pdg.Rect(320,340);game.players[2].name='Captain 星 '+('W'.repeat(22));const home=star(2,'Real enemy homeworld',987,987654321);home.shipBuilding.benefit=34567;home.research.benefit=12345;game.uiWindow='comparison';game.config.totalPlayers=30;
   const first=display.getPlayerComparisonLayout();test.assertEqual(first.columns.length,12);test.assertEqual(first.metrics.length,11);test.assertEqual(first.metrics.map(c=>c.key).join(','),'stars,population,production,minimumTech,maxTech,averageTech,ships,power,minimumShipTech,maximumShipTech,averageShipTech');
   const pages=first.pages,size=first.pageSize;game.playerComparisonPage=1;
   for(let metric=0;metric<11;metric++){
    test.assertTrue(game.executeUIAction({type:'playerComparisonColumn',page:metric}));const layout=display.getPlayerComparisonLayout();test.assertEqual(layout.pages,pages);test.assertEqual(layout.pageSize,size);test.assertEqual(layout.page,1);
    for(const record of layout.visibleRecords){test.assertEqual(record.nameLines.join(''),record.row.name);for(const line of record.nameLines)test.assertTrue(game.port.getTextWidth(line,11)<=layout.nameWidth-22);}
    for(const column of layout.metrics)test.assertEqual(column.labelLines.join(''),column.label.replace(/\|/g,''));
    const enemy=layout.visibleRecords.find(r=>r.row.playerNum===2);if(enemy && metric===1)test.assertEqual(enemy.values[metric].join(''),I18n.formatInteger(enemy.row.population));
   }
   game.handleKeyPress(pdg.key_RightArrow);test.assertEqual(game.playerComparisonColumnPage,10);game.handleKeyPress(pdg.key_LeftArrow);test.assertEqual(game.playerComparisonColumnPage,9);test.assertFalse(game.executeUIAction({type:'playerComparisonColumn',page:-1}));test.assertFalse(game.executeUIAction({type:'playerComparisonColumn',page:11}));
   test.assertTrue(require('../src/js/hover-help.js').describe({type:'playerComparisonColumn'}).includes(I18n.getString(879)));test.assertTrue(I18n.getString(1247).length>0);test.assertTrue(I18n.getString(1248).length>0);game.uiWindow=null;test.assertFalse(game.executeUIAction({type:'playerComparisonColumn',page:0}));
  }}finally{pdg.res.setLanguage(old);}
 });
 test.it('scrolls exceptionally tall defeated names without moving the fixed compact commands',()=>{
  const old=pdg.res.getLanguage();let overflow=0;try{for(const lang of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(lang);const {game,display}=fixture();game.port.getTextWidth=(text,size)=>Array.from(String(text)).reduce((n,c)=>n+size*(c==='W'?1:.8),0);display.reloadUIStrings();game.port.getDrawingArea=()=>new pdg.Rect(320,340);game.players[2].name='W'.repeat(32);game.uiWindow='comparison';let layout=display.getPlayerComparisonLayout();game.playerComparisonPage=Math.floor(2/layout.pageSize);layout=display.getPlayerComparisonLayout();
   test.assertTrue(layout.rect.y+layout.rect.height<=330);const fixed=JSON.stringify(layout.footer);for(const button of layout.footer)test.assertTrue(button.rect.y+button.rect.height<=layout.rect.y+layout.rect.height);
   const enemy=layout.visibleRecords.find(r=>r.row.playerNum===2);test.assertEqual(enemy.nameLines.join(''),game.getPlayerComparisonRows().find(r=>r.playerNum===2).name);
   if(layout.scrollLimit){overflow++;game.handleKeyPress(pdg.key_PageDown);layout=display.getPlayerComparisonLayout();test.assertEqual(layout.bodyScroll,Math.min(80,layout.scrollLimit));test.assertEqual(JSON.stringify(layout.footer),fixed);game.scrollPlayerComparison(999);test.assertEqual(display.getPlayerComparisonLayout().bodyScroll,layout.scrollLimit);game.handleKeyPress(pdg.key_PageUp);test.assertTrue(display.getPlayerComparisonLayout().bodyScroll<layout.scrollLimit);}
   game.playerComparisonPage=0;test.assertEqual(display.getPlayerComparisonLayout().bodyScroll,0);
  }}finally{pdg.res.setLanguage(old);}test.assertTrue(overflow>0,'Tall-name fixture never exercised scrolling');
 });
 test.it('routes close/paging and consumes map clicks, function keys, Tab and Enter behind the comparison',()=>{
  const {game,display}=fixture();game.uiWindow='comparison';let advance=0;game.attention.next=()=>advance++;const shown=game.showShips,turn=game.turn;
  game.handleKeyPress(pdg.key_F1);game.handleKeyPress(pdg.key_Tab);game.handleKeyPress(13);test.assertEqual(game.showShips,shown);test.assertEqual(advance,0);test.assertEqual(game.turn,turn);
  test.assertEqual(display.getUIActionAt(1,1).type,'consume');test.assertTrue(game.handleMouseRightClick(1,1));
  const close=display.getPlayerComparisonActionRegions().find(r=>r.action.type==='closePlayerComparison').rect;
  game.handleUIClick(close.x+5,close.y+5);test.assertNull(game.uiWindow);game.uiWindow='comparison';game.handleKeyPress(pdg.key_Escape);test.assertNull(game.uiWindow);
 });
 test.it('renders neutral ship and defeated metrics as dashes with italic unassigned names and best/worst text styles',()=>{
  const {game,display,star}=fixture();star(0,'Neutral',9,9999);star(1,'Low',2,1000);star(2,'High',5,4000);game.uiWindow='comparison';
  const text=[];display.drawTextLine=(value,x,y,color,size,style)=>text.push({value:String(value),color,style});
  display.drawWindowPanel=()=>{};display.drawDivider=()=>{};display.drawRoundedRect=()=>{};display.drawUIButton=()=>{};display.port.drawCircle=()=>{};
  display.drawComparisonWindow();test.assertTrue(text.some(t=>t.value==='1,000'&&t.color==='comparisonWorst'));
  test.assertTrue(text.some(t=>t.value==='4,000'&&t.color==='comparisonBest'));test.assertTrue(text.filter(t=>t.value==='—').length>=16);
  test.assertTrue(text.some(t=>t.value===I18n.getString(811)&&t.style===pdg.textStyle_Italic));
 });
 test.it('loads every comparison label and defeated template in all supported languages while preserving real enemy homeworld names',()=>{
  const {game,display,star}=fixture();star(1,'Sol',1,1000);star(2,'Sirius',2,2000);game.config.omniscient=false;
  const old=pdg.res.getLanguage();try{for(const lang of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(lang);display.reloadUIStrings();
   for(let id=811;id<=821;id++)test.assertTrue(I18n.getString(id).length>0,'Missing comparison resource '+id+' '+lang);
   test.assertEqual(game.getPlayerComparisonRows()[2].name,'Sirius Alliance');test.assertEqual(display.getPlayerComparisonLayout().columns.length,12);
  }}finally{pdg.res.setLanguage(old);}
 });
});
