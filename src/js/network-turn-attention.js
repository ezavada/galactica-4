// V3 GalacticaClient::HandleTurnComplete plays snd_Warning (1002) when
// the downloaded turn belongs to a background document or application.
function applicationFocused(env=globalThis){
    const document=env.document;
    if(!document)return true; // Native application activation is not exposed by PDG 1.2.
    if(document.hidden || document.visibilityState==='hidden')return false;
    return typeof document.hasFocus!=='function' || document.hasFocus();
}
class TurnAttention {
    constructor(sound){this.sound=sound;this.observed=new WeakMap();}
    receive(session,model,{front=true,focused=true}={}){
        if(!session || !model || !Number.isSafeInteger(model.turn) || model.turn<1)return false;
        const previous=session.game;
        const identity=model.clientGameId || session.network?.identity?.gameId;
        if(!identity)return false;
        const known=this.observed.get(session);
        const same=known && known.identity===identity;
        const baseline=same?known.turn:previous?.clientGameId===identity?previous.turn:model.turn;
        const advanced=model.turn>baseline;
        this.observed.set(session,{identity,turn:Math.max(baseline,model.turn)});
        // Receiving a duplicate, an initial login or a stale response must not
        // produce a warning. Muted arrivals stay consumed after Sound is enabled.
        if(!advanced || front && focused || !model.shouldShowEventWindows())return false;
        return this.sound.play(1002);
    }
}
module.exports={TurnAttention,applicationFocused};
