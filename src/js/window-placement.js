const Behavior=require('./window-behavior.js');
class WindowPlacement {
    constructor(preferences){this.preferences=preferences;this.positions={};this.drag=null;}
    position(name){if(!(name in this.positions))this.positions[name]=this.preferences.readWindowPosition(name);return this.positions[name];}
    layout(name,layout,screen){
        if(!layout)return layout;
        const rect=layout.rect || layout,position=this.position(name),target=Behavior.constrain({...rect,...position},screen);
        const dx=target.x-rect.x,dy=target.y-rect.y;
        const shift=value=>{
            if(Array.isArray(value))return value.map(shift);
            if(!value || typeof value!=='object')return value;
            if(Number.isFinite(value.x)&&Number.isFinite(value.y))return {...value,x:value.x+dx,y:value.y+dy};
            const result={};for(const key of Object.keys(value))result[key]=shift(value[key]);return result;
        };
        return shift(layout);
    }
    begin(name,rect,x,y,screen){
        const titleHeight=name==='startup'?52*rect.height/540:name==='networkChat'?52*rect.height/480:name==='networkJoin'?40*rect.height/548:52;
        if(x<rect.x || x>rect.x+rect.width || y<rect.y || y>rect.y+titleHeight)return false;
        this.drag={name,rect:{...rect},x,y,screen};return true;
    }
    move(x,y){if(!this.drag)return false;const d=this.drag;
        const rect=Behavior.constrain({...d.rect,x:d.rect.x+x-d.x,y:d.rect.y+y-d.y},d.screen);
        this.positions[d.name]={x:rect.x,y:rect.y};return true;
    }
    end(x,y){if(!this.drag)return false;if(Number.isFinite(x)&&Number.isFinite(y))this.move(x,y);
        const name=this.drag.name;this.drag=null;const position=this.positions[name];if(position)this.preferences.writeWindowPosition(name,position);return true;
    }
}
module.exports=WindowPlacement;
