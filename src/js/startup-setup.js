// The seven choices and menu order are from v3 CGameSetupAttach.cpp.
const advantages=Object.freeze([3,2,1,0,-1,-2,-3]);
function panelRect(width,height) {
    const panelWidth=Math.min(560,width-40),panelHeight=Math.min(480,height-40);
    return {x:(width-panelWidth)/2,y:Math.max(20,(height-panelHeight)/2),width:panelWidth,height:panelHeight};
}
function advantageRegions(rect,config) {
    const scale=rect.height/480,gap=6,width=(rect.width-68-gap*6)/7;
    return advantages.map((value,index)=>({value,label:value>0?'+'+value:String(value),active:config.compAdvantage===value,
        rect:{x:rect.x+34+index*(width+gap),y:rect.y+174*scale,width,height:28*scale}}));
}
function setAdvantage(config,value) {
    if(!advantages.includes(value))return false;
    config.compAdvantage=value;return true;
}
function cycleAdvantage(config) {
    return setAdvantage(config,advantages[(advantages.indexOf(config.compAdvantage)+1)%advantages.length]);
}
function clickAdvantage(config,rect,x,y) {
    const choice=advantageRegions(rect,config).find(({rect:r})=>x>=r.x && x<r.x+r.width && y>=r.y && y<r.y+r.height);
    return choice?setAdvantage(config,choice.value):false;
}
module.exports={advantages,panelRect,advantageRegions,setAdvantage,cycleAdvantage,clickAdvantage};
