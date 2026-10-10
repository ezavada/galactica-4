// Galactica-4 PDG Game - Main Entry Point
// Run with: ./gad4
// Optional: ./gad4 -- --lang=es (for Spanish)
// AI autoplay observer: ./gad4 -- --ai-autoplay

const pdg = require('pdg');
const PanelAppearance = require('./src/js/panel-appearance.js');
globalThis.pdg = pdg;

console.log("=== Galactica-4 PDG Game Starting ===");

// Open the data directory as a resource path (for strings.txt and strings-*.txt files)
// This tells the ResourceManager where to look for localized string files
const path = require('path');
const dataPath = path.join(__dirname, 'data');
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
const PlayerName=require('./src/js/player-name.js');
const playerNamePreferences=PlayerName.createPreferences();
const rosterPreferences = require('./src/js/roster-preferences.js').createPreferences();
const systemComparisonPreferences = require('./src/js/roster-preferences.js').createPreferences(globalThis, {
    prefix:'systemComparison', minimumHeight:176, keys:['name','tech','population','production','buildName','completion',
        'totalDefense','satelliteDefense','shipDefense']
});
const drawingPreferences = require('./src/js/drawing-preferences.js').createPreferences();
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
const fullscreen = require('./src/js/fullscreen.js').createController(pdg,port);

function createDefaultConfig() {
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

// Startup dialog drawing uses Attributes like CSS classes: define once, reuse at draw sites.
const startupStyles = {
    checkboxMark:createStartupAttributes({lineColor:new pdg.Color('white')}),
    background: createStartupAttributes({ fillColor: startupUIColor('background') }),
    panel: createStartupAttributes({
        fillColor: startupUIColor('panelFill'),
        lineColor: startupUIColor('panelBorder')
    }),
    divider: createStartupAttributes({ lineColor: startupUIColor('divider') }),
    titleText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 24,
        textStyle: pdg.textStyle_Centered
    }),
    subtitleText: createStartupAttributes({
        fillColor: startupUIColor('textMuted'),
        textSize: 13,
        textStyle: pdg.textStyle_Centered
    }),
    lineText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 13,
        textStyle: pdg.textStyle_Plain
    }),
    hintText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
        textSize: 12,
        textStyle: pdg.textStyle_Plain
    }),
    advantageButton: createStartupAttributes({fillColor:new pdg.Color(0.16,0.21,0.27,0.98),lineColor:new pdg.Color(0.45,0.58,0.68,0.65)}),
    advantageButtonActive: createStartupAttributes({fillColor:new pdg.Color(0.24,0.35,0.42,1),lineColor:new pdg.Color(0.55,0.68,0.78,0.8)}),
    advantageText: createStartupAttributes({fillColor:startupUIColor('textLight'),textSize:13,textStyle:pdg.textStyle_Centered}),
    advantageSummary: createStartupAttributes({fillColor:startupUIColor('textMuted'),textSize:12,textStyle:pdg.textStyle_RightJustified}),
    startText: createStartupAttributes({
        fillColor: startupUIColor('textLight'),
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
}

function drawStartupDivider(x, y, width) {
    port.drawLine(new pdg.Point(x, y), new pdg.Point(x + width, y), startupStyles.divider);
}

function beginPlayerName() {
    if(pendingConfig.numHumans===0){startGame();return;}
    startupPlayerName=PlayerName.createEditor(pendingConfig.humanPlayerNames[1] || playerNamePreferences.read() || I18n.getString(17,'You'));
}

function submitPlayerName() {
    if(!startupPlayerName)return;
    const name=startupPlayerName.text.trim();
    if(!PlayerName.validName(name)){startupPlayerName.error=true;return;}
    pendingConfig.humanPlayerNames[1]=name;
    startGame();
    if(game){playerNamePreferences.write(name);startupPlayerName=null;}
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
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),startupStyles.background);
    PanelAppearance.applySurface(startupStyles.panel,rect,startupUIColor('panelFill'));drawStartupRoundedRect(rect,14,startupStyles.panel);
    startupStyles.subtitleText.textSize(16);startupStyles.lineText.textSize(14);startupStyles.hintText.textSize(12);startupStyles.advantageText.textSize(13);
    port.drawText(labels.title,new pdg.Point(rect.x+rect.width/2,rect.y+40),startupStyles.subtitleText);
    port.drawText(labels.prompt,new pdg.Point(rect.x+24,rect.y+78),startupStyles.lineText);
    drawStartupRoundedRect(field,6,startupStyles.advantageButton);
    const visible=PlayerName.visibleText(editor,field.width-24,text=>port.getTextWidth(text,14));
    if(editor.selected)drawStartupRoundedRect({x:field.x+9,y:field.y+5,width:Math.min(field.width-18,port.getTextWidth(visible.text,14)+6),height:26},3,startupStyles.advantageButtonActive);
    port.drawText(visible.text,new pdg.Point(field.x+12,field.y+24),startupStyles.lineText);
    if(!editor.selected)port.drawLine(new pdg.Point(field.x+12+visible.caret,field.y+7),new pdg.Point(field.x+12+visible.caret,field.y+28),startupStyles.divider);
    port.drawText(editor.error?labels.error:'',new pdg.Point(rect.x+24,rect.y+178),startupStyles.hintText);
    for(const button of layout.buttons){drawStartupRoundedRect(button.rect,7,startupStyles.advantageButton);port.drawText(button.label,new pdg.Point(button.rect.x+button.rect.width/2,button.rect.y+20),startupStyles.advantageText);}
}

function drawStartupSkillMenu() {
    const area=port.getDrawingArea(),layout=StartupSetup.skillMenu(area.width(),area.height(),pendingConfig),rect=layout.rect;
    port.drawRect(new pdg.Rect(0,0,area.width(),area.height()),startupStyles.background);
    PanelAppearance.applySurface(startupStyles.panel,rect,startupUIColor('panelFill'));drawStartupRoundedRect(rect,14,startupStyles.panel);
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
    PanelAppearance.applySurface(startupStyles.panel,panelRect,startupUIColor('panelFill'));
    drawStartupRoundedRect(panelRect, 14, startupStyles.panel);

    port.drawText(I18n.getString(568, 'Galactica-4'), new pdg.Point(screenWidth / 2, panelY + step(44)), startupStyles.titleText);
    const titleRect=StartupSetup.titleRegion(panelRect),titleLabel=I18n.formatString(828,'Title: {0} <T>',pendingConfig.gameTitle);
    drawStartupRoundedRect(titleRect,6,startupStyles.advantageButton);
    let titleSize=Math.max(9,13*scale);
    while(titleSize>9 && port.getTextWidth(titleLabel,titleSize)>titleRect.width-16)titleSize--;
    startupStyles.subtitleText.textSize(titleSize);
    port.drawText(titleLabel,new pdg.Point(screenWidth/2,titleRect.y+titleRect.height*.72),startupStyles.subtitleText);
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
    const fastRect=StartupSetup.fastGameRegion(panelRect);
    drawStartupRoundedRect(fastRect,6,pendingConfig.fastGame?startupStyles.advantageButtonActive:startupStyles.advantageButton);
    const box={x:fastRect.x+step(8),y:fastRect.y+step(5),width:step(16),height:step(16)};
    drawStartupRoundedRect(box,3,startupStyles.background);
    if(pendingConfig.fastGame) {
        port.drawLine(new pdg.Point(box.x+box.width*.2,box.y+box.height*.5),new pdg.Point(box.x+box.width*.43,box.y+box.height*.75),startupStyles.checkboxMark);
        port.drawLine(new pdg.Point(box.x+box.width*.43,box.y+box.height*.75),new pdg.Point(box.x+box.width*.82,box.y+box.height*.22),startupStyles.checkboxMark);
    }
    port.drawText(I18n.getString(505,'Fast Game'),new pdg.Point(fastRect.x+step(32),fastRect.y+step(18)),startupStyles.lineText);
    const fogX=fastRect.x+fastRect.width+12,fogLabel=pendingConfig.getFogOfWarDescription();
    let fogSize=Math.max(9,14*scale);
    while(fogSize>9 && port.getTextWidth(fogLabel,fogSize)>panelX+panelWidth-28-fogX)fogSize--;
    startupStyles.lineText.textSize(fogSize);
    port.drawText(fogLabel,new pdg.Point(fogX,fastRect.y+step(18)),startupStyles.lineText);
    y += step(36);
    port.drawText(I18n.getString(525, '<C> edit AI players   <1-5> AI skill'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(762,'<A> cycle computer advantage'),new pdg.Point(x,y),startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(526, '<S> map size   <D> star density'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(22);
    port.drawText(I18n.getString(527, '<F> fast game   <O> fog/all visible   <R> defaults'), new pdg.Point(x, y), startupStyles.hintText);
    y += step(42);

    drawStartupRoundedRect(StartupSetup.startRegion(panelRect),7,startupStyles.advantageButton);
    port.drawText(I18n.getString(528, '<Enter> Start'), new pdg.Point(screenWidth / 2, y), startupStyles.startText);
}

function handleStartupKey(key) {
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
            pendingConfig.omniscient = !pendingConfig.omniscient;
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

function startGame() {
    if (game) {
        return;
    }
    refreshTotalPlayers(pendingConfig);

    const errors = pendingConfig.validate();
    if (errors.length > 0) {
        console.error("Invalid startup configuration:", errors);
        pendingConfig = createDefaultConfig();
        return;
    }

    const factory = new Factory();
    const rules = new Rules(pendingConfig.fastGame);
    game = new Game(factory, rules, pendingConfig);
    game.languagePreferences = languagePreferences;
    game.drawingPreferences = drawingPreferences;
    game.systemComparisonPreferences = systemComparisonPreferences;
    game.systemComparisonSort = systemComparisonPreferences.read();
    game.systemComparisonGeometry = systemComparisonPreferences.readGeometry();
    game.rosterPreferences = rosterPreferences;
    game.fleetRosterSort = rosterPreferences.read();
    game.fleetRosterGeometry = rosterPreferences.readGeometry();
    game.fullscreen = fullscreen;
    game.showGrid = drawingPreferences.readGrid();
    game.showNebula = drawingPreferences.readNebula();
    game.showShips = drawingPreferences.readShips();
    game.showAllCourses = drawingPreferences.readAllCourses();
    game.showScannerRanges = drawingPreferences.readScannerRanges();
    game.showCourierCourses = drawingPreferences.readCourierCourses();
    game.showMapNames = drawingPreferences.readMapNames();
    game.port = port;
    display = new Display(game);
    if (pendingConfig.numHumans === 0 && display) {
        display.zoomToFit();
    }
    game.recordEvent(
        I18n.getString(601, 'Startup'),
        I18n.formatString(511, 'Game started: {0}', pendingConfig.getDescription()),
        { type: 'system' }
    );
    console.log("Game created and window opened");
}

function startAutoplay() {
    if (!game || !launchOptions.aiAutoplay || autoplayController) {
        return;
    }

    autoplayController = new Autoplay.AutoplayController(game, {
        maxTurns: pendingConfig.autoplay.maxTurns,
        eventPresentationMs: pendingConfig.autoplay.eventPresentationMs
    });
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
    if (game) {
        game.draw();
    } else {
        drawStartupDialog();
    }
    return true;
});

const autoplayTimerHandler = new pdg.IEventHandler(function(event) {
    if (!autoplayController || !event || event.id !== AUTOPLAY_TIMER_ID) {
        return false;
    }

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
    if (!game) {
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
            const fast=StartupSetup.fastGameRegion(StartupSetup.panelRect(area.width(),area.height()));
            if(event.mousePos.x>=fast.x && event.mousePos.x<=fast.x+fast.width && event.mousePos.y>=fast.y && event.mousePos.y<=fast.y+fast.height){StartupSetup.toggleFastGame(pendingConfig);return true;}
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
    // Check if this is a mouse down event
    if (event && event.eventType === pdg.eventType_MouseDown) {
        if(['mapPick','fleets','systemComparison','comparison'].includes(game.uiWindow) && event.buttonNumber!==0)return true;
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
    if (!game) {
        return true;
    }
    if (event && event.eventType === pdg.eventType_ScrollWheel) {
        if(game.uiWindow==='mapPick')return true;
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
    if (!game) {
        return true;
    }
    if (event && event.eventType === pdg.eventType_MouseMove) {
        game.display.setHoverPoint(event.mousePos.x, event.mousePos.y);
        // Recover if the button was released outside the game window.
        if(game.uiWindowDrag && event.leftButton===false){game.endUIWindowDrag();return true;}
        if(game.updateUIWindowDrag(event.mousePos.x,event.mousePos.y))return true;
        if(['fleets','systemComparison','comparison'].includes(game.uiWindow)) {
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
    // Check if this is a key press event
    if (event && event.eventType === pdg.eventType_KeyPress) {
        if (game) {
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
