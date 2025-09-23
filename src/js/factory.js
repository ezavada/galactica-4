// Factory class for Galactica-4
// Contains all factory-related data and logic

class Factory {
    constructor(starConstructor, shipConstructor) {
        this.starConstructor = require('./star.js');
        this.shipConstructor = require('./ship.js');
    }

    createStar(x, y, name) {
        return new this.starConstructor(x, y, name, this);
    }

    createShip(x, y, type, star) {
        return new this.shipConstructor(x, y, type, star, this);
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
