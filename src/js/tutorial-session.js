// Own a temporary tutorial document without replacing ordinary open documents.
const Controller=require('./tutorial-controller.js'),Runtime=require('./tutorial-runtime.js');
class TutorialSession {
    constructor(pages,options){
        if(!options || !options.sessions || typeof options.captureApplication!=='function' ||
            typeof options.suspendApplication!=='function' || typeof options.restoreApplication!=='function' ||
            typeof options.installApplication!=='function')throw new Error('Invalid tutorial session');
        this.options=options;this.sessions=options.sessions;this.engaged=false;this.application=null;
        this.runtime=null;this.game=null;this.display=null;this.finished=false;
        this.controller=new Controller(pages,{macOS:options.macOS,
            onDismissWindow:options.onDismissWindow,
            onEnter:(id,page,effects)=>{if(id===1 && !this.engaged)this.engage();if(options.onEnter)options.onEnter(id,page,effects);if(options.sound)options.sound.play(page.sound);},
            onStop:reason=>this.release(reason)});
    }
    start(context={}){
        if(this.controller.active || this.finished)return false;
        try{this.controller.start(context);return true;}catch(error){this.stop('error');throw error;}
    }
    engage(){
        if(this.engaged)return false;
        const application=this.options.captureApplication();
        if(!this.sessions.beginTransient())throw new Error('Another temporary document is active');
        this.application=application;this.engaged=true;
        try{this.options.suspendApplication(application);}catch(error){this.release('error');throw error;}
        return true;
    }
    openSetup(){
        if(!this.engaged || this.controller.pageId!==2)return false;
        return this.controller.observe({type:'newGameOpened',hosting:false,window:34}).advanced;
    }
    openHosting(open){
        if(!this.engaged || !this.controller.active || ![2,3].includes(this.controller.pageId) || typeof open!=='function')return false;
        if(!open())return false;
        return this.controller.observe({type:'newGameOpened',hosting:true}).advanced;
    }
    hostingChanged({active,created=false}){
        if(!this.engaged || !this.controller.active || this.controller.pageId!==103)return false;
        // Source page 103 returns to New Game after Cancel. A different game
        // window ends the tutorial through its exception transition.
        if(created)return this.controller.advance(99);
        if(!active)return this.controller.advance(null);
        return false;
    }
    acceptSetup(){
        if(!this.engaged || this.controller.pageId!==3)return false;
        return this.controller.observe({type:'setupAccepted',window:4}).advanced;
    }
    install(game,display){
        if(!this.engaged || this.controller.pageId!==4 || !this.sessions.starting || !game || !display)return false;
        let runtime=null;this.game=game;this.display=display;
        try{
            runtime=new Runtime(game,this.controller);
            const session=this.sessions.accept(game,display);if(!session)throw new Error('Tutorial document was not accepted');
            this.runtime=runtime;this.game=game;this.display=display;
            this.options.installApplication(game,display,session);
            this.controller.observe({type:'playerNameAccepted',window:1},game.getCurrentMilliseconds());
            return session;
        }catch(error){if(runtime && runtime!==this.runtime)runtime.dispose();this.stop('error');throw error;}
    }
    open(game,display,reference){
        const current=this.sessions.active;
        if(!this.engaged || !this.runtime || !this.controller.active || !current ||
                current.game!==this.game || current.display!==this.display || !game || !display)return false;
        const previous={game:this.game,display:this.display,runtime:this.runtime};
        const state={sessions:this.sessions.sessions.slice(),nextId:this.sessions.nextId,id:current.id};
        previous.runtime.dispose();
        let runtime;
        try{
            runtime=new Runtime(game,this.controller);
            if(previous.game.tutorialSimulation)game.tutorialSimulation=previous.game.tutorialSimulation;
            const session=this.sessions.openDuringTransient(game,display);
            if(!session)throw new Error('Tutorial document could not be opened');
            session.file=reference;this.game=game;this.display=display;this.runtime=runtime;
            this.options.installApplication(game,display,session);
            delete previous.game.tutorialSimulation;
            return session;
        }catch(error){
            if(runtime)runtime.dispose();delete game.tutorialSimulation;
            this.sessions.sessions=state.sessions;this.sessions.nextId=state.nextId;
            this.sessions.active=current;current.id=state.id;
            this.game=previous.game;this.display=previous.display;
            this.runtime=new Runtime(previous.game,this.controller);
            this.runtime.roleIds={...previous.runtime.roleIds};
            if(display.dispose)display.dispose();
            throw error;
        }
    }
    revert(game,display,reference){
        const session=this.sessions.active;
        if(!this.engaged || !this.runtime || !this.controller.active || !session ||
                session.game!==this.game || session.display!==this.display ||
                !game || !display)return false;
        const previous={game:this.game,display:this.display,runtime:this.runtime,file:session.file};
        const roles={...previous.runtime.roleIds};
        previous.runtime.dispose();
        let runtime;
        try{
            runtime=new Runtime(game,this.controller);
            runtime.roleIds=roles;
            if(previous.game.tutorialSimulation)game.tutorialSimulation=previous.game.tutorialSimulation;
            this.game=game;this.display=display;this.runtime=runtime;
            session.game=game;session.display=display;session.file=reference;session.autoplay=null;
            this.options.installApplication(game,display,session);
        }catch(error){
            if(runtime)runtime.dispose();
            delete game.tutorialSimulation;
            this.game=previous.game;this.display=previous.display;
            this.runtime=new Runtime(previous.game,this.controller);this.runtime.roleIds=roles;
            session.game=previous.game;session.display=previous.display;session.file=previous.file;
            if(display.dispose)display.dispose();
            throw error;
        }
        delete previous.game.tutorialSimulation;
        if(previous.display.dispose)previous.display.dispose();
        return session;
    }
    pressButton(context={}){return this.controller.pressButton(context);}
    stop(reason='cancel'){return this.controller.stop(reason);}
    release(reason){
        if(this.finished)return;this.finished=true;
        const application=this.application,engaged=this.engaged,game=this.game,display=this.display,runtime=this.runtime;
        const ordinary=this.sessions.sessions.some(session=>session.game===game && session.display===display);
        let retained=false;
        this.engaged=false;this.application=null;this.runtime=null;this.game=null;this.display=null;
        try{
            if(this.options.sound)this.options.sound.stop();
            if(runtime)runtime.dispose();
            if(game)delete game.tutorialSimulation;
            // V3 stops the instructions, not the practice game. Keep its graph,
            // camera and file association; its scripted simulation ends here.
            if(reason==='complete' && game && display && this.sessions.finishTransient(game,display))retained=true;
        }
        finally{
            try{if(!retained && !ordinary && display && display.dispose)display.dispose();}
            finally{
                if(engaged && !retained)this.sessions.endTransient();
                try{if(engaged && !retained)this.options.restoreApplication(application,reason);}
                finally{if(this.options.onStop)this.options.onStop(reason);}
            }
        }
    }
}
module.exports=TutorialSession;
