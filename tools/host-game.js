// Dedicated desktop host: no local player or graphics port is created.
const pdg=require('pdg');globalThis.pdg=pdg;
const path=require('path');pdg.res.openResourceFile(path.join(__dirname,'../data'));
const I18n=require('../src/js/i18n.js'),{whole,errorText}=require('../src/js/network-host-setup.js'),service=require('../src/js/host-games.js').createService();
const args=process.argv.slice(2),language=args[2] || 'en';if(['en','de','es','fr','ja','ru'].includes(language))pdg.res.setLanguage(language);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;try{await service.closeAll();console.log(I18n.getString(1088));process.exit(0);}catch(error){console.error(I18n.getString(1073));stopping=false;}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
(async()=>{
 const port=whole(args[1]===undefined?'0':args[1],0,65535);
 if(args.length<1 || args.length>3 || port===null || !['en','de','es','fr','ja','ru'].includes(language)){console.error(I18n.getString(1089));process.exit(1);}
 try{const record=await service.open(args[0],{port}),info=service.describe(record);console.log(I18n.formatString(1062,'',info.title));console.log(info.address);console.log(I18n.formatString(1072,'',info.port));}
 catch(error){console.error(['host_file_busy','host_listen_failed'].includes(error.code)?errorText(error):I18n.getString(1087));try{await service.closeAll();}catch(ignored){console.error(I18n.getString(1073));}process.exit(1);}
})();
