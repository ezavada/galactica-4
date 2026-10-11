// Dedicated desktop host: no local player or graphics port is created.
const pdg=require('pdg');globalThis.pdg=pdg;
const path=require('path');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const I18n=require('../src/js/i18n.js'),{errorText}=require('../src/js/network-host-setup.js'),Command=require('../src/js/host-command.js'),service=require('../src/js/host-games.js').createService();
const args=process.argv.slice(2),language=Command.language(args);pdg.res.setLanguage(language);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;try{await service.closeAll();console.log(I18n.getString(1088));process.exit(0);}catch(error){console.error(I18n.getString(1073));stopping=false;}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
(async()=>{
 let command;try{command=Command.parse(args);}catch(error){console.error(I18n.getString(1106));Command.helpIds.forEach(id=>console.error(I18n.getString(id)));process.exit(1);}
 pdg.res.setLanguage(command.language);if(command.mode==='help'){Command.helpIds.forEach(id=>console.log(I18n.getString(id)));process.exit(0);}
 let admission;if(command.admissionFile!==undefined){try{const fs=require('fs');if(fs.statSync(command.admissionFile).size>65536)throw Error('too large');admission=require('../src/js/host-admission.js').validate(JSON.parse(fs.readFileSync(command.admissionFile,'utf8')));}catch(error){console.error(I18n.getString(1154));process.exit(1);}}
 try{const record=command.mode==='new'?await service.create({...command.options,...(admission===undefined?{}:{admission})},command.file,{port:command.port}):await service.open(command.file,{port:command.port,...(admission===undefined?{}:{admission})}),info=service.describe(record);console.log(I18n.formatString(1062,'',info.title));console.log(info.address);console.log(I18n.formatString(1072,'',info.port));}
 catch(error){console.error(command.mode==='new'?errorText(error):['host_file_busy','host_listen_failed'].includes(error.code)?errorText(error):I18n.getString(1087));try{await service.closeAll();}catch(ignored){console.error(I18n.getString(1073));}process.exit(1);}
})();
