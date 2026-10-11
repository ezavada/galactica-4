globalThis.pdg=require('pdg');
const assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');pdg.res.openResourceFile(root+'/data');
const Display=require(root+'/src/js/display.js');
const display=Object.create(Display.prototype);display.images={labback:null,labtop:null};
for(let id=3000;id<=3012;id++){
 const source='events/layers/pict-'+id+'.png';
 const image=display.getImageCached(source,source,new pdg.Color(0,1,0));
 assert(image,source);assert.strictEqual(image.getWidth(),1632);assert.strictEqual(image.getHeight(),960);
 assert.strictEqual(image.getAlphaValue(new pdg.Point(0,0)),0);
 assert.strictEqual(display.getImageCached(source,source),image,'Image should be cached');
}
for(const source of ['events/labback.png','events/labtop.png','events/victory.png','events/defeat.png','events/layers/pict-2000.png','events/layers/pict-2100.png']){
 const key=source==='events/labback.png'?'labback':source==='events/labtop.png'?'labtop':source;
 const image=display.getImageCached(key,source,new pdg.Color(0,1,0));assert(image,source);
 if(source==='events/labtop.png'){
  assert.strictEqual(image.getAlphaValue(new pdg.Point(800,300)),0);
  assert(image.getAlphaValue(new pdg.Point(800,900))>0);
 }
}
// Alpha art must never be altered by legacy green/black chroma keys.
let keyed=0;const probe=Object.create(Display.prototype);probe.images={};const getImage=pdg.res.getImage;
pdg.res.getImage=()=>({setTransparentColor:()=>keyed++});
probe.getImageCached('alpha','events/layers/pict-3001.png',new pdg.Color(0,1,0));assert.strictEqual(keyed,0);
probe.getImageCached('additive','events/layers/pict-3110.png',new pdg.Color('black'));assert.strictEqual(keyed,1);
pdg.res.getImage=getImage;
const layers=require(root+'/src/js/shipped-art-layers.js');
for(const hull of [10,12]){
 const p=Object.create(Display.prototype);p.images={};let effects=0;
 p.styles={image:{},labBlueprint:{texture:image=>{assert.strictEqual(image.getWidth(),408);return {};}}};
 p.port={drawImage:()=>{},drawRect:()=>effects++};p.drawClassArt(layers[3000+hull],new pdg.Rect(10,20,418,260));assert.strictEqual(effects,1);
}
// Retain the realistic archive's inner-cup regression coverage without a launch selector.
pdg.res.openResourceFile(root);
const riviel=pdg.res.getImage('old-art/art-styles/realistic/events/layers/pict-3008.png');assert(riviel);
for(const [x,y] of [[550,390],[650,395],[800,400],[900,405],[750,465]])assert(riviel.getAlphaValue(new pdg.Point(x,y))>=240);
console.log('PASS native anime images, alpha-safe cache, unchanged propulsion fields and archived Riviel surface');
process.exit(0);
