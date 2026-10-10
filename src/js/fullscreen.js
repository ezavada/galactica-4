// Native PDG fullscreen and browser user-gesture fullscreen share actual state.
function createController(pdg,port,env=globalThis) {
    const canvas=env.document && env.document.getElementById('pdg-canvas');
    const browser=!!env.document;
    const target=browser && env.document.documentElement;
    const supported=browser?!!(canvas && target && target.requestFullscreen && env.document.exitFullscreen && env.document.fullscreenEnabled):
        !!(pdg.gfx.switchToFullScreenMode && pdg.gfx.switchToWindowMode && pdg.gfx.inFullScreenMode);
    const controller={supported,pending:false,error:false,
        active:()=>browser?env.document.fullscreenElement===target:!!pdg.gfx.inFullScreenMode(),
        toggle() {
            if(!supported || controller.pending)return false;
            controller.error=false;
            try {
                if(!browser) {
                    const result=controller.active()?pdg.gfx.switchToWindowMode(port):pdg.gfx.switchToFullScreenMode(false,port);
                    controller.error=!result;
                    return !!result;
                }
                controller.pending=true;
                const result=controller.active()?env.document.exitFullscreen():target.requestFullscreen();
                Promise.resolve(result).then(()=>{controller.pending=false;},()=>{controller.pending=false;controller.error=true;});
                return true;
            } catch(error) {controller.pending=false;controller.error=true;return false;}
        }
    };
    return controller;
}
module.exports={createController};
