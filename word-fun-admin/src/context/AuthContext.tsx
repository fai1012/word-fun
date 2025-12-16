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

    // Helper to decode and set user from token
    const processToken = async (googleParams: any) => {
        try {
            // 1. Exchange Google ID Token for Custom Access Token via Auth Service
            // This matches the main Frontend flow.
            const authServiceUrl = (window as any)._env_?.VITE_AUTH_SERVICE_URL || import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081';

            const response = await fetch(`${authServiceUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google',
                    token: googleParams // This is the 'credential' string from Google
                })
            });

            if (!response.ok) {
                throw new Error('Auth Service Login Failed');
            }

            const data = await response.json();
            const customToken = data.token;

            // 2. Decode the CUSTOM token (signed by auth-service)
            const decoded: any = jwtDecode(customToken);
            const userProfile = {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture,
            };

            localStorage.setItem('admin_token', customToken);
            setToken(customToken);

            // Attach token to axios for this request
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${customToken}`;

            try {
                // Determine if admin by checking 'me' or just try listing users (which is protected)
                // We'll try fetching /admin/users (limit 1) to test access.
                await apiClient.get('/admin/users?limit=1');
                setUser({ ...userProfile, isAdmin: true });
            } catch (e: any) {
                if (e.response && e.response.status === 403) {
                    console.error("Not an admin");
                    logout(); // Auto logout if not admin
                    alert("Access Denied: You are not an administrator.");
                } else {
                    // Maybe other error, allow but might fail later. 
                    // Or maybe network error.
                    setUser(userProfile);
                }
            }
        } catch (e) {
            console.error("Login processing failed", e);
            logout();
            alert("Login Failed: Could not authenticate with backend.");
        }
    };

    const logout = () => {
        googleLogout();
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
    };

    useEffect(() => {
        const init = async () => {
            if (token) {
                await processToken(token);
            }
            setLoading(false);
        };
        init();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login: () => { }, logout, setTokenFromLogin: processToken }}>
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
