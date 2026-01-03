import { fetchWithAuth } from './apiClient';
import { getEnv } from '../constants';

export interface WordPackData {
    id: string;
    name: string;
    words: {
        character: string;
        tags: string[];
        examples?: string[];
    }[];
}

export const fetchWordPacks = async (): Promise<WordPackData[]> => {
    const BACKEND_SERVICE_URL = getEnv('VITE_BACKEND_SERVICE_URL');
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/word-packs`);
    if (!response.ok) {
        throw new Error('Failed to fetch word packs');
    }
    return response.json();
};
