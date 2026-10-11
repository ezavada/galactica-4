// Bind progression to one tutorial game's successful actions. Instance wrappers
// are removable and never change Game/Display prototypes or normal sessions.
class TutorialRuntime {
    constructor(game,controller) {
        if(!game || !controller || typeof controller.observe!=='function' || typeof controller.onEnter!=='function' || game.tutorialRuntime)throw new Error('Invalid tutorial binding');
        this.game=game;this.controller=controller;this.restorers=[];this.disposed=false;
        game.tutorialRuntime=this;
        this.roleIds={colony:null,scout:null};
        this.captureRoles();
        controller.anchors={home:game.stars.find(s=>s.id===2),newTerra:game.stars.find(s=>s.id===9)};
        const enter=controller.onEnter;
        controller.onEnter=(id,page,effects)=>{this.applyEffects(effects);if(id===17)this.frameFirstDestination();enter(id,page,effects);};
        this.restorers.push(()=>{controller.onEnter=enter;});
        try {
            this.bindActions();
            if(game.display)this.attachDisplay(game.display);
        } catch(error) {this.dispose();throw error;}
    }

    wrap(object,key,around) {
        const descriptor=Object.getOwnPropertyDescriptor(object,key),original=object[key];
        if(typeof original!=='function')throw new Error('Missing tutorial action '+key);
        const wrapped=function(...args){return around(()=>original.apply(this,args),args);};
        object[key]=wrapped;
        this.restorers.push(()=>{if(object[key]!==wrapped)return;if(descriptor)Object.defineProperty(object,key,descriptor);else delete object[key];});
    }

    notify(event) {
        this.captureRoles();
        const result=this.controller.observe(event,this.game.getCurrentMilliseconds());
        this.applyEffects(result.effects);
        return result;
    }

    applyEffects(effects=[]) {
        const g=this.game,firstHull=type=>{
            this.captureRoles();
            return g.allShips.find(ship=>ship.id===this.roleIds[type] && !ship.isDead() && !ship.underConstruction());
        };
        for(const effect of effects) {
            if(effect.type==='selectHome') {
                const home=g.stars.find(star=>star.id===2);
                if(home){g.setSelectedObject(home);if(g.display)g.display.centerOn(home.x,home.y);}
            } else if(effect.type==='selectColonyShip') {
                const ship=firstHull('colony');if(ship)g.setSelectedObject(ship);
            } else if(effect.type==='setCourierDestination') {
                const ship=firstHull('scout'),star=g.stars.find(s=>s.id===effect.starId);
                if(ship && star){ship.course.clear();ship.setDestination(star);}
            } else if(effect.type==='rename') {
                const objects=effect.objectKind==='star'?g.stars:effect.objectKind==='rendezvous'?g.allRendezvous:[];
                const object=objects.find(item=>item.id===effect.id);
                if(object)object.name=effect.name;
            } else if(effect.type==='setEnemyPlayback')g.showEnemyEvents=effect.enabled;
            else if(effect.type==='restoreHoverHelp')g.showControlHelp=true;
        }
    }

    getMapTarget() {
        if(this.disposed || !this.controller.active || ![17,18].includes(this.controller.pageId))return null;
        return this.game.stars.find(star=>star.id===9) || null;
    }

    frameFirstDestination() {
        const target=this.getMapTarget(),home=this.game.stars.find(star=>star.id===2),display=this.game.display;
        if(!target || !home || !display)return;
        const distance=Math.hypot(target.x-home.x,target.y-home.y);
        if(distance>0)display.camera.setZoom(Math.max(display.camera.zoom,90/(distance*display.camera.scale)));
        // Presentation only: retain the original galaxy, selected ship and orders.
        display.centerOn((home.x+target.x)/2,(home.y+target.y)/2);
    }

    captureRoles() {
        for(const type of ['colony','scout']) {
            if(this.roleIds[type]!==null)continue;
            const ship=this.game.allShips.find(ship=>ship.owner===this.game.getCurrentHumanPlayer() &&
                ship.type===type && !ship.isDead() && !ship.underConstruction());
            if(ship)this.roleIds[type]=ship.id;
        }
    }

    snapshot() {
        this.captureRoles();
        return {format:1,roles:{...this.roleIds},progress:this.controller.snapshot(this.game.getCurrentMilliseconds())};
    }

    restore(saved) {
        if(!saved || saved.format!==1 || !saved.roles || ['colony','scout'].some(type=>{
            const id=saved.roles[type],ship=this.game.allShips.find(ship=>ship.id===id);
            return id!==null && (!Number.isInteger(id) || id<=0 || ship &&
                (ship.type!==type || ship.owner!==this.game.getCurrentHumanPlayer()));
        }) || saved.roles.colony!==null && saved.roles.colony===saved.roles.scout)
            throw new Error('Invalid tutorial ship identities');
        this.controller.restore(saved.progress,this.game.getCurrentMilliseconds());
        this.roleIds={colony:saved.roles.colony,scout:saved.roles.scout};
    }

    targetData(target) {
        const factory=this.game.factory;
        return {targetId:target && target.id,targetKind:factory.isStar(target)?'star':
            factory.isRendezvous(target)?'rendezvous':'other'};
    }

    bindActions() {
        const g=this.game;
        this.wrap(g,'setSelectedObject',(call,[object])=>{const result=call();if(object)this.notify({type:'objectSelected',objectId:object.id});return result;});
        for(const [method,type] of [['adjustStarAllocation','allocationChanged'],['resetSelectedStarAllocations','allocationsEqualized'],
                ['beginCourseEdit','beginWaypoint'],['togglePatrol','patrolChanged']])
            this.wrap(g,method,(call)=>{const result=call();if(result)this.notify({type});return result;});
        this.wrap(g,'beginMapOrder',(call,[object])=>{const result=call();if(result && g.pendingMapOrderObject===object && !g.factory.isStar(object))this.notify({type:'beginWaypoint'});return result;});
        this.wrap(g,'issuePlayerWaypoint',(call,[object,target])=>{
            if(this.controller.active && this.controller.pageId===17 && g.canEditCourse(object) && target && Number.isFinite(target.x) && Number.isFinite(target.y) &&
                    !(g.factory.isStar(target) && target.id===9)) {
                this.notify({type:'waypointChosen',...this.targetData(target)});return false;
            }
            const result=call();if(result)this.notify({type:'waypointChosen',...this.targetData(target)});return result;
        });
        this.wrap(g,'beginRendezvousPlacement',(call,[point])=>{const result=call();if(result && !point && g.pendingRendezvousPlacement)this.notify({type:'beginRendezvous'});return result;});
        this.wrap(g,'finishRendezvousPlacementAt',(call,[x,y,target])=>{
            if(this.controller.active && this.controller.pageId===39 && g.pendingRendezvousPlacement && g.display) {
                const object=target || g.findObjectAtPosition(x,y),anchored=object &&
                    (g.factory.isStar(object) || g.factory.isShip(object) || g.factory.isFleet(object));
                const point=anchored?object:{x:g.display.toGalacticX(x),y:g.display.toGalacticY(y)};
                if(!this.controller.placementAllowed(point))return false;
            }
            return call();
        });
        this.wrap(g,'createRendezvousAt',(call,[x,y,owner=g.getCurrentHumanPlayer()])=>{
            const placing=this.controller.active && this.controller.pageId===39 && owner===g.getCurrentHumanPlayer();
            if(placing && !this.controller.placementAllowed({x,y}))return null;
            const object=call();
            if(object && placing){this.notify({type:'rendezvousPlaced',point:object,objectId:object.id});g.beginRenameObject(object);}
            return object;
        });
        this.wrap(g,'commitRename',(call)=>{
            const object=g.renameTarget,valid=object && g.canHumanControl(object) && g.renameText.trim().length>0;
            if(valid && this.controller.active) {
                if(this.controller.pageId===25 && g.factory.isStar(object) && object.id===9)g.renameText='New Terra';
                if(this.controller.pageId===40 && g.factory.isRendezvous(object) && object.id===this.controller.alphaId)g.renameText='Alpha';
            }
            const result=call();if(result && valid)this.notify({type:'objectRenamed',objectKind:this.targetData(object).targetKind,objectId:object.id});return result;
        });
        this.wrap(g,'handleStarKeyPress',(call,[star,key])=>{
            const result=call(),hull={s:'scout',d:'defense',b:'battleship',c:'colony'}[String.fromCharCode(key)];
            if(hull && g.canHumanControl(star) && star.currentShip && star.currentShip.type===hull)
                this.notify({type:'buildHullSelected',starId:star.id,hull});
            return result;
        });
        this.wrap(g,'executeUIAction',(call,[action])=>{
            const previous=g.uiWindow,result=call();
            if(result && action && action.type==='buildShip' && action.object && g.canHumanControl(action.object) &&
                    action.object.currentShip && action.object.currentShip.type===action.shipType)
                this.notify({type:'buildHullSelected',starId:action.object.id,hull:action.shipType});
            if(action && action.type==='closePlayerComparison' && previous==='comparison' && g.uiWindow!=='comparison')this.notify({type:'playerComparisonClosed'});
            return result;
        });
        this.wrap(g,'showFleetExchange',(call,[object])=>{const result=call();if(result && g.factory.isFleet(object) && g.uiWindow==='fleetExchange')this.notify({type:'fleetContentsOpened'});return result;});
        this.wrap(g,'draw',(call)=>{this.tick();return call();});
        this.wrap(g,'toggleUIWindow',(call,[window])=>{
            const previous=g.uiWindow,result=call();
            if(window==='comparison' && previous!==g.uiWindow)this.notify({type:g.uiWindow==='comparison'?'playerComparisonOpened':'playerComparisonClosed'});
            return result;
        });
        this.wrap(g,'handleCommandWindowKey',(call)=>{
            const previous=g.uiWindow,result=call();if(previous==='comparison' && g.uiWindow!=='comparison')this.notify({type:'playerComparisonClosed'});return result;
        });
        this.wrap(g,'handleMouseRightClick',(call)=>{
            const star=g.selectedObject,result=call();
            if(result && star && g.factory.isStar(star) && g.canHumanControl(star)) {
                const target=star.getDefaultDestination();if(target)this.notify({type:'defaultDestinationChosen',...this.targetData(target)});
            }
            return result;
        });
        this.wrap(g.attention,'next',(call)=>{const result=call();this.notify({type:result?'attentionPresented':'attentionEmpty'});return result;});
        this.wrap(g,'showEventOverlay',(call,[overlay])=>{
            const result=call();
            if(result && overlay && ['report','stardock','lab','outcome'].includes(overlay.type)) {
                if(!overlay.animationOnly)this.notify({type:'messageWindowOpened'});
                // V3 ShowMessages advances these lessons after PlayMessage,
                // including automatic notices that have no modal window.
                else if(!overlay.manual)this.notify({type:'automaticNoticePlayed'});
            }
            return result;
        });
        this.wrap(g,'dismissEventPresentation',(call)=>{
            const modal=g.overlay && !g.overlay.animationOnly && ['report','stardock','lab','outcome'].includes(g.overlay.type);
            // Source acknowledgments update playback flags before the next
            // queued message is considered. A live modal guarantees dismissal.
            if(modal)this.notify({type:'messageAcknowledged'});
            return call();
        });
        this.wrap(g,'endTurn',(call)=>{const turn=g.turn,result=call();if(g.turn!==turn)this.notify({type:'turnReportsReady'});return result;});
    }

    attachDisplay(display) {
        if(this.display===display)return;
        this.display=display;
        for(const method of ['zoomIn','zoomOut','zoomToFit'])this.wrap(display,method,(call)=>{
            const before=display.camera.zoom,result=call();if(display.camera.zoom!==before)this.notify({type:'zoomChanged'});return result;
        });
    }

    tick() {
        return this.controller.tick(this.game.getCurrentMilliseconds());
    }

    dispose() {
        if(this.disposed)return false;
        this.disposed=true;
        for(const restore of this.restorers.reverse())restore();
        if(this.game.tutorialRuntime===this)delete this.game.tutorialRuntime;
        return true;
    }
}
module.exports=TutorialRuntime;
