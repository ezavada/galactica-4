// Game class for Galactica-4
// Contains main game logic and state management

const LanguageSettings = require('./language-settings.js');
const Common = require('./common.js');
const MapDisplayModes = require('./map-display-modes.js');
const MapGenerator = require('./map-generator.js');
const GameConfig = require('./game-config.js');
const PlayerInfo = require('./player-info.js');
const { AIManager } = require('./ai-manager.js');
const { SpatialPartition } = require('./spatial-partition.js');
const VisibilityCalculator = require('./visibility-calculator.js');
const CombatSystem = require('./combat.js');
const I18n = require('./i18n.js');
const Attention = require('./attention.js');
const RosterPreferences = require('./roster-preferences.js');
const ChartNames = require('./chart-names.js');

class Game {
    constructor(factory, rules, config = null) {
        console.log("Game constructor starting...");
        factory.setGame(this);
        
        // Game state
        this.stars = [];
        this.allShips = [];
        this.allFleets = [];
        this.allRendezvous = [];
        this.selectedObject = null;
        this.turn = 1;
        this.gameWidth = 800;
        this.gameHeight = 600;
        this.port = null;
        this.display = null;
        this.overlay = null; // UI overlay for lab/stardock events
        this.overlayQueue = [];
        this.showScannerRanges = true;
        this.showAllCourses = true;
        this.showCourierCourses = true;
        this.showShips = true;
        this.showGrid = true;
        this.showNebula = true;
        this.mapDisplayMode = 'ownership';
        this.showMapNames = true;
        this.uiWindow = null; // command UI window: menu, production, events, comparison
        this.eventLog = [];
        this.nextEventId = 0;
        this.eventSelection = null;
        this.eventPage = 0;
        this.eventDetailPage = 0;
        this.attention = new Attention(this);
        this.pendingMapOrderObject = null;
        this.pendingCourseEdit = null;
        this.courseWindowObject = null;
        this.courseSelection = null;
        this.coursePage = 0;
        this.uiSliderDrag = null;
        this.uiMapScrollDrag = null;
        this.mapSelectionPicker = null;
        this.fleetMemberPage = 0;
        this.fleetRosterPage = 0;
        this.fleetRosterSort = {key:'name',ascending:true};
        this.fleetRosterLastClick = null;
        this.fleetRosterGeometry = null;
        this.uiWindowDrag = null;
        this.colonyDefaultsDraft = null;
        this.systemShipWindowStar = null;
        this.systemShipPage = 0;
        this.systemShipSort = { key: 'name', ascending: true };
        this.playerComparisonPage = 0;
        this.systemComparisonPage = 0;
        this.systemComparisonSort = { key: 'name', ascending: true };
        this.systemComparisonSelection = null;
        this.systemComparisonLastClick = null;
        this.systemComparisonGeometry = null;
        this.pendingRendezvousPlacement = null;
        this.renameTarget = null;
        this.renameText = '';
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
            if(!isComputer && this.config.humanPlayerNames[i])this.players[i].setName(this.config.humanPlayerNames[i]);
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
        for (const fleet of this.allFleets) {
            this.initializeEntityFogOfWar(fleet);
        }
        for (const rendezvous of this.allRendezvous) {
            this.initializeEntityFogOfWar(rendezvous);
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
        } else if (this.factory.isFleet(entity)) {
            entity.setStealth(1);
            entity.setApparentSize(1000000);
        } else if (this.factory.isRendezvous && this.factory.isRendezvous(entity)) {
            entity.setScannerRange(0);
            entity.setStealth(Number.MAX_SAFE_INTEGER);
            entity.setApparentSize(0);
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
            if (!this.stars.includes(entity)) {
                this.stars.push(entity);
            }
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_STAR);
        } else if (objectType === Common.ObjectType.SHIP) {
            if (!this.allShips.includes(entity)) {
                this.allShips.push(entity);
            }
            console.log(`➕ SHIP ADDED TO GAME: ${entity.type} (ID: ${entity.id}) - Owner: ${entity.owner}, Under Construction: ${entity.underConstruction()}, Total Ships: ${this.allShips.length}`);
            // Add to spatial partition
            const entityType = (entity.type === 'defense') ? 
                Common.SpatialConstants.ENTITY_TYPE_DEFENSE : 
                Common.SpatialConstants.ENTITY_TYPE_SHIP;
            this.spatialPartition.addEntity(entity, entityType);
        } else if (objectType === Common.ObjectType.FLEET) {
            if (!this.allFleets.includes(entity)) {
                this.allFleets.push(entity);
            }
            // Add to spatial partition
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
        } else if (objectType === Common.ObjectType.RENDEZVOUS) {
            if (!this.allRendezvous.includes(entity)) {
                this.allRendezvous.push(entity);
            }
            this.spatialPartition.addEntity(entity, Common.SpatialConstants.ENTITY_TYPE_RENDEZVOUS);
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
            const parent=entity.fleet;
            if(parent)parent.removeShip(entity);
            if(parent && parent.isEmpty())this.entityRemoved(parent);
            const index = this.allFleets.indexOf(entity);
            if (index !== -1) {
                this.allFleets.splice(index, 1);
            }
            // Remove from spatial partition
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_FLEET);
            this.clearRendezvousFleetReferences(entity);
        } else if (objectType === Common.ObjectType.RENDEZVOUS) {
            const index = this.allRendezvous.indexOf(entity);
            if (index !== -1) {
                this.allRendezvous.splice(index, 1);
            }
            this.clearReferencesToDestination(entity);
            this.spatialPartition.removeEntity(entity, Common.SpatialConstants.ENTITY_TYPE_RENDEZVOUS);
        }
    }

    setDisplay(display) {
        this.display = display;
        // Select the player's home star after display is set
        // Use setTimeout to ensure the display is fully constructed
        setTimeout(() => {
            if(!this.restoredFromSave)this.selectHomeStar();
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
        } else if (this.factory.isRendezvous && this.factory.isRendezvous(object)) {
            return Common.ObjectType.RENDEZVOUS;
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

    getComputerAdvantageForOwner(ownerId) {
        const player = this.players ? this.players[ownerId] : null;
        if (!player || !player.isComputer) {
            return 0;
        }
        if (typeof player.compAdvantage === 'number') {
            return player.compAdvantage;
        }
        return this.config && typeof this.config.compAdvantage === 'number' ? this.config.compAdvantage : 0;
    }

    applyComputerAdvantageToProduction(ownerId, amount, integerPayment = false) {
        if (!Number.isFinite(amount) || amount <= 0) {
            return amount;
        }

        const advantage = this.getComputerAdvantageForOwner(ownerId);
        if (!advantage) {
            return amount;
        }

        if (integerPayment) {
            const increase = Math.trunc(amount * (advantage * 20) / 100);
            return Math.max(0, amount + increase);
        }
        return Math.max(0, amount * (1 + (advantage * 0.20)));
    }

    getShipTypeForDefaultBuildType(defaultBuildType) {
        const hullTypes = ['defense', 'scout', 'colony', 'battleship'];
        const hullIndex = Math.floor(defaultBuildType || 1) - 1;
        return hullTypes[hullIndex] || hullTypes[0];
    }

    getLegacyAllocationPercent(value, fallback = 0) {
        const normalized = Number.isFinite(value) ? value : fallback;
        return Math.round(Math.max(0, Math.min(1000, normalized))) / 10;
    }

    applyNewColonyDefaults(star, previousOwner = 0) {
        if (!star || previousOwner !== 0 || !this.players) {
            return false;
        }

        const player = this.players[star.owner];
        if (!player) {
            return false;
        }

        let changed = false;
        if (player.isHuman) {
            this.setAllocationDesired(star.growth, this.getLegacyAllocationPercent(player.defaultGrowth, 334));
            this.setAllocationDesired(star.shipBuilding, this.getLegacyAllocationPercent(player.defaultShips, 333));
            this.setAllocationDesired(star.research, this.getLegacyAllocationPercent(player.defaultTech, 333));
            this.normalizeStarAllocations(star);
            changed = true;
        }

        const buildType = player.isComputer ? 'defense' : this.getShipTypeForDefaultBuildType(player.defaultBuildType);
        if (buildType && !star.currentShip && typeof star.startBuildingShip === 'function') {
            star.startBuildingShip(buildType);
            changed = true;
        }

        return changed;
    }

    transferScoutTechnologyFromContainer(ship, container) {
        if (!ship || ship.type !== 'scout' || !container || !Number.isFinite(container.techLevel)) {
            return false;
        }

        if (container.techLevel > ship.techLevel) {
            ship.techLevel = container.techLevel;
            return true;
        }

        return false;
    }

    handleShipDepartureTechnology(ship, oldContainer) {
        return this.transferScoutTechnologyFromContainer(ship, oldContainer);
    }

    getTechnologyTransferStar(destination) {
        if (!destination || typeof this.getObjectType !== 'function') {
            return null;
        }

        const objectType = this.getObjectType(destination);
        if (objectType === Common.ObjectType.STAR) {
            return destination;
        }
        if (objectType === Common.ObjectType.SHIP) {
            if (destination.star) {
                return destination.star;
            }
            if (destination.fleet && destination.fleet.getDockedStar()) {
                return destination.fleet.getDockedStar();
            }
        }
        if (objectType === Common.ObjectType.FLEET) {
            return destination.getDockedStar();
        }

        return null;
    }

    applyTechnologyTransferToStar(carrier, star) {
        if (!carrier || !star || star.owner <= 0 || !this.isOwnerAlliedWith(carrier.owner, star.owner)) {
            return false;
        }

        const carrierTechLevel = Number.isFinite(carrier.techLevel) ? carrier.techLevel : 0;
        const starTechLevel = Number.isFinite(star.techLevel) ? star.techLevel : 0;

        let changed=false;
        if (carrierTechLevel > starTechLevel) {
            star.techLevel = carrierTechLevel;
            if (typeof star.setScannerRange === 'function' && this.rules && typeof this.rules.getScanRangeForTechLevel === 'function') {
                star.setScannerRange(this.rules.getScanRangeForTechLevel(star.techLevel));
            }
            changed=true;
        } else if (carrier.type === 'scout' && starTechLevel > carrierTechLevel) {
            carrier.techLevel = starTechLevel;
            changed=true;
        }
        // v3 reselects the current hull even when no library level changed.
        star.refreshSelectedHullPrice();
        return changed;
    }

    applyTechnologyTransferToDestination(carrier, destination) {
        return this.applyTechnologyTransferToStar(carrier, this.getTechnologyTransferStar(destination));
    }

    refreshDockedScoutTechnologyAtStar(star) {
        if (!star || !star.ships) {
            return false;
        }

        let changed = false;
        for (const ship of [...star.ships]) {
            if (!ship || ship.type !== 'scout' || ship.fleet || ship.destination || (ship.underConstruction && ship.underConstruction())) {
                continue;
            }
            if (this.applyTechnologyTransferToStar(ship, star)) {
                changed = true;
            }
        }
        return changed;
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
        return key <= 0x10ffff ? String.fromCodePoint(key) : '';
    }

    getSelectedStar() {
        if (this.selectedObject && this.getObjectType(this.selectedObject) === Common.ObjectType.STAR) {
            return this.selectedObject;
        }
        return null;
    }

    getSelectedFleet() {
        if (this.selectedObject && this.getObjectType(this.selectedObject) === Common.ObjectType.FLEET) {
            return this.selectedObject;
        }
        return null;
    }

    getSelectedRendezvous() {
        if (this.selectedObject && this.getObjectType(this.selectedObject) === Common.ObjectType.RENDEZVOUS) {
            return this.selectedObject;
        }
        return null;
    }

    getStarDisplayName(star) {
        return ChartNames.displayName(this,star,this.getCurrentHumanPlayer());
    }

    getObjectDisplayName(object, options = {}) {
        if (!object) {
            return I18n.getString(639, 'target');
        }

        const objectType = this.getObjectType(object);
        if (objectType === Common.ObjectType.STAR) {
            return object.namedStar||ChartNames.isHome(this,object)?this.getStarDisplayName(object):object.name || I18n.getString(541, 'Selected object');
        }
        if (objectType === Common.ObjectType.SHIP) {
            return object.name || I18n.getShipTypeName(object.type);
        }
        if (objectType === Common.ObjectType.FLEET) {
            if (options.rawName && object.name) {
                return object.name;
            }
            return object.name || I18n.formatString(560, 'Fleet {0}', object.id);
        }
        if (objectType === Common.ObjectType.RENDEZVOUS) {
            if (options.rawName && object.name) {
                return object.name;
            }
            return object.name || I18n.formatString(655, 'Rendezvous {0}', object.id);
        }

        return object.name || object.type || I18n.getString(541, 'Selected object');
    }

    getPlayerRendezvous(owner = this.getCurrentHumanPlayer()) {
        if (!owner || !this.allRendezvous) {
            return [];
        }
        return this.allRendezvous.filter(rendezvous => rendezvous.owner === owner);
    }

    getPlayerFleets(owner = this.getCurrentHumanPlayer()) {
        if (!owner || !this.allFleets) {
            return [];
        }
        return this.allFleets.filter(fleet => fleet.owner === owner && (!fleet.isEmpty || !fleet.isEmpty()));
    }

    getFleetListRows(owner = this.getCurrentHumanPlayer()) {
        if(!owner)return [];
        const objects=this.getPlayerFleets(owner).filter(fleet=>!fleet.fleet).concat(
            this.allShips.filter(ship=>ship.owner===owner && !ship.fleet && !ship.isDead() &&
                !(ship.star && ship.type==='defense')),this.getPlayerRendezvous(owner));
        const rows=objects.map(object=>{
            const point=this.factory.isRendezvous(object),fleet=this.factory.isFleet(object);
            const unit=point?object.getFleet():object;
            if(unit && this.factory.isFleet(unit))unit.calculateFleetStats();
            const patrol=!!unit && unit.isOnPatrol(),target=point?object:unit && unit.destination;
            const coordinates=point=>I18n.formatString(656,'({0}, {1})',I18n.formatDecimal(point.x/65536,2),I18n.formatDecimal(point.y/65536,2));
            const destination=point?coordinates(object):patrol?I18n.getString(703,'Patrolling'):target?
                (this.getObjectType(target)?this.getObjectDisplayName(target):coordinates(target)):'—';
            const colony=unit?(this.factory.isFleet(unit)?(unit.hasShipType('colony')?2:0):(unit.type==='colony'?1:0)):0;
            return {object,kind:point?'rendezvous':fleet?'fleet':'ship',name:this.getObjectDisplayName(object),
                tech:unit?Math.trunc(unit.techLevel):0,speed:unit?(unit.speed || 0):0,power:unit?(unit.power || 0):0,
                ships:unit&&this.factory.isFleet(unit)?unit.getSize():0,
                damage:unit?unit.getDamagePercent():0,colony,destination,destinationRank:point?1:patrol?2:target?1:0};
        });
        const sort=this.fleetRosterSort;
        rows.sort((a,b)=>{
            const comparison=sort.key==='destination'?
                a.destinationRank-b.destinationRank || (a.destinationRank===1?a.destination.localeCompare(b.destination):0):
                sort.key==='name'?a.name.localeCompare(b.name):a[sort.key]-b[sort.key];
            return (sort.ascending?comparison:-comparison) || a.kind.localeCompare(b.kind) || a.object.id-b.object.id;
        });
        return rows;
    }

    selectFleetRosterObject(object) {
        if(!this.getFleetListRows().some(row=>row.object===object))return false;
        const now=this.getCurrentMilliseconds(),previous=this.fleetRosterLastClick;
        this.setSelectedObject(object);
        if(this.display)this.display.centerOn(object.x,object.y);
        if(previous && previous.object===object && now>=previous.time && now-previous.time<=500) {
            this.saveTableWindowGeometry();this.uiWindow=null;this.fleetRosterLastClick=null;
        } else this.fleetRosterLastClick={object,time:now};
        return true;
    }

    beginRendezvousPlacement(rendezvous = null) {
        const owner = this.getCurrentHumanPlayer();
        if (!owner) {
            return false;
        }
        if (rendezvous && !this.canHumanControl(rendezvous)) {
            this.recordEvent(
                I18n.getString(602, 'Command'),
                I18n.getString(663, 'You can only manage your own objects.'),
                { type: 'ui' }
            );
            return true;
        }
        this.pendingRendezvousPlacement = {
            mode: rendezvous ? 'move' : 'create',
            rendezvous,
            owner
        };
        this.recordEvent(
            I18n.getString(567, 'Rendezvous'),
            rendezvous ?
                I18n.formatString(659, 'Click the map or an object to move {0}.', this.getObjectDisplayName(rendezvous)) :
                I18n.getString(658, 'Click the map or an object to place a rendezvous point.'),
            { type: 'ui' }
        );
        return true;
    }

    createRendezvousAt(x, y, owner = this.getCurrentHumanPlayer(), name = null, anchor = null) {
        if (!owner) {
            return null;
        }
        const rendezvous = this.factory.createRendezvous(x, y, owner, name, anchor);
        this.recordEvent(
            I18n.getString(567, 'Rendezvous'),
            I18n.formatString(660, '{0} placed at ({1}, {2})', this.getObjectDisplayName(rendezvous), Math.round(x / 1024), Math.round(y / 1024)),
            { type: Common.EventType.RENDEZVOUS_UPDATED }
        );
        return rendezvous;
    }

    createRendezvousForObject(object) {
        if (!object || !this.canHumanControl(object)) {
            this.recordEvent(
                I18n.getString(602, 'Command'),
                I18n.getString(663, 'You can only manage your own objects.'),
                { type: 'ui' }
            );
            return true;
        }
        const rendezvous = this.createRendezvousAt(object.x, object.y, object.owner, null, object);
        if (rendezvous) {
            this.setSelectedObject(rendezvous);
        }
        return true;
    }

    moveRendezvous(rendezvous, x, y, anchor = null) {
        if (!rendezvous || !this.canHumanControl(rendezvous)) {
            return false;
        }
        rendezvous.moveTo(x, y, anchor);
        this.recalculateDestinationsTargeting(rendezvous);
        this.recordEvent(
            I18n.getString(567, 'Rendezvous'),
            I18n.formatString(661, '{0} moved to ({1}, {2})', this.getObjectDisplayName(rendezvous), Math.round(x / 1024), Math.round(y / 1024)),
            { type: Common.EventType.RENDEZVOUS_UPDATED }
        );
        return true;
    }

    deleteRendezvous(rendezvous) {
        if (!rendezvous || !this.canHumanControl(rendezvous)) {
            return false;
        }
        const name = this.getObjectDisplayName(rendezvous);
        this.entityRemoved(rendezvous);
        this.recordEvent(
            I18n.getString(567, 'Rendezvous'),
            I18n.formatString(662, '{0} deleted', name),
            { type: Common.EventType.RENDEZVOUS_UPDATED }
        );
        return true;
    }

    clearReferencesToDestination(destination) {
        if (!destination) {
            return false;
        }
        let changed = false;
        for (const star of this.stars || []) {
            if (star.getDefaultDestination && star.getDefaultDestination() === destination) {
                star.clearDefaultDestination();
                changed = true;
            }
        }
        for (const object of [...this.allShips || [],...this.allFleets || []]) {
            if (object.course) {
                for (let index=object.course.waypoints.length-1;index>=0;index--) {
                    if (object.course.waypoints[index].target===destination) {
                        object.course.delete(index);changed=true;
                    }
                }
            } else if (object.destination===destination) { object.destination=null;changed=true; }
        }
        return changed;
    }

    clearRendezvousFleetReferences(fleet) {
        let changed = false;
        for (const rendezvous of this.allRendezvous || []) {
            if (rendezvous.fleet === fleet) {
                rendezvous.setFleet(null);
                changed = true;
            }
        }
        return changed;
    }

    replaceRendezvousFleetReference(oldFleet, newFleet) {
        let changed = false;
        for (const rendezvous of this.allRendezvous || []) {
            if (rendezvous.fleet === oldFleet) {
                rendezvous.setFleet(newFleet);
                changed = true;
            }
        }
        return changed;
    }

    refreshRendezvousFleetReferences() {
        for (const rendezvous of this.allRendezvous || []) {
            if (rendezvous.syncToAnchor && rendezvous.syncToAnchor()) {
                this.recalculateDestinationsTargeting(rendezvous);
            }
            if (rendezvous.clearFleetIfAway) {
                rendezvous.clearFleetIfAway();
            }
        }
    }

    recalculateDestinationsTargeting(destination) {
        if (!destination) {
            return false;
        }
        let changed = false;
        for (const fleet of this.allFleets || []) {
            if (fleet.destination === destination && fleet.calculateMovement) {
                fleet.calculateMovement();
                changed = true;
            }
        }
        return changed;
    }

    finishRendezvousPlacementAt(screenX, screenY, target) {
        if (!this.pendingRendezvousPlacement || !this.display) {
            return false;
        }

        const placement = this.pendingRendezvousPlacement;
        this.pendingRendezvousPlacement = null;
        const clickedObject = target || this.findObjectAtPosition(screenX, screenY);
        const anchorType = clickedObject ? this.getObjectType(clickedObject) : Common.ObjectType.UNKNOWN;
        const anchor = (
            anchorType === Common.ObjectType.STAR ||
            anchorType === Common.ObjectType.SHIP ||
            anchorType === Common.ObjectType.FLEET
        ) ? clickedObject : null;
        const x = anchor ? anchor.x : this.display.toGalacticX(screenX);
        const y = anchor ? anchor.y : this.display.toGalacticY(screenY);

        if (placement.mode === 'move' && placement.rendezvous) {
            this.moveRendezvous(placement.rendezvous, x, y, anchor);
            this.setSelectedObject(placement.rendezvous);
        } else {
            const rendezvous = this.createRendezvousAt(x, y, placement.owner, null, anchor);
            this.setSelectedObject(rendezvous);
        }
        return true;
    }

    beginRenameObject(object = this.selectedObject) {
        if (!object || !this.canHumanControl(object)) {
            this.recordEvent(
                I18n.getString(602, 'Command'),
                I18n.getString(663, 'You can only manage your own objects.'),
                { type: 'ui' }
            );
            return true;
        }
        const objectType = this.getObjectType(object);
        if (![Common.ObjectType.STAR, Common.ObjectType.SHIP, Common.ObjectType.FLEET, Common.ObjectType.RENDEZVOUS].includes(objectType)) {
            return false;
        }
        this.renameTarget = object;
        this.renameText = this.getObjectDisplayName(object, { rawName: true });
        this.uiWindow = 'rename';
        return true;
    }

    commitRename() {
        if (!this.renameTarget) {
            this.uiWindow = null;
            return false;
        }
        const newName = this.renameText.trim();
        if (newName.length > 0) {
            const oldName = this.getObjectDisplayName(this.renameTarget);
            this.renameTarget.name = newName;
            if (this.getObjectType(this.renameTarget) === Common.ObjectType.RENDEZVOUS &&
                    this.renameTarget.fleet &&
                    (!this.renameTarget.fleet.name || this.renameTarget.fleet.name === oldName)) {
                this.renameTarget.fleet.name = newName;
            }
            this.recordEvent(
                I18n.getString(602, 'Command'),
                I18n.formatString(664, '{0} renamed to {1}', oldName, newName),
                { type: 'ui' }
            );
        }
        this.renameTarget = null;
        this.renameText = '';
        this.uiWindow = null;
        return true;
    }

    handleRenameKey(key, char) {
        if (key === 13 || key === 3 || char === '\r' || char === '\n') {
            return this.commitRename();
        }
        if (key === 8 || key === 127) {
            this.renameText = Array.from(this.renameText).slice(0, -1).join('');
            return true;
        }
        if (char && Array.from(char).length === 1 && char.codePointAt(0) >= 32 &&
                !/[\u007f-\u009f]/.test(char) && Array.from(this.renameText).length < 32) {
            this.renameText += char;
            return true;
        }
        return true;
    }

    openUIWindow(windowName) {
        this.endUIWindowDrag();
        this.saveTableWindowGeometry();
        if (this.mapSelectionPicker) this.cancelMapSelection();
        this.uiWindow = windowName;
        if(windowName==='fleets')this.fleetRosterLastClick=null;
        if(windowName==='systemComparison')this.systemComparisonLastClick=null;
        return true;
    }

    toggleUIWindow(windowName) {
        this.endUIWindowDrag();
        this.saveTableWindowGeometry();
        if (this.mapSelectionPicker) this.cancelMapSelection();
        this.uiWindow = (this.uiWindow === windowName) ? null : windowName;
        if(windowName==='fleets')this.fleetRosterLastClick=null;
        if(windowName==='systemComparison')this.systemComparisonLastClick=null;
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

        if(['outcome','report'].includes(overlay.type)){this.endUIWindowDrag();this.endMapScrollDrag();this.endUISliderDrag();if(this.uiWindow==='endTurnConfirm')this.uiWindow=null;}
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

    queueOutcome(event,kind,playerNum=0) {
        const player=this.players && this.players[playerNum];
        event.outcome={kind,playerNum,name:player && player.name?player.name:`${I18n.getString(18,'Player')} ${playerNum}`,turn:event.turn};
        return this.queueEventOverlay({type:'outcome',...event.outcome,eventId:event.id,page:0});
    }

    replayOutcome(event) {
        if(!this.getEventRows().includes(event) || !event.outcome)return false;
        this.uiWindow=null;
        return this.queueEventOverlay({type:'outcome',...event.outcome,eventId:event.id,page:0});
    }

    hasReplayableReport(event) {
        return !!(event && (event.combat || event.occupation));
    }

    queueReport(event) {
        if (!this.hasReplayableReport(event) || !this.isEventAccessible(event)) return false;
        return this.queueEventOverlay({type:'report',eventId:event.id,page:0});
    }

    replayReport(event) {
        if (!this.getEventRows().includes(event) || !this.hasReplayableReport(event) || !this.isEventAccessible(event)) return false;
        this.uiWindow=null;
        return this.queueReport(event);
    }

    dismissEventPresentation() {
        if (!this.hasEventPresentation()) {
            return false;
        }

        if(this.overlay && ['outcome','report'].includes(this.overlay.type)) {
            const event=this.eventLog.find(event=>event.id===this.overlay.eventId);
            if(event)this.focusEvent(event);
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
        let closedAny = this.cancelMapSelection();

        if (this.clearEventPresentations()) {
            closedAny = true;
        }

        if (['events','endTurnConfirm'].includes(this.uiWindow)) {
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
        const subject=options.subject || null;
        const source=options.position || subject;
        const position=source && Number.isFinite(source.x) && Number.isFinite(source.y)?{x:source.x,y:source.y}:null;
        const event={
            id:++this.nextEventId,turn:options.turn || this.turn,title,message,
            type:options.type || 'game',subject,position,recipient:options.recipient,
            handled:false,
            createdAt:(typeof pdg!=='undefined' && pdg.tm && pdg.tm.getMilliseconds)?pdg.tm.getMilliseconds():Date.now()
        };
        this.eventLog.push(event);
        // Keep every current/last-turn report, even in a busy construction turn.
        while(this.eventLog.length>80 && this.eventLog[0].turn<Math.max(1,this.turn-1))this.eventLog.shift();
        return event;
    }

    isEventAccessible(event) {
        if(!event || !this.eventLog.includes(event))return false;
        const player=this.getCurrentHumanPlayer();
        if(event.recipient!==undefined && event.recipient!==player)return false;
        if(event.type===Common.EventType.RENAME_COLONY && (!this.stars.includes(event.subject) || event.subject.owner!==player))return false;
        const subject=event.subject;
        return !subject || event.recipient===player || this.config.omniscient ||
            subject.owner===player || subject.isAllyOf && subject.isAllyOf(player) ||
            subject.getVisibilityTo && subject.getVisibilityTo(player)>Common.VisibilityLevel.NONE;
    }

    getEventRows() {
        const reportTurn=Math.max(1,this.turn-1);
        // Terminal turns do not advance; their reports must remain available for replay.
        return this.eventLog.filter(event=>(event.turn===reportTurn ||
            (event.outcome || this.isGameOver && this.hasReplayableReport(event)) && event.turn===this.turn) && this.isEventAccessible(event));
    }

    getEventFocus(event) {
        if(!this.isEventAccessible(event))return null;
        const player=this.getCurrentHumanPlayer(),subject=event.subject;
        const live=subject && (this.stars.includes(subject) || this.allShips.includes(subject) && !subject.isDead() ||
            this.allFleets.includes(subject) && !subject.isEmpty() || this.allRendezvous.includes(subject));
        if(live && (subject.owner===player || this.config.omniscient || subject.isAllyOf && subject.isAllyOf(player) ||
            subject.getVisibilityTo && subject.getVisibilityTo(player)>Common.VisibilityLevel.NONE))return {object:subject.fleet || subject,x:subject.x,y:subject.y};
        // Private reports may still point to the remembered position of a lost subject.
        if(event.position && (!subject || event.recipient===player || this.config.omniscient))return {...event.position,object:null};
        return null;
    }

    focusEvent(event,closeWindow=false) {
        if(!this.isEventAccessible(event))return false;
        event.handled=true;this.attention.handleEvent(event);
        if(event.type===Common.EventType.RENAME_COLONY)this.eventSelection=event.id;
        const focus=this.getEventFocus(event);
        if(focus) {
            this.setSelectedObject(focus.object);
            if(this.display)this.display.centerOn(focus.x,focus.y);
        }
        if(closeWindow)this.uiWindow=null;
        return true;
    }

    selectEvent(event) {
        if(!this.getEventRows().includes(event))return false;
        this.eventSelection=event.id;this.eventDetailPage=0;
        return this.focusEvent(event);
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
        if (!Number.isFinite(value)) return false;
        const desired = this.clampAllocationValue(Math.round(value * 10) / 10);
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
        const entries = this.getStarAllocationEntries(star);
        const unlocked = entries.filter(entry => entry.allocation && !entry.allocation.locked);
        unlocked.forEach(entry => this.setAllocationDesired(entry.allocation,this.getAllocationDesired(entry.allocation)));
        // Work in v3's integer 0–1000 units, retaining the public percentage representation.
        let remaining = 1000-entries.reduce((sum,entry)=>sum+Math.round(this.getAllocationDesired(entry.allocation)*10),0);
        if (!Number.isFinite(remaining)) return;
        while (remaining!==0 && unlocked.length) {
            const direction=remaining>0?1:-1;
            const ordered=[...unlocked].sort((a,b)=>direction*(this.getAllocationDesired(a.allocation)-this.getAllocationDesired(b.allocation)));
            const target=ordered.find(entry=>{const units=Math.round(this.getAllocationDesired(entry.allocation)*10);return units+direction>=0&&units+direction<=1000;});
            if (!target) break;
            const units=Math.round(this.getAllocationDesired(target.allocation)*10);
            this.setAllocationDesired(target.allocation,(units+direction)/10); remaining-=direction;
        }
    }

    adjustStarAllocation(star,allocationKey,delta,options = {}) {
        if (!star || !this.canHumanControl(star) || !Number.isFinite(delta)) return false;
        const entries=this.getStarAllocationEntries(star);
        const target=entries.find(entry=>entry.key===allocationKey);
        if (!target || target.allocation.locked) return false;
        const others=entries.filter(entry=>entry!==target && !entry.allocation.locked);
        if (!others.length) return false;
        const oldUnits=Math.round(this.getAllocationDesired(target.allocation)*10);
        const desiredUnits=Math.round(this.clampAllocationValue(oldUnits/10+delta)*10);
        let remaining=desiredUnits-oldUnits;
        if (!remaining) return false;
        const direction=remaining>0?-1:1;
        // Share the change across unlocked neighbors, spilling at an endpoint.
        while (remaining!==0) {
            let changed=false;
            for (const entry of others) {
                if (remaining===0) break;
                const units=Math.round(this.getAllocationDesired(entry.allocation)*10);
                const next=units+direction;
                if (next>=0 && next<=1000) {
                    this.setAllocationDesired(entry.allocation,next/10); remaining+=direction; changed=true;
                }
            }
            if (!changed) break;
        }
        const applied=desiredUnits-oldUnits-remaining;
        if (!applied) return false;
        this.setAllocationDesired(target.allocation,(oldUnits+applied)/10);
        this.normalizeStarAllocations(star);
        if (!options.silent) this.recordProductionChange(star);
        return true;
    }

    toggleStarAllocationLock(star, allocationKey) {
        if (!star || !this.canHumanControl(star)) return false;
        const entry = this.getStarAllocationEntries(star).find(item => item.key === allocationKey);
        if (!entry || !entry.allocation) return false;
        entry.allocation.setLocked(!entry.allocation.locked);
        return true;
    }

    adjustSelectedStarAllocation(allocationKey, delta) {
        return this.adjustStarAllocation(this.getSelectedStar(), allocationKey, delta);
    }

    setStarAllocation(star, allocationKey, desired, options = {}) {
        const entries = this.getStarAllocationEntries(star);
        const targetEntry = entries.find(entry => entry.key === allocationKey);
        if (!targetEntry) {
            return false;
        }

        const current = this.getAllocationDesired(targetEntry.allocation);
        return this.adjustStarAllocation(star, allocationKey, desired - current, options);
    }

    resetSelectedStarAllocations() {
        const star = this.getSelectedStar();
        if (!star || !this.canHumanControl(star)) {
            return false;
        }
        const entries = this.getStarAllocationEntries(star);
        const unlocked = entries.filter(entry => !entry.allocation.locked);
        if (!unlocked.length) return false;
        const budget = 1000 - entries.filter(entry => entry.allocation.locked)
            .reduce((sum, entry) => sum + Math.round(this.getAllocationDesired(entry.allocation)*10), 0);
        const share = Math.floor(budget / unlocked.length);
        unlocked.forEach((entry, index) => this.setAllocationDesired(entry.allocation,
            (share + (index === 0 ? budget - share * unlocked.length : 0))/10));
        this.recordProductionChange(star);
        return true;
    }

    recordProductionChange(star) {
        const growth = this.getAllocationDesired(star.growth);
        const ships = this.getAllocationDesired(star.shipBuilding);
        const research = this.getAllocationDesired(star.research);
        this.recordEvent(
            I18n.getString(603, 'Production'),
            I18n.formatString(621, '{0}: Growth {1}% / Ships {2}% / Research {3}%', star.name, I18n.formatPercentage(growth), I18n.formatPercentage(ships), I18n.formatPercentage(research)),
            { type: 'ui' }
        );
    }

    handleCommandWindowKey(key, char) {
        if(this.uiWindowDrag && key===pdg.key_Escape){this.endUIWindowDrag();return true;}
        if(this.uiWindow==='mapPick') {
            if(key===pdg.key_Escape)return this.cancelMapSelection();
            const index=Number(char)-1;
            if(Number.isInteger(index) && index>=0 && index<6) {
                const object=this.getMapSelectionRows().slice(this.mapSelectionPicker.page*6)[index];
                if(object)return this.chooseMapSelection(object);
            }
            return true;
        }
        if (!this.uiWindow) {
            return false;
        }

        const lower = char.toLowerCase();
        if(this.uiWindow==='games') {
            if(key===pdg.key_Escape)this.uiWindow=null;
            else if(key===pdg.key_LeftArrow)this.gameSessionPage=Math.max(0,(this.gameSessionPage || 0)-1);
            else if(key===pdg.key_RightArrow)this.gameSessionPage=(this.gameSessionPage || 0)+1;
            return true;
        }
        if(this.uiWindow==='menu' && this.sessionCommands) {
            if(lower==='n')return this.executeUIAction({type:'newGame'});
            if(lower==='g')return this.executeUIAction({type:'showGames'});
        }

        if(this.uiWindow==='view') {
            if(key===pdg.key_Escape)this.uiWindow=null;
            else if(key===pdg.key_Home)this.executeUIAction({type:'selectHomeStar'});
            else if(lower==='+' || lower==='=')this.executeUIAction({type:'zoomIn'});
            else if(lower==='-')this.executeUIAction({type:'zoomOut'});
            else if(lower==='0' || lower==='*' || lower==='f')this.executeUIAction({type:'zoomToFit'});
            else if(char==='C')this.executeUIAction({type:'centerSelected'});
            return true;
        }
        if(key===pdg.key_Home && this.uiWindow==='menu')return this.executeUIAction({type:'selectHomeStar'});
        if(this.uiWindow==='comparison') {
            if(key===pdg.key_Escape || lower==='v')this.uiWindow=null;
            return true;
        }
        if(this.uiWindow==='systemComparison') {
            if(key===pdg.key_Escape){this.saveTableWindowGeometry();this.uiWindow=null;}
            else if(key===13 || key===3)this.openSystemComparisonSelection();
            return true;
        }
        if(this.uiWindow==='fleetExchange' || this.uiWindow==='fleets') {
            if(key===pdg.key_Escape){this.saveTableWindowGeometry();this.uiWindow=null;}
            return true;
        }
        if(this.uiWindow==='settings' || this.uiWindow==='mapDisplay') {
            if(key===pdg.key_Escape)this.uiWindow=null;
            return true;
        }

        if (this.uiWindow === 'colonyDefaults') {
            if (key === pdg.key_Escape) return this.cancelColonyDefaults();
            if (key === 13 || key === 3) return this.saveColonyDefaults();
            return true;
        }

        if (this.uiWindow === 'rename') {
            if (key === pdg.key_Escape) {
                this.renameTarget = null;
                this.renameText = '';
                this.uiWindow = null;
                return true;
            }
            return this.handleRenameKey(key, char);
        }

        if (key === pdg.key_Escape) {
            this.uiWindow = null;
            return true;
        }

        if(this.uiWindow==='endTurnConfirm') {
            if(key===13 || key===3)this.endTurn();
            return true;
        }

        if(this.uiWindow==='events') {
            if(key===13 || key===3) {
                const event=this.getEventRows().find(event=>event.id===this.eventSelection);
                if(event && event.outcome)this.replayOutcome(event);else if(this.hasReplayableReport(event))this.replayReport(event);else if(event)this.focusEvent(event,true);else this.requestEndTurn();
                return true;
            }
        }

        if (this.uiWindow==='course') {
            if (lower==='a') this.beginCourseEdit(false);
            else if (lower==='e') this.beginCourseEdit(true);
            else if (key===127 || key===8 || lower==='d') this.executeUIAction({type:'deleteWaypoint'});
            else if (lower==='x') this.clearOrders(this.courseWindowObject);
            else if (lower==='l') this.executeUIAction({type:'toggleCourseLoop'});
            else if (lower==='m') this.executeUIAction({type:'swapCourseMemory'});
            else if (lower==='h') this.executeUIAction({type:'toggleCourseHunt'});
            else if (lower==='p') this.togglePatrol(this.courseWindowObject);
            else if (lower==='c') this.toggleCallIn(this.courseWindowObject);
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
            case 'l':
                return this.toggleUIWindow('fleets');
            case 'u':
                return this.beginRendezvousPlacement();
            case 'h':
                return this.executeUIAction({type:'toggleCourseHunt',object:this.selectedObject});
            case 'f':
                if (this.display) {
                    this.display.zoomToFit();
                }
                return true;
            case '0':
            case '*':
                if (this.display) {
                    this.display.zoomToFit();
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
            case 'p': {
                const type=this.getObjectType(this.selectedObject);
                if([Common.ObjectType.SHIP,Common.ObjectType.FLEET].includes(type)) {
                    this.togglePatrol(this.selectedObject);return true;
                }
                return this.toggleProductionWindow();
            }
            case 'v':
                return this.toggleUIWindow('comparison');
            case 'l':
                return this.toggleUIWindow('fleets');
            case 'u':
                return this.beginRendezvousPlacement();
            default:
                return false;
        }
    }

    setSelectedObject(object) {
        if (this.selectedObject !== object) this.fleetMemberPage = 0;
        this.selectedObject = object;
        const colonyRequest=this.attention.pending().find(entry=>entry.object===object && entry.event && entry.event.type===Common.EventType.RENAME_COLONY);
        if(colonyRequest)this.eventSelection=colonyRequest.event.id;
        this.attention.attend(object);
        if (this.display) {
            this.display.setSelectedObject(object);
        }
    }

    beginColonyDefaults() {
        const playerNum = this.getCurrentHumanPlayer();
        const player = this.players[playerNum];
        if (!player || !player.isHuman) return false;
        this.colonyDefaultsDraft = { playerNum, defaultGrowth: player.defaultGrowth,
            defaultShips: player.defaultShips, defaultTech: player.defaultTech,
            defaultBuildType: player.defaultBuildType };
        this.uiWindow = 'colonyDefaults';
        return true;
    }

    setColonyDefaultAllocation(key,value) {
        const draft = this.colonyDefaultsDraft;
        const keys = ['defaultGrowth','defaultShips','defaultTech'];
        if (!draft || !keys.includes(key) || !Number.isFinite(value) ||
            keys.some(other => !Number.isInteger(draft[other]) || draft[other]<0 || draft[other]>1000) ||
            keys.reduce((sum,other)=>sum+draft[other],0)!==1000) return false;
        const desired = Math.max(0,Math.min(1000,Math.round(value)));
        let remaining = desired-draft[key];
        const direction = remaining > 0 ? -1 : 1;
        const others = keys.filter(other => other!==key);
        while (remaining !== 0) {
            let changed = false;
            for (const other of others) {
                if (remaining===0) break;
                const next = draft[other]+direction;
                if (next >= 0 && next <= 1000) {
                    draft[other] = next; remaining+=direction; changed=true;
                }
            }
            if (!changed) return false;
        }
        draft[key] = desired;
        return true;
    }

    saveColonyDefaults() {
        const draft = this.colonyDefaultsDraft;
        const player = draft && this.players[draft.playerNum];
        if (!player || !player.isHuman) return false;
        const values = [draft.defaultGrowth,draft.defaultShips,draft.defaultTech];
        if (values.some(value => !Number.isInteger(value) || value<0 || value>1000) ||
            values.reduce((sum,value)=>sum+value,0)!==1000 ||
            !Number.isInteger(draft.defaultBuildType) || draft.defaultBuildType<1 || draft.defaultBuildType>4) return false;
        player.setDefaultEconomics(draft.defaultGrowth,draft.defaultTech,draft.defaultShips);
        player.setDefaultBuildType(draft.defaultBuildType);
        this.colonyDefaultsDraft = null;
        this.uiWindow = null;
        return true;
    }

    cancelColonyDefaults() {
        this.colonyDefaultsDraft = null;
        this.uiWindow = null;
        return true;
    }

    canViewSystemShips(star) {
        if (!star || this.getObjectType(star) !== Common.ObjectType.STAR) return false;
        if (this.config.omniscient || this.canHumanControl(star)) return true;
        const player = this.getCurrentHumanPlayer();
        if (star.isAllyOf(player)) return true;
        if (star.getVisibilityTo(player) >= Common.VisibilityLevel.DETAILS) return true;
        return !star.owner && this.allShips.some(ship => ship.star === star && this.canHumanControl(ship) &&
            !ship.underConstruction());
    }

    getSystemComparisonRows() {
        const player = this.getCurrentHumanPlayer();
        if (!player) return [];
        const classNames = I18n.getString(800, 'Traveller').split('|');
        const rows = this.stars.filter(star => star.owner === player).map(star => {
            const build = star.currentShip;
            const buildName = !build ? I18n.getString(7, 'None') : build.type === 'battleship'
                ? classNames[Math.min(classNames.length - 1, Math.max(0, Math.floor(star.techLevel / 5)))]
                : I18n.getShipTypeName(build.type, { capitalized: true });
            const defense = star.getDefenseBreakdown();
            return { star, name: star.name, tech: Math.trunc(star.techLevel), population: Math.trunc(star.population),
                production: Math.trunc(star.getProduction() / 100), buildName,
                buildRank: !build ? -1 : build.type === 'battleship' ? 3 + Math.floor(star.techLevel / 5)
                    : {defense:0,scout:1,colony:2}[build.type],
                completion: build ? Math.trunc(build.progress) : 0,
                totalDefense: Math.trunc(defense.totalDefense / 100),
                satelliteDefense: Math.trunc(defense.satelliteDefense / 100),
                shipDefense: Math.trunc(defense.shipDefense / 100) };
        });
        const sort = this.systemComparisonSort;
        return rows.sort((a,b) => {
            const key=sort.key==='buildName'?'buildRank':sort.key;
            const order = typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key];
            return (sort.ascending ? order : -order) || a.star.id - b.star.id;
        });
    }

    openSystemComparisonSelection() {
        const star = this.systemComparisonSelection;
        if (!star || !this.getSystemComparisonRows().some(row => row.star === star)) return false;
        this.setSelectedObject(star);
        if (this.display) this.display.centerOn(star.x, star.y);
        this.endUIWindowDrag();
        this.saveTableWindowGeometry();
        this.uiWindow = null;
        this.systemComparisonLastClick = null;
        return true;
    }

    getSystemShipRows(star = this.systemShipWindowStar) {
        if (!this.canViewSystemShips(star)) return [];
        const isDocked = object => object.star === star || (!object.destination &&
            Math.round(object.x) === Math.round(star.x) && Math.round(object.y) === Math.round(star.y));
        const ships = this.allShips.filter(ship => !ship.fleet && !ship.underConstruction() && isDocked(ship));
        const fleets = this.allFleets.filter(fleet => !fleet.fleet && !fleet.isEmpty() && isDocked(fleet));
        const makeRow = (object, member = false) => {
            const fleet = this.factory.isFleet(object);
            return { object, member, name: this.getObjectDisplayName(object), tech: object.techLevel || 0,
                speed: (fleet ? object.totalSpeed : object.speed) / 16380,
                power: fleet ? object.totalPower : this.rules.getShipPower(object),
                damage: (fleet ? object.totalDamage : object.damage) || 0 };
        };
        const sort = this.systemShipSort;
        const compare = (a,b) => {
            const comparison = sort.key === 'name' ? a.name.localeCompare(b.name) : a[sort.key]-b[sort.key];
            return (sort.ascending ? comparison : -comparison) || a.object.id-b.object.id;
        };
        const rows = [];
        ships.concat(fleets).map(object => makeRow(object)).sort(compare).forEach(row => {
            rows.push(row);
            if (this.factory.isFleet(row.object)) row.object.ships.filter(ship => !ship.underConstruction())
                .map(ship => makeRow(ship,true)).sort(compare).forEach(member => rows.push(member));
        });
        return rows;
    }

    canViewFleetExchange(container) {
        if(this.factory.isStar(container))return this.stars.includes(container) && this.canViewSystemShips(container);
        return this.factory.isFleet(container) && this.allFleets.includes(container) &&
            !!this.display && this.display.getFleetKnowledge(container).contents;
    }

    showFleetExchange(container) {
        if(!this.canViewFleetExchange(container) || this.mapSelectionPicker || this.pendingMapOrderObject ||
            this.pendingCourseEdit || this.pendingRendezvousPlacement)return false;
        this.fleetExchange={container,active:null,selection:null,side:'main',pages:{main:0,sub:0},
            sort:{key:'name',ascending:true}};
        this.uiWindow='fleetExchange';return true;
    }

    getFleetExchangeMembers(container) {
        if(!this.canViewFleetExchange(container))return [];
        const members=this.factory.isFleet(container)?container.ships:
            this.getSystemShipRows(container).filter(row=>!row.member).map(row=>row.object);
        return members.filter(object=>(this.factory.isFleet(object)?this.allFleets:this.allShips).includes(object) &&
            !object.isDead() && !object.underConstruction() &&
            (!this.factory.isFleet(container) || object.fleet===container));
    }

    getFleetExchangeState() {
        const state=this.fleetExchange;
        if(!state || !this.canViewFleetExchange(state.container))return null;
        const main=this.getFleetExchangeMembers(state.container);
        if(state.active && (!main.includes(state.active) || !this.factory.isFleet(state.active) || !this.canViewFleetExchange(state.active))) {
            state.active=null;state.selection=null;
        }
        const sub=state.active?this.getFleetExchangeMembers(state.active):[];
        if(!(state.side==='sub'?sub:main).includes(state.selection))state.selection=null;
        return {...state,main,sub};
    }

    selectFleetExchangeMember(side,object) {
        const state=this.getFleetExchangeState();
        if(!state || !['main','sub'].includes(side) || !state[side].includes(object))return false;
        this.fleetExchange.selection=object;this.fleetExchange.side=side;
        if(side==='main' && this.factory.isFleet(object) && this.canViewFleetExchange(object)) {
            this.fleetExchange.active=object;this.fleetExchange.pages.sub=0;
        }
        return true;
    }

    canExchangeFleetMember() {
        const state=this.getFleetExchangeState(),object=state && state.selection;
        if(!object || !this.canHumanControl(object) || object.isOnPatrol() || object.type==='defense')return false;
        if(state.side==='main')return state.active?this.canTransferShipToFleet(object,state.active):
            (this.factory.isStar(state.container) || this.canHumanControl(state.container));
        if(this.factory.isFleet(state.container))return this.canTransferShipToFleet(object,state.container);
        return this.canHumanControl(state.active) && !state.active.destination &&
            state.active.getDockedStar()===state.container;
    }

    exchangeFleetMember() {
        if(!this.canExchangeFleetMember())return false;
        const state=this.getFleetExchangeState(),object=state.selection;
        let moved=false;
        if(state.side==='sub') {
            moved=this.factory.isFleet(state.container)?this.transferShipToFleet(object,state.container):
                this.separateShipFromFleet(state.active,object);
        } else if(state.active)moved=this.transferShipToFleet(object,state.active);
        else {
            const fleet=this.factory.createFleet(object.x,object.y,object.owner);
            fleet.star=this.factory.isStar(state.container)?state.container:null;
            if(!fleet.addShip(object)){this.entityRemoved(fleet);return false;}
            if(this.factory.isFleet(state.container))state.container.addShip(fleet);
            this.fleetExchange.active=fleet;
            this.recordEvent(I18n.getString(566,'Fleets'),I18n.formatString(669,'{0} formed at {1}',
                this.getObjectDisplayName(fleet),this.getObjectDisplayName(state.container)),{type:Common.EventType.FLEET_FORMED});
            moved=true;
        }
        if(moved)this.fleetExchange.selection=null;
        this.getFleetExchangeState();return moved;
    }

    canViewCourse(object) {
        const type = this.getObjectType(object);
        return !!object && [Common.ObjectType.SHIP,Common.ObjectType.FLEET].includes(type) &&
            (this.config.omniscient || object.isAllyOf(this.getCurrentHumanPlayer()));
    }

    canEditCourse(object) {
        return !!object && this.canHumanControl(object) && this.canViewCourse(object) &&
            (this.factory.isFleet(object) ? this.allFleets.includes(object) && !object.isEmpty()
                : this.allShips.includes(object) && !object.isDead() && !object.underConstruction() && !object.fleet && object.type!=='defense');
    }

    canToggleCourseHunt(object=this.courseWindowObject) {
        const speed=this.factory.isFleet(object)?object.totalSpeed:object && object.speed;
        return this.canEditCourse(object) && object.course.waypoints.length>0 && speed>0;
    }

    getCourseRows(object=this.courseWindowObject) {
        if (!this.canViewCourse(object) || !object.course) return [];
        const course=object.course, speed=this.factory.isFleet(object)?object.totalSpeed:object.speed;
        return course.waypoints.map((waypoint,index)=>{
            const target=course.resolve(waypoint);
            const previous=index?course.resolve(course.waypoints[index-1]):course.loop && course.waypoints.length>1
                ?course.resolve(course.waypoints[course.waypoints.length-1]):object;
            const turns=(from)=>speed?Math.trunc(Math.hypot(target.x-from.x,target.y-from.y)/speed)+1:null;
            return {index,target,current:index===course.current,origin:course.hasOrigin && index===0,
                turns:course.hasOrigin && !course.loop && index===0?null:turns(previous),
                remaining:index===course.current?turns(object):null};
        });
    }

    showCourse(object=this.selectedObject) {
        if (!this.canViewCourse(object)) return false;
        this.courseWindowObject=object;this.courseSelection=null;this.coursePage=0;this.uiWindow='course';return true;
    }

    beginCourseEdit(replace=false) {
        const object=this.courseWindowObject;
        if (!this.canEditCourse(object)) return false;
        const index=this.courseSelection;
        if (replace && (index===null || !object.course.waypoints[index])) return false;
        this.pendingCourseEdit={object,index,replace,revision:object.course.revision};
        this.pendingMapOrderObject=object;this.uiWindow=null;return true;
    }

    issuePlayerWaypoint(object,target,index=null,replace=false) {
        if (!this.canEditCourse(object) || !object.course || !target) return false;
        const changed=replace?object.course.edit(index,target):object.course.addPlayerWaypoint(target,index);
        if (!changed) return false;
        object.setPatrol(false);
        object.setScrap(false);
        this.recordEvent(I18n.getString(604,'Orders'),I18n.formatString(739,'Course updated for {0}',this.getObjectDisplayName(object)),{type:'ui'});
        return true;
    }

    isAwaitingMapTarget() {
        return !!(this.pendingMapOrderObject || this.pendingRendezvousPlacement);
    }

    beginMapOrder(object) {
        const objectType = this.getObjectType(object);
        if (![Common.ObjectType.STAR, Common.ObjectType.SHIP, Common.ObjectType.FLEET].includes(objectType)) {
            return false;
        }
        if (!this.canHumanControl(object)) {
            this.recordEvent(
                I18n.getString(604, 'Orders'),
                I18n.getString(663, 'You can only manage your own objects.'),
                { type: 'ui' }
            );
            return true;
        }

        if (objectType !== Common.ObjectType.STAR && !this.canEditCourse(object)) return false;

        this.pendingCourseEdit = null;
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
            case 'fileMenu':return !!(this.fileCommands && this.fileCommands.menu());
            case 'newGame':return !!(this.sessionCommands && this.sessionCommands.begin());
            case 'showGames':
                if(!this.sessionCommands)return false;
                this.endUIWindowDrag();this.endMapScrollDrag();this.endUISliderDrag();
                this.gameSessionPage=0;this.uiWindow='games';return true;
            case 'selectGame':return !!(this.uiWindow==='games' && this.sessionCommands && this.sessionCommands.select(action.id));
            case 'gameSessionPage':this.gameSessionPage=Math.max(0,action.page);return true;
            case 'dismissReport':return !!(this.overlay && this.overlay.type==='report' && this.dismissEventPresentation());
            case 'replayReport':return this.replayReport(action.event);
            case 'reportPage':
                if(!this.overlay || this.overlay.type!=='report' || !Number.isInteger(action.page) || action.page<0)return false;
                this.overlay.page=action.page;return true;
            case 'reportGoTo': {
                if(!this.overlay || this.overlay.type!=='report')return false;
                const event=this.eventLog.find(e=>e.id===this.overlay.eventId);
                if(!event || !this.getEventFocus(event))return false;
                this.dismissEventPresentation();return true;
            }
            case 'dismissOutcome':
                return !!(this.overlay && this.overlay.type==='outcome' && this.dismissEventPresentation());
            case 'outcomePage':
                if(!this.overlay || this.overlay.type!=='outcome' || !Number.isInteger(action.page) || action.page<0)return false;
                this.overlay.page=action.page;return true;
            case 'replayOutcome':return this.replayOutcome(action.event);
            case 'consume':
                return true;
            case 'setMapDisplayMode':
                if(!MapDisplayModes.valid(action.mode))return false;
                this.mapDisplayMode=action.mode;
                return true;
            case 'toggleFullscreen':
                return !!(this.fullscreen && this.fullscreen.toggle());
            case 'toggleNebula':
                this.showNebula=!this.showNebula;
                if(this.drawingPreferences)this.drawingPreferences.writeNebula(this.showNebula);
                return true;
            case 'toggleScannerRanges':
                this.showScannerRanges=!this.showScannerRanges;
                if(this.drawingPreferences)this.drawingPreferences.writeScannerRanges(this.showScannerRanges);
                return true;
            case 'toggleAllCourses':
                this.showAllCourses=!this.showAllCourses;
                if(this.drawingPreferences)this.drawingPreferences.writeAllCourses(this.showAllCourses);
                return true;
            case 'toggleCourierCourses':
                this.showCourierCourses=!this.showCourierCourses;
                if(this.drawingPreferences)this.drawingPreferences.writeCourierCourses(this.showCourierCourses);
                return true;
            case 'toggleShips':
                this.showShips=!this.showShips;
                if(this.drawingPreferences)this.drawingPreferences.writeShips(this.showShips);
                return true;
            case 'toggleMapNames':
                this.showMapNames=!this.showMapNames;
                if(this.drawingPreferences)this.drawingPreferences.writeMapNames(this.showMapNames);
                return true;
            case 'toggleGrid':
                this.showGrid=!this.showGrid;
                if(this.drawingPreferences)this.drawingPreferences.writeGrid(this.showGrid);
                return true;
            case 'toggleControlHelp':
                this.showControlHelp=this.showControlHelp===false;
                if(this.drawingPreferences)this.drawingPreferences.writeControlHelp(this.showControlHelp);
                if(this.display)this.display.clearControlHelp();
                return true;
            case 'setLanguage':
                if(this.uiWindow!=='settings' || !LanguageSettings.supported(action.language))return false;
                pdg.res.setLanguage(action.language);
                if(this.display)this.display.reloadUIStrings();
                if(this.languagePreferences)this.languagePreferences.write(action.language);
                return true;
            case 'toggleWindow':
                return this.toggleUIWindow(action.window);
            case 'toggleProduction':
                if (action.object) {
                    this.setSelectedObject(action.object);
                }
                return this.toggleProductionWindow();
            case 'equalizeAllocations':
                this.setSelectedObject(action.star);
                return this.resetSelectedStarAllocations();
            case 'toggleAllocationLock':
                return this.toggleStarAllocationLock(action.star, action.allocationKey);
            case 'setAllocation':
                if (action.star) {
                    this.setSelectedObject(action.star);
                    this.setStarAllocation(action.star, action.allocationKey, action.desired, {silent:!!action.silent});
                }
                return true;
            case 'chooseMapObject':
                return this.chooseMapSelection(action.object);
            case 'mapSelectionPage':
                if(!this.mapSelectionPicker)return false;
                this.mapSelectionPicker.page=Math.max(0,Math.min(Math.ceil(this.getMapSelectionRows().length/6)-1,action.page));return true;
            case 'mapScroll':
                return this.applyMapScrollAction(action);
            case 'zoomIn':
                if(!this.display)return false;this.display.zoomIn();return true;
            case 'zoomOut':
                if(!this.display)return false;this.display.zoomOut();return true;
            case 'resetView':
                if(!this.display)return false;this.display.resetView();return true;
            case 'centerSelected':
                if(!this.display || !this.selectedObject)return false;
                this.display.centerOn(this.selectedObject.x,this.selectedObject.y);return true;
            case 'selectHomeStar':
                this.selectHomeStar();
                return true;
            case 'selectEvent':
                this.selectEvent(action.event);return true;
            case 'goToEvent':
                if(this.getEventRows().includes(action.event))this.focusEvent(action.event,true);return true;
            case 'eventPage':
                if(!Number.isInteger(action.page) || action.page<0)return false;
                this.eventPage=action.page;return true;
            case 'eventDetailPage':
                if(!Number.isInteger(action.page) || action.page<0)return false;
                this.eventDetailPage=action.page;return true;
            case 'reviewAttention':
                this.uiWindow=null;
                if(this.hasEventPresentation()) {
                    if(!this.overlay)this.dismissEventPresentation();
                    return true;
                }
                this.attention.next();return true;
            case 'nextAttention':
                this.attention.next();return true;
            case 'toggleCallIn':
                return this.toggleCallIn(action.object || this.selectedObject);
            case 'confirmEndTurn':
                this.endTurn();return true;
            case 'endTurn':
                this.requestEndTurn();
                return true;
            case 'zoomToFit':
                if (this.display) {
                    this.display.zoomToFit();
                }
                return true;
            case 'pauseBuild':
                return !!action.object && this.canHumanControl(action.object) &&
                    this.getObjectType(action.object) === Common.ObjectType.STAR && action.object.pauseShipBuilding();
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
            case 'beginColonyDefaults':
                return this.beginColonyDefaults();
            case 'setColonyDefaultAllocation':
                return this.setColonyDefaultAllocation(action.key,action.value);
            case 'setColonyDefaultHull':
                if (!this.colonyDefaultsDraft || !Number.isInteger(action.hull) || action.hull<1 || action.hull>4) return false;
                this.colonyDefaultsDraft.defaultBuildType = action.hull;
                return true;
            case 'saveColonyDefaults':
                return this.saveColonyDefaults();
            case 'cancelColonyDefaults':
                return this.cancelColonyDefaults();
            case 'closePlayerComparison':this.uiWindow=null;return true;
            case 'playerComparisonPage':
                if(this.uiWindow!=='comparison' || !Number.isInteger(action.page) || action.page<0)return false;
                this.playerComparisonPage=action.page;return true;
            case 'closeSystemComparison':this.endUIWindowDrag();this.saveTableWindowGeometry();this.uiWindow=null;this.systemComparisonLastClick=null;return true;
            case 'showSystemComparison':
                if (!this.getCurrentHumanPlayer()) return false;
                this.systemComparisonSelection = null;
                this.systemComparisonLastClick = null;
                this.uiWindow = 'systemComparison';
                return true;
            case 'systemComparisonPage':
                if (!Number.isInteger(action.page) || action.page < 0) return false;
                this.systemComparisonPage = action.page;
                this.systemComparisonLastClick = null;
                return true;
            case 'sortSystemComparison':
                if (!['name','tech','population','production','buildName','completion',
                    'totalDefense','satelliteDefense','shipDefense'].includes(action.key)) return false;
                this.systemComparisonSort = { key: action.key, ascending: this.systemComparisonSort.key === action.key
                    ? !this.systemComparisonSort.ascending : action.key === 'name' };
                this.systemComparisonPage = 0;
                this.systemComparisonLastClick = null;
                if(this.systemComparisonPreferences)this.systemComparisonPreferences.write(this.systemComparisonSort);
                return true;
            case 'systemComparisonRow': {
                if (!this.getSystemComparisonRows().some(row => row.star === action.star)) return false;
                const time = this.getCurrentMilliseconds(), previous = this.systemComparisonLastClick;
                this.systemComparisonSelection = action.star;
                if (previous && previous.star === action.star && time >= previous.time && time - previous.time <= 500) {
                    return this.openSystemComparisonSelection();
                }
                this.systemComparisonLastClick = { star: action.star, time };
                return true;
            }
            case 'fleetRosterSelect':return this.selectFleetRosterObject(action.object);
            case 'fleetRosterPage':
                if(this.uiWindow!=='fleets')return false;
                this.fleetRosterPage=Math.max(0,Math.trunc(action.page));this.fleetRosterLastClick=null;return true;
            case 'sortFleetRoster': {
                if(this.uiWindow!=='fleets' || !RosterPreferences.keys.includes(action.key))return false;
                this.fleetRosterSort={key:action.key,ascending:this.fleetRosterSort.key===action.key?
                    !this.fleetRosterSort.ascending:['name','destination'].includes(action.key)};
                this.fleetRosterPage=0;this.fleetRosterLastClick=null;
                if(this.rosterPreferences)this.rosterPreferences.write(this.fleetRosterSort);
                return true;
            }
            case 'closeFleetRoster':this.endUIWindowDrag();this.saveTableWindowGeometry();this.uiWindow=null;this.fleetRosterLastClick=null;return true;
            case 'showFleetExchange':return this.showFleetExchange(action.container || this.selectedObject);
            case 'fleetExchangeSelect':return this.selectFleetExchangeMember(action.side,action.object);
            case 'exchangeFleetMember':return this.exchangeFleetMember();
            case 'fleetExchangeNew': {
                if(!this.getFleetExchangeState())return false;
                this.fleetExchange.active=null;if(this.fleetExchange.side==='sub')this.fleetExchange.selection=null;this.fleetExchange.pages.sub=0;return true;
            }
            case 'fleetExchangePage': {
                if(!this.getFleetExchangeState() || !['main','sub'].includes(action.side))return false;
                this.fleetExchange.pages[action.side]=Math.max(0,Math.trunc(action.page));return true;
            }
            case 'fleetExchangeSort': {
                if(!this.getFleetExchangeState() || !['name','tech','speed','power','health'].includes(action.key))return false;
                const sort=this.fleetExchange.sort;
                this.fleetExchange.sort={key:action.key,ascending:sort.key===action.key?!sort.ascending:true};
                this.fleetExchange.pages={main:0,sub:0};return true;
            }
            case 'fleetExchangeClose':this.uiWindow=null;return true;
            case 'fleetExchangeScrap': {
                const state=this.getFleetExchangeState();return !!state && !!state.selection && this.toggleScrap(state.selection);
            }
            case 'fleetExchangePatrol': {
                const state=this.getFleetExchangeState();return !!state && !!state.selection && this.togglePatrol(state.selection);
            }
            case 'fleetExchangeOpen': {
                const state=this.getFleetExchangeState(),object=state && state.selection;
                if(!object)return false;
                if(this.factory.isFleet(object))return this.showFleetExchange(object);
                this.setSelectedObject(object);this.uiWindow=null;return true;
            }
            case 'fleetExchangeParent': {
                const state=this.getFleetExchangeState(),parent=state && (state.container.fleet || state.container.getDockedStar && state.container.getDockedStar());
                return this.showFleetExchange(parent);
            }
            case 'showSystemShips':
                if (!this.canViewSystemShips(action.star)) return false;
                this.systemShipWindowStar = action.star;
                this.systemShipPage = 0;
                this.uiWindow = 'systemShips';
                return true;
            case 'systemShipPage':
                this.systemShipPage = Math.max(0, action.page);
                return true;
            case 'sortSystemShips':
                if (!['name','tech','speed','power','damage'].includes(action.key)) return false;
                this.systemShipSort = { key: action.key, ascending: this.systemShipSort.key === action.key ?
                    !this.systemShipSort.ascending : true };
                this.systemShipPage = 0;
                return true;
            case 'beginOrders':
                return this.beginMapOrder(action.object);
            case 'clearDefaultDestination':
                if (!action.object || !this.canHumanControl(action.object) ||
                    this.getObjectType(action.object) !== Common.ObjectType.STAR) return false;
                action.object.clearDefaultDestination();
                if (this.pendingMapOrderObject === action.object) this.pendingMapOrderObject = null;
                return true;
            case 'showCourse': return this.showCourse(action.object);
            case 'selectWaypoint':
                if (!this.getCourseRows().some(row=>row.index===action.index)) return false;
                this.courseSelection=this.courseSelection===action.index?null:action.index;return true;
            case 'addWaypoint': return this.beginCourseEdit(false);
            case 'editWaypoint': return this.beginCourseEdit(true);
            case 'deleteWaypoint':
                if (!this.canEditCourse(this.courseWindowObject) || this.courseSelection===null) return false;
                if (!this.courseWindowObject.course.delete(this.courseSelection)) return false;
                this.courseSelection=null;return true;
            case 'coursePage':
                if (!Number.isInteger(action.page)||action.page<0)return false;
                this.coursePage=action.page;return true;
            case 'swapCourseMemory': {
                const object=this.courseWindowObject;
                if(!this.canEditCourse(object) || !object.course.swapMemory())return false;
                object.setPatrol(false); // CbxNaPanel cancels patrol after memory use.
                object.setScrap(false);
                const index=object.course.current;
                this.courseSelection=object.course.waypoints[index]?index:null;
                this.coursePage=0;
                if(this.courseSelection!==null && this.display && this.display.getCourseWindowLayout) {
                    this.coursePage=Math.floor(index/this.display.getCourseWindowLayout().pageSize);
                }
                return true;
            }
            case 'toggleCourseHunt': {
                const object=action.object || this.courseWindowObject;
                if(!this.canToggleCourseHunt(object))return false;
                // v3 stores the mode without changing waypoints or movement.
                object.course.hunt=!object.course.hunt;
                return true;
            }
            case 'toggleCourseLoop':
                if (!this.canEditCourse(this.courseWindowObject)) return false;
                this.courseWindowObject.course.loop=!this.courseWindowObject.course.loop;
                this.courseWindowObject.course.changed();return true;
            case 'clearOrders':
                return this.clearOrders(action.object);
            case 'toggleScrap': return this.toggleScrap(action.object);
            case 'togglePatrol':
                return this.togglePatrol(action.object);
            case 'toggleFleetWindow':
                return this.toggleUIWindow('fleets');
            case 'selectObject':
                if (action.closeWindow) this.uiWindow = null;
                if (action.object) {
                    this.setSelectedObject(action.object);
                    if (this.display && action.center) {
                        this.display.centerOn(action.object.x, action.object.y);
                    }
                }
                return true;
            case 'beginRendezvousPlacement':
                return this.beginRendezvousPlacement(action.rendezvous || null);
            case 'createRendezvous':
                if (action.object) {
                    return this.createRendezvousForObject(action.object);
                }
                return this.beginRendezvousPlacement();
            case 'deleteRendezvous':
                return this.deleteRendezvous(action.rendezvous || action.object);
            case 'commitRename':
                return this.commitRename();
            case 'cancelRename':
                this.renameTarget = null; this.renameText = ''; this.uiWindow = null;
                return true;
            case 'beginRename':
                return this.beginRenameObject(action.object);
            case 'fleetMemberPage': {
                const fleet=this.getSelectedFleet();
                if (!fleet || fleet!==action.fleet || !this.display || !Number.isInteger(action.page)) return false;
                const layout=this.display.getFleetDetailsLayout(fleet);
                if (!layout.knowledge.contents || action.page<0 || action.page>=layout.pages) return false;
                this.fleetMemberPage=action.page;
                return true;
            }
            case 'selectFleetMember': {
                const fleet=this.getSelectedFleet();
                if (!fleet || fleet!==action.fleet || !this.display || !this.display.getFleetDetailsLayout(fleet).visibleShips.includes(action.ship)) return false;
                this.setSelectedObject(action.ship);
                return true;
            }
            case 'removeFleetShip':
                return this.separateShipFromFleet(action.fleet, action.ship);
            case 'createFleetGroup':return !!this.createFleetGroup(action.fleet,action.member);
            case 'selectFleetParent': {
                const group=this.getSelectedFleet(),parent=group && group.fleet;
                if(!parent || !this.allFleets.includes(parent) || !this.display.getFleetKnowledge(parent).contents)return false;
                this.setSelectedObject(parent);return true;
            }
            case 'beginFleetTransfer':return this.beginFleetTransfer(action.ship);
            case 'transferFleetShip':
                return this.transferShipToFleet(action.ship, action.targetFleet);
            default:
                return false;
        }
    }

    applyMapScrollAction(action) {
        const {bar,part,x,y}=action;
        if(!bar || !bar.enabled)return true;
        const Scrollbars=require('./map-scrollbars.js'),position=bar.axis==='x'?x:y;
        if(part==='thumb')return true;
        const direction=part==='before'?-1:part==='after'?1:position<bar.trackStart+
            Math.max(0,Math.min(1,bar.leading/bar.range))*bar.travel?-1:1;
        Scrollbars.move(this.display.camera,bar,bar.leading+direction*bar.span*(part==='track'?.9:.1));
        return true;
    }

    beginMapScrollDrag(x,y) {
        this.uiMapScrollDrag=null;
        const action=this.display && this.display.getUIActionAt(x,y);
        if(!action || action.type!=='mapScroll')return false;
        const bar=action.bar;
        if(action.part==='thumb' && bar.enabled) {
            const axis=bar.axis,screen=this.display.getScreenSize();
            this.uiMapScrollDrag={bar,offset:(axis==='x'?x:y)-(axis==='x'?bar.thumb.x:bar.thumb.y),
                zoom:this.display.camera.zoom,width:screen.width,height:screen.height,window:this.uiWindow};
        } else {
            this.applyMapScrollAction(action);
            if(bar.enabled) {
                const screen=this.display.getScreenSize();
                this.uiMapScrollDrag={bar,part:action.part,x,y,zoom:this.display.camera.zoom,
                    width:screen.width,height:screen.height,window:this.uiWindow,nextRepeat:pdg.tm.getMilliseconds()+350};
            }
        }
        return true;
    }

    updateMapScrollDrag(x,y) {
        const drag=this.uiMapScrollDrag;
        if(!drag)return false;
        const screen=this.display.getScreenSize();
        if(this.uiWindow!==drag.window || this.display.camera.zoom!==drag.zoom ||
            screen.width!==drag.width || screen.height!==drag.height) {this.uiMapScrollDrag=null;return true;}
        if(drag.part) {
            drag.x=x;drag.y=y;
            const now=pdg.tm.getMilliseconds();
            if(now>=drag.nextRepeat) {
                drag.nextRepeat=now+65;
                const action=this.display.getMapScrollActionAt(x,y);
                if(action && action.bar.axis===drag.bar.axis && action.part===drag.part)
                    this.applyMapScrollAction(action);
            }
            return true;
        }
        const bar=drag.bar,position=bar.axis==='x'?x:y;
        require('./map-scrollbars.js').move(this.display.camera,bar,
            (position-drag.offset-bar.trackStart)/bar.travel*bar.range);
        return true;
    }

    endMapScrollDrag(x,y) {
        if(!this.uiMapScrollDrag)return false;
        if(Number.isFinite(x)&&Number.isFinite(y))this.updateMapScrollDrag(x,y);
        this.uiMapScrollDrag=null;return true;
    }

    getTableWindowState() {
        if(!this.display)return null;
        if(this.uiWindow==='fleets')return {geometry:'fleetRosterGeometry',preferences:this.rosterPreferences,
            minimumHeight:158,lastClick:'fleetRosterLastClick',rect:this.display.getFleetWindowRect()};
        if(this.uiWindow==='systemComparison')return {geometry:'systemComparisonGeometry',preferences:this.systemComparisonPreferences,
            minimumHeight:176,lastClick:'systemComparisonLastClick',rect:this.display.getSystemComparisonLayout().rect};
        return null;
    }

    saveTableWindowGeometry() {
        const state=this.getTableWindowState();if(!state)return;
        if(!this[state.geometry])this[state.geometry]={x:state.rect.x,y:state.rect.y,height:state.rect.height};
        if(state.preferences && state.preferences.writeGeometry)state.preferences.writeGeometry(this[state.geometry]);
    }

    // Retain the roster helper for callers that explicitly save that window.
    saveFleetRosterGeometry() {if(this.uiWindow==='fleets')this.saveTableWindowGeometry();}

    beginUIWindowDrag(x,y) {
        this.endUIWindowDrag();
        const state=this.getTableWindowState();
        if(!state || !Number.isFinite(x) || !Number.isFinite(y))return false;
        const region=this.display.getTableWindowDragRegions().find(region=>this.display.containsPoint(region.rect,x,y));
        if(!region)return false;
        const screen=this.display.getScreenSize();
        this.uiWindowDrag={mode:region.mode,x,y,rect:{...state.rect},width:screen.width,height:screen.height,
            window:this.uiWindow,geometry:state.geometry,minimumHeight:state.minimumHeight};
        this[state.lastClick]=null;return true;
    }

    updateUIWindowDrag(x,y) {
        const drag=this.uiWindowDrag;if(!drag)return false;
        const screen=this.display.getScreenSize();
        if(this.uiWindow!==drag.window || screen.width!==drag.width || screen.height!==drag.height) {
            this.endUIWindowDrag();return true;
        }
        if(!Number.isFinite(x) || !Number.isFinite(y))return true;
        const rect=drag.rect;
        if(drag.mode==='move')this[drag.geometry]={
            x:Math.max(10,Math.min(screen.width-rect.width-10,rect.x+x-drag.x)),
            y:Math.max(10,Math.min(screen.height-rect.height-10,rect.y+y-drag.y)),height:rect.height};
        else this[drag.geometry]={x:rect.x,y:rect.y,
            height:Math.max(drag.minimumHeight,Math.min(screen.height-rect.y-10,rect.height+y-drag.y))};
        return true;
    }

    endUIWindowDrag(x,y) {
        if(!this.uiWindowDrag)return false;
        if(Number.isFinite(x) && Number.isFinite(y))this.updateUIWindowDrag(x,y);
        if(!this.uiWindowDrag)return true;
        const drag=this.uiWindowDrag;this.uiWindowDrag=null;
        if(this.uiWindow===drag.window && this[drag.geometry])this.saveTableWindowGeometry();
        return true;
    }

    beginUISliderDrag(x,y) {
        this.endUISliderDrag();
        const slider = this.display && this.display.getDraggableSliderAt(x,y);
        if (!slider) return false;
        this.uiSliderDrag = slider;
        if (slider.star) slider.initialDesired = this.getAllocationDesired(slider.star[slider.key]);
        this.updateUISliderDrag(x,y);
        return true;
    }

    updateUISliderDrag(x,y) {
        const drag = this.uiSliderDrag;
        if (!drag) return false;
        const valid = this.uiWindow===drag.window && (drag.star ?
            this.selectedObject===drag.star && this.canHumanControl(drag.star) && !drag.star[drag.key].locked :
            this.colonyDefaultsDraft===drag.draft);
        if (!valid) { this.endUISliderDrag(); return true; }
        const ratio = Math.max(0,Math.min(1,(x-drag.trackRect.x)/drag.trackRect.width));
        if (drag.star) this.setStarAllocation(drag.star,drag.key,Math.round(ratio*1000)/10,{silent:true});
        else this.setColonyDefaultAllocation(drag.key,Math.round(ratio*1000));
        return true;
    }

    endUISliderDrag(x,y) {
        if (!this.uiSliderDrag) return false;
        if (Number.isFinite(x) && Number.isFinite(y)) this.updateUISliderDrag(x,y);
        const drag = this.uiSliderDrag;
        this.uiSliderDrag = null;
        if (drag && drag.star && this.canHumanControl(drag.star) &&
            this.getAllocationDesired(drag.star[drag.key])!==drag.initialDesired) this.recordProductionChange(drag.star);
        return true;
    }

    handleUIClick(x, y) {
        if(this.display && this.display.clearControlHelp)this.display.clearControlHelp();
        if (!this.display || typeof this.display.getUIActionAt !== 'function') {
            return false;
        }
        return this.executeUIAction(this.display.getUIActionAt(x, y));
    }

    getPlayerComparisonRows() {
        if(!this.players || !this.config)return [];
        const rows=[];
        for(let i=0;i<=this.config.totalPlayers;i++) {
            const player=this.players[i];
            const stars=this.stars.filter(star=>star.owner===i);
            const ships=this.allShips.filter(ship=>ship.owner===i && !ship.isDead() && !ship.underConstruction());
            const tech=objects=>objects.map(object=>Math.trunc(object.techLevel || 0));
            const starTech=tech(stars),shipTech=tech(ships);
            const average=values=>values.length?Math.trunc(values.reduce((sum,value)=>sum+value,0)/values.length):0;
            const assigned=!!player && (player.isComputer || !!player.name);
            const alive=stars.length>0 || ships.length>0;
            const name=i===0?I18n.getString(811,'Unowned systems'):assigned?(player.name || `${I18n.getString(18,'Player')} ${i}`):I18n.getString(306,'Unknown');
            const productionRaw=stars.reduce((sum,star)=>sum+star.getProduction(),0);
            rows.push({playerNum:i,name:i>0 && assigned && !alive?I18n.formatString(819,'{0} (defeated)',name):name,
                italicizeName:i===0 || !assigned,isAlive:alive,assigned,
                type:player && player.isComputer?I18n.getString(504,'AI'):I18n.getString(300,'Human'),
                stars:stars.length,ships:ships.length,
                shipsBuilding:this.allShips.filter(ship=>ship.owner===i && !ship.isDead() && ship.underConstruction()).length,
                population:stars.reduce((sum,star)=>sum+Math.trunc(star.population),0),
                production:Math.trunc(productionRaw/100),productionRaw,
                power:ships.reduce((sum,ship)=>sum+Math.trunc(ship.power),0),
                minimumTech:starTech.length?Math.min(...starTech):0,maxTech:starTech.length?Math.max(...starTech):0,
                averageTech:average(starTech),minimumShipTech:shipTech.length?Math.min(...shipTech):0,
                maximumShipTech:shipTech.length?Math.max(...shipTech):0,averageShipTech:average(shipTech),
                pieces:stars.length+ships.length});
        }
        return rows;
    }

    getPlayerComparisonExtrema(rows=this.getPlayerComparisonRows()) {
        const fields=['stars','population','production','minimumTech','maxTech','averageTech',
            'ships','power','minimumShipTech','maximumShipTech','averageShipTech'];
        const extrema={};
        fields.forEach(key=>{
            const shipField=['ships','power','minimumShipTech','maximumShipTech','averageShipTech'].includes(key);
            const values=rows.filter(row=>row.playerNum>0 && row.isAlive && (shipField?row.ships:row.stars)>0).map(row=>row[key==='production'?'productionRaw':key]);
            extrema[key]=values.length?{minimum:Math.min(...values),maximum:Math.max(...values)}:null;
        });
        return extrema;
    }

    clearOrders(object = this.selectedObject) {
        if (!object || !this.canHumanControl(object)) {
            return false;
        }
        const objectType = this.getObjectType(object);
        if (objectType !== Common.ObjectType.SHIP && objectType !== Common.ObjectType.FLEET) {
            return false;
        }
        if (object.course) {
            object.course.clear();
        } else if (object.setDestination) {
            object.setDestination(null);
        } else {
            object.destination = null;
        }
        this.recordEvent(
            I18n.getString(604, 'Orders'),
            I18n.formatString(665, '{0} orders cleared', this.getObjectDisplayName(object)),
            { type: 'ui' }
        );
        return true;
    }

    requestEndTurn() {
        if(this.pendingMapOrderObject || this.pendingRendezvousPlacement || this.uiSliderDrag || this.uiMapScrollDrag || this.uiWindowDrag || this.mapSelectionPicker)return false;
        if(this.attention.pending().length || this.hasEventPresentation()) {this.uiWindow='endTurnConfirm';return false;}
        this.endTurn();return true;
    }

    canToggleCallIn(object=this.selectedObject) {
        const speed=this.factory.isFleet(object)?object.totalSpeed:object && object.speed;
        return this.canEditCourse(object) && speed>0;
    }

    toggleCallIn(object=this.selectedObject) {
        if(!this.canToggleCallIn(object))return false;
        object.userCallIn=!object.userCallIn;
        return true;
    }

    canTogglePatrol(object=this.selectedObject) {
        return this.canEditCourse(object) && !!object.star;
    }

    togglePatrol(object = this.selectedObject) {
        if(!this.canTogglePatrol(object))return false;
        const newPatrol = !(object.isOnPatrol && object.isOnPatrol());
        object.setPatrol(newPatrol);
        if(newPatrol) {
            object.setScrap(false);
            object.course.clear();
            if(this.courseWindowObject===object) {this.courseSelection=null;this.coursePage=0;}
        }
        this.recordEvent(
            I18n.getString(604, 'Orders'),
            newPatrol ?
                I18n.formatString(666, '{0} now patrols', this.getObjectDisplayName(object)) :
                I18n.formatString(667, '{0} stopped patrolling', this.getObjectDisplayName(object)),
            { type: 'ui' }
        );
        return true;
    }
    
    beginMapSelection(x,y,mode,force=false) {
        if(this.mapSelectionPicker)return true;
        const candidates=this.findObjectsAtPosition(x,y,force);
        if(!candidates.length || !force && candidates.length<2)return false;
        this.mapSelectionPicker={candidates,x,y,mode,page:0,previousWindow:this.uiWindow};
        this.uiWindow='mapPick';return true;
    }

    getMapSelectionRows() {
        if(!this.mapSelectionPicker)return [];
        const picker=this.mapSelectionPicker;
        if(picker.mode==='transfer') {
            if(this.selectedObject!==picker.sourceFleet || picker.transferShip.fleet!==picker.sourceFleet)return [];
            return picker.candidates.filter(target=>this.canTransferShipToFleet(picker.transferShip,target));
        }
        const live=new Set(this.getMapObjects());
        return this.mapSelectionPicker.candidates.filter(object=>live.has(object) && this.display.getMapMarker(object));
    }

    cancelMapSelection() {
        const picker=this.mapSelectionPicker;
        if(!picker)return false;
        this.mapSelectionPicker=null;this.uiWindow=picker.previousWindow;return true;
    }

    chooseMapSelection(object) {
        if(!this.getMapSelectionRows().includes(object))return false;
        const picker=this.mapSelectionPicker;this.cancelMapSelection();
        if(picker.mode==='transfer')return this.transferShipToFleet(picker.transferShip,object);
        const options={resolved:true,target:object};
        if(picker.mode==='order')return this.handleMouseRightClick(picker.x,picker.y,options);
        return this.handleMouseClick(picker.x,picker.y,options);
    }

    handleMouseClick(x, y, options={}) {
        if(!options.resolved && this.beginMapSelection(x,y,'select',!!options.forcePicker))return true;
        if (this.pendingRendezvousPlacement) {
            return this.finishRendezvousPlacementAt(x, y, options.target);
        }

        if (this.pendingMapOrderObject) {
            const orderObject=this.pendingMapOrderObject, edit=this.pendingCourseEdit;
            this.pendingMapOrderObject=null;this.pendingCourseEdit=null;
            this.setSelectedObject(orderObject);
            if (edit) {
                if (this.canEditCourse(orderObject) && edit.revision===orderObject.course.revision) {
                    const target=options.target || this.findObjectAtPosition(x,y) || {x:this.display.toGalacticX(x),y:this.display.toGalacticY(y)};
                    this.issuePlayerWaypoint(orderObject,target,edit.index,edit.replace);
                }
                this.uiWindow='course';return true;
            }
            return this.handleMouseRightClick(x,y,options);
        }

        // Left click - select object to view information
        var clickedObject = options.target || this.findObjectAtPosition(x, y);
        
        // Allow selecting any object to view information
        this.setSelectedObject(clickedObject);
        return true;
    }
    
    handleMouseRightClick(x, y, options={}) {
        if(['mapPick','games','fleets','systemComparison','comparison'].includes(this.uiWindow))return true;
        if(this.pendingMapOrderObject || this.pendingRendezvousPlacement)return this.handleMouseClick(x,y,options);
        if(!options.resolved && this.beginMapSelection(x,y,'order'))return true;
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
            var clickedObject = options.target || this.findObjectAtPosition(x, y);
            
            // Set default destination - either to an object or to coordinates
            if (clickedObject) {
                this.selectedObject.setDefaultDestination(clickedObject);
                const clickedObjectType = this.getObjectType(clickedObject);
                let destinationName;
                destinationName = this.getObjectDisplayName(clickedObject);
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
            var clickedObject = options.target || this.findObjectAtPosition(x, y);
            
            // Set destination - either to an object or to coordinates
            if (clickedObject) {
                this.issuePlayerWaypoint(this.selectedObject,clickedObject);
                const clickedObjectType = this.getObjectType(clickedObject);
                let destinationName;
                destinationName = this.getObjectDisplayName(clickedObject);
                const selectedObjectName = this.getObjectDisplayName(this.selectedObject);
                console.log(`Set destination of ${selectedObjectName} to ${destinationName}`);
            } else {
                // Right-clicking on empty space - give ship/fleet a destination (in galactic coordinates)
                this.issuePlayerWaypoint(this.selectedObject,{x:galacticX,y:galacticY});
                const selectedObjectName = this.getObjectDisplayName(this.selectedObject);
                console.log(`Set destination of ${selectedObjectName} to galactic (${galacticX.toFixed(0)}, ${galacticY.toFixed(0)})`);
            }
            return true;
        }
        
        // If no valid object is selected, ignore the right click
        return true;
    }
    
    getMapObjects() {
        // Match marker drawing order; topmost/last-drawn candidates come first.
        return [...this.stars,...this.allShips,...this.allRendezvous || [],...this.allFleets].reverse();
    }

    findObjectsAtPosition(x,y,nearby=false) {
        if(!this.display || !this.display.getMapMarker)return [];
        this.display.updateMapRenderingCalculations();
        return this.getMapObjects().filter(object=>{
            const marker=this.display.getMapMarker(object);
            if(!marker)return false;
            if(nearby && object.isOnPatrol && object.isOnPatrol())return false;
            return Math.abs(x-marker.x)<=Math.max(marker.radius,nearby?10:0) &&
                Math.abs(y-marker.y)<=Math.max(marker.height,nearby?10:0);
        });
    }

    findObjectAtPosition(x,y) {
        return this.findObjectsAtPosition(x,y)[0] || null;
    }

    handleKeyPress(key) {
        if(this.display && this.display.clearControlHelp)this.display.clearControlHelp();
        if(this.overlay && ['outcome','report'].includes(this.overlay.type)) {
            if(key===pdg.key_LeftArrow || key===pdg.key_RightArrow) {
                const layout=this.display && (this.overlay.type==='report'?this.display.getReportLayout(this.overlay):this.display.getOutcomeLayout(this.overlay));
                if(layout)this.overlay.page=Math.max(0,Math.min(layout.pages-1,layout.page+(key===pdg.key_LeftArrow?-1:1)));
            } else if(key===13 || key===3 || key===32 || key===pdg.key_Escape)this.dismissEventPresentation();
            return true;
        }

        if(['comparison','systemComparison'].includes(this.uiWindow))return this.handleCommandWindowKey(key,this.getKeyChar(key));
        if(key === pdg.key_F6)return this.executeUIAction({type:'toggleScannerRanges'});
        if(key === pdg.key_F4)return this.executeUIAction({type:'toggleAllCourses'});
        if(key === pdg.key_F5)return this.executeUIAction({type:'toggleCourierCourses'});
        if(key === pdg.key_F1)return this.executeUIAction({type:'toggleShips'});
        if(key === pdg.key_F2)return this.executeUIAction({type:'toggleMapNames'});
        if(key === pdg.key_F3)return this.executeUIAction({type:'toggleGrid'});
        if(['mapPick','games','fleetExchange','fleets'].includes(this.uiWindow))return this.handleCommandWindowKey(key,this.getKeyChar(key));
        if (['rename','colonyDefaults','settings','mapDisplay','view','mapPick'].includes(this.uiWindow) && key===pdg.key_Tab) return true;
        if (['settings','mapDisplay','view','mapPick'].includes(this.uiWindow) && (key===13 || key===3)) return true;
        if ((key===13 || key===3) && this.hasEventPresentation() && this.uiWindow==='events') {this.requestEndTurn();return true;}
        if ((key===13 || key===3) && !['rename','colonyDefaults','settings','systemComparison','events','endTurnConfirm'].includes(this.uiWindow)) {this.requestEndTurn();return true;}
        if (key === pdg.key_Tab) {
            if(!this.pendingMapOrderObject && !this.pendingRendezvousPlacement && !this.uiSliderDrag && !this.uiMapScrollDrag && !this.hasEventPresentation())this.attention.next();
            return true;
        }

        if (key === pdg.key_Escape && this.uiMapScrollDrag) {this.endMapScrollDrag();return true;}
        if (key === pdg.key_Escape && this.uiSliderDrag) {
            this.endUISliderDrag();
            return true;
        }

        if (key === pdg.key_Escape && this.pendingMapOrderObject) {
            this.pendingMapOrderObject=null;
            if (this.pendingCourseEdit) { this.pendingCourseEdit=null;this.uiWindow='course'; }
            return true;
        }

        if (key === pdg.key_Escape && this.pendingRendezvousPlacement) {
            this.pendingRendezvousPlacement = null;
            return true;
        }

        // Dismiss overlay on any key press
        if (this.overlay && this.uiWindow!=='endTurnConfirm') {
            this.dismissEventPresentation();
            return true;
        }
        const char = this.getKeyChar(key);
        if (this.handleCommandWindowKey(key, char)) {
            return true;
        }
        if (key === 13 || key === 3) {
            this.requestEndTurn();return true;
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
        } else if (key === 48 || key === 42) { // v3 zero and keypad * fit the map
            this.display.zoomToFit();
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
        } else if (key === pdg.key_Home) {
            this.selectHomeStar();
        } else if (key === 104 || key === 72) {
            return this.executeUIAction({type:'toggleCourseHunt',object:this.selectedObject});
        } else if (this.handleTopLevelCommandKey(key, char)) {
            return true;
        } else if (this.selectedObject) {
            const objectType = this.getObjectType(this.selectedObject);
            if (objectType === Common.ObjectType.STAR) {
                // Handle ship building keys
                this.handleStarKeyPress(this.selectedObject, key);
            } else if (objectType === Common.ObjectType.SHIP) {
                this.handleShipKeyPress(this.selectedObject, key);
            } else if (objectType === Common.ObjectType.FLEET) {
                this.handleFleetKeyPress(this.selectedObject, key);
            } else if (objectType === Common.ObjectType.RENDEZVOUS) {
                this.handleRendezvousKeyPress(this.selectedObject, key);
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
            case 'n':
                return this.beginRenameObject(star);
            case 'x':
                star.pauseShipBuilding();
                return true;
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
        switch (String.fromCharCode(key).toLowerCase()) {
            case 'g': return this.showCourse(ship);
            case 'a': this.showCourse(ship);return this.beginCourseEdit();
            case 'n':
                return this.beginRenameObject(ship);
            case 'o':
                return this.beginMapOrder(ship);
            case 'x':
                return this.clearOrders(ship);
            case 'p':
                return this.togglePatrol(ship);
            default:
                return false;
        }
    }

    handleFleetKeyPress(fleet, key) {
        switch (String.fromCharCode(key).toLowerCase()) {
            case 'g': return this.showCourse(fleet);
            case 'a': this.showCourse(fleet);return this.beginCourseEdit();
            case 'o':
                return this.beginMapOrder(fleet);
            case 'x':
                return this.clearOrders(fleet);
            case 'p':
                return this.togglePatrol(fleet);
            case 'n':
                return this.beginRenameObject(fleet);
            default:
                return false;
        }
    }

    handleRendezvousKeyPress(rendezvous, key) {
        switch (String.fromCharCode(key).toLowerCase()) {
            case 'm':
                return this.beginRendezvousPlacement(rendezvous);
            case 'n':
                return this.beginRenameObject(rendezvous);
            case 'x':
                return this.deleteRendezvous(rendezvous);
            default:
                return false;
        }
    }
    
    canToggleScrap(object) {
        if(!object || !this.canHumanControl(object))return false;
        const fleet=this.factory.isFleet(object);
        if(fleet ? !this.allFleets.includes(object) || object.isEmpty()
            : !this.allShips.includes(object) || object.isDead() || object.underConstruction())return false;
        const container=object.fleet || object.star;
        return !!container && container.owner===this.getCurrentHumanPlayer();
    }

    toggleScrap(object=this.selectedObject) {
        if(!this.canToggleScrap(object))return false;
        object.setScrap(!object.isToBeScrapped());
        if(object.isToBeScrapped()) {
            this.attention.attend(object);
            if(this.factory.isFleet(object))for(const ship of object.ships)this.attention.attend(ship);
        }
        return true;
    }

    scrapShip(ship) {
        if(!this.allShips.includes(ship) || !ship.isToBeScrapped() || ship.isDead() || ship.underConstruction())return false;
        const fleet=ship.fleet,star=fleet?fleet.getDockedStar():ship.star;
        const amount=this.rules.getShipScrapValue(ship),name=this.getObjectDisplayName(ship);
        if(star && this.stars.includes(star) && Number.isFinite(amount))star.addScrapProduction(amount);
        const event=this.recordEvent(I18n.getString(754,'Scrap'),star
            ? I18n.formatString(757,'{0} scrapped; {1} production recovered at {2}',name,I18n.formatDecimal(amount,3),this.getObjectDisplayName(star))
            : I18n.formatString(758,'{0} scrapped',name),{type:'scrap',subject:ship,recipient:ship.owner});
        this.detachShipFromContainers(ship);this.entityRemoved(ship);
        if(fleet && fleet.isEmpty())this.entityRemoved(fleet);
        return !!event;
    }

    // CShip::EndOfTurn marks the actor before allowing its destination to
    // move. Marking before recursion handles mutual pursuit and longer cycles.
    moveAllShips() {
        const previous=this.movementTurn;
        const actors=[...this.allShips,...this.allFleets];
        this.movementTurn={moved:new Set(),actors:new Set(actors)};
        try { actors.forEach(actor=>this.moveActorForTurn(actor)); }
        finally { this.movementTurn=previous; }
    }

    moveActorForTurn(actor) {
        const turn=this.movementTurn;
        if(!turn || !turn.actors.has(actor) || turn.moved.has(actor))return false;
        const type=this.getObjectType(actor);
        if(type===Common.ObjectType.SHIP && !this.allShips.includes(actor) ||
            type===Common.ObjectType.FLEET && !this.allFleets.includes(actor))return false;
        turn.moved.add(actor);
        if(type===Common.ObjectType.SHIP && actor.isToBeScrapped())return this.scrapShip(actor);
        // Contained ships travel with their fleet, never independently.
        if(type===Common.ObjectType.SHIP && actor.fleet)return false;
        if(type===Common.ObjectType.FLEET) {
            // Process contained scrap orders before departure, even when pursued.
            for(const ship of [...actor.ships])this.moveActorForTurn(ship);
            if(!this.allFleets.includes(actor) || actor.fleet && !actor.destination)return false;
        }
        actor.move();
        return true;
    }

    movePursuedTargetFirst(actor) {
        const turn=this.movementTurn;
        if(!turn)return;
        const target=actor.destination;
        const eligible=object=>object && turn.actors.has(object) &&
            !turn.moved.has(object) && object.destination &&
            [Common.ObjectType.SHIP,Common.ObjectType.FLEET].includes(this.getObjectType(object));
        // v3 tests the actual target first, then its highest container.
        if(eligible(target)) { this.moveActorForTurn(target);return; }
        let top=target;
        const seen=new Set();
        while(top && !seen.has(top)) {
            seen.add(top);
            const container=top.fleet || top.star;
            if(!container)break;
            top=container;
        }
        if(eligible(top))this.moveActorForTurn(top);
    }

    endTurn() {
        if (this.isGameOver) {
            console.log(`Game already complete on turn ${this.victoryTurn}`);
            return this.getGameResult();
        }

        this.closeEventWindowsForTurnAdvance();

        console.log(`=== End of Turn ${this.turn} ===`);
        this.refreshRendezvousFleetReferences();
        
        // Log ships under construction status
        const shipsUnderConstruction = this.stars.filter(star => star.currentShip).map(star => ({ ...star.currentShip, star, owner: star.owner }));
        if (shipsUnderConstruction.length > 0) {
            console.log(`🔍 SHIPS UNDER CONSTRUCTION (${shipsUnderConstruction.length}):`);
            for (const ship of shipsUnderConstruction) {
                const starName = ship.star ? ship.star.name : 'UNKNOWN';
                console.log(`  - ${ship.type} at ${starName} - Owner: ${ship.owner}, Progress: ${ship.progress.toFixed(1)}%`);
            }
        } else {
            console.log(`🔍 NO SHIPS UNDER CONSTRUCTION`);
        }
        
        // Process AI decisions before moving/updating
        if (this.aiManager) {
            this.aiManager.processAITurns();
        }
        
        this.attention.beginTurn();
        this.moveAllShips();
        this.refreshRendezvousFleetReferences();
        // Update all stars
        for (const star of [...this.stars]) {
            if (this.stars.includes(star)) {
                star.update();
            }
        }
        
        this.attention.finishTurn();

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
        const event=this.recordEvent(I18n.getString(614, 'Victory'), message, { type: Common.EventType.GAME_WON });
        this.queueOutcome(event,'win',playerNum);
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
        const event=this.recordEvent(I18n.getString(615, 'Stalemate'), message, { type: Common.EventType.GAME_DRAW });
        this.queueOutcome(event,'draw');
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

        const oldFleet=ship.fleet;
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
        if(oldFleet && oldFleet.fleet && oldFleet.isEmpty())this.entityRemoved(oldFleet);
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
        this.applyNewColonyDefaults(star, previousOwner);

        const eventType = previousOwner ? Common.EventType.STAR_CAPTURED : Common.EventType.STAR_COLONIZED;
        if(previousOwner)this.recordOccupationReports(star, colonyShip.owner, previousOwner, 'capture');
        else this.noteworthyEvent(colonyShip, eventType, star);
        if(!previousOwner)this.requestColonySetup(star);
        this.removeDestroyedShip(colonyShip, colonyShip.owner, false);
        return true;
    }

    recordOccupationReports(star, attackerOwner, previousOwner, kind) {
        if (!star || !previousOwner || attackerOwner===previousOwner || !['capture','defendersLost'].includes(kind)) return [];
        const playerName=owner=>this.players[owner] && this.players[owner].name || `${I18n.getString(18,'Player')} ${owner}`;
        const snapshot={kind,starName:star.name,attackerOwner,previousOwner,
            attackerName:playerName(attackerOwner),defenderName:playerName(previousOwner)};
        return [attackerOwner,previousOwner].map(recipient=>{
            const winner=recipient===attackerOwner;
            const id=kind==='capture'?(winner?929:930):(winner?931:932);
            const event=this.recordEvent(I18n.getString(607,'Combat'),
                I18n.formatString(id, '',snapshot.starName,winner?snapshot.defenderName:snapshot.attackerName),
                {type:kind==='capture'?Common.EventType.STAR_CAPTURED:Common.EventType.DEFENDERS_LOST,
                    subject:star,recipient,position:star});
            event.occupation={...snapshot,side:winner?'attacker':'defender'};
            this.queueReport(event);
            this.attention.requestEvent(event);
            return event;
        });
    }

    requestColonySetup(star) {
        const player=this.players[star.owner];
        if(!player || player.isComputer)return false;
        const event=this.recordEvent(I18n.getString(612,'Colonization'),
            I18n.getString(856,'Please name your new colony and set its production levels.'),
            {type:Common.EventType.RENAME_COLONY,subject:star,recipient:star.owner});
        this.attention.requestEvent(event);
        return event;
    }

    getColonySetupReport(star) {
        return this.eventLog.find(event=>event.id===this.eventSelection && event.subject===star &&
            event.type===Common.EventType.RENAME_COLONY && this.isEventAccessible(event)) || null;
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
                if (who.owner===this.getCurrentHumanPlayer())
                    this.queueEventOverlay({ type: 'stardock', classIndex, shipType: who.type, ship: who, origin: who.star });
                eventTitle = I18n.getString(611, 'Stardock');
                const name=who.type==='battleship'?who.name.split('\t')[0]:I18n.getShipTypeName(who.type,{capitalized:true});
                eventMessage = I18n.formatString(925, 'First {0} commissioned at {1}.', name, who.star ? who.star.name : '')+'\n\n'+
                    I18n.getString({defense:921,scout:922,colony:923,battleship:924}[who.type]);
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
            const subject=what===Common.EventType.NEW_SHIP_CLASS && who.star?who.star:
                [Common.EventType.STAR_COLONIZED,Common.EventType.STAR_CAPTURED].includes(what)?where:
                who && [Common.ObjectType.STAR,Common.ObjectType.SHIP,Common.ObjectType.FLEET].includes(this.getObjectType(who))?who:null;
            const event=this.recordEvent(eventTitle,eventMessage,{type:what,subject,
                recipient:subject?subject.owner:undefined,position:what===Common.EventType.SHIP_DESTROYED?where:subject});
            if(what===Common.EventType.PLAYER_DIED)this.queueOutcome(event,'defeat',who.playerNum);
            if([Common.EventType.SHIP_BUILT,Common.EventType.STAR_CAPTURED].includes(what))this.attention.requestEvent(event);
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
    
    // Navigation can name a member, but v3 resolves arrival against its
    // highest container (CShip::Arriving / AGalacticThingy::GetTopContainer).
    getArrivalTopContainer(destination) {
        const seen = new Set();
        let container = destination;
        while (container && !seen.has(container)) {
            seen.add(container);
            const type = this.getObjectType(container);
            const parent = type === Common.ObjectType.RENDEZVOUS ? container.anchor :
                type === Common.ObjectType.SHIP || type === Common.ObjectType.FLEET ? container.fleet || container.star : null;
            if (!parent) return container;
            container = parent;
        }
        return null;
    }

    isArrivalObjectAlive(entity) {
        switch (this.getObjectType(entity)) {
            case Common.ObjectType.STAR: return this.stars.includes(entity);
            case Common.ObjectType.SHIP: return this.allShips.includes(entity) && !entity.isDead();
            case Common.ObjectType.FLEET: return this.allFleets.includes(entity) && !entity.isEmpty();
            case Common.ObjectType.RENDEZVOUS: return this.allRendezvous.includes(entity);
            default: return false;
        }
    }

    handleMobileArrival(entity) {
        const navigation = entity.destination;
        if (!navigation) return;
        const revision = entity.course.revision;
        const type = this.getObjectType(entity);
        const navType = this.getObjectType(navigation);
        const top = this.getArrivalTopContainer(navigation);
        if (entity.star) entity.star.shipDeparted(entity);
        entity.star = null;
        entity.x = navigation.x;
        entity.y = navigation.y;
        if (entity.syncShipPositions) entity.syncShipPositions();
        if (entity.updateSpatialLocation) entity.updateSpatialLocation();

        if (navType === Common.ObjectType.STAR && type === Common.ObjectType.SHIP) {
            this.noteworthyEvent(entity, Common.EventType.SHIP_ARRIVED, navigation);
        }
        if (top && this.shouldResolveCombat(entity, top)) this.resolveCombat(entity, top);
        if (!this.isArrivalObjectAlive(entity)) return;
        const topType = this.getObjectType(top);
        if (topType === Common.ObjectType.STAR && top.owner === 0) {
            const colony = type === Common.ObjectType.SHIP ? (entity.type === 'colony' ? entity : null) :
                entity.getShipsOfType('colony')[0];
            if (colony) this.colonizeStar(top, colony, 0);
            if (!this.isArrivalObjectAlive(entity)) {
                if (type === Common.ObjectType.FLEET && entity.isEmpty()) this.removeDestroyedFleet(entity, entity.owner);
                return;
            }
        }
        if (topType === Common.ObjectType.STAR) this.applyTechnologyTransferToStar(entity, top);

        const accepts = container => this.isArrivalObjectAlive(container) &&
            (container.owner === 0 || this.isOwnerAlliedWith(entity.owner, container.owner));
        let placement = null;
        if (accepts(top) && this.isArrivalObjectAlive(navigation)) {
            if (navType === Common.ObjectType.RENDEZVOUS && navigation.owner === entity.owner &&
                    (type === Common.ObjectType.FLEET || entity.canFormFleet())) {
                placement = this.handleRendezvousArrival(entity, navigation);
            } else if (navType === Common.ObjectType.FLEET && accepts(navigation) &&
                    (type === Common.ObjectType.FLEET || entity.canFormFleet())) {
                navigation.addShip(entity);
                placement = navigation;
            } else if (navType === Common.ObjectType.SHIP && navigation.owner === entity.owner &&
                    navigation.canFormFleet() && (type === Common.ObjectType.FLEET || entity.canFormFleet())) {
                if (navigation.fleet) {
                    navigation.fleet.addShip(entity);
                    placement = navigation.fleet;
                } else {
                    placement = this.handleFleetFormation(entity, navigation);
                }
                if (type === Common.ObjectType.SHIP) {
                    // Formation is already complete; emit the existing localized report.
                    this.noteworthyEvent(entity, Common.EventType.SHIP_INTERCEPT, navigation);
                }
            }
        }
        if (!placement && accepts(top)) {
            if (topType === Common.ObjectType.FLEET) {
                top.addShip(entity);
                placement = top;
            } else if (topType === Common.ObjectType.STAR) placement = entity;
        }
        // Register only the outermost docked group in the system contents.
        if (placement && topType === Common.ObjectType.STAR && accepts(top)) {
            while (placement.fleet) placement = placement.fleet;
            if (placement.star && placement.star !== top) placement.star.shipDeparted(placement);
            placement.star = top;
            top.shipArrived(placement);
            if (placement.type === 'defense') top.addDefenseSatellite(placement);
            if (placement.syncShipPositions) placement.syncShipPositions();
            if (placement.updateSpatialLocation) placement.updateSpatialLocation();
        }
        if (!entity.fleet && this.isArrivalObjectAlive(entity)) entity.course.advance(revision);
        if (type === Common.ObjectType.FLEET) entity.progress = 0;
        if (type === Common.ObjectType.SHIP && !placement && navType !== Common.ObjectType.STAR) {
            this.noteworthyEvent(entity, Common.EventType.SHIP_STOPPED, navigation);
        }
    }

    handleRendezvousArrival(entity, rendezvous) {
        if (!entity || !rendezvous || this.getObjectType(rendezvous) !== Common.ObjectType.RENDEZVOUS) {
            return null;
        }
        if (entity.owner !== rendezvous.owner) {
            return null;
        }

        const entityType = this.getObjectType(entity);
        let assemblyFleet = rendezvous.getFleet ? rendezvous.getFleet() : rendezvous.fleet;

        if (entityType === Common.ObjectType.FLEET) {
            entity.x = rendezvous.x;
            entity.y = rendezvous.y;
            entity.star = null;
            entity.destination = null;
            entity.progress = 0;
            if (entity.syncShipPositions) {
                entity.syncShipPositions();
            }

            if (assemblyFleet && assemblyFleet !== entity) {
                assemblyFleet.addShip(entity);
            } else {
                assemblyFleet = entity;
            }

            if (!assemblyFleet.name) {
                assemblyFleet.name = rendezvous.name;
            }
            rendezvous.setFleet(assemblyFleet);
            this.recordEvent(
                I18n.getString(567, 'Rendezvous'),
                I18n.formatString(668, '{0} assigned to {1}', this.getObjectDisplayName(assemblyFleet), this.getObjectDisplayName(rendezvous)),
                { type: Common.EventType.FLEET_FORMED }
            );
            return assemblyFleet;
        }

        if (entityType !== Common.ObjectType.SHIP || !entity.canFormFleet || !entity.canFormFleet()) {
            return null;
        }

        if (!assemblyFleet || (assemblyFleet.isEmpty && assemblyFleet.isEmpty())) {
            assemblyFleet = this.factory.createFleet(rendezvous.x, rendezvous.y, entity.owner, rendezvous.name);
            rendezvous.setFleet(assemblyFleet);
            this.recordEvent(
                I18n.getString(567, 'Rendezvous'),
                I18n.formatString(669, '{0} formed at {1}', this.getObjectDisplayName(assemblyFleet), this.getObjectDisplayName(rendezvous)),
                { type: Common.EventType.FLEET_FORMED }
            );
        }

        assemblyFleet.x = rendezvous.x;
        assemblyFleet.y = rendezvous.y;
        assemblyFleet.star = null;
        assemblyFleet.addShip(entity);
        assemblyFleet.syncShipPositions();
        rendezvous.setFleet(assemblyFleet);

        this.recordEvent(
            I18n.getString(567, 'Rendezvous'),
            I18n.formatString(670, '{0} joined {1}', this.getObjectDisplayName(entity), this.getObjectDisplayName(assemblyFleet)),
            { type: Common.EventType.FLEET_FORMED }
        );
        return assemblyFleet;
    }

    getFriendlyFleetsAtLocation(owner, x, y, excludeFleet = null) {
        return (this.allFleets || []).filter(fleet =>
            fleet &&
            fleet !== excludeFleet &&
            fleet.owner === owner &&
            (!fleet.isEmpty || !fleet.isEmpty()) &&
            Math.abs(fleet.x - x) < 5 &&
            Math.abs(fleet.y - y) < 5
        );
    }

    getFleetTransferTargets(fleet) {
        if (!fleet || !this.allFleets.includes(fleet) || !this.canHumanControl(fleet)) return [];
        return this.getFriendlyFleetsAtLocation(fleet.owner, fleet.x, fleet.y, fleet);
    }

    createFleetGroup(fleet,member) {
        if(this.selectedObject!==fleet || !this.allFleets.includes(fleet) || !fleet.ships.includes(member) ||
            member.fleet!==fleet || !this.canHumanControl(fleet) || !this.canHumanControl(member) ||
            member.owner!==fleet.owner || member.isDead() || member.underConstruction() || this.mapSelectionPicker)return false;
        const group=this.factory.createFleet(fleet.x,fleet.y,fleet.owner);
        group.name=I18n.formatString(797,'Group {0}',group.id);
        fleet.removeShip(member);
        group.addShip(member);
        fleet.addShip(group);
        this.setSelectedObject(group);
        this.recordEvent(I18n.getString(566,'Fleets'),I18n.formatString(669,'{0} formed at {1}',
            this.getObjectDisplayName(group),this.getObjectDisplayName(fleet)),{type:Common.EventType.FLEET_FORMED});
        return group;
    }

    canTransferShipToFleet(ship,targetFleet) {
        if(!ship || !targetFleet || !(this.factory.isFleet(ship)?this.allFleets:this.allShips).includes(ship) || !this.allFleets.includes(targetFleet) ||
            !this.canHumanControl(ship) || !this.canHumanControl(targetFleet) || ship.owner!==targetFleet.owner ||
            ship===targetFleet || ship.fleet===targetFleet || ship.contains && ship.contains(targetFleet) || ship.isDead() || ship.underConstruction() || targetFleet.isEmpty())return false;
        const source=ship.fleet || ship;
        if(ship.fleet && (!this.allFleets.includes(source) || !source.ships.includes(ship) || !this.canHumanControl(source)))return false;
        return Number.isFinite(source.x) && Number.isFinite(source.y) &&
            Math.abs(source.x-targetFleet.x)<5 && Math.abs(source.y-targetFleet.y)<5;
    }

    beginFleetTransfer(ship) {
        const sourceFleet=ship && ship.fleet;
        if(!sourceFleet || this.selectedObject!==sourceFleet || !this.display || this.mapSelectionPicker ||
            this.pendingMapOrderObject || this.pendingCourseEdit || this.pendingRendezvousPlacement)return false;
        const candidates=this.getFleetTransferTargets(sourceFleet).filter(target=>this.canTransferShipToFleet(ship,target));
        if(!candidates.length)return false;
        if(candidates.length===1)return this.transferShipToFleet(ship,candidates[0]);
        const position=this.display.getObjectScreenPosition(sourceFleet);
        this.mapSelectionPicker={candidates,x:position.x,y:position.y,mode:'transfer',transferShip:ship,sourceFleet,
            page:0,previousWindow:this.uiWindow};
        this.uiWindow='mapPick';return true;
    }

    separateShipFromFleet(fleet, ship) {
        if (!fleet || !ship || ship.fleet !== fleet || !this.canHumanControl(fleet)) {
            return false;
        }

        const fleetName = this.getObjectDisplayName(fleet);
        const dockedStar = fleet.getDockedStar() || this.stars.find(star =>
            star.owner === fleet.owner &&
            Math.abs(star.x - fleet.x) < 5 &&
            Math.abs(star.y - fleet.y) < 5
        );

        if (!fleet.removeShip(ship)) {
            return false;
        }

        ship.destination = null;
        ship.x = fleet.x;
        ship.y = fleet.y;
        ship.star = null;

        if (dockedStar) {
            ship.x = dockedStar.x;
            ship.y = dockedStar.y;
            ship.star = dockedStar;
            if(!this.factory.isFleet(ship))dockedStar.shipArrived(ship);
        }
        if (ship.updateSpatialLocation) {
            ship.updateSpatialLocation();
        }

        if (fleet.isEmpty && fleet.isEmpty()) {
            this.entityRemoved(fleet);
        } else {
            fleet.calculateFleetStats();
            fleet.syncShipPositions();
        }

        this.recordEvent(
            I18n.getString(566, 'Fleets'),
            I18n.formatString(671, '{0} removed from {1}', this.getObjectDisplayName(ship), fleetName),
            { type: 'ui' }
        );
        return true;
    }

    transferShipToFleet(ship, targetFleet) {
        if(!this.canTransferShipToFleet(ship,targetFleet))return false;
        const oldFleet = ship.fleet;
        if (oldFleet === targetFleet) {
            return false;
        }

        if(!targetFleet.addShip(ship))return false;
        targetFleet.calculateFleetStats();
        targetFleet.syncShipPositions();

        if (oldFleet && oldFleet.isEmpty && oldFleet.isEmpty()) {
            this.entityRemoved(oldFleet);
        } else if (oldFleet) {
            oldFleet.calculateFleetStats();
            oldFleet.syncShipPositions();
        }

        this.recordEvent(
            I18n.getString(566, 'Fleets'),
            I18n.formatString(672, '{0} moved to {1}', this.getObjectDisplayName(ship), this.getObjectDisplayName(targetFleet)),
            { type: 'ui' }
        );
        return true;
    }

    handleFleetFormation(entity1, entity2) {
        // Check if either entity is already a fleet
        const entity1Type = this.getObjectType(entity1);
        const entity2Type = this.getObjectType(entity2);
        
        if (entity1Type === Common.ObjectType.FLEET && entity2Type === Common.ObjectType.FLEET) {
            // Both entities are fleets - merge them
            if (entity1 !== entity2) {
                return this.mergeFleets(entity1, entity2);
            }
            return entity1;
        } else if (entity1Type === Common.ObjectType.FLEET) {
            // Entity1 is a fleet, add entity2 to it if it can form a fleet
            if (entity2.canFormFleet()) {
                entity1.addShip(entity2);
                return entity1;
            }
        } else if (entity2Type === Common.ObjectType.FLEET) {
            // Entity2 is a fleet, add entity1 to it if it can form a fleet
            if (entity1.canFormFleet()) {
                entity2.addShip(entity1);
                return entity2;
            }
        } else {
            // Both entities are ships - check if either ship is already in a fleet
            if (entity1.isInFleet() && entity2.isInFleet()) {
                // Both ships are in fleets - merge the fleets
                if (entity1.fleet !== entity2.fleet) {
                    return this.mergeFleets(entity1.fleet, entity2.fleet);
                }
                return entity1.fleet;
            } else if (entity1.isInFleet()) {
                // Ship1 is in a fleet, add ship2 to it
                entity1.fleet.addShip(entity2);
                return entity1.fleet;
            } else if (entity2.isInFleet()) {
                // Ship2 is in a fleet, add ship1 to it
                entity2.fleet.addShip(entity1);
                return entity2.fleet;
            } else {
                // Neither ship is in a fleet, create a new fleet
                const fleet = this.factory.createFleet(entity1.x, entity1.y, entity1.owner);
                fleet.addShip(entity1);
                fleet.addShip(entity2);
                this.recordEvent(
                    I18n.getString(566, 'Fleets'),
                    I18n.formatString(669, '{0} formed at {1}', this.getObjectDisplayName(fleet), I18n.formatString(656, '({0}, {1})', Math.round(fleet.x / 1024), Math.round(fleet.y / 1024))),
                    { type: Common.EventType.FLEET_FORMED }
                );
                return fleet;
            }
        }

        return null;
    }
    
    /**
     * Merge two fleets into one
     */
    mergeFleets(fleet1, fleet2) {
        if (!fleet1 || !fleet2 || fleet1 === fleet2) {
            return fleet1 || fleet2 || null;
        }
        if(fleet1.contains(fleet2) || fleet2.contains(fleet1))return null;
        // Add all ships from fleet2 to fleet1
        const shipsToMove = [...fleet2.ships]; // Create a copy to avoid modification during iteration
        for (const ship of shipsToMove) {
            fleet1.addShip(ship);
        }
        
        // Remove the empty fleet2
        this.replaceRendezvousFleetReference(fleet2, fleet1);
        this.entityRemoved(fleet2);
        return fleet1;
    }
}

// Export the class
module.exports = Game;
