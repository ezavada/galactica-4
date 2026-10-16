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
    starBrightness(id,milliseconds) {
        if(this.reducedMotion)return 1;
        const hash=Math.imul(id,0x9e3779b1)>>>0;
        const period=4800+hash%4801,phase=hash%period;
        // Leave room above the average so white stars can brighten without clipping.
        return .9*(1+.1*Math.sin(2*Math.PI*(milliseconds+phase)/period));
    }
    rendezvousPulse(milliseconds) {
        return this.reducedMotion?0:(1-Math.cos(2*Math.PI*milliseconds/4400))/2;
    }
    parallax(camera) {
        if(this.reducedMotion)return {x:0,y:0};
        const zoom=camera.zoom ?? 1;
        const depth=.01*zoom*Math.max(0,zoom-(camera.minZoom ?? .1));
        return {x:-camera.panX*camera.scale*depth,y:-camera.panY*camera.scale*depth};
    }
    decorativeStars(bounds,mapWidth,mapHeight) {
        const cell=256*1024,stars=[];
        for(let row=Math.floor(bounds.top/cell);row<=Math.floor(bounds.bottom/cell);row++) {
            for(let col=Math.floor(bounds.left/cell);col<=Math.floor(bounds.right/cell);col++) {
                let hash=(Math.imul(col,0x85ebca6b)^Math.imul(row,0xc2b2ae35)^0x27d4eb2f)>>>0;
                hash=Math.imul(hash^(hash>>>16),0x7feb352d)>>>0;
                const x=(col+.12+.76*(hash&65535)/65535)*cell;
                const y=(row+.12+.76*(hash>>>16)/65535)*cell;
                if(x>=0 && x<=mapWidth && y>=0 && y<=mapHeight)continue;
                if(x<bounds.left || x>bounds.right || y<bounds.top || y>bounds.bottom)continue;
                stars.push({x,y,tone:hash%4});
            }
        }
        return stars;
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
