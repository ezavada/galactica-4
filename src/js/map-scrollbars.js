// Map extent scroll controls; all coordinates at this boundary are galactic units.
function layout(camera, width, height) {
    return ['x','y'].map(axis=>{
        const horizontal=axis==='x',rect=horizontal?
            {x:4,y:height-12,width:width-20,height:12}:
            {x:width-12,y:78,width:12,height:height-94};
        const start=horizontal?rect.x:rect.y,length=horizontal?rect.width:rect.height;
        const trackStart=start+12,trackLength=Math.max(1,length-24);
        const leading=horizontal?camera.toGalacticX(0):camera.toGalacticY(0);
        const span=(horizontal?width:height)/(camera.zoom*camera.scale);
        const extent=horizontal?camera.mapWidth:camera.mapHeight,range=Math.max(0,extent-span);
        const thumbLength=Math.min(trackLength,Math.max(24,trackLength*Math.min(1,span/extent)));
        const travel=trackLength-thumbLength,position=range?Math.max(0,Math.min(1,leading/range)):0;
        const subRect=(offset,size)=>horizontal?{x:offset,y:rect.y,width:size,height:rect.height}:
            {x:rect.x,y:offset,width:rect.width,height:size};
        return {axis,rect,leading,span,range,enabled:range>0,trackStart,trackLength,travel,thumbLength,
            thumb:subRect(trackStart+position*travel,thumbLength),
            before:subRect(start,12),after:subRect(start+length-12,12)};
    });
}
function move(camera,bar,leading) {
    if(!bar.enabled || !Number.isFinite(leading))return;
    const target=Math.max(0,Math.min(bar.range,leading));
    // Use the inverse transform rather than legacy pan limits, which are intentionally unbounded.
    if(bar.axis==='x')camera.setPan(camera.panX+target-camera.toGalacticX(0),camera.panY);
    else camera.setPan(camera.panX,camera.panY+target-camera.toGalacticY(0));
}
module.exports={layout,move};
