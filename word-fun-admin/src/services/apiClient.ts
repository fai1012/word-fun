import axios from 'axios';
import { getEnv } from '../utils/env';
import { refreshAccessToken } from './authService';

const API_URL = getEnv('VITE_API_URL') || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401/403 and Refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const data = await refreshAccessToken(refreshToken);
                    if (data && data.token) {
                        localStorage.setItem('auth_token', data.token);
                        if (data.refreshToken) {
                            localStorage.setItem('refresh_token', data.refreshToken);
                        }

                        // Update header for retry
                        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                        return apiClient(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error("Session expired", refreshError);
            }

            // If refresh fails or no token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            // Check if we are not already on login page to avoid infinite loops or errors
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
