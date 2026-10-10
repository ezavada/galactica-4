const Common=require('./common.js');
const modes=[
    {key:'ownership',id:774,label:'Ownership'},
    {key:'production',id:775,label:'Production'},
    {key:'tech',id:776,label:'Technology'},
    {key:'defense',id:777,label:'Defense'},
    {key:'growth',id:778,label:'Growth allocation',allocation:'growth'},
    {key:'shipbuilding',id:779,label:'Shipbuilding allocation',allocation:'shipBuilding'},
    {key:'research',id:780,label:'Research allocation',allocation:'research'}
];
const valid=key=>modes.some(mode=>mode.key===key);
function value(game,object,key,star) {
    if(!object || !object.owner || key==='ownership')return null;
    const viewer=game.getCurrentHumanPlayer() || 1;
    const allied=game.config.omniscient || game.isOwnerAlliedWith(viewer,object.owner);
    const level=allied?Common.VisibilityLevel.DETAILS:object.getVisibilityTo(viewer);
    if(key==='tech')return level>=Common.VisibilityLevel.TECH?object.techLevel:null;
    if(key==='defense')return level>=Common.VisibilityLevel.DETAILS?
        (star?object.getTotalDefenseStrength():object.getDefenseStrength())/100:null;
    if(!star || !allied)return null;
    if(key==='production')return object.getProduction()/100;
    const mode=modes.find(mode=>mode.key===key);
    return mode && mode.allocation?object[mode.allocation].desired:null;
}
// The source range is owned systems, as in v3. Unknown values never enter it.
function sample(game,key) {
    const values=new Map();let low=Infinity,high=-Infinity;
    if(key==='ownership')return {key,values,low:null,high:null};
    for(const star of game.stars) {
        const v=value(game,star,key,true);
        if(v===null || !Number.isFinite(v))continue;
        values.set(star,v);low=Math.min(low,v);high=Math.max(high,v);
    }
    return {key,values,low:values.size?low:null,high:values.size?high:null};
}
function brightness(game,object,star,state) {
    if(!state || state.key==='ownership')return 1;
    const v=star?state.values.get(object):value(game,object,state.key,false);
    if(v===undefined || v===null || !Number.isFinite(v))return star ? .6 : .05;
    if(state.low===null || state.high===state.low)return 1;
    // v3 uses 0.1 + (current-low)/(high-low), then clamps RGB channels.
    return Math.max(.1,Math.min(1,.1+(v-state.low)/(state.high-state.low)));
}
module.exports={modes,valid,value,sample,brightness};
