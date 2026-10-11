// Action-driven progression for the original sixty lessons. Rendering and
// session ownership are supplied by the caller; this module displays no text.
// Page metadata comes from decoded/localized lesson resources, not fake Nexts.
const messagePages=new Set([12,22,32,54]);
const acknowledgedPages=new Set([13,23,33,45,55]);
const attentionPages=new Set([14,27,43,46,47,52]);
const emptyAttentionPages=new Set([29,35,44,49,53]);
const HOME=2,NEW_TERRA=9,S7=7;
class TutorialController {
    constructor(pages, options={}) {
        this.pages=new Map();
        for(const page of pages || []) {
            if(!Number.isInteger(page.id) || this.pages.has(page.id) ||
                    !Number.isInteger(page.nextPage) || !Array.isArray(page.exceptions))
                throw new Error('Invalid tutorial page metadata');
            if(page.exceptions.some(item=>!Number.isInteger(item.window) || !Number.isInteger(item.page)))
                throw new Error('Invalid tutorial exception');
            this.pages.set(page.id,{...page,exceptions:page.exceptions.map(exception=>({...exception}))});
        }
        for(const id of [...Array.from({length:60},(_,index)=>index+1),100,101,103])
            if(!this.pages.has(id))throw new Error('Missing tutorial lesson or recovery page');
        for(const page of this.pages.values()) {
            for(const id of [page.nextPage,...page.exceptions.map(exception=>exception.page)])
                if(id!==0 && id!==-1 && !this.pages.has(id))throw new Error('Invalid tutorial page destination');
        }
        this.macOS=!!options.macOS;
        this.anchors=options.anchors || null;
        this.onEnter=options.onEnter || (()=>{});
        this.onStop=options.onStop || (()=>{});
        this.onDismissWindow=options.onDismissWindow || (()=>{});
        this.active=false;this.pageId=0;this.nextPage=0;this.deadline=null;this.alphaId=null;
    }

    get page() {
        return this.pages.get(this.macOS && this.pages.has(this.pageId+1000)?this.pageId+1000:this.pageId) || null;
    }

    replacePresentation(pages) {
        const replacement=new TutorialController(pages,{macOS:this.macOS});
        if(replacement.pages.size!==this.pages.size)throw new Error('Changed tutorial controls');
        for(const [id,page] of this.pages){
            const next=replacement.pages.get(id);
            if(!next || next.nextPage!==page.nextPage || !!next.button!==!!page.button || JSON.stringify(next.exceptions)!==JSON.stringify(page.exceptions))
                throw new Error('Changed tutorial controls');
        }
        // No entry callbacks: language changes cannot replay a sound, reset a
        // wait, select home, or modify the practice document.
        this.pages=replacement.pages;
    }

    start(context={}) {
        this.alphaId=null;
        if(context.modal && [22,32].includes(context.window)) {
            this.onDismissWindow(context.window);
            context={window:context.window===22?context.underWindow:null,modal:false};
        }
        const modal=context.modal && context.window!==34 && context.window!==4;
        this.goto(modal?101:context.window===1?100:1);
        // Galactica::cmd_GalacticaTutorial explicitly sets this override.
        this.nextPage=this.pageId===100?1:2;
        return this.page;
    }

    goto(id) {
        if(id===-1){this.stop('complete');return true;}
        const target=id===0?this.pageId+1:id;
        if(!Number.isInteger(target) || !this.pages.has(target))throw new Error('Unknown tutorial page');
        this.pageId=target;this.active=true;this.deadline=null;
        this.nextPage=this.page.nextPage;
        const effects=[];
        if(this.pageId>=5 && this.pageId<12)effects.push({type:'selectHome'});
        if(this.pageId===60)effects.push({type:'setEnemyPlayback',enabled:true},{type:'restoreHoverHelp'});
        this.onEnter(this.pageId,this.page,effects);
        return true;
    }

    stop(reason='cancel') {
        if(!this.active)return false;
        this.active=false;this.deadline=null;
        this.onStop(reason);
        return true;
    }

    advance(window=null) {
        if(!this.active)return false;
        let target=this.nextPage;
        // The first matching exception wins; a wildcard only matches a window.
        if(window!==null && window!==undefined) {
            const exception=this.page.exceptions.find(item=>item.window===window || item.window===-1);
            if(exception)target=exception.page;
        }
        return this.goto(target);
    }

    pressButton(context={}) {
        if(!this.active || !this.page.button)return false;
        if(this.pageId===101){this.start(context);return true;}
        return this.advance(context.window);
    }

    tick(now) {
        if(!this.active || this.deadline===null || !Number.isFinite(now) || now<=this.deadline)return false;
        return this.advance();
    }

    placementAllowed(point) {
        const home=this.anchors && this.anchors.home,terra=this.anchors && this.anchors.newTerra;
        if(![point,home,terra].every(p=>p && Number.isFinite(p.x) && Number.isFinite(p.y)))return false;
        const distance=(a,b)=>Math.trunc(Math.hypot(a.x-b.x,a.y-b.y));
        const span=distance(home,terra);
        return distance(point,home)<=span && distance(point,terra)<=span;
    }

    observe(event,now=0) {
        const result={accepted:true,advanced:false,effects:[]};
        if(!this.active || !event || typeof event.type!=='string')return result;
        const page=this.pageId;
        const next=()=>{result.advanced=this.advance(event.window);};
        if((page===2 || page===3 && event.hosting) && event.type==='newGameOpened') {
            if(event.hosting)result.advanced=this.goto(103);else next();
        } else if(page===3 && event.type==='setupAccepted' || page===4 && event.type==='playerNameAccepted')next();
        else if(page===7 && event.type==='zoomChanged' || page===10 && event.type==='allocationChanged') {
            if(Number.isFinite(now))this.deadline=now+(page===7?3000:2000);
        } else if(messagePages.has(page) && event.type==='messageWindowOpened' ||
                acknowledgedPages.has(page) && event.type==='messageAcknowledged' ||
                attentionPages.has(page) && event.type==='attentionPresented' ||
                emptyAttentionPages.has(page) && event.type==='attentionEmpty') {
            if(page===44)result.effects.push({type:'setCourierDestination',starId:S7});
            if(page===55)result.effects.push({type:'setEnemyPlayback',enabled:false});
            next();
        } else if(page===21 && event.type==='turnReportsReady') {
            result.effects.push({type:'selectColonyShip'});next();
        } else if([16,17].includes(page) && event.type==='beginWaypoint')next();
        else if(page===17 && event.type==='waypointChosen') {
            if(event.targetKind==='star' && event.targetId===NEW_TERRA)this.nextPage=19;
            else result.accepted=false;
            next();
        } else if((page===28 || page===34) && event.type==='waypointChosen') {
            if(event.targetKind==='star' && event.targetId===(page===28?S7:NEW_TERRA))next();
        } else if([19,26,31,37].includes(page) && event.type==='buildHullSelected') {
            const expected={19:[HOME,'defense'],26:[NEW_TERRA,'battleship'],31:[HOME,'scout'],37:[HOME,'battleship']}[page];
            if(event.starId===expected[0] && event.hull===expected[1])next();
        } else if(page===20 && event.type==='allocationsEqualized')next();
        else if(page===25 && event.type==='objectRenamed' && event.objectKind==='star' && event.objectId===NEW_TERRA) {
            result.effects.push({type:'rename',objectKind:'star',id:NEW_TERRA,name:'New Terra'});next();
        } else if([30,36].includes(page) && event.type==='objectSelected' && event.objectId===HOME)next();
        else if(page===38 && event.type==='beginRendezvous')next();
        else if(page===39 && event.type==='rendezvousPlaced') {
            if(this.placementAllowed(event.point) && Number.isInteger(event.objectId) && event.objectId>0) {
                this.alphaId=event.objectId;next();
            } else result.accepted=false;
        } else if(page===40 && event.type==='objectRenamed' && event.objectKind==='rendezvous' && event.objectId===this.alphaId) {
            result.effects.push({type:'rename',objectKind:'rendezvous',id:this.alphaId,name:'Alpha'});next();
        } else if([41,42].includes(page) && event.type==='defaultDestinationChosen' &&
                this.alphaId!==null && event.targetKind==='rendezvous' && event.targetId===this.alphaId)next();
        else if(page===48 && event.type==='patrolChanged')next();
        else if(page===50 && event.type==='playerComparisonOpened')next();
        else if(page===51 && event.type==='playerComparisonClosed')next();
        else if(page===57 && event.type==='fleetContentsOpened')next();
        return result;
    }

    snapshot(now=0) {
        return {format:1,page:this.pageId,active:this.active,nextPage:this.nextPage,alphaId:this.alphaId,
            waitRemaining:this.deadline===null?null:Math.max(0,this.deadline-now)};
    }

    restore(saved,now=0) {
        if(!saved || saved.format!==1 || typeof saved.active!=='boolean' ||
                !Number.isInteger(saved.page) || !this.pages.has(saved.page) ||
                !Number.isInteger(saved.nextPage) || saved.nextPage!==0 && saved.nextPage!==-1 && !this.pages.has(saved.nextPage) ||
                saved.alphaId!==null && (!Number.isInteger(saved.alphaId) || saved.alphaId<=0) ||
                saved.waitRemaining!==null && (!saved.active || ![7,10].includes(saved.page) ||
                    !Number.isFinite(saved.waitRemaining) || saved.waitRemaining<0) ||
                !Number.isFinite(now))throw new Error('Invalid tutorial progress');
        this.pageId=saved.page;this.active=saved.active;this.nextPage=saved.nextPage;this.alphaId=saved.alphaId;
        this.deadline=this.active && saved.waitRemaining!==null?now+saved.waitRemaining:null;
        if(this.active)this.onEnter(this.pageId,this.page,[]);
    }
}
module.exports=TutorialController;
