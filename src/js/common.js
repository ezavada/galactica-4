// Common constants for Galactica-4

const StarRadius = 8;
const ShipRadius = 5;

const ObjectType = {
    UNKNOWN: 0,
    STAR: 1,
    SHIP: 2
}

const EventType = {
    SHIP_BUILT: 1,     // A ship was built at a star
    SHIP_DEPARTED: 2,  // Ship departed from a star
    SHIP_ARRIVED: 3,   // Ship arrived at a star
    SHIP_INTERCEPT: 4, // Ship intercepted another ship
    SHIP_STOPPED: 5,   // Ship stopped at a star
    SHIP_DESTROYED: 6, // A ship was destroyed
    SHIP_TASKED: 7,    // A ship was given a task
    // more ship events here
    TECH_LEVEL_UP: 10,  // A star reached a new tech level
    STAR_COLONIZED: 11, // A star was colonized
    STAR_CAPTURED: 12,  // A star was captured from another player
    PLAYER_DIED: 13,    // A player has been defeated
}

const EventWhy = {
    NOT_IMPORTANT: 0,
    COMBAT: 1,
    NEW_DESTINATION: 2,
}

// Computer player name generation (matches original STRx_CompNames and STRx_Names resources)
const CompNameTemplates = [
    "* %",              // "Alpha Pact"
    "The * %",          // "The Beta Alliance"
    "* Empire",         // "Gamma Empire"
    "* Confederation",  // "Delta Confederation"
    "The * Republic",   // "The Epsilon Republic"
    "* Federation",     // "Zeta Federation"
    "* Coalition",      // "Eta Coalition"
    "The * League",     // "The Theta League"
    "* Dominion",       // "Iota Dominion"
    "The * Union"       // "The Kappa Union"
];

// Group names used in computer player names (matches original STRx_CompNames)
const CompGroupNames = [
    "Pact", "Alliance", "Federation", "Confederation",
    "Coalition", "League", "Union", "Collective",
    "Consortium", "Dominion", "Commonwealth", "Hegemony",
    "Concord", "Accord", "Compact", "Entente",
    "Assembly", "Council", "Directorate", "Protectorate"
];

module.exports = {
    StarRadius,
    ShipRadius,
    ObjectType,
    EventType,
    EventWhy,
    CompNameTemplates,
    CompGroupNames
}
