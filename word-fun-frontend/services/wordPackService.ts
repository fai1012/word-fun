import { fetchWithAuth } from './apiClient';

export interface WordPackData {
    id: string;
    name: string;
    words: {
        character: string;
        tags: string[];
    }[];
}

export const fetchWordPacks = async (): Promise<WordPackData[]> => {
    const response = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_SERVICE_URL}/api/word-packs`);
    if (!response.ok) {
        throw new Error('Failed to fetch word packs');
    }
    return response.json();
};
