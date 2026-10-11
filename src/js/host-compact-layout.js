const Caption=require('./button-caption.js'),wrap=require('./text-wrapping.js');
const clamp=(value,max)=>Math.max(0,Math.min(max,value));
function pack(items,left,width,measure){
 const rows=[[]];let used=0;
 for(const item of items){let size=12;while(size>9 && Caption.width(item.label,item.key,measure,{size})+16>width)size--;
  const w=Math.min(width,Caption.width(item.label,item.key,measure,{size})+16);
  if(used && used+w>width){rows.push([]);used=0;}
  rows[rows.length-1].push({...item,size,rect:{x:left+used,y:0,width:w,height:24},body:false});used+=w+6;
 }return rows;
}
function layout(host,width,height,source,measure){
 const rect={x:12,y:12,width:width-24,height:Math.min(568,height-24)},left=rect.x+14,inner=rect.width-28,bodyWidth=inner-10;
 const buttons=pack(source.buttons,left,inner,measure),footerTop=rect.y+rect.height-12-buttons.length*30;
 const status=wrap(host.message || '',inner,t=>measure(t,12)),statusTop=footerTop-8-status.length*16;
 const bodyClip={x:left,y:rect.y+44,width:bodyWidth,height:Math.max(32,statusTop-rect.y-52)};
 const fields=[],labels=[],checks=[],choices=[],entries=[];
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
  else {for(const row of pack(entry.items,left,bodyWidth,measure)){for(const item of row)choices.push({...item,rect:{...item.rect,y},body:true});y+=30;}y+=4;}
 }
 const limit=Math.max(0,y-bodyClip.y-bodyClip.height);host.scrollLimit=limit;
 if(host.compactStage!==host.stage){host.bodyScroll=0;host.compactFocus=null;host.compactStage=host.stage;}
 let scroll=clamp(host.bodyScroll || 0,limit);
 if(host.revealFocus || host.compactFocus!==host.focus){const field=fields.find(field=>field.name===host.focus);
  if(field){const focus=field.focusRect;if(focus.y<bodyClip.y+scroll)scroll=clamp(focus.y-bodyClip.y,limit);else if(focus.y+focus.height>bodyClip.y+scroll+bodyClip.height)scroll=clamp(focus.y+focus.height-bodyClip.y-bodyClip.height,limit);}
  host.revealFocus=false;host.compactFocus=host.focus;
 }
 host.bodyScroll=scroll;for(const item of [...fields,...labels,...checks,...choices]){item.rect.y-=scroll;if(item.labelRect)item.labelRect.y-=scroll;if(item.focusRect)item.focusRect.y-=scroll;}
 const scrollTrack={x:left+bodyWidth+4,y:bodyClip.y,width:5,height:bodyClip.height},thumbHeight=Math.max(16,bodyClip.height*bodyClip.height/(bodyClip.height+limit));
 return {rect,scale:1,titleHeight:40,title:source.title,compact:true,bodyClip,fields,labels,checks,choices,
  buttons:buttons.flatMap((row,i)=>row.map(button=>({...button,rect:{...button.rect,y:footerTop+i*30}}))),
  statusLines:status.map((text,i)=>({text,point:{x:left,y:statusTop+i*16+12}})),
  scrollTrack,scrollThumb:limit?{...scrollTrack,y:scrollTrack.y+scroll/limit*(bodyClip.height-thumbHeight),height:thumbHeight}:null};
}
module.exports={layout};
