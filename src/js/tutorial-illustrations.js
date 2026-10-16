// Modern equivalents of v3's PICT teaching examples. Drawn from shared
// localized control captions so switching language never shows stale screenshots.
const I18n=require('./i18n.js');
const pictures=Object.freeze({7000:54,7001:46,7002:82,7003:42,7004:42,7005:82,7006:46,7007:86,7008:42,7009:62,7010:82,7011:62,7012:42,7013:62,8001:46});
class Illustrations {
    height(id){if(!id)return 0;if(!pictures[id])throw new Error('Unknown tutorial illustration');return pictures[id];}
    draw(port,id,r){
        if(!id || !r)return;
        if(!this.styles){
            const fill=c=>new pdg.Attributes().fillColor(new pdg.Color(c)).lineStyle(pdg.lineStyle_None);
            this.styles={panel:fill('#e4e5e6').roundedCorners(4),button:fill('#ffffff').lineStyle(pdg.lineStyle_Solid).lineColor(new pdg.Color(0,0,0,.5)).lineThickness(.7).roundedCorners(4),
                text:fill('#20242a').textSize(11).textStyle(pdg.textStyle_Plain),line:new pdg.Attributes().lineColor(new pdg.Color('#475667')).lineThickness(2),
                level:new pdg.Attributes().lineColor(new pdg.Color('white')).lineThickness(1),target:new pdg.Attributes().lineColor(new pdg.Color(0,.5,.7,.5)).lineThickness(2),green:fill('#4cbd52'),cyan:fill('#26c6da'),purple:fill('#bf50ce'),red:fill('#c65454'),track:fill('#646a72'),gold:fill('#c79f42')};
        }
        const s=this.styles,rect=(x,y,w,h,style)=>port.drawRect(new pdg.Rect(r.x+x,r.y+y,r.x+x+w,r.y+y+h),style),
            line=(x,y,a,b,style=s.line)=>port.drawLine(new pdg.Point(r.x+x,r.y+y),new pdg.Point(r.x+a,r.y+b),style),
            text=(label,x,y,width,size=11)=>{while(size>8 && port.getTextWidth(label,size)>width)size--;s.text.textSize(size);port.drawText(label,new pdg.Point(r.x+x,r.y+y),s.text);},
            button=(label,key='',x=0,y=5,w=r.width,h=30)=>{const hint=key?port.getTextWidth(key,9)+10:0;rect(x,y,w,h,s.button);text(label,x+10,y+h/2+4,w-20-hint);if(key)text(key,x+w-hint,y+h/2+4,hint-4,9);},
            star=(x,y)=>{port.drawCircle(new pdg.Point(r.x+x,r.y+y),4,s.gold);},
            ship=(x,y)=>{line(x-6,y+5,x,y-6);line(x,y-6,x+6,y+5);line(x+6,y+5,x-6,y+5);},
            cross=(x,y)=>{line(x-7,y-7,x+7,y+7);line(x-7,y+7,x+7,y-7);},
            arrow=(x,y,a,b)=>{line(x,y,a,b,s.target);const angle=Math.atan2(b-y,a-x);line(a,b,a-7*Math.cos(angle-.5),b-7*Math.sin(angle-.5),s.target);line(a,b,a-7*Math.cos(angle+.5),b-7*Math.sin(angle+.5),s.target);};
        rect(0,0,r.width,r.height,s.panel);
        switch(id){
            case 7000: {
                star(14,16);star(r.width-14,36);text('Galactica-4',32,33,r.width-64,24);break;
            }
            case 7001:case 8001:button(I18n.getString(836,'New Game…'),'N');break;
            case 7003:button(I18n.getString(563,'End Turn'),require('./input.js').endTurnLabel());break;
            case 7004:button(I18n.getString(555,'Orders'),'O');break;
            case 7006:button(I18n.getString(451,'Defense'),'D');break;
            case 7008:button('=','=');break;
            case 7012:button(I18n.getString(577,'Patrol'),'P');break;
            case 7002: {
                const labels=[I18n.getString(564,'Growth'),I18n.getString(3,'Ships:').replace(/:$/,''),I18n.getString(565,'Research')],colors=[s.green,s.cyan,s.purple];
                const left=Math.min(r.width*.45,Math.max(...labels.map(label=>port.getTextWidth(label,11)))+14),w=r.width-left-12;
                labels.forEach((label,i)=>{const y=12+i*24;text(label,8,y+8,left-12);rect(left,y,w,10,s.track);rect(left,y,w*[.55,.3,.15][i],10,colors[i]);line(left+w*[.3,.5,.2][i],y-2,left+w*[.3,.5,.2][i],y+12,s.level);});break;
            }
            case 7005: {
                ship(20,49);star(r.width-32,25);arrow(30,46,r.width-42,28);line(r.width-32,13,r.width-32,37);line(r.width-44,25,r.width-20,25);text('S-20',r.width-58,58,54);break;
            }
            case 7007: {
                star(22,28);star(r.width-22,28);cross(r.width/2,28);text('Andromeda',8,60,r.width/2-18);text('New Terra',r.width/2+10,60,r.width/2-18);break;
            }
            case 7009: {
                const label=I18n.getString(684,'Send to:')+' Alpha',w=Math.min(r.width-56,port.getTextWidth(label,11)+12);text(label,8,24,w-8);button(I18n.getString(962,'Set'),'',w,6,r.width-w-6,26);arrow(r.width/2,33,r.width/2,51);cross(r.width/2,53);break;
            }
            case 7010: {
                for(const [i,amount] of [1,.65,.2].entries()){const y=10+i*24;ship(15,y+5);rect(32,y,r.width-88,10,s.red);rect(32,y,(r.width-88)*amount,10,s.green);text(I18n.formatPercentage(amount*100)+'%',r.width-48,y+9,42);}break;
            }
            case 7011:case 7013: {
                ship(16,16);ship(33,16);ship(50,16);button(I18n.getString(801,'Exchange ships'),'',0,32,r.width,26);if(id===7013)arrow(64,16,r.width-16,16);break;
            }
            default:throw new Error('Unknown tutorial illustration');
        }
    }
}
module.exports=Illustrations;
module.exports.pictures=pictures;
