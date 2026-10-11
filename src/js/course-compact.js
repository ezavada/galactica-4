const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,screen){
 const game=display.game,width=screen.width-40,inner=width-28,rows=game.getCourseRows();
 const title=I18n.formatString(727,'Course: {0}',game.courseWindowObject?game.getObjectDisplayName(game.courseWindowObject):display.STR.none);
 const titleLines=wrap(title,inner,t=>display.port.getTextWidth(t,14)),titleHeight=Math.max(32,titleLines.length*18+12);
 const pageSize=2,pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.max(0,Math.min(pages-1,game.coursePage || 0));game.coursePage=page;
 const footerButtons=[{label:I18n.getString(690),disabled:page===0,action:{type:'coursePage',page:page-1}},
  {label:I18n.getString(691),disabled:page===pages-1,action:{type:'coursePage',page:page+1}},
  {label:I18n.getString(531),key:'Esc',action:{type:'closeCourse'}}];
 const footerRows=display.layoutButtonRow(footerButtons,{x:0,y:0,width:inner,height:24,size:10}).rows;
 const rect=display.fitWindowToScreen('course',{x:20,y:84,width,height:screen.height-20});
 const footerTop=rect.y+rect.height-12-footerRows*32,bodyClip={x:rect.x+14,y:rect.y+titleHeight+6,width:inner,height:Math.max(32,footerTop-rect.y-titleHeight-30)};
 let y=bodyClip.y;const records=rows.slice(page*pageSize,(page+1)*pageSize).map(row=>{
  const nameLines=wrap((row.index+1)+'. '+display.getCourseWaypointDescription(row.target),inner-12,t=>display.port.getTextWidth(t,11));
  const times=I18n.getString(737)+' '+I18n.getString(735)+': '+(row.turns===null?'-':row.turns)+' · '+I18n.getString(738)+' '+I18n.getString(735)+': '+(row.remaining===null?'-':row.remaining);
  const timeLines=wrap(times,inner-12,t=>display.port.getTextWidth(t,10)),height=(nameLines.length+timeLines.length)*16+10;
  const record={row,nameLines,timeLines,rect:{x:bodyClip.x,y,width:inner,height}};y+=height+4;return record;
 });
 const empty=records.length?[]:wrap(I18n.getString(728),inner,t=>display.port.getTextWidth(t,11));y+=empty.length*16;
 const commandLayout=display.layoutButtonRow([...display.getCourseCommandButtons(),...display.getCourseModeButtons()],{x:bodyClip.x,y:y+6,width:inner,height:24,size:10});
 const commands=commandLayout.regions,scrollLimit=Math.max(0,y+6+commandLayout.rows*32-bodyClip.y-bodyClip.height);
 const identity=game.courseWindowObject && game.courseWindowObject.id;
 if(game.compactCoursePage!==page || game.compactCourseObject!==identity){game.courseBodyScroll=0;game.compactCoursePage=page;game.compactCourseObject=identity;}
 const bodyScroll=Math.max(0,Math.min(scrollLimit,game.courseBodyScroll || 0));game.courseBodyScroll=bodyScroll;
 for(const item of [...records,...commands])item.rect.y-=bodyScroll;
 const footer=display.layoutButtonRow(footerButtons,{x:rect.x+14,y:footerTop,width:inner,height:24,size:10}).regions;
 return {compact:true,rect,rows,page,pages,pageSize,visibleRows:records.map(record=>record.row),records,commands,footer,bodyClip,bodyScroll,scrollLimit,titleLines,titleHeight,empty,footerTop};
}
function regions(layout){
 const clip=layout.bodyClip;
 return [...layout.records.map(record=>({rect:record.rect,action:{type:'selectWaypoint',index:record.row.index}})),...layout.commands].map(item=>{
  const top=Math.max(clip.y,item.rect.y),bottom=Math.min(clip.y+clip.height,item.rect.y+item.rect.height);
  return {...item,rect:{...item.rect,y:top,height:Math.max(0,bottom-top)}};
 }).filter(item=>item.rect.height>0).concat(layout.footer);
}
function draw(display,l){
 const r=l.rect;display.drawWindowPanel(r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+22+i*18,'lightgray',14));
 const clip=l.bodyClip,previous=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(clip.x,clip.y,clip.x+clip.width,clip.y+clip.height));
 try{
  l.empty.forEach((line,i)=>display.drawTextLine(line,clip.x,clip.y+16+i*16-l.bodyScroll,'gray',11));
  for(const record of l.records){const selected=display.game.courseSelection===record.row.index;
   if(selected || display.isHovered(record.rect))display.drawRoundedRect(record.rect,4,display.styles[selected?'buttonFillActive':'buttonFillHover']);
   record.nameLines.forEach((line,i)=>display.drawTextLine(line,record.rect.x+6,record.rect.y+16+i*16,'lightgray',11,record.row.current?pdg.textStyle_Bold:pdg.textStyle_Plain));
   record.timeLines.forEach((line,i)=>display.drawTextLine(line,record.rect.x+6,record.rect.y+16+(record.nameLines.length+i)*16,'gray',10));
   display.drawDivider(record.rect.x,record.rect.y+record.rect.height,record.rect.width);
  }
  l.commands.forEach(button=>display.drawUIButton(button.rect,button.label,button.key,{size:10,active:button.active}));
 }finally{display.port.setClipRect(previous);}
 if(l.scrollLimit){const h=Math.max(12,clip.height*clip.height/(clip.height+l.scrollLimit));display.drawRoundedRect({x:clip.x+clip.width-3,y:clip.y+l.bodyScroll/l.scrollLimit*(clip.height-h),width:3,height:h},1,display.styles.comparisonStripe);}
 display.drawTextLine(`${l.page+1} / ${l.pages}`,r.x+r.width/2,l.footerTop-8,'gray',10,pdg.textStyle_Centered);
 l.footer.forEach(button=>display.drawUIButton(button.rect,button.label,button.key,{size:10,disabled:button.disabled}));
}
module.exports={layout,regions,draw};
