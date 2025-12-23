import { fetchWithAuth } from './apiClient';
import { getEnv } from '../constants';

const BACKEND_URL = getEnv('VITE_BACKEND_SERVICE_URL');

export const addToQueue = async (wordId: string, wordText: string, profileId: string): Promise<void> => {
    try {
        if (!BACKEND_URL) throw new Error("Missing VITE_BACKEND_SERVICE_URL");
        await fetchWithAuth(`${BACKEND_URL}/api/queue/add`, {
            method: 'POST',
            body: JSON.stringify({
                wordId,
                wordText,
                profileId
            })
        });
        console.log(`[Queue] Added ${wordText} to generation queue.`);
    } catch (error) {
        console.error(`[Queue] Failed to add ${wordText} to queue`, error);
        // We suppress the error to not block the UI
    }
};
