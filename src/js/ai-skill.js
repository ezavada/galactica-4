// AI Skill Level Management for Galactica-4
// Handles different AI difficulty levels and their effects on decision making

// AI Skill Level Constants (matching original game)
const AI_SKILL_LEVELS = {
    AVERAGE: 0,
    GOOD: 1,
    EXPERT: 2
};

// AI Skill Level Names
const AI_SKILL_NAMES = {
    [AI_SKILL_LEVELS.AVERAGE]: 'Average',
    [AI_SKILL_LEVELS.GOOD]: 'Good', 
    [AI_SKILL_LEVELS.EXPERT]: 'Expert'
};

function randomInt(max) {
    if (!max || max <= 0) {
        return 0;
    }
    if (typeof pdg !== 'undefined' && pdg && typeof pdg.rand === 'function') {
        return pdg.rand() % max;
    }
    return 0;
}

function randomFloat() {
    return randomInt(1000000) / 1000000;
}

class AISkillManager {
    constructor(skillLevel = AI_SKILL_LEVELS.AVERAGE) {
        this.skillLevel = skillLevel;
        this.skillName = AI_SKILL_NAMES[skillLevel];
    }

    // Get the number of decision iterations to perform
    // Higher skill levels do more iterations to find better targets
    getDecisionRepetitions() {
        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.EXPERT:
                return 3;
            case AI_SKILL_LEVELS.GOOD:
                return 2;
            case AI_SKILL_LEVELS.AVERAGE:
            default:
                return 1;
        }
    }

    // Add randomness to decision scores based on skill level
    // Higher skill = less randomness (more consistent decisions)
    addRandomness(scores) {
        if (this.skillLevel <= AI_SKILL_LEVELS.AVERAGE) {
            // Average skill gets full randomness
            return scores;
        }

        const modifiedScores = { ...scores };
        const skillMultiplier = this.skillLevel - AI_SKILL_LEVELS.AVERAGE;

        // Add random variation, but less for higher skill levels
        for (const key in modifiedScores) {
            if (typeof modifiedScores[key] === 'number') {
                const randomVariation = this.getRandomVariation(skillMultiplier);
                modifiedScores[key] += randomVariation;
            }
        }

        return modifiedScores;
    }

    // Get random variation amount based on skill level
    getRandomVariation(skillMultiplier) {
        // Higher skill = smaller random variation
        const maxVariation = 12 * skillMultiplier;
        return randomInt(maxVariation * 2) - maxVariation;
    }

    // Check if AI should avoid certain actions based on skill level
    shouldAvoidAction(action, context) {
        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.AVERAGE:
                // Average skill has more restrictions
                return this.shouldAvoidActionAverage(action, context);
            case AI_SKILL_LEVELS.GOOD:
                // Good skill has some restrictions
                return this.shouldAvoidActionGood(action, context);
            case AI_SKILL_LEVELS.EXPERT:
                // Expert skill has minimal restrictions
                return this.shouldAvoidActionExpert(action, context);
            default:
                return false;
        }
    }

    // Average skill restrictions
    shouldAvoidActionAverage(action, context) {
        switch (action) {
            case 'formFleet':
                // Average AI doesn't form fleets
                return true;
            case 'attackHeavilyDefended':
                // Average AI avoids attacking heavily defended targets
                return context.enemyStrength > context.ourStrength;
            default:
                return false;
        }
    }

    // Good skill restrictions
    shouldAvoidActionGood(action, context) {
        switch (action) {
            case 'formFleet':
                // Good AI forms fleets but less aggressively
                return randomFloat() < 0.3; // 30% chance to avoid
            default:
                return false;
        }
    }

    // Expert skill restrictions
    shouldAvoidActionExpert(action, context) {
        // Expert AI has very few restrictions
        return false;
    }

    // Get maximum search distance for finding targets
    // Higher skill AI searches further for better targets
    getMaxSearchDistance(baseDistance) {
        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.EXPERT:
                return baseDistance * 1.5; // Search 50% further
            case AI_SKILL_LEVELS.GOOD:
                return baseDistance * 1.2; // Search 20% further
            case AI_SKILL_LEVELS.AVERAGE:
            default:
                return baseDistance;
        }
    }

    // Get the maximum number of ships to consider for fleet formation
    getMaxFleetSize() {
        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.EXPERT:
                return 10; // Expert AI can form larger fleets
            case AI_SKILL_LEVELS.GOOD:
                return 6;  // Good AI forms medium fleets
            case AI_SKILL_LEVELS.AVERAGE:
            default:
                return 3;  // Average AI forms small fleets
        }
    }

    // Check if AI should use advanced tactics
    shouldUseAdvancedTactics() {
        return this.skillLevel >= AI_SKILL_LEVELS.GOOD;
    }

    // Get decision delay (for human-like behavior)
    getDecisionDelay() {
        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.EXPERT:
                return 50; // Fast decisions
            case AI_SKILL_LEVELS.GOOD:
                return 100; // Medium decisions
            case AI_SKILL_LEVELS.AVERAGE:
            default:
                return 200; // Slower decisions
        }
    }

    // Check if AI should consider multiple iterations for target selection
    shouldUseMultipleIterations() {
        return this.skillLevel >= AI_SKILL_LEVELS.GOOD;
    }

    // Get skill-based modifiers for different actions
    getSkillModifiers() {
        const modifiers = {
            exploration: 1.0,
            aggression: 1.0,
            defense: 1.0,
            economy: 1.0,
            coordination: 1.0
        };

        switch (this.skillLevel) {
            case AI_SKILL_LEVELS.EXPERT:
                modifiers.exploration = 1.3;
                modifiers.aggression = 1.2;
                modifiers.defense = 1.1;
                modifiers.economy = 1.2;
                modifiers.coordination = 1.4;
                break;
            case AI_SKILL_LEVELS.GOOD:
                modifiers.exploration = 1.1;
                modifiers.aggression = 1.1;
                modifiers.defense = 1.05;
                modifiers.economy = 1.1;
                modifiers.coordination = 1.2;
                break;
            case AI_SKILL_LEVELS.AVERAGE:
            default:
                // No modifiers for average skill
                break;
        }

        return modifiers;
    }

    // Get the skill level name
    getSkillName() {
        return this.skillName;
    }

    // Get the skill level number
    getSkillLevel() {
        return this.skillLevel;
    }

    // Set a new skill level
    setSkillLevel(skillLevel) {
        this.skillLevel = skillLevel;
        this.skillName = AI_SKILL_NAMES[skillLevel];
    }

    // Create a random skill level
    static createRandomSkill() {
        const levels = Object.values(AI_SKILL_LEVELS);
        const randomLevel = levels[randomInt(levels.length)];
        return new AISkillManager(randomLevel);
    }

    // Create AI skill manager from string
    static fromString(skillName) {
        const skillLevel = Object.keys(AI_SKILL_NAMES).find(
            level => AI_SKILL_NAMES[level].toLowerCase() === skillName.toLowerCase()
        );
        return new AISkillManager(parseInt(skillLevel) || AI_SKILL_LEVELS.AVERAGE);
    }
}

module.exports = {
    AI_SKILL_LEVELS,
    AI_SKILL_NAMES,
    AISkillManager
};
