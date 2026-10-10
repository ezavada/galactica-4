// v3 retains the fleet comparison sort column between launches.
const keys=['name','tech','speed','power','ships','damage','colony','destination'];
function normalizeSort(sort) {
    return sort && keys.includes(sort.key) && typeof sort.ascending==='boolean'?
        {key:sort.key,ascending:sort.ascending}:{key:'name',ascending:true};
}
function normalizeGeometry(value) {
    return value && ['x','y','height'].every(key=>Number.isFinite(value[key]) && Math.abs(value[key])<=1000000) && value.height>=158?
        {x:value.x,y:value.y,height:value.height}:null;
}
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try {
        if(env.window)storage=env.window.localStorage;
        else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}
    } catch(error) { /* Roster controls remain usable without storage. */ }
    return {
        read:()=>{
            try {return normalizeSort(JSON.parse(storage?storage.getItem('galactica.fleetSort'):
                config?config.getConfigString('fleetSort'):null));}
            catch(error){return normalizeSort(null);}
        },
        readGeometry:()=>{
            try {return normalizeGeometry(JSON.parse(storage?storage.getItem('galactica.fleetGeometry'):
                config?config.getConfigString('fleetGeometry'):null));}
            catch(error){return null;}
        },
        writeGeometry:geometry=>{
            const bounds=normalizeGeometry(geometry);if(!bounds)return;
            try {
                const value=JSON.stringify(bounds);
                if(storage)storage.setItem('galactica.fleetGeometry',value);
                else if(config)config.setConfigString('fleetGeometry',value);
            } catch(error) { /* The current window remains usable. */ }
        },
        write:sort=>{
            try {
                const value=JSON.stringify(normalizeSort(sort));
                if(storage)storage.setItem('galactica.fleetSort',value);
                else if(config)config.setConfigString('fleetSort',value);
            } catch(error) { /* The current sort still applies. */ }
        }
    };
}
module.exports={keys,normalizeSort,normalizeGeometry,createPreferences};
