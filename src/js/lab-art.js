const lookup=require('./shipped-layer-lookup.js');
function resolve(classIndex) {
    const index=Number.isFinite(classIndex)?Math.max(0,Math.floor(classIndex)):0;
    return lookup.resolve(400+index);
}
module.exports={resolve};
