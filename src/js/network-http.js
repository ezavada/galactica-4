// Bounded, cancellable JSON requests for native Node and browser clients.
const maximumBytes=64*1024*1024;
function failure(code){const error=new Error(code);error.code=code;return error;}
const remoteErrors=new Set(['bad_chat','chat_recipient_unavailable','chat_history_full','chat_too_large','not_found','method_not_allowed','not_logged_in','admin_ejected','not_admitted','admin_disabled','admin_request_too_large','invalid_admin_action','invalid_initial_state','initial_state_closed','stale_initial_state','invalid_host_player','invalid_host_settings','invalid_host_admission','stale_host_player','stale_host_settings','stale_host_admission','stale_host_turn','bad_protocol','bad_login_request','bad_password','duplicate_name','game_full','player_not_found','wrong_game','host_save_failed','host_state_failed','login_too_large','bad_orders','wrong_turn','already_posted','game_complete','orders_too_large']);
function decode(status,text){
 let data;try{data=text?JSON.parse(text):{};}catch(error){throw failure('network_bad_response');}
 if(!data || typeof data!=='object' || Array.isArray(data))throw failure('network_bad_response');
 if(status<200 || status>=300)throw failure(remoteErrors.has(data.error)?data.error:'network_http_error');
 return data;
}
function request(origin,{path,method='GET',body,token,timeout=8000,limit=maximumBytes}){
 const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;
 const encoded=body===undefined?undefined:JSON.stringify(body);
 if(typeof window!=='undefined' && typeof window.fetch==='function'){
  const controller=new AbortController();let reason='network_cancelled';
  const timer=setTimeout(()=>{reason='network_timeout';controller.abort();},timeout);
  const promise=(async()=>{
   try{
    const response=await window.fetch(origin+path,{method,headers,body:encoded,signal:controller.signal,redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.body)return decode(response.status,'');
    const reader=response.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;
    for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw failure('network_response_too_large');}text+=decoder.decode(value,{stream:true});}
    text+=decoder.decode();return decode(response.status,text);
   }catch(error){if(controller.signal.aborted)throw failure(reason);throw error.code?error:failure('network_unreachable');}
   finally{clearTimeout(timer);}
  })();
  return {promise,cancel:()=>{reason='network_cancelled';controller.abort();}};
 }
 let cancel;
 const promise=new Promise((resolve,reject)=>{
  let finished=false,response=null,timer=null;
  const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const url=new URL(origin+path),transport=require(url.protocol==='https:'?'https':'http');
  if(encoded!==undefined)headers['Content-Length']=Buffer.byteLength(encoded,'utf8');
  const req=transport.request(url,{method,headers,agent:false},res=>{
   response=res;const chunks=[];let bytes=0;
   res.on('error',()=>finish(failure('network_unreachable')));res.on('aborted',()=>finish(failure('network_unreachable')));
   res.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){finish(failure('network_response_too_large'));res.destroy();req.destroy();return;}chunks.push(chunk);});
   res.on('end',()=>{if(finished)return;try{finish(null,decode(res.statusCode,Buffer.concat(chunks).toString('utf8')));}catch(error){finish(error);}});
  });
  req.on('error',error=>finish(error.code && error.code.startsWith('network_')?error:failure('network_unreachable')));
  cancel=()=>{finish(failure('network_cancelled'));if(response)response.destroy();req.destroy();};
  timer=setTimeout(()=>{finish(failure('network_timeout'));if(response)response.destroy();req.destroy();},timeout);
  req.end(encoded);
 });
 return {promise,cancel:()=>cancel && cancel()};
}
module.exports={request,decode,failure,maximumBytes};
