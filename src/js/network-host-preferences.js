// Public connection bookmarks; credentials and session tokens are stored elsewhere.
const Network=require('./network-client.js'),Names=require('./player-name.js');
const maximumEntries=100,key='networkHosts';
function normalize(value){
 try{if(!value || typeof value!=='object')return null;const address=Network.normalizeAddress(value.address),gameId=value.gameId===undefined || value.gameId===null?null:value.gameId,role=value.role || 'player',name=role==='administrator'?'':value.name || '',title=value.title || '';
 if(address.length>256 || gameId!==null && (typeof gameId!=='string' || !/^[a-f0-9]{64}$/.test(gameId)) || !['player','administrator'].includes(role) || typeof name!=='string' || name && !Names.validName(name) || gameId && role==='player' && !name.trim() || role==='administrator' && !gameId || typeof title!=='string' || title && !Names.validName(title,4096))return null;
 return {address,gameId,role,name:name.trim(),title:Array.from(title).slice(0,128).join('')};}catch(error){return null;}
}
function identity(row){return JSON.stringify([row.address,row.gameId,row.role,row.name]);}
function createPreferences(env=globalThis){
 let storage=null,config=null;try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
 function read(){let raw;try{raw=storage?storage.getItem('galactica.'+key):config?config.getConfigString(key):null;}catch(error){return null;}try{if(typeof raw!=='string' || raw.length>131072)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows) || rows.length>maximumEntries)return [];const seen=new Set();return rows.flatMap(value=>{const row=normalize(value);if(!row || seen.has(identity(row)))return [];seen.add(identity(row));return [row];});}catch(error){return [];}}
 function save(rows){try{const text=JSON.stringify(rows);if(storage)storage.setItem('galactica.'+key,text);else if(config)config.setConfigString(key,text);else return false;return true;}catch(error){return false;}}
 return {list:()=>read() || [],upsert(value){const row=normalize(value),old=read();if(!row || !old)return false;const rows=old.filter(r=>identity(r)!==identity(row) && !(row.gameId && r.gameId===null && r.address===row.address));return save([row,...rows].slice(0,maximumEntries));},
  remove(id){if(typeof id!=='string')return false;const old=read();if(!old)return false;const rows=old.filter(row=>identity(row)!==id);return rows.length===old.length?true:save(rows);}
 };
}
module.exports={createPreferences,normalize,identity,maximumEntries};
