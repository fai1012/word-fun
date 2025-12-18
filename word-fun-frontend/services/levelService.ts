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
    let nextThreshold = 100; // Gap for L1
    let cumulative = 0;

    while (expRemaining >= nextThreshold) {
        expRemaining -= nextThreshold;
        cumulative += nextThreshold;
        level++;
        // Gap formula: Gap_n = 100 + (n * 20)
        // L1 gap: 100 (level 0 to 1)
        // L2 gap: 130 (level 1 to 2)
        // L3 gap: 150 (level 2 to 3)
        // Wait, user said L1=100, L2=230, L3=380.
        // L1 gap = 100
        // L2 gap = 130
        // L3 gap = 150
        // Pattern: Gap_L = 110 + (L-1)*20? 
        // L=0 -> L=1: 100 (special)
        // L=1 -> L=2: 130
        // L=2 -> L=3: 150
        if (level === 0) {
            nextThreshold = 100;
        } else {
            nextThreshold = 110 + (level * 20);
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
