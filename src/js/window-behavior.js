// Application windows share modality, palette and persistent viewport positions.
const systemWindows=new Set(['report','presentation','menu','games','comparison','systemComparison','fleets','settings','newGameDefaults','view','mapDisplay','colonyDefaults','endTurnConfirm']);
function isSystem(name){return systemWindows.has(name);}
function constrain(rect,screen){
    const width=Math.min(rect.width,Math.max(1,screen.width-20));
    const height=Math.min(rect.height,Math.max(1,screen.height-20));
    return {...rect,width,height,x:Math.max(10,Math.min(screen.width-width-10,rect.x)),
        y:Math.max(10,Math.min(screen.height-height-10,rect.y))};
}
function validPosition(value){return value && Number.isFinite(value.x) && Number.isFinite(value.y)?{x:value.x,y:value.y}:null;}
module.exports={isSystem,constrain,validPosition};
