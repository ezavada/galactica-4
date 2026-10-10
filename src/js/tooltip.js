// One surface and the same 20px equilateral pointer used by object inspectors.
const pointerDepth=Math.sqrt(300),styles=new WeakMap();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function place(anchor,width,height,screen){
 const x=clamp(anchor.x+anchor.width/2-width/2,8,screen.width-width-8);
 const above=anchor.y-height-pointerDepth-4;
 const y=clamp(above>=8?above:anchor.y+anchor.height+pointerDepth+4,8,screen.height-height-8);
 return {x,y,width,height};
}
function pointer(rect,anchor){
 const target={x:anchor.x+anchor.width/2,y:anchor.y+anchor.height/2};
 const horizontal=target.y>=rect.y && target.y<=rect.y+rect.height;
 if(horizontal){
  const left=target.x<rect.x+rect.width/2,x=left?rect.x:rect.x+rect.width;
  const y=clamp(target.y,rect.y+12,rect.y+rect.height-12);
  return [{x,y:y-10},{x:x+(left?-pointerDepth:pointerDepth),y},{x,y:y+10}];
 }
 const top=target.y<rect.y,y=top?rect.y:rect.y+rect.height;
 const x=clamp(target.x,rect.x+12,rect.x+rect.width-12);
 return [{x:x-10,y},{x,y:y+(top?-pointerDepth:pointerDepth)},{x:x+10,y}];
}
function draw(port,hint){
 let attrs=styles.get(port);
 if(!attrs){
  const fill=new pdg.Color(.5,.5,.5,1);
  attrs={body:new pdg.Attributes().fillColor(fill).lineOpacity(0).roundedCorners(2),
   pointer:new pdg.Attributes().fillColor(fill).lineOpacity(0),
   text:new pdg.Attributes().fillColor(new pdg.Color(.18,.18,.18,1)).textSize(11).textStyle(pdg.textStyle_Plain)};
  styles.set(port,attrs);
 }
 const r=hint.rect;
 port.drawPolygon(new pdg.Polygon(...pointer(r,hint.anchor).map(p=>new pdg.Point(p.x,p.y))),attrs.pointer);
 port.drawRect(new pdg.Rect(new pdg.Point(r.x,r.y),r.width,r.height),attrs.body);
 hint.lines.forEach((line,index)=>port.drawText(line,new pdg.Point(r.x+12,r.y+16+index*15),attrs.text));
}
module.exports={place,pointer,draw,pointerDepth};
