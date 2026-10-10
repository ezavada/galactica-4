// Shared ship/fleet navigation, adapted from CShip's CourseT and waypoint API.
const Common = require('./common.js');
class Course {
    constructor(owner) {
        this.owner = owner;
        this.waypoints = [];
        this.current = 0;
        this.previous = -1;
        this.loop = false;
        this.hasOrigin = false;
        this.revision = 0;
    }
    point(target) {
        if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
        if (target === this.owner) target = {x:this.owner.x,y:this.owner.y};
        return {target,x:target.x,y:target.y};
    }
    resolve(waypoint) {
        const target = waypoint.target, game = this.owner.game;
        const type = game && game.getObjectType ? game.getObjectType(target) : Common.ObjectType.UNKNOWN;
        const removed = type === Common.ObjectType.SHIP && game.allShips && !game.allShips.includes(target) ||
            type === Common.ObjectType.FLEET && game.allFleets && !game.allFleets.includes(target) ||
            type === Common.ObjectType.STAR && game.stars && !game.stars.includes(target) ||
            type === Common.ObjectType.RENDEZVOUS && game.allRendezvous && !game.allRendezvous.includes(target);
        if (removed) return {x:target.x,y:target.y};
        waypoint.x=target.x;waypoint.y=target.y;
        return target;
    }
    get destination() {
        if (!this.waypoints.length) return null;
        // v3 GetWaypoint falls back to the current position for an out-of-range
        // active index. Arrival then completes the course on the next turn.
        return this.current < this.waypoints.length ? this.resolve(this.waypoints[this.current])
            : {x:this.owner.x,y:this.owner.y};
    }
    changed() {
        if(this.loop && this.waypoints.length && this.current>=this.waypoints.length)this.current=0;
        this.revision++;
        if (this.owner.calculateMovement) this.owner.calculateMovement();
    }
    clear() {
        this.waypoints=[];this.current=0;this.previous=-1;this.loop=false;this.hasOrigin=false;
        this.changed();
    }
    replace(target) {
        const point=this.point(target);
        this.waypoints=point?[point]:[];this.current=0;this.previous=-1;this.loop=false;this.hasOrigin=false;
        this.changed();
    }
    insert(target,index=this.waypoints.length) {
        const point=this.point(target);
        if (!point || !Number.isInteger(index) || index<0 || index>this.waypoints.length) return false;
        this.waypoints.splice(index,0,point);
        this.changed();return true;
    }
    edit(index,target) {
        const point=this.point(target);
        if (!point || !Number.isInteger(index) || index<0 || index>=this.waypoints.length) return false;
        this.waypoints[index]=point;this.changed();return true;
    }
    delete(index) {
        if (!Number.isInteger(index) || index<0 || index>=this.waypoints.length) return false;
        this.waypoints.splice(index,1);
        if (!this.waypoints.length || this.hasOrigin && this.waypoints.length===1) this.clear();
        else {if(this.loop && this.current>=this.waypoints.length)this.current=0;this.changed();}
        return true;
    }
    addPlayerWaypoint(target,index=null) {
        if (!this.point(target) || index!==null && (!Number.isInteger(index) || index<0 || index>this.waypoints.length)) return false;
        if (!this.waypoints.length) {
            const origin=this.owner.star || {x:this.owner.x,y:this.owner.y};
            this.waypoints=[this.point(origin)];this.hasOrigin=true;this.current=1;this.previous=0;
        } else if (index===null && this.waypoints.length===2 && this.owner.type==='scout') {
            this.loop=true; // CbxNaPanel's second appended courier destination.
        }
        return this.insert(target,index===null?this.waypoints.length:index);
    }
    advance(revision) {
        if (revision!==this.revision || !this.waypoints.length) return;
        this.previous=this.current;this.current++;
        if(this.current>=this.waypoints.length) {
            if(this.loop && this.waypoints.length>1)this.current=0;
            else {this.clear();if(this.owner.setPatrol)this.owner.setPatrol(false);return;}
        }
        this.changed();
    }
}
module.exports=Course;
