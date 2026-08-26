// Run with: ./gad4 tools/ai-genetic-trainer.js --generations=50
//
// Evolves five AI matrix genomes on the smallest deterministic AI-only map.

const path = require('path');
const pdg = require('pdg');
globalThis.pdg = pdg;

const dataPath = path.join(__dirname, '..', 'data');
pdg.res.openResourceFile(dataPath);

const Trainer = require('../src/js/ai-genetic-trainer.js');

const args = process.argv.slice(2);

function hasArg(...names) {
    return args.some(arg => names.includes(arg));
}

function getArgValue(name, fallback = null) {
    const prefix = `${name}=`;
    const arg = args.find(value => value.startsWith(prefix));
    return arg ? arg.substring(prefix.length) : fallback;
}

function getIntegerArg(name, fallback) {
    const parsed = Number(getArgValue(name, fallback));
    return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function getFloatArg(name, fallback) {
    const parsed = Number(getArgValue(name, fallback));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function printUsage() {
    console.log('Usage: ./gad4 tools/ai-genetic-trainer.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --seed=N                 Genetic RNG seed');
    console.log('  --map-seed=N             Fixed match/map seed');
    console.log('  --generations=N          Max generations to run');
    console.log('  --max-turns=N            Cap each match, default 250');
    console.log('  --target-turns=N         Success target, default 100');
    console.log('  --success-streak=N       Consecutive quick wins needed, default 3');
    console.log('  --min-winning-stars=N    Stars required for a trusted quick win, default 4');
    console.log('  --min-winning-star-share=N  Map star share required for trusted quick win, default 0.20');
    console.log('  --min-winning-ships=N    Completed ships required for trusted quick win, default 0');
    console.log('  --mutation-rate=N        Per-gene mutation chance, default 0.04');
    console.log('  --mutation-size=N        Max mutation delta, default 25');
    console.log('  --skill-mode=MODE        all-expert, all-good, all-average, or ladder');
    console.log('  --vary-match-seed        Use a different deterministic map seed each generation');
    console.log('  --no-seat-shuffle        Keep genomes in fixed player slots');
    console.log('  --json                   Print final full JSON summary');
    console.log('  --quiet                  Only print final status');
    console.log('  --fail-if-not-target     Exit non-zero if max generations is reached first');
}

if (hasArg('--help', '-h')) {
    printUsage();
    process.exit(0);
}

const defaults = Trainer.DEFAULT_GENETIC_TRAINING_OPTIONS;
const quiet = hasArg('--quiet');
const options = {
    seed: getIntegerArg('--seed', defaults.seed),
    mapSeed: getIntegerArg('--map-seed', getIntegerArg('--seed', defaults.mapSeed)),
    maxGenerations: getIntegerArg('--generations', defaults.maxGenerations),
    maxTurns: getIntegerArg('--max-turns', defaults.maxTurns),
    targetTurns: getIntegerArg('--target-turns', defaults.targetTurns),
    successStreak: getIntegerArg('--success-streak', defaults.successStreak),
    minWinningStars: getIntegerArg('--min-winning-stars', defaults.minWinningStars),
    minWinningStarShare: getFloatArg('--min-winning-star-share', defaults.minWinningStarShare),
    minWinningCompletedShips: getIntegerArg('--min-winning-ships', defaults.minWinningCompletedShips),
    mutationRate: getFloatArg('--mutation-rate', defaults.mutationRate),
    mutationSize: getIntegerArg('--mutation-size', defaults.mutationSize),
    skillMode: getArgValue('--skill-mode', defaults.skillMode),
    varyMatchSeed: hasArg('--vary-match-seed'),
    shuffleSeats: !hasArg('--no-seat-shuffle'),
    silentMatches: !hasArg('--show-match-log'),
    onGeneration: quiet ? null : ({ summary, quickWinStreak }) => {
        const winner = summary.result && summary.result.winningPlayerNum ? `P${summary.result.winningPlayerNum}` : 'none';
        const victoryTurn = summary.result && summary.result.victoryTurn ? summary.result.victoryTurn : '-';
        const leader = summary.standings[0];
        const starShare = leader.starShare !== undefined ? `${Math.round(leader.starShare * 100)}%` : '-';
        console.log(
            `Gen ${summary.generation}: winner=${winner} turn=${victoryTurn} ` +
            `quickStreak=${quickWinStreak} leader=${leader.genomeId}@P${leader.playerNum} ` +
            `credible=${leader.credibleWinner ? 'yes' : 'no'} stars=${leader.stars}/${leader.totalMapStars} ` +
            `share=${starShare} ships=${leader.ships} score=${leader.score}`
        );
    }
};

const result = Trainer.runTraining(options);
const final = result.finalMatch;
const finalWinner = final && final.result && final.result.winningPlayerNum ? `P${final.result.winningPlayerNum}` : 'none';
const finalTurn = final && final.result && final.result.victoryTurn ? final.result.victoryTurn : '-';

console.log('');
console.log(`Genetic training ${result.success ? 'reached target' : 'stopped'} after ${result.generationsRun} generations.`);
console.log(`Stop reason: ${result.stopReason}`);
console.log(
    `Final winner: ${finalWinner} on turn ${finalTurn}; trusted quick-win streak ` +
    `${result.quickWinStreak}/${options.successStreak}.`
);
console.log(
    `Trusted quick-win thresholds: <=${options.targetTurns} turns, ` +
    `${options.minWinningStars}+ stars, ` +
    `${Math.round(options.minWinningStarShare * 100)}%+ map stars, ` +
    `${options.minWinningCompletedShips}+ completed ships.`
);

if (final && final.standings && final.standings.length > 0) {
    console.log('Final standings:');
    for (const standing of final.standings) {
        const starShare = standing.starShare !== undefined ? `${Math.round(standing.starShare * 100)}%` : '-';
        console.log(
            `  ${standing.genomeId}@P${standing.playerNum}: credible=${standing.credibleWinner ? 'yes' : 'no'}, ` +
            `stars=${standing.stars}/${standing.totalMapStars} (${starShare}), ` +
            `ships=${standing.ships}, fleets=${standing.fleets}, score=${standing.score}`
        );
    }
}

if (hasArg('--json')) {
    console.log(JSON.stringify(result, null, 2));
}

process.exit(hasArg('--fail-if-not-target') && !result.success ? 2 : 0);
