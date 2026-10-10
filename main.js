// Galactica-4 PDG Game - Main Entry Point
// Run with: ./gad4
// Optional: ./gad4 -- --lang=es (for Spanish)
// AI autoplay observer: ./gad4 -- --ai-autoplay

const pdg = require('pdg');
const PanelAppearance = require('./src/js/panel-appearance.js');
globalThis.pdg = pdg;
const StartupLifecycle=require('./src/js/startup-lifecycle.js');
const installation=StartupLifecycle.createInstallation();
const StartupActions=require('./src/js/startup-actions.js');
const configuredStartupAction=StartupActions.read();

console.log("=== Galactica-4 PDG Game Starting ===");

// Open the data directory as a resource path (for strings.txt and strings-*.txt files)
// This tells the ResourceManager where to look for localized string files
const path = require('path');
const dataPath = path.join(__dirname, 'data');
const userManual=require('./src/js/user-manual.js').createManual(__dirname);
const resourceRef = pdg.res.openResourceFile(dataPath);
if (resourceRef) {
    console.log(`Resource path set to: ${dataPath}`);
} else {
    console.warn(`Failed to open resource path: ${dataPath}`);
}

// Parse command-line arguments for language setting and observer modes.
// With the gad4 launcher, pass app arguments after `--`, e.g. `./gad4 -- --lang=es`.
const args = process.argv.slice(2); // Skip launcher and script path entries

function hasArg(...names) {
    return args.some(arg => names.includes(arg));
}

function getIntegerArg(name, fallback = null) {
    const prefix = `${name}=`;
    const arg = args.find(value => value.startsWith(prefix));
    if (!arg) {
        return fallback;
    }
    const parsed = Number(arg.substring(prefix.length));
    return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

const LanguageSettings = require('./src/js/language-settings.js');
const StartupSetup = require('./src/js/startup-setup.js');
const ControlHelp=require('./src/js/hover-help.js');
const startupHelp=new ControlHelp.HoverHelp();
let startupHoverPoint=null;
const PlayerName=require('./src/js/player-name.js');
const playerNamePreferences=PlayerName.createPreferences();
const rosterPreferences = require('./src/js/roster-preferences.js').createPreferences();
const systemComparisonPreferences = require('./src/js/roster-preferences.js').createPreferences(globalThis, {
    prefix:'systemComparison', minimumHeight:176, keys:['name','tech','population','production','buildName','completion',
        'totalDefense','satelliteDefense','shipDefense']
});
const NewGameDefaults=require('./src/js/new-game-defaults.js');
const newGameDefaultsPreferences=NewGameDefaults.createPreferences();
const ColonyPreferences=require('./src/js/colony-preferences.js');
const colonyDefaultsPreferences=ColonyPreferences.createPreferences();
const drawingPreferences = require('./src/js/drawing-preferences.js').createPreferences();
const sound=require('./src/js/sound.js').createSound(pdg.res,drawingPreferences);
const languagePreferences = LanguageSettings.createPreferences();
LanguageSettings.initialize(args,pdg.res,languagePreferences);

// Load required modules
const Factory = require('./src/js/factory.js');
const Display = require('./src/js/display.js');
const Game = require('./src/js/game.js');
const Rules = require('./src/js/rules.js');
const GameConfig = require('./src/js/game-config.js');
const I18n = require('./src/js/i18n.js');
const Autoplay = require('./src/js/autoplay.js');
const sessions=new (require('./src/js/game-sessions.js'))();
let tutorialSession=null;
let tutorialPanel=null;
let tutorialPointerCapture=false;
const documents=new (require('./src/js/documents.js'))(require('./src/js/document-files.js').createFiles(),()=>sessions.active,installSavedGame,revertSavedGame);

const launchOptions = {
    aiAutoplay: hasArg('--ai-autoplay', '--autoplay-ai-skills'),
    seed: getIntegerArg('--seed', null),
    autoplayDelayMs: getIntegerArg('--autoplay-delay', Autoplay.DEFAULT_AUTOPLAY_TURN_DELAY_MS),
    autoplayMaxTurns: getIntegerArg('--autoplay-max-turns', Autoplay.DEFAULT_AUTOPLAY_MAX_TURNS),
    autoplayEventMs: getIntegerArg('--autoplay-event-ms', Autoplay.DEFAULT_AUTOPLAY_EVENT_PRESENTATION_MS),
    showEventWindows: hasArg('--show-event-windows'),
    fastAutoplay: hasArg('--fast-autoplay')
};

const selectedSeed = launchOptions.seed !== null ?
    launchOptions.seed :
    (launchOptions.aiAutoplay ? Autoplay.DEFAULT_AI_SKILL_AUTOPLAY_SEED : Date.now() >>> 0);
const randomSeed = selectedSeed >>> 0;

pdg.srand(randomSeed);
console.log(`Random seed set to: ${randomSeed}${launchOptions.aiAutoplay ? ' (AI autoplay)' : ''}`);

// Create window port
const port = pdg.gfx.createWindowPort(new pdg.Rect(0, 0, 800, 600), I18n.getString(568, 'Galactica-4'));
const fullscreen = require('./src/js/fullscreen.js').createController(pdg,port,globalThis,drawingPreferences);
fullscreen.restore();
const presentation=new (require('./src/js/presentation.js'))(drawingPreferences);
const startupLifecycle=new StartupLifecycle.StartupLifecycle(installation,()=>beginTutorial(),()=>userManual.open(pdg.res.getLanguage()),()=>StartupActions.dispatch(configuredStartupAction,{
    ...StartupActions.preferenceServices(drawingPreferences,sound,startupSettings,enabled=>{
        startupHelp.clear();if(game){game.showControlHelp=enabled;game.display.clearControlHelp();}
        if(startupSettings.model){startupSettings.model.showControlHelp=enabled;startupSettings.model.display.clearControlHelp();}
    }),
    about:openAbout,newGame:()=>sessions.starting?true:beginNewGame(),open:()=>documents.beginOpen(),
    save:()=>documents.beginSave(),saveAs:()=>documents.beginSave(true),revert:()=>sessions.active?documents.beginRevert():false,
    quit:()=>pdg.quit(),fullscreen:()=>fullscreen.toggle(),help:()=>userManual.open(pdg.res.getLanguage()),tutorial:()=>beginTutorial()
}));
const openAbout=()=>startupSettings.open('about');
const startupSettings=new (require('./src/js/startup-settings.js'))(port,{drawingPreferences,languagePreferences,newGameDefaultsPreferences,colonyDefaultsPreferences,sound,fullscreen,presentation,openAbout,presentationClosed:kind=>{if(kind==='startup')startupLifecycle.finishIntroduction();},presentationTutorial:()=>{if(tutorialSession)return false;const kind=presentation.kind;presentation.close();startupSettings.model.uiWindow=null;const result=beginTutorial();if(kind==='startup')startupLifecycle.finishIntroduction();return result;}});

function createDefaultConfig(usePreferences=true) {
    if(usePreferences)return NewGameDefaults.createConfig(newGameDefaultsPreferences);
    const config = GameConfig.createSinglePlayer(2, 2); // 2 computers, Good difficulty
    config.sectorSize = 5;
    return config;
}

function refreshTotalPlayers(config) {
    config.totalPlayers = config.numHumans + config.numComputers;
}

let pendingConfig = launchOptions.aiAutoplay ?
    Autoplay.createAISkillAutoplayConfig({
        seed: randomSeed,
        turnDelayMs: Math.max(1, launchOptions.autoplayDelayMs),
        maxTurns: Math.max(1, launchOptions.autoplayMaxTurns),
        eventPresentationMs: Math.max(0, launchOptions.autoplayEventMs),
        showEventWindows: launchOptions.showEventWindows,
        fastGame: launchOptions.fastAutoplay
    }) :
    createDefaultConfig();
let startupPlayerName=null;
let startupGameTitle=null;
let startupComputerCount=null;
let startupAISkill=false;
let game = null;
let display = null;
let autoplayController = null;
const AUTOPLAY_TIMER_ID = 0x47414434; // "GAD4"

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function startupUIColor(name) {
    const colors = {
        panelFill: PanelAppearance.colors.panelFill,
        panelBorder: PanelAppearance.colors.panelBorder,
        divider: [0.34, 0.34, 0.36, 0.85],
        textLight: [0.78, 0.78, 0.80, 1.0],
        textMuted: [0.56, 0.56, 0.58, 1.0],
        background: [0.02, 0.02, 0.08, 1.0]
    };
    const color = colors[name];
    return color ? new pdg.Color(color[0], color[1], color[2], color[3]) : new pdg.Color(name);
}

function createStartupAttributes(definition = {}) {
    const attrs = new pdg.Attributes();
    if (definition.fillColor) {
        attrs.fillColor(definition.fillColor);
    }
    if (definition.lineColor) {
        attrs.lineColor(definition.lineColor);
    }
    if (definition.textSize !== undefined) {
        attrs.textSize(definition.textSize);
    }
    if (definition.textStyle !== undefined) {
        attrs.textStyle(definition.textStyle);
    }
    return attrs;
}

const windowPlacement=new (require('./src/js/window-placement.js'))(drawingPreferences);
for(const [object,method,name] of [[StartupSetup,'panelRect','startup'],[StartupSetup,'skillMenu','startupSkill'],
    [PlayerName,'layout','textEntry'],[documents,'layout','documents'],[userManual,'layout','manualError']]){
    const original=object[method];object[method]=function(width,height,...args){
        const layout=original.call(this,width,height,...args);
        return name==='documents' && documents.dialog && documents.dialog.kind==='editor'?layout:windowPlacement.layout(name,layout,{width,height});
    };
}
function foregroundApplicationWindow(){
    const area=port.getDrawingArea(),width=area.width(),height=area.height();
    if(userManual.error())return {name:'manualError',rect:userManual.layout(width,height,text=>port.getTextWidth(text,13)).rect};
    if(documents.dialog)return {name:documents.dialog.kind==='editor'?'textEntry':'documents',rect:documents.dialog.kind==='editor'?PlayerName.layout(width,height).rect:documents.layout(width,height).rect};
    if(startupSettings.active)return null;
    if(sessions.starting || !game){
        if(startupAISkill)return {name:'startupSkill',rect:StartupSetup.skillMenu(width,height,pendingConfig).rect};
        if(startupComputerCount || startupGameTitle || startupPlayerName)return {name:'textEntry',rect:PlayerName.layout(width,height).rect};
        return {name:'startup',rect:StartupSetup.panelRect(width,height)};
    }
    return null;
}

// Startup dialog drawing uses Attributes like CSS classes: define once, reuse at draw sites.
const startupStyles = {
    dim:createStartupAttributes({fillColor:new pdg.Color(0,0,0,0.5)}),
    checkboxMark:createStartupAttributes({lineColor:new pdg.Color('black')}),
    background: createStartupAttributes({ fillColor: startupUIColor('background') }),
    panel: createStartupAttributes({
        fillColor: startupUIColor('panelFill'),
        lineColor: startupUIColor('panelBorder')
    }),
    divider: createStartupAttributes({ lineColor: startupUIColor('divider') }),
    titleText: createStartupAttributes({
        fillColor: new pdg.Color('black'),
        textSize: 24,
        textStyle: pdg.textStyle_Centered
    }),
    subtitleText: createStartupAttributes({
        fillColor: new pdg.Color('black'),
        textSize: 13,
        textStyle: pdg.textStyle_Centered
    }),
    lineText: createStartupAttributes({
        fillColor: new pdg.Color('black'),
        textSize: 13,
        textStyle: pdg.textStyle_Plain
    }),
    hintText: createStartupAttributes({
        fillColor: new pdg.Color('black'),
        textSize: 12,
        textStyle: pdg.textStyle_Plain
    }),
    advantageButton: createStartupAttributes({fillColor:new pdg.Color(.86,.86,.85,1),lineColor:new pdg.Color(.32,.29,.20,.5)}),
    advantageButtonActive: createStartupAttributes({fillColor:new pdg.Color(.70,.73,.75,1),lineColor:new pdg.Color(.32,.29,.20,.5)}),
    advantageText: createStartupAttributes({fillColor:new pdg.Color('black'),textSize:13,textStyle:pdg.textStyle_Centered}),
    advantageSummary: createStartupAttributes({fillColor:new pdg.Color('black'),textSize:12,textStyle:pdg.textStyle_RightJustified}),
    startText: createStartupAttributes({
        fillColor: new pdg.Color('black'),
        textSize: 14,
        textStyle: pdg.textStyle_Centered
    })
};

function toStartupPDGRect(rect) {
    if (rect && rect.x !== undefined && rect.y !== undefined && rect.width !== undefined && rect.height !== undefined) {
        return new pdg.Rect(new pdg.Point(rect.x, rect.y), rect.width, rect.height);
    }
    return rect;
}

function drawStartupRoundedRect(rect, radius = 14, attrs = startupStyles.panel) {
    if (attrs && typeof attrs.roundedCorners === 'function') {
        attrs.roundedCorners(radius);
    }
    port.drawRect(toStartupPDGRect(rect), attrs);
    if(attrs===startupStyles.panel){
        const light=startupStyles.goldLight || (startupStyles.goldLight=createStartupAttributes({lineColor:new pdg.Color(1,.91,.58,.95)}).lineThickness(1));
        const shade=startupStyles.goldShade || (startupStyles.goldShade=createStartupAttributes({lineColor:new pdg.Color(.52,.33,.06,.9)}).lineThickness(1));
        PanelAppearance.drawGoldEdges(port,rect,light,shade);
    }
}

const ButtonCaption=require('./src/js/button-caption.js');
function drawStartupButtonCaption(rect,label,attrs=startupStyles.advantageText,size=13){
    const hintSize=Math.max(8,Math.min(9,size-2));
    const caption=ButtonCaption.layout(rect,label,null,(text,fontSize)=>port.getTextWidth(text,fontSize),{hintSize});
    attrs.textSize(size).textStyle(pdg.textStyle_Centered);
    port.drawText(caption.label,new pdg.Point(caption.labelX,Math.round(rect.y+rect.height/2+size*.3)),attrs);
    if(caption.key){
        const hint=startupStyles.keyHint || (startupStyles.keyHint=createStartupAttributes({fillColor:new pdg.Color('black'),textStyle:pdg.textStyle_RightJustified}));
        hint.textSize(hintSize);port.drawText(caption.key,new pdg.Point(caption.keyX,Math.round(rect.y+rect.height/2+3)),hint);
    }
}

function drawStartupDivider(x, y, width) {
    port.drawLine(new pdg.Point(x, y), new pdg.Point(x + width, y), startupStyles.divider);
}

function beginPlayerName() {
    if(tutorialSession && tutorialSession.engaged && !tutorialSession.acceptSetup())return false;
    if(pendingConfig.numHumans===0){startGame();return;}
    startupPlayerName=PlayerName.createEditor(pendingConfig.humanPlayerNames[1] || playerNamePreferences.read() || I18n.getString(17,'You'));
}

function submitPlayerName() {
    if(!startupPlayerName)return;
    const name=startupPlayerName.text.trim();
    if(!PlayerName.validName(name)){startupPlayerName.error=true;return;}
    pendingConfig.humanPlayerNames[1]=name;
    if(startGame()){playerNamePreferences.write(name);startupPlayerName=null;}
}

function beginComputerCount() {startupComputerCount=PlayerName.createEditor(String(pendingConfig.numComputers),2);}
function submitComputerCount() {
    if(!startupComputerCount)return;
    if(!StartupSetup.acceptComputerCount(pendingConfig,startupComputerCount.text)){startupComputerCount.error=true;return;}
    startupComputerCount=null;
}

function beginGameTitle() {
    startupGameTitle=PlayerName.createEditor(pendingConfig.gameTitle,StartupSetup.maximumTitleLength);
}

function submitGameTitle() {
    if(!startupGameTitle)return;
    if(!StartupSetup.setGameTitle(pendingConfig,startupGameTitle.text)){startupGameTitle.error=true;return;}
    startupGameTitle=null;
}

function drawStartupTextDialog(editor,labels) {
    const area=port.getDrawingArea(),layout=PlayerName.layout(area.width(),area.height(),labels.submit),{rect,field}=layout;
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),labels.dim?startupStyles.dim:startupStyles.background);
    PanelAppearance.applySystemSurface(startupStyles.panel,rect);drawStartupRoundedRect(rect,14,startupStyles.panel);
    startupStyles.subtitleText.textSize(16);startupStyles.lineText.textSize(14);startupStyles.hintText.textSize(12);startupStyles.advantageText.textSize(13);
    port.drawText(labels.title,new pdg.Point(rect.x+rect.width/2,rect.y+40),startupStyles.subtitleText);
    port.drawText(labels.prompt,new pdg.Point(rect.x+24,rect.y+78),startupStyles.lineText);
    drawStartupRoundedRect(field,6,startupStyles.advantageButton);
    const visible=PlayerName.visibleText(editor,field.width-24,text=>port.getTextWidth(text,14));
    if(editor.selected)drawStartupRoundedRect({x:field.x+9,y:field.y+5,width:Math.min(field.width-18,port.getTextWidth(visible.text,14)+6),height:26},3,startupStyles.advantageButtonActive);
    port.drawText(visible.text,new pdg.Point(field.x+12,field.y+24),startupStyles.lineText);
    if(!editor.selected)port.drawLine(new pdg.Point(field.x+12+visible.caret,field.y+7),new pdg.Point(field.x+12+visible.caret,field.y+28),startupStyles.divider);
    port.drawText(editor.error?labels.error:'',new pdg.Point(rect.x+24,rect.y+178),startupStyles.hintText);
    for(const button of layout.buttons){drawStartupRoundedRect(button.rect,7,startupStyles.advantageButton);drawStartupButtonCaption(button.rect,button.label,startupStyles.advantageText,13);}
}

function drawStartupCheckbox(rect,label,checked,scale) {
    const step=value=>value*scale;
    drawStartupRoundedRect(rect,6,checked?startupStyles.advantageButtonActive:startupStyles.advantageButton);
    const box={x:rect.x+step(8),y:rect.y+step(5),width:step(16),height:step(16)};
    drawStartupRoundedRect(box,3,startupStyles.advantageButton);
    if(checked) {
        port.drawLine(new pdg.Point(box.x+box.width*.2,box.y+box.height*.5),new pdg.Point(box.x+box.width*.43,box.y+box.height*.75),startupStyles.checkboxMark);
        port.drawLine(new pdg.Point(box.x+box.width*.43,box.y+box.height*.75),new pdg.Point(box.x+box.width*.82,box.y+box.height*.22),startupStyles.checkboxMark);
    }
    let size=Math.max(9,13*scale);
    while(size>9 && port.getTextWidth(label,size)>rect.width-step(40))size--;
    startupStyles.lineText.textSize(size);
    port.drawText(label,new pdg.Point(rect.x+step(32),rect.y+step(18)),startupStyles.lineText);
}

function drawStartupSkillMenu() {
    const area=port.getDrawingArea(),layout=StartupSetup.skillMenu(area.width(),area.height(),pendingConfig),rect=layout.rect;
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),startupStyles.background);
    PanelAppearance.applySystemSurface(startupStyles.panel,rect);drawStartupRoundedRect(rect,14,startupStyles.panel);
    startupStyles.subtitleText.textSize(16);startupStyles.advantageText.textSize(14);
    port.drawText(I18n.formatString(522,'AI skill: {0} ({1})',pendingConfig.getDifficultyName(),pendingConfig.compSkill),new pdg.Point(rect.x+rect.width/2,rect.y+36),startupStyles.subtitleText);
    for(const choice of layout.choices) {
        drawStartupRoundedRect(choice.rect,7,choice.active?startupStyles.advantageButtonActive:startupStyles.advantageButton);
        port.drawText(choice.label+' <'+choice.value+'>',new pdg.Point(choice.rect.x+choice.rect.width/2,choice.rect.y+20),startupStyles.advantageText);
    }
    drawStartupRoundedRect(layout.cancel,7,startupStyles.advantageButton);
    port.drawText(I18n.getString(683,'Cancel'),new pdg.Point(layout.cancel.x+layout.cancel.width/2,layout.cancel.y+20),startupStyles.advantageText);
}

function drawStartupDialog() {
    if(startupAISkill){drawStartupSkillMenu();return;}
    if(startupComputerCount){drawStartupTextDialog(startupComputerCount,{title:I18n.getString(829,'Computer opponents'),prompt:I18n.formatString(830,'Enter the number of opponents (0–{0}).',99-pendingConfig.numHumans),error:I18n.formatString(831,'Enter a whole number from 0 to {0}.',99-pendingConfig.numHumans),submit:I18n.getString(682,'Save')});return;}
    if(startupGameTitle){drawStartupTextDialog(startupGameTitle,{title:I18n.getString(825,'Game title'),prompt:I18n.getString(826,'Enter a game title.'),error:I18n.getString(827,'Enter a title before saving.'),submit:I18n.getString(682,'Save')});return;}
    if(startupPlayerName){drawStartupTextDialog(startupPlayerName,{title:I18n.getString(822,'Player name'),prompt:I18n.getString(823,'Enter your player name.'),error:I18n.getString(824,'Enter a name before starting.'),submit:I18n.getString(528,'<Enter> Start')});return;}

    const drawingArea = port.getDrawingArea();
    const screenWidth = drawingArea.width();
    const screenHeight = drawingArea.height();

    port.drawRect(new pdg.Rect(0, 0, screenWidth, screenHeight), startupStyles.background);

    const panelRect=StartupSetup.panelRect(screenWidth,screenHeight);
    const {x:panelX,y:panelY,width:panelWidth}=panelRect;
    const scale=panelRect.height/540,step=value=>value*scale;
    for(const [style,size] of [['titleText',24],['subtitleText',13],['lineText',13],['hintText',12],['startText',14],['advantageText',13],['advantageSummary',12]])startupStyles[style].textSize(Math.max(9,size*scale));
    PanelAppearance.applySystemSurface(startupStyles.panel,panelRect);
    drawStartupRoundedRect(panelRect, 14, startupStyles.panel);

    port.drawText(I18n.getString(568, 'Galactica-4'), new pdg.Point(panelX+panelWidth/2, panelY + step(44)), startupStyles.titleText);
    const titleRect=StartupSetup.titleRegion(panelRect),titleLabel=I18n.formatString(828,'Title: {0} <T>',pendingConfig.gameTitle);
    drawStartupRoundedRect(titleRect,6,startupStyles.advantageButton);
    let titleSize=Math.max(9,13*scale);
    while(titleSize>9 && ButtonCaption.width(titleLabel,null,(text,size)=>port.getTextWidth(text,size),{size:titleSize})>titleRect.width)titleSize--;
    startupStyles.subtitleText.textSize(titleSize);
    drawStartupButtonCaption(titleRect,titleLabel,startupStyles.subtitleText,titleSize);
    drawStartupDivider(panelX + 28, panelY + step(88), panelWidth - 56);

    const x = panelX + 34;
    let y = panelY + step(112);
    drawStartupRoundedRect(StartupSetup.computerCountRegion(panelRect),6,startupStyles.advantageButton);
    port.drawText(I18n.formatString(
        521,
        'Players: {0} {1}, {2} {3}',
        pendingConfig.numHumans,
        I18n.getString(503, 'human'),
        pendingConfig.numComputers,
        I18n.getString(504, 'AI')
    ), new pdg.Point(x, y), startupStyles.lineText);
    y += step(24);
    drawStartupRoundedRect(StartupSetup.skillRegion(panelRect),6,startupStyles.advantageButton);
    port.drawText(I18n.formatString(522, 'AI skill: {0} ({1})', pendingConfig.getDifficultyName(), pendingConfig.compSkill), new pdg.Point(x, y), startupStyles.lineText);
    y += step(24);
    port.drawText(I18n.getString(761,'Computer advantage'),new pdg.Point(x,y),startupStyles.lineText);
    port.drawText(I18n.formatString(763,'Production: {0}%',100+pendingConfig.compAdvantage*20),
        new pdg.Point(panelX+panelWidth-34,y),startupStyles.advantageSummary);
    for(const choice of StartupSetup.advantageRegions(panelRect,pendingConfig)) {
        drawStartupRoundedRect(choice.rect,7,choice.active?startupStyles.advantageButtonActive:startupStyles.advantageButton);
        port.drawText(choice.label,new pdg.Point(choice.rect.x+choice.rect.width/2,choice.rect.y+step(19)),startupStyles.advantageText);
    }
    y += step(64);
    port.drawText(I18n.formatString(523, 'Map size: {0}', pendingConfig.getMapSizeDescription()), new pdg.Point(x, y), startupStyles.lineText);
    for(const choice of StartupSetup.sectorSizeRegions(panelRect,pendingConfig)) {
        drawStartupRoundedRect(choice.rect,7,choice.active?startupStyles.advantageButtonActive:startupStyles.advantageButton);
        port.drawText(choice.label,new pdg.Point(choice.rect.x+choice.rect.width/2,choice.rect.y+step(19)),startupStyles.advantageText);
    }
    y += step(64);
    port.drawText(pendingConfig.getDensityDescription(),new pdg.Point(x,y),startupStyles.lineText);
    for(const choice of StartupSetup.densityRegions(panelRect,pendingConfig)) {
        drawStartupRoundedRect(choice.rect,7,choice.active?startupStyles.advantageButtonActive:startupStyles.advantageButton);
        port.drawText(choice.label,new pdg.Point(choice.rect.x+choice.rect.width/2,choice.rect.y+step(19)),startupStyles.advantageText);
    }
    y += step(56);
    drawStartupCheckbox(StartupSetup.fastGameRegion(panelRect),I18n.getString(505,'Fast Game'),pendingConfig.fastGame,scale);
    drawStartupCheckbox(StartupSetup.fogOfWarRegion(panelRect),I18n.getString(508,'Fog of War'),!pendingConfig.omniscient,scale);
    y += step(36);
    port.drawText(I18n.getString(525, '<C> edit AI players   <1-5> AI skill'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(762,'<A> cycle computer advantage'),new pdg.Point(x,y),startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(526, '<S> map size   <D> star density'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(527, '<F> fast game   <O> fog/all visible   <R> defaults'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(42);

    if(!sessions.active){const open=StartupSetup.cancelRegion(panelRect);drawStartupRoundedRect(open,7,startupStyles.advantageButton);port.drawText(I18n.getString(841,'Open Game…'),new pdg.Point(open.x+open.width/2,open.y+step(20)),startupStyles.startText);}
    if(sessions.active){const cancel=StartupSetup.cancelRegion(panelRect);drawStartupRoundedRect(cancel,7,startupStyles.advantageButton);port.drawText(I18n.getString(683,'Cancel'),new pdg.Point(cancel.x+cancel.width/2,cancel.y+step(20)),startupStyles.startText);}
    const settings=StartupSetup.settingsRegion(panelRect);drawStartupRoundedRect(settings,7,startupStyles.advantageButton);drawStartupButtonCaption(settings,I18n.getString(759,'Settings'),startupStyles.startText,Math.max(9,14*scale));
    if(!tutorialSession){const tutorial=StartupSetup.tutorialRegion(panelRect);drawStartupRoundedRect(tutorial,7,startupStyles.advantageButton);drawStartupButtonCaption(tutorial,I18n.getString(960,'Tutorial'),startupStyles.startText,Math.max(9,14*scale));}
    drawStartupRoundedRect(StartupSetup.startRegion(panelRect),7,startupStyles.advantageButton);
    const start=StartupSetup.startRegion(panelRect),manual=StartupSetup.manualRegion(panelRect);
    drawStartupButtonCaption(start,I18n.getString(528,'<Enter> Start'),startupStyles.startText,Math.max(9,14*scale));
    drawStartupRoundedRect(manual,7,startupStyles.advantageButton);
    const label=I18n.getString(943,'User’s Manual');let size=Math.max(9,14*scale);
    while(size>9 && port.getTextWidth(label,size)>manual.width-16)size--;
    startupStyles.startText.textSize(size);port.drawText(label,new pdg.Point(manual.x+manual.width/2,manual.y+step(20)),startupStyles.startText);
}

function drawStartupControlHelp() {
    const area=port.getDrawingArea(),screen={width:area.width(),height:area.height()},point=startupHoverPoint;
    let regions=[],scope='setup';
    if (documents.dialog) {
        const layout=documents.layout(screen.width,screen.height);scope=documents.dialog.kind+':'+documents.dialog.operation;
        regions=layout.buttons.map(b=>({rect:b.rect,action:{type:b.action==='submit'?documents.dialog.operation==='open'?'open':'save':b.action}}));
        if(layout.field)regions.push({rect:layout.field,action:{type:documents.dialog.operation==='open'?'openFileName':'saveFileName'}});
    } else if (startupAISkill) {
        const layout=StartupSetup.skillMenu(screen.width,screen.height,pendingConfig);scope='skill';
        regions=layout.choices.map(r=>({rect:r.rect,action:{type:'startupSkill'}}));
        regions.push({rect:layout.cancel,action:{type:'cancel'}});
    } else if (startupComputerCount || startupGameTitle || startupPlayerName) {
        scope=startupComputerCount?'count':startupGameTitle?'title':'name';
        const layout=PlayerName.layout(screen.width,screen.height,I18n.getString(682,'Save'));
        regions=layout.buttons.map(b=>({rect:b.rect,action:{type:b.action==='cancel'?'cancel':'submit'}}));
        regions.push({rect:layout.field,action:{type:startupComputerCount?'startupCount':startupGameTitle?'startupTitle':'startupName'}});
    } else regions=StartupSetup.helpRegions(screen.width,screen.height,pendingConfig,!!sessions.active).filter(r=>r.action.type!=='startTutorial' || !tutorialSession);
    const hit=point && drawingPreferences.readControlHelp() && regions.find(({rect:r})=>
        point.x>=r.x && point.x<r.x+r.width && point.y>=r.y && point.y<r.y+r.height);
    const candidate=hit?{...hit,text:ControlHelp.describe(hit.action),key:scope+':'+hit.action.type+':'+hit.rect.x+':'+hit.rect.y}:null;
    const hint=startupHelp.sample(candidate,pdg.tm.getMilliseconds(),screen,text=>port.getTextWidth(text,11));
    if(!hint)return;
    require('./src/js/tooltip.js').draw(port,hint);
}

function handleStartupKey(key) {
    if(key===pdg.key_Help){userManual.open(pdg.res.getLanguage());return true;}
    startupHelp.clear();startupHoverPoint=null;
    if(startupAISkill) {
        if(key===pdg.key_Escape)startupAISkill=false;
        else if(typeof key==='number' && key>=49 && key<=53){StartupSetup.setSkill(pendingConfig,key-48);startupAISkill=false;}
        return true;
    }

    if(startupComputerCount) {
        const action=PlayerName.edit(startupComputerCount,key);
        if(action==='submit')submitComputerCount();
        if(action==='cancel')startupComputerCount=null;
        return true;
    }

    if(startupGameTitle) {
        const action=PlayerName.edit(startupGameTitle,key);
        if(action==='submit')submitGameTitle();
        if(action==='cancel')startupGameTitle=null;
        return true;
    }

    if(startupPlayerName) {
        const action=PlayerName.edit(startupPlayerName,key);
        if(action==='submit')submitPlayerName();
        if(action==='cancel')startupPlayerName=null;
        return true;
    }

    if(key===pdg.key_Escape && cancelNewGame())return true;

    const char = typeof key === 'number' ? String.fromCharCode(key) : '';
    const lower = char.toLowerCase();

    if (key === 13 || key === 10 || key === pdg.key_Tab) {
        beginPlayerName();
        return true;
    }

    if (char >= '1' && char <= '5') {
        StartupSetup.setSkill(pendingConfig,Number(char));
        return true;
    }

    switch (lower) {
        case 'a':
            return StartupSetup.cycleAdvantage(pendingConfig);
        case 'c':
            beginComputerCount();return true;
        case 's':
            StartupSetup.cycleSectorSize(pendingConfig);
            return true;
        case 'd':
            StartupSetup.cycleDensity(pendingConfig);
            return true;
        case 'f':
            StartupSetup.toggleFastGame(pendingConfig);
            return true;
        case 'o':
            StartupSetup.toggleFogOfWar(pendingConfig);
            return true;
        case 't':beginGameTitle();return true;
        case 'r':
            pendingConfig = createDefaultConfig();
            return true;
        case '+':
        case '=':
            StartupSetup.setComputerCount(pendingConfig,Math.min(99-pendingConfig.numHumans,pendingConfig.numComputers+1));return true;
        case '-':
            StartupSetup.setComputerCount(pendingConfig,Math.max(0,pendingConfig.numComputers-1));return true;
        default:
            return true;
    }
}

function clearSessionInput() {
    windowPlacement.end();
    if(display && display.mapCursor)display.mapCursor.set('default');
    isDragging=false;isLeftClickDragging=false;hasDragged=false;
    if(game){game.endUIWindowDrag();game.endMapScrollDrag();game.endUISliderDrag();}
}
// Both public launch controls share the same temporary tutorial document owner.
function beginTutorial(pages=require('./src/js/tutorial-lessons.js').load(dataPath),context={window:game && !sessions.starting?1:34,modal:sessions.starting}) {
    if(tutorialSession && tutorialSession.controller.active)return false;
    startupLifecycle.consume();
    const owner=new (require('./src/js/tutorial-session.js'))(pages,{
        sessions,sound,
        captureApplication:()=>({game,display,autoplayController,pendingConfig,startupPlayerName,startupGameTitle,startupComputerCount,startupAISkill}),
        suspendApplication:()=>{
            sound.stop();clearSessionInput();stopAutoplayTimer();game=null;display=null;autoplayController=null;
            pendingConfig=createDefaultConfig(false);pendingConfig.numHumans=1;pendingConfig.numComputers=2;refreshTotalPlayers(pendingConfig);
            startupPlayerName=null;startupGameTitle=null;startupComputerCount=null;startupAISkill=false;
        },
        restoreApplication:state=>{
            sound.stop();clearSessionInput();stopAutoplayTimer();
            ({game,display,autoplayController,pendingConfig,startupPlayerName,startupGameTitle,startupComputerCount,startupAISkill}=state);
            if(display){display.reloadUIStrings();display.onScreenSizeChanged();}
            if(!sessions.starting && autoplayController && autoplayController.getStatus().running)
                pdg.tm.startTimer(AUTOPLAY_TIMER_ID,game.config.autoplay.turnDelayMs,pdg.timer_Repeating);
        },
        installApplication:(nextGame,nextDisplay)=>{game=nextGame;display=nextDisplay;autoplayController=null;},
        onStop:()=>{clearSessionInput();if(tutorialSession===owner){tutorialSession=null;tutorialPanel=null;}}
    });
    tutorialSession=owner;
    tutorialPanel=new (require('./src/js/tutorial-panel.js'))(owner,{preferences:drawingPreferences,language:()=>LanguageSettings.current(),loadPages:code=>require('./src/js/tutorial-lessons.js').load(dataPath,code),context:()=>({window:game && !sessions.starting?1:startupPlayerName?4:34,modal:sessions.starting})});
    try{owner.start(context);}catch(error){tutorialSession=null;tutorialPanel=null;throw error;}
    return owner;
}

function tutorialPanelContext(){
    const area=port.getDrawingArea(),screen={width:area.width(),height:area.height()},targets=[];
    const foreground=foregroundApplicationWindow();if(foreground)targets.push(foreground.rect);
    if(display && game){
        const active=display.getActiveWindowRect();if(active)targets.push(active);
        if(game.overlay && game.overlay.type==='report')targets.push(display.getReportLayout(game.overlay).rect);
        if(game.overlay && game.overlay.type==='outcome')targets.push(display.getOutcomeLayout(game.overlay).rect);
        if(game.selectedObject){const inspector=display.getSelectedObjectPanelRect(game.selectedObject);if(inspector)targets.push(inspector);}
        for(const control of display.getContextButtonRegions())targets.push({...control.rect,interactive:true});
    }
    return {screen,measure:(text,size)=>port.getTextWidth(text,size),targets};
}
function drawTutorialPanel(){if(tutorialPanel){const c=tutorialPanelContext();tutorialPanel.draw(port,c.screen,c.targets);}}

function beginNewGame() {
    if(tutorialSession && tutorialSession.engaged)return tutorialSession.openSetup();
    sound.stop();
    if(!sessions.begin())return false;
    clearSessionInput();stopAutoplayTimer();
    pendingConfig=createDefaultConfig();
    startupPlayerName=null;startupGameTitle=null;startupComputerCount=null;startupAISkill=false;
    return true;
}
function resumeSession(session) {
    sound.stop();
    game=session.game;display=session.display;autoplayController=session.autoplay;
    game.showControlHelp=drawingPreferences.readControlHelp();display.clearControlHelp();
    display.reloadUIStrings();display.onScreenSizeChanged();
    if(autoplayController && autoplayController.getStatus().running)
        pdg.tm.startTimer(AUTOPLAY_TIMER_ID,game.config.autoplay.turnDelayMs,pdg.timer_Repeating);
}
function cancelNewGame() {
    if(!sessions.cancel())return false;
    startupPlayerName=null;startupGameTitle=null;startupComputerCount=null;startupAISkill=false;
    resumeSession(sessions.active);return true;
}
function switchGameSession(id) {
    if(sessions.starting || sessions.transient || !sessions.sessions.some(session=>session.id===id))return false;
    clearSessionInput();stopAutoplayTimer();
    const session=sessions.select(id);game.uiWindow=null;resumeSession(session);game.uiWindow=null;
    return true;
}

function attachGameServices(nextGame) {
    nextGame.languagePreferences = languagePreferences;
    nextGame.drawingPreferences = drawingPreferences;
    nextGame.newGameDefaultsPreferences=newGameDefaultsPreferences;
    nextGame.colonyDefaultsPreferences=colonyDefaultsPreferences;
    ColonyPreferences.apply(nextGame,colonyDefaultsPreferences);
    nextGame.sound=sound;
    nextGame.showControlHelp=drawingPreferences.readControlHelp();
    nextGame.systemComparisonPreferences = systemComparisonPreferences;
    nextGame.systemComparisonSort = systemComparisonPreferences.read();
    nextGame.systemComparisonGeometry = systemComparisonPreferences.readGeometry();
    nextGame.rosterPreferences = rosterPreferences;
    nextGame.fleetRosterSort = rosterPreferences.read();
    nextGame.fleetRosterGeometry = rosterPreferences.readGeometry();
    nextGame.fullscreen = fullscreen;
    nextGame.presentation=presentation;nextGame.openAbout=openAbout;
    if(!nextGame.restoredFromSave)nextGame.showEnemyEvents=drawingPreferences.readEnemyEvents();
    if(!nextGame.restoredFromSave)nextGame.showGrid = drawingPreferences.readGrid();
    if(!nextGame.restoredFromSave)nextGame.showNebula = drawingPreferences.readNebula();
    if(!nextGame.restoredFromSave)nextGame.showShips = drawingPreferences.readShips();
    if(!nextGame.restoredFromSave)nextGame.showAllCourses = drawingPreferences.readAllCourses();
    if(!nextGame.restoredFromSave)nextGame.showScannerRanges = drawingPreferences.readScannerRanges();
    if(!nextGame.restoredFromSave)nextGame.showCourierCourses = drawingPreferences.readCourierCourses();
    if(!nextGame.restoredFromSave)nextGame.showMapNames = drawingPreferences.readMapNames();
    nextGame.port = port;
    nextGame.manualCommands=userManual;
    nextGame.tutorialCommands={available:()=>!tutorialSession,start:()=>{nextGame.uiWindow=null;return beginTutorial();}};
    nextGame.fileCommands={menu:()=>{clearSessionInput();return documents.menu();}};
    nextGame.sessionCommands={begin:beginNewGame,rows:()=>sessions.rows(),select:switchGameSession};
}
function installSavedGame(nextGame,reference) {
    attachGameServices(nextGame);const nextDisplay=new Display(nextGame);
    clearSessionInput();stopAutoplayTimer();
    if(tutorialSession && tutorialSession.runtime){
        if(!tutorialSession.open(nextGame,nextDisplay,reference))throw new Error('Tutorial document could not be opened');
        return;
    }
    if(!sessions.starting)sessions.begin();
    const session=sessions.accept(nextGame,nextDisplay);session.file=reference;
    game=nextGame;display=nextDisplay;autoplayController=null;
    startupPlayerName=null;startupGameTitle=null;startupComputerCount=null;startupAISkill=false;
}
function revertSavedGame(nextGame,reference) {
    attachGameServices(nextGame);const nextDisplay=new Display(nextGame),previous=display;
    clearSessionInput();stopAutoplayTimer();
    if(tutorialSession && tutorialSession.runtime){
        if(!tutorialSession.revert(nextGame,nextDisplay,reference))throw new Error('Tutorial document could not be reverted');
        return;
    }
    const session=sessions.replace(nextGame,nextDisplay);session.file=reference;
    game=nextGame;display=nextDisplay;autoplayController=null;if(previous)previous.dispose();
}
function drawManualFailure() {
    const area=port.getDrawingArea(),layout=userManual.layout(area.width(),area.height(),text=>port.getTextWidth(text,13)),r=layout.rect;
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),startupStyles.dim);
    PanelAppearance.applySystemSurface(startupStyles.panel,r);drawStartupRoundedRect(r,14,startupStyles.panel);
    startupStyles.subtitleText.textSize(16);startupStyles.lineText.textSize(13);startupStyles.startText.textSize(13);
    port.drawText(I18n.getString(943),new pdg.Point(r.x+r.width/2,r.y+32),startupStyles.subtitleText);
    layout.lines.forEach((line,index)=>port.drawText(line,new pdg.Point(r.x+24,r.y+60+index*18),startupStyles.lineText));
    drawStartupRoundedRect(layout.button,7,startupStyles.advantageButton);
    port.drawText(I18n.getString(834),new pdg.Point(layout.button.x+layout.button.width/2,layout.button.y+20),startupStyles.startText);
}

function drawDocumentDialog() {
    const dialog=documents.dialog;if(!dialog)return;
    if(dialog.kind==='editor') {
        drawStartupTextDialog(dialog.editor,{title:I18n.getString(dialog.operation==='save'?840:841),prompt:I18n.getString(documents.files.browser?844:843),error:dialog.error?I18n.getString(dialog.operation==='save'?845:846):'',submit:I18n.getString(dialog.operation==='save'?839:841),dim:!!game});return;
    }
    const area=port.getDrawingArea(),layout=documents.layout(area.width(),area.height()),r=layout.rect;
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),startupStyles.dim);
    PanelAppearance.applySystemSurface(startupStyles.panel,r);drawStartupRoundedRect(r,14,startupStyles.panel);
    startupStyles.subtitleText.textSize(16);startupStyles.lineText.textSize(13);startupStyles.advantageText.textSize(13);
    port.drawText(layout.title,new pdg.Point(r.x+r.width/2,r.y+34),startupStyles.subtitleText);
    if(layout.message) {
        const lines=[];let remaining=Array.from(layout.message);
        while(remaining.length) {
            let count=remaining.length;
            while(count>1 && port.getTextWidth(remaining.slice(0,count).join(''),13)>r.width-48)count--;
            if(count<remaining.length) {
                let boundary=count;
                while(boundary>0 && !/\s/.test(remaining[boundary]))boundary--;
                if(boundary>0)count=boundary;
            }
            lines.push(remaining.splice(0,count).join('').trim());
            while(remaining.length && /\s/.test(remaining[0]))remaining.shift();
        }
        lines.slice(0,8).forEach((line,index)=>port.drawText(line,new pdg.Point(r.x+24,r.y+78+index*19),startupStyles.lineText));
    }
    layout.buttons.forEach(button=>{drawStartupRoundedRect(button.rect,7,startupStyles.advantageButton);drawStartupButtonCaption(button.rect,button.label,startupStyles.advantageText,13);});
}

function startGame() {
    if (!sessions.starting) {
        return false;
    }
    refreshTotalPlayers(pendingConfig);

    const errors = pendingConfig.validate();
    if (errors.length > 0) {
        console.error("Invalid startup configuration:", errors);
        pendingConfig = createDefaultConfig();
        return false;
    }

    if(tutorialSession && tutorialSession.engaged){
        const owner=tutorialSession;
        try{
            const fixture=JSON.parse(require('fs').readFileSync(path.join(dataPath,'tutorial/galaxy.json'),'utf8'));
            const nextGame=require('./src/js/tutorial-game.js').createTutorialGame(fixture,{gameTitle:I18n.getString(960),playerName:pendingConfig.humanPlayerNames[1]});
            attachGameServices(nextGame);const nextDisplay=new Display(nextGame);
            const accepted=owner.install(nextGame,nextDisplay);if(!accepted)nextDisplay.dispose();return !!accepted;
        }catch(error){owner.stop('error');throw error;}
    }
    const factory = new Factory();
    const rules = new Rules(pendingConfig.fastGame);
    const nextGame = new Game(factory, rules, pendingConfig);
    attachGameServices(nextGame);
    const nextDisplay = new Display(nextGame);
    sessions.accept(nextGame,nextDisplay);
    game=nextGame;display=nextDisplay;
    autoplayController=null;
    nextGame.sessionCommands={begin:beginNewGame,rows:()=>sessions.rows(),select:switchGameSession};
    if (pendingConfig.numHumans === 0 && display) {
        display.zoomToFit();
    }
    nextGame.recordEvent(
        I18n.getString(601, 'Startup'),
        I18n.formatString(511, 'Game started: {0}', pendingConfig.getDescription()),
        { type: 'system' }
    );
    console.log("Game created and window opened");
    return true;
}

function startAutoplay() {
    if (!game || !launchOptions.aiAutoplay || autoplayController) {
        return;
    }

    autoplayController = new Autoplay.AutoplayController(game, {
        maxTurns: pendingConfig.autoplay.maxTurns,
        eventPresentationMs: pendingConfig.autoplay.eventPresentationMs
    });
    sessions.active.autoplay=autoplayController;
    game.recordEvent(
        I18n.getString(601, 'Startup'),
        I18n.formatString(643, 'AI autoplay started with seed {0} and {1} ms delay', randomSeed, pendingConfig.autoplay.turnDelayMs),
        { type: 'autoplay' }
    );
    console.log(`AI autoplay started with seed ${randomSeed}; delay ${pendingConfig.autoplay.turnDelayMs} ms; max turns ${pendingConfig.autoplay.maxTurns}`);
    pdg.tm.startTimer(AUTOPLAY_TIMER_ID, pendingConfig.autoplay.turnDelayMs, pdg.timer_Repeating);
}

function stopAutoplayTimer() {
    if (autoplayController) {
        pdg.tm.cancelTimer(AUTOPLAY_TIMER_ID);
        const status = autoplayController.getStatus();
        if (status.stopReason === 'gameOver' && game && game.winningPlayerNum) {
            const winner = game.players[game.winningPlayerNum];
            const winnerName = winner && winner.name ? winner.name : `${I18n.getString(18, 'Player')} ${game.winningPlayerNum}`;
            console.log(I18n.formatString(644, '{0} wins on turn {1}', winnerName, game.victoryTurn));
        } else if (status.stopReason === 'gameOver' && game) {
            console.log(I18n.formatString(652, 'No players remain on turn {0}', game.victoryTurn));
        } else if (status.stopReason === 'maxTurns') {
            console.log(I18n.formatString(645, 'AI autoplay stopped after {0} turns with no winner', status.turnsRun));
        }
    }
}

if (launchOptions.aiAutoplay) {
    console.log("Window opened; starting AI autoplay observer");
} else {
    console.log("Window opened; showing startup dialog");
}

// Create event handlers using the correct PDG syntax
const drawHandler = new pdg.IEventHandler(function(event) {
    if(startupSettings.active){if(game && !sessions.starting)game.draw();else drawStartupDialog();startupSettings.draw();return true;}
    if(userManual.error()){if(game && !sessions.starting)game.draw();else drawStartupDialog();drawManualFailure();return true;}
    if(documents.dialog){if(game && !sessions.starting){game.display.clearControlHelp();game.draw();}else drawStartupDialog();drawDocumentDialog();drawStartupControlHelp();return true;}
    if (!sessions.starting && game) {
        game.draw();
    } else {
        drawStartupDialog();
        drawStartupControlHelp();
    }
    drawTutorialPanel();
    return true;
});

const autoplayTimerHandler = new pdg.IEventHandler(function(event) {
    if (!autoplayController || !event || event.id !== AUTOPLAY_TIMER_ID) {
        return false;
    }

    if(startupSettings.active || userManual.error() || documents.dialog || sessions.starting || !sessions.active || sessions.active.autoplay!==autoplayController)return true;
    const status = autoplayController.step();
    if (!status.running) {
        stopAutoplayTimer();
    }
    return true;
});

// Global variables for drag scrolling
let isDragging = false;
let isLeftClickDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let leftClickStartX = 0;
let leftClickStartY = 0;
let hasDragged = false; // Track if user has dragged during left click

const mouseHandler = new pdg.IEventHandler(function(event) {
    startupHelp.clear();startupHoverPoint=null;
    if(startupSettings.active)return startupSettings.mouse(event);
    if(game && game.display)game.display.clearControlHelp();
    if(event && event.eventType===pdg.eventType_MouseUp && windowPlacement.end(event.mousePos.x,event.mousePos.y))return true;
    if(event && event.eventType===pdg.eventType_MouseUp && event.buttonNumber===0 && tutorialPointerCapture){tutorialPointerCapture=false;if(tutorialPanel)tutorialPanel.mouseUp(event.mousePos.x,event.mousePos.y);return true;}
    if(tutorialPanel && !userManual.error() && !documents.dialog && event){
        const p=event.mousePos;
        if(event.eventType===pdg.eventType_MouseUp && tutorialPanel.mouseUp(p.x,p.y))return true;
        if(event.eventType===pdg.eventType_MouseDown && event.buttonNumber===0){const c=tutorialPanelContext();if(tutorialPanel.mouseDown(p.x,p.y,c.screen,c.measure,c.targets)){tutorialPointerCapture=true;return true;}}
    }
    const foreground=foregroundApplicationWindow();
    if(foreground && event && event.eventType===pdg.eventType_MouseDown){
        const area=port.getDrawingArea(),p=event.mousePos;
        if(event.buttonNumber===0 && windowPlacement.begin(foreground.name,foreground.rect,p.x,p.y,{width:area.width(),height:area.height()}))return true;
        if(p.x<foreground.rect.x || p.x>foreground.rect.x+foreground.rect.width || p.y<foreground.rect.y || p.y>foreground.rect.y+foreground.rect.height){sound.play(1012);return true;}
    }
    if(userManual.error()) {
        if(event && event.eventType===pdg.eventType_MouseDown && event.buttonNumber===0) {
            const area=port.getDrawingArea(),r=userManual.layout(area.width(),area.height(),text=>port.getTextWidth(text,13)).button,p=event.mousePos;
            if(p.x>=r.x && p.x<r.x+r.width && p.y>=r.y && p.y<r.y+r.height)userManual.clearError();
        }return true;
    }
    if(documents.dialog){
        if(event && event.eventType===pdg.eventType_MouseDown && event.buttonNumber===0){const area=port.getDrawingArea(),layout=documents.layout(area.width(),area.height()),p=event.mousePos;
            const contains=r=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;const button=layout.buttons.find(b=>contains(b.rect));
            if(button)documents.action(button.action==='cancel'?'cancel':button.action);else if(layout.field&&contains(layout.field))documents.dialog.editor.selected=true;
        }return true;
    }
    if (sessions.starting || !game) {
        if(event && event.eventType===pdg.eventType_MouseDown && event.buttonNumber===0) {
            const area=port.getDrawingArea();
            if(startupAISkill) {
                const layout=StartupSetup.skillMenu(area.width(),area.height(),pendingConfig),x=event.mousePos.x,y=event.mousePos.y;
                const contains=r=>x>=r.x && x<=r.x+r.width && y>=r.y && y<=r.y+r.height;
                const choice=layout.choices.find(choice=>contains(choice.rect));
                if(choice){StartupSetup.setSkill(pendingConfig,choice.value);startupAISkill=false;}
                else if(contains(layout.cancel) || !contains(layout.rect))startupAISkill=false;
                return true;
            }
            if(startupComputerCount || startupGameTitle || startupPlayerName) {
                const count=!!startupComputerCount,title=!!startupGameTitle,editor=startupComputerCount || startupGameTitle || startupPlayerName;
                const layout=PlayerName.layout(area.width(),area.height()),x=event.mousePos.x,y=event.mousePos.y;
                const contains=r=>x>=r.x && x<=r.x+r.width && y>=r.y && y<=r.y+r.height;
                const button=layout.buttons.find(button=>contains(button.rect));
                if(button && button.action==='submit'){if(count)submitComputerCount();else if(title)submitGameTitle();else submitPlayerName();}
                else if(button && button.action==='cancel'){if(count)startupComputerCount=null;else if(title)startupGameTitle=null;else startupPlayerName=null;}
                else if(contains(layout.field)){editor.selected=true;editor.caret=Array.from(editor.text).length;}
                return true;
            }
            const settings=StartupSetup.settingsRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=settings.x && event.mousePos.x<settings.x+settings.width && event.mousePos.y>=settings.y && event.mousePos.y<settings.y+settings.height){startupSettings.open();return true;}
            const tutorial=StartupSetup.tutorialRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(!tutorialSession && event.mousePos.x>=tutorial.x && event.mousePos.x<tutorial.x+tutorial.width && event.mousePos.y>=tutorial.y && event.mousePos.y<tutorial.y+tutorial.height){beginTutorial();return true;}
            const manual=StartupSetup.manualRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=manual.x && event.mousePos.x<manual.x+manual.width && event.mousePos.y>=manual.y && event.mousePos.y<manual.y+manual.height){userManual.open(pdg.res.getLanguage());return true;}
            const cancel=StartupSetup.cancelRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(!sessions.active && event.mousePos.x>=cancel.x && event.mousePos.x<=cancel.x+cancel.width && event.mousePos.y>=cancel.y && event.mousePos.y<=cancel.y+cancel.height){documents.beginOpen();return true;}
            if(sessions.active && event.mousePos.x>=cancel.x && event.mousePos.x<=cancel.x+cancel.width && event.mousePos.y>=cancel.y && event.mousePos.y<=cancel.y+cancel.height){cancelNewGame();return true;}
            const fast=StartupSetup.fastGameRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=fast.x && event.mousePos.x<=fast.x+fast.width && event.mousePos.y>=fast.y && event.mousePos.y<=fast.y+fast.height){StartupSetup.toggleFastGame(pendingConfig);return true;}
            const fog=StartupSetup.fogOfWarRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=fog.x && event.mousePos.x<=fog.x+fog.width && event.mousePos.y>=fog.y && event.mousePos.y<=fog.y+fog.height){StartupSetup.toggleFogOfWar(pendingConfig);return true;}
            const skill=StartupSetup.skillRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=skill.x && event.mousePos.x<=skill.x+skill.width && event.mousePos.y>=skill.y && event.mousePos.y<=skill.y+skill.height){startupAISkill=true;return true;}
            const count=StartupSetup.computerCountRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=count.x && event.mousePos.x<=count.x+count.width && event.mousePos.y>=count.y && event.mousePos.y<=count.y+count.height){beginComputerCount();return true;}
            const title=StartupSetup.titleRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=title.x && event.mousePos.x<=title.x+title.width && event.mousePos.y>=title.y && event.mousePos.y<=title.y+title.height){beginGameTitle();return true;}
            const start=StartupSetup.startRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=start.x && event.mousePos.x<=start.x+start.width && event.mousePos.y>=start.y && event.mousePos.y<=start.y+start.height){beginPlayerName();return true;}
            StartupSetup.clickAdvantage(pendingConfig,StartupSetup.panelRect(area.width(),area.height()),event.mousePos.x,event.mousePos.y);
            StartupSetup.clickDensity(pendingConfig,StartupSetup.panelRect(area.width(),area.height()),event.mousePos.x,event.mousePos.y);
            StartupSetup.clickSectorSize(pendingConfig,StartupSetup.panelRect(area.width(),area.height()),event.mousePos.x,event.mousePos.y);
        }
        return true;
    }
    // Message dialogs are modal above map and table drag handlers.
    if(game.overlay && ['outcome','report'].includes(game.overlay.type) && event && event.eventType===pdg.eventType_MouseDown) {
        isDragging=false;isLeftClickDragging=false;hasDragged=false;
        if(event.buttonNumber===0 && !game.beginUIWindowDrag(event.mousePos.x,event.mousePos.y))game.handleUIClick(event.mousePos.x,event.mousePos.y);
        return true;
    }
    // Check if this is a mouse down event
    if (event && event.eventType === pdg.eventType_MouseDown) {
        if(require('./src/js/window-behavior.js').isSystem(game.uiWindow) && event.buttonNumber!==0){if(game.sound)game.sound.play(1012);return true;}
        if(game.uiWindow==='mapPick' && event.buttonNumber!==0)return true;
        // Check which button was pressed
        // PDG uses buttonNumber: 0=left, 1=right, 2=middle
        if (event.buttonNumber === 0) {
            game.display.setHoverPoint(event.mousePos.x, event.mousePos.y);
            if (game.beginUIWindowDrag(event.mousePos.x,event.mousePos.y) || game.beginMapScrollDrag(event.mousePos.x,event.mousePos.y) || game.beginUISliderDrag(event.mousePos.x,event.mousePos.y)) {
                isDragging = false;
                isLeftClickDragging = false;
                return true;
            }
            if (game.handleUIClick(event.mousePos.x, event.mousePos.y)) {
                return true;
            }

            // v3 Option-drag pans over objects without selecting or issuing orders.
            if(event.alt) {
                isLeftClickDragging=true;
                hasDragged=true;
                lastMouseX=event.mousePos.x;
                lastMouseY=event.mousePos.y;
                return true;
            }

            if (game.isAwaitingMapTarget && game.isAwaitingMapTarget()) {
                game.handleMouseClick(event.mousePos.x, event.mousePos.y);
                return true;
            }

            if(event.ctrl) {game.handleMouseClick(event.mousePos.x,event.mousePos.y,{forcePicker:true});return true;}

            // Left click - check if it's on an entity or empty space
            const clickedObject = game.findObjectAtPosition(event.mousePos.x, event.mousePos.y);
            if (clickedObject) {
                // Clicked on an entity - handle normally
                game.handleMouseClick(event.mousePos.x, event.mousePos.y);
            } else {
                // Clicked on empty space - start drag scrolling
                isLeftClickDragging = true;
                lastMouseX = event.mousePos.x;
                lastMouseY = event.mousePos.y;
                leftClickStartX = event.mousePos.x;
                leftClickStartY = event.mousePos.y;
                hasDragged = false; // Reset drag tracking
            }
        } else if (event.buttonNumber === 1) {
            game.handleMouseRightClick(event.mousePos.x, event.mousePos.y);
        } else if (event.buttonNumber === 2) {
            // Middle mouse button - start drag scrolling
            isDragging = true;
            lastMouseX = event.mousePos.x;
            lastMouseY = event.mousePos.y;
        }
    } else if (event && event.eventType === pdg.eventType_MouseUp) {
        if (event.buttonNumber === 0) {
            if (game.endUIWindowDrag(event.mousePos.x,event.mousePos.y) || game.endMapScrollDrag(event.mousePos.x,event.mousePos.y) || game.endUISliderDrag(event.mousePos.x,event.mousePos.y)) {
                isLeftClickDragging = false;
                return true;
            }
            // Left mouse button released - stop left click drag scrolling
            if (isLeftClickDragging && !hasDragged) {
                // Clicked and released without dragging - clear selection
                game.selectedObject = null;
                game.display.setSelectedObject(null);
            }
            isLeftClickDragging = false;
        } else if (event.buttonNumber === 2) {
            // Middle mouse button released - stop drag scrolling
            isDragging = false;
        }
    }
    return true;
});

// Mouse wheel handler for zooming
const mouseWheelHandler = new pdg.IEventHandler(function(event) {
    if(startupSettings.active)return true;
    if(tutorialPanel && !userManual.error() && !documents.dialog && event && event.eventType===pdg.eventType_ScrollWheel){
        const p=pdg.gfx.getMouse(),c=tutorialPanelContext();if(tutorialPanel.wheel(p.x,p.y,event.vertDelta || 0,c.screen,c.measure,c.targets))return true;
    }
    if(userManual.error() || documents.dialog)return true;
    if (sessions.starting || !game) {
        return true;
    }
    if (event && event.eventType === pdg.eventType_ScrollWheel) {
        if(require('./src/js/window-behavior.js').isSystem(game.uiWindow) || game.uiWindow==='mapPick' || game.overlay && ['outcome','report'].includes(game.overlay.type))return true;
        const delta = event.vertDelta || 0;
        if (delta < 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomIn(1.2, mousePos.x, mousePos.y);
        } else if (delta > 0) {
            // Get current mouse position for zoom target
            const mousePos = pdg.gfx.getMouse();
            game.display.zoomOut(1.2, mousePos.x, mousePos.y);
        }
    }
    return true;
});

// Mouse move handler for drag scrolling
const mouseMoveHandler = new pdg.IEventHandler(function(event) {
    if(startupSettings.active)return startupSettings.move(event);
    if(tutorialPointerCapture && event && event.eventType===pdg.eventType_MouseMove && event.leftButton===false)tutorialPointerCapture=false;
    if(tutorialPanel && event && event.eventType===pdg.eventType_MouseMove && tutorialPanel.mouseMove(event.mousePos.x,event.mousePos.y,event.leftButton))return true;
    if(event && event.eventType===pdg.eventType_MouseMove && windowPlacement.drag){
        if(event.leftButton===false)windowPlacement.end();else windowPlacement.move(event.mousePos.x,event.mousePos.y);return true;
    }
    if(userManual.error() || documents.dialog || sessions.starting || !game) {
        if(event && event.eventType===pdg.eventType_MouseMove)startupHoverPoint={x:event.mousePos.x,y:event.mousePos.y};
        return true;
    }
    if (event && event.eventType === pdg.eventType_MouseMove) {
        game.display.setHoverPoint(event.mousePos.x, event.mousePos.y);
        if(game.overlay && ['outcome','report'].includes(game.overlay.type) && !game.uiWindowDrag){isDragging=false;isLeftClickDragging=false;return true;}
        // Recover if the button was released outside the game window.
        if(game.uiWindowDrag && event.leftButton===false){game.endUIWindowDrag();return true;}
        if(game.updateUIWindowDrag(event.mousePos.x,event.mousePos.y))return true;
        if(['games','fleets','systemComparison','comparison'].includes(game.uiWindow)) {
            game.endMapScrollDrag();game.endUISliderDrag();
            isDragging=false;isLeftClickDragging=false;return true;
        }
        if(game.uiMapScrollDrag && event.leftButton===false) {game.endMapScrollDrag();return true;}
        if(game.updateMapScrollDrag(event.mousePos.x,event.mousePos.y))return true;
        if (game.uiSliderDrag && event.leftButton===false) {
            game.endUISliderDrag();
            return true;
        }
        if (game.updateUISliderDrag(event.mousePos.x,event.mousePos.y)) return true;
        if (isDragging || isLeftClickDragging) {
            game.display.clearControlHelp();
            const deltaX = event.mousePos.x - lastMouseX;
            const deltaY = event.mousePos.y - lastMouseY;
            
            // Check if we've moved enough to consider it a drag (threshold of 3 pixels)
            const dragThreshold = 3;
            if (isLeftClickDragging && !hasDragged) {
                const totalDeltaX = event.mousePos.x - leftClickStartX;
                const totalDeltaY = event.mousePos.y - leftClickStartY;
                const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
                if (totalDistance > dragThreshold) {
                    hasDragged = true;
                }
            }
            
            // Only pan if we've actually dragged
            if (hasDragged || isDragging) {
                // Pass screen coordinate deltas directly to the camera
                // The camera will handle the conversion to galactic coordinates
                game.display.pan(-deltaX, -deltaY);
            }
        }
        
        lastMouseX = event.mousePos.x;
        lastMouseY = event.mousePos.y;
    }
    return true;
});

const keyHandler = new pdg.IEventHandler(function(event) {
    if(startupSettings.active){if(event && event.eventType===pdg.eventType_KeyPress){startupSettings.key(event.unicode);if(!startupSettings.active && game)game.display.reloadUIStrings();}return true;}
    if(windowPlacement.drag && event && event.eventType===pdg.eventType_KeyPress && event.unicode===pdg.key_Escape){windowPlacement.end();return true;}
    if(event && event.eventType===pdg.eventType_KeyPress){startupHelp.clear();startupHoverPoint=null;}
    if(userManual.error()){if(event && event.eventType===pdg.eventType_KeyPress && [pdg.key_Escape,13,3,32].includes(event.unicode))userManual.clearError();return true;}
    if(event && event.eventType===pdg.eventType_KeyPress && event.unicode===pdg.key_Help){userManual.open(pdg.res.getLanguage());return true;}
    if(documents.dialog){if(event && event.eventType===pdg.eventType_KeyPress)documents.key(event.unicode);return true;}
    // Check if this is a key press event
    if (event && event.eventType === pdg.eventType_KeyPress) {
        if (!sessions.starting && game) {
            game.handleKeyPress(event.unicode);
        } else {
            handleStartupKey(event.unicode);
        }
    }
    return true;
});

// Port resize handler to update camera scale and offsets immediately
const portResizeHandler = new pdg.IEventHandler(function(event) {
    if (event && event.eventType === pdg.eventType_PortResized) {
        // Update camera scale and offsets immediately when port is resized
        if (game && game.display) {
            game.display.onScreenSizeChanged();
        }
    }
    return true;
});

// Register event handlers
pdg.evt.addHandler(drawHandler, pdg.eventType_PortDraw);
pdg.evt.addHandler(mouseHandler, pdg.eventType_MouseDown);
pdg.evt.addHandler(mouseHandler, pdg.eventType_MouseUp);
pdg.evt.addHandler(mouseWheelHandler, pdg.eventType_ScrollWheel);
pdg.evt.addHandler(mouseMoveHandler, pdg.eventType_MouseMove);
pdg.evt.addHandler(keyHandler, pdg.eventType_KeyPress);
pdg.evt.addHandler(portResizeHandler, pdg.eventType_PortResized);
pdg.evt.addHandler(autoplayTimerHandler, pdg.eventType_Timer);

if (launchOptions.aiAutoplay) {
    startGame();
    startAutoplay();
}

console.log("Event handlers registered, starting PDG...");

// Start PDG
pdg.run();

// Present the introduction once per interactive launch, independently of saved games.
if(!launchOptions.aiAutoplay){
    if(presentation.showSplash)startupSettings.open('startup');
    startupLifecycle.start(presentation.showSplash);
}
