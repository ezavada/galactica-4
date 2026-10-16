// Application defaults are edited separately from any current game's setup.
const GameConfig=require('./game-config.js');
const ranges={sectorSize:[1,5],density:[1,10],compSkill:[1,5],compAdvantage:[-3,3]};
function defaults(){return {sectorSize:5,density:1,compSkill:2,compAdvantage:0,fastGame:true,omniscient:false};}
function valid(key,value){return ranges[key]?Number.isInteger(value) && value>=ranges[key][0] && value<=ranges[key][1]:['fastGame','omniscient'].includes(key) && typeof value==='boolean';}
function normalize(value){const result=defaults();for(const key of Object.keys(result))if(value && valid(key,value[key]))result[key]=value[key];return result;}
function createPreferences(env=globalThis){
    let storage,config;
    try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
    return {
        read(){try{return normalize(JSON.parse(storage?storage.getItem('galactica.newGameDefaults'):config?config.getConfigString('newGameDefaults'):null));}catch(error){return defaults();}},
        write(value){const result=normalize(value);try{const text=JSON.stringify(result);if(storage)storage.setItem('galactica.newGameDefaults',text);else if(config)config.setConfigString('newGameDefaults',text);}catch(error){}return result;}
    };
}
function createConfig(preferences){return new GameConfig({numComputers:2,...preferences.read()});}
function cycle(draft,key){if(!draft || !Object.hasOwn(defaults(),key))return false;const range=ranges[key];draft[key]=range?(draft[key]>=range[1]?range[0]:draft[key]+1):!draft[key];return true;}
function choices(key){const range=Object.hasOwn(ranges,key)?ranges[key]:null;return range?Array.from({length:range[1]-range[0]+1},(_,index)=>range[0]+index):[];}
function set(draft,key,value){if(!draft || !Object.hasOwn(defaults(),key) || !valid(key,value))return false;draft[key]=value;return true;}
module.exports={defaults,normalize,createPreferences,createConfig,cycle,choices,set};
