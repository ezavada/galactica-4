const I18n=require('./i18n.js'),Caption=require('./button-caption.js'),wrap=require('./text-wrapping.js');
function layout(display,source,rect){
 const game=display.game,inner=rect.width-28,measure=(text,size)=>display.port.getTextWidth(text,size);
 const titleLines=wrap(display.STR.commandMenu,inner,t=>measure(t,14)),titleExtra=Math.max(0,titleLines.length-1)*18;
 const hintLines=wrap(display.STR.keyboardShortcutsActive,inner,t=>measure(t,11));
 const close=source.find(button=>button.action.type==='closeWindow'),bodyClip={x:rect.x+14,y:rect.y+50+titleExtra+hintLines.length*16,width:inner-10,height:Math.max(32,close.rect.y-12-rect.y-50-titleExtra-hintLines.length*16)};
 let y=bodyClip.y;const buttons=source.filter(button=>button!==close).map(button=>{
  const caption=Caption.parts(button.label,button.key),available=bodyClip.width-24-(caption.key?measure(caption.key,9)+14:0)-(button.icon?26:0);
  const labelLines=wrap(caption.label,available,t=>measure(t,11)),height=Math.max(28,labelLines.length*16+10);
  const item={...button,labelLines,rect:{x:bodyClip.x,y,width:bodyClip.width,height}};y+=height+6;return item;
 });
 const error=game.fullscreen && game.fullscreen.error?wrap(I18n.getString(772),bodyClip.width,t=>measure(t,11)):[],errorY=y+12;y+=error.length*16;
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height),bodyScroll=Math.max(0,Math.min(scrollLimit,game.commandMenuScroll || 0));game.commandMenuScroll=bodyScroll;
 for(const button of buttons)button.rect.y-=bodyScroll;
 return {compact:true,rect,bodyClip,titleLines,titleExtra,hintLines,buttons,close,error,errorY:errorY-bodyScroll,bodyScroll,scrollLimit};
}
function regions(l){const c=l.bodyClip;return l.buttons.map(button=>{const top=Math.max(c.y,button.rect.y),bottom=Math.min(c.y+c.height,button.rect.y+button.rect.height);return {...button,rect:{...button.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(button=>button.rect.height>0).concat(l.close);}
function draw(display,l){
 const r=l.rect;display.drawWindowPanel(r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+16,r.y+22+i*18,'lightgray',14));display.drawDivider(r.x+14,r.y+28+l.titleExtra,r.width-28);
 l.hintLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+47+l.titleExtra+i*16,'gray',11));
 const c=l.bodyClip,previous=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{for(const button of l.buttons){
  if(button.labelLines.length===1)display.drawUIButton(button.rect,button.label,button.key,{size:11,icon:button.icon,active:button.active,disabled:button.disabled});
  else{display.drawUIButton(button.rect,'',button.key,{size:11,icon:button.icon,active:button.active,disabled:button.disabled,tooltipLabel:Caption.tooltip(button.label,button.key)});
   const caption=Caption.layout(button.rect,button.label,button.key,(text,size)=>display.port.getTextWidth(text,size),{size:11,icon:button.icon});
   button.labelLines.forEach((line,i)=>{const y=button.rect.y+(button.rect.height-button.labelLines.length*16)/2+12+i*16;
    if(button.disabled)display.port.drawText(line,new pdg.Point(caption.labelX,y),display.getTextAttributes('gray',11,pdg.textStyle_Centered));
    else display.drawTextLine(line,caption.labelX,y,'lightgray',11,pdg.textStyle_Centered);});
  }
 }l.error.forEach((line,i)=>display.drawTextLine(line,c.x,l.errorY+i*16,'lightgray',11));}finally{display.port.setClipRect(previous);}
 if(l.scrollLimit){const thumb=display.commandMenuScrollThumbStyle || (display.commandMenuScrollThumbStyle=display.createAttributes({fillColor:new pdg.Color(.3,.3,.3,.55),fillOpacity:1,lineOpacity:0}));const h=Math.max(12,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+4,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-h),width:4,height:h},2,thumb);}
 display.drawUIButton(l.close.rect,l.close.label,l.close.key,{size:10});
}
module.exports={layout,regions,draw};
