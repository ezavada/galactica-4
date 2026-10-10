// Presentation timing follows CDestructionMsg's eight expanding/contracting frames.
// Sampling never consumes the simulation RNG or changes game objects.
const durations=[2,3,4,5,6,5,4,3].map(ticks=>ticks*1000/60);
const radii=[.18,.35,.6,.86,1,.72,.45,.18];
const opacity=[1,.95,.9,.85,.7,.5,.3,.12];
const duration=durations.reduce((sum,value)=>sum+value,0);
function sample(elapsed) {
    if(!Number.isFinite(elapsed) || elapsed<0 || elapsed>=duration)return null;
    let end=0;
    for(let frame=0;frame<durations.length;frame++) {
        end+=durations[frame];
        if(elapsed<end)return {frame,radius:32*radii[frame],opacity:opacity[frame]};
    }
    return null;
}
module.exports={sample,duration,durations};
