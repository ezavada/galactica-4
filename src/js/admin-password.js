// Shared validation; administrator secrets are never stored by clients.
function validPassword(value){return typeof value==='string' && Array.from(value).length<=64 && !/[\u0000-\u001f\u007f-\u009f]/.test(value);}
module.exports={validPassword};
