// Dedicated command parsing is side-effect free; validation precedes file creation.
const Name=require('./player-name.js');
const languages=['en','de','es','fr','ja','ru'],helpIds=[1100,1101,1102,1103,1104,1105,1155];
function failure(){const error=new Error('invalid_host_command');error.code=error.message;throw error;}
function integer(text,min,max){if(typeof text!=='string' || !/^-?\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text)<min || Number(text)>max)failure();return Number(text);}
function language(args){const at=args.indexOf('--language'),code=at>=0?args[at+1]:args[0] && !args[0].startsWith('-')?args[2]:'en';return languages.includes(code)?code:'en';}
function parse(args){
 if(!Array.isArray(args) || !args.length || args.some(a=>typeof a!=='string'))failure();
 if(!args[0].startsWith('-')){
  if(args.length>3 || !Name.validName(args[0],1024))failure();
  const lang=args[2] || 'en';if(!languages.includes(lang))failure();return {mode:'load',file:args[0],port:integer(args[1]===undefined?'0':args[1],0,65535),language:lang};
 }
 const values={},flags=new Set(),takesValue=['new','load','title','players','ais','skill','advantage','density','size','turn-minutes','port','language','admission'];
 for(let i=0;i<args.length;i++){
  const token=args[i];if(!token.startsWith('--'))failure();const key=token.slice(2);
  if(takesValue.includes(key)){if(Object.hasOwn(values,key) || i+1===args.length)failure();values[key]=args[++i];}
  else if(['help','slow','no-fog','end-early'].includes(key)){if(flags.has(key))failure();flags.add(key);}
  else failure();
 }
 const lang=values.language || 'en';if(!languages.includes(lang))failure();
 if(flags.has('help')){if(flags.size!==1 || Object.keys(values).some(k=>k!=='language'))failure();return {mode:'help',language:lang};}
 const mode=Object.hasOwn(values,'new')?'new':Object.hasOwn(values,'load')?'load':null;
 if(!mode || (Object.hasOwn(values,'new') && Object.hasOwn(values,'load')))failure();
 const admissionFile=values.admission;if(admissionFile!==undefined && !Name.validName(admissionFile,1024))failure();
 const admission=admissionFile===undefined?{}:{admissionFile};
 const file=values[mode];if(!Name.validName(file,1024))failure();const port=integer(values.port===undefined?'0':values.port,0,65535);
 if(mode==='load'){if(flags.size || Object.keys(values).some(k=>!['load','port','language','admission'].includes(k)))failure();return {mode,file,port,language:lang,...admission};}
 const players=integer(values.players===undefined?'2':values.players,1,99),ais=integer(values.ais===undefined?'0':values.ais,0,players);
 const minutes=integer(values['turn-minutes']===undefined?'0':values['turn-minutes'],0,Math.floor(Number.MAX_SAFE_INTEGER/60000));
 const options={numHumans:players-ais,numComputers:ais,fastGame:!flags.has('slow'),omniscient:flags.has('no-fog'),endEarly:flags.has('end-early'),maxTimePerTurn:minutes*60,
  compSkill:integer(values.skill===undefined?'5':values.skill,1,5),compAdvantage:integer(values.advantage===undefined?'0':values.advantage,-3,3),density:integer(values.density===undefined?'1':values.density,1,10),sectorSize:integer(values.size===undefined?'1':values.size,1,5),hosting:true};
 if(Object.hasOwn(values,'title')){if(!Name.validName(values.title,27))failure();options.gameTitle=values.title;}
 return {mode,file,port,language:lang,options,...admission};
}
module.exports={parse,language,languages,helpIds};
