// Floating instructions deliberately leave the lesson's map/dialog interactive.
// Action-only pages have no forward control; progression belongs to Controller.
const Appearance=require('./panel-appearance.js');
const Placement=require('./window-placement.js');
const contains=(r,x,y)=>!!r && x>=r.x && y>=r.y && x<r.x+r.width && y<r.y+r.height;
function wrap(text,width,measure){
    const lines=[];
    for(const paragraph of text.split('\n')){
        if(!paragraph){lines.push('');continue;}
        let line='';
        // Split long words and scripts without spaces at Unicode boundaries.
        for(const token of paragraph.match(/\S+\s*/gu) || []){
            if(line && measure((line+token).trimEnd())>width){lines.push(line.trimEnd());line='';}
            for(const character of Array.from(token)){
                if(line && measure(line+character)>width){lines.push(line.trimEnd());line='';}
                if(line || character.trim())line+=character;
            }
        }
        if(line)lines.push(line.trimEnd());
    }
    return lines;
}
function overlap(a,b){if(!b)return 0;return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
class TutorialPanel {
    constructor(owner,options={}){
        this.owner=owner;this.options=options;this.page=null;this.scroll=0;this.captured=false;
        this.placement=new Placement(options.preferences || {readWindowPosition:()=>null,writeWindowPosition:()=>{}});
        this.styles=null;this.wrapped=null;
    }
    layout(screen,measure,targets=[]){
        const controller=this.owner.controller;
        if(controller.active && this.options.language && this.options.loadPages && controller.page.language!==this.options.language())
            controller.replacePresentation(this.options.loadPages(this.options.language()));
        const page=controller.active && controller.page;
        if(!page)return null;
        if(this.page!==page){this.page=page;this.scroll=0;this.placement.drag=null;}
        let width=Math.min(380,screen.width-20);
        if(targets.length){
            const left=Math.min(...targets.map(r=>r.x))-20;
            const right=screen.width-Math.max(...targets.map(r=>r.x+r.width))-20;
            const side=Math.max(left,right);if(side>=200)width=Math.min(width,side);
        }
        const size=14,leading=19,inner=Math.max(1,width-32);
        if(!this.wrapped || this.wrapped.page!==page || this.wrapped.width!==inner)
            this.wrapped={page,width:inner,lines:wrap(page.text,inner,text=>measure(text,size))};
        const lines=this.wrapped.lines;
        const height=Math.min(screen.height-20,Math.max(132,78+lines.length*leading));
        const visible=Math.max(1,Math.floor((height-78)/leading));
        this.scroll=Math.min(this.scroll,Math.max(0,lines.length-visible));
        // Prefer the source edge, then choose an edge that covers less of the
        // current setup, inspector, report or comparison window.
        const positions=[{x:10,y:10},{x:screen.width-width-10,y:10},{x:10,y:screen.height-height-10},{x:screen.width-width-10,y:screen.height-height-10}];
        const preferred=(page.position.right && !page.position.left?1:0)+(page.position.bottom && !page.position.top?2:0);
        const ordered=[positions[preferred],...positions.filter((_,i)=>i!==preferred)];
        ordered.sort((a,b)=>targets.reduce((s,t)=>s+overlap({...a,width,height},t)-overlap({...b,width,height},t),0));
        const base={...ordered[0],width,height};
        const closeWidth=Math.min(inner*.55,Math.max(68,measure(page.close,12)+24));
        const buttonWidth=page.button?Math.min(inner-closeWidth-8,Math.max(68,measure(page.button,12)+24)):0;
        const layout=this.placement.layout('tutorial',{rect:base,
            title:{x:base.x+16,y:base.y+7,width:inner,height:25},
            close:{x:base.x+16,y:base.y+height-36,width:closeWidth,height:26},
            button:page.button?{x:base.x+width-16-buttonWidth,y:base.y+height-36,width:buttonWidth,height:26}:null,
            text:{x:base.x+16,y:base.y+37,width:inner,height:visible*leading}},screen);
        return {...layout,lines,visible,size,leading,scroll:this.scroll,maxScroll:Math.max(0,lines.length-visible)};
    }
    mouseDown(x,y,screen,measure,targets=[]){
        const layout=this.layout(screen,measure,targets);if(!layout || !contains(layout.rect,x,y))return false;
        this.captured=true;
        if(contains(layout.close,x,y)){this.owner.stop('cancel');return true;}
        if(contains(layout.button,x,y)){this.owner.pressButton(this.options.context?this.options.context():{});return true;}
        if(contains(layout.title,x,y))this.placement.begin('tutorial',layout.rect,x,y,screen);
        return true;
    }
    mouseMove(x,y,leftButton){
        if(!this.placement.drag)return false;
        if(leftButton===false)this.mouseUp();else this.placement.move(x,y);
        return true;
    }
    mouseUp(x,y){const captured=this.captured || !!this.placement.drag;this.placement.end(x,y);this.captured=false;return captured;}
    wheel(x,y,delta,screen,measure,targets=[]){
        const layout=this.layout(screen,measure,targets);if(!layout || !contains(layout.rect,x,y))return false;
        this.scroll=Math.max(0,Math.min(layout.maxScroll,this.scroll+Math.sign(delta)*3));return true;
    }
    draw(port,screen,targets=[]){
        const measure=(text,size)=>port.getTextWidth(text,size),layout=this.layout(screen,measure,targets);
        if(!layout)return;
        if(!this.styles){const text=size=>new pdg.Attributes().fillColor(new pdg.Color('black')).textSize(size).textStyle(pdg.textStyle_Plain);
            this.styles={surface:new pdg.Attributes().roundedCorners(8),title:text(15),body:text(14),caption:text(12).textStyle(pdg.textStyle_Centered),
                button:new pdg.Attributes().fillColor(new pdg.Color(1,1,1,.9)).lineColor(new pdg.Color(0,0,0,.5)).lineThickness(.7).roundedCorners(4),
                light:new pdg.Attributes().lineColor(new pdg.Color(1,.91,.58,.95)).lineThickness(1),shade:new pdg.Attributes().lineColor(new pdg.Color(.52,.33,.06,.9)).lineThickness(1)};}
        const s=this.styles,rect=r=>new pdg.Rect(r.x,r.y,r.x+r.width,r.y+r.height);
        Appearance.applySystemSurface(s.surface,layout.rect);port.drawRect(rect(layout.rect),s.surface);Appearance.drawGoldEdges(port,layout.rect,s.light,s.shade);
        let title=this.page.title;while(title && measure(title,15)>layout.title.width)title=Array.from(title).slice(0,-1).join('');
        port.drawText(title,new pdg.Point(layout.title.x,layout.title.y+18),s.title);
        layout.lines.slice(this.scroll,this.scroll+layout.visible).forEach((line,i)=>port.drawText(line,new pdg.Point(layout.text.x,layout.text.y+14+i*layout.leading),s.body));
        for(const [r,label] of [[layout.close,this.page.close],[layout.button,this.page.button]])if(r){
            port.drawRect(rect(r),s.button);let size=12;while(size>8 && measure(label,size)>r.width-12)size--;
            s.caption.textSize(size);port.drawText(label,new pdg.Point(r.x+r.width/2,r.y+r.height/2+size*.3),s.caption);
        }
        if(layout.maxScroll){
            const x=layout.rect.x+layout.rect.width-8,y=layout.text.y+layout.text.height*this.scroll/layout.lines.length;
            port.drawLine(new pdg.Point(x,y),new pdg.Point(x,y+layout.text.height*layout.visible/layout.lines.length),s.shade);
        }
    }
}
module.exports=TutorialPanel;
module.exports.wrap=wrap;
