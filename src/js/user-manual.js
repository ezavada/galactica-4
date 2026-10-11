// Open the bundled manual without invoking a shell or requiring network access.
const languages=Object.freeze(['en','de','es','fr','ja','ru']);
function manualLanguage(value) {return languages.includes(value)?value:'en';}
function createManual(baseDirectory,env=globalThis,dependencies={}) {
    const fs=dependencies.fs || require('fs'),path=dependencies.path || require('path');
    let failure=null,sequence=0;
    function open(language) {
        const request=++sequence;failure=null;
        const relative='data/manual/'+manualLanguage(language)+'.html',filename=path.join(baseDirectory,relative);
        try {
            if(!fs.existsSync(filename)){failure=944;return false;}
            if(env.document) {
                // Open synchronously in the click/key gesture so popup policies can permit it.
                const popup=env.open(new env.URL(relative,env.document.baseURI).href,'_blank');
                if(!popup){failure=945;return false;}
                popup.opener=null;return true;
            }
            const platform=dependencies.platform || process.platform;
            const launcher=platform==='darwin'?['open',[filename]]:platform==='win32'?
                ['rundll32.exe',['url.dll,FileProtocolHandler',filename]]:['xdg-open',[filename]];
            const execFile=dependencies.execFile || require('child_process').execFile;
            execFile(launcher[0],launcher[1],error=>{if(error && sequence===request)failure=945;});
            return true;
        } catch(error){if(sequence===request)failure=945;return false;}
    }
    function layout(width,height,measure) {
        const I18n=require('./i18n.js'),wrap=require('./hover-help.js').wrap;
        const panelWidth=Math.min(440,width-40),lines=wrap(I18n.getString(failure || 945),panelWidth-48,measure);
        const panelHeight=Math.min(height-40,110+lines.length*18),rect={x:(width-panelWidth)/2,y:(height-panelHeight)/2,width:panelWidth,height:panelHeight};
        const label=I18n.getString(834),key='Enter',buttonWidth=Math.min(panelWidth-48,Math.max(150,require('./button-caption.js').width(label,key,measure,{size:13})+12));
        return {rect,lines,label,key,button:{x:rect.x+(rect.width-buttonWidth)/2,y:rect.y+rect.height-44,width:buttonWidth,height:28}};
    }
    return {open,layout,error:()=>failure,clearError:()=>{failure=null;sequence++;}};
}
module.exports={languages,manualLanguage,createManual};
