const Caption=require('./button-caption.js'),wrap=require('./text-wrapping.js'),I18n=require('./i18n.js');
const clamp=(value,max)=>Math.max(0,Math.min(max,value));
function pack(items,left,width,measure){
 const rows=[[]];let used=0;
 for(const item of items){let size=12;while(size>9 && Caption.width(item.label,item.key,measure,{size})+16>width)size--;
  const w=Math.min(width,Caption.width(item.label,item.key,measure,{size})+16);
  if(used && used+w>width){rows.push([]);used=0;}
  rows[rows.length-1].push({...item,size,rect:{x:left+used,y:0,width:w,height:24},body:false});used+=w+6;
 }return rows;
}
function layout(host,width,height,source,measure,message=host.message){
 const rect={x:12,y:12,width:width-24,height:Math.min(['adminPassword','playerName','players','admission','initialState','initialValue','endTurn'].includes(host.stage)?source.rect.height:568,height-24)},left=rect.x+14,inner=rect.width-28,bodyWidth=inner-10;
 const footer=host.stage==='endTurn'?source.buttons.filter(button=>['cancel','confirmEnd'].includes(button.action)):host.stage==='admission'?source.buttons.filter(button=>['cancel','saveAdmission'].includes(button.action)):(source.info || ['players','initialState'].includes(host.stage))?source.buttons.filter(button=>['cancel','stop'].includes(button.action)):source.buttons;
 const buttons=pack(footer,left,inner,measure),footerTop=rect.y+rect.height-12-buttons.length*30;
 const status=wrap(message || '',inner,t=>measure(t,12)),statusTop=footerTop-8-status.length*16;
 const bodyClip={x:left,y:rect.y+44,width:bodyWidth,height:Math.max(32,statusTop-rect.y-52)};
 const fields=[],labels=[],checks=[],choices=[],bodyButtons=[],entries=[],longTitle=source.info && measure(source.title,12)>rect.width-48;
 if(source.info){const info=source.info,lines=[...(longTitle?[source.title]:[]),info.address || I18n.getString(1081),I18n.formatString(1071,'',info.info.humans,info.info.computers,info.info.turn),...(!info.remoteAdministrator?[I18n.formatString(1072,'',info.port),info.file]:[])].filter(Boolean);
  lines.forEach((text,index)=>entries.push({y:source.rect.y+(54+index*38)*source.scale,kind:'label',item:{text}}));
 }
 const rows=new Map();for(const button of source.buttons.filter(button=>!footer.includes(button))){if(!rows.has(button.rect.y))rows.set(button.rect.y,[]);rows.get(button.rect.y).push(button);}
 for(const items of rows.values())entries.push({y:items[0].rect.y,kind:'buttons',items});
 if(host.stage==='admission' && host.admissionSelection!==null && !source.choices.some(choice=>choice.action==='admissionSelect' && choice.value===host.admissionSelection))entries.push({y:source.rect.y+300*source.scale,kind:'label',item:{text:I18n.getString(1147)+': '+host.admission[host.admissionList][host.admissionSelection]}});
 if(host.stage==='initialState' && !source.choices.some(choice=>choice.value===host.initialSelection))entries.push({y:source.rect.y+240*source.scale,kind:'label',item:{text:host.initialRows.find(row=>row.id===host.initialSelection).name}});
 source.fields.forEach(item=>entries.push({y:item.rect.y,kind:'field',item}));
 source.labels.forEach(item=>entries.push({y:item.rect.y,kind:'label',item}));
 source.checks.forEach(item=>entries.push({y:item.rect.y,kind:'check',item}));
 const groups=new Map();for(const item of source.choices){const id=item.action+':'+item.rect.y;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(item);}
 for(const items of groups.values())entries.push({y:items[0].rect.y,kind:'choices',items});
 entries.sort((a,b)=>a.y-b.y);let y=bodyClip.y;
 const label=text=>{for(const line of wrap(text,bodyWidth,t=>measure(t,12))){labels.push({text:line,rect:{x:left,y,width:bodyWidth,height:20},body:true});y+=20;}};
 for(const entry of entries){
  if(entry.kind==='field'){const item=entry.item,focusTop=y;label(item.label);fields.push({...item,focusRect:{x:left,y:focusTop,width:bodyWidth,height:y+26-focusTop},labelRect:{x:left,y,width:0,height:0},rect:{x:left,y,width:bodyWidth,height:26},body:true});y+=34;}
  else if(entry.kind==='label'){label(entry.item.text);y+=4;}
  else if(entry.kind==='check'){const item=entry.item,labelLines=wrap(item.label,bodyWidth-40,t=>measure(t,12)),h=Math.max(26,labelLines.length*16+10);checks.push({...item,labelLines,rect:{x:left,y,width:bodyWidth,height:h},body:true});y+=h+8;}
  else if(entry.kind==='choices' && ['selectPlayer','admissionSelect','initialSelect'].includes(entry.items[0].action)){for(const item of entry.items){const labelLines=wrap(item.label,bodyWidth-16,t=>measure(t,12)),h=Math.max(24,labelLines.length*16+8);choices.push({...item,labelLines,size:12,rect:{x:left,y,width:bodyWidth,height:h},body:true});y+=h+6;}y+=4;}
  else {for(const row of pack(entry.items,left,bodyWidth,measure)){for(const item of row)(entry.kind==='buttons'?bodyButtons:choices).push({...item,rect:{...item.rect,y},body:true});y+=30;}y+=4;}
 }
 const limit=Math.max(0,y-bodyClip.y-bodyClip.height);host.scrollLimit=limit;
 if(host.compactStage!==host.stage){host.bodyScroll=0;host.compactFocus=null;host.compactPlayer=null;host.compactAdmission=null;host.compactInitial=null;host.compactPage=null;host.compactStage=host.stage;}
 let scroll=clamp(host.bodyScroll || 0,limit);
 if(host.revealFocus || host.compactFocus!==host.focus || host.compactBodyHeight!==bodyClip.height){const field=fields.find(field=>field.name===host.focus);
  if(field){const focus=field.focusRect;if(focus.y<bodyClip.y+scroll)scroll=clamp(focus.y-bodyClip.y,limit);else if(focus.y+focus.height>bodyClip.y+scroll+bodyClip.height)scroll=clamp(focus.y+focus.height-bodyClip.y-bodyClip.height,limit);}
  host.revealFocus=false;host.compactFocus=host.focus;host.compactBodyHeight=bodyClip.height;
 }
 if(['players','admission','initialState','endTurn'].includes(host.stage) && host.compactPage!==(host.stage==='admission'?host.admissionList+':'+host.page:host.page)){scroll=0;host.compactPlayer=null;host.compactAdmission=null;host.compactInitial=null;host.compactPage=host.stage==='admission'?host.admissionList+':'+host.page:host.page;}
 if(host.stage==='players' && host.compactPlayer!==host.playerSelection){const selected=choices.find(choice=>choice.value===host.playerSelection);
  if(selected){const r=selected.rect;if(r.y<bodyClip.y+scroll)scroll=clamp(r.y-bodyClip.y,limit);else if(r.y+r.height>bodyClip.y+scroll+bodyClip.height)scroll=clamp(r.y+r.height-bodyClip.y-bodyClip.height,limit);}host.compactPlayer=host.playerSelection;
 }
 if(host.stage==='admission' && host.compactAdmission!==host.admissionSelection){const selected=choices.find(choice=>choice.action==='admissionSelect' && choice.value===host.admissionSelection);if(selected){const r=selected.rect;if(r.y<bodyClip.y+scroll)scroll=clamp(r.y-bodyClip.y,limit);else if(r.y+r.height>bodyClip.y+scroll+bodyClip.height)scroll=clamp(r.y+r.height-bodyClip.y-bodyClip.height,limit);}host.compactAdmission=host.admissionSelection;}
 if(host.stage==='initialState' && host.compactInitial!==host.initialSelection){const selected=choices.find(choice=>choice.value===host.initialSelection);if(selected){const r=selected.rect;if(r.y<bodyClip.y+scroll)scroll=clamp(r.y-bodyClip.y,limit);else if(r.y+r.height>bodyClip.y+scroll+bodyClip.height)scroll=clamp(r.y+r.height-bodyClip.y-bodyClip.height,limit);}host.compactInitial=host.initialSelection;}
 host.bodyScroll=scroll;for(const item of [...fields,...labels,...checks,...choices,...bodyButtons]){item.rect.y-=scroll;if(item.labelRect)item.labelRect.y-=scroll;if(item.focusRect)item.focusRect.y-=scroll;}
 const scrollTrack={x:left+bodyWidth+4,y:bodyClip.y,width:5,height:bodyClip.height},thumbHeight=Math.max(16,bodyClip.height*bodyClip.height/(bodyClip.height+limit));
 return {rect,scale:1,titleHeight:40,title:longTitle?I18n.formatString(source.info.remoteAdministrator?1164:1062,'','…'):source.title,compact:true,bodyClip,fields,labels,checks,choices,
  buttons:[...bodyButtons,...buttons.flatMap((row,i)=>row.map(button=>({...button,rect:{...button.rect,y:footerTop+i*30}})))],
  statusLines:status.map((text,i)=>({text,point:{x:left,y:statusTop+i*16+12}})),
  scrollTrack,scrollThumb:limit?{...scrollTrack,y:scrollTrack.y+scroll/limit*(bodyClip.height-thumbHeight),height:thumbHeight}:null};
}
module.exports={layout};
