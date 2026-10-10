const PlayerName=require('./player-name.js');
const I18n=require('./i18n.js');
const maximumTitleLength=27;
function setGameTitle(config,value) {
    if(!PlayerName.validName(value,maximumTitleLength))return false;
    config.gameTitle=value.trim();return true;
}
function setComputerCount(config,value) {
    if(!Number.isInteger(value) || value<0 || value+config.numHumans<1 || value+config.numHumans>99)return false;
    config.numComputers=value;config.totalPlayers=config.numHumans+value;return true;
}
function acceptComputerCount(config,text) {
    return typeof text==='string' && /^\d{1,2}$/.test(text.trim()) && setComputerCount(config,Number(text.trim()));
}
const skills=Object.freeze([1,2,3,4,5]);
function setSkill(config,value) {if(!skills.includes(value))return false;config.compSkill=value;return true;}
function skillRegion(rect) {return {x:rect.x+28,y:rect.y+124*rect.height/540,width:rect.width-56,height:24*rect.height/540};}
function skillMenu(width,height,config) {
    const rect={x:(width-Math.min(400,width-40))/2,y:(height-300)/2,width:Math.min(400,width-40),height:300};
    return {rect,choices:skills.map((value,index)=>({value,label:I18n.getString(300+value),active:config.compSkill===value,
        rect:{x:rect.x+24,y:rect.y+58+index*34,width:rect.width-48,height:28}})),
        cancel:{x:rect.x+rect.width/2-75,y:rect.y+252,width:150,height:30}};
}
function computerCountRegion(rect) {return {x:rect.x+28,y:rect.y+96*rect.height/540,width:rect.width-56,height:24*rect.height/540};}
function setFastGame(config,value) {if(typeof value!=='boolean')return false;config.fastGame=value;return true;}
function toggleFastGame(config) {return setFastGame(config,!config.fastGame);}
function fastGameRegion(rect) {return {x:rect.x+28,y:rect.y+336*rect.height/540,width:(rect.width-62)/2,height:26*rect.height/540};}
function titleRegion(rect) {return {x:rect.x+28,y:rect.y+56*rect.height/540,width:rect.width-56,height:26*rect.height/540};}

// The seven choices and menu order are from v3 CGameSetupAttach.cpp.
const advantages=Object.freeze([3,2,1,0,-1,-2,-3]);
function panelRect(width,height) {
    const panelWidth=Math.min(560,width-40),panelHeight=Math.min(540,height-40);
    return {x:(width-panelWidth)/2,y:Math.max(20,(height-panelHeight)/2),width:panelWidth,height:panelHeight};
}
function advantageRegions(rect,config) {
    const scale=rect.height/540,gap=6,width=(rect.width-68-gap*6)/7;
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
// v3 Density Popup Menu (MENU 131) offers the numeric values 1 through 10.
const densities=Object.freeze(Array.from({length:10},(_,i)=>i+1));
function densityRegions(rect,config) {
    const scale=rect.height/540,gap=4,width=(rect.width-68-gap*9)/10;
    return densities.map((value,index)=>({value,label:String(value),active:config.density===value,
        rect:{x:rect.x+34+index*(width+gap),y:rect.y+302*scale,width,height:28*scale}}));
}
function setDensity(config,value) {
    if(!densities.includes(value))return false;
    config.density=value;return true;
}
function cycleDensity(config) {
    return setDensity(config,densities[(densities.indexOf(config.density)+1)%densities.length]);
}
function clickDensity(config,rect,x,y) {
    const choice=densityRegions(rect,config).find(({rect:r})=>x>=r.x && x<r.x+r.width && y>=r.y && y<r.y+r.height);
    return choice?setDensity(config,choice.value):false;
}
// v3 Size Popup (MENU 140): 1×1 Tiny through 5×5 Huge.
const sectorSizes=Object.freeze([1,2,3,4,5]);
function sectorSizeRegions(rect,config) {
    const scale=rect.height/540,gap=6,width=(rect.width-68-gap*4)/5;
    return sectorSizes.map((value,index)=>({value,label:`${value}×${value}`,active:config.sectorSize===value,
        rect:{x:rect.x+34+index*(width+gap),y:rect.y+238*scale,width,height:28*scale}}));
}
function setSectorSize(config,value) {
    if(!sectorSizes.includes(value))return false;
    config.sectorSize=value;return true;
}
function cycleSectorSize(config) {
    return setSectorSize(config,sectorSizes[(sectorSizes.indexOf(config.sectorSize)+1)%sectorSizes.length]);
}
function clickSectorSize(config,rect,x,y) {
    const choice=sectorSizeRegions(rect,config).find(({rect:r})=>x>=r.x && x<r.x+r.width && y>=r.y && y<r.y+r.height);
    return choice?setSectorSize(config,choice.value):false;
}
function startRegion(rect) {return {x:rect.x+rect.width/2-90,y:rect.y+467*rect.height/540,width:180,height:30*rect.height/540};}
module.exports={setFastGame,toggleFastGame,fastGameRegion,skills,setSkill,skillRegion,skillMenu,setComputerCount,acceptComputerCount,computerCountRegion,maximumTitleLength,setGameTitle,titleRegion,startRegion,advantages,panelRect,advantageRegions,setAdvantage,cycleAdvantage,clickAdvantage,densities,densityRegions,setDensity,cycleDensity,clickDensity,sectorSizes,sectorSizeRegions,setSectorSize,cycleSectorSize,clickSectorSize};
