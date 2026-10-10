// Local game documents remain in memory while another game or setup is active.
class GameSessions {
    constructor() {this.sessions=[];this.active=null;this.starting=true;this.nextId=1;}
    begin() {if(this.starting)return false;this.starting=true;return true;}
    cancel() {if(!this.starting || !this.active)return false;this.starting=false;return true;}
    accept(game,display) {
        if(!this.starting || !game || !display)return false;
        const session={id:this.nextId++,game,display,autoplay:null};
        this.sessions.push(session);this.active=session;this.starting=false;return session;
    }
    select(id) {
        if(this.starting)return false;
        const session=this.sessions.find(session=>session.id===id);
        if(!session)return false;
        this.active=session;return session;
    }
    replace(game,display) {
        if(this.starting || !this.active)return false;
        const session=this.active;session.game=game;session.display=display;session.autoplay=null;return session;
    }
    rows() {return this.sessions.map(session=>({id:session.id,title:session.game.config.gameTitle,
        turn:session.game.turn,active:session===this.active}));}
}
module.exports=GameSessions;
