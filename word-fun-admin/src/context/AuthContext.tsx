import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import apiClient from '../services/apiClient';

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
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    const [loading, setLoading] = useState(true);

    const logout = () => {
        googleLogout();
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
    };

    // 1. Restore Session from existing Custom Token
    const restoreSession = async (savedToken: string) => {
        try {
            const decoded: any = jwtDecode(savedToken);
            // Check if token is expired
            if (decoded.exp * 1000 < Date.now()) {
                console.warn("Token expired");
                logout();
                return;
            }

            const userProfile = {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture,
            };

            // Set global header
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

            // Allow basic access first
            setUser(userProfile);
            setToken(savedToken); // ensure state is synced

            try {
                // Determine if admin by checking 'me' or just try listing users (which is protected)
                await apiClient.get('/admin/users?limit=1');
                setUser({ ...userProfile, isAdmin: true });
            } catch (e: any) {
                if (e.response && e.response.status === 403) {
                    console.error("Not an admin");
                    logout();
                    alert("Access Denied: You are not an administrator.");
                }
                // If network error, we stay logged in but might show error/loading later
            }
        } catch (e) {
            console.error("Session restore failed", e);
            logout();
        }
    };

    // 2. Login: Exchange Google ID Token for Custom Token
    const handleGoogleLogin = async (googleIdToken: string) => {
        try {
            const authServiceUrl = (window as any)._env_?.VITE_AUTH_SERVICE_URL || import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081';

            const response = await fetch(`${authServiceUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google',
                    token: googleIdToken
                })
            });

            if (!response.ok) {
                throw new Error('Auth Service Login Failed');
            }

            const data = await response.json();
            const customToken = data.token;

            localStorage.setItem('admin_token', customToken);
            setToken(customToken);

            // Initialize session with new token
            await restoreSession(customToken);

        } catch (e) {
            console.error("Login processing failed", e);
            logout();
            alert("Login Failed: Could not authenticate with backend.");
        }
    };

    useEffect(() => {
        const init = async () => {
            const savedToken = localStorage.getItem('admin_token');
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
