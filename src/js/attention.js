// Player call-ins and the current turn's attention queue.
const I18n = require('./i18n.js');
class Attention {
    constructor(game) { this.game=game; this.queue=[]; this.beforeMovement=new Map(); }
    isHumanObject(object) {
        const g=this.game;
        return !!object && !!g.players[object.owner] && !g.players[object.owner].isComputer &&
            (g.factory.isFleet(object) ? g.allFleets.includes(object) && !object.isEmpty()
                : g.allShips.includes(object) && !object.isDead() && !object.underConstruction() && !object.fleet && object.type!=='defense');
    }
    request(object, notify=true) {
        if(!this.isHumanObject(object) || this.queue.some(entry=>entry.object===object))return false;
        const entry={object,handled:false};this.queue.push(entry);
        if(notify && object.owner===this.game.getCurrentHumanPlayer())entry.event=this.game.recordEvent(
            I18n.getString(744,'Attention'),I18n.formatString(745,'{0} requests orders',this.game.getObjectDisplayName(object)),{type:'callIn',subject:object,recipient:object.owner});
        return true;
    }
    requestEvent(event) {
        const player=this.game.players[event.recipient];
        if(!player || player.isComputer || !(event.subject || event.position) || this.queue.some(entry=>entry.event===event))return false;
        this.queue.push({object:event.subject,event,recipient:event.recipient,handled:false,eventRequest:true});return true;
    }
    handleEvent(event) { const entry=this.queue.find(entry=>entry.event===event);if(entry){entry.handled=true;if(entry.event)entry.event.handled=true;} }
    pending() {
        return this.queue.filter(entry=>!entry.handled && (entry.eventRequest
            ?entry.recipient===this.game.getCurrentHumanPlayer() && !!this.game.getEventFocus(entry.event)
            :this.isHumanObject(entry.object) && entry.object.owner===this.game.getCurrentHumanPlayer()));
    }
    attend(object) { const entry=this.pending().find(entry=>entry.object===object);if(entry){entry.handled=true;if(entry.event)entry.event.handled=true;} }
    next() {
        this.game.turnAttentionPending=false;
        const entry=this.pending()[0];
        if(!entry){if(this.game.sound)this.game.sound.noMore(this.game);return false;}
        entry.handled=true;if(entry.event) {
            this.game.focusEvent(entry.event,true);
            if(entry.event.automatic===false && this.game.hasReplayableReport(entry.event))this.game.queueReport(entry.event,false,true);
            else if(this.game.sound)this.game.sound.attention(this.game,entry.event);
            return true;
        }
        if(this.game.sound)this.game.sound.attention(this.game);
        this.game.uiWindow=null;this.game.setSelectedObject(entry.object,{attend:false});
        if(this.game.display)this.game.display.centerOn(entry.object.x,entry.object.y);
        return true;
    }
    beginTurn() {
        this.queue=[];this.beforeMovement=new Map();
        for(const object of [...this.game.allShips,...this.game.allFleets]) {
            if(this.isHumanObject(object))this.beforeMovement.set(object,!!object.destination);
        }
    }
    finishTurn() {
        const g=this.game;
        for(const object of [...g.allShips,...g.allFleets]) {
            if(!this.isHumanObject(object))continue;
            const completedCourse=this.beforeMovement.get(object) && !object.destination;
            const idleInSpace=!object.destination && !object.star &&
                (object.lastCallInTurn||0)+5<=g.turn;
            if(idleInSpace)object.lastCallInTurn=g.turn;
            if(object.userCallIn || completedCourse || idleInSpace)this.request(object);
        }
    }
}
module.exports=Attention;
