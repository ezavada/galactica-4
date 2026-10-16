const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');

function layout(display,source,screen){
 const {rows,columns,extrema}=source,game=display.game;
 const width=screen.width-32,inner=width-28,nameWidth=Math.floor(inner/2),valueWidth=inner-nameWidth;
 const measure=text=>display.port.getTextWidth(text,11);
 const metrics=columns.slice(1).map(column=>{
  const group=['minimumTech','maxTech','averageTech'].includes(column.key)?820:['minimumShipTech','maximumShipTech','averageShipTech'].includes(column.key)?821:null;
  const label=group?I18n.getString(group)+'|'+column.label.split('|').pop():column.label;
  return {...column,label,labelLines:label.split('|').flatMap(line=>wrap(line,valueWidth-12,measure))};
 });
 const columnPage=Math.max(0,Math.min(metrics.length-1,game.playerComparisonColumnPage || 0));game.playerComparisonColumnPage=columnPage;
 const nameLabel=wrap(columns[0].label,nameWidth-22,measure);
 const headerHeight=Math.max(nameLabel.length,...metrics.map(column=>column.labelLines.length))*16+12;
 const records=rows.map(row=>({row,nameLines:wrap(row.name,nameWidth-22,measure),values:metrics.map(column=>{
  const hidden=!row.isAlive || row.playerNum===0 && ['ships','power','minimumShipTech','maximumShipTech','averageShipTech'].includes(column.key);
  return wrap(hidden?'—':I18n.formatInteger(row[column.key]),valueWidth-12,measure);
 })}));
 // Keep row height and player pages stable when changing the displayed statistic.
 const rowHeight=Math.max(26,...records.map(record=>Math.max(record.nameLines.length,...record.values.map(lines=>lines.length))*16+12));
 const commands=[
  {label:I18n.getString(690),action:{type:'playerComparisonPage',delta:-1}},
  {label:I18n.getString(691),action:{type:'playerComparisonPage',delta:1}},
  {label:display.STR.escClose,action:{type:'closePlayerComparison'}}];
 const commandRows=display.layoutButtonRow(commands,{x:0,y:0,width:inner,height:24,size:10}).rows;
 const legend=wrap(I18n.getString(818),inner,text=>display.port.getTextWidth(text,10));
 const fixedHeight=40+headerHeight+legend.length*14+24+32+commandRows*32+12;
 const pageSize=Math.max(1,Math.floor((screen.height-20-fixedHeight)/rowHeight));
 const pages=Math.max(1,Math.ceil(rows.length/pageSize)),page=Math.max(0,Math.min(pages-1,game.playerComparisonPage || 0));game.playerComparisonPage=page;
 const visibleRecords=records.slice(page*pageSize,(page+1)*pageSize);
 const bodyHeight=Math.min(Math.max(1,visibleRecords.length)*rowHeight,Math.max(32,screen.height-20-fixedHeight));
 const rect=display.fitWindowToScreen('comparison',{x:16,y:82,width,height:fixedHeight+bodyHeight});
 const bodyTop=rect.y+40+headerHeight,bodyBottom=bodyTop+bodyHeight;
 const scrollLimit=Math.max(0,visibleRecords.length*rowHeight-bodyHeight);
 if(game.compactComparisonBodyPage!==page){game.playerComparisonBodyScroll=0;game.compactComparisonBodyPage=page;}
 const bodyScroll=Math.max(0,Math.min(scrollLimit,game.playerComparisonBodyScroll || 0));game.playerComparisonBodyScroll=bodyScroll;
 const bodyClip={x:rect.x+14,y:bodyTop,width:inner,height:bodyHeight};
 const legendTop=bodyBottom+4,columnTop=legendTop+legend.length*14+20,footerTop=columnTop+32;
 const footer=display.layoutButtonRow(commands,{x:rect.x+14,y:footerTop,width:inner,height:24,size:10}).regions.map(button=>({...button,
  disabled:button.action.delta===-1?page===0:button.action.delta===1?page===pages-1:false,
  action:button.action.type==='playerComparisonPage'?{type:button.action.type,page:page+button.action.delta}:button.action}));
 const columnButtons=[
  {label:'←',key:'←',tooltip:I18n.getString(1247),disabled:columnPage===0,action:{type:'playerComparisonColumn',page:columnPage-1}},
  {label:'→',key:'→',tooltip:I18n.getString(1248),disabled:columnPage===metrics.length-1,action:{type:'playerComparisonColumn',page:columnPage+1}}];
 columnButtons.forEach((button,index)=>{const w=display.getButtonWidth(button.label,button.key,{size:10,minWidth:50});button.rect={x:index?rect.x+rect.width-14-w:rect.x+14,y:columnTop,width:w,height:24};});
 return {...source,compact:true,rect,page,pages,pageSize,visibleRows:visibleRecords.map(record=>record.row),visibleRecords,
  metrics,columnPage,nameWidth,valueWidth,nameLabel,headerHeight,rowHeight,bodyTop,bodyBottom,bodyClip,bodyScroll,scrollLimit,legend,legendTop,columnTop,
  footer:[...columnButtons,...footer]};
}

function draw(display,layout){
 const {rect:r,nameWidth,valueWidth,visibleRecords,rowHeight,bodyTop,columnPage,metrics}=layout;
 display.drawWindowPanel(r,display.STR.empireComparison);
 const nameX=r.x+34,valueX=r.x+14+nameWidth+valueWidth/2,column=metrics[columnPage];
 layout.nameLabel.forEach((line,i)=>display.drawTextLine(line,nameX,r.y+54+i*16,'lightgray',11));
 column.labelLines.forEach((line,i)=>display.drawTextLine(line,valueX,r.y+54+i*16,'lightgray',11,pdg.textStyle_Centered));
 display.drawDivider(r.x+14,bodyTop-4,r.width-28);
 const previousClip=display.port.getClipRect(),clip=layout.bodyClip;
 display.port.setClipRect(new pdg.Rect(clip.x,clip.y,clip.x+clip.width,clip.y+clip.height));
 try{visibleRecords.forEach((record,index)=>{
  const {row}=record,y=bodyTop+index*rowHeight-layout.bodyScroll;
  if(index%2)display.drawRoundedRect({x:r.x+14,y,width:r.width-28,height:rowHeight},3,display.styles.comparisonStripe);
  if(row.playerNum>0)display.port.drawCircle(new pdg.Point(r.x+22,y+12),3,display.createAttributes({fillColor:display.getOwnerColor(row.playerNum) || display.getUIColor('textLight'),lineOpacity:0}));
  record.nameLines.forEach((line,i)=>display.drawTextLine(line,nameX,y+16+i*16,row.isAlive?'lightgray':'gray',11,row.italicizeName?pdg.textStyle_Italic:pdg.textStyle_Plain));
  const color=display.getPlayerComparisonCellColor(row,column.key,layout.extrema);
  record.values[columnPage].forEach((line,i)=>{
   display.drawTextLine(line,valueX,y+16+i*16,color,11,pdg.textStyle_Centered);
   if(display.isSystemWindowDrawing() && ['comparisonBest','comparisonWorst'].includes(color)){
    const w=display.port.getTextWidth(line,11)+4;
    display.port.drawLine(new pdg.Point(valueX-w/2,y+19+i*16),new pdg.Point(valueX+w/2,y+19+i*16),display.getLineAttributes(color).lineThickness(1.5));
   }
  });
 });}finally{display.port.setClipRect(previousClip);}
 if(layout.scrollLimit){const h=Math.max(12,clip.height*clip.height/(clip.height+layout.scrollLimit)),y=clip.y+layout.bodyScroll/layout.scrollLimit*(clip.height-h);display.drawRoundedRect({x:clip.x+clip.width-3,y,width:3,height:h},1,display.styles.comparisonStripe);}
 layout.legend.forEach((line,i)=>display.drawTextLine(line,r.x+r.width/2,layout.legendTop+12+i*14,'gray',10,pdg.textStyle_Centered));
 display.drawTextLine(`${layout.page+1} / ${layout.pages}`,r.x+r.width/2,layout.legendTop+layout.legend.length*14+14,'gray',10,pdg.textStyle_Centered);
 display.drawTextLine(`${columnPage+1} / ${metrics.length}`,r.x+r.width/2,layout.columnTop+16,'gray',10,pdg.textStyle_Centered);
 layout.footer.forEach(button=>display.drawUIButton(button.rect,button.label,button.key,{size:10,disabled:!!button.disabled,tooltipLabel:button.tooltip}));
}
module.exports={layout,draw};
