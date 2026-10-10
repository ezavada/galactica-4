// Fleet class for Galactica-4
// Contains fleet management and ship coordination logic
// Ported from original C++ CFleet class

const Common = require('./common.js');
const Course = require('./course.js');
const I18n = require('./i18n.js');

class Fleet {
    get destination() { return this.course ? this.course.destination : null; }
    set destination(target) {
        if (!this.course) this.course=new Course(this);
        this.course.replace(target);
    }

    constructor(x, y, game, owner, name = null) {
        this.id = Fleet.nextId++; // Unique ID for this fleet
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.game = game;
        this.type = 'fleet';
        this.name = name || I18n.formatString(560, 'Fleet {0}', this.id);
        this.star = null;
        this.onPatrol = false;
        
        // Fleet composition
        this.ships = [];
        
        // Fleet stats (calculated from ships)
        this.totalPower = 0;
        this.totalSpeed = 0;
        this.techLevel = 0;
        this.totalDamage = 0;
        
        // Fleet properties
        this.destination = null;
        this.progress = 0;
        
        // Fog of War properties
        this.scannerRange = 0;
        this.stealth = 1;
        this.apparentSize = 1000000; // 1 million meters (smaller than stars)
        this.visibilityTo = []; // Array indexed by player number
        this.lastSeen = []; // Array indexed by player number
        this.lastSeenBy = []; // Array indexed by player number
        this._spatialLocation = null; // Track current spatial location
        
        // Fleet movement
        this.moveDelta = { x: 0, y: 0 };
        this.remainingDistance = 0;
        
        // Calculate initial stats
        this.calculateFleetStats();
    }
    
    static nextId = 1;
    
    // Add a ship to this fleet
    addShip(ship) {
        if (!ship) return false;
        if (this.ships.includes(ship)) return false;

        const previousStar = ship.star || null;

        if (ship.fleet && ship.fleet !== this) {
            const oldFleet = ship.fleet;
            const oldIndex = oldFleet.ships ? oldFleet.ships.indexOf(ship) : -1;
            if (oldIndex !== -1) {
                oldFleet.ships.splice(oldIndex, 1);
                oldFleet.calculateFleetStats();
            }
        }
        
        // Remove ship from its current location
        if (ship.star) {
            ship.star.removeShip(ship);
        }
        
        // Add to fleet
        this.ships.push(ship);
        ship.fleet = this;
        ship.star = null; // Ship is now in fleet, not at star
        ship.destination = null;
        ship.x = this.x;
        ship.y = this.y;
        if (ship.setPatrol) {
            ship.setPatrol(this.isOnPatrol());
        }
        if (!this.star && previousStar && !this.destination) {
            this.star = previousStar;
        } else if (previousStar && this.star && this.star !== previousStar) {
            this.star = null;
        }
        
        // Recalculate fleet stats
        this.calculateFleetStats();
        this.syncShipPositions();
        
        return true;
    }
    
    // Remove a ship from this fleet
    removeShip(ship) {
        const index = this.ships.indexOf(ship);
        if (index === -1) return false;
        
        this.ships.splice(index, 1);
        ship.fleet = null;
        ship.x = this.x;
        ship.y = this.y;
        if (ship.setPatrol) {
            ship.setPatrol(false);
        }
        if (ship.updateSpatialLocation) {
            ship.updateSpatialLocation();
        }
        
        // Recalculate fleet stats
        this.calculateFleetStats();
        
        return true;
    }
    
    // Calculate fleet statistics from constituent ships
    calculateFleetStats() {
        this.totalPower = 0;
        this.totalSpeed = 0;
        this.totalDamage = 0;
        this.techLevel = 0;
        this.scannerRange = 0;
        
        if (this.ships.length === 0) {
            return;
        }
        
        let maxTechLevel = 0;
        let maxScannerRange = 0;
        
        for (const ship of this.ships) {
            this.totalPower += ship.power || 0;
            this.totalSpeed += ship.speed || 0;
            this.totalDamage += ship.damage || 0;
            
            if (ship.techLevel > maxTechLevel) {
                maxTechLevel = ship.techLevel;
            }
            
            if (ship.scannerRange > maxScannerRange) {
                maxScannerRange = ship.scannerRange;
            }
        }
        
        this.techLevel = maxTechLevel;
        this.scannerRange = maxScannerRange;
        
        // Fleet speed is the slowest ship's speed (fleet moves as fast as slowest ship)
        if (this.ships.length > 0) {
            this.totalSpeed = Math.min(...this.ships.map(ship => ship.speed || 0));
        }
    }

    // Fog of War: accessors to match Star/Ship interface
    getScannerRange() {
        return this.scannerRange;
    }

    setScannerRange(range) {
        this.scannerRange = range;
    }

    getStealth() {
        return this.stealth;
    }

    setStealth(stealth) {
        this.stealth = stealth;
    }

    getApparentSize() {
        return this.apparentSize;
    }

    setApparentSize(size) {
        this.apparentSize = size;
    }

    getVisibilityTo(playerNum) {
        return this.visibilityTo[playerNum] || Common.VisibilityLevel.NONE;
    }

    setVisibilityTo(playerNum, visibility) {
        this.visibilityTo[playerNum] = visibility;
    }

    getLastSeen(playerNum) {
        return this.lastSeen[playerNum] || 0;
    }

    setLastSeen(playerNum, turn) {
        this.lastSeen[playerNum] = turn;
    }
    
    // Get fleet attack strength (sum of ship attack strengths)
    getAttackStrength() {
        let totalAttack = 0;
        for (const ship of this.ships) {
            totalAttack += ship.getAttackStrength ? ship.getAttackStrength() : 0;
        }
        return totalAttack;
    }
    
    // Get fleet defense strength (sum of ship defense strengths)
    getDefenseStrength() {
        let totalDefense = 0;
        for (const ship of this.ships) {
            totalDefense += ship.getDefenseStrength ? ship.getDefenseStrength() : 0;
        }
        return totalDefense;
    }
    
    // Check if fleet is empty
    isEmpty() {
        return this.ships.length === 0;
    }
    
    // Check if fleet is dead (all ships destroyed)
    isDead() {
        return this.ships.length === 0;
    }
    
    // Get fleet size
    getSize() {
        return this.ships.length;
    }
    
    // Check if fleet contains a specific ship type
    hasShipType(shipType) {
        return this.ships.some(ship => ship.type === shipType);
    }
    
    // Get ships of a specific type
    getShipsOfType(shipType) {
        return this.ships.filter(ship => ship.type === shipType);
    }
    
    // Check if fleet is owned by a specific player
    isOwnedBy(playerId) {
        return this.owner === playerId;
    }
    
    // Check if fleet is allied with a specific player
    isAllyOf(playerId) {
        return this.game.players[this.owner] && 
               this.game.players[this.owner].isAllyOf(playerId);
    }
    
    // Move fleet to a destination
    setDestination(destination) {
        this.destination = destination;
        this.progress = 0;
        if (destination) {
            this.star = null;
            this.setPatrol(false);
        }
        if (destination) {
            const dx = destination.x - this.x;
            const dy = destination.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const destLabel = (this.game && this.game.getObjectType) ? this.game.getObjectType(destination) : null;
            console.log(`🎯 FLEET DESTINATION SET: fleet (ID: ${this.id}, ships: ${this.ships.length}) -> ${destLabel !== null ? 'object type ' + destLabel : 'point'} (${destination.x.toFixed(0)}, ${destination.y.toFixed(0)}), Distance: ${distance.toFixed(1)}`);
        } else {
            console.log(`🎯 FLEET DESTINATION CLEARED: fleet (ID: ${this.id}, ships: ${this.ships.length})`);
        }
        this.calculateMovement();
    }
    
    // Calculate movement delta for fleet
    calculateMovement() {
        if (!this.destination) {
            this.moveDelta = { x: 0, y: 0 };
            this.remainingDistance = 0;
            return;
        }
        
        const dx = this.destination.x - this.x;
        const dy = this.destination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            this.moveDelta = { x: 0, y: 0 };
            this.remainingDistance = 0;
            return;
        }
        
        // Fleet moves at the speed of its slowest ship
        const speed = this.totalSpeed;
        const moveRatio = speed / distance;
        
        this.moveDelta = {
            x: dx * moveRatio,
            y: dy * moveRatio
        };
        
        this.remainingDistance = distance;
    }
    
    // Move the fleet one turn
    move() {
        if(this.destination && this.totalSpeed>0)this.star=null;
        if(this.destination && this.game && this.game.movePursuedTargetFirst)this.game.movePursuedTargetFirst(this);
        if(this.game && this.game.movementTurn && (!this.game.allFleets.includes(this) || this.isEmpty()))return false;
        if (this.destination) this.calculateMovement();
        if (!this.destination || this.totalSpeed <= 0) {
            console.log(`⏸️ FLEET NOT MOVING: fleet (ID: ${this.id}, ships: ${this.ships.length}) - Destination: ${this.destination ? 'set' : 'none'}`);
            return false;
        }
        
        const moveDistance = this.totalSpeed;
        
        if (this.remainingDistance <= moveDistance) {
            // Arrive at destination
            this.x = this.destination.x;
            this.y = this.destination.y;
            this.remainingDistance = 0;
            this.syncShipPositions();
            console.log(`🎯 FLEET ARRIVED: fleet (ID: ${this.id}, ships: ${this.ships.length}) at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
            this.arriveAtDestination();
            return true;
        } else {
            // Continue moving
            const oldX = this.x;
            const oldY = this.y;
            this.x += this.moveDelta.x;
            this.y += this.moveDelta.y;
            this.remainingDistance -= moveDistance;
            this.syncShipPositions();
            console.log(`📍 FLEET MOVED: fleet (ID: ${this.id}, ships: ${this.ships.length}) from (${oldX.toFixed(0)}, ${oldY.toFixed(0)}) to (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) - Moved ${moveDistance.toFixed(0)} pixels`);
            return false;
        }
    }

    syncShipPositions() {
        for (const ship of this.ships) {
            ship.x = this.x;
            ship.y = this.y;
            if (ship.updateSpatialLocation) {
                ship.updateSpatialLocation();
            }
        }
        if (this.updateSpatialLocation) {
            this.updateSpatialLocation();
        }
    }

    updateSpatialLocation() {
        if (this.game && this.game.spatialPartition) {
            this.game.spatialPartition.updateEntityPosition(
                this,
                Common.SpatialConstants.ENTITY_TYPE_FLEET,
                this.x,
                this.y
            );
        }
    }
    
    // Handle fleet arrival at destination
    arriveAtDestination() {
        if (!this.destination) return;
        if (!this.game || typeof this.game.getObjectType !== 'function') {
            // Minimal behavior for tests/mocks: just clear destination
            this.destination = null;
            this.progress = 0;
            return;
        }
        
        const arrivingObjectType = this.game.getObjectType(this.destination);
        const arrivingDestination = this.destination;
        const revision = this.course.revision;
        
        if (arrivingObjectType === Common.ObjectType.SHIP) {
            // Fleet arrived at a ship - check if they can form a fleet
            if (this.owner === arrivingDestination.owner && arrivingDestination.canFormFleet()) {
                if (typeof this.game.applyTechnologyTransferToDestination === 'function') {
                    this.game.applyTechnologyTransferToDestination(this, arrivingDestination);
                }
                this.game.handleFleetFormation(this, arrivingDestination);
            } else if (this.game.shouldResolveCombat && this.game.shouldResolveCombat(this, arrivingDestination)) {
                this.game.resolveCombat(this, arrivingDestination);
                if (!this.isEmpty() && typeof this.game.applyTechnologyTransferToDestination === 'function') {
                    this.game.applyTechnologyTransferToDestination(this, arrivingDestination);
                }
            }
        } else if (arrivingObjectType === Common.ObjectType.FLEET) {
            // Fleet arrived at another fleet - merge them if same owner
            if (this.owner === arrivingDestination.owner) {
                if (typeof this.game.applyTechnologyTransferToDestination === 'function') {
                    this.game.applyTechnologyTransferToDestination(this, arrivingDestination);
                }
                this.game.mergeFleets(this, arrivingDestination);
            } else if (this.game.shouldResolveCombat && this.game.shouldResolveCombat(this, arrivingDestination)) {
                this.game.resolveCombat(this, arrivingDestination);
                if (!this.isEmpty() && typeof this.game.applyTechnologyTransferToDestination === 'function') {
                    this.game.applyTechnologyTransferToDestination(this, arrivingDestination);
                }
            } else {
                console.log(`Fleet ${this.id} arrived at enemy fleet`);
            }
        } else if (arrivingObjectType === Common.ObjectType.STAR) {
            console.log(`Fleet ${this.id} arrived at star ${arrivingDestination.name}`);
            if (this.game.shouldResolveCombat && this.game.shouldResolveCombat(this, arrivingDestination)) {
                this.game.resolveCombat(this, arrivingDestination);
            } else if (arrivingDestination.owner === 0 && this.hasShipType('colony') && this.game.colonizeStar) {
                const colonyShip = this.getShipsOfType('colony')[0];
                this.game.colonizeStar(arrivingDestination, colonyShip, 0);
            }
            if (this.isEmpty && this.isEmpty()) {
                this.game.removeDestroyedFleet(this, this.owner);
            } else if (arrivingDestination.owner === this.owner) {
                this.star = arrivingDestination;
                this.x = arrivingDestination.x;
                this.y = arrivingDestination.y;
                this.syncShipPositions();
                if (typeof this.game.applyTechnologyTransferToStar === 'function') {
                    this.game.applyTechnologyTransferToStar(this, arrivingDestination);
                }
            }
        } else if (arrivingObjectType === Common.ObjectType.RENDEZVOUS) {
            console.log(`Fleet ${this.id} arrived at rendezvous ${arrivingDestination.name}`);
            if (this.owner === arrivingDestination.owner && typeof this.game.handleRendezvousArrival === 'function') {
                this.game.handleRendezvousArrival(this, arrivingDestination);
            }
        } else {
            console.log(`Fleet ${this.id} arrived at destination`);
        }
        
        if (!this.isEmpty() && (!this.game.allFleets || this.game.allFleets.includes(this))) this.course.advance(revision);
        this.progress = 0;
    }
    
    // Remove dead ships from fleet
    removeDeadShips() {
        const aliveShips = this.ships.filter(ship => !ship.isDead || !ship.isDead());
        const removedCount = this.ships.length - aliveShips.length;
        
        if (removedCount > 0) {
            this.ships = aliveShips;
            for (const ship of this.ships) {
                ship.fleet = this;
            }
            this.calculateFleetStats();
            console.log(`Removed ${removedCount} dead ships from fleet ${this.id}`);
        }
        
        return removedCount;
    }

    removeDead() {
        return this.removeDeadShips();
    }

    destroyedInCombat(attackerOwner) {
        console.log(`Fleet ${this.id} destroyed in combat by player ${attackerOwner}`);
        if (this.game && typeof this.game.removeDestroyedFleet === 'function') {
            this.game.removeDestroyedFleet(this, attackerOwner);
        }
    }

    underConstruction() {
        return false;
    }

    isDocked() {
        return !!this.star;
    }

    isInFleet() {
        return false;
    }

    canFormFleet() {
        return false;
    }

    isOnPatrol() {
        return !!this.onPatrol;
    }

    setPatrol(onPatrol) {
        this.onPatrol = !!onPatrol;
        for (const ship of this.ships) {
            if (ship.setPatrol && !ship.destination) {
                ship.setPatrol(this.onPatrol);
            }
        }
    }

    repairDamage(amount) {
        let repairRemaining = amount;
        let repairedTotal = 0;
        for (const ship of this.ships) {
            if (!ship || ship.type === 'defense' || !ship.repairDamage || ship.isOnPatrol && ship.isOnPatrol()) {
                continue;
            }
            const repaired = ship.repairDamage(repairRemaining);
            repairedTotal += repaired;
            repairRemaining -= repaired;
            if (repairRemaining <= 0) {
                break;
            }
        }
        this.calculateFleetStats();
        return repairedTotal;
    }
    
    // Get fleet information for display
    getInfo() {
        return {
            id: this.id,
            owner: this.owner,
            shipCount: this.ships.length,
            totalPower: this.totalPower,
            totalSpeed: this.totalSpeed,
            techLevel: this.techLevel,
            scannerRange: this.scannerRange,
            position: { x: this.x, y: this.y },
            destination: this.destination,
            remainingDistance: this.remainingDistance
        };
    }
    
    // Display and interaction methods
    getSize() {
        return this.ships.length;
    }
    
    isEmpty() {
        return this.ships.length === 0;
    }
    
    isDead() {
        return this.isEmpty();
    }
    
    isVisibleTo(playerId) {
        return this.owner === playerId || this.getVisibilityTo(playerId) > Common.VisibilityLevel.NONE;
    }
    
    isFleet() {
        return true;
    }
    
    isStar() {
        return false;
    }
    
    isShip() {
        return false;
    }
    
    // (Removed duplicate setDestination/move implementations below)
}

module.exports = Fleet;
