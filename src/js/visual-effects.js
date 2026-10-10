// Presentation-only motion: never consumes the simulation RNG or changes hit areas.
class VisualEffects {
    constructor(reducedMotion=false) {this.reducedMotion=reducedMotion;this.channels=new Map();}
    twinkle(id,milliseconds) {
        if(this.reducedMotion)return 0;
        const hash=Math.imul(id,2654435761)>>>0;
        if(hash%7)return 0;
        const phase=((milliseconds+hash%21000)%21000+21000)%21000;
        return phase<800?Math.sin(Math.PI*phase/800)**2:0;
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
