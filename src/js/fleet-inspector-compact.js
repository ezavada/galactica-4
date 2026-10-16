const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,fleet,screen){
 const game=display.game,knowledge=display.getFleetKnowledge(fleet),data=display.getFleetDiagnostics(fleet),members=knowledge.contents?fleet.ships || []:[],transferTargets=game.getFleetTransferTargets?game.getFleetTransferTargets(fleet):[];
 const types={};for(const ship of knowledge.contents?fleet.getLeafShips():[])types[ship.type]=(types[ship.type] || 0)+1;const compositionRows=Object.entries(types);
 const measure=(text,size)=>display.port.getTextWidth?display.port.getTextWidth(text,size):Array.from(String(text)).length*size/2,width=Math.min(350,screen.width-40),inner=width-28;
 const titleLines=wrap(data.title,inner,t=>measure(t,14)),titleHeight=Math.max(32,titleLines.length*18+12),height=Math.min(420,screen.height-20),rect=display.getAnchoredPanelRect(fleet,width,height);
 const pageSize=2,pages=Math.max(1,Math.ceil(members.length/pageSize)),page=Math.max(0,Math.min(pages-1,game.fleetMemberPage || 0));game.fleetMemberPage=page;
 const pageButtons=pages>1?[{label:I18n.getString(690),disabled:page===0,action:{type:'fleetMemberPage',fleet,page:page-1}},{label:I18n.getString(691),disabled:page===pages-1,action:{type:'fleetMemberPage',fleet,page:page+1}}]:[];
 const footerRows=pageButtons.length?display.layoutButtonRow(pageButtons,{x:0,y:0,width:inner,height:24,size:10}).rows:0,footerTop=rect.y+height-12-footerRows*32;
 const bodyClip={x:rect.x+14,y:rect.y+titleHeight+6,width:inner,height:Math.max(24,footerTop-rect.y-titleHeight-(pages>1?22:10))};
 const summary=[[display.STR.ships,data.count],[display.STR.totalPower,data.power],[display.STR.speed,data.speed],[display.STR.techLevel,data.tech]];
 if((fleet.isOnPatrol() || fleet.isToBeScrapped()) && game.canViewCourse(fleet))summary.push([I18n.getString(699),I18n.getString(fleet.isToBeScrapped()?756:703)]);
 for(const [type,count] of compositionRows)summary.push([display.getShipTypeName(type,{capitalized:true})+':',I18n.formatInteger(count)]);
 if(knowledge.full && fleet.destination)summary.push([display.STR.movingTo,display.getSpacePointDescription(fleet.destination)]);
 const lines=summary.flatMap(([label,value])=>wrap(label.replace(/:$/,'')+': '+value,inner,t=>measure(t,11)));let y=bodyClip.y+12+lines.length*16+4;
 const commands=display.layoutButtonRow(display.getContextActions(fleet).map(button=>({...button,action:{...button.action,object:fleet}})),{x:bodyClip.x,y,width:inner,height:26,size:10}).regions;y=Math.max(y,...commands.map(b=>b.rect.y+b.rect.height))+12;
 const owned=game.canHumanControl(fleet),visibleShips=members.slice(page*pageSize,(page+1)*pageSize),contentsY=y;
 if(visibleShips.length)y+=22;
 const records=visibleShips.map(ship=>{
  const info=display.getFleetMemberDiagnostics(fleet,ship),nameLines=wrap(info.title,inner-16,t=>measure(t,11)),name={rect:{x:bodyClip.x,y,width:inner,height:nameLines.length*16+12},action:{type:'selectFleetMember',fleet,ship},label:info.title};y+=name.rect.height+4;
  const details=[[display.STR.techLevel,info.tech],[display.STR.speed,info.speed],[display.STR.power,info.power],[I18n.getString(698),info.health]].flatMap(([label,value])=>wrap(label.replace(/:$/,'')+': '+value,inner-12,t=>measure(t,11))),detailsY=y;y+=details.length*16+4;
  const healthY=y;if(info.healthRatio!==null)y+=10;
  const targets=transferTargets.filter(target=>game.canTransferShipToFleet(ship,target)),buttons=[];
  if(owned){buttons.push({label:I18n.getString(796),action:{type:'createFleetGroup',fleet,member:ship}});if(targets.length)buttons.push({label:display.STR.transfer,action:targets.length>1?{type:'beginFleetTransfer',ship}:{type:'transferFleetShip',ship,targetFleet:targets[0]}});buttons.push({label:display.STR.remove,action:{type:'removeFleetShip',fleet,ship}});}
  const controls=buttons.length?display.layoutButtonRow(buttons,{x:bodyClip.x,y,width:inner,height:24,size:9}).regions:[];y=Math.max(y,...controls.map(b=>b.rect.y+b.rect.height))+12;
  return {ship,info,name,nameLines,details,detailsY,healthY,controls};
 });
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height);
 if(game.compactFleetInspectorObject!==fleet.id || game.compactFleetInspectorPage!==page){game.fleetInspectorScroll=0;game.compactFleetInspectorObject=fleet.id;game.compactFleetInspectorPage=page;}
 const bodyScroll=Math.max(0,Math.min(scrollLimit,game.fleetInspectorScroll || 0));game.fleetInspectorScroll=bodyScroll;
 commands.forEach(b=>b.rect.y-=bodyScroll);records.forEach(r=>{r.name.rect.y-=bodyScroll;r.detailsY-=bodyScroll;r.healthY-=bodyScroll;r.controls.forEach(b=>b.rect.y-=bodyScroll);});
 const footer=pageButtons.length?display.layoutButtonRow(pageButtons,{x:rect.x+14,y:footerTop,width:inner,height:24,size:10}).regions.map(b=>({...b,action:b.disabled?{type:'consume'}:b.action})):[];
 return {compact:true,rect,knowledge,data,titleLines,titleHeight,lines,commands,records,visibleShips,transferTargets,compositionRows,page,pageSize,pages,footer,footerTop,bodyClip,bodyScroll,scrollLimit,contentsY:contentsY-bodyScroll};
}
function clipped(l,buttons){const c=l.bodyClip;return buttons.map(b=>{const top=Math.max(c.y,b.rect.y),bottom=Math.min(c.y+c.height,b.rect.y+b.rect.height);return {...b,rect:{...b.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(b=>b.rect.height>0);}
function regions(l){return clipped(l,l.records.flatMap(r=>[...r.controls,r.name])).concat(l.footer);}
function commands(l){return clipped(l,l.commands);}
function draw(display,fleet,l){
 const r=l.rect;display.drawAnchoredPanel(fleet,r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+22+i*18,'lightgray',14));display.drawDivider(r.x+14,r.y+l.titleHeight-4,r.width-28);
 const c=l.bodyClip,old=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{
  l.lines.forEach((line,i)=>display.drawTextLine(line,c.x,c.y+12+i*16-l.bodyScroll,'lightgray',11));
  l.commands.forEach(b=>display.drawUIButton(b.rect,b.label,b.key,{size:10,active:b.action.type==='toggleScrap'?fleet.isToBeScrapped():b.action.type==='togglePatrol'?fleet.isOnPatrol():false}));
  if(l.records.length)display.drawTextLine(display.STR.contents,c.x,l.contentsY+14,'lightgray',12);
  for(const row of l.records){display.drawUIButton(row.name.rect,'',null,{tooltipLabel:row.info.title});row.nameLines.forEach((line,i)=>display.drawTextLine(line,c.x+8,row.name.rect.y+18+i*16,row.info.nameColor,11,row.info.nameStyle));row.details.forEach((line,i)=>display.drawTextLine(line,c.x+6,row.detailsY+12+i*16,'gray',11));if(row.info.healthRatio!==null)display.drawBar(c.x+6,row.healthY,innerBar(l),4,row.info.healthRatio,'green');row.controls.forEach(b=>display.drawUIButton(b.rect,b.label,null,{size:9}));}
 }finally{display.port.setClipRect(old);}
 if(l.scrollLimit){const style=display.fleetInspectorScrollStyle || (display.fleetInspectorScrollStyle=display.createAttributes({fillColor:new pdg.Color(.7,.7,.7,.7),lineOpacity:0})),height=Math.max(10,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+3,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-height),width:3,height},1,style);}
 if(l.pages>1)display.drawTextLine(`${l.page+1} / ${l.pages}`,r.x+r.width/2,l.footerTop-8,'gray',10,pdg.textStyle_Centered);l.footer.forEach(b=>display.drawUIButton(b.rect,b.label,null,{size:10,disabled:b.disabled}));
}
function innerBar(l){return Math.min(100,l.bodyClip.width-12);}
module.exports={layout,regions,commands,draw};
