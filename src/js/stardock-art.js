const lookup=require('./shipped-layer-lookup.js');
function resolve(shipType,classIndex) {
    const hulls={defense:0,scout:1,colony:2};
    // V4 battleship indices start at one; v3 Fighter starts at three.
    const index=Number.isFinite(classIndex)?Math.max(1,Math.floor(classIndex)):1;
    // CStar limits native hull classes to the 23 entries in shipped STR#401.
    const nativeClass=Object.prototype.hasOwnProperty.call(hulls,shipType)?hulls[shipType]:Math.min(23,index+2);
    return lookup.resolve(300+nativeClass);
}
module.exports={resolve};
