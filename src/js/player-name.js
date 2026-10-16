const I18n=require('./i18n.js');
const maximumLength=32;
function validName(value, limit=maximumLength) {
    return typeof value==='string' && value.trim().length>0 && Array.from(value).length<=limit && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}
function createEditor(value='', limit=maximumLength) {
    const text=Array.from(typeof value==='string'?value:'').slice(0,limit).join('');
    return {text,caret:Array.from(text).length,selected:true,error:false,maximumLength:limit};
}
let keyEvent=null,clipboard=null;
function withEvent(event,callback){const previous=keyEvent;keyEvent=event;try{return callback();}finally{keyEvent=previous;}}
function selection(editor){
    const length=Array.from(editor.text).length,caret=Math.max(0,Math.min(length,editor.caret));
    const anchor=editor.selected?0:editor.anchor===undefined?caret:Math.max(0,Math.min(length,editor.anchor));
    return editor.selected?{start:0,end:length}:{start:Math.min(anchor,caret),end:Math.max(anchor,caret)};
}
function replaceSelection(editor,text){
    const characters=Array.from(editor.text),range=selection(editor);
    const insert=Array.from(text.replace(/[\u0000-\u001f\u007f-\u009f]/g,'' )).slice(0,Math.max(0,(editor.maximumLength || maximumLength)-(characters.length-range.end+range.start)));
    characters.splice(range.start,range.end-range.start,...insert);editor.text=characters.join('');
    editor.caret=range.start+insert.length;editor.anchor=editor.caret;editor.selected=false;editor.error=false;
}
function selectedText(editor){const r=selection(editor);return Array.from(editor.text).slice(r.start,r.end).join('');}
function installClipboard(getEditor,documentRef=typeof document==='undefined'?null:document,onChanged=()=>{}){
    if(!documentRef){clipboard=require('./clipboard.js').createClipboard();return;}
    for(const type of ['copy','cut','paste'])documentRef.addEventListener(type,event=>{
        const editor=getEditor();if(!editor || !event.clipboardData)return;
        if(type==='paste')replaceSelection(editor,event.clipboardData.getData('text/plain'));
        else{event.clipboardData.setData('text/plain',selectedText(editor));if(type==='cut')replaceSelection(editor,'');}
        onChanged(editor);event.preventDefault();
    });
}
function edit(editor,key,pdgRef=globalThis.pdg,event=keyEvent || {}) {
    if(key===13 || key===10)return 'submit';
    if(key===pdgRef.key_Escape)return 'cancel';
    if(key===pdgRef.key_Tab)return 'edit';
    const characters=Array.from(editor.text),range=selection(editor);
    const char=typeof key==='number'?String.fromCodePoint(Math.max(0,Math.min(key,0x10ffff))):key;
    const primary=event.meta || event.ctrl;
    if(primary && !event.alt){
        const command=typeof char==='string'?char.toLowerCase():'';
        if(command==='a' || key===1){editor.selected=true;editor.anchor=0;editor.caret=characters.length;return 'edit';}
        if(['c','x','v'].includes(command) || [3,22,24].includes(key)){
            // Browser clipboard events carry actual OS data and perform the edit.
            if(typeof document!=='undefined')return 'edit';
            try{
                const service=event.clipboard || clipboard || (clipboard=require('./clipboard.js').createClipboard());
                if(command==='v' || key===22)replaceSelection(editor,service.read());
                else{service.write(selectedText(editor));if(command==='x' || key===24)replaceSelection(editor,'');}
            }catch(error){editor.error=true;}
            return 'edit';
        }
    }
    const move=position=>{
        if(event.shift){if(editor.anchor===undefined || editor.selected)editor.anchor=editor.selected?0:editor.caret;}
        else editor.anchor=position;
        editor.caret=position;editor.selected=false;
    };
    if(key===pdgRef.key_Home || key===pdgRef.key_End || event.meta && [pdgRef.key_LeftArrow,pdgRef.key_RightArrow].includes(key)){
        move(key===pdgRef.key_Home || key===pdgRef.key_LeftArrow?0:characters.length);return 'edit';
    }
    if(key===pdgRef.key_LeftArrow || key===pdgRef.key_RightArrow){
        const left=key===pdgRef.key_LeftArrow;
        if(range.start!==range.end && !event.shift)move(left?range.start:range.end);
        else if(event.alt || event.ctrl){
            let position=editor.caret;
            if(left){while(position>0 && /\s/.test(characters[position-1]))position--;while(position>0 && !/\s/.test(characters[position-1]))position--;}
            else{while(position<characters.length && !/\s/.test(characters[position]))position++;while(position<characters.length && /\s/.test(characters[position]))position++;}
            move(position);
        }else move(Math.max(0,Math.min(characters.length,editor.caret+(left?-1:1))));
        return 'edit';
    }
    if(key===8 || key===127 || key===pdgRef.key_Delete){
        if(range.start===range.end){editor.anchor=key===8?Math.max(0,editor.caret-1):Math.min(characters.length,editor.caret+1);}
        replaceSelection(editor,'');return 'edit';
    }
    if(primary)return 'edit';
    if(Object.keys(pdgRef).some(name=>name.startsWith('key_') && name!=='key_FirstPrintable' && pdgRef[name]===key))return 'edit';
    if(typeof char==='string' && Array.from(char).length===1 && !/[\u0000-\u001f\u007f-\u009f]/.test(char))replaceSelection(editor,char);
    return 'edit';
}
function layout(width,height,submitLabel=I18n.getString(528,'<Enter> Start'),measure=(text,size)=>Array.from(String(text)).length*size/2) {
    if(height<300) {
        const Caption=require('./button-caption.js'),rect={x:20,y:10,width:Math.min(480,width-40),height:height-20};rect.x=(width-rect.width)/2;
        const available=rect.width-48,buttons=[{action:'cancel',label:I18n.getString(683,'Cancel'),key:'Esc'},{action:'submit',label:submitLabel,key:'Enter'}];
        const widths=buttons.map(button=>Caption.width(button.label,button.key,measure,{size:11})+12),stacked=widths[0]+widths[1]+8>available;
        const footerTop=rect.y+rect.height-12-(stacked?68:30),field={x:rect.x+24,y:rect.y+84,width:available,height:32};
        return {compact:true,buttonSize:11,rect,field,footerTop,buttons:buttons.map((button,index)=>({...button,rect:{x:rect.x+24+(stacked || index===0?0:available-widths[index]),y:footerTop+(stacked?index*38:0),width:stacked?available:widths[index],height:30}}))};
    }
    const rect={x:(width-Math.min(480,width-40))/2,y:(height-280)/2,width:Math.min(480,width-40),height:280};
    const field={x:rect.x+24,y:rect.y+106,width:rect.width-48,height:36};
    const Caption=require('./button-caption.js'),available=rect.width-48;
    const buttons=[{action:'cancel',label:I18n.getString(683,'Cancel'),key:'Esc'},
        {action:'submit',label:submitLabel,key:'Enter'}];
    const widths=buttons.map(button=>Math.max(150,Caption.width(button.label,button.key,measure,{size:13})+12));
    const stacked=widths[0]+widths[1]+8>available;
    return {rect,field,buttons:buttons.map((button,index)=>({...button,rect:{
        x:rect.x+24+(stacked || index===0?0:available-widths[index]),
        y:rect.y+(stacked?190+index*40:224),width:stacked?available:widths[index],height:30}}))};
}
function visibleText(editor,width,measure) {
    const characters=Array.from(editor.text);let start=0,end=characters.length;
    while(start<editor.caret && measure(characters.slice(start,editor.caret).join(''))>width)start++;
    while(end>editor.caret && measure(characters.slice(start,end).join(''))>width)end--;
    const range=selection(editor),left=Math.max(start,Math.min(end,range.start)),right=Math.max(left,Math.min(end,range.end));
    return {start,end,text:characters.slice(start,end).join(''),caret:measure(characters.slice(start,editor.caret).join('')),selectionStart:measure(characters.slice(start,left).join('')),selectionWidth:measure(characters.slice(left,right).join(''))};
}
function createPreferences(env=globalThis) {
    let storage=null,config=null;
    try{if(env.window)storage=env.window.localStorage;else if(env.pdg && env.pdg.cfg){config=env.pdg.cfg;config.useConfig('Galactica');}}catch(error){}
    return {read:()=>{try{const value=storage?storage.getItem('galactica.defaultPlayerName'):config?config.getConfigString('defaultPlayerName'):'';return validName(value)?value:'';}catch(error){return '';}},
        write:value=>{if(!validName(value))return;try{if(storage)storage.setItem('galactica.defaultPlayerName',value);else if(config)config.setConfigString('defaultPlayerName',value);}catch(error){}}};
}
module.exports={withEvent,selection,selectedText,replaceSelection,installClipboard,maximumLength,validName,createEditor,edit,layout,visibleText,createPreferences};
