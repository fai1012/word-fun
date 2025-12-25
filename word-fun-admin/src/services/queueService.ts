import apiClient from './apiClient';

export interface QueueItem {
    id: string;
    wordId: string;
    wordText: string;
    userId: string;
    profileId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    error?: string;
    createdAt: any;
    startedAt?: any;
    completedAt?: any;
}

export const queueService = {
    async getAll(): Promise<QueueItem[]> {
        const response = await apiClient.get('/queue/all');
        return response.data;
    },

    async trigger(): Promise<void> {
        await apiClient.post('/queue/trigger');
    },

    async retryAll(): Promise<{ count: number }> {
        const response = await apiClient.post('/queue/retry');
        return response.data;
    }
};
