const test=require('./test-framework.js'),Display=require('../src/js/display.js'),Game=require('../src/js/game.js'),Factory=require('../src/js/factory.js'),Rules=require('../src/js/rules.js'),Config=require('../src/js/game-config.js'),fs=require('fs'),path=require('path');
function renderer(game){const display=Object.create(Display.prototype),images=[],text=[];display.game=game;display.styles={labBlueprint:{texture(image){this.image=image;return this;},getTexture(){return this.image;}}};display.STR={pressAnyKey:'',newDriveTechnology:''};display.port={getDrawingArea:()=>new pdg.Rect(800,600),drawRect:(rect,attrs)=>{if(attrs && attrs.getTexture && attrs.getTexture())images.push(attrs.getTexture());},drawImage:i=>images.push(i),drawText:t=>text.push(t)};display.drawDestructionEffect=()=>false;display.getTextAttributes=()=>({});display.getImageCached=(key,file)=>{test.assertTrue(fs.existsSync(path.join(__dirname,'../data',file)),'Missing '+file);return file;};return {display,images,text};}
module.exports=()=>test.describe('Shipped high-class presentation artwork',()=>{
 test.it('resolves original Stardock classes and decimal fallback independently of detail-view picture caps',()=>{
  const art=require('../src/js/stardock-art.js');
  for(let index=1;index<=12;index++)test.assertEqual(art.resolve('battleship',index).resource,302+index);
  for(const [index,resource] of [[13,310],[16,310],[17,310],[18,300],[20,300],[100,300]])test.assertEqual(art.resolve('battleship',index).resource,resource);
  for(const [hull,resource] of [['defense',300],['scout',301],['colony',302]])test.assertEqual(art.resolve(hull,20).resource,resource);
 });
 test.it('keeps malformed and low battleship indices on the first original Stardock class',()=>{
  const art=require('../src/js/stardock-art.js');for(const n of [undefined,NaN,Infinity,-1,0])test.assertEqual(art.resolve('battleship',n).resource,303);
 });
 test.it('draws a real newly commissioned high-class ship without clamping its name, class or technology',()=>{const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:1})),star=game.factory.createStar(0,0,'Home');star.owner=1;star.techLevel=75;star.startBuildingShip('battleship');const ship=star.completeShip(),r=renderer(game);test.assertEqual(ship.classIndex,16);test.assertEqual(ship.techLevel,75);test.assertTrue(ship.name.startsWith('Viper'));r.display.drawOverlay(game.overlay);test.assertTrue(r.images.includes('events/layers/pict-3010.png'));test.assertTrue(r.text.some(t=>t.includes('Viper')));});
 test.it('adds blueprint colors to the Lab background with a reusable dedicated style',()=>{
  const d=Object.create(Display.prototype);d.images={};const first=d.getImageCached('testBlueprint','tech/blue-11.png',new pdg.Color('black'));
  test.assertNotNull(first);test.assertEqual(first.getAlphaValue(new pdg.Point(0,0)),0);
  test.assertTrue(d.getImageCached('testBlueprint','tech/blue-11.png')===first);
  const r=renderer({}),draws=[],original=new pdg.Attributes();r.display.styles.image=original;
  r.display.uiColors=r.display.createUIColorPalette();
  r.display.styles.labBlueprint=r.display.createDrawingStyles().labBlueprint;
  const style=r.display.styles.labBlueprint;
  r.display.images={};r.display.getImageCached=(key,file,transparent)=>Display.prototype.getImageCached.call(r.display,key,file,transparent);
  r.display.port.drawImage=(image,rect,attrs)=>draws.push({blueprint:false,attrs});
  r.display.port.drawRect=(rect,attrs)=>{if(attrs===style)draws.push({blueprint:true,attrs});};
  for(let n=0;n<2;n++)r.display.drawOverlay({type:'lab',classIndex:1});
  test.assertEqual(style.getBlendMode(),pdg.blendMode_Additive);
  test.assertEqual(style.getLineStyle(),pdg.lineStyle_None);
  for(const draw of draws)test.assertTrue(draw.attrs===(draw.blueprint?style:original));
  test.assertEqual(original.getBlendMode(),pdg.blendMode_Normal);
 });
 test.it('selects each available Lab milestone picture from the shipped layer records',()=>{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-art-resources.json'),'utf8'));
  const r=renderer({});
  for(let index=0;index<=10;index++){
   r.images.length=0;r.display.drawOverlay({type:'lab',classIndex:index});
   const picture=source.layers[String(400+index)].layers[1].picture;
   const expected='tech/blue-'+String(picture-2200).padStart(2,'0')+'.png';
   test.assertTrue(r.images.includes(expected),'Wrong original Lab picture for milestone '+index);
  }
 });
 test.it('uses the first milestone blueprint for a real tech-level-five discovery in every language',()=>{
  const previous=pdg.res.getLanguage();
  try{for(const language of ['en','de','es','fr','ja','ru']){
   pdg.res.setLanguage(language);
   const game=new Game(new Factory(),new Rules(false),new Config({skipMapGeneration:true,numHumans:1,numComputers:1}));
   const star=game.factory.createStar(0,0,'Home');star.owner=1;star.techLevel=4;
   game.players[1].hiStarTech=4;star.paidTowardResearch=1001;game.rules.getStarResearchAmount=()=>0;
   star.update();
   test.assertEqual(game.overlay.type,'lab');test.assertEqual(game.overlay.classIndex,1);
   const r=renderer(game);r.display.drawOverlay(game.overlay);test.assertTrue(r.images.includes('tech/blue-03.png'));
   test.assertEqual(star.techLevel,5);
  }}finally{pdg.res.setLanguage(previous);}
 });
 test.it('renders original hull and high-class fallback artwork in each supported language',()=>{const previous=pdg.res.getLanguage();try{for(const language of ['en','de','es','fr','ja','ru']){pdg.res.setLanguage(language);const r=renderer({});for(const hull of ['scout','colony','defense','battleship']){r.images.length=0;r.display.drawOverlay({type:'stardock',shipType:hull,classIndex:20});const source=require('../src/js/stardock-art.js').resolve(hull,20);test.assertEqual(r.images.length,source.layers.length);for(const row of source.layers)test.assertTrue(r.images.includes(row.path));}}}finally{pdg.res.setLanguage(previous);}});
 test.it('preserves shipped layer proportions and keeps heading and hint clear at all viewport shapes',()=>{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/reference/v3-art-resources.json'),'utf8'));
  test.assertEqual(source.pictures['2000'].width,408);test.assertEqual(source.pictures['2000'].height,240);
  for(const [width,height] of [[800,600],[320,340],[1280,720],[600,900]]){
   for(const type of ['lab','stardock']){
    const r=renderer({}),rects=[],labels=[];
    r.display.port.getDrawingArea=()=>new pdg.Rect(width,height);
    r.display.port.drawImage=(image,rect)=>rects.push(rect);
    r.display.port.drawRect=(rect,attrs)=>{if(attrs===r.display.styles.labBlueprint)rects.push(rect);};
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
 test.it('uses source decimal fallback and signed resource IDs instead of clamping higher Lab classes',()=>{
  const art=require('../src/js/lab-art.js');
  for(const [index,resource] of [[0,400],[10,410],[11,410],[19,410],[20,400],[99,400],[100,0],[599,0],[600,1000],[1600,2000],[2600,3000],[3600,4000],[32768,0]]){
   const result=art.resolve(index);test.assertEqual(result.resource,resource,'Wrong source fallback for '+index);
   const r=renderer({});r.display.drawOverlay({type:'lab',classIndex:index});
   for(const row of result.layers)test.assertTrue(r.images.includes(row.path));
   test.assertEqual(r.images.length,result.layers.length);
  }
  for(const value of [undefined,NaN,Infinity,-1])test.assertEqual(art.resolve(value).resource,400);
 });
 test.it('packages every recovered fallback picture with decoded dimensions and provenance hashes',()=>{
  const crypto=require('crypto'),metadata=require('../src/js/shipped-art-layers.js');
  const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/events/layers/provenance.json'),'utf8'));
  test.assertEqual(Object.keys(metadata).length,147);
  for(const rows of Object.values(metadata))for(const row of rows)test.assertTrue(fs.existsSync(path.join(__dirname,'../data',row.path)),row.path);
  for(const [number,row] of Object.entries(provenance.pictures)){
   const bytes=fs.readFileSync(path.join(__dirname,'../data/events/layers/pict-'+number+'.png'));
   test.assertEqual(crypto.createHash('sha256').update(bytes).digest('hex'),row.pngSha256);
   test.assertEqual(bytes.readUInt32BE(16),row.pngWidth);test.assertEqual(bytes.readUInt32BE(20),row.pngHeight);
  }
 });
});
