// Factory class for Galactica-4
// Contains all factory-related data and logic

class Factory {
    constructor() {
        this.starConstructor = require('./star.js');
        this.shipConstructor = require('./ship.js');
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

    createShip(x, y, type, star) {
        const ship = new this.shipConstructor(x, y, type, star, this.game);
        this.game.entityAdded(ship);
        return ship;
    }

    isStar(object) {
        return object instanceof this.starConstructor;
    }

    isShip(object) {
        return object instanceof this.shipConstructor;
    }
}

// Export the class
module.exports = Factory;
