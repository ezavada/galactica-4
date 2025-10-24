#!/usr/bin/env node
// Test Runner for Galactica-4
// Run with: gad4 tests/run-tests.js
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

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║          Galactica-4 Test Suite                          ║');
console.log('║          Testing Map, Movement, Players & AI              ║');
console.log('║          Using PDG Built-in Random (pdg.srand/rand)       ║');
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

