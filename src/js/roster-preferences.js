// v3 retains fleet and system comparison sort columns between launches.
const keys=['name','tech','speed','power','ships','damage','colony','destination'];
function normalizeSort(sort, allowedKeys=keys) {
    return sort && allowedKeys.includes(sort.key) && typeof sort.ascending==='boolean'?
        {key:sort.key,ascending:sort.ascending}:{key:'name',ascending:true};
}
function normalizeGeometry(value) {
    return value && ['x','y','height'].every(key=>Number.isFinite(value[key]) && Math.abs(value[key])<=1000000) && value.height>=158?
        {x:value.x,y:value.y,height:value.height}:null;
}
function createPreferences(env=globalThis, options={}) {
    const prefix=options.prefix || 'fleet';
    const sortKey=prefix+"Sort", geometryKey=prefix+"Geometry";
    const normalize=value=>normalizeSort(value,options.keys || keys);
    let storage=null,config=null;
    try {
        if(env.window)storage=env.window.localStorage;
        else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}
    } catch(error) { /* Comparison controls remain usable without storage. */ }
    return {
        read:()=>{
            try {return normalize(JSON.parse(storage?storage.getItem('galactica.'+sortKey):
                config?config.getConfigString(sortKey):null));}
            catch(error){return normalize(null);}
        },
        readGeometry:()=>{
            try {return normalizeGeometry(JSON.parse(storage?storage.getItem('galactica.'+geometryKey):
                config?config.getConfigString(geometryKey):null));}
            catch(error){return null;}
        },
        writeGeometry:geometry=>{
            const bounds=normalizeGeometry(geometry);if(!bounds)return;
            try {
                const value=JSON.stringify(bounds);
                if(storage)storage.setItem('galactica.'+geometryKey,value);
                else if(config)config.setConfigString(geometryKey,value);
            } catch(error) { /* The current window remains usable. */ }
        },
        write:sort=>{
            try {
                const value=JSON.stringify(normalize(sort));
                if(storage)storage.setItem('galactica.'+sortKey,value);
                else if(config)config.setConfigString(sortKey,value);
            } catch(error) { /* The current sort still applies. */ }
        }
    };
}
module.exports={keys,normalizeSort,normalizeGeometry,createPreferences};
