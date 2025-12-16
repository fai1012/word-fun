export const getEnv = (key: string): string => {
    // 1. Runtime config (window._env_) - typically injected by Docker entrypoint
    if (typeof window !== 'undefined' && (window as any)._env_ && (window as any)._env_[key]) {
        return (window as any)._env_[key];
    }
    // 2. Build-time config (Vite .env)
    return import.meta.env[key] || '';
};
