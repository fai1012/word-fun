export interface LevelInfo {
    level: number;
    expInLevel: number;
    nextLevelThreshold: number;
    totalExpToCurrentLevel: number;
}

/**
 * Level system based on user requirements:
 * L1: 100
 * L2: 230 (Gap 130)
 * L3: 380 (Gap 150)
 * Increment between gaps = 20
 */
export const getLevelInfo = (totalExp: number): LevelInfo => {
    let level = 0;
    let expRemaining = totalExp;
    let nextThreshold = 100; // Gap to reach L1
    let cumulative = 0;

    while (expRemaining >= nextThreshold) {
        expRemaining -= nextThreshold;
        cumulative += nextThreshold;
        level++;
        // Pattern: Gap to next level increases by 30 once, then 20 thereafter
        // L0->L1: 100 (Total 100)
        // L1->L2: 130 (Total 230)
        // L2->L3: 150 (Total 380)
        if (level === 1) {
            nextThreshold = 130;
        } else {
            nextThreshold = 130 + ((level - 1) * 20);
        }
    }

    return {
        level,
        expInLevel: expRemaining,
        nextLevelThreshold: nextThreshold,
        totalExpToCurrentLevel: cumulative
    };
};

export const EXP_SOURCES = {
    REVIEW: 5,
    GOT_IT: 5,
    MASTERED: 10
};
