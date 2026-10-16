// Browser cursors use native CSS; native PDG uses cached software cursor images.
class MapCursor {
    constructor(port,backend=pdg,canvas=typeof Module!=='undefined'?Module.canvas:null){
        this.port=port;this.backend=backend;this.canvas=canvas;this.mode='default';this.images=new Map();
    }
    set(mode){
        if(mode===this.mode)return;
        if(this.canvas && this.canvas.style)this.canvas.style.cursor=mode;
        else if(this.port.setCursor && this.port.resetCursor){
            if(mode==='default')this.port.resetCursor();
            else {
                let image=this.images.get(mode);
                if(!image){
                    const b=this.backend,surface=b.gfx.createOffscreenPort(new b.Rect(24,24));
                    let attrs;
                    try{
                        surface.clear();attrs=new b.Attributes().lineStyle(b.lineStyle_None).fillOpacity(1);
                        const strokes=mode==='crosshair'?[[11,1,2,8],[11,15,2,8],[1,11,8,2],[15,11,8,2]]:
                            [[11,3,2,18],[7,3,10,2],[7,19,10,2]];
                        for(const [x,y,w,h] of strokes){
                            attrs.fillColor(new b.Color('white'));surface.drawRect(new b.Rect(new b.Point(x-1,y-1),w+2,h+2),attrs);
                            attrs.fillColor(new b.Color('black'));surface.drawRect(new b.Rect(new b.Point(x,y),w,h),attrs);
                        }
                        image=new b.Image(surface,b.CopyPixels);this.images.set(mode,image);
                    }finally{b.gfx.closeGraphicsPort(surface);if(attrs && attrs.delete)attrs.delete();}
                }
                this.port.setCursor(image,new this.backend.Point(12,12));
            }
        }
        this.mode=mode;
    }
    dispose(){this.set('default');for(const image of this.images.values())if(image.delete)image.delete();this.images.clear();}
}
module.exports=MapCursor;
