import apiClient from './apiClient';

export interface WordPackWord {
    character: string;
    tags: string[];
    examples?: string[];
}

export interface WordPackData {
    name: string;
    words: WordPackWord[];
    isPublished?: boolean;
}

export const wordPackService = {
    async createPack(data: WordPackData): Promise<{ id: string }> {
        const response = await apiClient.post('/admin/word-packs', data);
        return response.data;
    },

    async getAllPacks(): Promise<any[]> {
        const response = await apiClient.get('/admin/word-packs');
        return response.data;
    },

    async getPackById(id: string): Promise<any> {
        const response = await apiClient.get(`/admin/word-packs/${id}`);
        return response.data;
    },

    async updatePack(id: string, data: WordPackData): Promise<void> {
        await apiClient.patch(`/admin/word-packs/${id}`, data);
    },

    async getGlobalTags(): Promise<string[]> {
        const response = await apiClient.get('/admin/word-packs/tags');
        return response.data;
    },

    async generateExamples(word: string): Promise<string[]> {
        const response = await apiClient.post('/admin/word-packs/generate-examples', { word });
        return response.data.examples;
    }
};
