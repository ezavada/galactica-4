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
}

const EventWhy = {
    NOT_IMPORTANT: 0,
    COMBAT: 1,
    NEW_DESTINATION: 2,
}

module.exports = {
    StarRadius,
    ShipRadius,
    ObjectType,
    EventType,
    EventWhy
}
