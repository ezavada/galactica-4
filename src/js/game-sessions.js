// Local game documents remain in memory while another game or setup is active.
class GameSessions {
    constructor() {this.sessions=[];this.active=null;this.starting=true;this.nextId=1;this.transient=null;}
    beginTransient() {
        if(this.transient)return false;
        this.transient={active:this.active,starting:this.starting};this.active=null;this.starting=true;return true;
    }
    endTransient() {
        if(!this.transient)return false;
        const previous=this.transient;this.transient=null;this.active=previous.active;this.starting=previous.starting;return previous;
    }
    promoteTransient(game,display) {
        if(!this.transient || this.starting || !this.active || this.active.id!==0 ||
                this.active.game!==game || this.active.display!==display)return false;
        const session=this.active;
        session.id=this.nextId++;this.sessions.push(session);this.transient=null;
        return session;
    }
    begin() {if(this.starting)return false;this.starting=true;return true;}
    cancel() {if(!this.starting || !this.active)return false;this.starting=false;return true;}
    accept(game,display) {
        if(!this.starting || !game || !display)return false;
        const session={id:this.transient?0:this.nextId++,game,display,autoplay:null};
        if(!this.transient)this.sessions.push(session);this.active=session;this.starting=false;return session;
    }
    select(id) {
        if(this.starting || this.transient)return false;
        const session=this.sessions.find(session=>session.id===id);
        if(!session)return false;
        this.active=session;return session;
    }
    replace(game,display) {
        if(this.starting || this.transient || !this.active)return false;
        const session=this.active;session.game=game;session.display=display;session.autoplay=null;return session;
    }
    rows() {return this.sessions.map(session=>({id:session.id,title:session.game.config.gameTitle,
        turn:session.game.turn,active:session===this.active}));}
}
module.exports=GameSessions;
