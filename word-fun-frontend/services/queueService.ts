import { fetchWithAuth } from './apiClient';

export const addToQueue = async (wordId: string, wordText: string, profileId: string): Promise<void> => {
    try {
        await fetchWithAuth('/api/queue/add', {
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
