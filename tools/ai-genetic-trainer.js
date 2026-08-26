// Run with: ./gad4 tools/ai-genetic-trainer.js --generations=20
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
        console.log(
            `Gen ${summary.generation}: winner=${winner} turn=${victoryTurn} ` +
            `quickStreak=${quickWinStreak} leader=${leader.genomeId}@P${leader.playerNum} ` +
            `stars=${leader.stars} ships=${leader.ships} score=${leader.score}`
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
console.log(`Final winner: ${finalWinner} on turn ${finalTurn}; quick-win streak ${result.quickWinStreak}/${options.successStreak}.`);

if (final && final.standings && final.standings.length > 0) {
    console.log('Final standings:');
    for (const standing of final.standings) {
        console.log(
            `  ${standing.genomeId}@P${standing.playerNum}: stars=${standing.stars}, ` +
            `ships=${standing.ships}, fleets=${standing.fleets}, score=${standing.score}`
        );
    }
}

if (hasArg('--json')) {
    console.log(JSON.stringify(result, null, 2));
}

process.exit(hasArg('--fail-if-not-target') && !result.success ? 2 : 0);
