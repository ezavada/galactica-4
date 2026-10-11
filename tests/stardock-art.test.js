const test=require('./test-framework.js'),Display=require('../src/js/display.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),fs=require('fs'),path=require('path');
function renderer(game){const display=Object.create(Display.prototype),images=[],text=[];display.game=game;display.styles={};display.STR={pressAnyKey:'',newDriveTechnology:''};display.port={getDrawingArea:()=>new pdg.Rect(800,600),drawRect:()=>{},drawImage:i=>images.push(i),drawText:t=>text.push(t)};display.drawDestructionEffect=()=>false;display.getTextAttributes=()=>({});display.getImageCached=(key,file)=>{test.assertTrue(fs.existsSync(path.join(__dirname,'../data',file)),'Missing '+file);return file;};return {display,images,text};}
module.exports=()=>test.describe('Shipped high-class presentation artwork',()=>{
 test.it('uses every available battleship picture and caps higher classes at the last shipped illustration',()=>{const d=Object.create(Display.prototype);const expected=['traveller','rama','hawk','falcon','riviel','raven','valkyrie','wolven','avenger','banshee'];expected.forEach((name,i)=>test.assertEqual(d.getShipArtNameForClass(i+1),name));for(const n of [11,12,13,20,100])test.assertEqual(d.getShipArtNameForClass(n),'banshee');});
 test.it('keeps malformed and low image indices on a real first-class asset',()=>{const d=Object.create(Display.prototype);for(const n of [undefined,NaN,Infinity,-1,0])test.assertEqual(d.getShipArtNameForClass(n),'traveller');});
 test.it('draws a real newly commissioned high-class ship without clamping its name, class or technology',()=>{const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:1})),star=game.factory.createStar(0,0,'Home');star.owner=1;star.techLevel=75;star.startBuildingShip('battleship');const ship=star.completeShip(),r=renderer(game);test.assertEqual(ship.classIndex,16);test.assertEqual(ship.techLevel,75);test.assertTrue(ship.name.startsWith('Viper'));r.display.drawOverlay(game.overlay);test.assertTrue(r.images.includes('ships/banshee.png'));test.assertTrue(r.text.some(t=>t.includes('Viper')));});
 test.it('makes blueprint black transparent once and reuses the cached image',()=>{const d=Object.create(Display.prototype);d.images={};const first=d.getImageCached('testBlueprint','tech/blue-11.png',new pdg.Color('black'));test.assertNotNull(first);test.assertEqual(first.getAlphaValue(new pdg.Point(0,0)),0);test.assertTrue(d.getImageCached('testBlueprint','tech/blue-11.png',new pdg.Color('black'))===first);});
 test.it('renders every supplied lab blueprint including two-digit image numbers',()=>{const r=renderer({});for(let index=1;index<=20;index++){r.images.length=0;r.display.drawOverlay({type:'lab',classIndex:index});const expected='tech/blue-'+String(Math.min(12,index+1)).padStart(2,'0')+'.png';test.assertTrue(r.images.includes(expected));}});
 test.it('renders all hull and capped high-class artwork in each supported language',()=>{const previous=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(language);const r=renderer({});for(const hull of ['scout','colony','defense','battleship']){r.images.length=0;r.display.drawOverlay({type:'stardock',shipType:hull,classIndex:20});test.assertTrue(r.images.includes('ships/'+({scout:'scout',colony:'colony',defense:'satellite',battleship:'banshee'}[hull])+'.png'));}}}finally{pdg.res.setLanguage(previous);}});
 test.it('preserves shipped layer proportions and keeps heading and hint clear at all viewport shapes',()=>{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-art-resources.json'),'utf8'));
  test.assertEqual(source.pictures['2000'].width,408);test.assertEqual(source.pictures['2000'].height,240);
  for(const [width,height] of [[800,600],[320,340],[1280,720],[600,900]]){
   for(const type of ['lab','stardock']){
    const r=renderer({}),rects=[],labels=[];
    r.display.port.getDrawingArea=()=>new pdg.Rect(width,height);
    r.display.port.drawImage=(image,rect)=>rects.push(rect);
    r.display.port.drawText=(text,point)=>labels.push(point);
    r.display.drawOverlay({type,classIndex:2});
    test.assertEqual(rects.length,3);
    const first=rects[0];
    test.assertTrue(Math.abs(first.width()/first.height()-408/240)<1e-9);
    test.assertTrue(first.left>=width*.05-1e-9 && first.right<=width*.95+1e-9);
    test.assertTrue(first.top>=height*.15-1e-9 && first.bottom<=height*.9+1e-9);
    for(const rect of rects){test.assertEqual(rect.left,first.left);test.assertEqual(rect.top,first.top);test.assertEqual(rect.right,first.right);test.assertEqual(rect.bottom,first.bottom);}
    test.assertTrue(labels[0].y<first.top);test.assertTrue(labels[1].y>first.bottom);
   }
  }
 });
});
