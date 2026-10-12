const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,star,screen){
 const game=display.game,data=display.getStarDiagnostics(star),owned=game.canHumanControl(star),width=Math.min(360,screen.width-40),inner=width-28,measure=(text,size)=>display.port.getTextWidth?display.port.getTextWidth(text,size):Array.from(String(text)).length*size/2;
 const titleLines=wrap(data.title,inner,t=>measure(t,14)),titleHeight=Math.max(32,titleLines.length*18+12),rect=display.getAnchoredPanelRect(star,width,Math.min(420,screen.height-20)),bodyClip={x:rect.x+14,y:rect.y+titleHeight+6,width:inner,height:Math.max(24,rect.height-titleHeight-18)};
 let y=bodyClip.y+12;const hints=game.getColonySetupReport(star)?wrap(I18n.getString(856),inner,t=>measure(t,11)):[],hintY=y;y+=hints.length*15+(hints.length?8:0);
 const rows=[];function row(label,value,ratio=null){const lines=wrap(label.replace(/:$/,'')+': '+value,inner,t=>measure(t,11)),top=y;y+=lines.length*16;const barY=y;if(ratio!==null)y+=18;rows.push({lines,y:top,ratio,barY});}
 row(display.STR.owner,data.owner);row(display.STR.pop,data.population);row(display.STR.tech,data.tech);row(display.STR.building,data.building+(data.completion!==null?' · '+data.completion+'%':''),data.completion!==null?star.currentShip.progress/100:null);
 let destination=null;
 if(data.showDestination){
  const buttons=owned?[{label:I18n.getString(962),action:{type:'beginOrders',object:star}}]:[];if(owned && star.getDefaultDestination())buttons.push({label:I18n.getString(963),action:{type:'clearDefaultDestination',object:star}});
  const widths=buttons.map(b=>display.getButtonWidth(b.label,null,{size:10,minWidth:36})),reserve=widths.reduce((a,b)=>a+b,0)+buttons.length*4,lines=wrap(I18n.getString(684)+' '+data.destination,Math.max(32,inner-reserve),t=>measure(t,11)),top=y;y+=lines.length*16;
  let x=bodyClip.x+measure(lines.at(-1) || '',11)+4;const regions=buttons.map((b,i)=>{const r={...b,rect:{x,y:y-16-12,width:widths[i],height:16}};x+=widths[i]+4;return r;});destination={lines,y:top,text:data.destination,label:I18n.getString(684),regions};
 }
 row(I18n.getString(722),data.totalDefense);row(I18n.getString(723),data.satelliteDefense);row(I18n.getString(724),data.shipDefense);if(data.eta!==null)row(I18n.getString(679),data.eta);
 const productionY=y,sliders=[];let equalize=null;
 if(data.showProduction){y+=18;const entries=game.getStarAllocationEntries(star);
  for(const entry of entries){const allocation=data.allied?entry.allocation:{value:0,desired:0,locked:false},trackRect={x:bodyClip.x,y:y+18,width:inner-(owned?62:0),height:8};
   sliders.push({...entry,allocation,star,compact:true,labelY:y+11,rect:{x:trackRect.x,y:trackRect.y-5,width:trackRect.width,height:18},trackRect,compactLockRect:owned?{x:trackRect.x+trackRect.width+4,y:trackRect.y-7,width:26,height:18}:null,actionType:'setAllocation'});y+=40;
  }
  if(owned){const middle=sliders[1];equalize={rect:{x:middle.compactLockRect.x+30,y:middle.trackRect.y-7,width:24,height:22},action:{type:'equalizeAllocations',star},key:'=',inWindow:false};}
 }
 y+=8;const commands=display.layoutButtonRow(display.getContextActions(star).map(b=>({...b,action:{...b.action,object:star}})),{x:bodyClip.x,y,width:inner,height:26,size:10}).regions;y=Math.max(y,...commands.map(b=>b.rect.y+b.rect.height))+6;
 if(game.compactStarInspectorObject!==star.id){game.starInspectorScroll=0;game.compactStarInspectorObject=star.id;}
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height),bodyScroll=Math.max(0,Math.min(scrollLimit,game.starInspectorScroll || 0));game.starInspectorScroll=bodyScroll;
 rows.forEach(r=>{r.y-=bodyScroll;r.barY-=bodyScroll;});if(destination){destination.y-=bodyScroll;destination.regions.forEach(b=>b.rect.y-=bodyScroll);}sliders.forEach(s=>{s.labelY-=bodyScroll;s.rect.y-=bodyScroll;s.trackRect.y-=bodyScroll;if(s.compactLockRect)s.compactLockRect.y-=bodyScroll;});if(equalize)equalize.rect.y-=bodyScroll;commands.forEach(b=>b.rect.y-=bodyScroll);
 return {compact:true,rect,data,owned,titleLines,titleHeight,bodyClip,bodyScroll,scrollLimit,hints,hintY:hintY-bodyScroll,rows,destination,sliders,equalize,productionY:productionY-bodyScroll,commands};
}
function clipped(l,buttons){const c=l.bodyClip;return buttons.map(b=>{const top=Math.max(c.y,b.rect.y),bottom=Math.min(c.y+c.height,b.rect.y+b.rect.height);return {...b,rect:{...b.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(b=>b.rect.height>0);}
function sliders(l){if(!l.owned)return [];return clipped(l,l.sliders).map(s=>({...s,compactLockRect:s.compactLockRect?clipped(l,[{rect:s.compactLockRect}])[0]?.rect:null}));}
function commands(l){return clipped(l,l.commands);}
function destination(l){if(!l.destination)return {regions:[]};return {...l.destination,regions:clipped(l,l.destination.regions)};}
function draw(display,star,l){
 const r=l.rect,c=l.bodyClip;display.drawAnchoredPanel(star,r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+22+i*18,'lightgray',14));display.drawDivider(r.x+14,r.y+l.titleHeight-4,r.width-28);
 const old=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{
  l.hints.forEach((line,i)=>display.drawTextLine(line,c.x,l.hintY+i*15,'lightgray',11));for(const row of l.rows){row.lines.forEach((line,i)=>display.drawTextLine(line,c.x,row.y+i*16,'lightgray',11));if(row.ratio!==null)display.drawBar(c.x,row.barY,Math.min(100,c.width),4,row.ratio,'lightgray');}
  if(l.destination){l.destination.lines.forEach((line,i)=>display.drawTextLine(line,c.x,l.destination.y+i*16,'lightgray',11));l.destination.regions.forEach(b=>display.drawUIButton(b.rect,b.label,null,{size:10}));}
  if(l.data.showProduction){display.drawTextLine(display.STR.production+': '+l.data.production,c.x,l.productionY+12,'lightgray',12);l.sliders.forEach((s,i)=>{const desired=display.game.getAllocationDesired(s.allocation),actual=s.allocation.value ?? desired,t=s.trackRect;display.drawTextLine(s.label,c.x,s.labelY,'labelgray',11);display.drawRightTextLine(l.data.allied?I18n.formatPercentage(desired)+'%':'?',t.x+t.width,s.labelY,'lightgray',11);display.drawBar(t.x,t.y,t.width,t.height,actual/100,['green','cyan','purple'][i]);const marker=t.x+display.clamp(t.width*desired/100,0,t.width);display.port.drawLine(new pdg.Point(marker,t.y-3),new pdg.Point(marker,t.y+9),display.getLineAttributes('lightgray'));if(s.compactLockRect)display.drawUIButton(s.compactLockRect,s.allocation.locked?I18n.getString(675):I18n.getString(674),null,{bare:true,icon:s.allocation.locked?'lock':'unlock',iconOnly:true,size:9,active:s.allocation.locked});});}
  if(l.equalize)display.drawUIButton(l.equalize.rect,'=',null,{size:18,tooltipLabel:require('./button-caption.js').tooltip(I18n.getString(676),'=')});l.commands.forEach(b=>display.drawUIButton(b.rect,b.label,b.key,{size:10,active:b.action.type==='buildShip' && star.currentShip?.type===b.action.shipType,tooltipLabel:b.action.type==='buildShip'?I18n.formatString(961,'',b.label):null}));
 }finally{display.port.setClipRect(old);}
 if(l.scrollLimit){const style=display.starInspectorScrollStyle || (display.starInspectorScrollStyle=display.createAttributes({fillColor:new pdg.Color(.7,.7,.7,.7),lineOpacity:0})),height=Math.max(10,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+3,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-height),width:3,height},1,style);}
}
module.exports={layout,sliders,commands,destination,clipped,draw};
