// Persist drawing and playback defaults independently of saved simulation state.
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
    const readWindowPosition=name=>{
        try {const key='windowPosition.'+name,value=storage?storage.getItem('galactica.'+key):config?config.getConfigString(key):null;
            return require('./window-behavior.js').validPosition(JSON.parse(value));
        } catch(error){return null;}
    };
    const writeWindowPosition=(name,position)=>{
        const value=require('./window-behavior.js').validPosition(position);if(!value)return;
        try {const key='windowPosition.'+name,text=JSON.stringify(value);
            if(storage)storage.setItem('galactica.'+key,text);else if(config)config.setConfigString(key,text);
        } catch(error){ /* Window remains draggable without configuration storage. */ }
    };
    return {
        readWindowPosition,writeWindowPosition,
        readSplash:()=>read('ShowSplash'),writeSplash:show=>write('ShowSplash',show),
        readFullscreen:()=>read('fullscreen'),writeFullscreen:active=>write('fullscreen',active),
        readSound:()=>read('playSound'),writeSound:enabled=>write('playSound',enabled),
        readMusic:()=>read('playMusic'),writeMusic:enabled=>write('playMusic',enabled),
        readEnemyEvents:()=>read('showEnemyEvents'),writeEnemyEvents:show=>write('showEnemyEvents',show),
        readControlHelp:()=>read('showControlHelp'),writeControlHelp:show=>write('showControlHelp',show),
        readNebula:()=>read('showNebula'),writeNebula:show=>write('showNebula',show),
        readScannerRanges:()=>read('showScannerRanges'),writeScannerRanges:show=>write('showScannerRanges',show),
        readAllCourses:()=>read('showAllCourses'),writeAllCourses:show=>write('showAllCourses',show),
        readCourierCourses:()=>read('showCourierCourses'),writeCourierCourses:show=>write('showCourierCourses',show),
        readShips:()=>read('showShips'),writeShips:show=>write('showShips',show),
        readGrid:()=>read('showGrid'),writeGrid:show=>write('showGrid',show),
        readMapNames:()=>read('showMapNames'),writeMapNames:show=>write('showMapNames',show)
    };
}
module.exports={createPreferences};
