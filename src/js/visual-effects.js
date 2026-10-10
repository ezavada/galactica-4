// Presentation-only motion: never consumes the simulation RNG or changes hit areas.
class VisualEffects {
    constructor(reducedMotion=false) {this.reducedMotion=reducedMotion;this.channels=new Map();}
    twinkleFrame(visibleIds,milliseconds) {
        if(this.reducedMotion || !visibleIds.length)return null;
        const interval=1800,duration=320;
        const phase=((milliseconds%interval)+interval)%interval;
        if(phase>=duration)return null;
        const slot=Math.floor(milliseconds/interval);
        let selected=null,best=Infinity;
        for(const id of visibleIds) {
            let hash=Math.imul(id ^ Math.imul(slot+1,0x9e3779b1),0x85ebca6b)>>>0;
            hash=(hash ^ (hash>>>16))>>>0;
            if(hash<best || hash===best && id<selected){best=hash;selected=id;}
        }
        return {id:selected,strength:Math.sin(Math.PI*phase/duration)**2};
    }
    rendezvousPulse(milliseconds) {
        return this.reducedMotion?0:(1-Math.cos(2*Math.PI*milliseconds/2200))/2;
    }
    parallax(camera) {
        if(this.reducedMotion)return {x:0,y:0};
        return {x:-8*Math.tanh(camera.panX*camera.scale/400),y:-8*Math.tanh(camera.panY*camera.scale/400)};
    }
    transition(channel,key,milliseconds) {
        let state=this.channels.get(channel);
        if(!state){state={key:null,start:milliseconds,closing:false};this.channels.set(channel,state);}
        if(state.key!==key){state.closing=!!state.key && !key;state.key=key;state.start=milliseconds;}
        else if(milliseconds<state.start)state.start=milliseconds-(key?120:85);
        if(this.reducedMotion)return {opacity:key?1:0,offset:0};
        const elapsed=Math.max(0,milliseconds-state.start);
        if(!key)return {opacity:state.closing?Math.max(0,1-elapsed/85):0,offset:0};
        const progress=Math.min(1,elapsed/120),ease=1-(1-progress)**3;
        return {opacity:0.92+0.08*ease,offset:2*(1-ease)};
    }
}
module.exports=VisualEffects;
