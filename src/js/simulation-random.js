// Local games keep PDG's RNG. Tutorials and network hosts own a serializable portable stream.
const algorithm='park-miller-16807',modulus=2147483647;
function valid(stream){
    return !!stream && stream.algorithm===algorithm && Number.isInteger(stream.state) &&
        stream.state>0 && stream.state<modulus && Object.keys(stream).length===2;
}
function create(seed=101){
    const stream={algorithm,state:seed};
    if(!valid(stream))throw new Error('Invalid tutorial random seed');
    return stream;
}
function next(game){
    const stream=game && game.tutorialRandom;
    if(stream!=null){
        if(!valid(stream))throw new Error('Invalid tutorial random state');
        // The product stays below 2^53, so all arithmetic is exact in JS.
        stream.state=(stream.state*16807)%modulus;
        return stream.state;
    }
    return typeof pdg!=='undefined' && pdg && typeof pdg.rand==='function'?pdg.rand():0;
}
function integer(max,game){return !max || max<=0?0:next(game)%max;}
module.exports={create,next,integer,valid};
