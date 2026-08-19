# Map Generation Port Plan

## Overview

This document outlines the plan for porting the map sizing and creation code from the original C++ Galactica (v3.0) to Galactica-4 JavaScript port.

**Original Source:** `galactica-anno-dominari-3/Classes/GalacticaProcessor.cpp` (lines 333-530)  
**Current JavaScript:** `galactica-4/src/js/map-generator.js`  
**Status:** ✅ Core algorithm already ported, but needs review and enhancements

---

## Current Implementation Status

### ✅ Already Implemented

The current `map-generator.js` already has excellent fidelity to the original C++ code:

1. **Star Count Calculation** (lines 64-77)
   - ✅ Uses exact formula: `(Rnd(10) + Rnd(10) + 10) * density + Rnd(5) * Rnd(2)`
   - ✅ Ensures minimum stars = totalNumPlayers
   - ✅ Adjusts for sector size: `numStars *= (sectorSize * sectorSize)`

2. **Random Star Placement** (lines 82-104)
   - ✅ Generates random coordinates with correct scale
   - ✅ Uses `Rnd(PIXELS_PER_SECTOR * sectorSize) * 1024L`
   - ✅ Implements star naming with Roman numerals for duplicates

3. **Home Star Assignment** (lines 109-146)
   - ✅ Edge distance constraints implemented
   - ✅ Minimum distance between players enforced
   - ✅ First star near edge but not too close
   - ✅ Subsequent stars maintain minHomeDist separation

4. **Home Star Initialization** (lines 219-232)
   - ✅ Sets owner, techLevel, population
   - ✅ Sets scanner range based on tech level
   - ✅ Starts with colony ship at 99% completion
   - ✅ Assigns unique names

---

## Key Differences to Address

### 1. **Coordinate System Differences** ⚠️

**C++ Original:**
```cpp
#define PIXELS_PER_SECTOR 1024L  // at 1:1 zoom
p.x = Rnd(PIXELS_PER_SECTOR * inSectorSize) * 1024L;
long sectorSize = PIXELS_PER_SECTOR * 1024L * inSectorSize;
```

**Current JavaScript:**
```javascript
this.PIXELS_PER_SECTOR = 16; // 16x16 light years per sector
this.COORDINATE_SCALE = 1024; // Coordinate scaling factor
```

**Issue:** The JavaScript uses `PIXELS_PER_SECTOR = 16` but should use `1024` to match the original, OR the display layer needs to handle the coordinate transformation.

**Action Items:**
- [ ] Review coordinate system: The C++ uses 1024 pixels per sector at 1:1 zoom
- [ ] The JS code comments say "16x16 light years per sector" but uses 16 as PIXELS_PER_SECTOR
- [ ] Original C++ comment says "��� this assumes 16x16 ly per 1x1 sector / ��� which is not correct"
- [ ] Decision needed: Use large coordinates (1024) or scale at display time

### 2. **Game Configuration Structure** ⚠️

**C++ Original (`NewGameInfoT`):**
```cpp
struct NewGameInfoT {
    Str255 gameTitle;
    SInt16 numHumans;
    SInt16 numComputers;
    SInt16 density;
    SInt16 sectorSize;
    SInt16 compSkill;
    SInt16 compAdvantage;
    SInt32 maxTimePerTurn;
    bool hosting;
    bool fastGame;
    bool omniscient;
    bool endEarly;
}
```

**Current JavaScript:**
```javascript
const mapConfig = {
    sectorSize: 1,
    density: 1,
    totalPlayers: 2,
    numHumans: 1
}
```

**Missing Fields:**
- `compSkill` - AI skill level (1=Expert, 2=Good, 3=Average, 4=Passable, 5=Novice)
- `compAdvantage` - Computer advantage setting
- `fastGame` - Affects production rates and speeds
- `omniscient` - All players see entire map

**Action Items:**
- [ ] Add missing config fields to map generation
- [ ] Pass `fastGame` to Rules for speed/production calculations
- [ ] Implement omniscient mode (fog of war vs full visibility)
- [ ] Store comp skill in player info for AI system

### 3. **Computer Player Naming** ❌ Not Implemented

**C++ Original (lines 441-463):**
```cpp
if (i > mGameInfo.numHumans) {
    std::string computerName;
    LoadStringResource(computerName, STRx_Names, str_TitleSyntax);
    // Title syntax: "* %" where * = planet name, % = group word
    int pos = computerName.find('*');
    computerName.replace(pos, 1, starName);  // e.g., "Alpha"
    pos = computerName.find('%');
    LoadStringResource(groupName, STRx_CompNames, Rnd(maxCompNames) + 1);
    computerName.replace(pos, 1, groupName);  // e.g., "Pact", "Alliance"
    // Result: "Alpha Pact", "Beta Alliance", etc.
}
```

**Action Items:**
- [ ] Create computer name generation system
- [ ] Add name templates (e.g., "* %", "* Empire", "The * Confederation")
- [ ] Add group name list (Pact, Alliance, Federation, etc.)
- [ ] Store computer names in player info

### 4. **Private Player Info** ⚠️ Partially Implemented

**C++ Original (`PrivatePlayerInfoT`):**
```cpp
struct PrivatePlayerInfoT {
    char password[MAX_PASSWORD_LEN];
    SInt32 lastTurnPosted;
    SInt32 numPiecesRemaining;
    PaneIDT homeID;
    PaneIDT techStarID;
    SInt16 hiStarTech;
    SInt16 hiShipTech;
    Bool8 builtColony;
    Bool8 builtScout;
    Bool8 builtSatellite;
    Bool8 hasTechStar;
    SInt8 compSkill;
    SInt8 compAdvantage;
    UInt8 defaultBuildType;
    UInt32 defaultGrowth;
    UInt32 defaultTech;
    UInt32 defaultShips;
}
```

**Current Implementation:** None in Game class

**Action Items:**
- [ ] Create `PlayerInfo` class to track player state
- [ ] Store home star ID reference
- [ ] Track highest tech levels achieved (for "new tech" messages)
- [ ] Track ship types built (for "new class" messages)
- [ ] Store AI skill level and advantage
- [ ] Store default economic settings

### 5. **Star Properties Not Set** ⚠️

**C++ Sets These Properties:**
```cpp
aStar->SetBuildHullType(class_Colony);
aStar->SetPercentPaidTowardNextShip(0.99);
```

**Current JavaScript:**
```javascript
star.buildHullType = 'colony';
star.percentPaidTowardNextShip = 0.99;
```

**Issue:** Properties exist in JS but using different names

**Action Items:**
- [ ] Verify Star class has `buildHullType` property
- [ ] Verify Star class has `percentPaidTowardNextShip` property
- [ ] Or map to existing properties: `currentShip` and `paidTowardShipBuilding`

---

## Detailed Porting Plan

### Phase 1: Fix Coordinate System (Priority: HIGH)

**Goal:** Ensure coordinates match original game exactly

**Tasks:**
1. **Investigate current coordinate usage**
   - Where are star coordinates used in display?
   - How does `game.js` use x,y coordinates?
   - What is the relationship between game coordinates and screen pixels?

2. **Decide on coordinate system**
   - **Option A:** Use large coordinates (1024 units per sector) throughout
   - **Option B:** Use small coordinates (16 units per sector) and scale only for compatibility
   - **Recommendation:** Use Option A to match original exactly

3. **Update constants if needed**
   ```javascript
   this.PIXELS_PER_SECTOR = 1024; // Match original C++
   this.COORDINATE_SCALE = 1024;  // Keep as coordinate precision
   ```

4. **Update display coordinate transformation**
   - Review `display.js` coordinate conversions
   - Ensure stars display correctly after coordinate changes
   - Update ship movement to work with new coordinate scale

**Files to Modify:**
- `map-generator.js` - Update PIXELS_PER_SECTOR constant
- `game.js` - Update coordinate conversion in initializeGame()
- `display.js` - Update coordinate-to-screen conversion
- `star.js` - Verify coordinates stored correctly
- `ship.js` - Verify movement calculations

**Testing:**
- Generate maps with sectorSize 1, 2, 3
- Verify stars appear in correct positions
- Verify distance calculations work correctly
- Verify ship movement works correctly

---

### Phase 2: Enhance Game Configuration (Priority: HIGH)

**Goal:** Support all original game options

**Tasks:**
1. **Extend NewGameInfo interface**
   ```javascript
   const NewGameInfoT = {
       gameTitle: string,
       numHumans: number,
       numComputers: number,
       density: number,         // 1-3 typical
       sectorSize: number,      // 1-4 typical
       compSkill: number,       // 1=Expert to 5=Novice
       compAdvantage: number,   // 0=None, 1=Some, 2=More
       maxTimePerTurn: number,  // seconds (0 = unlimited)
       fastGame: boolean,       // affects production/speed
       omniscient: boolean,     // full map visibility
       endEarly: boolean        // end turn when all players posted
   }
   ```

2. **Pass config to all systems**
   - MapGenerator needs: density, sectorSize, numHumans, numComputers, compSkill
   - Rules needs: fastGame
   - Game needs: omniscient, endEarly
   - AIManager needs: compSkill, compAdvantage

3. **Store game config**
   ```javascript
   // In Game class
   constructor(factory, rules, config) {
       this.config = config || this.getDefaultConfig();
       // ...
   }
   ```

**Files to Modify:**
- `game.js` - Add config parameter and storage
- `rules.js` - Use fastGame setting
- `map-generator.js` - Use all config options
- `ai-manager.js` - Use AI config settings

---

### Phase 3: Computer Player Naming (Priority: MEDIUM)

**Goal:** Generate authentic computer player names

**Tasks:**
1. **Create name resource data**
   ```javascript
   // In common.js or new names.js
   const COMP_NAME_TEMPLATES = [
       "* %",              // "Alpha Pact"
       "The * %",          // "The Beta Alliance" 
       "* Empire",         // "Gamma Empire"
       "* Confederation",  // "Delta Confederation"
       "The * Republic",   // "The Epsilon Republic"
   ];
   
   const COMP_GROUP_NAMES = [
       "Pact", "Alliance", "Federation", "Confederation",
       "Coalition", "League", "Union", "Collective",
       "Consortium", "Dominion", "Commonwealth", "Hegemony"
   ];
   ```

2. **Implement name generation**
   ```javascript
   generateComputerName(homeStar) {
       const template = this.random(COMP_NAME_TEMPLATES);
       const groupName = this.random(COMP_GROUP_NAMES);
       return template
           .replace('*', homeStar.name)
           .replace('%', groupName);
   }
   ```

3. **Create PlayerInfo storage**
   ```javascript
   class PlayerInfo {
       constructor(playerNum, isComputer) {
           this.playerNum = playerNum;
           this.name = '';
           this.isComputer = isComputer;
           this.isAlive = true;
           this.homeStarId = null;
           this.techStarId = null;
           this.hiStarTech = 0;
           this.hiShipTech = -5;  // Show message for first Traveler
           this.compSkill = 0;
           this.compAdvantage = 0;
           // Economic defaults
           this.defaultBuildType = 1;  // Colony
           this.defaultGrowth = 334;
           this.defaultTech = 333;
           this.defaultShips = 333;
       }
   }
   ```

**Files to Modify:**
- `common.js` - Add name constants
- `map-generator.js` - Generate computer names
- `game.js` - Store player info array
- New file: `player-info.js` - PlayerInfo class

---

### Phase 4: Player Info System (Priority: MEDIUM)

**Goal:** Track complete player state

**Tasks:**
1. **Create PlayerInfo class** (see Phase 3)

2. **Integrate into Game**
   ```javascript
   // In Game class
   constructor(...) {
       this.players = [];  // Array of PlayerInfo
       for (let i = 1; i <= totalPlayers; i++) {
           const isComputer = (i > numHumans);
           this.players[i] = new PlayerInfo(i, isComputer);
       }
   }
   ```

3. **Store home star references**
   ```javascript
   // In MapGenerator.initializeHomeStar()
   star.id = this.generateUniqueId();  // If not already set
   const playerInfo = this.game.players[playerNum];
   playerInfo.homeStarId = star.id;
   playerInfo.name = computerName;  // For AI players
   ```

4. **Track tech milestones**
   ```javascript
   // In Star.update() when tech increases
   if (this.techLevel > oldTechLevel) {
       const playerInfo = this.game.players[this.owner];
       if (this.techLevel > playerInfo.hiStarTech) {
           playerInfo.hiStarTech = this.techLevel;
           this.game.noteworthyEvent(this, Common.EventType.TECH_LEVEL_UP);
       }
   }
   ```

**Files to Modify:**
- New file: `player-info.js`
- `game.js` - Add players array
- `factory.js` - Generate unique IDs for entities
- `star.js` - Track tech milestones
- `ship.js` - Track new ship types built

---

### Phase 5: Complete Star Initialization (Priority: LOW)

**Goal:** Set all home star properties exactly as original

**Tasks:**
1. **Verify property mapping**
   ```javascript
   // C++ → JavaScript mapping
   SetBuildHullType(class_Colony) → star.buildHullType = 'colony'
   SetPercentPaidTowardNextShip(0.99) → star.percentPaidTowardNextShip = 0.99
   ```

2. **Review Star class**
   - Check if `buildHullType` exists (or use `currentShip`)
   - Check if `percentPaidTowardNextShip` exists (or use `paidTowardShipBuilding`)

3. **Update initializeHomeStar if needed**
   ```javascript
   initializeHomeStar(star, playerNum) {
       star.owner = playerNum;
       star.techLevel = 1;
       star.population = 1000000;
       star.scannerRange = this.game.rules.getScanRangeForTechLevel(1);
       
       // Start with nearly-complete colony ship
       const colonyShip = this.game.factory.createShip(
           star.x, star.y, 'colony', star
       );
       colonyShip.progress = 99;
       star.currentShip = colonyShip;
       star.paidTowardShipBuilding = 0.99 * this.game.rules.getShipBuildCost(colonyShip, star);
   }
   ```

**Files to Review:**
- `star.js` - Check property names
- `map-generator.js` - Update initialization code

---

## Implementation Order

### Sprint 1: Critical Fixes
1. ✅ Phase 1: Fix Coordinate System
2. ✅ Phase 2: Enhance Game Configuration

### Sprint 2: Player System
3. ⏸ Phase 4: Player Info System (do before Phase 3)
4. ⏸ Phase 3: Computer Player Naming

### Sprint 3: Polish
5. ⏸ Phase 5: Complete Star Initialization

---

## Testing Strategy

### Unit Tests
```javascript
describe('MapGenerator', () => {
    it('should generate correct number of stars', () => {
        // Test star count formula
    });
    
    it('should maintain minimum distance between home stars', () => {
        // Test distance constraints
    });
    
    it('should generate unique star names', () => {
        // Test name generation
    });
    
    it('should handle Roman numerals for duplicate names', () => {
        // Test name deduplication
    });
});
```

### Integration Tests
```javascript
describe('Map Generation Integration', () => {
    it('should create playable map for 2 players', () => {
        // End-to-end test
    });
    
    it('should work with different sector sizes', () => {
        // Test sectorSize: 1, 2, 3, 4
    });
    
    it('should work with different densities', () => {
        // Test density: 1, 2, 3
    });
});
```

### Visual Tests
- Generate maps with 2, 4, 8 players
- Verify star spacing looks correct
- Verify home stars have appropriate separation
- Verify coordinate system matches original game feel

---

## Constants Reference

### From Original C++ Code

```cpp
// GalacticaConsts.h
#define PIXELS_PER_SECTOR 1024L  // at 1:1 zoom
#define MAX_PLAYERS_CONNECTED 99
#define compSkill_Expert 1L
#define compSkill_Good 2L
#define compSkill_Average 3L
#define compSkill_Passable 4L
#define compSkill_Novice 5L
```

### Map Generation Formula

```cpp
// Number of stars
numStars = (Rnd(10) + Rnd(10) + 10) * density + Rnd(5) * Rnd(2);
numStars *= (sectorSize * sectorSize);

// Distance constraints  
sectorSize = PIXELS_PER_SECTOR * 1024L * inSectorSize;
edgeDist = sectorSize / 4;        // Max distance from edge for 1st star
minEdgeDist = sectorSize / 8;     // Min distance from edge for 1st star
homeDist = sectorSize / sqrt(totalPlayers);  // Max distance between players
minHomeDist = homeDist * 0.7;     // Min distance between players
```

---

## Files to Create/Modify

### New Files
- `docs/MAP_GENERATION_PORT_PLAN.md` (this file)
- `src/js/player-info.js` - Player state management
- `tests/map-generator.test.js` - Unit tests

### Modified Files
- `src/js/map-generator.js` - Apply all phases
- `src/js/game.js` - Add player info, config support
- `src/js/rules.js` - Use fastGame setting
- `src/js/common.js` - Add computer name constants
- `src/js/display.js` - Coordinate system adjustments
- `src/js/star.js` - Tech milestone tracking
- `src/js/ship.js` - New ship type tracking

---

## Original C++ Code Reference

**Key Functions:**
- `GalacticaProcessor::FillSector()` - Main map generation (lines 333-530)
- `GalacticaProcessor::CreateNew()` - Game initialization (lines 534-573)

**Key Structures:**
- `NewGameInfoT` - Game configuration (GalacticaTypes.h:29-42)
- `PrivatePlayerInfoT` - Player state (GalacticaTypes.h:87-111)
- `PublicPlayerInfoT` - Public player info (GalacticaTypes.h:77-84)

**Key Constants:**
- `PIXELS_PER_SECTOR = 1024L` (GalacticaConsts.h:67)
- `MAX_PLAYERS_CONNECTED = 99` (GalacticaConsts.h:53)
- AI skill levels (GalacticaConsts.h:749-753)

---

## Success Criteria

✅ Maps generated match original game's distribution and spacing  
✅ All game configuration options supported  
✅ Computer players have authentic names  
✅ Player info tracked correctly  
✅ Home stars initialized with all correct properties  
✅ Coordinate system works correctly with display layer  
✅ Maps work correctly for 2-8 players  
✅ Maps work correctly for sector sizes 1-4  
✅ Maps work correctly for densities 1-3  

---

## Notes

The current implementation in `map-generator.js` is already excellent and shows deep understanding of the original algorithm. The main work involves:
1. Resolving coordinate system questions
2. Adding missing game configuration support
3. Implementing player info tracking
4. Adding computer name generation

The core map generation algorithm is faithful to the original and doesn't need changes.

