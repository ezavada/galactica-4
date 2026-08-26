// AI Decision Matrices for Galactica-4
// Exact replication of the decision matrices from UShipUtils.cpp
// Each matrix contains the original 34 factors affecting AI ship decisions,
// a v3 end-marker row, and opt-in experimental factors for genetic AI tuning.

// Decision matrix structure: [toOurStar, toEnemyStar, toOtherStar, toShip, toFormFleet]
const ACTION_COLUMNS = ['toOurStar', 'toEnemyStar', 'toOtherStar', 'toShip', 'toFormFleet'];
const LEGACY_END_MARKER_INDEX = 34;
const GENETIC_FACTOR_START_INDEX = 35;

const GENETIC_AI_FACTORS = {
    EMPIRE_HAS_FEW_STARS: 35,
    EMPIRE_HAS_MANY_STARS: 36,
    HAS_IDLE_COLONY: 37,
    NO_IDLE_COLONY: 38,
    ENEMY_STAR_HAS_COLONY_SUPPORT: 39,
    ENEMY_STAR_LACKS_COLONY_SUPPORT: 40,
    OWNED_TARGET_THREATENED: 41,
    CURRENT_STAR_SAFE: 42,
    UNOWNED_TARGET_ON_FRONTIER: 43,
    OWNED_TARGET_ALREADY_ASSIGNED: 44,
    ENEMY_TARGET_ALREADY_ASSIGNED: 45,
    UNOWNED_TARGET_ALREADY_ASSIGNED: 46,
    SHIP_TARGET_ALREADY_ASSIGNED: 47,
    FLEET_READY_FOR_ATTACK: 48,
    SCOUT_STANDOFF_AVAILABLE: 49,
    WE_WERE_RECENTLY_ATTACKED: 50,
    OWNED_TARGET_RECENTLY_ATTACKED: 51,
    CURRENT_STAR_RECENTLY_ATTACKED: 52,
    ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US: 53,
    ENEMY_SHIP_OWNER_RECENTLY_ATTACKED_US: 54,
    WE_RECENTLY_ATTACKED_TARGET_OWNER: 55,
    RECENT_ATTACK_TARGET_WAS_STAR: 56,
    RECENT_ATTACK_TARGET_WAS_MOBILE: 57,
    NO_ENEMY_STARS_REMAIN: 58,
    ONLY_US_HAS_STARS: 59,
    ENEMY_SHIP_OWNER_HAS_NO_STARS: 60
};

const GENETIC_FACTOR_NAMES = {
    [GENETIC_AI_FACTORS.EMPIRE_HAS_FEW_STARS]: 'Empire has few stars',
    [GENETIC_AI_FACTORS.EMPIRE_HAS_MANY_STARS]: 'Empire has many stars',
    [GENETIC_AI_FACTORS.HAS_IDLE_COLONY]: 'Has idle colony ship',
    [GENETIC_AI_FACTORS.NO_IDLE_COLONY]: 'No idle colony ship',
    [GENETIC_AI_FACTORS.ENEMY_STAR_HAS_COLONY_SUPPORT]: 'Enemy star has colony support',
    [GENETIC_AI_FACTORS.ENEMY_STAR_LACKS_COLONY_SUPPORT]: 'Enemy star lacks colony support',
    [GENETIC_AI_FACTORS.OWNED_TARGET_THREATENED]: 'Owned target is threatened',
    [GENETIC_AI_FACTORS.CURRENT_STAR_SAFE]: 'Current star is safe',
    [GENETIC_AI_FACTORS.UNOWNED_TARGET_ON_FRONTIER]: 'Unowned target is on frontier',
    [GENETIC_AI_FACTORS.OWNED_TARGET_ALREADY_ASSIGNED]: 'Owned target already has friendly assignment',
    [GENETIC_AI_FACTORS.ENEMY_TARGET_ALREADY_ASSIGNED]: 'Enemy target already has friendly assignment',
    [GENETIC_AI_FACTORS.UNOWNED_TARGET_ALREADY_ASSIGNED]: 'Unowned target already has friendly assignment',
    [GENETIC_AI_FACTORS.SHIP_TARGET_ALREADY_ASSIGNED]: 'Ship target already has friendly assignment',
    [GENETIC_AI_FACTORS.FLEET_READY_FOR_ATTACK]: 'Fleet or local force is ready for attack',
    [GENETIC_AI_FACTORS.SCOUT_STANDOFF_AVAILABLE]: 'Scout standoff scan is available',
    [GENETIC_AI_FACTORS.WE_WERE_RECENTLY_ATTACKED]: 'Our empire was recently attacked',
    [GENETIC_AI_FACTORS.OWNED_TARGET_RECENTLY_ATTACKED]: 'Owned target was recently attacked',
    [GENETIC_AI_FACTORS.CURRENT_STAR_RECENTLY_ATTACKED]: 'Current star was recently attacked',
    [GENETIC_AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US]: 'Enemy star owner recently attacked us',
    [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_RECENTLY_ATTACKED_US]: 'Enemy ship owner recently attacked us',
    [GENETIC_AI_FACTORS.WE_RECENTLY_ATTACKED_TARGET_OWNER]: 'We recently attacked target owner',
    [GENETIC_AI_FACTORS.RECENT_ATTACK_TARGET_WAS_STAR]: 'Recent attack target was a star',
    [GENETIC_AI_FACTORS.RECENT_ATTACK_TARGET_WAS_MOBILE]: 'Recent attack target was a ship or fleet',
    [GENETIC_AI_FACTORS.NO_ENEMY_STARS_REMAIN]: 'No enemy stars remain',
    [GENETIC_AI_FACTORS.ONLY_US_HAS_STARS]: 'Only our empire still has stars',
    [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_HAS_NO_STARS]: 'Enemy ship owner has no stars'
};

function createZeroWeights() {
    return [0, 0, 0, 0, 0];
}

function withGeneticFactorRows(baseRows) {
    const rows = baseRows.map(row => row.slice());
    for (const factorIndex of Object.values(GENETIC_AI_FACTORS)) {
        rows[factorIndex] = createZeroWeights();
    }
    return rows;
}

const SHIP_DECISION_MATRICES = {
    scout: withGeneticFactorRows([
        [-50, -50, -50, -50, -50],  // 0. already moving toward a star or ship
        [-90,   0,   0,   0,   0],  // 1. no nearby owned star
        [ 20, -90,   0,   0,   0],  // 2. no nearby enemy star
        [ 20,   0, -90,   0,   0],  // 3. no nearby unowned star
        [  0,   0,   0, -90,   0],  // 4. no nearby enemy ship
        [  0,   0,   0,   0,   0],  // 5. nearby enemy ship exists
        [  0,   0,   0,   0,   0],  // 6. enemy ship is faster
        [  5,   0,   0,   0,   0],  // 7. we are closer to ship than any planet
        [  0,   0,  10,   0,   0],  // 8. our star already has a ship of this class
        [  0,   0,   0,   0,   0],  // 9. enemy ship more powerful
        [ 10, -90,   0, -90, -90],  //10. we are not at a star
        [-10, -90, -20, -90, -90],  //11. we are at a star
        [  0,   0,  10,   0,   0],  //12. enemy star more powerful
        [  0,   0,   0,   0,   0],  //13. enemy star already has a ship
        [  0,   0,   5,   0,   0],  //14. unowned star exists
        [  0,   0,  20,   0,   0],  //15. unowned star closer than enemy star
        [ 30,   0, -20,   0,   0],  //16. our star has lower tech level than this ship
        [  0,   0,   0,   0,   0],  //17. enemy star closest star
        [  0,   0, -50,   0,   0],  //18. unowned star already has ship
        [  0,   0,  10,   0,   0],  //19. enemy star has low population
        [ 50,   0,   0,   0,   0],  //20. target just changed ownership (cancel out #0)
        [  1,   0,   0,   0,   0],  //21. relative our ship/enemy ship speed multiplier
        [  0,   0,   0,   0,   0],  //22. relative our star/enemy ship power multiplier
        [  0,   0,   0,   0,   0],  //23. relative our ship/enemy ship power multiplier
        [  0,   0,   0,   0,   0],  //24. relative our ship/enemy star power multiplier
        [  0,   0,   0,   0,   0],  //25. enemy star unprotected
        [  0,   0,   0,   0,   0],  //26. our star has no ship of this class
        [  0,   0,   0,   0,   0],  //27. owned star closer to enemy star than we are
        [  0,   0,   0,   0,   0],  //28. enemy ship is a scout
        [  1,   0,   0,   0,   0],  //29. we are damaged
        [  2,   0,   0,   0,   0],  //30. we are heavily damaged (> 50%)
        [  0,   0,   5,   0,   0],  //31. star we are at has other ships of our class
        [  5,   0,   5,   0,   0],  //32. we are at unowned star
        [  0,   0,   0,   0,   0],  //33. no fleet exists at this star
        [  0,   0,   0,   0,   0]   //34. end marker
    ]),

    colony: withGeneticFactorRows([
        [-50, -50, -30, -50, -50],  // 0. already moving toward a star or ship
        [-90,   0,   0,   0,   0],  // 1. no nearby owned star
        [  0, -90,   0,   0,   0],  // 2. no nearby enemy star
        [  0,   0, -90,   0,   0],  // 3. no nearby unowned star
        [  0,   0,   0, -90,   0],  // 4. no nearby enemy ship
        [ 10,   5,  10,   0,   0],  // 5. nearby enemy ship exists
        [ 10,   0,   0,   0,   5],  // 6. enemy ship is faster
        [ 10,   0,  10,   0,   0],  // 7. we are closer to ship than any planet
        [  0,   0,  20,   0, -15],  // 8. our star already has a ship of this class
        [  0, -10,   0,   0,   5],  // 9. enemy ship more powerful
        [ 30,   0,  40, -40, -90],  //10. we are not at a star
        [-50, -20, -10, -40,  10],  //11. we are at a star
        [  0, -20,   5, -20,   5],  //12. enemy star more powerful
        [  0, -30,   0,   0,   5],  //13. enemy star already has a ship
        [  0,   0,  20,   0,   0],  //14. unowned star exists
        [  0,   0,  90,   0,   0],  //15. unowned star closer than enemy star
        [  0,   0,   0,   0,   0],  //16. our star has lower tech level than this ship
        [  0,  10,   0,   0,   5],  //17. enemy star closest star
        [  0,   0,   0,   0,   0],  //18. unowned star already has ship
        [  0,  10,   0,   0,   0],  //19. enemy star has low population
        [ 50,  50,  30,  50,  50],  //20. target just changed ownership (cancel out #0)
        [  0,   0,   0,   0,   0],  //21. relative our ship/enemy ship speed multiplier
        [ -2,   0,   2,   0,   0],  //22. relative our star/enemy ship power multiplier
        [  0,   0,   0,   1,   0],  //23. relative our ship/enemy ship power multiplier
        [  0,   4,   0,   0,   0],  //24. relative our ship/enemy star power multiplier
        [  0,  10,   0,   0,  -1],  //25. enemy star unprotected
        [  0,   0,   0,   0,   0],  //26. our star has no ship of this class
        [  0,   0,   0,   0,   0],  //27. owned star closer to enemy star than we are
        [  0,   0,   0,   0,   0],  //28. enemy ship is a scout
        [  2, -10,   0, -10,   5],  //29. we are damaged
        [  4, -20,   0, -20,  10],  //30. we are heavily damaged (> 50%)
        [  0,   0,   0,   0,   0],  //31. star we are at has other ships of our class
        [  0,   0,   0,   0,   0],  //32. we are at unowned star
        [  0,   0,   0,   0,   0],  //33. no fleet exists at this star
        [  0,   0,   0,   0,   0]   //34. end marker
    ]),

    battleship: withGeneticFactorRows([
        [-50, -20, -50, -30, -50],  // 0. already moving toward a star or ship
        [-90,   0,   0,   0,   0],  // 1. no nearby owned star
        [  0, -90,   0,   0,   5],  // 2. no nearby enemy star
        [  0,   0, -90,   0,   0],  // 3. no nearby unowned star
        [  0,   0,   0, -90,   0],  // 4. no nearby enemy ship
        [  0,   0,   0,  10,   0],  // 5. nearby enemy ship exists
        [  0,   0,   0,   0,   5],  // 6. enemy ship is faster
        [  0,   0,   0,  10,   0],  // 7. we are closer to ship than any planet
        [  0,  20,  10,  10,  10],  // 8. our star already has a ship of this class
        [ 10, -20,   0, -10,  10],  // 9. enemy ship more powerful
        [ 40,   0,   0,   0, -90],  //10. we are not at a star
        [-40, -10, -10, -10,   5],  //11. we are at a star
        [  0, -10,   0,   0,  10],  //12. enemy star more powerful
        [  0, -30,   0,   0,  10],  //13. enemy star already has a ship
        [  0,   0,  10,   0,   0],  //14. unowned star exists
        [  0,   0,  20,   0,   0],  //15. unowned star closer than enemy star
        [ 10,   0,   0,   0,   0],  //16. our star has lower tech level than this ship
        [  0,  20,   0,   0,   5],  //17. enemy star closest star
        [  0,   0, -20,   0,   0],  //18. unowned star already has ship
        [  0,  20,   0,   0,   0],  //19. enemy star has low population
        [ 50,  20,  50,  30,  50],  //20. target just changed ownership (cancel out #0)
        [  0,   0,   0,   0,   0],  //21. relative our ship/enemy ship speed multiplier
        [ -2,   0,   0,  -1,  -2],  //22. relative our star/enemy ship power multiplier
        [  0,   0,   0,   1,  -2],  //23. relative our ship/enemy ship power multiplier
        [  0,   3,   0,   0,  -2],  //24. relative our ship/enemy star power multiplier
        [  0,  20,   0,   0,   0],  //25. enemy star unprotected
        [-10,   0,   0,   0,   0],  //26. our star has no ship of this class
        [ 30,   0,   0,   0,   0],  //27. owned star closer to enemy star than we are
        [  0,   0,   0,  20,   0],  //28. enemy ship is a scout
        [ 10, -10,   0, -10,   0],  //29. we are damaged
        [ 20, -20,   0, -20,   0],  //30. we are heavily damaged (> 50%)
        [  0,   0,   0,   0,   5],  //31. star we are at has other ships of our class
        [  0,   0,   0,   0, -10],  //32. we are at unowned star
        [  0,   0,   0,   0, -20],  //33. no fleet exists at this star
        [  0,   0,   0,   0,   0]   //34. end marker
    ])
};

function normalizeWeights(weights = []) {
    const normalized = createZeroWeights();
    for (let i = 0; i < ACTION_COLUMNS.length; i++) {
        const value = Number(weights[i]);
        normalized[i] = Number.isFinite(value) ? Math.round(value) : 0;
    }
    return normalized;
}

function createOverlayRows(rowOverrides = {}) {
    const maxIndex = Math.max(
        LEGACY_END_MARKER_INDEX,
        ...Object.values(GENETIC_AI_FACTORS),
        ...Object.keys(rowOverrides).map(index => Number(index)).filter(Number.isFinite)
    );
    const rows = [];
    for (let i = 0; i <= maxIndex; i++) {
        rows[i] = createZeroWeights();
    }
    for (const [factorIndex, weights] of Object.entries(rowOverrides)) {
        rows[Number(factorIndex)] = normalizeWeights(weights);
    }
    return rows;
}

function clampWeight(value, minWeight = -250, maxWeight = 250) {
    return Math.max(minWeight, Math.min(maxWeight, Math.round(value)));
}

function combineDecisionMatrices(baseMatrix, overlayMatrix = [], options = {}) {
    const minWeight = options.minWeight !== undefined ? options.minWeight : -250;
    const maxWeight = options.maxWeight !== undefined ? options.maxWeight : 250;
    const maxLength = Math.max(
        baseMatrix ? baseMatrix.length : 0,
        overlayMatrix ? overlayMatrix.length : 0,
        Math.max(...Object.values(GENETIC_AI_FACTORS)) + 1
    );
    const combined = [];

    for (let rowIndex = 0; rowIndex < maxLength; rowIndex++) {
        const baseWeights = baseMatrix && baseMatrix[rowIndex] ? baseMatrix[rowIndex] : createZeroWeights();
        const overlayWeights = overlayMatrix && overlayMatrix[rowIndex] ? overlayMatrix[rowIndex] : createZeroWeights();
        combined[rowIndex] = ACTION_COLUMNS.map((_, columnIndex) =>
            clampWeight((baseWeights[columnIndex] || 0) + (overlayWeights[columnIndex] || 0), minWeight, maxWeight)
        );
    }

    return combined;
}

const EXPERT_DECISION_MATRIX_OVERLAYS = {
    scout: createOverlayRows({
        [GENETIC_AI_FACTORS.EMPIRE_HAS_FEW_STARS]: [0, -10, 20, 0, 0],
        [GENETIC_AI_FACTORS.UNOWNED_TARGET_ON_FRONTIER]: [0, 0, 90, 0, 0],
        [GENETIC_AI_FACTORS.UNOWNED_TARGET_ALREADY_ASSIGNED]: [0, 0, -90, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_TARGET_ALREADY_ASSIGNED]: [0, -70, 0, 0, 0],
        [GENETIC_AI_FACTORS.SHIP_TARGET_ALREADY_ASSIGNED]: [0, 0, 0, -70, 0],
        [GENETIC_AI_FACTORS.SCOUT_STANDOFF_AVAILABLE]: [0, -20, 110, 0, 0],
        [GENETIC_AI_FACTORS.WE_WERE_RECENTLY_ATTACKED]: [15, -10, 0, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US]: [0, -20, 50, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_RECENTLY_ATTACKED_US]: [10, 0, 0, -20, 0],
        [GENETIC_AI_FACTORS.NO_ENEMY_STARS_REMAIN]: [35, -50, 0, -25, 0],
        [GENETIC_AI_FACTORS.ONLY_US_HAS_STARS]: [35, -50, 0, -25, 0],
        [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_HAS_NO_STARS]: [25, 0, 0, -30, 0]
    }),
    colony: createOverlayRows({
        [GENETIC_AI_FACTORS.EMPIRE_HAS_FEW_STARS]: [0, -20, 50, 0, 0],
        [GENETIC_AI_FACTORS.NO_IDLE_COLONY]: [0, -45, 25, 0, 0],
        [GENETIC_AI_FACTORS.HAS_IDLE_COLONY]: [0, 15, -20, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_STAR_HAS_COLONY_SUPPORT]: [0, 25, 0, 0, 0],
        [GENETIC_AI_FACTORS.UNOWNED_TARGET_ON_FRONTIER]: [0, 0, 30, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_TARGET_ALREADY_ASSIGNED]: [0, -80, 0, 0, 0],
        [GENETIC_AI_FACTORS.UNOWNED_TARGET_ALREADY_ASSIGNED]: [0, 0, -80, 0, 0],
        [GENETIC_AI_FACTORS.SHIP_TARGET_ALREADY_ASSIGNED]: [0, 0, 0, -70, 0],
        [GENETIC_AI_FACTORS.WE_WERE_RECENTLY_ATTACKED]: [35, -25, 10, -10, 0],
        [GENETIC_AI_FACTORS.OWNED_TARGET_RECENTLY_ATTACKED]: [55, -20, 0, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US]: [0, -35, 0, 0, 0],
        [GENETIC_AI_FACTORS.WE_RECENTLY_ATTACKED_TARGET_OWNER]: [0, 25, -10, 0, 0],
        [GENETIC_AI_FACTORS.NO_ENEMY_STARS_REMAIN]: [50, -60, -25, -40, 0],
        [GENETIC_AI_FACTORS.ONLY_US_HAS_STARS]: [50, -60, -25, -40, 0],
        [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_HAS_NO_STARS]: [40, 0, 0, -45, 0]
    }),
    battleship: createOverlayRows({
        [GENETIC_AI_FACTORS.EMPIRE_HAS_FEW_STARS]: [15, -10, 0, 0, 0],
        [GENETIC_AI_FACTORS.EMPIRE_HAS_MANY_STARS]: [0, 20, 0, 5, 5],
        [GENETIC_AI_FACTORS.ENEMY_STAR_HAS_COLONY_SUPPORT]: [0, 45, 0, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_STAR_LACKS_COLONY_SUPPORT]: [10, -35, 0, 10, 15],
        [GENETIC_AI_FACTORS.OWNED_TARGET_THREATENED]: [160, -35, 0, -15, 5],
        [GENETIC_AI_FACTORS.CURRENT_STAR_SAFE]: [0, 20, 0, 0, 20],
        [GENETIC_AI_FACTORS.OWNED_TARGET_ALREADY_ASSIGNED]: [-80, 0, 0, 0, 0],
        [GENETIC_AI_FACTORS.ENEMY_TARGET_ALREADY_ASSIGNED]: [0, -85, 0, 0, 0],
        [GENETIC_AI_FACTORS.UNOWNED_TARGET_ALREADY_ASSIGNED]: [0, 0, -75, 0, 0],
        [GENETIC_AI_FACTORS.SHIP_TARGET_ALREADY_ASSIGNED]: [0, 0, 0, -85, 0],
        [GENETIC_AI_FACTORS.FLEET_READY_FOR_ATTACK]: [0, 55, 0, 15, 30],
        [GENETIC_AI_FACTORS.WE_WERE_RECENTLY_ATTACKED]: [45, -10, 0, 25, 15],
        [GENETIC_AI_FACTORS.OWNED_TARGET_RECENTLY_ATTACKED]: [130, -30, 0, -10, 10],
        [GENETIC_AI_FACTORS.CURRENT_STAR_RECENTLY_ATTACKED]: [0, 15, 0, 15, 30],
        [GENETIC_AI_FACTORS.ENEMY_STAR_OWNER_RECENTLY_ATTACKED_US]: [0, 65, 0, 0, 10],
        [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_RECENTLY_ATTACKED_US]: [0, 0, 0, 60, 5],
        [GENETIC_AI_FACTORS.WE_RECENTLY_ATTACKED_TARGET_OWNER]: [0, 40, 0, 20, 10],
        [GENETIC_AI_FACTORS.RECENT_ATTACK_TARGET_WAS_STAR]: [20, 35, 0, 0, 10],
        [GENETIC_AI_FACTORS.RECENT_ATTACK_TARGET_WAS_MOBILE]: [10, 0, 0, 35, 5],
        [GENETIC_AI_FACTORS.NO_ENEMY_STARS_REMAIN]: [0, -80, -80, 170, 0],
        [GENETIC_AI_FACTORS.ONLY_US_HAS_STARS]: [0, -90, -90, 150, 0],
        [GENETIC_AI_FACTORS.ENEMY_SHIP_OWNER_HAS_NO_STARS]: [0, 0, 0, 190, 0]
    })
};

const EXPERT_SHIP_DECISION_MATRICES = {
    scout: combineDecisionMatrices(SHIP_DECISION_MATRICES.scout, EXPERT_DECISION_MATRIX_OVERLAYS.scout),
    colony: combineDecisionMatrices(SHIP_DECISION_MATRICES.colony, EXPERT_DECISION_MATRIX_OVERLAYS.colony),
    battleship: combineDecisionMatrices(SHIP_DECISION_MATRICES.battleship, EXPERT_DECISION_MATRIX_OVERLAYS.battleship)
};

// Factor indices for easier reference
const AI_FACTORS = {
    ALREADY_MOVING: 0,
    NO_NEARBY_OWNED_STAR: 1,
    NO_NEARBY_ENEMY_STAR: 2,
    NO_NEARBY_UNOWNED_STAR: 3,
    NO_NEARBY_ENEMY_SHIP: 4,
    NEARBY_ENEMY_SHIP_EXISTS: 5,
    ENEMY_SHIP_IS_FASTER: 6,
    CLOSER_TO_SHIP_THAN_PLANET: 7,
    OUR_STAR_HAS_SAME_CLASS_SHIP: 8,
    ENEMY_SHIP_MORE_POWERFUL: 9,
    NOT_AT_STAR: 10,
    AT_STAR: 11,
    ENEMY_STAR_MORE_POWERFUL: 12,
    ENEMY_STAR_HAS_SHIP: 13,
    UNOWNED_STAR_EXISTS: 14,
    UNOWNED_STAR_CLOSER_THAN_ENEMY: 15,
    OUR_STAR_LOWER_TECH: 16,
    ENEMY_STAR_CLOSEST: 17,
    UNOWNED_STAR_HAS_SHIP: 18,
    ENEMY_STAR_LOW_POPULATION: 19,
    TARGET_CHANGED_OWNERSHIP: 20,
    RELATIVE_SPEED_MULTIPLIER: 21,
    RELATIVE_STAR_SHIP_POWER_MULTIPLIER: 22,
    RELATIVE_SHIP_POWER_MULTIPLIER: 23,
    RELATIVE_SHIP_STAR_POWER_MULTIPLIER: 24,
    ENEMY_STAR_UNPROTECTED: 25,
    OUR_STAR_NO_SAME_CLASS_SHIP: 26,
    OWNED_STAR_CLOSER_TO_ENEMY: 27,
    ENEMY_SHIP_IS_SCOUT: 28,
    WE_ARE_DAMAGED: 29,
    WE_ARE_HEAVILY_DAMAGED: 30,
    STAR_HAS_OTHER_SHIPS_OF_CLASS: 31,
    AT_UNOWNED_STAR: 32,
    NO_FLEET_AT_STAR: 33,
    ...GENETIC_AI_FACTORS
};

// Decision matrix class for managing AI decisions
class DecisionMatrix {
    constructor(shipType, customMatrix = null) {
        this.shipType = shipType;
        this.matrix = customMatrix || SHIP_DECISION_MATRICES[shipType] || SHIP_DECISION_MATRICES.battleship;
        this.scores = {
            toOurStar: 0,
            toEnemyStar: 0,
            toOtherStar: 0,
            toShip: 0,
            toFormFleet: 0
        };
        this.targets = {
            ourStar: null,
            enemyStar: null,
            otherStar: null,
            ship: null
        };
    }

    // Consider a factor and apply its weights to the decision matrix
    considerFactor(factorIndex, multiplier = 1) {
        if (factorIndex >= this.matrix.length) return;

        const weights = this.matrix[factorIndex];
        if (!weights) return;
        this.scores.toOurStar += weights[0] * multiplier;
        this.scores.toEnemyStar += weights[1] * multiplier;
        this.scores.toOtherStar += weights[2] * multiplier;
        this.scores.toShip += weights[3] * multiplier;
        this.scores.toFormFleet += weights[4] * multiplier;
    }

    // Consider a multiplier factor (for relative comparisons)
    considerMultiplierFactor(factorIndex, delta) {
        if (factorIndex >= this.matrix.length) return;

        const weights = this.matrix[factorIndex];
        if (!weights) return;
        this.scores.toOurStar += Math.floor((weights[0] * delta) / 10);
        this.scores.toEnemyStar += Math.floor((weights[1] * delta) / 10);
        this.scores.toOtherStar += Math.floor((weights[2] * delta) / 10);
        this.scores.toShip += Math.floor((weights[3] * delta) / 10);
        this.scores.toFormFleet += Math.floor((weights[4] * delta) / 10);
    }

    // Get the best action based on current scores
    getBestAction() {
        const tos = this.scores.toOurStar;
        const tes = this.scores.toEnemyStar;
        const tfs = this.scores.toOtherStar;
        const ts = this.scores.toShip;
        const tff = this.scores.toFormFleet;

        if (tff > 0 && tff > tos && tff > tfs && tff > ts && tff > tes) {
            return { action: 'toFormFleet', score: tff, target: null };
        }
        if (tos > 0 && tos >= tes && tos >= tfs && tos >= ts && tos > tff) {
            return { action: 'toOurStar', score: tos, target: this.targets.ourStar };
        }
        if (tes > 0 && tes >= tos && tes >= tfs && tes >= ts && tes > tff) {
            return { action: 'toEnemyStar', score: tes, target: this.targets.enemyStar };
        }
        if (ts > 0 && ts >= tos && ts >= tes && ts >= tfs && ts > tff) {
            return { action: 'toShip', score: ts, target: this.targets.ship };
        }
        if (tfs > 0) {
            return { action: 'toOtherStar', score: tfs, target: this.targets.otherStar };
        }

        // If no positive scores, do nothing
        return { action: 'doNothing', score: 0, target: null };
    }

    // Reset the decision matrix
    reset() {
        this.scores = {
            toOurStar: 0,
            toEnemyStar: 0,
            toOtherStar: 0,
            toShip: 0,
            toFormFleet: 0
        };
        this.targets = {
            ourStar: null,
            enemyStar: null,
            otherStar: null,
            ship: null
        };
    }
}

module.exports = {
    ACTION_COLUMNS,
    LEGACY_END_MARKER_INDEX,
    GENETIC_FACTOR_START_INDEX,
    GENETIC_AI_FACTORS,
    GENETIC_FACTOR_NAMES,
    SHIP_DECISION_MATRICES,
    EXPERT_DECISION_MATRIX_OVERLAYS,
    EXPERT_SHIP_DECISION_MATRICES,
    combineDecisionMatrices,
    AI_FACTORS,
    DecisionMatrix
};
