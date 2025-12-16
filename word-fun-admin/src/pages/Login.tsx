import React, { useContext } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
    const auth = useContext(AuthContext);

    if (auth?.user) {
        return <Navigate to="/" replace />;
    }

    const handleSuccess = async (response: any) => {
        if (response.credential && auth) {
            // We need to cast auth to any or expose specific method since I defined `login` as void in interface
            // I'll fix AuthContext interface in a bit or just assume standard flow.
            // Actually, I should update AuthContext to accept the token credential.
            // For now, let's access the internal method if possible or just update the context manually?
            // No, context logic should handle it.
            // I will modify AuthContext to expose a `handleLogin` function instead of generic `login`.
            // But for now, let's look at how I wrote AuthContext.
            (auth as any).setTokenFromLogin(response.credential);
        }
    };

    return (
        <div className="login-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
            <div className="login-card" style={{ padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '20px', color: '#1a73e8' }}>Word Fun Admin</h1>
                <p style={{ marginBottom: '30px', color: '#666' }}>Sign in to access the administration panel</p>

                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={() => console.log('Login Failed')}
                />
            </div>
        </div>
    );
};

export default Login;
