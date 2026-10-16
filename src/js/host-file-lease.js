// Application/dedicated hosts hold one exclusive lease across atomic save replacements.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function busy(){const error=new Error('host_file_busy');error.code=error.message;return error;}
function alive(pid){if(!Number.isSafeInteger(pid) || pid<1)return true;try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
function acquire(file){
 const directory=file+'.host-lock',owner={pid:process.pid,token:crypto.randomBytes(16).toString('hex')};
 for(let attempt=0;attempt<3;attempt++){
  try{fs.mkdirSync(directory,{mode:0o700});}
  catch(error){
   if(error.code!=='EEXIST')throw error;
   let previous;try{previous=JSON.parse(fs.readFileSync(path.join(directory,'owner.json'),'utf8'));}catch(ignored){throw busy();}
   if(alive(previous.pid))throw busy();
   // Only one process can retire a dead owner's lease. Re-read ownership after
   // taking this marker so a concurrent new lease can never be mistaken for it.
   const marker=path.join(directory,'retiring');
   try{fs.mkdirSync(marker);}catch(ignored){throw busy();}
   const retired=directory+'.'+owner.token;
   try{
    const current=JSON.parse(fs.readFileSync(path.join(directory,'owner.json'),'utf8'));
    if(current.token!==previous.token || alive(current.pid)){fs.rmdirSync(marker);throw busy();}
    fs.renameSync(directory,retired);fs.rmSync(retired,{recursive:true,force:true});
   }catch(error){if(error.code==='host_file_busy')throw error;throw busy();}
   continue;
  }
  try{fs.writeFileSync(path.join(directory,'owner.json'),JSON.stringify(owner),{flag:'wx',mode:0o600});}
  catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error;}
  return ()=>{
   const current=JSON.parse(fs.readFileSync(path.join(directory,'owner.json'),'utf8'));
   if(current.token!==owner.token || current.pid!==owner.pid)throw busy();
   fs.rmSync(directory,{recursive:true});
  };
 }
 throw busy();
}
function canonical(file,existing){const resolved=path.resolve(file);return existing?fs.realpathSync(resolved):path.join(fs.realpathSync(path.dirname(resolved)),path.basename(resolved));}
module.exports={acquire,canonical};
