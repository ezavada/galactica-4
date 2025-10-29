// String Resources Test
// Tests that all string resources are properly loaded from data/strings.txt

const test = require('./test-framework.js');
const path = require('path');

function runStringResourceTests() {
    // Initialize ResourceManager with data directory path
    const dataPath = path.join(__dirname, '../data');
    pdg.res.openResourceFile(dataPath);
    console.log(`  Resource path set to: ${dataPath}`);
    
    test.describe('String Resources - Resource Path Setup', () => {
        test.it('can load basic strings from data directory', () => {
            const testStr = pdg.res.getString(1);
            test.assertDefined(testStr, 'String ID 1 should be defined');
            test.assertGreaterThan(testStr.length, 0, 'String ID 1 should not be empty');
            console.log(`    Test string loaded: "${testStr}"`);
        });
    });
    
    test.describe('String Resources - General UI Strings', () => {
        test.it('loads basic UI strings', () => {
            const turn = pdg.res.getString(1);
            const stars = pdg.res.getString(2);
            const ships = pdg.res.getString(3);
            
            test.assertDefined(turn, 'Turn string should be defined');
            test.assertDefined(stars, 'Stars string should be defined');
            test.assertDefined(ships, 'Ships string should be defined');
            
            // Verify they're not empty
            test.assertGreaterThan(turn.length, 0, 'Turn string should not be empty');
            test.assertGreaterThan(stars.length, 0, 'Stars string should not be empty');
            test.assertGreaterThan(ships.length, 0, 'Ships string should not be empty');
        });
        
        test.it('loads ship type strings', () => {
            const scout = pdg.res.getString(20);
            const defense = pdg.res.getString(21);
            const battleship = pdg.res.getString(22);
            const colony = pdg.res.getString(23);
            
            test.assertDefined(scout, 'Scout string should be defined');
            test.assertDefined(defense, 'Defense string should be defined');
            test.assertDefined(battleship, 'Battleship string should be defined');
            test.assertDefined(colony, 'Colony string should be defined');
        });
        
        test.it('loads build menu strings', () => {
            const buildScout = pdg.res.getString(30);
            const buildDefense = pdg.res.getString(31);
            
            test.assertDefined(buildScout, 'Build scout string should be defined');
            test.assertDefined(buildDefense, 'Build defense string should be defined');
        });
    });
    
    test.describe('String Resources - Star Names', () => {
        test.it('loads star names as pipe-separated list', () => {
            const starNames = pdg.res.getString(100);
            
            test.assertDefined(starNames, 'Star names should be defined');
            test.assertGreaterThan(starNames.length, 0, 'Star names should not be empty');
            
            // Should contain multiple names separated by pipes
            const names = starNames.split('|');
            test.assertGreaterThan(names.length, 10, 'Should have at least 10 star names');
            test.assertContains(names, 'Alpha', 'Should contain Alpha');
            test.assertContains(names, 'Beta', 'Should contain Beta');
            test.assertContains(names, 'Gamma', 'Should contain Gamma');
        });
        
        test.it('loads roman numerals as pipe-separated list', () => {
            const romanNumerals = pdg.res.getString(200);
            
            test.assertDefined(romanNumerals, 'Roman numerals should be defined');
            
            const numerals = romanNumerals.split('|');
            test.assertGreaterThan(numerals.length, 1, 'Should have at least 2 entries');
            test.assertEqual(numerals[0], 'I', 'First entry should be I');
            test.assertEqual(numerals[1], 'II', 'Second entry should be II');
        });
    });
    
    test.describe('String Resources - Player Names', () => {
        test.it('loads computer name templates', () => {
            const templates = pdg.res.getString(250);
            
            test.assertDefined(templates, 'Name templates should be defined');
            
            const templateList = templates.split('|');
            test.assertGreaterThan(templateList.length, 4, 'Should have at least 5 templates');
            
            // Check for wildcards
            const hasWildcard = templateList.some(t => t.includes('*'));
            test.assertTrue(hasWildcard, 'Should have templates with * wildcard');
        });
        
        test.it('loads group names', () => {
            const groupNames = pdg.res.getString(270);
            
            test.assertDefined(groupNames, 'Group names should be defined');
            
            const groups = groupNames.split('|');
            test.assertGreaterThan(groups.length, 10, 'Should have at least 10 group names');
            test.assertContains(groups, 'Pact', 'Should contain Pact');
            test.assertContains(groups, 'Alliance', 'Should contain Alliance');
        });
    });
    
    test.describe('String Resources - Skill Levels', () => {
        test.it('loads skill level names', () => {
            const human = pdg.res.getString(300);
            const expert = pdg.res.getString(301);
            const good = pdg.res.getString(302);
            const average = pdg.res.getString(303);
            const passable = pdg.res.getString(304);
            const novice = pdg.res.getString(305);
            const unknown = pdg.res.getString(306);
            
            test.assertDefined(human, 'Human should be defined');
            test.assertDefined(expert, 'Expert should be defined');
            test.assertDefined(good, 'Good should be defined');
            test.assertDefined(average, 'Average should be defined');
            test.assertDefined(passable, 'Passable should be defined');
            test.assertDefined(novice, 'Novice should be defined');
            test.assertDefined(unknown, 'Unknown should be defined');
        });
    });
    
    test.describe('String Resources - Map Descriptions', () => {
        test.it('loads map size descriptions', () => {
            const small = pdg.res.getString(350);
            const medium = pdg.res.getString(351);
            const large = pdg.res.getString(352);
            const huge = pdg.res.getString(353);
            const gigantic = pdg.res.getString(354);
            
            test.assertDefined(small, 'Small should be defined');
            test.assertDefined(medium, 'Medium should be defined');
            test.assertDefined(large, 'Large should be defined');
            test.assertDefined(huge, 'Huge should be defined');
            test.assertDefined(gigantic, 'Gigantic should be defined');
        });
        
        test.it('loads density descriptions', () => {
            const sparse = pdg.res.getString(400);
            const normal = pdg.res.getString(401);
            const dense = pdg.res.getString(402);
            const veryDense = pdg.res.getString(403);
            const crowded = pdg.res.getString(404);
            
            test.assertDefined(sparse, 'Sparse should be defined');
            test.assertDefined(normal, 'Normal should be defined');
            test.assertDefined(dense, 'Dense should be defined');
            test.assertDefined(veryDense, 'Very Dense should be defined');
            test.assertDefined(crowded, 'Crowded should be defined');
        });
    });
    
    test.describe('String Resources - Game Config Strings', () => {
        test.it('loads game configuration strings', () => {
            const players = pdg.res.getString(501);
            const computer = pdg.res.getString(502);
            const human = pdg.res.getString(503);
            const ai = pdg.res.getString(504);
            
            test.assertDefined(players, 'Players should be defined');
            test.assertDefined(computer, 'Computer should be defined');
            test.assertDefined(human, 'Human should be defined');
            test.assertDefined(ai, 'AI should be defined');
        });
    });
}

module.exports = runStringResourceTests;

