// Semantic shortcuts use Unicode KeyPress events; all commands pass through PDG
// named actions. Exact chord matching avoids Cmd+Shift+S also triggering Cmd+S.
const Windows=require('./window-behavior.js');
let sequence=0;
const letters={m:'menu',e:'events',v:'comparison',l:'fleets',u:'rendezvous',s:'scout',d:'defense',b:'battleship',c:'colony',n:'rename',p:'productionOrPatrol',h:'hunt',g:'course',o:'orders',x:'clearOrders',a:'appendCourse',f:'fit'};
const toggles=['toggleShips','toggleMapNames','toggleGrid','toggleAllCourses','toggleCourierCourses','toggleScannerRanges'];
class Input {
    constructor(pdg,options={}) {
        this.pdg=pdg;this.platform=options.platform || (typeof window!=='undefined'?'web':process.platform);
        this.manager=options.manager || pdg.getInputManager();this.contexts=new Map();this.stack=[];
        this.prefix='galactica.'+(++sequence)+'.';this.focus='map';
    }
    context(name) {
        if(!this.contexts.has(name))this.contexts.set(name,{context:this.manager.createContext(this.prefix+name),actions:new Map()});
        return this.contexts.get(name);
    }
    activate(name) {
        if(this.mode===name)return;
        for(const context of this.stack.reverse())this.manager.popContext(context);
        this.stack=[];this.mode=name;
        for(const id of [name,'application']){const {context}=this.context(id);this.manager.pushContext(context,{modal:id!=='application'});this.stack.push(context);}
    }
    command(name,callback,{global=false}={}) {
        const group=this.context(global?'application':this.mode || 'startup');
        if(!group.actions.has(name)){
            const handle=group.context.defineAction(name,{type:'button'}),source=group.context.name+'.'+name;
            group.context.bind(name,{id:'semantic',source:'programmatic',name:source});group.actions.set(name,{handle,source});
        }
        const {handle,source}=group.actions.get(name);
        // Each semantic event is a complete pulse, preserving multiple taps
        // arriving before the next draw without leaving held commands behind.
        this.manager.submit(source,true);const snapshot=this.manager.advance(0);
        this.manager.submit(source,false);this.manager.advance(0);
        if(snapshot.pressed(handle)){this.dispatching=true;try{callback();}finally{this.dispatching=false;}}
        return true;
    }
    key(event,state,dispatch,local) {
        const pdg=this.pdg,key=event.unicode,primary=this.platform==='darwin'?event.meta:event.ctrl;
        const semanticKey=primary && key>=1 && key<=26 && ![10,13].includes(key)?key+96:key;
        const char=typeof semanticKey==='number' && semanticKey>=32 && semanticKey<=0x10ffff?String.fromCodePoint(semanticKey):'',lower=char.toLowerCase();
        this.activate(state.mode);
        const modified=event.ctrl || event.meta || event.alt;
        const help=key===pdg.key_Help || key===pdg.key_F1 || this.platform==='darwin' && event.meta && !event.ctrl && !event.alt && (char==='?' || event.shift && char==='/');
        if(help)return event.isRepeating?true:this.command('help',()=>dispatch('help'),{global:true});
        if(primary && !event.alt && !(this.platform==='darwin'?event.ctrl:event.meta)){
            let command;
            if(!event.shift && (key===17 || lower==='q'))command='quit';
            else if(key===13 && !event.shift)command='endTurn';
            else if(lower==='s')command=event.shift?'saveAs':'save';
            else if(!event.shift)command=({n:'new',o:'open',w:'close'})[lower];
            if(command){
                if(event.isRepeating || command!=='quit' && (state.blocked || command==='endTurn' && (this.focus!=='map' || state.targeting || state.dragging)))return true;
                return this.command(command,()=>dispatch(command),{global:true});
            }
        }
        // Unrecognized modified chords must never become naked game commands.
        if(modified)return state.text?local(event):true;
        if(key===pdg.key_Tab){
            if(state.blocked || state.targeting || state.dragging)return true;
            return this.command('nextAttention',()=>dispatch('nextAttention'));
        }
        if(event.isRepeating && !state.text && !this.repeatable(key,state))return true;
        if(key===pdg.key_Escape)return this.command('cancel',()=>dispatch('cancel'));
        const index=toggles.findIndex((_,i)=>key===pdg['key_F'+(i+2)]);
        if(index>=0){if(state.blocked && state.panel==='settings')return local(event);if(!state.blocked)return this.command(toggles[index],()=>dispatch(toggles[index]));return true;}
        // Enter belongs to the focused window/editor, never to gameplay.
        if([3,10,13].includes(key) && (!state.panel || this.focus==='map') && !state.blocked)return true;
        const name=state.mode==='gameplay'?(char==='C'?'center':letters[lower]):null;
        return this.command(name || 'local.'+(char || key),()=>local(event));
    }
    gesture(name,event,state,callback){
        this.activate(state.mode);
        return this.command(name,()=>callback(event));
    }
    action(action,callback){
        if(this.dispatching)return callback();
        if(!this.mode)this.activate('startup');
        let result=false;this.command(action.type,()=>{result=callback();});return result;
    }
    repeatable(key,state) {
        const p=this.pdg;
        return [p.key_LeftArrow,p.key_RightArrow,p.key_UpArrow,p.key_DownArrow,p.key_PageUp,p.key_PageDown,43,45].includes(key) || state.panel==='production' && 'qawsed'.includes(String.fromCharCode(key).toLowerCase());
    }
    pointer(game,point) {
        if(!game)return;
        const rect=game.overlay && ['report','outcome'].includes(game.overlay.type)?(game.overlay.type==='report'?game.display.getReportLayout(game.overlay):game.display.getOutcomeLayout(game.overlay)).rect:game.display.getActiveWindowRect();
        this.focus=game.overlay && game.display.containsPoint(rect,point.x,point.y) || game.uiWindow && game.display.containsPoint(rect,point.x,point.y)?'panel':'map';
        game.inputFocus=this.focus;
    }
    dispose(){for(const context of this.stack.reverse())this.manager.popContext(context);this.stack=[];}
}
function state(game) {
    const panel=game && (Windows.isModal(game.uiWindow)?game.uiWindow:game.overlay && game.overlay.type || game.uiWindow),text=panel==='rename',targeting=!!game && game.isAwaitingMapTarget();
    const dragging=!!game && !!(game.uiWindowDrag || game.uiSliderDrag || game.uiMapScrollDrag);
    const blocked=text || Windows.isModal(panel);
    return {panel,text,targeting,dragging,blocked,mode:text?'text':blocked?'modal':dragging?'drag':targeting?'targeting':panel && game.inputFocus!=='map'?'panel.'+panel:game?'gameplay':'startup'};
}
function wheel(game,point,delta) {
    if(game.overlay && Windows.isModal(game.overlay.type))return true;
    const d=game.display,inside=rect=>d.containsPoint(rect,point.x,point.y);
    if(game.overlay && ['report','outcome'].includes(game.overlay.type)){
        const l=game.overlay.type==='report'?d.getReportLayout(game.overlay):d.getOutcomeLayout(game.overlay);
        if(inside(l.rect)){game.overlay.page=Math.max(0,Math.min(l.pages-1,l.page+Math.sign(delta)));return true;}
    }
    if(game.uiWindow && inside(d.getActiveWindowRect())){
        const scroll={menu:'scrollCommandMenu',fleets:'scrollFleetRoster',systemShips:'scrollSystemShips',course:'scrollCourse',comparison:'scrollPlayerComparison'}[game.uiWindow];
        if(scroll)game[scroll](delta);
        return true; // A panel owns its wheel even at the scroll limit.
    }
    if(Windows.isModal(game.uiWindow))return true;
    const star=game.getSelectedStar(),fleet=game.getSelectedFleet();
    if(star && inside(d.getStarDetailsLayout(star).rect)){game.scrollStarInspector(delta);return true;}
    if(game.factory.isShip(game.selectedObject) && inside(d.getShipDetailsRect(game.selectedObject))){game.scrollShipInspector(delta);return true;}
    if(fleet && inside(d.getFleetDetailsLayout(fleet).rect)){game.scrollFleetInspector(delta);return true;}
    if(delta<0)d.zoomIn(1.2,point.x,point.y);else if(delta>0)d.zoomOut(1.2,point.x,point.y);
    return true;
}
function endTurnLabel(){return typeof window!=='undefined'?(/Mac/.test(navigator.platform)?'Cmd+Enter':'Ctrl+Enter'):process.platform==='darwin'?'Cmd+Enter':'Ctrl+Enter';}
module.exports={Input,state,toggles,wheel,endTurnLabel};
