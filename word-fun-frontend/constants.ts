// Default Configuration Values
export const DEFAULT_CONFIG = {
    MASTERY_THRESHOLD: 6,
    LEARNING_BATCH_SIZE: 15,
    REVIEW_BATCH_SIZE: 3,    // Number of review cards to mix in
    LEARNING_POOL_SIZE: 30,  // Always look at the oldest 30 words
    LEARNING_PENALTY: 2,     // Count to subtract when learning word is wrong
};

export const STORAGE_KEYS = {
    SHEET_URL: 'hanzi_sheet_url',
    SHEET_AUTH: 'hanzi_sheet_auth',
    CARDS_CACHE: 'hanzi_cards_cache',
    AUTO_PLAY: 'hanzi_auto_play',
    // New Config Keys
    SETTING_MASTERY: 'hanzi_setting_mastery',
    SETTING_BATCH_SIZE: 'hanzi_setting_batch',
    SETTING_PENALTY: 'hanzi_setting_penalty',
    AUTH_TOKEN: 'hanzi_auth_token',
    REFRESH_TOKEN: 'hanzi_refresh_token',
    USER_INFO: 'word_fun_user',
    THEME_PREFERENCE: 'theme_preference'
};

/**
 * Safely retrieves environment variables, prioritizing runtime injection (window._env_)
 * for Docker/Cloud Run environments, falling back to Vite build-time env vars.
 */
export const getEnv = (key: string): string => {
    // Check for runtime injected variables (from docker-entrypoint.sh)
    if (typeof window !== 'undefined' && (window as any)._env_ && (window as any)._env_[key]) {
        return (window as any)._env_[key];
    }
    // Fallback to Vite build-time variables
    return import.meta.env[key] || '';
};