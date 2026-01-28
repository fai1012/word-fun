export type LearningPace = 'gentle' | 'standard' | 'challenge';

export interface LearningPaceSettings {
    minBatch: number;
    maxBatch: number;
}

export const LEARNING_PACES: Record<LearningPace, LearningPaceSettings> = {
    gentle: {
        minBatch: 10,
        maxBatch: 13,
    },
    standard: {
        minBatch: 17,
        maxBatch: 20,
    },
    challenge: {
        minBatch: 27,
        maxBatch: 30,
    }
};

export const getRandomBatchSize = (pace: LearningPace): number => {
    const settings = LEARNING_PACES[pace];
    if (!settings) return 15; // Fallback
    return Math.floor(Math.random() * (settings.maxBatch - settings.minBatch + 1)) + settings.minBatch;
};

export const DEFAULT_LEARNING_PACE: LearningPace = 'standard';
