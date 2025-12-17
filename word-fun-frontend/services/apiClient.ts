import { STORAGE_KEYS } from '../constants';
import { refreshAccessToken } from './authService';

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<Response> => {
    // 1. Get current token
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    // 2. Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 3. Initial Request
    let response = await fetch(url, { ...options, headers });

    // 4. Handle 401/403 (Assuming backend might send 403 for expired, but 401 is standard. 
    //    We will check for both or just try refresh on 403 if message says expired)
    //    The backend currently sends 403 for "Invalid or expired token".
    if (response.status === 401 || (response.status === 403)) { // Broadly catching 403 for now as per current backend logic
        try {
            console.log("Token expired or invalid, attempting refresh...");
            const newToken = await refreshAccessToken();

            if (newToken) {
                // Retry request with new token
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, { ...options, headers });
            } else {
                // Refresh failed (e.g. refresh token also expired)
                // Optionally redirect to login or let the app handle the 401/403 response
                localStorage.removeItem('word_fun_user');
                window.location.href = '/'; // Or dispatch a logout action
            }
        } catch (error) {
            console.error("Token refresh failed:", error);
            // logout logic?
            localStorage.removeItem('word_fun_user');
            window.location.href = '/';
        }
    }

    return response;
};
