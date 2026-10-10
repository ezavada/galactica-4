// Persist drawing choices independently of saved simulation state.
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try {
        if(env.window)storage=env.window.localStorage;
        else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}
    } catch(error) { /* Drawing controls remain usable without storage. */ }
    return {
        readGrid() {
            try {
                const value=storage?storage.getItem('galactica.showGrid'):config?config.getConfigString('showGrid'):null;
                return value==='false'?false:true;
            } catch(error){return true;}
        },
        writeGrid(show) {
            try {
                if(storage)storage.setItem('galactica.showGrid',String(show));
                else if(config)config.setConfigString('showGrid',String(show));
            } catch(error) { /* The current drawing choice still applies. */ }
        }
    };
}
module.exports={createPreferences};
