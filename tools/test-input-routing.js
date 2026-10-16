// Focused PDG input routing verification: PDG_SOURCE=devel ./gad4 tools/test-input-routing.js
require('../tests/input.test.js')();
process.exit(require('../tests/test-framework.js').printSummary()?0:1);
