// Lightweight localization helpers for PDG ResourceManager strings.

function getString(id, fallback = '') {
    const pdgRef = typeof globalThis !== 'undefined' ? globalThis.pdg : undefined;
    if (!pdgRef || !pdgRef.res || typeof pdgRef.res.getString !== 'function') {
        return fallback;
    }
    return pdgRef.res.getString(id) || fallback;
}

function formatString(id, fallback, ...values) {
    const template = getString(id, fallback);
    return template.replace(/\{(\d+)\}/g, (match, index) => {
        const value = values[Number(index)];
        return value !== undefined && value !== null ? String(value) : match;
    });
}

function getShipTypeName(shipType, options = {}) {
    const capitalized = !!options.capitalized;
    const ids = capitalized
        ? { scout: 450, defense: 451, battleship: 452, colony: 453 }
        : { scout: 20, defense: 21, battleship: 22, colony: 23 };
    const fallbacks = capitalized
        ? { scout: 'Scout', defense: 'Defense', battleship: 'Battleship', colony: 'Colony' }
        : { scout: 'scout', defense: 'defense', battleship: 'battleship', colony: 'colony' };
    return getString(ids[shipType], fallbacks[shipType] || shipType);
}

function getEventWhyName(why) {
    if (typeof require === 'function') {
        const Common = require('./common.js');
        if (why === Common.EventWhy.COMBAT) {
            return getString(640, 'combat');
        }
        if (why === Common.EventWhy.NEW_DESTINATION) {
            return getString(641, 'new destination');
        }
    }
    return String(why);
}

module.exports = {
    getString,
    formatString,
    getShipTypeName,
    getEventWhyName
};
