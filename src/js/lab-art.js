const layers=require('./shipped-art-layers.js');

// SetLayrResID tries exact ID, then its tens, hundreds, etc. The native
// message field is a signed 16-bit ResIDT; preserve its wrap and fallback.
function resolve(classIndex) {
    const index=Number.isFinite(classIndex)?Math.max(0,Math.floor(classIndex)):0;
    let resource=((400+index)<<16)>>16,place=1;
    const requested=resource;
    while(!Object.prototype.hasOwnProperty.call(layers,resource) && resource!==0) {
        place*=10;resource-=resource%place;
    }
    return {requested,resource,layers:layers[resource]};
}

module.exports={resolve};
