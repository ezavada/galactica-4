// Test Runner for Galactica-4
// Run with: ./gad4 tests/run-tests.js
//
// Uses PDG's built-in pdg.srand() and pdg.rand() for deterministic testing

const test = require('./test-framework.js');
const runHostLoginTests=require('./host-login.test.js');
const runNetworkHostTests=require('./network-host.test.js');
const runStardockArtTests=require('./stardock-art.test.js');
const runBuiltShipReportsTests=require('./built-ship-reports.test.js');
const runCallInReportsTests=require('./callin-reports.test.js');
const runTutorialModalTests=require('./tutorial-modal.test.js');
const runMapSelectionTests=require('./map-selection.test.js');
const runMapScrollbarTests=require('./map-scrollbars.test.js');
const runQuitDocumentsTests=require('./quit-documents.test.js');
const runApplicationVersionTests=require('./application-version.test.js');
const runStartupLifecycleTests=require('./startup-lifecycle.test.js');
const runPresentationTests=require('./presentation.test.js');
const runFullscreenTests = require('./fullscreen.test.js');
const runMapDisplayModeTests = require('./map-display-modes.test.js');
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
const runRosterGeometryTests=require('./roster-geometry.test.js');
const runFleetRosterTests=require('./fleet-roster.test.js');
const runFleetExchangeTests=require('./fleet-exchange.test.js');
const runNestedFleetGroupTests=require('./nested-fleet-groups.test.js');
const runFleetTransferTargetTests=require('./fleet-transfer-targets.test.js');
const runFleetMemberTests=require('./fleet-members.test.js');
const runFleetVisibilityTests=require('./fleet-visibility.test.js');
const runFleetTests = require('./fleet.test.js');
const runCombatTests = require('./combat.test.js');
const runGameRuleTests = require('./game-rules.test.js');
const runCommandUITests = require('./command-ui.test.js');
const runFleetFormationTests = require('./fleet-formation.test.js');
const runRendezvousTests = require('./rendezvous.test.js');
const runShipNamingEventsTests = require('./ship-naming-events.test.js');
const runAutoplayTests = require('./autoplay.test.js');
const runShipDiagnosticsTests = require('./ship-diagnostics.test.js');
const runShipCommissioningTests = require('./ship-commissioning.test.js');
const runConstructionBoundaryTests = require('./construction-boundary.test.js');
const runPopulationGrowthTests = require('./population-growth.test.js');
const runResearchProgressTests = require('./research-progress.test.js');
const runEconomyTurnOrderTests = require('./economy-turn-order.test.js');
const runAllocationPrecisionTests = require('./allocation-precision.test.js');
const runSliderDragTests = require('./slider-drag.test.js');
const runColonyDefaultsTests = require('./colony-defaults.test.js');
const runPursuitMovementTests = require('./pursuit-movement.test.js');
const runStartupSetupTests = require('./startup-setup.test.js');
const runLanguageSettingsTests = require('./language-settings.test.js');
const runVisualEffectTests = require('./visual-effects.test.js');
const runUIIconTests = require('./ui-icons.test.js');
const runChartNameTests = require('./chart-names.test.js');
const runScrappingTests = require('./scrapping.test.js');
const runEventReportTests = require('./event-reports.test.js');
const runAttentionTests = require('./attention.test.js');
const runCoursePatrolTests = require('./course-patrol.test.js');
const runCourseHuntTests = require('./course-hunt.test.js');
const runCourseMemoryTests = require('./course-memory.test.js');
const runWaypointCourseTests = require('./waypoint-course.test.js');
const runSystemDiagnosticsTests = require('./system-diagnostics.test.js');
const runSystemComparisonTests = require('./system-comparison.test.js');
const runPlayerComparisonTests=require('./player-comparison.test.js');
const runPlayerNameTests=require('./player-name.test.js');
const runGameTitleTests=require('./game-title.test.js');
const runComputerCountTests=require('./computer-count.test.js');
const runStartupSkillTests=require('./startup-skill.test.js');
const runStartupFastGameTests=require('./startup-fast-game.test.js');
const runStartupFogTests=require('./startup-fog.test.js');
const runColonySetupReportTests=require('./colony-setup-reports.test.js');
const runArrivalContainerTests=require('./arrival-containers.test.js');
const runControlHelpTests=require('./control-help.test.js');
const runDocumentFileTests=require('./document-files.test.js');
const runGameSaveTests=require('./game-save.test.js');
const runGameSessionTests=require('./game-sessions.test.js');
const runOutcomeReportTests=require('./outcome-reports.test.js');
const runOccupationReportTests=require('./occupation-reports.test.js');
const runReusableColonyTests=require('./reusable-colony.test.js');
const runTutorialRuntimeTests=require('./tutorial-runtime.test.js');
const runTutorialControllerTests=require('./tutorial-controller.test.js');
const runTutorialSimulationTests=require('./tutorial-simulation.test.js');
const runTutorialGameTests=require('./tutorial-game.test.js');
const runTutorialRandomTests=require('./tutorial-random.test.js');
const runTutorialLessonsTests=require('./tutorial-lessons.test.js');
const runTutorialPanelTests=require('./tutorial-panel.test.js');
const runMapEditControlsTests=require('./map-edit-controls.test.js');
const runTutorialReferenceTests=require('./tutorial-reference.test.js');
const runDiscoveryObserverTests=require('./discovery-observers.test.js');
const runCommissioningObserverTests=require('./commissioning-observers.test.js');
const runContainmentNavigationTests=require('./containment-navigation.test.js');
const runSoundTests=require('./sound.test.js');
const runSoundAssetTests=require('./sound-assets.test.js');
const runNeutralColonyReportTests=require('./neutral-colony-reports.test.js');
const runRendezvousFormationReportTests=require('./rendezvous-formation-reports.test.js');
const runRepairReportTests=require('./repair-reports.test.js');
const runManualTests=require('./user-manual.test.js');
const runSystemDefenseTests=require('./system-defense-reports.test.js');
const runCaptureObserverTests=require('./capture-observers.test.js');
const runEnemyEventTests=require('./enemy-events.test.js');
const runDestructionFeedbackTests=require('./destruction-feedback.test.js');
const runDestructionReportTests=require('./destruction-reports.test.js');
const runSystemShipsTests = require('./system-ships.test.js');
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
    runFleetVisibilityTests();
    runFleetMemberTests();
    runFleetTransferTargetTests();
    runRosterGeometryTests();
    runFleetRosterTests();
    runFleetExchangeTests();
    runNestedFleetGroupTests();

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
    runSystemShipsTests();
    runSystemComparisonTests();
runPlayerComparisonTests();
runPlayerNameTests();
runGameTitleTests();
runComputerCountTests();
runStartupSkillTests();
runStartupFastGameTests();
runStartupFogTests();
runOutcomeReportTests();
runOccupationReportTests();
runCaptureObserverTests();
runSystemDefenseTests();
runSoundAssetTests();
runSoundTests();
runContainmentNavigationTests();
runCommissioningObserverTests();
runDiscoveryObserverTests();
runTutorialLessonsTests();
runTutorialPanelTests();
runMapEditControlsTests();
runTutorialReferenceTests();
runTutorialGameTests();
runTutorialRandomTests();
runTutorialSimulationTests();
runTutorialControllerTests();
runTutorialRuntimeTests();
require('./window-behavior.test.js')();
require('./button-caption.test.js')();
require('./tutorial-session.test.js')();
require('./new-game-defaults.test.js')();
require('./colony-preferences.test.js')();
runReusableColonyTests();
runNeutralColonyReportTests();
runRendezvousFormationReportTests();
runRepairReportTests();
runManualTests();
runEnemyEventTests();
runDestructionFeedbackTests();
runDestructionReportTests();
runGameSessionTests();
runGameSaveTests();
runDocumentFileTests();
    runSystemDiagnosticsTests();
    runWaypointCourseTests();
    runCourseMemoryTests();
    runCourseHuntTests();
    runCoursePatrolTests();
    runAttentionTests();
    runEventReportTests();
    runScrappingTests();
    runVisualEffectTests();
    runUIIconTests();
    runChartNameTests();
    runLanguageSettingsTests();
    runStartupSetupTests();
    runPursuitMovementTests();
    runColonyDefaultsTests();
    runSliderDragTests();
    runColonySetupReportTests();
    runArrivalContainerTests();
    runControlHelpTests();
    runAllocationPrecisionTests();
    runEconomyTurnOrderTests();
    runResearchProgressTests();
    runPopulationGrowthTests();
    runConstructionBoundaryTests();
    runShipCommissioningTests();
    runShipDiagnosticsTests();

    runMapSelectionTests();
    runMapScrollbarTests();
    runFullscreenTests();
    runPresentationTests();
    runStartupLifecycleTests();
    runApplicationVersionTests();
    runQuitDocumentsTests();
runTutorialModalTests();
runCallInReportsTests();
runBuiltShipReportsTests();
runStardockArtTests();
runNetworkHostTests();
runHostLoginTests();
    runMapDisplayModeTests();

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
