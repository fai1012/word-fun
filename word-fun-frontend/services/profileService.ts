/// <reference types="vite/client" />
import { Profile, ProfileSyncResponse } from '../types';
import { STORAGE_KEYS } from '../constants';

import { getEnv } from '../constants';

const BACKEND_SERVICE_URL = getEnv('VITE_BACKEND_SERVICE_URL');
if (!BACKEND_SERVICE_URL) {
    throw new Error("Missing VITE_BACKEND_SERVICE_URL environment variable");
}



import { fetchWithAuth } from './apiClient';

export const syncAndGetProfiles = async (): Promise<ProfileSyncResponse> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error('Failed to sync profiles');
    }

    return response.json();
};

export const createProfile = async (displayName: string, avatarId: string): Promise<Profile> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/create`, {
        method: 'POST',
        body: JSON.stringify({ displayName, avatarId })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create profile');
    }

    return response.json();
};

export const fetchProfileWords = async (profileId: string): Promise<any[]> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/words`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch words');
    }

    return response.json();
};

export const updateWord = async (
    profileId: string,
    wordId: string,
    updates: {
        revisedCount?: number;
        correctCount?: number;
        examples?: any[];
        lastReviewedAt?: Date | string;
        masteredAt?: Date | string;
        tags?: string[];
    }
): Promise<void> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/words/${wordId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        throw new Error('Failed to update word');
    }
};

export const deleteProfile = async (profileId: string): Promise<void> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete profile');
    }
};

export const updateProfile = async (profileId: string, updates: { displayName?: string; avatarId?: string; exp?: number }): Promise<Profile> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        throw new Error('Failed to update profile');
    }

    return response.json();
};


export const batchAddWords = async (
    profileId: string,
    words: (string | { text: string; tags: string[] })[],
    tags: string[] = []
): Promise<{ added: number; skipped: number }> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/words/batch`, {
        method: 'POST',
        body: JSON.stringify({ words, tags })
    });

    if (!response.ok) {
        throw new Error('Failed to add words');
    }

    return response.json();
};

export const validateWords = async (
    profileId: string,
    words: string[]
): Promise<{ text: string; isValid: boolean; rootForm?: string; language: 'en' | 'zh' }[]> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/words/validate`, {
        method: 'POST',
        body: JSON.stringify({ words })
    });

    if (!response.ok) {
        throw new Error('Failed to validate words');
    }

    return response.json();
};

export const fetchProfileTags = async (profileId: string): Promise<string[]> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/tags`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch tags');
    }

    return response.json();
};

export const deleteWord = async (profileId: string, wordId: string): Promise<void> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/profiles/${profileId}/words/${wordId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete word');
    }
};

export const analyzeSentence = async (text: string | string[]): Promise<any> => {
    const response = await fetchWithAuth(`${BACKEND_SERVICE_URL}/api/nlp/analyze`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });

    if (!response.ok) {
        throw new Error('Failed to analyze sentence');
    }

    return response.json();
};


