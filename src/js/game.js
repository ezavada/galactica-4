// Game class for Galactica-4
// Contains main game logic and state management

const Common = require('./common.js');
const MapGenerator = require('./map-generator.js');
const GameConfig = require('./game-config.js');
const PlayerInfo = require('./player-info.js');
const { AIManager } = require('./ai-manager.js');
const { SpatialPartition } = require('./spatial-partition.js');
const VisibilityCalculator = require('./visibility-calculator.js');
const CombatSystem = require('./combat.js');
const I18n = require('./i18n.js');

class Game {
    constructor(factory, rules, config = null) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        
        // Game state
        this.stars = [];
        this.allShips = [];
        this.allFleets = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        this.overlay = null; // UI overlay for lab/stardock events
        this.overlayQueue = [];
        this.uiWindow = null; // command UI window: menu, production, events, comparison
        this.eventLog = [];
        this.isGameOver = false;
        this.winningPlayerNum = null;
        this.victoryTurn = null;
        
        // Core systems
        this.factory = factory;
        this.rules = rules;
        
        // Game configuration
        this.config = config || GameConfig.createSinglePlayer();
        const errors = this.config.validate();
        if (errors.length > 0) {
            console.error("Invalid game configuration:", errors);
            throw new Error("Invalid game configuration: " + errors.join(", "));
        }
        
        // Player info (index 0 unused, players 1-N)
        this.players = [];
        this.players[0] = null; // Reserve index 0
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const isComputer = (i > this.config.numHumans);
            this.players[i] = new PlayerInfo(i, isComputer);
            if (isComputer) {
                this.players[i].setAISkill(this.config.getAISkillForPlayer(i), this.config.compAdvantage);
            }
        }
        
        // Initialize AI Manager
        this.aiManager = new AIManager(this, rules);
        
        // Initialize spatial partition and visibility calculator
        this.spatialPartition = new SpatialPartition();
        this.visibilityCalculator = new VisibilityCalculator(this);
        this.combatSystem = new CombatSystem(this);
        
        // Initialize AI players for computer-controlled players
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            if (this.players[i] && this.players[i].isComputer) {
                const aiSkillLevel = Game.mapV3SkillToAISkillLevel(this.config.getAISkillForPlayer(i));
                this.aiManager.initializeAIPlayer(i, aiSkillLevel);
                console.log(`AI initialized for player ${i} (skill level ${aiSkillLevel})`);
            }
        }
        
        console.log(`Game config: ${this.config.getDescription()}`);
        this.recordEvent(
            I18n.getString(601, 'Startup'),
            I18n.formatString(510, 'Game created: {0}', this.config.getDescription()),
            { type: 'system' }
        );
        
        if (!this.config.skipMapGeneration) {
            this.initializeGame();
        }
        console.log("Game constructor completed");
    }

    static mapV3SkillToAISkillLevel(v3Skill) {
        if (v3Skill === 1) {
            return 2; // Expert
        }
        if (v3Skill === 2) {
            return 1; // Good
        }
        return 0; // Average, Passable, and Novice currently share Average behavior
    }

    initializeGame() {
        console.log("Initializing game with MapGenerator...");
        
        // Initialize MapGenerator
        const mapGenerator = new MapGenerator(this);
        
        // Get map configuration from game config
        const mapConfig = this.config.toMapGeneratorConfig();
        
        // Create star callback function for MapGenerator
        const createStarCallback = (x, y, z) => {
            // Store stars in galactic coordinates (conversion to screen happens in Display)
            const star = this.factory.createStar(x, y, "Unnamed");
            return star;
        };
        
        // Generate the map using the original Galactica algorithms
        const homeStars = mapGenerator.generateMap(mapConfig, createStarCallback);
        
        // The MapGenerator has already set up the home stars with proper:
        // - Owner assignment
        // - Tech level (1)
        // - Population (1 billion)
        // - Build queue (colony ship at 99%)
        // - Unique names
        // - Scanner range
        // - Computer player names (for AI players)
        // - PlayerInfo updates (home star references)
        
        console.log(`Game initialized with ${this.stars.length} stars using original Galactica algorithms`);
        console.log(`Home stars assigned: ${homeStars.length}`);
        
        // Initialize fog of war for all entities
        this.initializeFogOfWar();
        
        // Log player names
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            console.log(`Player ${i}: ${player.name || '(unnamed)'} - ${player.getPlayerType()}`);
        }
    }
    
    /**
     * Initialize fog of war properties for all entities
     */
    initializeFogOfWar() {
        // Initialize fog of war properties for all entities
        for (const star of this.stars) {
            this.initializeEntityFogOfWar(star);
        }
        for (const ship of this.allShips) {
            this.initializeEntityFogOfWar(ship);
        }
    }
    
    /**
     * Initialize fog of war properties for a single entity
     */
    initializeEntityFogOfWar(entity) {
        // Initialize visibility arrays only if not already initialized
        if (!entity.visibilityTo) {
            entity.visibilityTo = [];
        }
        if (!entity.lastSeen) {
            entity.lastSeen = [];
        }
        if (!entity.lastSeenBy) {
            entity.lastSeenBy = [];
        }
        
        // Set default values
        if (this.factory.isStar(entity)) {
            entity.setScannerRange(this.rules.getScanRangeForTechLevel(entity.techLevel));
            entity.setStealth(1); // Stars have minimal stealth
            entity.setApparentSize(5000000); // 5 million meters
        } else if (this.factory.isShip(entity)) {
            entity.setScannerRange(this.rules.getShipScanRange(entity));
            entity.setStealth(this.calculateShipStealth(entity));
            entity.setApparentSize(entity.calculateApparentSize());
        }
        
        // Make entity visible to its owner (only if not already visible)
        if (entity.owner > 0 && !entity.getVisibilityTo(entity.owner)) {
            entity.setVisibilityTo(entity.owner, Common.VisibilityLevel.DETAILS);
            entity.setLastSeen(entity.owner, this.turn);
        }
    }
    
    /**
     * Calculate ship stealth based on tech level
     */
    calculateShipStealth(ship) {
        // Stealth = (tech level * 0.75) + 1 (matches C++ formula)
        return Math.floor((ship.techLevel * 0.75) + 1);
    }
    
    entityAdded(entity) {
        const objectType = this.getObjectType(entity);
        if (objectType === Common.ObjectType.STAR) {
            this.stars.push(entity);
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
        } else if (objectType === Common.ObjectType.SHIP) {
            this.allShips.push(entity);
            console.log(`➕ SHIP ADDED TO GAME: ${entity.type} (ID: ${entity.id}) - Owner: ${entity.owner}, Under Construction: ${entity.underConstruction()}, Total Ships: ${this.allShips.length}`);
            // Add to spatial partition
            const entityType = (entity.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
            this.spatialPartition.addEntity(entity, entityType);
        } else if (objectType === Common.ObjectType.FLEET) {
            this.allFleets.push(entity);
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
        }
        
        // Initialize fog of war properties for all entities
        this.initializeEntityFogOfWar(entity);
    }

    entityRemoved(entity) {
        if (this.selectedObject === entity) {
            this.selectedObject = null;
            if (this.display) {
                this.display.setSelectedObject(null);
            }
        }
        
        const objectType = this.getObjectType(entity);
        if (objectType === Common.ObjectType.STAR) {
            const index = this.stars.indexOf(entity);
            if (index !== -1) {
                this.stars.splice(index, 1);
            }
            // Remove from spatial partition
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
        } else if (objectType === Common.ObjectType.SHIP) {
            const index = this.allShips.indexOf(entity);
            if (index !== -1) {
                this.allShips.splice(index, 1);
            }
            console.log(`➖ SHIP REMOVED FROM GAME: ${entity.type} (ID: ${entity.id}) - Owner: ${entity.owner}, Under Construction: ${entity.underConstruction()}, Total Ships: ${this.allShips.length}`);
            // Remove from spatial partition
            const entityType = (entity.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
            this.spatialPartition.removeEntity(entity, entityType);
        } else if (objectType === Common.ObjectType.FLEET) {
            const index = this.allFleets.indexOf(entity);
            if (index !== -1) {
                this.allFleets.splice(index, 1);
            }
            // Remove from spatial partition
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
        }
    }

    setDisplay(display) {
        this.display = display;
        // Select the player's home star after display is set
        // Use setTimeout to ensure the display is fully constructed
        setTimeout(() => {
            this.selectHomeStar();
        }, 0);
    }
    setRules(rules) {
        this.rules = rules;
    }
    
    getFactory() {
        return this.factory;
    }
    getRules() {
        return this.rules;
    }

    getObjectType(object) {
        if (this.factory.isStar(object)) {
            return Common.ObjectType.STAR;
        } else if (this.factory.isShip(object)) {
            return Common.ObjectType.SHIP;
        } else if (this.factory.isFleet(object)) {
            return Common.ObjectType.FLEET;
        }
        return Common.ObjectType.UNKNOWN;
    }
    
    // Check if a human player can control this entity
    // Returns true if the entity is owned by a human player (player 1 to numHumans)
    canHumanControl(entity) {
        if (!entity || entity.owner === undefined) {
            return false; // Unowned or invalid entity
        }
        
        // Human players are numbered 1 to numHumans
        return entity.owner > 0 && entity.owner <= this.config.numHumans;
    }
    
    // Get the player number for the current human (for single player, this is 1)
    // In multiplayer, this would need to be tracked differently
    getCurrentHumanPlayer() {
        if (!this.players) {
            return null;
        }
        for (let i = 1; i <= this.config.numHumans; i++) {
            const player = this.players[i];
            if (player && player.isHuman) {
                return i;
            }
        }
        return null;
    }

    // Get the home star ID for a specific player
    getPlayerHomeSystem(playerNum) {
        if (playerNum < 1 || playerNum > this.config.totalPlayers) {
            return null;
        }
        const player = this.players[playerNum];
        return player ? player.homeStarId : null;
    }

    draw() {
        if (this.display) {
            this.display.drawGame();
        }
    }

    getKeyChar(key) {
        if (typeof key !== 'number' || key < 0) {
            return '';
        }
        return String.fromCharCode(key);
    }

    getSelectedStar() {
        if (this.selectedObject && this.getObjectType(this.selectedObject) === Common.ObjectType.STAR) {
            return this.selectedObject;
        }
        return null;
    }

    openUIWindow(windowName) {
        this.uiWindow = windowName;
        return true;
    }

    toggleUIWindow(windowName) {
        this.uiWindow = (this.uiWindow === windowName) ? null : windowName;
        return true;
    }

    getCurrentMilliseconds() {
        if (typeof pdg !== 'undefined' && pdg.tm && pdg.tm.getMilliseconds) {
            return pdg.tm.getMilliseconds();
        }
        return Date.now();
    }

    shouldShowEventWindows() {
        const autoplay = this.config && this.config.autoplay;
        return !(autoplay && autoplay.enabled && autoplay.showEventWindows === false);
    }

    showEventOverlay(overlay) {
        if (!overlay || !this.shouldShowEventWindows()) {
            return false;
        }

        this.overlay = {
            ...overlay,
            createdAt: this.getCurrentMilliseconds()
        };
        return true;
    }

    queueEventOverlay(overlay) {
        if (!overlay || !this.shouldShowEventWindows()) {
            return false;
        }

        if (!this.overlay) {
            this.showEventOverlay(overlay);
        } else {
            this.overlayQueue.push({ ...overlay });
        }
        return true;
    }

    hasEventPresentation() {
        return !!(this.overlay || (this.overlayQueue && this.overlayQueue.length > 0));
    }

    dismissEventPresentation() {
        if (!this.hasEventPresentation()) {
            return false;
        }

        this.overlay = null;
        if (this.overlayQueue && this.overlayQueue.length > 0) {
            this.showEventOverlay(this.overlayQueue.shift());
        }
        return true;
    }

    clearEventPresentations() {
        const hadPresentation = this.hasEventPresentation();
        this.overlay = null;
        this.overlayQueue = [];
        return hadPresentation;
    }

    closeEventWindowsForTurnAdvance() {
        let closedAny = false;

        if (this.clearEventPresentations()) {
            closedAny = true;
        }

        if (this.uiWindow === 'events') {
            this.uiWindow = null;
            closedAny = true;
        }

        return closedAny;
    }

    toggleProductionWindow() {
        const star = this.getSelectedStar();
        if (!star || !this.canHumanControl(star)) {
            this.recordEvent(
                I18n.getString(602, 'Command'),
                I18n.getString(620, 'Select one of your stars before opening production controls.'),
                { type: 'ui' }
            );
            this.uiWindow = 'menu';
            return true;
        }
        return this.toggleUIWindow('production');
    }

    recordEvent(title, message, options = {}) {
        if (!this.eventLog) {
            this.eventLog = [];
        }
        this.eventLog.push({
            turn: options.turn || this.turn,
            title,
            message,
            type: options.type || 'game',
            createdAt: (typeof pdg !== 'undefined' && pdg.tm && pdg.tm.getMilliseconds) ? pdg.tm.getMilliseconds() : Date.now()
        });
        if (this.eventLog.length > 80) {
            this.eventLog.splice(0, this.eventLog.length - 80);
        }
    }

    getRecentEvents(limit = 12) {
        if (!this.eventLog) {
            return [];
        }
        return this.eventLog.slice(-limit).reverse();
    }

    clampAllocationValue(value) {
        return Math.max(0, Math.min(100, value));
    }

    getAllocationDesired(allocation) {
        if (!allocation) {
            return 0;
        }
        return allocation.desired !== undefined ? allocation.desired : allocation.value || 0;
    }

    setAllocationDesired(allocation, value) {
        const desired = this.clampAllocationValue(Math.round(value));
        if (allocation && typeof allocation.setDesired === 'function') {
            allocation.setDesired(desired);
        } else if (allocation) {
            allocation.desired = desired;
        }
    }

    getStarAllocationEntries(star) {
        return [
            { key: 'growth', label: I18n.getString(564, 'Growth'), allocation: star.growth },
            { key: 'shipBuilding', label: I18n.getString(3, 'Ships:').replace(/:$/, ''), allocation: star.shipBuilding },
            { key: 'research', label: I18n.getString(565, 'Research'), allocation: star.research }
        ];
    }

    normalizeStarAllocations(star) {
        const entries = this.getStarAllocationEntries(star).filter(entry => entry.allocation && !entry.allocation.locked);
        if (entries.length === 0) {
            return;
        }

        for (const entry of entries) {
            this.setAllocationDesired(entry.allocation, this.getAllocationDesired(entry.allocation));
        }

        let total = entries.reduce((sum, entry) => sum + this.getAllocationDesired(entry.allocation), 0);
        let diff = Math.round(100 - total);
        let guard = 0;

        while (diff !== 0 && guard < 300) {
            guard++;
            const direction = diff > 0 ? 1 : -1;
            let changed = false;

            const orderedEntries = [...entries].sort((a, b) => {
                const aDesired = this.getAllocationDesired(a.allocation);
                const bDesired = this.getAllocationDesired(b.allocation);
                return direction > 0 ? aDesired - bDesired : bDesired - aDesired;
            });

            for (const entry of orderedEntries) {
                const current = this.getAllocationDesired(entry.allocation);
                const next = this.clampAllocationValue(current + direction);
                if (next !== current) {
                    this.setAllocationDesired(entry.allocation, next);
                    diff -= direction;
                    changed = true;
                    break;
                }
            }

            if (!changed) {
                break;
            }
        }
    }

    adjustStarAllocation(star, allocationKey, delta) {
        if (!star || !this.canHumanControl(star)) {
            return false;
        }

        const entries = this.getStarAllocationEntries(star);
        const targetEntry = entries.find(entry => entry.key === allocationKey);
        if (!targetEntry || targetEntry.allocation.locked) {
            return false;
        }

        const oldDesired = this.getAllocationDesired(targetEntry.allocation);
        const requestedDesired = this.clampAllocationValue(oldDesired + delta);
        let appliedDelta = requestedDesired - oldDesired;

        if (appliedDelta === 0) {
            return false;
        }

        const otherEntries = entries
            .filter(entry => entry !== targetEntry && entry.allocation && !entry.allocation.locked);

        if (otherEntries.length === 0) {
            return false;
        }

        if (appliedDelta > 0) {
            let remaining = appliedDelta;
            const donors = [...otherEntries].sort((a, b) =>
                this.getAllocationDesired(b.allocation) - this.getAllocationDesired(a.allocation)
            );
            for (const donor of donors) {
                if (remaining <= 0) {
                    break;
                }
                const current = this.getAllocationDesired(donor.allocation);
                const take = Math.min(current, remaining);
                this.setAllocationDesired(donor.allocation, current - take);
                remaining -= take;
            }
            appliedDelta -= remaining;
        } else {
            let remaining = -appliedDelta;
            const receivers = [...otherEntries].sort((a, b) =>
                this.getAllocationDesired(a.allocation) - this.getAllocationDesired(b.allocation)
            );
            for (const receiver of receivers) {
                if (remaining <= 0) {
                    break;
                }
                const current = this.getAllocationDesired(receiver.allocation);
                const room = 100 - current;
                const add = Math.min(room, remaining);
                this.setAllocationDesired(receiver.allocation, current + add);
                remaining -= add;
            }
            appliedDelta += remaining;
        }

        if (appliedDelta === 0) {
            return false;
        }

        this.setAllocationDesired(targetEntry.allocation, oldDesired + appliedDelta);
        this.normalizeStarAllocations(star);
        this.recordProductionChange(star);
        return true;
    }

    adjustSelectedStarAllocation(allocationKey, delta) {
        return this.adjustStarAllocation(this.getSelectedStar(), allocationKey, delta);
    }

    setStarAllocation(star, allocationKey, desired) {
        const entries = this.getStarAllocationEntries(star);
        const targetEntry = entries.find(entry => entry.key === allocationKey);
        if (!targetEntry) {
            return false;
        }

        const current = this.getAllocationDesired(targetEntry.allocation);
        return this.adjustStarAllocation(star, allocationKey, desired - current);
    }

    resetSelectedStarAllocations() {
        const star = this.getSelectedStar();
        if (!star || !this.canHumanControl(star)) {
            return false;
        }
        this.setAllocationDesired(star.growth, 34);
        this.setAllocationDesired(star.shipBuilding, 33);
        this.setAllocationDesired(star.research, 33);
        this.recordProductionChange(star);
        return true;
    }

    recordProductionChange(star) {
        const growth = this.getAllocationDesired(star.growth);
        const ships = this.getAllocationDesired(star.shipBuilding);
        const research = this.getAllocationDesired(star.research);
        this.recordEvent(
            I18n.getString(603, 'Production'),
            I18n.formatString(621, '{0}: Growth {1}% / Ships {2}% / Research {3}%', star.name, growth, ships, research),
            { type: 'ui' }
        );
    }

    handleCommandWindowKey(key, char) {
        if (!this.uiWindow) {
            return false;
        }

        const lower = char.toLowerCase();

        if (key === pdg.key_Escape) {
            this.uiWindow = null;
            return true;
        }

        if (this.uiWindow === 'production') {
            switch (lower) {
                case 'q':
                    this.adjustSelectedStarAllocation('growth', 5);
                    return true;
                case 'a':
                    this.adjustSelectedStarAllocation('growth', -5);
                    return true;
                case 'w':
                    this.adjustSelectedStarAllocation('shipBuilding', 5);
                    return true;
                case 's':
                    this.adjustSelectedStarAllocation('shipBuilding', -5);
                    return true;
                case 'e':
                    this.adjustSelectedStarAllocation('research', 5);
                    return true;
                case 'd':
                    this.adjustSelectedStarAllocation('research', -5);
                    return true;
                case 'r':
                    this.resetSelectedStarAllocations();
                    return true;
                case 'p':
                    this.uiWindow = null;
                    return true;
                default:
                    break;
            }
        }

        switch (lower) {
            case 'm':
                return this.toggleUIWindow('menu');
            case 'e':
                return this.toggleUIWindow('events');
            case 'p':
                return this.toggleProductionWindow();
            case 'v':
                return this.toggleUIWindow('comparison');
            case 'h':
                this.selectHomeStar();
                return true;
            case 'f':
                if (this.display) {
                    this.display.zoomToFit();
                }
                return true;
            case '0':
                if (this.display) {
                    this.display.resetView();
                }
                return true;
            case '+':
            case '=':
                if (this.display) {
                    this.display.zoomIn();
                }
                return true;
            case '-':
                if (this.display) {
                    this.display.zoomOut();
                }
                return true;
            default:
                return true;
        }
    }

    handleTopLevelCommandKey(key, char) {
        const lower = char.toLowerCase();
        switch (lower) {
            case 'm':
                return this.toggleUIWindow('menu');
            case 'e':
                return this.toggleUIWindow('events');
            case 'p':
                return this.toggleProductionWindow();
            case 'v':
                return this.toggleUIWindow('comparison');
            default:
                return false;
        }
    }

    setSelectedObject(object) {
        this.selectedObject = object;
        if (this.display) {
            this.display.setSelectedObject(object);
        }
    }

    isAwaitingMapTarget() {
        return !!this.pendingMapOrderObject;
    }

    beginMapOrder(object) {
        const objectType = this.getObjectType(object);
        if (objectType !== Common.ObjectType.SHIP && objectType !== Common.ObjectType.FLEET) {
            return true;
        }
        if (!this.canHumanControl(object)) {
            this.recordEvent(
                I18n.getString(604, 'Orders'),
                I18n.getString(622, 'You can only give orders to your own ships and fleets.'),
                { type: 'ui' }
            );
            return true;
        }

        this.pendingMapOrderObject = object;
        this.setSelectedObject(object);
        this.recordEvent(
            I18n.getString(604, 'Orders'),
            I18n.getString(623, 'Click a star, fleet, ship, or empty map location to set a destination.'),
            { type: 'ui' }
        );
        return true;
    }

    executeUIAction(action) {
        if (!action) {
            return false;
        }

        switch (action.type) {
            case 'consume':
                return true;
            case 'toggleWindow':
                return this.toggleUIWindow(action.window);
            case 'toggleProduction':
                if (action.object) {
                    this.setSelectedObject(action.object);
                }
                return this.toggleProductionWindow();
            case 'setAllocation':
                if (action.star) {
                    this.setSelectedObject(action.star);
                    this.setStarAllocation(action.star, action.allocationKey, action.desired);
                }
                return true;
            case 'selectHomeStar':
                this.selectHomeStar();
                return true;
            case 'endTurn':
                this.endTurn();
                return true;
            case 'zoomToFit':
                if (this.display) {
                    this.display.zoomToFit();
                }
                return true;
            case 'buildShip':
                if (action.object && this.getObjectType(action.object) === Common.ObjectType.STAR) {
                    this.setSelectedObject(action.object);
                    if (this.canHumanControl(action.object)) {
                        action.object.startBuildingShip(action.shipType);
                    }
                }
                return true;
            case 'centerObject':
                if (action.object && this.display) {
                    this.setSelectedObject(action.object);
                    this.display.centerOn(action.object.x, action.object.y);
                }
                return true;
            case 'beginOrders':
                return this.beginMapOrder(action.object);
            default:
                return false;
        }
    }

    handleUIClick(x, y) {
        if (!this.display || typeof this.display.getUIActionAt !== 'function') {
            return false;
        }
        return this.executeUIAction(this.display.getUIActionAt(x, y));
    }

    getPlayerComparisonRows() {
        const rows = [];
        if (!this.players || !this.config) {
            return rows;
        }

        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            if (!player) {
                continue;
            }
            const ownedStars = this.stars.filter(star => star.owner === i);
            const ownedShips = this.allShips.filter(ship => ship.owner === i);
            const completedShips = ownedShips.filter(ship => !ship.underConstruction || !ship.underConstruction());
            const population = ownedStars.reduce((sum, star) => sum + Math.floor(star.population * 1000.0), 0);
            const techSum = ownedStars.reduce((sum, star) => sum + (star.techLevel || 0), 0);
            const maxTech = ownedStars.reduce((max, star) => Math.max(max, star.techLevel || 0), 0);

            rows.push({
                playerNum: i,
                name: player.name || `${I18n.getString(18, 'Player')} ${i}`,
                type: player.isComputer ? I18n.getString(504, 'AI') : I18n.getString(300, 'Human'),
                isAlive: player.isAlive,
                stars: ownedStars.length,
                ships: completedShips.length,
                shipsBuilding: ownedShips.length - completedShips.length,
                population,
                averageTech: ownedStars.length > 0 ? techSum / ownedStars.length : 0,
                maxTech,
                pieces: ownedStars.length + ownedShips.length
            });
        }

        return rows;
    }
    
    handleMouseClick(x, y) {
        if (this.pendingMapOrderObject) {
            const orderObject = this.pendingMapOrderObject;
            this.pendingMapOrderObject = null;
            this.setSelectedObject(orderObject);
            return this.handleMouseRightClick(x, y);
        }

        // Left click - select object to view information
        var clickedObject = this.findObjectAtPosition(x, y);
        
        // Allow selecting any object to view information
        this.setSelectedObject(clickedObject);
        return true;
    }
    
    handleMouseRightClick(x, y) {
        this.pendingMapOrderObject = null;

        // Right click - give orders to selected ship or set default destination for selected star
        // Convert screen coordinates to galactic coordinates
        const galacticX = this.display.toGalacticX(x);
        const galacticY = this.display.toGalacticY(y);
        
        // Check what type of object is selected
        const selectedObjectType = this.getObjectType(this.selectedObject);
        
        // If a star is selected, handle setting default destination
        if (selectedObjectType === Common.ObjectType.STAR) {
            // Only allow setting default destination for stars we own
            if (!this.canHumanControl(this.selectedObject)) {
                console.log(`Cannot set default destination for star owned by player ${this.selectedObject.owner}`);
                return true;
            }
            
            // Find what was right-clicked on
            var clickedObject = this.findObjectAtPosition(x, y);
            
            // Set default destination - either to an object or to coordinates
            if (clickedObject) {
                this.selectedObject.setDefaultDestination(clickedObject);
                const clickedObjectType = this.getObjectType(clickedObject);
                let destinationName;
                if (clickedObjectType === Common.ObjectType.STAR) {
                    destinationName = clickedObject.name;
                } else if (clickedObjectType === Common.ObjectType.FLEET) {
                    destinationName = `fleet (${clickedObject.getSize()} ships)`;
                } else {
                    destinationName = clickedObject.type;
                }
                console.log(`Set default destination for star ${this.selectedObject.name} to ${destinationName}`);
            } else {
                // Right-clicking on empty space - set default destination to coordinates
                this.selectedObject.setDefaultDestination({x: galacticX, y: galacticY});
                console.log(`Set default destination for star ${this.selectedObject.name} to galactic (${galacticX.toFixed(0)}, ${galacticY.toFixed(0)})`);
            }
            return true;
        }
        
        // If a ship or fleet is selected, handle giving orders
        if (selectedObjectType === Common.ObjectType.SHIP || selectedObjectType === Common.ObjectType.FLEET) {
            // Only allow giving orders to ships we control
            if (!this.canHumanControl(this.selectedObject)) {
                console.log(`Cannot give orders to ship owned by player ${this.selectedObject.owner}`);
                return true;
            }
            
            // Find what was right-clicked on
            var clickedObject = this.findObjectAtPosition(x, y);
            
            // Set destination - either to an object or to coordinates
            if (clickedObject) {
                this.selectedObject.setDestination(clickedObject);
                const clickedObjectType = this.getObjectType(clickedObject);
                let destinationName;
                if (clickedObjectType === Common.ObjectType.STAR) {
                    destinationName = clickedObject.name;
                } else if (clickedObjectType === Common.ObjectType.FLEET) {
                    destinationName = `fleet (${clickedObject.getSize()} ships)`;
                } else {
                    destinationName = clickedObject.type;
                }
                const selectedObjectName = (selectedObjectType === Common.ObjectType.FLEET) ? `fleet (${this.selectedObject.getSize()} ships)` : this.selectedObject.type;
                console.log(`Set destination of ${selectedObjectName} to ${destinationName}`);
            } else {
                // Right-clicking on empty space - give ship/fleet a destination (in galactic coordinates)
                this.selectedObject.setDestination({x: galacticX, y: galacticY});
                const selectedObjectName = (selectedObjectType === Common.ObjectType.FLEET) ? `fleet (${this.selectedObject.getSize()} ships)` : this.selectedObject.type;
                console.log(`Set destination of ${selectedObjectName} to galactic (${galacticX.toFixed(0)}, ${galacticY.toFixed(0)})`);
            }
            return true;
        }
        
        // If no valid object is selected, ignore the right click
        return true;
    }
    
    findObjectAtPosition(x, y) {
        // Helper method to find what object is at a given screen position
        var clickedObject = null;
        
        // Check for ship clicks (using screen-space radius for consistent UI feel)
        const shipRadiusSquared = Common.ShipRadius * Common.ShipRadius;
        for (const ship of this.allShips) {
            // Convert ship position to screen for distance check
            const shipScreenX = this.display.toScreenX(ship.x);
            const shipScreenY = this.display.toScreenY(ship.y);
            
            let dx = x - shipScreenX;
            let dy = y - shipScreenY;
            if (ship.star) {
                // adjust for parking orbit around star
                dx -= 10;
                dy += 6;
            }
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= shipRadiusSquared) {
                clickedObject = ship;
                console.log(`Clicked on ship: ${ship.type}`);
             }
        }

        // Check for fleet clicks (using screen-space radius for consistent UI feel)
        const fleetRadiusSquared = Common.ShipRadius * Common.ShipRadius * 2.25; // Fleet hexagons are larger than ships
        for (const fleet of this.allFleets) {
            // Convert fleet position to screen for distance check
            let fleetScreenX = this.display.toScreenX(fleet.x);
            let fleetScreenY = this.display.toScreenY(fleet.y);
            
            // Adjust for fleet offset when at star (same as ships)
            const fleetAtStar = this.stars.find(star => 
                Math.abs(star.x - fleet.x) < 5 && Math.abs(star.y - fleet.y) < 5
            );
            if (fleetAtStar) {
                fleetScreenX += this.display.scaledStarRadius * 1.25;
                fleetScreenY -= this.display.scaledStarRadius * 0.75;
            }
            
            const dx = x - fleetScreenX;
            const dy = y - fleetScreenY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= fleetRadiusSquared) {
                clickedObject = fleet;
                console.log(`Clicked on fleet: ${fleet.getSize()} ships`);
                break; // Fleet takes priority over ships/stars
            }
        }

        // Check for star clicks (using screen-space radius for consistent UI feel)
        const starRadiusSquared = Common.StarRadius * Common.StarRadius;
        for (const star of this.stars) {
            // Convert star position to screen for distance check
            const starScreenX = this.display.toScreenX(star.x);
            const starScreenY = this.display.toScreenY(star.y);
            
            const dx = x - starScreenX;
            const dy = y - starScreenY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= starRadiusSquared) {
                clickedObject = star;
                console.log(`Clicked on star: ${star.name}`);
            }
        }
        
        return clickedObject;
    }
    
    handleKeyPress(key) {
        if (key === pdg.key_Tab) {
            this.endTurn();
            return true;
        }

        // Dismiss overlay on any key press
        if (this.overlay) {
            this.dismissEventPresentation();
            return true;
        }
        const char = this.getKeyChar(key);
        if (this.handleCommandWindowKey(key, char)) {
            return true;
        }
        if (key === pdg.key_Escape) {
            this.selectedObject = null;
            this.display.setSelectedObject(null);
        } else if (key === 61 || key === 43) { // = or + key
            // Zoom in with + or = key (zoom to center of screen)
            this.display.zoomIn();
        } else if (key === 45) { // - key
            // Zoom out with - key (zoom to center of screen)
            this.display.zoomOut();
        } else if (key === 48) { // 0 key
            // Reset view with 0 key
            this.display.resetView();
        //} else if (key === 99 || key === 67) { // c or C key
        //    // Center on selected object with C key
        //    if (this.selectedObject) {
        //        this.display.centerOn(this.selectedObject.x, this.selectedObject.y);
        //    }
        } else if (key === 67) { // Shift+C centers on selected object; lowercase c remains colony build
            if (this.selectedObject) {
                this.display.centerOn(this.selectedObject.x, this.selectedObject.y);
            }
        } else if (key === 102 || key === 70) { // f or F key
            // Zoom to fit entire map with F key
            this.display.zoomToFit();
        } else if (key === 104 || key === 72) { // h or H key
            // Select player's home star with H key
            this.selectHomeStar();
        } else if (this.handleTopLevelCommandKey(key, char)) {
            return true;
        } else if (this.selectedObject) {
            const objectType = this.getObjectType(this.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                // Handle ship building keys
                this.handleStarKeyPress(this.selectedObject, key);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.handleShipKeyPress(this.selectedObject, key);
            }
        }
        return true;
    }

    selectHomeStar() {
        // Check if display is available
        if (!this.display) {
            // console.log('Display not available yet, skipping home star selection');
            return;
        }
        
        const playerNum = this.getCurrentHumanPlayer() || 1;
        const homeStarId = this.getPlayerHomeSystem(playerNum);
        if (!homeStarId) {
            console.log(`No home star found for player ${playerNum}`);
            return;
        }
        
        // Find the home star object
        const homeStar = this.stars.find(star => star.id === homeStarId);
        if (!homeStar) {
            console.log(`Home star with ID ${homeStarId} not found`);
            return;
        }
        
        // Select the home star
        this.selectedObject = homeStar;
        this.display.setSelectedObject(homeStar);
        
        // Center the view on the home star
        this.display.centerOn(homeStar.x, homeStar.y);
    }

    handleStarKeyPress(star, key) {
        // Verify the star can be controlled by human
        if (!this.canHumanControl(star)) {
            console.log(`Cannot build ships at ${star.name} - owned by player ${star.owner}`);
            return;
        }
        
        switch (String.fromCharCode(key)) {
            case 's':
                star.startBuildingShip('scout');
                break;
            case 'd':
                star.startBuildingShip('defense');
                break;
            case 'b':
                star.startBuildingShip('battleship');
                break;
            case 'c':
                star.startBuildingShip('colony');
                break;
            default:
                console.log(`Invalid key pressed: ${key}`);
                break;
        }
    }

    handleShipKeyPress(ship, key) {
        // no ship keys yet
    }
    
    endTurn() {
        if (this.isGameOver) {
            console.log(`Game already complete on turn ${this.victoryTurn}`);
            return this.getGameResult();
        }

        this.closeEventWindowsForTurnAdvance();

        console.log(`=== End of Turn ${this.turn} ===`);
        
        // Log ships under construction status
        const shipsUnderConstruction = this.allShips.filter(ship => ship.underConstruction());
        if (shipsUnderConstruction.length > 0) {
            console.log(`🔍 SHIPS UNDER CONSTRUCTION (${shipsUnderConstruction.length}):`);
            for (const ship of shipsUnderConstruction) {
                const starName = ship.star ? ship.star.name : 'UNKNOWN';
                console.log(`  - ${ship.type} (ID: ${ship.id}) at ${starName} - Owner: ${ship.owner}, Progress: ${ship.progress.toFixed(1)}%, Visible: ${ship.isVisibleTo(1)}`);
            }
        } else {
            console.log(`🔍 NO SHIPS UNDER CONSTRUCTION`);
        }
        
        // Process AI decisions before moving/updating
        if (this.aiManager) {
            this.aiManager.processAITurns();
        }
        
        // Update all ships
        for (const ship of [...this.allShips]) {
            if (this.allShips.includes(ship)) {
                ship.move();
            }
        }
        // Update all fleets
        for (const fleet of [...this.allFleets]) {
            if (this.allFleets.includes(fleet)) {
                fleet.move();
            }
        }
        // Update all stars
        for (const star of [...this.stars]) {
            if (this.stars.includes(star)) {
                star.update();
            }
        }
        
        // Update visibility after all movements and changes
        this.visibilityCalculator.updateAllVisibility();
        
        // Update player piece counts and check for defeats
        this.updatePlayerPieceCounts();

        if (this.isGameOver) {
            console.log(`=== Game ended on turn ${this.victoryTurn} ===`);
            return this.getGameResult();
        }

        this.turn++;
        console.log(`=== Start of Turn ${this.turn} ===`);
        return this.getGameResult();
    }
    
    getPlayerPieceCounts(playerNum) {
        const starCount = this.stars.filter(star => star.owner === playerNum).length;
        const shipCount = this.allShips.filter(ship => ship.owner === playerNum).length;
        return {
            stars: starCount,
            ships: shipCount,
            total: starCount + shipCount
        };
    }

    // Update piece counts for all players
    updatePlayerPieceCounts() {
        if (!this.players) return;
        
        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            if (!player) continue;
            
            const counts = this.getPlayerPieceCounts(i);
            
            // Update piece count (returns true if player just died)
            if (player.updatePieceCount(counts.stars, counts.ships)) {
                console.log(`${player.name} has been defeated!`);
                this.noteworthyEvent(player, Common.EventType.PLAYER_DIED);
            }
        }

        this.updateVictoryState();
    }

    getActivePlayerIds() {
        const activePlayerIds = [];
        if (!this.players || !this.config) {
            return activePlayerIds;
        }

        for (let i = 1; i <= this.config.totalPlayers; i++) {
            const player = this.players[i];
            if (!player || !player.isAlive) {
                continue;
            }
            if (this.getPlayerPieceCounts(i).total > 0) {
                activePlayerIds.push(i);
            }
        }

        return activePlayerIds;
    }

    updateVictoryState() {
        if (this.isGameOver || !this.config || this.config.totalPlayers < 2) {
            return this.winningPlayerNum;
        }

        const activePlayerIds = this.getActivePlayerIds();
        if (activePlayerIds.length === 1) {
            this.markGameWon(activePlayerIds[0]);
        } else if (activePlayerIds.length === 0) {
            this.markGameDraw();
        }

        return this.winningPlayerNum;
    }

    markGameWon(playerNum) {
        if (this.isGameOver) {
            return false;
        }

        const player = this.players ? this.players[playerNum] : null;
        this.isGameOver = true;
        this.winningPlayerNum = playerNum;
        this.victoryTurn = this.turn;

        const playerName = player && player.name ? player.name : `${I18n.getString(18, 'Player')} ${playerNum}`;
        const message = I18n.formatString(644, '{0} wins on turn {1}', playerName, this.victoryTurn);
        console.log(message);
        this.recordEvent(I18n.getString(614, 'Victory'), message, { type: Common.EventType.GAME_WON });
        return true;
    }

    markGameDraw() {
        if (this.isGameOver) {
            return false;
        }

        this.isGameOver = true;
        this.winningPlayerNum = 0;
        this.victoryTurn = this.turn;

        const message = I18n.formatString(652, 'No players remain on turn {0}', this.victoryTurn);
        console.log(message);
        this.recordEvent(I18n.getString(615, 'Stalemate'), message, { type: Common.EventType.GAME_DRAW });
        return true;
    }

    getGameResult() {
        return {
            isGameOver: this.isGameOver,
            winningPlayerNum: this.winningPlayerNum,
            victoryTurn: this.victoryTurn
        };
    }

    isOwnerAlliedWith(ownerId, otherOwnerId) {
        if (!ownerId || !otherOwnerId) {
            return false;
        }
        if (ownerId === otherOwnerId) {
            return true;
        }
        const player = this.players ? this.players[otherOwnerId] : null;
        return !!(player && typeof player.isAllyOf === 'function' && player.isAllyOf(ownerId));
    }

    shouldResolveCombat(attacker, destination) {
        return !!(this.combatSystem && this.combatSystem.shouldResolveCombat(attacker, destination));
    }

    resolveCombat(attacker, destination) {
        if (!this.combatSystem) {
            return null;
        }
        return this.combatSystem.resolveCombat(attacker, destination);
    }

    resolveCombatForShip(ship) {
        if (!ship || ship.underConstruction() || ship.isDead()) {
            return null;
        }
        if (ship.star && this.shouldResolveCombat(ship, ship.star)) {
            return this.resolveCombat(ship, ship.star);
        }
        return null;
    }

    detachShipFromContainers(ship) {
        if (!ship) {
            return;
        }

        if (ship.fleet && typeof ship.fleet.removeShip === 'function') {
            ship.fleet.removeShip(ship);
        }
        ship.fleet = null;

        if (ship.star && typeof ship.star.removeShip === 'function') {
            ship.star.removeShip(ship);
        }

        for (const star of this.stars) {
            if (star.ships) {
                const index = star.ships.indexOf(ship);
                if (index !== -1) {
                    star.ships.splice(index, 1);
                }
            }
            if (star.defenseSatellites) {
                const index = star.defenseSatellites.indexOf(ship);
                if (index !== -1) {
                    star.defenseSatellites.splice(index, 1);
                }
            }
            if (star.currentShip === ship) {
                star.currentShip = null;
            }
        }

        ship.star = null;
    }

    removeDestroyedShip(ship, attackerOwner, sendEvent = true) {
        if (!ship) {
            return false;
        }

        const wasTracked = this.allShips.includes(ship);
        const where = { x: ship.x, y: ship.y };
        this.detachShipFromContainers(ship);

        if (wasTracked) {
            this.entityRemoved(ship);
            if (sendEvent) {
                this.noteworthyEvent(ship, Common.EventType.SHIP_DESTROYED, where, null, Common.EventWhy.COMBAT, attackerOwner);
            }
        }

        return wasTracked;
    }

    removeDestroyedFleet(fleet, attackerOwner) {
        if (!fleet) {
            return false;
        }
        if (typeof fleet.removeDeadShips === 'function') {
            fleet.removeDeadShips();
        }
        if (typeof fleet.isEmpty !== 'function' || !fleet.isEmpty()) {
            return false;
        }

        const wasTracked = this.allFleets.includes(fleet);
        if (wasTracked) {
            this.entityRemoved(fleet);
            console.log(`Fleet ${fleet.id} destroyed in combat by player ${attackerOwner}`);
        }
        return wasTracked;
    }

    colonizeStar(star, colonyShip, previousOwner = 0) {
        if (!star || !colonyShip || colonyShip.isDead() || star.owner !== 0) {
            return false;
        }

        star.population = Math.max(1, star.population || 0);
        star.techLevel = Math.max(star.techLevel || 0, colonyShip.techLevel || 0);
        star.owner = colonyShip.owner;
        star.setScannerRange(this.rules.getScanRangeForTechLevel(star.techLevel));

        const eventType = previousOwner ? Common.EventType.STAR_CAPTURED : Common.EventType.STAR_COLONIZED;
        this.noteworthyEvent(colonyShip, eventType, star);
        this.removeDestroyedShip(colonyShip, colonyShip.owner, false);
        return true;
    }

    noteworthyEvent(who, what, where, how, why, other) {
        let eventTitle = I18n.getString(600, 'Event');
        let eventMessage = null;
        const shipTypeName = who && who.type ? I18n.getShipTypeName(who.type) : '';

        switch (what) {
            case Common.EventType.SHIP_ARRIVED:
                eventTitle = I18n.getString(605, 'Arrival');
                eventMessage = I18n.formatString(624, '{0} ship arrived at {1}', shipTypeName, where.name);
                console.log(eventMessage); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_INTERCEPT:
                eventTitle = I18n.getString(606, 'Intercept');
                eventMessage = I18n.formatString(
                    625,
                    '{0} ship intercepted {1} at ({2}, {3})',
                    shipTypeName,
                    where.type ? I18n.getShipTypeName(where.type) : I18n.getString(639, 'target'),
                    Math.round(where.x),
                    Math.round(where.y)
                );
                console.log(eventMessage); // who = Ship, where = Ship
                // Check if ships are friendly and can form a fleet
                if (who.owner === where.owner && who.canFormFleet() && where.canFormFleet()) {
                    this.handleFleetFormation(who, where);
                }
                break;
            case Common.EventType.SHIP_STOPPED:
                eventTitle = I18n.getString(604, 'Orders');
                eventMessage = I18n.formatString(626, '{0} ship stopped at ({1}, {2})', shipTypeName, Math.round(who.x), Math.round(who.y));
                console.log(eventMessage); // who = Ship
                break;
            case Common.EventType.SHIP_DESTROYED:
                // TODO: different message based on where, how, and why
                eventTitle = I18n.getString(607, 'Combat');
                eventMessage = I18n.formatString(627, '{0} ship destroyed at ({1}, {2})', shipTypeName, Math.round(where.x), Math.round(where.y));
                console.log(eventMessage); // who = Ship, where = position or Star or Ship
                break;
            case Common.EventType.SHIP_BUILT:
                eventTitle = I18n.getString(608, 'Build');
                eventMessage = I18n.formatString(628, '{0} built a {1} ship', where.name, shipTypeName);
                console.log(eventMessage); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_DEPARTED:
                eventTitle = I18n.getString(609, 'Departure');
                eventMessage = I18n.formatString(629, '{0} ship departed from {1}', shipTypeName, where.name);
                console.log(eventMessage); // who = Ship, where = Star
                break;
            case Common.EventType.SHIP_TASKED:
                eventTitle = I18n.getString(604, 'Orders');
                if (why === Common.EventWhy.NEW_DESTINATION) {
                    eventMessage = I18n.formatString(630, '{0} ship moving to ({1}, {2})', shipTypeName, Math.round(where.x), Math.round(where.y));
                    console.log(eventMessage); // who = Ship, where = coordinates, why = reason for tasking
                } else {
                    eventMessage = I18n.formatString(
                        631,
                        '{0} ship tasked to ({1}, {2}) for {3}',
                        shipTypeName,
                        Math.round(where.x),
                        Math.round(where.y),
                        I18n.getEventWhyName(why)
                    );
                    console.log(eventMessage); // who = Ship, where = coordinates, why = reason for tasking
                }
                break;
            case Common.EventType.TECH_LEVEL_UP:
                eventTitle = I18n.getString(610, 'Research');
                eventMessage = I18n.formatString(632, '{0} reached tech level {1}', who.name, who.techLevel);
                console.log(eventMessage); // who = Star, where = Tech Level
                break;
            case Common.EventType.NEW_TECH_DISCOVERY: {
                const classIndex = where || Math.floor(who.techLevel / 5);
                this.queueEventOverlay({ type: 'lab', classIndex });
                eventTitle = I18n.getString(610, 'Research');
                eventMessage = I18n.formatString(633, 'New drive class discovered: {0}', classIndex);
                console.log(`🧪 ${eventMessage}`);
                break;
            }
            case Common.EventType.NEW_SHIP_CLASS: {
                const classIndex = where || (who.classIndex || 1);
                this.queueEventOverlay({ type: 'stardock', classIndex, ship: who });
                eventTitle = I18n.getString(611, 'Stardock');
                eventMessage = I18n.formatString(634, 'New ship class commissioned: {0}', classIndex);
                console.log(`🏭 ${eventMessage}`);
                break;
            }
            case Common.EventType.STAR_COLONIZED:
                eventTitle = I18n.getString(612, 'Colonization');
                eventMessage = I18n.formatString(635, 'Player {0} colonized {1}', where.owner, where.name);
                console.log(eventMessage); // who = Star, where = Star
                break;
            case Common.EventType.STAR_CAPTURED:
                eventTitle = I18n.getString(607, 'Combat');
                eventMessage = I18n.formatString(636, 'Player {0} captured {1}', where.owner, where.name);
                console.log(eventMessage); // who = Star, where = Star
                break;
            case Common.EventType.PLAYER_DIED:
                eventTitle = I18n.getString(613, 'Defeat');
                eventMessage = I18n.formatString(637, '{0} has been defeated', who.name || `${I18n.getString(18, 'Player')} ${who.playerNum}`);
                console.log(eventMessage);
                break;
            default:
                eventMessage = I18n.formatString(638, 'Noteworthy Event: {0} {1} {2} {3} {4} {5}', who, what, where, how, why, other);
                console.log(`=== ${eventMessage} ===`);
                break;
        }

        if (eventMessage) {
            this.recordEvent(eventTitle, eventMessage, { type: what });
        }
    }
    
    /**
     * Get spatial partition statistics for debugging
     */
    getSpatialStats() {
        return this.spatialPartition.getStats();
    }
    
    /**
     * Get visibility statistics for debugging
     */
    getVisibilityStats() {
        return this.visibilityCalculator.getVisibilityStats();
    }
    
    /**
     * Handle automatic fleet formation when friendly ships intercept
     */
    handleFleetFormation(entity1, entity2) {
        // Check if either entity is already a fleet
        const entity1Type = this.getObjectType(entity1);
        const entity2Type = this.getObjectType(entity2);
        
        if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
            // Both entities are fleets - merge them
            if (entity1 !== entity2) {
                this.mergeFleets(entity1, entity2);
            }
        } else if (entity1Type === Common.ObjectType.FLEET) {
            // Entity1 is a fleet, add entity2 to it if it can form a fleet
            if (entity2.canFormFleet()) {
                entity1.addShip(entity2);
            }
        } else if (entity2Type === Common.ObjectType.FLEET) {
            // Entity2 is a fleet, add entity1 to it if it can form a fleet
            if (entity1.canFormFleet()) {
                entity2.addShip(entity1);
            }
        } else {
            // Both entities are ships - check if either ship is already in a fleet
            if (entity1.isInFleet() && entity2.isInFleet()) {
                // Both ships are in fleets - merge the fleets
                if (entity1.fleet !== entity2.fleet) {
                    this.mergeFleets(entity1.fleet, entity2.fleet);
                }
            } else if (entity1.isInFleet()) {
                // Ship1 is in a fleet, add ship2 to it
                entity1.fleet.addShip(entity2);
            } else if (entity2.isInFleet()) {
                // Ship2 is in a fleet, add ship1 to it
                entity2.fleet.addShip(entity1);
            } else {
                // Neither ship is in a fleet, create a new fleet
                const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                fleet.addShip(entity1);
                fleet.addShip(entity2);
            }
        }
    }
    
    /**
     * Merge two fleets into one
     */
    mergeFleets(fleet1, fleet2) {
        // Add all ships from fleet2 to fleet1
        const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
        for (const ship of shipsToMove) {
            fleet1.addShip(ship);
        }
        
        // Remove the empty fleet2
        this.entityRemoved(fleet2);
    }
}

// Export the class
module.exports = Game;
