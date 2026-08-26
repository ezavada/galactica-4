// Genetic AI trainer for Galactica-4.
//
// This is an opt-in experimentation harness. It evolves per-player overlays on
// top of the normal ship decision matrices, then installs the resulting full
// matrices into game.aiDecisionMatrices for a deterministic AI-only match.

const Factory = require('./factory.js');
const Game = require('./game.js');
const GameConfig = require('./game-config.js');
const Rules = require('./rules.js');
const {
    ACTION_COLUMNS,
    LEGACY_END_MARKER_INDEX,
    GENETIC_AI_FACTORS,
    SHIP_DECISION_MATRICES,
    EXPERT_SHIP_DECISION_MATRICES,
    combineDecisionMatrices
} = require('./ai-decision-matrices.js');

const SHIP_MATRIX_TYPES = ['scout', 'colony', 'battleship'];

const DEFAULT_GENETIC_TRAINING_OPTIONS = {
    seed: 424242,
    mapSeed: 424242,
    populationSize: 5,
    maxGenerations: 50,
    maxTurns: 250,
    targetTurns: 100,
    successStreak: 3,
    minWinningStars: 4,
    minWinningStarShare: 0.20,
    minWinningCompletedShips: 0,
    skillMode: 'all-expert',
    compAdvantage: 0,
    fastGame: false,
    omniscient: true,
    includeLegacyFactors: true,
    legacyWeightRange: 35,
    geneticWeightRange: 100,
    mutationRate: 0.04,
    mutationSize: 25,
    minOverlayWeight: -180,
    maxOverlayWeight: 180,
    minEffectiveWeight: -250,
    maxEffectiveWeight: 250,
    shuffleSeats: true,
    varyMatchSeed: false,
    silentMatches: true
};

class GeneticRandom {
    constructor(seed = 1) {
        this.state = seed >>> 0;
        if (this.state === 0) {
            this.state = 1;
        }
    }

    nextUint() {
        this.state = ((1664525 * this.state) + 1013904223) >>> 0;
        return this.state;
    }

    float() {
        return this.nextUint() / 0x100000000;
    }

    int(max) {
        if (!max || max <= 0) {
            return 0;
        }
        return Math.floor(this.float() * max);
    }

    range(min, max) {
        return min + this.int((max - min) + 1);
    }
}

function resolveOptions(options = {}) {
    return {
        ...DEFAULT_GENETIC_TRAINING_OPTIONS,
        ...options
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
}

function cloneMatrix(matrix) {
    return (matrix || []).map(row => (row || [0, 0, 0, 0, 0]).slice());
}

function cloneMatrices(matrices) {
    const clone = {};
    for (const shipType of SHIP_MATRIX_TYPES) {
        clone[shipType] = cloneMatrix(matrices && matrices[shipType] ? matrices[shipType] : []);
    }
    return clone;
}

function cloneGenome(genome) {
    return {
        ...genome,
        parents: genome.parents ? genome.parents.slice() : [],
        matrices: cloneMatrices(genome.matrices)
    };
}

function getMaxFactorIndex() {
    return Math.max(
        LEGACY_END_MARKER_INDEX,
        ...Object.values(GENETIC_AI_FACTORS)
    );
}

function getTunableFactorIndices(options = {}) {
    const resolved = resolveOptions(options);
    const minFactor = resolved.includeLegacyFactors ? 0 : Math.min(...Object.values(GENETIC_AI_FACTORS));
    const maxFactor = getMaxFactorIndex();
    const factors = [];

    for (let factorIndex = minFactor; factorIndex <= maxFactor; factorIndex++) {
        if (factorIndex === LEGACY_END_MARKER_INDEX) {
            continue;
        }
        factors.push(factorIndex);
    }

    return factors;
}

function getFactorRandomRange(factorIndex, options = {}) {
    const resolved = resolveOptions(options);
    return factorIndex >= Math.min(...Object.values(GENETIC_AI_FACTORS)) ?
        resolved.geneticWeightRange :
        resolved.legacyWeightRange;
}

function createZeroOverlayMatrix() {
    const matrix = [];
    for (let rowIndex = 0; rowIndex <= getMaxFactorIndex(); rowIndex++) {
        matrix[rowIndex] = [0, 0, 0, 0, 0];
    }
    return matrix;
}

function createRandomOverlayMatrix(options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const matrix = createZeroOverlayMatrix();

    for (const factorIndex of getTunableFactorIndices(resolved)) {
        const range = getFactorRandomRange(factorIndex, resolved);
        matrix[factorIndex] = ACTION_COLUMNS.map(() => rng.range(-range, range));
    }

    return matrix;
}

function createRandomGenome(options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const id = options.id || `g${options.generation || 0}p${options.index || 1}`;
    const matrices = {};

    for (const shipType of SHIP_MATRIX_TYPES) {
        matrices[shipType] = createRandomOverlayMatrix(resolved, rng);
    }

    return {
        id,
        generation: options.generation || 0,
        parents: options.parents ? options.parents.slice() : [],
        mutationCount: 0,
        matrices
    };
}

function createInitialPopulation(options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const population = [];

    for (let i = 0; i < resolved.populationSize; i++) {
        population.push(createRandomGenome({
            ...resolved,
            id: `g0p${i + 1}`,
            index: i + 1,
            generation: 0
        }, rng));
    }

    return population;
}

function mutateCell(value, options, rng) {
    const resolved = resolveOptions(options);
    const delta = rng.range(-resolved.mutationSize, resolved.mutationSize);
    const adjustedDelta = delta === 0 ? (rng.int(2) === 0 ? -1 : 1) : delta;
    return clamp(value + adjustedDelta, resolved.minOverlayWeight, resolved.maxOverlayWeight);
}

function mutateGenome(genome, options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const mutated = cloneGenome(genome);
    const factors = getTunableFactorIndices(resolved);
    let mutationCount = 0;

    for (const shipType of SHIP_MATRIX_TYPES) {
        const matrix = mutated.matrices[shipType];
        for (const factorIndex of factors) {
            for (let columnIndex = 0; columnIndex < ACTION_COLUMNS.length; columnIndex++) {
                if (rng.float() < resolved.mutationRate) {
                    matrix[factorIndex][columnIndex] = mutateCell(matrix[factorIndex][columnIndex], resolved, rng);
                    mutationCount++;
                }
            }
        }
    }

    if (resolved.forceMutation && mutationCount === 0) {
        const shipType = SHIP_MATRIX_TYPES[rng.int(SHIP_MATRIX_TYPES.length)];
        const factorIndex = factors[rng.int(factors.length)];
        const columnIndex = rng.int(ACTION_COLUMNS.length);
        mutated.matrices[shipType][factorIndex][columnIndex] =
            mutateCell(mutated.matrices[shipType][factorIndex][columnIndex], resolved, rng);
        mutationCount++;
    }

    mutated.mutationCount = (mutated.mutationCount || 0) + mutationCount;
    return {
        genome: mutated,
        mutationCount
    };
}

function blendCell(parentAValue, parentBValue, rng) {
    const roll = rng.float();
    if (roll < 0.4) {
        return parentAValue;
    }
    if (roll < 0.8) {
        return parentBValue;
    }
    return Math.round((parentAValue + parentBValue) / 2);
}

function blendGenomes(parentA, parentB, options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const factors = getTunableFactorIndices(resolved);
    const child = {
        id: options.id || `g${options.generation || 1}c${options.index || 1}`,
        generation: options.generation || Math.max(parentA.generation || 0, parentB.generation || 0) + 1,
        parents: [parentA.id, parentB.id],
        mutationCount: 0,
        matrices: {}
    };

    for (const shipType of SHIP_MATRIX_TYPES) {
        child.matrices[shipType] = createZeroOverlayMatrix();
        for (const factorIndex of factors) {
            for (let columnIndex = 0; columnIndex < ACTION_COLUMNS.length; columnIndex++) {
                child.matrices[shipType][factorIndex][columnIndex] = blendCell(
                    parentA.matrices[shipType][factorIndex][columnIndex],
                    parentB.matrices[shipType][factorIndex][columnIndex],
                    rng
                );
            }
        }
    }

    return mutateGenome(child, {
        ...resolved,
        forceMutation: true
    }, rng).genome;
}

function getBaseMatricesForSkill(v3Skill) {
    return Number(v3Skill) === 1 ? EXPERT_SHIP_DECISION_MATRICES : SHIP_DECISION_MATRICES;
}

function buildEffectiveMatrices(genome, options = {}) {
    const resolved = resolveOptions(options);
    const baseMatrices = options.baseMatrices || SHIP_DECISION_MATRICES;
    const effective = {};

    for (const shipType of SHIP_MATRIX_TYPES) {
        effective[shipType] = combineDecisionMatrices(
            baseMatrices[shipType],
            genome.matrices[shipType],
            {
                minWeight: resolved.minEffectiveWeight,
                maxWeight: resolved.maxEffectiveWeight
            }
        );
    }

    return effective;
}

function getAISkillByPlayer(playerCount, skillMode = 'all-expert') {
    const skills = {};
    const ladder = [1, 2, 3, 4, 5];
    let skill = 1;

    for (let playerNum = 1; playerNum <= playerCount; playerNum++) {
        switch (skillMode) {
            case 'ladder':
                skill = ladder[(playerNum - 1) % ladder.length];
                break;
            case 'all-good':
                skill = 2;
                break;
            case 'all-average':
                skill = 3;
                break;
            case 'all-expert':
            default:
                skill = 1;
                break;
        }
        skills[playerNum] = skill;
    }

    return skills;
}

function createTrainingGame(seatedPopulation, options = {}) {
    const resolved = resolveOptions(options);
    const playerCount = seatedPopulation.length;
    const aiSkillByPlayer = getAISkillByPlayer(playerCount, resolved.skillMode);

    if (typeof pdg !== 'undefined' && pdg && typeof pdg.srand === 'function') {
        pdg.srand(resolved.matchSeed !== undefined ? resolved.matchSeed : resolved.mapSeed);
    }

    const factory = new Factory();
    const rules = new Rules(resolved.fastGame);
    const config = new GameConfig({
        gameTitle: 'AI Genetic Training',
        numHumans: 0,
        numComputers: playerCount,
        density: 1,
        sectorSize: 1,
        compSkill: resolved.skillMode === 'all-good' ? 2 : 1,
        compAdvantage: resolved.compAdvantage,
        fastGame: resolved.fastGame,
        omniscient: resolved.omniscient,
        aiSkillByPlayer,
        autoplay: {
            enabled: true,
            seed: resolved.matchSeed !== undefined ? resolved.matchSeed : resolved.mapSeed,
            turnDelayMs: 0,
            maxTurns: resolved.maxTurns,
            eventPresentationMs: 0,
            showEventWindows: false,
            showAIIntent: false
        }
    });
    const game = new Game(factory, rules, config);

    game.aiDecisionMatrices = {};
    for (let i = 0; i < seatedPopulation.length; i++) {
        const playerNum = i + 1;
        const v3Skill = aiSkillByPlayer[playerNum];
        game.aiDecisionMatrices[playerNum] = buildEffectiveMatrices(seatedPopulation[i], {
            ...resolved,
            baseMatrices: getBaseMatricesForSkill(v3Skill)
        });
    }

    return game;
}

function withMutedConsole(enabled, fn) {
    if (!enabled) {
        return fn();
    }

    const originalLog = console.log;
    console.log = () => {};
    try {
        return fn();
    } finally {
        console.log = originalLog;
    }
}

function getPlayerAggregateStats(game, playerNum) {
    const counts = game.getPlayerPieceCounts(playerNum);
    const stars = (game.stars || []).filter(star => star.owner === playerNum);
    const ships = (game.allShips || []).filter(ship => ship.owner === playerNum);
    const fleets = (game.allFleets || []).filter(fleet => fleet.owner === playerNum && (!fleet.isEmpty || !fleet.isEmpty()));
    const totalMapStars = game.stars ? game.stars.length : 0;
    const population = stars.reduce((total, star) => total + (star.population || 0), 0);
    const tech = stars.reduce((total, star) => total + (star.techLevel || 0), 0);
    const completedShips = ships.filter(ship => !ship.underConstruction || !ship.underConstruction());
    const combatPower = completedShips.reduce((total, ship) => total + (ship.power || (ship.calculatePower ? ship.calculatePower() : 0) || 0), 0);

    return {
        ...counts,
        fleets: fleets.length,
        completedShips: completedShips.length,
        totalMapStars,
        starShare: totalMapStars > 0 ? stars.length / totalMapStars : 0,
        population,
        tech,
        combatPower
    };
}

function getVictoryQuality(stats, options = {}) {
    const resolved = resolveOptions(options);
    const meetsMinStars = stats.stars >= resolved.minWinningStars;
    const meetsMinStarShare = stats.starShare >= resolved.minWinningStarShare;
    const meetsMinCompletedShips = stats.completedShips >= resolved.minWinningCompletedShips;

    return {
        minWinningStars: resolved.minWinningStars,
        minWinningStarShare: resolved.minWinningStarShare,
        minWinningCompletedShips: resolved.minWinningCompletedShips,
        meetsMinStars,
        meetsMinStarShare,
        meetsMinCompletedShips,
        isDominant: meetsMinStars && meetsMinStarShare && meetsMinCompletedShips
    };
}

function scorePlayer(game, playerNum, genome, result, options = {}) {
    const resolved = resolveOptions(options);
    const stats = getPlayerAggregateStats(game, playerNum);
    const isWinner = result && result.winningPlayerNum === playerNum;
    const victoryTurn = isWinner ? (result.victoryTurn || game.turn) : null;
    const alive = stats.total > 0;
    const victoryQuality = getVictoryQuality(stats, resolved);
    const credibleWinner = isWinner && victoryQuality.isDominant;
    const speedBonus = isWinner ? Math.max(0, resolved.maxTurns - victoryTurn) * 1000 : 0;
    const victoryScore = isWinner ?
        (credibleWinner ? 1000000 + speedBonus : 100000 + Math.floor(speedBonus / 10)) :
        0;
    const survivalScore = alive ? 500 : -5000;
    const territoryScore = stats.stars * 12000;
    const shipScore = stats.completedShips * 350;
    const fleetScore = stats.fleets * 500;
    const techScore = stats.tech * 150;
    const combatScore = stats.combatPower * 12;
    const populationScore = Math.floor(stats.population / 50);

    return {
        playerNum,
        genome,
        genomeId: genome.id,
        score: victoryScore + survivalScore + territoryScore + shipScore + fleetScore + techScore + combatScore + populationScore,
        isWinner,
        credibleWinner,
        victoryTurn,
        alive,
        stats,
        victoryQuality
    };
}

function rankPlayers(game, seatedPopulation, options = {}) {
    const resolved = resolveOptions(options);
    const result = game.getGameResult ? game.getGameResult() : {
        isGameOver: game.isGameOver,
        winningPlayerNum: game.winningPlayerNum,
        victoryTurn: game.victoryTurn
    };
    const standings = [];

    for (let i = 0; i < seatedPopulation.length; i++) {
        standings.push(scorePlayer(game, i + 1, seatedPopulation[i], result, resolved));
    }

    standings.sort((left, right) => right.score - left.score);
    return standings;
}

function isTrustedQuickWin(result, standings, options = {}) {
    const resolved = resolveOptions(options);
    if (!result ||
            !result.isGameOver ||
            result.winningPlayerNum <= 0 ||
            result.victoryTurn === null ||
            result.victoryTurn > resolved.targetTurns) {
        return false;
    }

    const winnerStanding = (standings || []).find(standing => standing.playerNum === result.winningPlayerNum);
    return !!(winnerStanding && winnerStanding.credibleWinner);
}

function runMatch(seatedPopulation, options = {}) {
    const resolved = resolveOptions(options);

    return withMutedConsole(resolved.silentMatches, () => {
        const game = createTrainingGame(seatedPopulation, resolved);
        let turnsRun = 0;

        while (!game.isGameOver && turnsRun < resolved.maxTurns) {
            game.endTurn();
            turnsRun++;
        }

        if (!game.isGameOver && game.updatePlayerPieceCounts) {
            game.updatePlayerPieceCounts();
        }

        const result = game.getGameResult();
        const standings = rankPlayers(game, seatedPopulation, resolved);
        const quickWin = isTrustedQuickWin(result, standings, resolved);

        return {
            generation: resolved.generation || 1,
            matchSeed: resolved.matchSeed !== undefined ? resolved.matchSeed : resolved.mapSeed,
            turnsRun,
            stopReason: result.isGameOver ? 'gameOver' : 'maxTurns',
            quickWin,
            result,
            standings
        };
    });
}

function shufflePopulation(population, options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const seated = population.slice();
    if (!resolved.shuffleSeats) {
        return seated;
    }

    for (let i = seated.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        const swap = seated[i];
        seated[i] = seated[j];
        seated[j] = swap;
    }

    return seated;
}

function evolvePopulation(standings, options = {}, rng = new GeneticRandom(resolveOptions(options).seed)) {
    const resolved = resolveOptions(options);
    const ranked = standings.slice().sort((left, right) => right.score - left.score);
    const survivorCount = Math.min(2, ranked.length);
    const survivors = ranked.slice(0, survivorCount).map((standing, index) => ({
        ...cloneGenome(standing.genome),
        lastPlayerNum: standing.playerNum,
        lastScore: standing.score,
        survivorRank: index + 1
    }));
    const nextPopulation = survivors.map(survivor => cloneGenome(survivor));
    const children = [];

    while (nextPopulation.length < resolved.populationSize) {
        const childIndex = children.length + 1;
        const parentA = survivors[0];
        const parentB = survivors[Math.min(1, survivors.length - 1)];
        const child = blendGenomes(parentA, parentB, {
            ...resolved,
            id: `g${resolved.nextGeneration || 1}c${childIndex}`,
            index: childIndex,
            generation: resolved.nextGeneration || 1
        }, rng);
        children.push(child);
        nextPopulation.push(child);
    }

    return {
        survivors,
        children,
        population: nextPopulation
    };
}

function summarizeStanding(standing) {
    return {
        playerNum: standing.playerNum,
        genomeId: standing.genomeId,
        score: standing.score,
        isWinner: standing.isWinner,
        credibleWinner: standing.credibleWinner,
        victoryTurn: standing.victoryTurn,
        alive: standing.alive,
        stars: standing.stats.stars,
        totalMapStars: standing.stats.totalMapStars,
        starShare: standing.stats.starShare,
        ships: standing.stats.ships,
        completedShips: standing.stats.completedShips,
        fleets: standing.stats.fleets,
        tech: standing.stats.tech,
        combatPower: standing.stats.combatPower,
        victoryQuality: standing.victoryQuality
    };
}

function summarizeMatch(match) {
    return {
        generation: match.generation,
        matchSeed: match.matchSeed,
        turnsRun: match.turnsRun,
        stopReason: match.stopReason,
        quickWin: match.quickWin,
        result: match.result,
        standings: match.standings.map(summarizeStanding)
    };
}

function runTraining(options = {}) {
    const resolved = resolveOptions(options);
    const rng = options.rng || new GeneticRandom(resolved.seed);
    let population = options.population ? options.population.map(cloneGenome) : createInitialPopulation(resolved, rng);
    const history = [];
    let quickWinStreak = 0;
    let stopReason = 'maxGenerations';
    let finalMatch = null;

    for (let generation = 1; generation <= resolved.maxGenerations; generation++) {
        const seatedPopulation = shufflePopulation(population, resolved, rng);
        const matchSeed = resolved.varyMatchSeed ? ((resolved.mapSeed + generation - 1) >>> 0) : resolved.mapSeed;
        const match = runMatch(seatedPopulation, {
            ...resolved,
            generation,
            matchSeed
        });
        finalMatch = match;
        history.push(summarizeMatch(match));

        if (match.quickWin) {
            quickWinStreak++;
        } else {
            quickWinStreak = 0;
        }

        if (typeof resolved.onGeneration === 'function') {
            resolved.onGeneration({
                generation,
                match,
                summary: history[history.length - 1],
                quickWinStreak,
                population
            });
        }

        if (quickWinStreak >= resolved.successStreak) {
            stopReason = 'targetReached';
            break;
        }

        const evolution = evolvePopulation(match.standings, {
            ...resolved,
            nextGeneration: generation
        }, rng);
        population = evolution.population;
    }

    return {
        success: stopReason === 'targetReached',
        stopReason,
        generationsRun: history.length,
        quickWinStreak,
        finalMatch: finalMatch ? summarizeMatch(finalMatch) : null,
        population,
        history
    };
}

module.exports = {
    SHIP_MATRIX_TYPES,
    DEFAULT_GENETIC_TRAINING_OPTIONS,
    GeneticRandom,
    resolveOptions,
    cloneMatrix,
    cloneGenome,
    getTunableFactorIndices,
    createZeroOverlayMatrix,
    createRandomOverlayMatrix,
    createRandomGenome,
    createInitialPopulation,
    mutateGenome,
    blendGenomes,
    buildEffectiveMatrices,
    getAISkillByPlayer,
    createTrainingGame,
    getVictoryQuality,
    rankPlayers,
    isTrustedQuickWin,
    runMatch,
    shufflePopulation,
    evolvePopulation,
    summarizeStanding,
    summarizeMatch,
    runTraining
};
