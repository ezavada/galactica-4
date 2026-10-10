// Persist drawing choices independently of saved simulation state.
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try {
        if(env.window)storage=env.window.localStorage;
        else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}
    } catch(error) { /* Drawing controls remain usable without storage. */ }
    const read=key=>{
        try {
            const value=storage?storage.getItem('galactica.'+key):config?config.getConfigString(key):null;
            return value==='false'?false:true;
        } catch(error){return true;}
    };
    const write=(key,show)=>{
        try {
            if(storage)storage.setItem('galactica.'+key,String(show));
            else if(config)config.setConfigString(key,String(show));
        } catch(error) { /* The current drawing choice still applies. */ }
    };
    return {
        readAllCourses:()=>read('showAllCourses'),writeAllCourses:show=>write('showAllCourses',show),
        readCourierCourses:()=>read('showCourierCourses'),writeCourierCourses:show=>write('showCourierCourses',show),
        readShips:()=>read('showShips'),writeShips:show=>write('showShips',show),
        readGrid:()=>read('showGrid'),writeGrid:show=>write('showGrid',show),
        readMapNames:()=>read('showMapNames'),writeMapNames:show=>write('showMapNames',show)
    };
}
module.exports={createPreferences};
