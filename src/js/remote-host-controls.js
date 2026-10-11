// A remote administrator reuses the host dialogs without owning the listener.
function createService(client,changed=()=>{}){
 const record={remoteAdministrator:true,client};
 function describe(){
  const status=client.administration;if(!status)throw {code:'not_logged_in'};
  return {id:status.gameId,title:status.info.title,address:client.address,file:'',port:0,remoteAdministrator:true,info:status.info,administration:{...status.administration,connected:client.connected}};
 }
 function check(r){if(r!==record)throw {code:'invalid_host_record'};}
 async function act(r,value){check(r);await client.act(value);changed(client.model);return record;}
 return {supported:true,records:[record],latest:()=>record,describe,
  turnControl:(r,action,turn)=>act(r,{action,...(action==='end'?{turn}: {})}),
  updateSettings:(r,settings,revision)=>act(r,{action:'settings',settings,revision}),
  changePlayer:(r,change,revision,turn)=>act(r,{action:'player',change,revision,turn}),
  updateAdmission:(r,policy,revision)=>act(r,{action:'admission',policy,revision}),
  stop:async r=>{check(r);await client.disconnect({keepView:true});changed(client.model);return true;}
 };
}
module.exports={createService};
