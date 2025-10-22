// AI Decision Matrices for Galactica-4
// Exact replication of the decision matrices from UShipUtils.cpp
// Each matrix contains weights for 34 factors affecting AI ship decisions

// Decision matrix structure: [toOurStar, toEnemyStar, toOtherStar, toShip, toFormFleet]
const SHIP_DECISION_MATRICES = {
    scout: [
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
    ],

    colony: [
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
    ],

    battleship: [
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
    ]
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
    NO_FLEET_AT_STAR: 33
};

// Decision matrix class for managing AI decisions
class DecisionMatrix {
    constructor(shipType) {
        this.shipType = shipType;
        this.matrix = SHIP_DECISION_MATRICES[shipType] || SHIP_DECISION_MATRICES.battleship;
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
        this.scores.toOurStar += Math.floor((weights[0] * delta) / 10);
        this.scores.toEnemyStar += Math.floor((weights[1] * delta) / 10);
        this.scores.toOtherStar += Math.floor((weights[2] * delta) / 10);
        this.scores.toShip += Math.floor((weights[3] * delta) / 10);
        this.scores.toFormFleet += Math.floor((weights[4] * delta) / 10);
    }

    // Get the best action based on current scores
    getBestAction() {
        const actions = [
            { action: 'toFormFleet', score: this.scores.toFormFleet, targetKey: null },
            { action: 'toOurStar', score: this.scores.toOurStar, targetKey: 'ourStar' },
            { action: 'toEnemyStar', score: this.scores.toEnemyStar, targetKey: 'enemyStar' },
            { action: 'toShip', score: this.scores.toShip, targetKey: 'ship' },
            { action: 'toOtherStar', score: this.scores.toOtherStar, targetKey: 'otherStar' }
        ];

        // Sort by score (highest first)
        actions.sort((a, b) => b.score - a.score);

        // Return the best action that has a positive score
        for (const action of actions) {
            if (action.score > 0) {
                return {
                    action: action.action,
                    score: action.score,
                    target: action.targetKey ? this.targets[action.targetKey] : null
                };
            }
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
    SHIP_DECISION_MATRICES,
    AI_FACTORS,
    DecisionMatrix
};
