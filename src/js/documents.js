const wrap=require('./text-wrapping.js');
const Save=require('./game-save.js'),Files=require('./document-files.js'),Name=require('./player-name.js'),I18n=require('./i18n.js');
class Documents {
    constructor(files,active,install,replace,close=()=>false) {this.files=files;this.active=active;this.install=install;this.replace=replace;this.close=close;this.pendingClose=null;this.dialog=null;this.sequence=0;this.onClosed=()=>{};this.onCanceled=()=>{};this.quitPending=false;this.syncNetwork=(session,model)=>{session.game=model;};}
    menu(){this.dialog={kind:'menu'};return true;}
    cancel(){if(this.dialog && this.dialog.kind==='busy' && ['save','hostStop'].includes(this.dialog.operation))return false;this.pendingClose=null;this.sequence++;this.files.cancelPick();this.dialog=null;this.onCanceled();return true;}
    status(id,...values){this.dialog={kind:'status',message:I18n.formatString(id,'',...values)};return true;}
    beginClose() {
        const session=this.active();if(!session || this.dialog && this.dialog.kind==='busy')return false;
        if(session.game.clientAdministrator)return this.finishClose(session);
        if(session.game.clientPlayerNum && session.network){this.pendingClose=session;return this.saveClient(session,true);}
        if(session.file && session.savedContent===Save.contentSignature(session.game))return this.finishClose(session);
        this.pendingClose=session;this.dialog={kind:'close'};return true;
    }
    finishClose(session) {
        if(this.active()!==session)return false;
        if(!this.close(session))return false;
        this.pendingClose=null;this.dialog=null;this.onClosed(session);return true;
    }
    beginSave(saveAs=false) {
        const session=this.active();if(!session)return false;
        if(session.game.clientAdministrator)return this.status(1167);
        if(session.game.clientPlayerNum)return saveAs || !session.network?this.status(1035):this.saveClient(session,false);
        if(!saveAs && session.file)return this.save(session.file.name,false);
        const name=session.file?session.file.name:Files.suggestedName(session.game.config.gameTitle);
        this.dialog={kind:'editor',operation:'save',editor:Name.createEditor(name,1024),saveAs:true,error:false};return true;
    }
    async saveClient(session,closing) {
        const token=++this.sequence;this.dialog={kind:'busy',operation:'save',message:I18n.getString(850)};
        try {
            const model=await session.network.flush();
            if(token!==this.sequence)return false;
            if(this.active()!==session){this.pendingClose=null;this.dialog=null;this.onCanceled();return false;}
            this.syncNetwork(session,model);
            if(closing)return this.finishClose(session);
            this.dialog=null;return true;
        }catch(error){
            if(token===this.sequence){if(this.active()===session)this.dialog={kind:'status',message:require('./network-join.js').errorText(error)};
                else{this.pendingClose=null;this.dialog=null;this.onCanceled();}}
            return false;
        }
    }
    beginOpen() {
        if(this.files.browser)return this.open();
        const session=this.active();this.dialog={kind:'editor',operation:'open',editor:Name.createEditor(session && session.file?session.file.name:'',1024),error:false};return true;
    }
    beginRevert() {
        const session=this.active();if(session && session.game.clientAdministrator)return this.status(1167);if(!session || !session.file)return this.status(854);
        this.dialog={kind:'revert'};return true;
    }
    submit() {
        const dialog=this.dialog;if(!dialog || dialog.kind!=='editor')return false;
        const name=dialog.editor.text.trim();if(!name){dialog.error=true;dialog.editor.error=true;return false;}
        if(dialog.operation==='open')return this.open(name);
        if(!this.files.browser && this.files.exists(name) && (!this.active().file || this.active().file.name!==name)) {
            this.dialog={kind:'overwrite',name};return true;
        }
        return this.save(name,dialog.saveAs);
    }
    async save(name,saveAs) {
        const session=this.active(),token=++this.sequence;if(!session)return false;if(session.game.clientAdministrator)return this.status(1167);if(session.game.clientPlayerNum)return saveAs || !session.network?this.status(1035):this.saveClient(session,this.pendingClose===session);this.dialog={kind:'busy',operation:'save',message:I18n.getString(850)};
        try {
            const text=Save.serialize(session.game),content=Save.contentSignature(session.game),reference=await this.files.save(text,name,session.file,saveAs);
            if(token!==this.sequence)return false;
            if(this.active()!==session){this.pendingClose=null;this.dialog=null;this.onCanceled();return false;}
            if(!reference){this.pendingClose=null;this.dialog=null;this.onCanceled();return false;}session.file=reference;session.savedContent=content;
            if(this.pendingClose===session){
                if(Save.contentSignature(session.game)===content)return this.finishClose(session);
                this.dialog={kind:'close'};return true;
            }
            this.status(848,reference.name);return true;
        }catch(error){if(token===this.sequence){if(this.active()===session)this.status(845);else{this.pendingClose=null;this.dialog=null;this.onCanceled();}}return false;}
    }
    async open(name=null) {
        const token=++this.sequence;this.dialog={kind:'busy',message:I18n.getString(851)};
        let reference;
        try{reference=await this.files.chooseOpen(name);}catch(error){if(token===this.sequence)this.status(846);return false;}
        if(token!==this.sequence)return false;if(!reference){this.dialog=null;return false;}
        let game;try{game=Save.restore(reference.text);if(game.config.hosting){this.status(1098);return false;}}catch(error){this.status(847);return false;}
        try{this.install(game,reference);if(this.active())this.active().savedContent=Save.contentSignature(game);this.dialog=null;return true;}catch(error){this.status(846);return false;}
    }
    async revert() {
        const session=this.active(),token=++this.sequence;if(session && session.game.clientAdministrator)return this.status(1167);if(!session || !session.file)return this.status(854);
        this.dialog={kind:'busy',message:I18n.getString(852)};
        try{const text=await this.files.read(session.file);if(token!==this.sequence || this.active()!==session)return false;
            const game=Save.restore(text);this.replace(game,{...session.file,text});session.savedContent=Save.contentSignature(game);this.dialog=null;return true;
        }catch(error){if(token===this.sequence)this.status(846);return false;}
    }
    action(action) {
        if(['messagePrevious','messageNext'].includes(action)){const d=this.dialog;if(!d || !d.messagePageCount || d.messagePageCount<2)return false;d.messagePage=Math.max(0,Math.min(d.messagePageCount-1,(d.messagePage || 0)+(action==='messageNext'?1:-1)));return true;}
        if(action==='cancel' || action==='ack')return this.cancel();
        if(action==='openHost')return !!(this.openHost && this.openHost());
        if(action==='host')return !!(this.host && this.host());
        if(action==='join')return !!(this.join && this.join());
        if(action==='quit')return !!(this.quit && this.quit());
        if(action==='close')return this.beginClose();
        if(action==='discardClose' && this.dialog && this.dialog.kind==='close')return this.finishClose(this.pendingClose);
        if(action==='saveClose' && this.dialog && this.dialog.kind==='close')return this.beginSave();
        if(action==='save')return this.beginSave();if(action==='saveAs')return this.beginSave(true);if(action==='open')return this.beginOpen();if(action==='revert')return this.beginRevert();
        if(action==='submit')return this.submit();if(action==='confirmRevert')return this.revert();if(action==='confirmOverwrite' && this.dialog && this.dialog.kind==='overwrite')return this.save(this.dialog.name,true);
        return false;
    }
    key(key) {
        const dialog=this.dialog;if(!dialog)return false;
        if(key===pdg.key_Escape)return this.cancel();
        if(dialog.messagePageCount>1 && [pdg.key_LeftArrow,pdg.key_RightArrow].includes(key))return this.action(key===pdg.key_LeftArrow?'messagePrevious':'messageNext');
        if(dialog.kind==='menu' && (key===81 || key===113))return !!(this.quit && this.quit());
        if(dialog.kind==='menu' && [72,104].includes(key))return !!(this.host && this.host());
        if(dialog.kind==='menu' && [74,106].includes(key))return !!(this.join && this.join());
        if(dialog.kind==='menu' && (key===87 || key===119))return this.beginClose();
        if(dialog.kind==='editor'){const action=Name.edit(dialog.editor,key);if(action==='submit')this.submit();return true;}
        if(key===13 || key===3){if(dialog.kind==='close')this.beginSave();else if(dialog.kind==='revert')this.revert();else if(dialog.kind==='overwrite')this.save(dialog.name,true);else if(dialog.kind==='status')this.cancel();}
        return true;
    }
    layout(width,height,measure=this.measure || ((text,size)=>Array.from(String(text)).length*size/2)) {
        const dialog=this.dialog;if(!dialog)return null;
        if(dialog.kind==='editor')return Name.layout(width,height,dialog.operation==='save'?I18n.getString(839):I18n.getString(841));
        const dialogHeight=dialog.kind==='menu'?Math.min(384,height-20):300,rect={x:(width-Math.min(480,width-40))/2,y:(height-dialogHeight)/2,width:Math.min(480,width-40),height:dialogHeight};
        let title=I18n.getString(838),message=dialog.message || '',buttons=[];
        if(dialog.kind==='menu'){
            const rows=[...(this.host?[['host',this.active() && this.active().game.clientAdministrator?1168:1050]]:[]),...(this.openHost?[['openHost',1083]]:[]),...(this.join?[['join',1005]]:[]),['save',839],['saveAs',840],['open',841],['revert',842],['close',989],...(this.quit?[['quit',996]]:[]),['cancel',683]];
            const pitch=Math.min(42,(rect.height-70)/rows.length),buttonHeight=Math.min(32,pitch-6);
            buttons=rows.map(([action,id],index)=>({action,label:I18n.getString(id),key:action==='host'?'H':action==='join'?'J':action==='close'?'W':action==='quit'?'Q':action==='cancel'?'Esc':null,rect:{x:rect.x+24,y:rect.y+54+index*pitch,width:rect.width-48,height:buttonHeight}}));
        }
        else {
            if(dialog.kind==='close'){title=I18n.getString(this.quitPending?996:989);message=I18n.formatString(this.quitPending?997:990,'',this.pendingClose.game.config.gameTitle);buttons.push({action:'saveClose',label:I18n.getString(991)},{action:'discardClose',label:I18n.getString(992)});}
            if(dialog.kind==='revert'){title=I18n.getString(842);message=I18n.getString(849);buttons.push({action:'confirmRevert',label:I18n.getString(842)});}
            if(dialog.kind==='overwrite'){title=I18n.getString(840);message=I18n.formatString(855,'',dialog.name);buttons.push({action:'confirmOverwrite',label:I18n.getString(839)});}
            if(dialog.kind!=='busy' || !['save','hostStop'].includes(dialog.operation))buttons.push({action:dialog.kind==='status'?'ack':'cancel',label:I18n.getString(dialog.kind==='status'?834:683)});
            const gap=8,buttonWidth=(rect.width-48-gap*(buttons.length-1))/Math.max(1,buttons.length);
            const keys=buttons.map(button=>['saveClose','confirmRevert','confirmOverwrite','ack'].includes(button.action)?'Enter':button.action==='cancel'?'Esc':null);
            const stacked=dialog.kind==='close' || buttons.some((button,index)=>require('./button-caption.js').width(button.label,keys[index],measure,{size:13})+12>buttonWidth);
            const startY=dialog.kind==='close'?164:stacked?rect.height-18-(buttons.length*40-10):248;
            buttons=buttons.map((button,index)=>({...button,key:keys[index],rect:{x:rect.x+24+(stacked?0:index*(buttonWidth+gap)),y:rect.y+startY+(stacked?index*40:0),width:stacked?rect.width-48:buttonWidth,height:30}}));
        }
        let messageLines=[],messagePage=0,messagePageCount=1;
        if(message){
            const lines=wrap(message,rect.width-48,text=>measure(text,13)),firstButtonY=buttons.length?Math.min(...buttons.map(b=>b.rect.y-rect.y)):rect.height-18;
            const capacity=bottom=>Math.max(1,Math.floor((bottom-12-78)/19)+1);
            let count=capacity(firstButtonY);
            if(lines.length>count){
                const pagerY=firstButtonY-38;count=capacity(pagerY);messagePageCount=Math.ceil(lines.length/count);
                messagePage=Math.max(0,Math.min(messagePageCount-1,dialog.messagePage || 0));
                buttons.push(...['messagePrevious','messageNext'].map((action,index)=>({action,label:I18n.getString(index?1034:1033),key:index?'→':'←',disabled:index?messagePage===messagePageCount-1:messagePage===0,rect:{x:rect.x+24+index*((rect.width-48)/2+4),y:rect.y+pagerY,width:(rect.width-48)/2-4,height:26}})));
            }
            messageLines=lines.slice(messagePage*count,(messagePage+1)*count);
            dialog.messagePage=messagePage;dialog.messagePageCount=messagePageCount;
        }
        return {rect,title,message,messageLines,messagePage,messagePageCount,buttons};
    }
}
module.exports=Documents;
