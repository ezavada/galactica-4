// V3 checked admit/ban codes only for new slots. V4 uses host-issued codes
// in place of the discontinued registration system; password rejoin is unchanged.
const Names=require('./player-name.js');
const keys=['allowWithoutCode','allowed','banned'],maximumCodes=100;
function failure(code){const error=new Error(code);error.code=code;throw error;}
function validCode(code){return Names.validName(code,64) && code===code.trim();}
function validate(value){
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==keys.length || Object.keys(value).some(k=>!keys.includes(k)) || typeof value.allowWithoutCode!=='boolean')failure('invalid_host_admission');
 for(const key of ['allowed','banned'])if(!Array.isArray(value[key]) || value[key].length>maximumCodes || Array.from(value[key]).some(code=>!validCode(code)) || new Set(value[key]).size!==value[key].length)failure('invalid_host_admission');
 return {allowWithoutCode:value.allowWithoutCode,allowed:[...value.allowed],banned:[...value.banned]};
}
function snapshot(game){return validate(game.config.networkHost.admission || {allowWithoutCode:true,allowed:[],banned:[]});}
function revision(game){return game.config.networkHost.admissionRevision || 0;}
function allows(game,code=''){
 const policy=snapshot(game);
 if(policy.allowed.length)return policy.allowed.includes(code); // V3's allow list takes precedence over bans.
 if(!code)return policy.allowWithoutCode;
 return !policy.banned.includes(code);
}
function validateSaved(host){
 if(host.admission!==undefined)validate(host.admission);
 if(host.admissionRevision!==undefined && (!Number.isSafeInteger(host.admissionRevision) || host.admissionRevision<0))failure('invalid_host_admission');
}
module.exports={maximumCodes,validCode,validate,snapshot,revision,allows,validateSaved};
