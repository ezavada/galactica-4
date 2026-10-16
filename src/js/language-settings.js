// Autonyms are deliberately independent of the currently selected UI language.
const languages=Object.freeze([
    ['en','English'],['de','Deutsch'],['es','Español'],['fr','Français'],['ja','日本語'],['ru','Русский']
].map(([code,name])=>Object.freeze({code,name})));
const supported=code=>languages.some(language=>language.code===code);
function current(res=pdg.res) {
    const code=res.getLanguage();
    return supported(code)?code:'en';
}
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try {
        if(env.window)storage=env.window.localStorage;
        else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}
    } catch(error) { /* Preferences are optional when storage is unavailable. */ }
    return {
        read() {try{return storage?storage.getItem('galactica.language'):config?config.getConfigString('language'):null;}catch(error){return null;}},
        write(code) {try{if(storage)storage.setItem('galactica.language',code);else if(config)config.setConfigString('language',code);}catch(error){/* Switching still works if saving is denied. */}}
    };
}
function initialize(args,res,preferences) {
    const explicit=args.filter(arg=>arg.startsWith('--lang=')).map(arg=>arg.slice(7)).filter(supported).pop();
    const saved=preferences.read();
    const code=explicit || (supported(saved)?saved:'en');
    res.setLanguage(code);
    return code;
}
module.exports={languages,supported,current,createPreferences,initialize};
