// Reuse the existing preference UI without registering a game document or simulation.
const Game=require('./game.js'),Factory=require('./factory.js'),Rules=require('./rules.js');
const GameConfig=require('./game-config.js'),Display=require('./display.js');
class StartupSettings {
    constructor(port,services){this.port=port;this.services=services;this.model=null;}
    get active(){return !!(this.model && this.model.uiWindow);}
    open(){
        if(!this.model){
            this.model=new Game(new Factory(),new Rules(false),new GameConfig({numComputers:0,skipMapGeneration:true}));
            this.model.port=this.port;new Display(this.model);
        }
        const model=this.model;Object.assign(model,this.services);
        for(const [field,reader] of [['showGrid','readGrid'],['showMapNames','readMapNames'],['showShips','readShips'],
            ['showAllCourses','readAllCourses'],['showCourierCourses','readCourierCourses'],['showScannerRanges','readScannerRanges'],
            ['showNebula','readNebula'],['showControlHelp','readControlHelp'],['showEnemyEvents','readEnemyEvents']])
            model[field]=this.services.drawingPreferences[reader]();
        model.endUIWindowDrag();model.display.clearControlHelp();
        model.windowPositions={};model.newGameDefaultsDraft=null;model.newGameDefaultsChoice=null;
        model.settingsPage=0;model.uiWindow='settings';model.display.reloadUIStrings();return true;
    }
    draw(){
        const display=this.model.display;display.visualTime=pdg.tm.getMilliseconds();
        display.drawingActiveWindow=true;
        try{display.drawActiveWindow();}finally{display.drawingActiveWindow=false;}
        display.drawControlHelp();
    }
    mouse(event){
        const model=this.model,p=event.mousePos;
        if(event.eventType===pdg.eventType_MouseUp){model.endUIWindowDrag(p.x,p.y);return true;}
        if(event.eventType===pdg.eventType_MouseDown){
            model.display.clearControlHelp();
            if(event.buttonNumber===0 && !model.beginUIWindowDrag(p.x,p.y)){
                const action=model.display.getActiveWindowActionAt(p.x,p.y);
                if(action)model.executeUIAction(action);else if(!model.display.containsPoint(model.display.getActiveWindowRect(),p.x,p.y))model.sound.play(1012);
            }else if(event.buttonNumber!==0)model.sound.play(1012);
        }
        return true;
    }
    move(event){
        const model=this.model;if(model.uiWindowDrag && event.leftButton===false)model.endUIWindowDrag();
        if(!model.updateUIWindowDrag(event.mousePos.x,event.mousePos.y))model.display.setHoverPoint(event.mousePos.x,event.mousePos.y);
        return true;
    }
    key(key){
        if(this.model.uiWindowDrag){if(key===pdg.key_Escape)this.model.endUIWindowDrag();return true;}
        // Only settings commands are eligible; game shortcuts cannot start turns or documents.
        if(this.model.uiWindow==='settings' && modelKeys[key])return this.model.executeUIAction({type:modelKeys[key]});
        return this.model.handleCommandWindowKey(key,this.model.getKeyChar(key));
    }
}
const modelKeys={};
for(const [key,type] of [['key_F1','toggleShips'],['key_F2','toggleMapNames'],['key_F3','toggleGrid'],
    ['key_F4','toggleAllCourses'],['key_F5','toggleCourierCourses'],['key_F6','toggleScannerRanges']])modelKeys[pdg[key]]=type;
module.exports=StartupSettings;
