// Runtime lessons have common source controls and complete localized presentation.
const fs=require('fs'),path=require('path'),Language=require('./language-settings.js'),Controller=require('./tutorial-controller.js');
const ids=[...Array.from({length:60},(_,i)=>i+1),100,101,103,1001,1002,1060];
const textKeys=[...Array.from({length:60},(_,i)=>String(i+1)),'100','101','103'];
const buttonKeys=['start','ok','retry','finish','hide','close'];
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const record=value=>!!value && typeof value==='object' && !Array.isArray(value);
const sameKeys=(object,keys)=>record(object) && Object.keys(object).length===keys.length && keys.every(key=>own(object,key));
const text=value=>typeof value==='string' && value.trim().length>0;
function decode(metadata,translation){
    if(!sameKeys(metadata,['format','pages']) || metadata.format!==1 || !Array.isArray(metadata.pages) ||
        metadata.pages.length!==ids.length || new Set(metadata.pages.map(p=>p && p.id)).size!==ids.length ||
        !ids.every(id=>metadata.pages.some(page=>page && page.id===id)))throw new Error('Invalid tutorial lesson metadata');
    if(!sameKeys(translation,['format','language','titles','buttons','text']) || translation.format!==1 ||
        !Language.supported(translation.language) || !record(translation.titles) ||
        !sameKeys(translation.text,textKeys) || !sameKeys(translation.buttons,buttonKeys) ||
        !Object.values(translation.text).every(text) || !Object.values(translation.buttons).every(text))throw new Error('Incomplete tutorial translation');
    const titles=[...new Set(metadata.pages.map(page=>page.titleKey))];
    if(!sameKeys(translation.titles,titles) || !Object.values(translation.titles).every(text))throw new Error('Incomplete tutorial headings');
    const pages=metadata.pages.map(page=>{
        if(!record(page.size) || !Number.isInteger(page.size.width) || page.size.width<=0 || !Number.isInteger(page.size.height) || page.size.height<=0 ||
            ![0,1,2].includes(page.variant) || !Number.isInteger(page.sound) || page.sound<0 ||
            !Number.isInteger(page.picture) || page.picture<0 || !Number.isInteger(page.binding) ||
            !Array.isArray(page.pictureRect) || page.pictureRect.length!==4 || !page.pictureRect.every(Number.isInteger) ||
            !sameKeys(page.position,['top','left','bottom','right']) || !Object.values(page.position).every(v=>typeof v==='boolean') ||
            !own(translation.text,page.textKey) || !own(translation.titles,page.titleKey) ||
            page.buttonKey!=='' && !buttonKeys.includes(page.buttonKey))throw new Error('Invalid tutorial presentation metadata');
        const result=JSON.parse(JSON.stringify(page));
        result.title=translation.titles[page.titleKey];result.text=translation.text[page.textKey];
        result.button=page.buttonKey?translation.buttons[page.buttonKey]:'';
        result.close=translation.buttons.close;result.language=translation.language;
        return result;
    });
    // Verify action destinations/exceptions against the same model used at runtime.
    new Controller(pages);
    return pages;
}
function load(dataDirectory,code=Language.current()){
    const language=Language.supported(code)?code:'en',directory=path.join(dataDirectory,'tutorial');
    const metadata=JSON.parse(fs.readFileSync(path.join(directory,'pages.json'),'utf8'));
    const translation=JSON.parse(fs.readFileSync(path.join(directory,'languages',language+'.json'),'utf8'));
    if(translation.language!==language)throw new Error('Wrong tutorial translation language');
    return decode(metadata,translation);
}
module.exports={load,decode};
