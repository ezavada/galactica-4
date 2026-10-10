// String Resources Test
// Tests that all string resources are properly loaded from data/strings.txt

const test = require('./test-framework.js');
const path = require('path');
const fs = require('fs');

const REQUIRED_RUNTIME_STRING_IDS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18,
    20, 21, 22, 23,
    30, 31, 32, 33,
    100, 200, 250, 270,
    300, 301, 302, 303, 304, 305, 306,
    350, 351, 352, 353, 354, 355,
    400, 401, 402, 403, 404, 405,
    450, 451, 452, 453,
    500, 501, 502, 503, 504, 505, 506, 507, 508, 509,
    510, 511,
    520, 521, 522, 523, 524, 525, 526, 527, 528, 529,
    530, 531, 532, 533, 534, 535, 536, 537, 538, 539,
    540, 541, 542, 543, 544, 545, 546, 547, 548, 549,
    550, 551, 552, 553, 554, 555, 556, 557, 558, 559,
    560, 561, 562, 563, 564, 565, 566, 567, 568, 570, 571, 572,
    573, 574, 575, 576, 577, 578, 579, 580, 581, 582,
    583, 584, 585, 586, 587, 588, 589, 590, 591, 592,
    593, 594, 595,
    600, 601, 602, 603, 604, 605, 606, 607, 608, 609,
    610, 611, 612, 613, 614, 615,
    620, 621, 622, 623, 624, 625, 626, 627, 628, 629,
    630, 631, 632, 633, 634, 635, 636, 637, 638, 639,
    640, 641, 642, 643, 644, 645, 646, 647,
    648, 649, 650, 651, 652, 653, 655, 656, 657, 658,
    659, 660, 661, 662, 663, 664, 665, 666, 667, 668,
    669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697, 698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798,
    800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928
];

function parseStringResourceFile(filePath) {
    const entries = new Map();
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const tabIndex = line.indexOf('\t');
        if (tabIndex < 0) {
            continue;
        }

        const id = Number(line.substring(0, tabIndex));
        if (Number.isInteger(id)) {
            entries.set(id, line.substring(tabIndex + 1));
        }
    }

    return entries;
}

function sortedIds(entries) {
    return Array.from(entries.keys()).sort((a, b) => a - b);
}

function getLocalizedResourceFiles(dataPath) {
    return fs.readdirSync(dataPath)
        .filter(file => /^strings-[a-z]{2}\.txt$/.test(file))
        .sort()
        .map(file => path.join(dataPath, file));
}

function getPlaceholderIds(value) {
    const placeholders = new Set();
    const regex = /\{(\d+)\}/g;
    let match = regex.exec(value);
    while (match) {
        placeholders.add(Number(match[1]));
        match = regex.exec(value);
    }
    return Array.from(placeholders).sort((a, b) => a - b);
}

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

    test.describe('Localized decimal formatting', () => {
        test.it('formats new numeric controls with each supported language decimal separator', () => {
            const I18n = require('../src/js/i18n.js');
            const original = pdg.res.getLanguage();
            try {
                for (const [language, expected] of [['en','33.4'],['de','33,4'],['es','33,4'],
                        ['fr','33,4'],['ja','33.4'],['ru','33,4']]) {
                    pdg.res.setLanguage(language);
                    test.assertEqual(I18n.formatDecimal(33.4),expected,language);
                }
            } finally { pdg.res.setLanguage(original); }
        });
    });

    test.describe('String Resources - Current Runtime UI Coverage', () => {
        test.it('loads every current user-visible runtime string', () => {
            for (const stringId of REQUIRED_RUNTIME_STRING_IDS) {
                const value = pdg.res.getString(stringId);
                test.assertDefined(value, `String ID ${stringId} should be defined`);
                test.assertGreaterThan(value.length, 0, `String ID ${stringId} should not be empty`);
            }
        });
    });

    test.describe('String Resources - Localized File Parity', () => {
        const englishPath = path.join(dataPath, 'strings.txt');
        const englishEntries = parseStringResourceFile(englishPath);
        const englishIds = sortedIds(englishEntries);
        const localizedFiles = getLocalizedResourceFiles(dataPath);

        test.it('has at least one localized resource file', () => {
            test.assertGreaterThan(localizedFiles.length, 0, 'Should have localized string resource files');
        });

        test.it('keeps every localized file in ID parity with English', () => {
            for (const localizedPath of localizedFiles) {
                const localizedEntries = parseStringResourceFile(localizedPath);
                const localizedIds = sortedIds(localizedEntries);
                const missing = englishIds.filter(id => !localizedEntries.has(id));
                const extra = localizedIds.filter(id => !englishEntries.has(id));
                const file = path.basename(localizedPath);

                test.assertEqual(missing.length, 0, `${file} missing string IDs: ${missing.join(', ')}`);
                test.assertEqual(extra.length, 0, `${file} has extra string IDs: ${extra.join(', ')}`);
            }
        });

        test.it('keeps format placeholders compatible in every localized file', () => {
            for (const localizedPath of localizedFiles) {
                const localizedEntries = parseStringResourceFile(localizedPath);
                const file = path.basename(localizedPath);

                for (const [id, englishValue] of englishEntries) {
                    const englishPlaceholders = getPlaceholderIds(englishValue);
                    const localizedPlaceholders = getPlaceholderIds(localizedEntries.get(id) || '');

                    if (englishPlaceholders.length > 0 || localizedPlaceholders.length > 0) {
                        test.assertDeepEqual(
                            localizedPlaceholders,
                            englishPlaceholders,
                            `${file} ID ${id} placeholders should match English`
                        );
                    }
                }
            }
        });
    });
}

module.exports = runStringResourceTests;
