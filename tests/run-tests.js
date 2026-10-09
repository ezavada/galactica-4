// Test Runner for Galactica-4
// Run with: ./gad4 tests/run-tests.js
//
// Uses PDG's built-in pdg.srand() and pdg.rand() for deterministic testing

const test = require('./test-framework.js');
const runStringResourceTests = require('./string-resources.test.js');
const runMapGenerationTests = require('./map-generation.test.js');
const runCoordinateMovementTests = require('./coordinate-movement.test.js');
const runPlayerConfigTests = require('./player-config.test.js');
const runAISystemTests = require('./ai-systems.test.js');
const runZoomScrollTests = require('./zoom-scroll.test.js');
const runZoomToPointBugTests = require('./zoom-to-point-bug.test.js');
const runEntityFogOfWarTests = require('./entity-fog-of-war.test.js');
const runVisibilityCalculatorTests = require('./visibility-calculator.test.js');
const runSpatialPartitionTests = require('./spatial-partition.test.js');
const runFogOfWarIntegrationTests = require('./fog-of-war-integration.test.js');
const runSpatialPartitioningPerformanceTests = require('./spatial-partitioning-performance.test.js');
const runFleetTests = require('./fleet.test.js');
const runCombatTests = require('./combat.test.js');
const runGameRuleTests = require('./game-rules.test.js');
const runCommandUITests = require('./command-ui.test.js');
const runFleetFormationTests = require('./fleet-formation.test.js');
const runRendezvousTests = require('./rendezvous.test.js');
const runShipNamingEventsTests = require('./ship-naming-events.test.js');
const runAutoplayTests = require('./autoplay.test.js');
const runProductionControlTests = require('./production-controls.test.js');
const runPdgV12DisplayTests = require('./pdg-v12-display.test.js');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║          Galactica-4 Test Suite                           ║');
console.log('║          Testing Map, Movement, Players, AI, Fleet,       ║');
console.log('║          Fog of War, and Combat System                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

// Run all test suites
try {
    console.log('\n📝 Running String Resource Tests...');
    runStringResourceTests();

    console.log('\n📋 Running Map Generation Tests...');
    runMapGenerationTests();

    console.log('\n📐 Running Coordinate & Movement Tests...');
    runCoordinateMovementTests();

    console.log('\n👥 Running Player & Config Tests...');
    runPlayerConfigTests();

    console.log('\n🤖 Running AI System Tests...');
    runAISystemTests();

    console.log('\n🔍 Running Zoom & Scroll Tests...');
    runZoomScrollTests();
    
    console.log('\n🐛 Running Zoom-to-Point Bug Tests...');
    runZoomToPointBugTests();

    console.log('\n🌟 Running Entity Fog of War Tests...');
    runEntityFogOfWarTests();

    console.log('\n👁️ Running Visibility Calculator Tests...');
    runVisibilityCalculatorTests();

    console.log('\n🗺️ Running Spatial Partition Tests...');
    runSpatialPartitionTests();

    console.log('\n🔗 Running Fog of War Integration Tests...');
    runFogOfWarIntegrationTests();

    console.log('\n⚡ Running Spatial Partitioning Performance Tests...');
    runSpatialPartitioningPerformanceTests();

    console.log('\n🚢 Running Fleet Mechanics Tests...');
    runFleetTests();

    console.log('\n⚔️ Running Combat System Tests...');
    runCombatTests();

    console.log('\n📜 Running V3 Game Rule Parity Tests...');
    runGameRuleTests();

    console.log('\n🖥️ Running Command UI Tests...');
    runCommandUITests();

    console.log('\n🔗 Running Fleet Formation Tests...');
    runFleetFormationTests();

    console.log('\n📍 Running Rendezvous & Fleet UI Tests...');
    runRendezvousTests();

    console.log('\n🚢 Running Ship Naming & Events Tests...');
    runShipNamingEventsTests();

    console.log('\n🤖 Running AI Autoplay Tests...');
    runAutoplayTests();

    runPdgV12DisplayTests();
    runProductionControlTests();

    // Print summary
    const success = test.printSummary();

    if (success) {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed.');
        process.exit(1);
    }
} catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    console.error(error.stack);
    process.exit(1);
}
