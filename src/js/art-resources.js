// Native alpha assets in the default anime set; legacy additive/blueprint layers retain chroma keys.
const alphaImages=new Set([
    ...Array.from({length:13},(_,i)=>'events/layers/pict-'+(3000+i)+'.png'),
    'events/labtop.png','events/layers/pict-2100.png','events/newstardockfront.png',
    ...["ships/satellite.png", "ships/scout.png", "ships/colony.png", "ships/traveller.png", "ships/falcon.png", "ships/raven.png", "ships/rama.png", "ships/riviel.png", "ships/hawk.png", "ships/valkyrie.png", "ships/wolven.png", "ships/avenger.png", "ships/banshee.png"]
]);
module.exports={hasAlpha:source=>alphaImages.has(source)};
