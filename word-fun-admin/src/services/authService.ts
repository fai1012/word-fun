import axios from 'axios';
import { getEnv } from '../utils/env';

const API_URL = getEnv('VITE_API_URL') || 'http://localhost:8080/api';

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        picture: string;
    };
}

export const loginWithGoogle = async (idToken: string): Promise<AuthResponse> => {
    // We use a separate axios instance or just direct axios to avoid interceptors
    const response = await axios.post(`${API_URL}/auth/login`, {
        token: idToken,
    });
    return response.data;
};

export const refreshAccessToken = async (refreshToken: string): Promise<AuthResponse | null> => {
    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
        });
        return response.data;
    } catch (error) {
        console.error("RefreshToken call failed", error);
        return null;
    }
};
