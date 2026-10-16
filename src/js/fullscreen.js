// Native PDG fullscreen and browser user-gesture fullscreen share actual state.
function createController(pdg,port,env=globalThis,preferences=null) {
    const canvas=env.document && env.document.getElementById('pdg-canvas');
    const browser=!!env.document;
    const target=browser && env.document.documentElement;
    const supported=browser?!!(canvas && target && target.requestFullscreen && env.document.exitFullscreen && env.document.fullscreenEnabled):
        !!(pdg.gfx.switchToFullScreenMode && pdg.gfx.switchToWindowMode && pdg.gfx.inFullScreenMode);
    const save=()=>{if(preferences)preferences.writeFullscreen(controller.active());};
    const clearRestore=()=>{
        controller.restorePending=false;
        if(browser && env.document.removeEventListener){env.document.removeEventListener('click',restoreOnGesture);env.document.removeEventListener('keydown',restoreOnGesture);}
    };
    const restoreOnGesture=()=>{clearRestore();if(!controller.active())controller.toggle();};
    const controller={supported,pending:false,error:false,restorePending:false,
        restore(){
            if(!supported || !preferences || !preferences.readFullscreen())return false;
            if(controller.active())return true;
            if(!browser)return controller.toggle();
            if(!env.document.addEventListener)return false;
            controller.restorePending=true;
            env.document.addEventListener('click',restoreOnGesture);env.document.addEventListener('keydown',restoreOnGesture);
            return true;
        },
        active:()=>browser?env.document.fullscreenElement===target:!!pdg.gfx.inFullScreenMode(),
        toggle() {
            if(!supported || controller.pending)return false;
            clearRestore();controller.error=false;
            try {
                if(!browser) {
                    const requested=!controller.active();
                    const result=requested?pdg.gfx.switchToFullScreenMode(false,port):pdg.gfx.switchToWindowMode(port);
                    const success=!!result && controller.active()===requested;
                    controller.error=!success;
                    if(success)save();
                    return success;
                }
                controller.pending=true;
                const result=controller.active()?env.document.exitFullscreen():target.requestFullscreen();
                Promise.resolve(result).then(()=>{controller.pending=false;save();},()=>{controller.pending=false;controller.error=true;});
                return true;
            } catch(error) {controller.pending=false;controller.error=true;return false;}
        }
    };
    if(browser && supported && env.document.addEventListener)env.document.addEventListener('fullscreenchange',save);
    return controller;
}
module.exports={createController};
