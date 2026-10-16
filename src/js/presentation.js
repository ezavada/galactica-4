// Startup and About are application presentation, separate from saved games.
const I18n=require('./i18n.js');
class Presentation {
    constructor(preferences,sound=null){this.sound=sound;this.preferences=preferences;this.showSplash=preferences.readSplash();this.kind=null;this.started=0;this.offset=0;this.paused=false;this.returnWindow=null;}
    open(kind,now,returnWindow=null){
        if(!['startup','about'].includes(kind) || this.kind)return false;
        this.kind=kind;this.started=now;this.offset=0;this.paused=false;this.returnWindow=returnWindow;if(this.sound)this.sound.startMusic();return true;
    }
    toggleSplash(){this.showSplash=!this.showSplash;this.preferences.writeSplash(this.showSplash);return this.showSplash;}
    close(){const result=this.returnWindow;if(this.kind && this.sound)this.sound.endMusic();this.kind=null;return result;}
    step(delta,visibleRows,totalRows){this.paused=true;this.offset=Math.max(0,Math.min(Math.max(0,totalRows-visibleRows),this.offset+delta*visibleRows));}
    sample(now,totalRows,visibleRows,reducedMotion=false){
        if(!this.paused && !reducedMotion){
            const delay=this.kind==='about'?2000:1000,cadence=this.kind==='about'?4/60:5/60;
            const pixels=Math.max(0,(now-this.started-delay)/1000/cadence);
            return (pixels%(Math.max(1,totalRows+visibleRows)*17))-visibleRows*17;
        }
        return this.offset*17;
    }
    text(){return I18n.getString(this.kind==='about'?980:979,'').replace(/\|/g,this.kind==='about'?'\n':'\n\n');}
}
module.exports=Presentation;
