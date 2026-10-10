// V3 application defaults for the local human player's future colonies.
const keys=['defaultGrowth','defaultShips','defaultTech'];
function defaults(){return {defaultGrowth:334,defaultShips:333,defaultTech:333,defaultBuildType:1};}
function valid(value){return !!value && keys.every(key=>Number.isInteger(value[key]) && value[key]>=0 && value[key]<=1000) &&
    keys.reduce((sum,key)=>sum+value[key],0)===1000 && Number.isInteger(value.defaultBuildType) && value.defaultBuildType>=1 && value.defaultBuildType<=4;}
function normalize(value){
    const result=defaults();
    if(value && Number.isInteger(value.defaultBuildType) && value.defaultBuildType>=1 && value.defaultBuildType<=4)result.defaultBuildType=value.defaultBuildType;
    if(value && keys.every(key=>Number.isInteger(value[key]) && value[key]>=0 && value[key]<=1000)){
        const difference=1000-keys.reduce((sum,key)=>sum+value[key],0),share=Math.trunc(difference/3),remainder=difference%3;
        const adjusted={...result};for(const key of keys)adjusted[key]=value[key]+share+(key==='defaultGrowth'?remainder:0);
        if(valid(adjusted))return adjusted;
    }
    return result;
}
function createPreferences(env=globalThis){
    let storage,config;
    try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
    return {
        read(){try{return normalize(JSON.parse(storage?storage.getItem('galactica.colonyDefaults'):config?config.getConfigString('colonyDefaults'):null));}catch(error){return defaults();}},
        write(value){if(!valid(value))return false;const result=normalize(value);try{const text=JSON.stringify(result);if(storage)storage.setItem('galactica.colonyDefaults',text);else if(config)config.setConfigString('colonyDefaults',text);}catch(error){}return true;}
    };
}
function apply(game,preferences){
    // Fixed tutorial practice retains its fixture and does not write application defaults.
    if(game.tutorialSimulation)return false;
    const player=game.players[game.getCurrentHumanPlayer()];if(!player || !player.isHuman)return false;
    const value=preferences.read();player.setDefaultEconomics(value.defaultGrowth,value.defaultTech,value.defaultShips);player.setDefaultBuildType(value.defaultBuildType);return true;
}
module.exports={defaults,valid,normalize,createPreferences,apply};
