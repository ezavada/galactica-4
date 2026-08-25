// Deterministic autoplay helpers for Galactica-4 parity testing.

const GameConfig = require('./game-config.js');
const I18n = require('./i18n.js');

const DEFAULT_AI_SKILL_AUTOPLAY_SEED = 424242;
const DEFAULT_AUTOPLAY_TURN_DELAY_MS = 250;
const DEFAULT_AUTOPLAY_MAX_TURNS = 250;
const DEFAULT_AUTOPLAY_EVENT_PRESENTATION_MS = 1000;
const DEFAULT_AUTOPLAY_SHOW_EVENT_WINDOWS = false;

function createAISkillAutoplayConfig(options = {}) {
    return GameConfig.createAISkillAutoplay({
        seed: options.seed !== undefined ? options.seed : DEFAULT_AI_SKILL_AUTOPLAY_SEED,
        turnDelayMs: options.turnDelayMs !== undefined ? options.turnDelayMs : DEFAULT_AUTOPLAY_TURN_DELAY_MS,
        maxTurns: options.maxTurns !== undefined ? options.maxTurns : DEFAULT_AUTOPLAY_MAX_TURNS,
        eventPresentationMs: options.eventPresentationMs !== undefined ? options.eventPresentationMs : DEFAULT_AUTOPLAY_EVENT_PRESENTATION_MS,
        showEventWindows: options.showEventWindows !== undefined ? options.showEventWindows : DEFAULT_AUTOPLAY_SHOW_EVENT_WINDOWS,
        fastGame: options.fastGame,
        omniscient: options.omniscient,
        compAdvantage: options.compAdvantage,
        gameTitle: options.gameTitle
    });
}

class AutoplayController {
    constructor(game, options = {}) {
        this.game = game;
        this.turnsRun = 0;
        this.maxTurns = options.maxTurns !== undefined ? options.maxTurns : DEFAULT_AUTOPLAY_MAX_TURNS;
        this.eventPresentationMs = options.eventPresentationMs !== undefined ? options.eventPresentationMs : DEFAULT_AUTOPLAY_EVENT_PRESENTATION_MS;
        this.now = options.now || (() => {
            if (typeof pdg !== 'undefined' && pdg.tm && pdg.tm.getMilliseconds) {
                return pdg.tm.getMilliseconds();
            }
            return Date.now();
        });
        this.stopped = false;
        this.stopReason = null;
    }

    shouldWaitForEventPresentation() {
        if (!this.game || !this.game.overlay) {
            return false;
        }

        if (!Number.isFinite(this.game.overlay.createdAt)) {
            this.game.overlay.createdAt = this.now();
            return this.eventPresentationMs > 0;
        }

        return (this.now() - this.game.overlay.createdAt) < this.eventPresentationMs;
    }

    dismissEventPresentation() {
        if (!this.game) {
            return false;
        }

        if (typeof this.game.dismissEventPresentation === 'function') {
            return this.game.dismissEventPresentation();
        }

        if (this.game.overlay) {
            this.game.overlay = null;
            return true;
        }

        return false;
    }

    step() {
        if (!this.game || this.stopped) {
            return this.getStatus();
        }

        if (this.game.isGameOver) {
            this.stop('gameOver');
            return this.getStatus();
        }

        if (this.shouldWaitForEventPresentation()) {
            return this.getStatus();
        }

        if (this.game.overlay) {
            this.dismissEventPresentation();
            return this.getStatus();
        }

        if (this.turnsRun >= this.maxTurns) {
            this.stop('maxTurns');
            return this.getStatus();
        }

        const result = this.game.endTurn();
        this.turnsRun++;

        if ((result && result.isGameOver) || this.game.isGameOver) {
            this.stop('gameOver');
        } else if (this.turnsRun >= this.maxTurns) {
            this.stop('maxTurns');
        }

        return this.getStatus();
    }

    stop(reason = 'manual') {
        if (this.stopped) {
            return;
        }

        this.stopped = true;
        this.stopReason = reason;

        if (reason === 'maxTurns' && this.game && typeof this.game.recordEvent === 'function') {
            this.game.recordEvent(
                I18n.getString(600, 'Event'),
                I18n.formatString(645, 'AI autoplay stopped after {0} turns with no winner', this.turnsRun),
                { type: 'autoplay' }
            );
        }
    }

    getStatus() {
        return {
            running: !this.stopped,
            stopReason: this.stopReason,
            turnsRun: this.turnsRun,
            maxTurns: this.maxTurns,
            eventPresentationMs: this.eventPresentationMs,
            result: this.game && typeof this.game.getGameResult === 'function' ? this.game.getGameResult() : null
        };
    }
}

module.exports = {
    DEFAULT_AI_SKILL_AUTOPLAY_SEED,
    DEFAULT_AUTOPLAY_TURN_DELAY_MS,
    DEFAULT_AUTOPLAY_MAX_TURNS,
    DEFAULT_AUTOPLAY_EVENT_PRESENTATION_MS,
    DEFAULT_AUTOPLAY_SHOW_EVENT_WINDOWS,
    createAISkillAutoplayConfig,
    AutoplayController
};
