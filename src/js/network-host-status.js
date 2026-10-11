// Connection failures belong to the remote host being inspected, even while
// its modal hides the ordinary map status bar. Local hosts use their own status.
function message(window,sessions){
 const record=window.record;
 if(record && record.remoteAdministrator){
  const session=sessions.find(session=>session.network===record.client);
  if(session && session.networkError)return session.networkError;
 }
 return window.message || '';
}
module.exports={message};
