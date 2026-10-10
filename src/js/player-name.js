const I18n=require('./i18n.js');
const maximumLength=32;
function validName(value, limit=maximumLength) {
    return typeof value==='string' && value.trim().length>0 && Array.from(value).length<=limit && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}
function createEditor(value='', limit=maximumLength) {
    const text=Array.from(typeof value==='string'?value:'').slice(0,limit).join('');
    return {text,caret:Array.from(text).length,selected:true,error:false,maximumLength:limit};
}
function edit(editor,key,pdgRef=globalThis.pdg) {
    if(key===13 || key===10)return 'submit';
    if(key===pdgRef.key_Escape)return 'cancel';
    const characters=Array.from(editor.text);
    if(key===pdgRef.key_Tab){editor.selected=true;return 'edit';}
    if(key===pdgRef.key_Home || key===pdgRef.key_End) {
        editor.caret=key===pdgRef.key_Home?0:characters.length;editor.selected=false;return 'edit';
    }
    if(key===pdgRef.key_LeftArrow || key===pdgRef.key_RightArrow) {
        editor.caret=editor.selected?(key===pdgRef.key_LeftArrow?0:characters.length):
            Math.max(0,Math.min(characters.length,editor.caret+(key===pdgRef.key_LeftArrow?-1:1)));
        editor.selected=false;return 'edit';
    }
    if(key===8 || key===127 || key===pdgRef.key_Delete) {
        if(editor.selected){characters.length=0;editor.caret=0;}
        else if(key===8 && editor.caret>0){characters.splice(--editor.caret,1);}
        else if(key!==8)characters.splice(editor.caret,1);
        editor.text=characters.join('');editor.selected=false;editor.error=false;return 'edit';
    }
    if(Object.keys(pdgRef).some(name=>name.startsWith('key_') && name!=='key_FirstPrintable' && pdgRef[name]===key))return 'edit';
    const character=typeof key==='number' && key>=32 && key<=0x10ffff?String.fromCodePoint(key):typeof key==='string'?key:'';
    if(Array.from(character).length!==1 || /[\u0000-\u001f\u007f-\u009f]/.test(character))return 'edit';
    if(editor.selected){characters.length=0;editor.caret=0;}
    if(characters.length<(editor.maximumLength || maximumLength)){characters.splice(editor.caret++,0,character);editor.text=characters.join('');}
    editor.selected=false;editor.error=false;return 'edit';
}
function layout(width,height,submitLabel=I18n.getString(528,'<Enter> Start')) {
    const rect={x:(width-Math.min(480,width-40))/2,y:(height-280)/2,width:Math.min(480,width-40),height:280};
    const field={x:rect.x+24,y:rect.y+106,width:rect.width-48,height:36};
    return {rect,field,buttons:[
        {action:'cancel',label:I18n.getString(683,'Cancel'),rect:{x:rect.x+24,y:rect.y+224,width:150,height:30}},
        {action:'submit',label:submitLabel,rect:{x:rect.x+rect.width-174,y:rect.y+224,width:150,height:30}}]};
}
function visibleText(editor,width,measure) {
    const characters=Array.from(editor.text);let start=0,end=characters.length;
    while(start<editor.caret && measure(characters.slice(start,editor.caret).join(''))>width)start++;
    while(end>editor.caret && measure(characters.slice(start,end).join(''))>width)end--;
    return {text:characters.slice(start,end).join(''),caret:measure(characters.slice(start,editor.caret).join(''))};
}
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
    return {read:()=>{try{const value=storage?storage.getItem('galactica.defaultPlayerName'):config?config.getConfigString('defaultPlayerName'):'';return validName(value)?value:'';}catch(error){return '';}},
        write:value=>{if(!validName(value))return;try{if(storage)storage.setItem('galactica.defaultPlayerName',value);else if(config)config.setConfigString('defaultPlayerName',value);}catch(error){}}};
}
module.exports={maximumLength,validName,createEditor,edit,layout,visibleText,createPreferences};
