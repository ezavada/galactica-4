const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,screen){
 const game=display.game,width=screen.width-40,inner=width-28,rows=game.getSystemShipRows(),measure=(text,size)=>display.port.getTextWidth?display.port.getTextWidth(text,size):Array.from(text).length*size/2;
 const title=I18n.formatString(687,'Ships at {0}',game.systemShipWindowStar?display.getStarDiagnostics(game.systemShipWindowStar).title:display.STR.none);
 const titleLines=wrap(title,inner,t=>measure(t,14)),titleHeight=Math.max(32,titleLines.length*18+12);
 const pageSize=2,pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.max(0,Math.min(pages-1,game.systemShipPage || 0));game.systemShipPage=page;
 const footerButtons=[{label:I18n.getString(690),disabled:page===0,action:{type:'systemShipPage',page:page-1}},
  {label:I18n.getString(691),disabled:page===pages-1,action:{type:'systemShipPage',page:page+1}},
  {label:I18n.getString(978),key:'Esc',action:{type:'closeWindow',window:'systemShips'}}];
 const footerRows=display.layoutButtonRow(footerButtons,{x:0,y:0,width:inner,height:24,size:10}).rows;
 const rect=display.fitWindowToScreen('systemShips',{x:20,y:84,width,height:screen.height-20}),footerTop=rect.y+rect.height-12-footerRows*32;
 const bodyClip={x:rect.x+14,y:rect.y+titleHeight+6,width:inner,height:Math.max(32,footerTop-rect.y-titleHeight-30)};
 const definitions=[['name',display.STR.name.replace(/:$/,'')],['tech',display.STR.tech.replace(/:$/,'')],['power',display.STR.power.replace(/:$/,'')],['damage',display.STR.damage.replace(/:$/,'')],['speed',display.STR.speed.replace(/:$/,'')]];
 const sorts=display.layoutButtonRow(definitions.map(([key,label])=>({label:label+(game.systemShipSort.key===key?(game.systemShipSort.ascending?' ↑':' ↓'):''),active:game.systemShipSort.key===key,action:{type:'sortSystemShips',key}})),{x:bodyClip.x,y:bodyClip.y,width:inner,height:24,size:10}).regions;
 let y=Math.max(bodyClip.y,...sorts.map(button=>button.rect.y+button.rect.height))+8;
 const records=rows.slice(page*pageSize,(page+1)*pageSize).map(row=>{
  const nameLines=wrap((row.member?'↳ ':'')+row.name,inner-16,t=>measure(t,11));
  const name={rect:{x:bodyClip.x,y,width:inner,height:nameLines.length*16+12},label:row.name,action:{type:'selectObject',object:row.object,center:true,closeWindow:true}};y+=name.rect.height+4;
  const lines=definitions.slice(1).flatMap(([key,label])=>wrap(label+': '+(key==='damage'?row.damage:I18n.formatDecimal(row[key])),inner-12,t=>measure(t,11)));
  const detailsY=y;y+=lines.length*16+4;let scrap=null;
  if(game.canToggleScrap(row.object)){const label=I18n.getString(row.object.isToBeScrapped()?755:754);const labelLines=wrap(label,inner-24,t=>measure(t,10));scrap={rect:{x:bodyClip.x,y,width:inner,height:Math.max(24,labelLines.length*16+8)},label,labelLines,active:row.object.isToBeScrapped(),action:{type:'toggleScrap',object:row.object}};y+=scrap.rect.height+6;}
  y+=6;return {row,name,nameLines,lines,detailsY,scrap};
 });
 const emptyY=y,empty=records.length?[]:wrap(I18n.getString(689),inner,t=>measure(t,11));y+=empty.length*16;
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height),identity=game.systemShipWindowStar?.id;
 if(game.compactSystemShipPage!==page || game.compactSystemShipStar!==identity){game.systemShipBodyScroll=0;game.compactSystemShipPage=page;game.compactSystemShipStar=identity;}
 const bodyScroll=Math.max(0,Math.min(scrollLimit,game.systemShipBodyScroll || 0));game.systemShipBodyScroll=bodyScroll;
 for(const button of sorts)button.rect.y-=bodyScroll;for(const record of records){record.name.rect.y-=bodyScroll;record.detailsY-=bodyScroll;if(record.scrap)record.scrap.rect.y-=bodyScroll;}
 const footer=display.layoutButtonRow(footerButtons,{x:rect.x+14,y:footerTop,width:inner,height:24,size:10}).regions;
 return {compact:true,rect,titleLines,titleHeight,page,pages,pageSize,visibleRows:records.map(r=>r.row),bodyClip,bodyScroll,scrollLimit,sorts,records,empty,emptyY:emptyY-bodyScroll,footer,footerTop};
}
function regions(l){const c=l.bodyClip;return [...l.sorts,...l.records.flatMap(record=>[record.name,record.scrap].filter(Boolean))].map(button=>{const top=Math.max(c.y,button.rect.y),bottom=Math.min(c.y+c.height,button.rect.y+button.rect.height);return {...button,rect:{...button.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(button=>button.rect.height>0).concat(l.footer);}
function draw(display,l){
 const r=l.rect;display.drawWindowPanel(r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+22+i*18,'lightgray',14));
 const c=l.bodyClip,old=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{
  l.sorts.forEach(button=>display.drawUIButton(button.rect,button.label,null,{size:10,active:button.active}));
  for(const record of l.records){
   const cue=display.getFleetMemberNameStyle(record.row.object);display.drawUIButton(record.name.rect,'',null,{size:11,tooltipLabel:record.name.label});
   record.nameLines.forEach((line,i)=>display.drawTextLine(line,record.name.rect.x+8,record.name.rect.y+18+i*16,record.row.member || record.row.object.isToBeScrapped() && display.game.isOwnerAlliedWith(display.game.getCurrentHumanPlayer(),record.row.object.owner)?'gray':cue.nameColor,11,cue.nameStyle));
   record.lines.forEach((line,i)=>display.drawTextLine(line,c.x+6,record.detailsY+12+i*16,'lightgray',11));
   if(record.scrap){const b=record.scrap;display.drawUIButton(b.rect,'',null,{size:10,active:b.active,tooltipLabel:b.label});b.labelLines.forEach((line,i)=>display.drawTextLine(line,b.rect.x+b.rect.width/2,b.rect.y+16+i*16,'lightgray',10,pdg.textStyle_Centered));}
  }
  l.empty.forEach((line,i)=>display.drawTextLine(line,c.x,l.emptyY+i*16,'gray',11));
 }finally{display.port.setClipRect(old);}
 if(l.scrollLimit){const style=display.systemShipScrollStyle || (display.systemShipScrollStyle=display.createAttributes({fillColor:new pdg.Color(.7,.7,.7,.7),lineOpacity:0}));const height=Math.max(10,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+3,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-height),width:3,height},1,style);}
 display.drawTextLine(`${l.page+1} / ${l.pages}`,r.x+r.width/2,l.footerTop-8,'gray',10,pdg.textStyle_Centered);l.footer.forEach(button=>display.drawUIButton(button.rect,button.label,button.key,{size:10,disabled:button.disabled}));
}
module.exports={layout,regions,draw};
