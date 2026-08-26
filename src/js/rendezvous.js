// Rendezvous point class for Galactica-4
// A lightweight named map marker that remembers the fleet assembling there.

const Common = require('./common.js');
const I18n = require('./i18n.js');

class Rendezvous {
    constructor(x, y, game, owner, name = null, anchor = null) {
        this.id = Rendezvous.nextId++;
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.game = game;
        this.type = 'rendezvous';
        this.name = name || I18n.formatString(655, 'Rendezvous {0}', this.id);
        this.fleet = null;
        this.anchor = null;

        // Fog of war properties. v3 rendezvous points are player-private map
        // markers, so they intentionally do not scan or reveal to opponents.
        this.scannerRange = 0;
        this.stealth = Number.MAX_SAFE_INTEGER;
        this.apparentSize = 0;
        this.visibilityTo = [];
        this.lastSeen = [];
        this.lastSeenBy = [];
        this._spatialLocation = null;

        if (anchor) {
            this.setAnchor(anchor);
        }
    }

    static nextId = 1;

    setAnchor(anchor) {
        this.anchor = anchor || null;
        this.syncToAnchor();
    }

    syncToAnchor() {
        if (!this.anchor) {
            return false;
        }

        const oldX = this.x;
        const oldY = this.y;
        this.x = this.anchor.x;
        this.y = this.anchor.y;

        if (oldX !== this.x || oldY !== this.y) {
            this.updateSpatialLocation();
            return true;
        }
        return false;
    }

    moveTo(x, y, anchor = null) {
        this.anchor = anchor || null;
        this.x = x;
        this.y = y;
        this.updateSpatialLocation();
        this.clearFleetIfAway();
    }

    getFleet() {
        this.clearFleetIfAway();
        return this.fleet;
    }

    setFleet(fleet) {
        if (!fleet || (fleet.isEmpty && fleet.isEmpty())) {
            this.fleet = null;
            return null;
        }
        this.fleet = fleet;
        return this.fleet;
    }

    clearFleetIfAway() {
        if (!this.fleet) {
            return false;
        }
        if ((this.fleet.isEmpty && this.fleet.isEmpty()) || !this.isFleetAtPoint(this.fleet)) {
            this.fleet = null;
            return true;
        }
        return false;
    }

    isFleetAtPoint(fleet) {
        if (!fleet) {
            return false;
        }
        return fleet.owner === this.owner &&
            Math.abs(fleet.x - this.x) < 5 &&
            Math.abs(fleet.y - this.y) < 5;
    }

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

    isVisibleTo(playerNum) {
        return this.owner === playerNum || this.getVisibilityTo(playerNum) > Common.VisibilityLevel.NONE;
    }

    updateSpatialLocation() {
        if (this.game && this.game.spatialPartition) {
            this.game.spatialPartition.updateEntityPosition(
                this,
                Common.SpatialConstants.ENTITY_TYPE_RENDEZVOUS,
                this.x,
                this.y
            );
        }
    }

    isRendezvous() {
        return true;
    }

    isFleet() {
        return false;
    }

    isStar() {
        return false;
    }

    isShip() {
        return false;
    }
}

module.exports = Rendezvous;
