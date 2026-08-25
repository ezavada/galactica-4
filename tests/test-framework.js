// Simple test framework for Galactica-4
// Provides assertion utilities and test organization

class TestFramework {
    constructor() {
        if (typeof pdg !== 'undefined' && pdg && typeof pdg.srand === 'function' && !globalThis.__galacticaTestRandomSeeded) {
            pdg.srand(42);
            globalThis.__galacticaTestRandomSeeded = true;
        }

        this.tests = [];
        this.currentSuite = null;
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            failures: []
        };
    }

    describe(name, fn) {
        this.currentSuite = name;
        console.log(`\n=== ${name} ===`);
        fn();
        this.currentSuite = null;
    }

    it(name, fn) {
        const testName = this.currentSuite ? `${this.currentSuite}: ${name}` : name;
        this.results.total++;
        
        try {
            fn();
            this.results.passed++;
            console.log(`  ✓ ${name}`);
        } catch (error) {
            this.results.failed++;
            this.results.failures.push({ test: testName, error: error.message });
            console.log(`  ✗ ${name}`);
            console.log(`    ${error.message}`);
        }
    }

    // Assertion methods
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            const msg = message || `Expected ${expected} but got ${actual}`;
            throw new Error(msg);
        }
    }

    assertNotEqual(actual, expected, message) {
        if (actual === expected) {
            const msg = message || `Expected not to equal ${expected}`;
            throw new Error(msg);
        }
    }

    assertDeepEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            const msg = message || `Expected ${expectedStr} but got ${actualStr}`;
            throw new Error(msg);
        }
    }

    assertApproximately(actual, expected, tolerance, message) {
        if (Math.abs(actual - expected) > tolerance) {
            const msg = message || `Expected ${expected} ± ${tolerance} but got ${actual}`;
            throw new Error(msg);
        }
    }

    assertInRange(value, min, max, message) {
        if (value < min || value > max) {
            const msg = message || `Expected ${value} to be between ${min} and ${max}`;
            throw new Error(msg);
        }
    }

    assertThrows(fn, message) {
        let threw = false;
        try {
            fn();
        } catch (error) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message || 'Expected function to throw');
        }
    }

    assertTrue(value, message) {
        this.assertEqual(value, true, message);
    }

    assertFalse(value, message) {
        this.assertEqual(value, false, message);
    }

    assertNull(value, message) {
        this.assertEqual(value, null, message);
    }

    assertNotNull(value, message) {
        this.assertNotEqual(value, null, message);
    }

    assertDefined(value, message) {
        if (value === undefined) {
            throw new Error(message || 'Expected value to be defined');
        }
    }

    assertUndefined(value, message) {
        if (value !== undefined) {
            throw new Error(message || 'Expected value to be undefined');
        }
    }

    assertArrayLength(array, length, message) {
        if (array.length !== length) {
            const msg = message || `Expected array length ${length} but got ${array.length}`;
            throw new Error(msg);
        }
    }

    assertContains(array, value, message) {
        if (!array.includes(value)) {
            const msg = message || `Expected array to contain ${value}`;
            throw new Error(msg);
        }
    }

    assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            const msg = message || `Expected ${actual} > ${expected}`;
            throw new Error(msg);
        }
    }

    assertLessThan(actual, expected, message) {
        if (actual >= expected) {
            const msg = message || `Expected ${actual} < ${expected}`;
            throw new Error(msg);
        }
    }

    assertGreaterThanOrEqual(actual, expected, message) {
        if (actual < expected) {
            const msg = message || `Expected ${actual} >= ${expected}`;
            throw new Error(msg);
        }
    }

    // Print test results summary
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✓`);
        console.log(`Failed: ${this.results.failed} ✗`);
        
        if (this.results.failed > 0) {
            console.log('\nFAILURES:');
            this.results.failures.forEach((failure, index) => {
                console.log(`\n${index + 1}. ${failure.test}`);
                console.log(`   ${failure.error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        return this.results.failed === 0;
    }

    // Reset for new test run
    reset() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            failures: []
        };
    }
}

// Export singleton instance
const test = new TestFramework();

module.exports = test;
