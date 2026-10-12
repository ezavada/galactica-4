const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,screen){
 const game=display.game,preferred=game.fleetRosterGeometry,width=Math.min(840,screen.width-32),height=Math.min(screen.height-20,Math.max(220,preferred?.height || Math.min(420,screen.height-20)));
 const rect=display.fitPanelToScreen({x:preferred?.x ?? (screen.width-width)/2,y:preferred?.y ?? 84,width,height}),inner=width-28,measure=(text,size)=>display.port.getTextWidth?display.port.getTextWidth(text,size):Array.from(String(text)).length*size/2;
 const rows=game.getFleetListRows(),pageSize=2,pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.max(0,Math.min(pages-1,game.fleetRosterPage || 0));game.fleetRosterPage=page;
 const buttons=[{label:I18n.getString(690),disabled:page===0,action:{type:'fleetRosterPage',page:page-1}},{label:I18n.getString(691),disabled:page===pages-1,action:{type:'fleetRosterPage',page:page+1}},{label:I18n.getString(978),key:'Esc',action:{type:'closeFleetRoster'}}];
 const footerRows=display.layoutButtonRow(buttons,{x:0,y:0,width:inner-28,height:24,size:10}).rows,footerTop=rect.y+height-12-footerRows*32;
 const bodyClip={x:rect.x+14,y:rect.y+38,width:inner,height:Math.max(24,footerTop-rect.y-54)};
 const definitions=[['name',display.STR.name],['tech',display.STR.tech],['speed',display.STR.speed],['power',display.STR.power],['ships',display.STR.ships],['damage',display.STR.damage],['colony',I18n.getString(453)],['destination',display.STR.destination]].map(([key,label])=>[key,label.replace(/:$/,'')]);
 const sorts=display.layoutButtonRow(definitions.map(([key,label])=>({label:label+(game.fleetRosterSort.key===key?(game.fleetRosterSort.ascending?' ↑':' ↓'):''),active:game.fleetRosterSort.key===key,action:{type:'sortFleetRoster',key}})),{x:bodyClip.x,y:bodyClip.y,width:inner,height:24,size:10}).regions;
 let y=Math.max(bodyClip.y,...sorts.map(b=>b.rect.y+b.rect.height))+4;
 const records=rows.slice(page*pageSize,(page+1)*pageSize).map(row=>{
  const nameLines=wrap(row.name,inner-36,t=>measure(t,11)),name={x:bodyClip.x,y,width:inner,height:nameLines.length*16+12},top=y;y+=name.height+4;
  const lines=definitions.slice(1).flatMap(([key,label])=>{const value=key==='speed'?I18n.formatDecimal(row.speed/16380):key==='damage'?I18n.formatPercentage(row.damage)+'%':key==='colony'?I18n.getString(row.colony?807:808):key==='ships'&&row.kind==='ship'?'—':typeof row[key]==='number'?I18n.formatDecimal(row[key],0):row[key];return wrap(label+': '+value,inner-12,t=>measure(t,11));});
  const detailsY=y;y+=lines.length*16+10;return {row,name,nameLines,lines,detailsY,rect:{x:bodyClip.x,y:top,width:inner,height:y-top},action:{type:'fleetRosterSelect',object:row.object}};
 });
 const emptyY=y,empty=records.length?[]:wrap(I18n.getString(806),inner,t=>measure(t,11));y+=empty.length*16;
 const hints=wrap(I18n.getString(809),inner,t=>measure(t,10)),hintY=y+8;y=hintY+hints.length*14;
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height);if(game.compactFleetRosterPage!==page){game.fleetRosterBodyScroll=0;game.compactFleetRosterPage=page;}
 const bodyScroll=Math.max(0,Math.min(scrollLimit,game.fleetRosterBodyScroll || 0));game.fleetRosterBodyScroll=bodyScroll;
 sorts.forEach(b=>b.rect.y-=bodyScroll);records.forEach(r=>{r.name.y-=bodyScroll;r.rect.y-=bodyScroll;r.detailsY-=bodyScroll;});
 const footer=display.layoutButtonRow(buttons,{x:rect.x+14,y:footerTop,width:inner-28,height:24,size:10}).regions;
 return {compact:true,rect,page,pages,pageSize,visibleRows:records.map(r=>r.row),bodyClip,bodyScroll,scrollLimit,sorts,records,footer,footerTop,empty,emptyY:emptyY-bodyScroll,hints,hintY:hintY-bodyScroll};
}
function regions(l){const c=l.bodyClip;return [...l.sorts,...l.records].map(b=>{const top=Math.max(c.y,b.rect.y),bottom=Math.min(c.y+c.height,b.rect.y+b.rect.height);return {...b,rect:{...b.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(b=>b.rect.height>0).concat(l.footer);}
function draw(display,l){
 display.drawWindowPanel(l.rect,display.STR.fleetRoster);const c=l.bodyClip,old=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{
  l.sorts.forEach(b=>display.drawUIButton(b.rect,b.label,null,{size:10,active:b.active}));
  for(const r of l.records){display.drawUIButton(r.name,'',null,{active:display.game.selectedObject===r.row.object,tooltipLabel:I18n.getString(809)});display.drawUIIcon(r.row.kind,r.name.x+12,r.name.y+18,12);r.nameLines.forEach((line,i)=>display.drawTextLine(line,r.name.x+26,r.name.y+18+i*16,'black',11));r.lines.forEach((line,i)=>display.drawTextLine(line,c.x+6,r.detailsY+12+i*16,'black',11));}
  l.empty.forEach((line,i)=>display.drawTextLine(line,c.x,l.emptyY+i*16,'gray',11));l.hints.forEach((line,i)=>display.drawTextLine(line,c.x,l.hintY+10+i*14,'gray',10));
 }finally{display.port.setClipRect(old);}
 if(l.scrollLimit){const style=display.fleetRosterScrollStyle || (display.fleetRosterScrollStyle=display.createAttributes({fillColor:new pdg.Color(.25,.25,.25,.7),lineOpacity:0})),height=Math.max(10,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+3,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-height),width:3,height},1,style);}
 display.drawTextLine(`${l.page+1} / ${l.pages}`,l.rect.x+l.rect.width/2,l.footerTop-8,'gray',10,pdg.textStyle_Centered);l.footer.forEach(b=>display.drawUIButton(b.rect,b.label,b.key,{size:10,disabled:b.disabled}));display.drawTableWindowResizeGrip(l.rect);
}
module.exports={layout,regions,draw};
