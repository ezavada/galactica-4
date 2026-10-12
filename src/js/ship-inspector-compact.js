const I18n=require('./i18n.js'),wrap=require('./text-wrapping.js');
function layout(display,ship,screen){
 const game=display.game,construction=ship.underConstruction(),full=game.config.omniscient || game.isOwnerAlliedWith(game.getCurrentHumanPlayer() || 1,ship.owner),data=display.getShipDiagnostics(ship);
 const title=construction && full?`${display.getShipTypeName(ship.type)} ${display.STR.shipHull}`:data.title,width=Math.min(350,screen.width-40),inner=width-28,measure=(text,size)=>display.port.getTextWidth?display.port.getTextWidth(text,size):Array.from(String(text)).length*size/2;
 const titleLines=wrap(title,inner,t=>measure(t,14)),titleHeight=Math.max(32,titleLines.length*18+12),rect=display.getAnchoredPanelRect(ship,width,Math.min(420,screen.height-20));rect.compact=true;
 const bodyClip={x:rect.x+14,y:rect.y+titleHeight+6,width:inner,height:Math.max(24,rect.height-titleHeight-18)};
 const definitions=construction && full?[[display.STR.owner,String(ship.owner)],[display.STR.techLevel,I18n.formatDecimal(ship.techLevel)],[display.STR.underConstruction,Math.floor(ship.progress)+'%'],[I18n.getString(679),display.formatConstructionETA(ship.star)]]:
 [[I18n.getString(701),data.hull],[I18n.getString(697),data.driveClass],[display.STR.owner,data.owner],[display.STR.techLevel,data.tech],[display.STR.speed,data.speed],[display.STR.power,data.power],[display.STR.damage,data.damage],[I18n.getString(698),data.health],[I18n.getString(696),data.scanner],[I18n.getString(699),data.status],[I18n.getString(595),data.destination]];
 let y=bodyClip.y+12;const rows=definitions.map(([label,value],index)=>{const lines=wrap(label.replace(/:$/,'')+': '+value,inner,t=>measure(t,11)),top=y;y+=lines.length*16;const ratio=construction && full && index===2?ship.progress/100:!construction && index===7?data.healthRatio:null,barY=y;if(ratio!==null)y+=18;return {lines,y:top,ratio,barY};});y+=8;
 const commands=display.layoutButtonRow(display.getContextActions(ship).map(b=>({...b,action:{...b.action,object:ship}})),{x:bodyClip.x,y,width:inner,height:26,size:10}).regions;y=Math.max(y,...commands.map(b=>b.rect.y+b.rect.height))+6;
 const identity=ship.id+':'+construction;if(game.compactShipInspectorObject!==identity){game.shipInspectorScroll=0;game.compactShipInspectorObject=identity;}
 const scrollLimit=Math.max(0,y-bodyClip.y-bodyClip.height),bodyScroll=Math.max(0,Math.min(scrollLimit,game.shipInspectorScroll || 0));game.shipInspectorScroll=bodyScroll;
 rows.forEach(r=>{r.y-=bodyScroll;r.barY-=bodyScroll;});commands.forEach(b=>b.rect.y-=bodyScroll);
 return {compact:true,rect,construction,full,data,titleLines,titleHeight,bodyClip,bodyScroll,scrollLimit,rows,commands};
}
function commands(l){const c=l.bodyClip;return l.commands.map(b=>{const top=Math.max(c.y,b.rect.y),bottom=Math.min(c.y+c.height,b.rect.y+b.rect.height);return {...b,rect:{...b.rect,y:top,height:Math.max(0,bottom-top)}};}).filter(b=>b.rect.height>0);}
function draw(display,ship,l){
 const r=l.rect,c=l.bodyClip;display.drawAnchoredPanel(ship,r,'');l.titleLines.forEach((line,i)=>display.drawTextLine(line,r.x+14,r.y+22+i*18,'lightgray',14));display.drawDivider(r.x+14,r.y+l.titleHeight-4,r.width-28);
 const old=display.port.getClipRect();display.port.setClipRect(new pdg.Rect(c.x,c.y,c.x+c.width,c.y+c.height));
 try{for(const row of l.rows){row.lines.forEach((line,i)=>display.drawTextLine(line,c.x,row.y+i*16,'lightgray',11));if(row.ratio!==null)display.drawBar(c.x,row.barY,Math.min(100,c.width),4,row.ratio,l.construction?'lightgray':'green');}l.commands.forEach(b=>display.drawUIButton(b.rect,b.label,b.key,{size:10,active:b.action.type==='toggleScrap'?ship.isToBeScrapped():b.action.type==='togglePatrol'?ship.isOnPatrol():false}));}finally{display.port.setClipRect(old);}
 if(l.scrollLimit){const style=display.shipInspectorScrollStyle || (display.shipInspectorScrollStyle=display.createAttributes({fillColor:new pdg.Color(.7,.7,.7,.7),lineOpacity:0})),height=Math.max(10,c.height*c.height/(c.height+l.scrollLimit));display.drawRoundedRect({x:c.x+c.width+3,y:c.y+l.bodyScroll/l.scrollLimit*(c.height-height),width:3,height},1,style);}
}
module.exports={layout,commands,draw};
