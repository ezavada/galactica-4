const test=require('./test-framework.js'),UIIcons=require('../src/js/ui-icons.js');
function fixture() {
    const calls={ports:[],closed:[],images:[],blits:[],curves:[]};
    class Attributes {
        fillOpacity(v){this.opacity=v;return this}lineColor(v){this.color=v;return this}fillColor(v){this.color=v;return this}lineStyle(){return this}
        lineThickness(v){this.thickness=v;return this}roundedCorners(v){this.radius=v;return this}delete(){this.deleted=true}
    }
    class Image {constructor(port,copy){this.port=port;this.copy=copy;calls.images.push(this)}delete(){this.deleted=true}}
    class Spline {
        constructor(type){this.native=new pdg.Spline(type)}
        addSegment(...points){calls.curves.push(points);this.native.addSegment(...points)}
        getFirstOrder(u){return this.native.getFirstOrder(u)}
        delete(){if(typeof this.native.delete==='function')this.native.delete()}
    }
    const backend={Attributes,Image,Spline,Polygon:pdg.Polygon,spline_CubicBezier:pdg.spline_CubicBezier,Point:pdg.Point,Rect:pdg.Rect,CopyPixels:true,lineStyle_Solid:pdg.lineStyle_Solid,lineStyle_None:pdg.lineStyle_None,
        gfx:{createOffscreenPort:rect=>{const port={rect,ops:[],clear(){this.cleared=true},drawPolygon(...args){this.ops.push(['polygon',...args])},drawLine(...args){this.ops.push(['line',...args])},drawBezier(...args){this.ops.push(['curve',...args])},drawRect(...args){this.ops.push(['rect',...args])},drawCircle(...args){this.ops.push(['circle',...args])}};calls.ports.push(port);return port},closeGraphicsPort:port=>calls.closed.push(port)}};
    return {calls,backend,icons:new UIIcons(backend),port:{drawImage:(...args)=>calls.blits.push(args)},color:new pdg.Color(.8,.85,.9,1)};
}
module.exports=()=>test.describe('Cached UI icons',()=>{
    test.it('rasterizes at twice the output resolution and reuses the image across ports and positions',()=>{
        const {icons,port,color,calls}=fixture();icons.draw(port,'lock',10,20,14,color);icons.draw(port,'lock',40,50,14,color);
        test.assertEqual(calls.ports.length,1);test.assertEqual(calls.images.length,1);test.assertEqual(calls.closed.length,1);test.assertTrue(calls.images[0].copy);
        test.assertEqual(calls.ports[0].rect.width(),calls.blits[0][1].width()*2);test.assertTrue(calls.blits[0][0]===calls.blits[1][0]);
        test.assertEqual(calls.blits[1][1].centerPoint().x,40);test.assertTrue(calls.ports[0].cleared);
    });
    test.it('uses true curves for both shackles and substantial two-pixel display strokes',()=>{
        const {icons,port,color,calls}=fixture();for(const name of ['lock','unlock'])icons.draw(port,name,0,0,14,color);
        test.assertEqual(calls.curves.length,4);
        for(const surface of calls.ports){test.assertEqual(surface.ops[0][2].thickness,4);test.assertTrue(surface.ops.some(op=>op[0]==='polygon'));}
        test.assertEqual(calls.curves[2][0].x-calls.curves[0][0].x,6);
    });
    test.it('keeps state, size and color variants separate while rendering every supported glyph',()=>{
        const {icons,port,color,calls}=fixture();for(const name of ['menu','home','fit','gear','lock','unlock','zoom-in','zoom-out'])icons.draw(port,name,0,0,14,color);
        icons.draw(port,'lock',0,0,20,color);icons.draw(port,'lock',0,0,14,new pdg.Color('red'));test.assertEqual(calls.images.length,10);
        test.assertTrue(calls.ports.every(p=>p.ops.length>0));icons.draw(port,'gear',20,20,14,color);test.assertEqual(calls.images.length,10);
    });
    test.it('releases cached images and attributes on disposal without keeping source ports open',()=>{
        const {icons,port,color,calls}=fixture();icons.draw(port,'gear',0,0,14,color);const attrs=icons.imageAttributes;
        icons.dispose();icons.dispose();test.assertEqual(calls.closed.length,1);test.assertTrue(calls.images[0].deleted);test.assertTrue(attrs.deleted);test.assertEqual(icons.images.size,0);
    });
    test.it('closes the source surface if icon rendering fails and does not cache a partial image',()=>{
        const {icons,port,color,calls}=fixture();icons.render=()=>{throw Error('draw failure')};let threw=false;
        try{icons.draw(port,'lock',0,0,14,color)}catch(e){threw=true}test.assertTrue(threw);test.assertEqual(calls.closed.length,1);test.assertEqual(icons.images.size,0);
    });
    test.it('ignores invalid names or sizes without allocating a surface',()=>{
        const {icons,port,color,calls}=fixture();for(const size of [0,-1,NaN,Infinity])test.assertFalse(icons.draw(port,'lock',0,0,size,color));
        test.assertFalse(icons.draw(port,'unknown',0,0,14,color));test.assertEqual(calls.ports.length,0);
    });
});
