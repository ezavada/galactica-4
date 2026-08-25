// Deterministic autoplay helpers for Galactica-4 parity testing.

const GameConfig = require('./game-config.js');
const I18n = require('./i18n.js');

const DEFAULT_AI_SKILL_AUTOPLAY_SEED = 424242;
const DEFAULT_AUTOPLAY_TURN_DELAY_MS = 250;
const DEFAULT_AUTOPLAY_MAX_TURNS = 10000;

function createAISkillAutoplayConfig(options = {}) {
    return GameConfig.createAISkillAutoplay({
        seed: options.seed !== undefined ? options.seed : DEFAULT_AI_SKILL_AUTOPLAY_SEED,
        turnDelayMs: options.turnDelayMs !== undefined ? options.turnDelayMs : DEFAULT_AUTOPLAY_TURN_DELAY_MS,
        maxTurns: options.maxTurns !== undefined ? options.maxTurns : DEFAULT_AUTOPLAY_MAX_TURNS,
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
        this.stopped = false;
        this.stopReason = null;
    }

    step() {
        if (!this.game || this.stopped) {
            return this.getStatus();
        }

        if (this.game.isGameOver) {
            this.stop('gameOver');
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
            result: this.game && typeof this.game.getGameResult === 'function' ? this.game.getGameResult() : null
        };
    }
}

module.exports = {
    DEFAULT_AI_SKILL_AUTOPLAY_SEED,
    DEFAULT_AUTOPLAY_TURN_DELAY_MS,
    DEFAULT_AUTOPLAY_MAX_TURNS,
    createAISkillAutoplayConfig,
    AutoplayController
};
