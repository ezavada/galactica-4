// Shipped v3 event sounds. Audio state belongs to the application, not saves.
const Common=require('./common.js');
const Destruction=require('./destruction-effect.js');
const available=new Set([1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,7000]);
function eventCue(event,viewer=event && event.recipient) {
    if(!event)return null;
    if(event.outcome && Number.isInteger(event.outcome.playerNum) && event.outcome.playerNum>0) {
        if(event.outcome.kind==='defeat')return event.outcome.playerNum===viewer?1004:1006;
        if(event.outcome.kind==='win')return event.outcome.playerNum===viewer?1005:null;
    }
    if(event.playerMessage)return 1003;
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
    // Fleet formation, tech levels and draw notices have no shipped audible sample.
    return null;
}
function createSound(resourceManager,preferences,now=()=>pdg.tm.getMilliseconds(),schedule={start:callback=>setInterval(callback,50),stop:timer=>clearInterval(timer)}) {
    let enabled=preferences.readSound(),musicEnabled=preferences.readMusic?preferences.readMusic():true;
    const cache=new Map(),presentations=new WeakMap();
    const stop=()=>{for(const sound of cache.values())try{sound.stop();}catch(error){/* Backend may be unavailable. */}};
    // Presentation music has its own handle: event cues and document changes
    // must not interrupt its dismissal fade.
    let music=null,musicRequested=false,musicPlaying=false,fadeStarted=null,fadeTimer=null;
    const stopMusic=()=>{
        if(fadeTimer!==null){schedule.stop(fadeTimer);fadeTimer=null;}
        try{if(music)music.stop();}catch(error){/* Backend may be unavailable. */}
        musicPlaying=false;fadeStarted=null;
    };
    const startMusic=()=>{
        musicRequested=true;
        if(!enabled || !musicEnabled)return false;
        // Credits can reopen while the opening track is still fading. Keep
        // that playback rather than stopping/restarting a native audio queue.
        if(musicPlaying && music){
            if(fadeTimer!==null){schedule.stop(fadeTimer);fadeTimer=null;}
            fadeStarted=null;
            try{music.setVolume(1);return true;}catch(error){stopMusic();return false;}
        }
        stopMusic();
        try{
            if(!music)music=resourceManager.getSound('sounds/startup.wav');
            if(!music)return false;
            music.setLooping(true);music.setVolume(1);music.start();musicPlaying=true;return true;
        }catch(error){stopMusic();return false;}
    };
    const endMusic=()=>{
        musicRequested=false;
        if(!musicPlaying || fadeStarted!==null)return false;
        fadeStarted=now();fadeTimer=schedule.start(update);
        if(fadeTimer && typeof fadeTimer.unref==='function')fadeTimer.unref();
        return true;
    };
    const update=()=>{
        if(fadeStarted===null)return false;
        const elapsed=Math.max(0,now()-fadeStarted);
        try{
            music.setVolume(Math.max(0,1-elapsed/5000));
            if(elapsed>=5000)stopMusic();
            return true;
        }catch(error){stopMusic();return false;}
    };
    const play=id=>{
        if(!enabled || !available.has(id))return false;
        try {
            let sound=cache.get(id);
            if(!sound){sound=resourceManager.getSound((id===7000?'tutorial/sounds/':'sounds/')+id+'.wav');if(!sound)return false;sound.setLooping(false);cache.set(id,sound);}
            stop();sound.start();return true;
        } catch(error){return false;}
    };
    return {
        isEnabled:()=>enabled,
        isMusicEnabled:()=>musicEnabled,
        setMusicEnabled(value){
            const changed=musicEnabled!==!!value;musicEnabled=!!value;
            if(preferences.writeMusic)preferences.writeMusic(musicEnabled);
            if(!musicEnabled)stopMusic();else if(changed && enabled && musicRequested)startMusic();
            return musicEnabled;
        },
        setEnabled(value){
            const changed=enabled!==!!value || musicEnabled!==!!value;
            enabled=musicEnabled=!!value;preferences.writeSound(enabled);
            if(preferences.writeMusic)preferences.writeMusic(musicEnabled);
            if(!enabled){stop();stopMusic();}else if(changed && musicRequested)startMusic();
            return enabled;
        },
        stop,play,startMusic,endMusic,update,
        isPending:overlay=>enabled && presentations.has(overlay) && !presentations.get(overlay).cue,
        noMore(game){
            if(!game.shouldShowEventWindows() || game.hasEventPresentation() || game.pendingMapOrderObject ||
                    game.pendingRendezvousPlacement || game.uiSliderDrag || game.uiMapScrollDrag)return false;
            return play(1012);
        },
        attention(game,event){
            if(!game.shouldShowEventWindows() || event && !game.isEventAccessible(event))return false;
            return play(event?eventCue(event,game.getCurrentHumanPlayer?game.getCurrentHumanPlayer():event.recipient):1001);
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
            return play(overlay.type==='lab'?1013:overlay.type==='stardock'?1011:eventCue(event,game.getCurrentHumanPlayer?game.getCurrentHumanPlayer():event && event.recipient));
        }
    };
}
module.exports={createSound,eventCue};
