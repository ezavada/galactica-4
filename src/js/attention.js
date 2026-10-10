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
        this.queue.push({object,handled:false});
        if(notify && object.owner===this.game.getCurrentHumanPlayer())this.game.recordEvent(
            I18n.getString(744,'Attention'),I18n.formatString(745,'{0} requests orders',this.game.getObjectDisplayName(object)),{type:'callIn'});
        return true;
    }
    pending() {
        return this.queue.filter(entry=>!entry.handled && this.isHumanObject(entry.object) &&
            entry.object.owner===this.game.getCurrentHumanPlayer());
    }
    attend(object) { const entry=this.pending().find(entry=>entry.object===object);if(entry)entry.handled=true; }
    next() {
        const entry=this.pending()[0];if(!entry)return false;
        entry.handled=true;this.game.uiWindow=null;this.game.setSelectedObject(entry.object);
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
