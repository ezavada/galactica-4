// Opt-in device preferences, separate from public connection descriptors and saves.
const Network=require('./network-client.js'),Names=require('./player-name.js');
const key='networkPasswords',maximumEntries=100;
function identity(value){
 try{if(!value || !/^[a-f0-9]{64}$/.test(value.gameId) || !['player','administrator'].includes(value.role) || value.role==='player' && !Names.validName(value.name))return null;
 const address=Network.normalizeAddress(value.address);if(address.length>256)return null;return {address,gameId:value.gameId,role:value.role,name:value.role==='administrator'?'':value.name.trim()};}catch(error){return null;}
}
function validPassword(value){return typeof value==='string' && Array.from(value).length<=64 && !/[\u0000-\u001f\u007f-\u009f]/.test(value);}
function same(a,b){return a.address===b.address && a.gameId===b.gameId && a.role===b.role && a.name===b.name;}
function createPreferences(env=globalThis){
 let storage=null,config=null;try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
 function entries(){let raw;try{raw=storage?storage.getItem('galactica.'+key):config?config.getConfigString(key):null;}catch(error){return null;}try{if(typeof raw!=='string' || raw.length>131072)return [];const data=JSON.parse(raw);if(!Array.isArray(data) || data.length>maximumEntries)return [];return data.flatMap(row=>{const id=identity(row);return id && validPassword(row.password) && row.password?[{...id,password:row.password}]:[];});}catch(error){return [];}}
 return {read(value){const id=identity(value);if(!id)return null;const rows=entries();if(!rows)return null;const found=rows.reverse().find(row=>same(row,id));return found?found.password:null;},
  write(value,password,remember){const id=identity(value);if(!id || !validPassword(password) || typeof remember!=='boolean')return false;const old=entries();if(!old)return false;if((!remember || !password) && !old.some(row=>same(row,id)))return true;const rows=old.filter(row=>!same(row,id));if(remember && password)rows.push({...id,password});while(rows.length>maximumEntries)rows.shift();try{const text=JSON.stringify(rows);if(storage)storage.setItem('galactica.'+key,text);else if(config)config.setConfigString(key,text);else return false;return true;}catch(error){return false;}}
 };
}
module.exports={createPreferences,identity,maximumEntries};
