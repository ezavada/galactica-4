// Native LAN query/reply discovery. Announcements contain only bounded public metadata.
const {protocol}=require('./network-protocol.js');
const magic='galactica4-lan',group='239.255.71.4',port=47774,maximumBytes=2048,maximumGames=100;
const integer=(n,min,max)=>Number.isSafeInteger(n) && n>=min && n<=max;
const hex=value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const nonceValid=value=>typeof value==='string' && /^[a-f0-9]{16}$/.test(value);
function parse(text){try{if(typeof text!=='string' || text.length>maximumBytes)return null;const value=JSON.parse(text);return value && typeof value==='object' && !Array.isArray(value)?value:null;}catch(error){return null;}}
function query(text){const value=parse(text);return value && value.magic===magic && value.protocol===protocol && value.kind==='query' && nonceValid(value.nonce)?value.nonce:null;}
function announcement(info,httpPort,nonce,instanceId="0".repeat(16)){
 const value={magic,protocol,kind:'game',nonce,instanceId,gameId:info.gameId,title:Array.from(info.title).slice(0,128).join(''),port:httpPort,turn:info.turn,humans:info.humans,computers:info.computers,open:info.slots.filter(s=>s.status==='open').length,private:!!info.requiresAdmissionCode};
 return JSON.stringify(value);
}
function decode(text,remote,nonce){
 const value=parse(text),address=remote && remote.address;
 if(!value || value.magic!==magic || value.protocol!==protocol || value.kind!=='game' || value.nonce!==nonce || !nonceValid(nonce) || !nonceValid(value.instanceId) || !hex(value.gameId) || typeof value.title!=='string' || Array.from(value.title).length>128 || /[\u0000-\u001f\u007f-\u009f]/.test(value.title) || !integer(value.port,1,65535) || !integer(value.turn,1,Number.MAX_SAFE_INTEGER) || !integer(value.humans,0,99) || !integer(value.computers,0,99) || !integer(value.humans+value.computers,1,99) || !integer(value.open,0,value.humans) || typeof value.private!=='boolean' || typeof address!=='string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(address) || address.split('.').some(n=>Number(n)>255) || address==='0.0.0.0')return null;
 return {address:'http://'+address+':'+value.port,instanceId:value.instanceId,gameId:value.gameId,title:value.title,turn:value.turn,humans:value.humans,computers:value.computers,open:value.open,private:value.private};
}
function identity(row){return row.instanceId+'|'+row.gameId;}
function addressPriority(address){const ip=address.startsWith('http://')?new URL(address).hostname:address;if(ip.startsWith('127.'))return 0;if(ip.startsWith('169.254.'))return 1;if(ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip))return 3;return 2;}
function createIndex({now=Date.now,expiry=6500}={}){
 const entries=new Map();
 return {accept(row){const id=identity(row);if(!entries.has(id) && entries.size>=maximumGames)return false;const candidates=entries.get(id) || new Map();if(!candidates.has(row.address) && candidates.size>=8)return false;candidates.set(row.address,{row,time:now()});entries.set(id,candidates);return true;},list(){const time=now(),rows=[];for(const [id,candidates] of entries){for(const [address,entry] of candidates)if(time-entry.time>=expiry)candidates.delete(address);if(!candidates.size){entries.delete(id);continue;}rows.push([...candidates.values()].sort((a,b)=>addressPriority(b.row.address)-addressPriority(a.row.address) || a.row.address.localeCompare(b.row.address))[0].row);}return rows.sort((a,b)=>a.title.localeCompare(b.title) || identity(a).localeCompare(identity(b)));},clear:()=>entries.clear()};
}
function interfaces(config){if(config.interfaceAddress)return [config.interfaceAddress];const result=Object.values(require('os').networkInterfaces()).flat().filter(item=>item && (item.family==='IPv4' || item.family===4)).map(item=>item.address);return [...new Set(result.length?result:['127.0.0.1'])].sort((a,b)=>addressPriority(b)-addressPriority(a) || a.localeCompare(b)).slice(0,32);}
function options(value){const config={port,group,interfaceAddress:null,interval:2000,expiry:6500,...value};if(!integer(config.port,1,65535) || typeof config.group!=='string' || !/^2(2[4-9]|3[0-9])(\.\d{1,3}){3}$/.test(config.group) || config.group.split('.').some(n=>Number(n)>255) || !integer(config.interval,20,30000) || !integer(config.expiry,config.interval*2,120000))throw Error('invalid_discovery_options');return config;}
function supported(env=globalThis){return !env.document && !env.window;}
function advertise({info,httpPort,onError=()=>{},...value}){
 const config=options(value),socket=require('dgram').createSocket({type:'udp4',reuseAddr:true}),peers=new Map(),instanceId=require('crypto').randomBytes(8).toString('hex');let closed=false,settled=false,resolveReady,rejectReady;
 const handle={status:'starting',ready:new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;}),close(){if(closed)return;closed=true;handle.status='closed';try{socket.close();}catch(ignored){}if(!settled){settled=true;rejectReady(Error('discovery_cancelled'));}}};
 function fail(error){if(closed)return;handle.status='failed';onError(error);if(!settled){settled=true;rejectReady(error);}closed=true;try{socket.close();}catch(ignored){}}
 socket.on('error',fail);socket.on('message',(data,remote)=>{
  if(closed || data.length>maximumBytes)return;const nonce=query(data.toString('utf8'));if(!nonce)return;const id=remote.address+':'+remote.port,time=Date.now();if(time-(peers.get(id) || 0)<200)return;if(peers.size>=256)peers.clear();peers.set(id,time);
  try{const text=announcement(info(),httpPort,nonce,instanceId);if(Buffer.byteLength(text)>maximumBytes)return;socket.send(text,remote.port,remote.address,error=>{if(error)fail(error);});}catch(error){fail(error);}
 });
 socket.bind(config.port,'0.0.0.0',()=>{if(closed)return;try{let joined=0,lastError;for(const address of interfaces(config))try{socket.addMembership(config.group,address);joined++;}catch(error){lastError=error;}if(!joined)throw lastError || Error('discovery_no_interface');socket.setMulticastTTL(1);socket.setMulticastLoopback(true);handle.status='active';settled=true;resolveReady(handle);}catch(error){fail(error);}});
 return handle;
}
function browse({onChange=()=>{},onError=()=>{},...value}={}){
 if(!supported())throw Error('desktop_discovery_required');
 const config=options(value),socket=require('dgram').createSocket('udp4'),nonce=require('crypto').randomBytes(8).toString('hex'),index=createIndex({expiry:config.expiry});let closed=false,timer=null,last='',sending=false,settled=false,resolveReady,rejectReady;
 const handle={status:'starting',ready:new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;}),close(){if(closed)return;closed=true;handle.status='closed';clearInterval(timer);index.clear();try{socket.close();}catch(ignored){}if(!settled){settled=true;rejectReady(Error('discovery_cancelled'));}}};
 function emit(){if(closed)return;const rows=index.list(),fingerprint=JSON.stringify(rows);if(fingerprint!==last){last=fingerprint;onChange(rows);}}
 function fail(error){if(closed)return;handle.status='failed';onError(error);closed=true;clearInterval(timer);try{socket.close();}catch(ignored){}if(!settled){settled=true;rejectReady(error);}}
 function refresh(){if(closed)return;emit();if(sending)return;sending=true;const addresses=interfaces(config),text=JSON.stringify({magic,protocol,kind:'query',nonce});let index=0,sent=0,lastError;
  function next(){if(closed){sending=false;return;}if(index===addresses.length){sending=false;if(!sent)fail(lastError || Error('discovery_no_interface'));return;}try{socket.setMulticastInterface(addresses[index++]);socket.send(text,config.port,config.group,error=>{if(error)lastError=error;else sent++;next();});}catch(error){lastError=error;next();}}
  next();
 }
 socket.on('error',fail);socket.on('message',(data,remote)=>{if(closed || data.length>maximumBytes)return;const row=decode(data.toString('utf8'),remote,nonce);if(row && index.accept(row))emit();});
 socket.bind(0,config.interfaceAddress || '0.0.0.0',()=>{if(closed)return;try{socket.setMulticastTTL(1);socket.setMulticastLoopback(true);if(config.interfaceAddress)socket.setMulticastInterface(config.interfaceAddress);timer=setInterval(refresh,config.interval);refresh();if(!closed){handle.status='active';settled=true;resolveReady(handle);}}catch(error){fail(error);}});
 return handle;
}
module.exports={magic,group,port,maximumBytes,maximumGames,query,announcement,decode,identity,createIndex,addressPriority,interfaces,options,supported,advertise,browse};
