// Resolve the front application window for the shipped tutorial recovery rules.
const Windows=require('./window-behavior.js');
function current(state) {
    if(state.manualError)return {window:'manualError',modal:true};
    if(state.documentDialog)return {window:'documents',modal:true};
    if(state.settingsWindow)return {window:state.settingsWindow,modal:true};
    if(state.starting || !state.game){
        if(state.playerName)return {window:4,modal:true};
        if(state.titleEditor || state.computerEditor || state.skillMenu)return {window:'setupEditor',modal:true};
        return {window:34,modal:true};
    }
    const game=state.game;
    if(game.overlay && ['report','outcome','lab','stardock'].includes(game.overlay.type))return {window:'report',modal:true};
    if(Windows.isSystem(game.uiWindow))return {window:game.uiWindow,modal:true};
    return {window:1,modal:false};
}
module.exports={current};
