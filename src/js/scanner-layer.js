// Opaque offscreen masks union overlapping systems before applying tint once.
class ScannerLayer {
    constructor(backend=pdg){this.backend=backend;this.layers=new Map();}
    draw(port,groups,width,height) {
        const b=this.backend,active=new Set();
        for(const group of groups)for(let level=0;level<3;level++) {
            const key=group.owner+':'+level;active.add(key);
            const signature=JSON.stringify([width,height,group.color.red,group.color.green,group.color.blue,group.circles]);
            let layer=this.layers.get(key);
            if(!layer || layer.signature!==signature) {
                if(layer)this.release(layer);
                this.layers.delete(key);
                const surface=b.gfx.createOffscreenPort(new b.Rect(width,height));
                if(!surface)throw Error('Could not allocate scanner overlay');
                let attrs;
                try {
                    surface.clear();
                    const color=new b.Color(group.color.red,group.color.green,group.color.blue,1);
                    attrs=new b.Attributes().fillColor(color).fillOpacity(1).lineStyle(b.lineStyle_None);
                    for(const circle of group.circles)surface.drawCircle(new b.Point(circle.x,circle.y),circle.radius*[4,2,1][level],attrs);
                    layer={signature,image:new b.Image(surface,b.CopyPixels),attrs:new b.Attributes().fillOpacity([.10,.15,.30][level])};
                    this.layers.set(key,layer);
                } finally {
                    b.gfx.closeGraphicsPort(surface);
                    if(attrs && typeof attrs.delete==='function')attrs.delete();
                }
            }
            port.drawImage(layer.image,new b.Rect(width,height),layer.attrs);
        }
        for(const [key,layer] of this.layers)if(!active.has(key)){this.release(layer);this.layers.delete(key);}
    }
    release(layer){for(const object of [layer.image,layer.attrs])if(object && typeof object.delete==='function')object.delete();}
    dispose(){for(const layer of this.layers.values())this.release(layer);this.layers.clear();}
}
module.exports=ScannerLayer;
