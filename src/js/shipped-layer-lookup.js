const layers=require('./shipped-art-layers.js');

// The native field is signed16. SetLayrResID tries exact, tens, hundreds, etc.
function resolve(requested) {
    let resource=(requested<<16)>>16,place=1;
    const original=resource;
    while(!Object.prototype.hasOwnProperty.call(layers,resource) && resource!==0) {
        place*=10;resource-=resource%place;
    }
    return {requested:original,resource,layers:layers[resource]};
}
module.exports={resolve};
