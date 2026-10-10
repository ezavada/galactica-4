// Numeric commands from shipped v3 Mcmd resources and GalacticaConsts.h.
// Preferences 27 is shipped in the English CD-ROM File menu.
// Galactica.cpp also normalizes synthetic command 1324679167.
const commands=Object.freeze({about:1,newGame:2,open:3,close:4,save:5,saveAs:6,revert:7,quit:10,
    fullscreen:4016,sound:4017,preferences:27,controlHelp:0x4069FFFC,help:0x4069FFFA,tutorial:0x4069FFF9});
function read(env=globalThis){
    try{
        const value=env.window?env.window.localStorage.getItem('galactica.StartAction'):env.pdg.cfg.getConfigLong('StartAction');
        if(value===undefined || value===null || (typeof value==='string' && !/^[+-]?\d+$/.test(value.trim())))return commands.newGame;
        const number=typeof value==='string'?Number(value):value;
        return Number.isInteger(number) && number>=-2147483648 && number<=2147483647?number:commands.newGame;
    }catch(error){return commands.newGame;}
}
// File pickers, manual tabs and fullscreen cannot open during unactivated browser startup. Consume the first
// trusted input before it reaches the map/setup, then open synchronously.
function withUserGesture(open,env=globalThis){
    if(!env.document || (env.navigator && env.navigator.userActivation && env.navigator.userActivation.isActive))return open();
    const document=env.document;
    if(!document.addEventListener)return false;
    const gesture=event=>{
        if(!event.isTrusted)return;
        document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);
        event.preventDefault();event.stopImmediatePropagation();open();
    };
    document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);
    return true;
}
function dispatch(command,services,env=globalThis){
    if(command===1324679167)command=commands.preferences;
    const action=Object.keys(commands).find(key=>commands[key]===command);
    if(!action || typeof services[action]!=='function')return false;
    return ['open','help','fullscreen'].includes(action)?withUserGesture(services[action],env):services[action]();
}
function preferenceServices(preferences,sound,settings,controlHelpChanged=()=>{}){
    return {
        preferences:()=>settings.open(),
        sound:()=>{sound.setEnabled(!sound.isEnabled());return true;},
        controlHelp:()=>{const enabled=!preferences.readControlHelp();preferences.writeControlHelp(enabled);controlHelpChanged(enabled);return true;}
    };
}
module.exports={commands,read,dispatch,withUserGesture,preferenceServices};
