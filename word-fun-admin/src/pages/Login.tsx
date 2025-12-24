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
            auth.setTokenFromLogin(response.credential);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-200">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="z-10 flex flex-col items-center max-w-md w-full text-center">
                <div className="mb-6 flex flex-col items-center animate-in fade-in zoom-in duration-700">
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                        Word Fun Admin
                    </h1>
                </div>

                <div className="w-full bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl shadow-black/50 flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-150">
                    <p className="text-sm font-medium text-slate-400 max-w-[250px] leading-relaxed">
                        Sign in to access the administration panel
                    </p>

                    <div className="relative w-full max-w-[280px] h-[52px] group">
                        {/* Custom Visual Button */}
                        <div className="absolute inset-0 bg-white rounded-xl border border-slate-200 shadow-lg group-hover:shadow-cyan-500/20 group-hover:border-cyan-200 flex items-center justify-center gap-3 transition-all duration-300 pointer-events-none transform group-hover:scale-[1.02]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="font-bold text-slate-700 text-base tracking-wide group-hover:text-black transition-colors">Sign in with Google</span>
                        </div>

                        {/* Invisible Functional Layer */}
                        <div className="absolute inset-0 opacity-0 overflow-hidden flex items-center justify-center cursor-pointer">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => console.log('Login Failed')}
                                theme="filled_black"
                                width="300"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
