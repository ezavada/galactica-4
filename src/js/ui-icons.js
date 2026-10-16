// Small UI glyphs rasterized once at twice their display resolution.
const names=new Set(['menu','home','fit','gear','lock','unlock','zoom-in','zoom-out','star','ship','fleet','rendezvous']);
class UIIcons {
    constructor(backend=pdg) {
        this.backend=backend;
        this.images=new Map();
        this.imageAttributes=new backend.Attributes().fillOpacity(1);
    }

    draw(port,name,x,y,size,color) {
        if(!names.has(name)||!Number.isFinite(size)||size<=0)return false;
        const key=[name,size,color.red,color.green,color.blue,color.alpha].join(':');
        let cached=this.images.get(key);
        if(!cached) {
            const b=this.backend,extent=Math.ceil(size+4),pixels=extent*2;
            const surface=b.gfx.createOffscreenPort(new b.Rect(pixels,pixels));
            if(!surface)throw new Error('Could not allocate UI icon surface');
            let attrs;
            try {
                surface.clear();
                attrs=new b.Attributes().lineColor(color).fillColor(color).lineStyle(b.lineStyle_None).lineThickness(4*size/14).fillOpacity(1);
                this.render(surface,name,pixels/2,size*2/14,attrs);
                cached={image:new b.Image(surface,b.CopyPixels),extent};
                this.images.set(key,cached);
            } finally {
                b.gfx.closeGraphicsPort(surface);
                if(attrs&&typeof attrs.delete==='function')attrs.delete();
            }
        }
        port.drawImage(cached.image,new this.backend.Rect(new this.backend.Point(x-cached.extent/2,y-cached.extent/2),cached.extent,cached.extent),this.imageAttributes);
        return true;
    }

    render(port,name,center,scale,attrs) {
        const Point=this.backend.Point,point=(x,y)=>new Point(center+x*scale,center+y*scale);
        // WebGL only guarantees one-pixel GL lines. Filled stroke geometry keeps
        // the requested width on every backend, including offscreen WebAssembly.
        const stroke=(from,to)=>{
            const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
            if(!length)return;
            const nx=-dy/length*scale,ny=dx/length*scale;
            const polygon=new this.backend.Polygon(new Point(from.x+nx,from.y+ny),new Point(to.x+nx,to.y+ny),
                new Point(to.x-nx,to.y-ny),new Point(from.x-nx,from.y-ny));
            try{port.drawPolygon(polygon,attrs);}finally{if(typeof polygon.delete==='function')polygon.delete();}
            port.drawCircle(from,scale,attrs);port.drawCircle(to,scale,attrs);
        };
        const line=(a,b,c,d)=>stroke(point(a,b),point(c,d));
        const curve=(a,b,c,d,e,f,g,h)=>{
            const spline=new this.backend.Spline(this.backend.spline_CubicBezier);
            try {
                spline.addSegment(point(a,b),point(c,d),point(e,f),point(g,h));
                let previous=spline.getFirstOrder(0);
                for(let i=1;i<=24;i++){const next=spline.getFirstOrder(i/24);stroke(previous,next);previous=next;}
            } finally {if(typeof spline.delete==='function')spline.delete();}
        };
        if(name==='lock'||name==='unlock') {
            attrs.roundedCorners(scale).lineStyle(this.backend.lineStyle_Solid).fillOpacity(0);
            port.drawRect(new this.backend.Rect(point(-4,-1),8*scale,7*scale),attrs);
            attrs.lineStyle(this.backend.lineStyle_None).fillOpacity(1);
            const shift=name==='unlock'?3:0;
            line(-3+shift,-1,-3+shift,-3);
            // Two cubic quarter-circle arcs form the rounded shackle.
            curve(-3+shift,-3,-3+shift,-4.657,-1.657+shift,-6,shift,-6);
            curve(shift,-6,1.657+shift,-6,3+shift,-4.657,3+shift,-3);
            if(name==='lock')line(3,-3,3,-1);
            line(0,1.5,0,3.5);
        } else if(name==='gear') {
            // Eight broad teeth around a circular center, rather than thin spokes.
            const points=[];
            for(let i=0;i<8;i++)for(const [offset,radius] of [[-.28,4.4],[-.13,6],[.13,6],[.28,4.4]]) {
                const angle=i*Math.PI/4+offset;points.push([Math.cos(angle)*radius,Math.sin(angle)*radius]);
            }
            for(let i=0;i<points.length;i++)line(...points[i],...points[(i+1)%points.length]);
            for(let i=0;i<32;i++){
                const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
                line(Math.cos(a)*2,Math.sin(a)*2,Math.cos(b)*2,Math.sin(b)*2);
            }
        } else {
            const paths={star:[[0,-6,5,0],[5,0,0,6],[0,6,-5,0],[-5,0,0,-6]],ship:[[-5,-5,6,0],[6,0,-5,5],[-5,5,-5,-5]],
                fleet:[[6,0,3,5],[3,5,-3,5],[-3,5,-6,0],[-6,0,-3,-5],[-3,-5,3,-5],[3,-5,6,0]],
                rendezvous:[[-5,-5,5,5],[-5,5,5,-5]],'zoom-in':[[-5,0,5,0],[0,-5,0,5]],'zoom-out':[[-5,0,5,0]],menu:[[-6,-4,6,-4],[-6,0,6,0],[-6,4,6,4]],
                home:[[-6,0,0,-5],[0,-5,6,0],[-4,-1,-4,5],[-4,5,4,5],[4,5,4,-1],[-1,5,-1,2],[-1,2,1,2],[1,2,1,5]],
                fit:[[-6,-2,-6,-6],[-6,-6,-2,-6],[2,-6,6,-6],[6,-6,6,-2],[-6,2,-6,6],[-6,6,-2,6],[2,6,6,6],[6,6,6,2]]};
            for(const segment of paths[name])line(...segment);
        }
    }

    dispose() {
        for(const {image} of this.images.values())if(typeof image.delete==='function')image.delete();
        this.images.clear();
        if(this.imageAttributes&&typeof this.imageAttributes.delete==='function')this.imageAttributes.delete();
        this.imageAttributes=null;
    }
}
module.exports=UIIcons;
