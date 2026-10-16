// Capture installation state before other preference factories create/use config.
function createInstallation(env=globalThis){
    let first=false,storage=null,config=null;
    try{
        if(env.window){
            storage=env.window.localStorage;
            let existing=false;
            for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key && key.startsWith('galactica.')){existing=true;break;}}
            first=!existing;
        }else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;first=config.useConfig('Galactica')===false;}
    }catch(error){/* Unknown installation state does not interrupt startup. */}
    return {
        first,
        remember(){try{if(storage)storage.setItem('galactica.installationStarted','true');else if(config)config.setConfigString('installationStarted','true');}catch(error){/* Startup remains usable without storage. */}}
    };
}
class StartupLifecycle {
    constructor(installation,tutorial,manual,action=()=>{}){this.installation=installation;this.tutorial=tutorial;this.manual=manual;this.pending=installation.first;this.started=false;this.finished=false;this.action=action;}
    start(showIntroduction){
        if(this.started)return false;
        this.started=true;this.installation.remember();
        if(!showIntroduction)this.finishIntroduction();
        return true;
    }
    consume(){this.pending=false;}
    finishIntroduction(){
        if(!this.started || this.finished)return false;
        this.finished=true;
        const onboarding=this.pending;this.consume();
        try{
            if(onboarding){
                let active=false;
                try{active=!!this.tutorial();}catch(error){/* As in v3, try the manual when tutorial startup fails. */}
                if(!active)this.manual();
            }
        }finally{this.action();}
        return onboarding;
    }
}
module.exports={createInstallation,StartupLifecycle};
