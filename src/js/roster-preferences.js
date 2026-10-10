// v3 retains the fleet comparison sort column between launches.
const keys=['name','tech','speed','power','ships','damage','colony','destination'];
function normalizeSort(sort) {
    return sort && keys.includes(sort.key) && typeof sort.ascending==='boolean'?
        {key:sort.key,ascending:sort.ascending}:{key:'name',ascending:true};
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
        write:sort=>{
            try {
                const value=JSON.stringify(normalizeSort(sort));
                if(storage)storage.setItem('galactica.fleetSort',value);
                else if(config)config.setConfigString('fleetSort',value);
            } catch(error) { /* The current sort still applies. */ }
        }
    };
}
module.exports={keys,normalizeSort,createPreferences};
