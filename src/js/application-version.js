// Identify the application source build; PDG's runtime version is independent.
const I18n=require('./i18n.js');
function normalize(raw){
    if(!raw || typeof raw.revision!=='string' || !/^[0-9a-f]{40}$/i.test(raw.revision) || typeof raw.dirty!=='boolean')return null;
    return {revision:raw.revision.toLowerCase(),dirty:raw.dirty};
}
function info(env=globalThis){
    try{
        if(env.window)return normalize(env.window.GALACTICA_BUILD_INFO);
        const vars=env.process && env.process.env;
        return normalize(vars && {revision:vars.GALACTICA_BUILD_REVISION,dirty:vars.GALACTICA_BUILD_DIRTY==='true'?true:vars.GALACTICA_BUILD_DIRTY==='false'?false:undefined});
    }catch(error){return null;}
}
function label(build=info()){
    const valid=normalize(build);
    return valid?I18n.formatString(986,'Development build {0}',valid.revision.slice(0,12))+(valid.dirty?I18n.getString(987,' (modified)'):''):I18n.getString(988,'Build information unavailable');
}
module.exports={normalize,info,label};
