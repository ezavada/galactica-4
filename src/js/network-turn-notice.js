const I18n=require('./i18n.js');
const duration=1500;
class TurnNotice {
    constructor(clock=()=>Date.now(),onClose=()=>{}){this.clock=clock;this.onClose=onClose;this.notice=null;}
    open(session,model,name){this.close();const startedAt=this.clock();this.notice={session,model,turn:model.turn,name,startedAt,deadline:startedAt+duration,overlay:model.overlay};return true;}
    close(){if(!this.notice)return false;const notice=this.notice;if(notice.overlay && notice.model.overlay===notice.overlay && Number.isFinite(notice.overlay.createdAt))notice.overlay.createdAt+=Math.max(0,this.clock()-notice.startedAt);this.notice=null;this.onClose();return true;}
    active(session,model){
        if(!this.notice)return false;
        if(this.clock()>=this.notice.deadline || this.notice.session!==session || this.notice.model!==model){this.close();return false;}
        return true;
    }
    layout(width,height,measure=text=>Array.from(text).length*7){
        if(!this.notice)return null;
        const text=I18n.formatString(1227,'',I18n.formatInteger(this.notice.turn),this.notice.name),w=Math.min(520,width-32),lines=[];
        let line='';for(const char of Array.from(text)){if(line && measure(line+char)>w-40){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
        const h=Math.min(height-32,Math.max(130,72+lines.length*20));
        return {rect:{x:(width-w)/2,y:(height-h)/2,width:w,height:h},title:I18n.getString(1226),lines};
    }
}
module.exports={TurnNotice,duration};
