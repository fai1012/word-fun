/// <reference types="vite/client" />
import { AuthResponse } from '../types';
import { STORAGE_KEYS } from '../constants';

import { getEnv } from '../constants';

const AUTH_SERVICE_URL = getEnv('VITE_AUTH_SERVICE_URL');
if (!AUTH_SERVICE_URL) {
    throw new Error("Missing VITE_AUTH_SERVICE_URL environment variable");
}

export const loginWithGoogle = async (idToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${AUTH_SERVICE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            provider: 'google',
            token: idToken,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Authentication failed');
    }

    const data = await response.json();
    console.log('[AuthService] Token:', data.token);
    return data;
};

export const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${AUTH_SERVICE_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Refresh failed');
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
            // Update refresh token if returned (rotation)
            if (data.refreshToken) {
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
            }
            return data.token;
        }
    } catch (error) {
        console.error("Error refreshing token", error);
        // Clear tokens if refresh fails?
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem('word_fun_user');
    }
    return null;
};
