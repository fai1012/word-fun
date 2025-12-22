import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import apiClient from '../services/apiClient';
import { loginWithGoogle } from '../services/authService';

interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
    isAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: () => void;
    logout: () => void;
    setTokenFromLogin: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    const logout = () => {
        googleLogout();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setUser(null);
        // Interceptor handles headers, so no need to delete default header manually if we relied on it
        // But good practice if we accessed defaults directly elsewhere.
        // delete apiClient.defaults.headers.common['Authorization']; 
    };

    // 1. Restore Session from existing Custom Token
    const restoreSession = async (savedToken: string) => {
        try {
            const decoded: any = jwtDecode(savedToken);
            // Check if token is expired
            if (decoded.exp * 1000 < Date.now()) {
                console.warn("Token expired");
                // If we have a refresh token, the next API call (check admin) might trigger refresh via interceptor
                // But let's check validity. 
                // Actually, if it's expired, we rely on duplicate check or let the interceptor handle it on next request?
                // Ideally we should try to refresh immediately or just let the first API call fail/refresh.
                // For simplicity, if expired here, we might just let the checkAdmin call fail which triggers refresh.
                // BUT, if it's way expired, `checkAdmin` might fail with 401.
            }

            const userProfile = {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture,
            };

            // Allow basic access first
            setUser(userProfile);
            setToken(savedToken);

            try {
                // Determine if admin by checking 'me' or just try listing users (which is protected)
                // This call will trigger interceptor logic if token is expired
                await apiClient.get('/admin/users?limit=1');
                setUser({ ...userProfile, isAdmin: true });
            } catch (e: any) {
                if (e.response && e.response.status === 403) {
                    console.error("Not an admin");
                    logout();
                    alert("Access Denied: You are not an administrator.");
                }
            }
        } catch (e) {
            console.error("Session restore failed", e);
            logout();
        }
    };

    // 2. Login: Exchange Google ID Token for Custom Token
    const handleGoogleLogin = async (googleIdToken: string) => {
        try {
            const data = await loginWithGoogle(googleIdToken);

            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                setToken(data.token);
            }
            if (data.refreshToken) {
                localStorage.setItem('refresh_token', data.refreshToken);
            }

            // Initialize session with new token
            await restoreSession(data.token);

        } catch (e) {
            console.error("Login processing failed", e);
            logout();
            alert("Login Failed: Could not authenticate with backend.");
        }
    };

    useEffect(() => {
        const init = async () => {
            const savedToken = localStorage.getItem('auth_token');
            if (savedToken) {
                await restoreSession(savedToken);
            }
            setLoading(false);
        };
        init();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login: () => { }, logout, setTokenFromLogin: handleGoogleLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

// We will expose more specific Login functions in the Login page via the Google Button, 
// so `login` here might just be a placeholder or state setter.
// Actually, we'll expose a "handleLoginSuccess" that the Login page calls.

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// Re-defining for correct export to allow setting token from outside (Login Page)
export { AuthContext };
