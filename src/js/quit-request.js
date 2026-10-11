// Native user requests enter the same save-safe flow as the visible Quit command.
function install(pdg,request,onError=()=>{}) {
    if(typeof pdg.eventType_QuitRequest!=='number')return null;
    const handler=new pdg.IEventHandler(event=>{
        if(!event || event.eventType!==pdg.eventType_QuitRequest)return false;
        try{request();}catch(error){try{onError(error);}catch(ignored){/* Keep the app alive after a failed decision. */}}
        // A busy/rejected request must also consume the native event. Only the
        // accepted application flow calls pdg.quit after saves/host shutdown.
        return true;
    });
    pdg.evt.addHandler(handler,pdg.eventType_QuitRequest);
    return handler;
}
module.exports={install};
