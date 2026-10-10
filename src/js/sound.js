// Shipped v3 event sounds. Audio state belongs to the application, not saves.
const Common=require('./common.js');
const Destruction=require('./destruction-effect.js');
const available=new Set([1000,1001,1002,1003,1007,1008,1009,1010,1011,1012,1013,1014]);
function eventCue(event) {
    if(!event)return null;
    if(event.colonization)return event.observer?1014:1011;
    if(event.occupation) {
        const report=event.occupation;
        if(report.kind==='capture')return report.side==='observer'?1014:report.side==='attacker'?1009:1010;
        return report.side==='attacker'?1007:report.side==='defender'?1008:null;
    }
    if(event.destruction)return event.destruction.side==='winner'?1007:event.destruction.side==='loser'?1008:null;
    if(event.combat)return event.combat.result==='won'?1007:event.combat.result==='lost'?1008:null;
    if(event.repair)return 1001;
    if(event.type===Common.EventType.NEW_SHIP_CLASS)return event.observer?1014:1011;
    if(event.type===Common.EventType.NEW_TECH_DISCOVERY)return event.observer?1014:1013;
    if(event.type===Common.EventType.SHIP_BUILT)return event.observer?1014:1001;
    if(event.type===Common.EventType.RENAME_COLONY || event.type==='callIn')return 1001;
    // Fleet formation, tech levels and outcomes have no shipped audible sample.
    return null;
}
function createSound(resourceManager,preferences) {
    let enabled=preferences.readSound();
    const cache=new Map(),presentations=new WeakMap();
    const stop=()=>{for(const sound of cache.values())try{sound.stop();}catch(error){/* Backend may be unavailable. */}};
    const play=id=>{
        if(!enabled || !available.has(id))return false;
        try {
            let sound=cache.get(id);
            if(!sound){sound=resourceManager.getSound('sounds/'+id+'.wav');if(!sound)return false;sound.setLooping(false);cache.set(id,sound);}
            stop();sound.start();return true;
        } catch(error){return false;}
    };
    return {
        isEnabled:()=>enabled,
        setEnabled(value){enabled=!!value;preferences.writeSound(enabled);if(!enabled)stop();return enabled;},
        stop,play,
        isPending:overlay=>enabled && presentations.has(overlay) && !presentations.get(overlay).cue,
        noMore(game){
            if(!game.shouldShowEventWindows() || game.hasEventPresentation() || game.pendingMapOrderObject ||
                    game.pendingRendezvousPlacement || game.uiSliderDrag || game.uiMapScrollDrag)return false;
            return play(1012);
        },
        attention(game,event){
            if(!game.shouldShowEventWindows() || event && !game.isEventAccessible(event))return false;
            return play(event?eventCue(event):1001);
        },
        present(game,overlay,exploding){
            if(!overlay || !game.shouldShowEventWindows())return false;
            const event=game.eventLog.find(item=>item.id===overlay.eventId);
            if(overlay.type==='report' && !game.isEventAccessible(event))return false;
            let state=presentations.get(overlay);
            const now=game.getCurrentMilliseconds();
            if(!state){
                const explosion=exploding || overlay.type==='report' && game.getReportDestructionPosition && !!game.getReportDestructionPosition(event);
                state={cue:!enabled,due:explosion?now+Destruction.duration+20*1000/60:now};presentations.set(overlay,state);
                if(explosion){play(1000);return false;}
            }
            if(exploding || now<state.due || state.cue)return false;
            state.cue=true;
            return play(overlay.type==='lab'?1013:overlay.type==='stardock'?1011:eventCue(event));
        }
    };
}
module.exports={createSound,eventCue};
