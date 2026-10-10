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
    pressButton(context={}){return this.controller.pressButton(context);}
    stop(reason='cancel'){return this.controller.stop(reason);}
    release(reason){
        if(this.finished)return;this.finished=true;
        const application=this.application,engaged=this.engaged,display=this.display,runtime=this.runtime;
        this.engaged=false;this.application=null;this.runtime=null;this.game=null;this.display=null;
        try{if(this.options.sound)this.options.sound.stop();if(runtime)runtime.dispose();}
        finally{
            try{if(display && display.dispose)display.dispose();}
            finally{
                if(engaged)this.sessions.endTransient();
                try{if(engaged)this.options.restoreApplication(application,reason);}
                finally{if(this.options.onStop)this.options.onStop(reason);}
            }
        }
    }
}
module.exports=TutorialSession;
