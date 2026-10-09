// Factory class for Galactica-4
// Contains all factory-related data and logic

class Factory {
    constructor() {
        this.starConstructor = require('./star.js');
        this.shipConstructor = require('./ship.js');
        this.fleetConstructor = require('./fleet.js');
        this.rendezvousConstructor = require('./rendezvous.js');
        this.game = null;
    }

    setGame(game) {
        this.game = game;
    }

    createStar(x, y, name) {
        const star = new this.starConstructor(x, y, name, this.game);
        this.game.entityAdded(star);
        return star;
    }

    createShip(x, y, type, star, completed = false) {
        const ship = new this.shipConstructor(x, y, type, star, this.game, star.owner);
        if (completed) ship.complete();
        this.game.entityAdded(ship);
        return ship;
    }
    
    createFleet(x, y, owner, name = null) {
        const fleet = new this.fleetConstructor(x, y, this.game, owner, name);
        this.game.entityAdded(fleet);
        return fleet;
    }

    createRendezvous(x, y, owner, name = null, anchor = null) {
        const rendezvous = new this.rendezvousConstructor(x, y, this.game, owner, name, anchor);
        this.game.entityAdded(rendezvous);
        return rendezvous;
    }

    isStar(object) {
        return object instanceof this.starConstructor;
    }

    isShip(object) {
        return object instanceof this.shipConstructor;
    }
    
    isFleet(object) {
        return object instanceof this.fleetConstructor;
    }

    isRendezvous(object) {
        return object instanceof this.rendezvousConstructor;
    }
}

// Export the class
module.exports = Factory;
