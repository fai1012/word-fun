import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Sparkles, Brain } from 'lucide-react';

interface SignInPageProps {
    onLoginSuccess: (user: any) => void;
    onLoginError: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onLoginSuccess, onLoginError }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="z-10 flex flex-col items-center max-w-md w-full text-center">
                <div className="mb-8 relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-400 to-rose-400 rounded-full blur opacity-20"></div>
                    <div className="relative bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
                        <Brain className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                        <Sparkles className="w-6 h-6 text-yellow-500 animate-bounce" />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                    Word Fun
                </h1>
                <p className="text-slate-500 mb-10 text-lg">
                    Master vocabulary with AI-powered personalized revisions.
                </p>

                <div className="w-full bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center gap-6">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                        Welcome Back
                    </div>

                    <GoogleLogin
                        onSuccess={credentialResponse => {
                            if (credentialResponse.credential) {
                                onLoginSuccess(credentialResponse);
                            }
                        }}
                        onError={() => {
                            console.log('Login Failed');
                            onLoginError();
                        }}
                        shape="pill"
                        size="large"
                        theme="filled_black"
                    />

                    <p className="text-xs text-slate-400 max-w-[250px]">
                        By signing in, you will be able to sync your progress across devices.
                    </p>
                </div>
            </div>
        </div>
    );
};
