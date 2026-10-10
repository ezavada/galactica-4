// Keep localized button labels separate from their small, right-aligned key hint.
function parts(label,key=null){
    let text=String(label || ''),hint=key?String(key):null;
    const prefix=text.match(/^((?:<[^<>]+>(?:\s*\/\s*)?)+)\s*/);
    const suffix=text.match(/\s+((?:<[^<>]+>(?:\s*\/\s*)?)+)$/);
    const match=prefix || suffix;
    if(match){
        const keys=Array.from(match[1].matchAll(/<([^<>]+)>/g),item=>item[1]);
        const recognized=keys.every(key=>/^(?:[A-Za-z0-9+\-]|F\d{1,2}|Esc|Enter|Tab|Home|End|Space|Left|Right|Up|Down|(?:Shift|Ctrl|Alt|Cmd)\+.+)$/.test(key));
        if(recognized && (!hint || keys.includes(hint))){
            hint=hint || keys.join(' / ');text=prefix?text.slice(match[0].length):text.slice(0,-match[0].length);
        }
    }
    return {label:text.trim(),key:hint};
}
function width(label,key,measure,options={}){
    const caption=parts(label,key),size=options.size || 11,hintSize=options.hintSize || 9;
    const hint=caption.key?measure(caption.key,hintSize)+14:0;
    return Math.ceil(measure(caption.label,size)+hint+24+(options.icon?26:0));
}
function layout(rect,label,key,measure,options={}){
    const caption=parts(label,key),hintWidth=caption.key?measure(caption.key,options.hintSize || 9)+14:0;
    return {...caption,labelX:Math.round(rect.x+(rect.width-hintWidth+(options.icon?26:0))/2),
        keyX:Math.round(rect.x+rect.width-8),hintWidth};
}
function tooltip(label,key){const caption=parts(label,key);return caption.key?caption.label+' · '+caption.key:caption.label;}
module.exports={parts,width,layout,tooltip};
