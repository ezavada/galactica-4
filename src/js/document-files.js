// Desktop documents use atomic filesystem writes. Browsers use a retained file
// handle when available, or downloads/uploads when the browser lacks that API.
const maximumBytes=64*1024*1024;
function suggestedName(title) {
    let name=String(title || 'Galactica').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').trim();
    if(!name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='Galactica';
    return name+'.gad4.json';
}
function createFiles(env=globalThis,filesystem=null) {
    const browser=!!env.document,fs=browser?null:filesystem || require('fs');let sequence=0,cancelPicker=null;
    const types=[{description:'Galactica-4',accept:{'application/json':['.json']}}];
    async function save(text,name,previous=null,saveAs=false) {
        if(typeof text!=='string' || text.length>maximumBytes)throw Error('Invalid document');
        if(!browser) {
            const path=String(name).trim();if(!path)throw Error('Empty filename');
            const temporary=path+'.tmp-'+Date.now()+'-'+(++sequence);let created=false;
            try{fs.writeFileSync(temporary,text,{encoding:'utf8',flag:'wx'});created=true;fs.renameSync(temporary,path);}
            catch(error){if(created){try{fs.unlinkSync(temporary);}catch(ignored){}}throw error;}
            return {name:path,text};
        }
        let handle=!saveAs && previous && previous.handle;
        if(!handle && typeof env.showSaveFilePicker==='function') {
            try{handle=await env.showSaveFilePicker({suggestedName:name,types});}
            catch(error){if(error && error.name==='AbortError')return null;throw error;}
        }
        if(handle) {
            const writer=await handle.createWritable();
            try{await writer.write(text);await writer.close();}catch(error){if(writer.abort)await writer.abort();throw error;}
            return {name:handle.name || name,handle,text};
        }
        const url=env.URL.createObjectURL(new env.Blob([text],{type:'application/json'})),link=env.document.createElement('a');
        try{link.href=url;link.download=name;env.document.body.appendChild(link);link.click();}
        finally{link.remove();env.setTimeout(()=>env.URL.revokeObjectURL(url),1000);}
        return {name,text};
    }
    async function read(reference) {
        if(!reference || typeof reference.name!=='string')throw Error('Missing document');
        if(!browser) {if(fs.statSync(reference.name).size>maximumBytes)throw Error('Document too large');return fs.readFileSync(reference.name,'utf8');}
        if(reference.handle){const file=await reference.handle.getFile();if(file.size>maximumBytes)throw Error('Document too large');return file.text();}
        if(typeof reference.text!=='string')throw Error('Missing document');return reference.text;
    }
    async function chooseOpen(name=null) {
        if(!browser){const reference={name};reference.text=await read(reference);return reference;}
        if(typeof env.showOpenFilePicker==='function') {
            let handles;try{handles=await env.showOpenFilePicker({multiple:false,types});}
            catch(error){if(error && error.name==='AbortError')return null;throw error;}
            const reference={name:handles[0].name,handle:handles[0]};reference.text=await read(reference);return reference;
        }
        return new Promise((resolve,reject)=>{
            const input=env.document.createElement('input');input.type='file';input.accept='.json,.gad4';input.style.display='none';
            const finish=(value,error)=>{if(cancelPicker===cancel)cancelPicker=null;input.remove();error?reject(error):resolve(value);};
            const cancel=()=>finish(null);cancelPicker=cancel;
            input.oncancel=cancel;
            input.onchange=async()=>{try{const file=input.files && input.files[0];if(!file){finish(null);return;}if(file.size>maximumBytes)throw Error('Document too large');finish({name:file.name,text:await file.text()});}catch(error){finish(null,error);}};
            env.document.body.appendChild(input);input.click();
        });
    }
    return {browser,save,read,chooseOpen,exists:name=>!browser && fs.existsSync(name),cancelPick:()=>{if(cancelPicker)cancelPicker();}};
}
module.exports={createFiles,suggestedName};
